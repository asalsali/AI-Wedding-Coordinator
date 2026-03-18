import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { provisionWeddingNumber, formatPhoneNumber } from '@/lib/twilio/provision'

export async function POST(): Promise<NextResponse> {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()

  // Resolve couple_id from the Clerk user
  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (coupleError || !couple) {
    return NextResponse.json({ error: 'Couple record not found' }, { status: 404 })
  }

  // Idempotency check — don't provision if the couple already has an active number
  const { data: existing } = await supabase
    .from('phone_numbers')
    .select('twilio_number')
    .eq('couple_id', couple.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing?.twilio_number) {
    return NextResponse.json({ phoneNumber: formatPhoneNumber(existing.twilio_number as string) })
  }

  try {
    const phoneNumber = await provisionWeddingNumber(couple.id as string)
    return NextResponse.json({ phoneNumber })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to provision phone number'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
