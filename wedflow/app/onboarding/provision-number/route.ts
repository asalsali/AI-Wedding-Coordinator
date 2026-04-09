'use server'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { formatPhoneNumber } from '@/lib/twilio/provision'

// Your existing Twilio number (bought manually in the Twilio console)
const EXISTING_TWILIO_NUMBER = '+18254654504'

export async function POST(): Promise<NextResponse> {
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

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  // Use service role for database operations
  const { createClient } = await import('@supabase/supabase-js')
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Resolve couple_id from the auth user
  const { data: couple, error: coupleError } = await serviceClient
    .from('couples')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (coupleError || !couple) {
    return NextResponse.json({ error: 'Couple record not found' }, { status: 404 })
  }

  // Idempotency check — don't provision if the couple already has an active number
  const { data: existing } = await serviceClient
    .from('phone_numbers')
    .select('twilio_number')
    .eq('couple_id', couple.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing?.twilio_number) {
    return NextResponse.json({ phoneNumber: formatPhoneNumber(existing.twilio_number as string) })
  }

  // Use your existing Twilio number instead of provisioning a new one
  try {
    const { error } = await serviceClient.from('phone_numbers').insert({
      couple_id: couple.id,
      twilio_number: EXISTING_TWILIO_NUMBER,
      status: 'active',
      activated_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(`Failed to save phone number: ${error.message}`)
    }

    return NextResponse.json({ phoneNumber: formatPhoneNumber(EXISTING_TWILIO_NUMBER) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to provision phone number'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
