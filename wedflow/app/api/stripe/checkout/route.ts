import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getStripe } from '@/lib/stripe/client'

// ----------------------------------------------------------------
// Supabase server helpers
// ----------------------------------------------------------------

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

  const body = await req.json() as unknown
  if (
    typeof body !== 'object' ||
    body === null ||
    !('priceId' in body) ||
    typeof (body as Record<string, unknown>).priceId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
  }
  const { priceId } = body as { priceId: string }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data: user } = await serviceClient
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  const { data: couple } = await serviceClient
    .from('couples')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (!couple) {
    return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
  }

  const primaryEmail = user?.email

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/dashboard`,
      cancel_url: `${req.nextUrl.origin}/pricing`,
      ...(primaryEmail ? { customer_email: primaryEmail } : {}),
      metadata: {
        coupleId: couple.id as string,
        authUserId: userId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe-checkout]', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}