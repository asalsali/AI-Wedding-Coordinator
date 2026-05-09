import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getStripe } from '@/lib/stripe/client'

async function getAuthedUserId(): Promise<string | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function POST(req: NextRequest) {
  const userId = await getAuthedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: couple } = await serviceClient
    .from('couples')
    .select('stripe_customer_id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (!couple?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: couple.stripe_customer_id as string,
      return_url: `${req.nextUrl.origin}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe-portal]', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
