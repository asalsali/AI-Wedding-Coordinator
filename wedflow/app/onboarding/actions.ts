'use server'

import { getClerkToken } from '@/lib/supabase/get-clerk-token'
import { getSupabaseUserClient } from '@/lib/supabase/client-user'
import type { ToneStyle } from '@/types'

// ----------------------------------------------------------------
// Step 1 — Welcome: upsert couple row + create profile if missing
// ----------------------------------------------------------------
export async function saveOnboardingStep1(data: {
  clerkUserId: string
  email: string
  yourName: string
  partnerName: string
}): Promise<{ coupleId: string; profileId: string }> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .upsert(
      {
        clerk_user_id: data.clerkUserId,
        email: data.email,
        your_name: data.yourName,
        partner_name: data.partnerName,
      },
      { onConflict: 'clerk_user_id' },
    )
    .select('id')
    .single()

  if (coupleError || !couple) {
    throw new Error(`Failed to save couple: ${coupleError?.message ?? 'Unknown error'}`)
  }

  // Create profile only if it doesn't already exist
  const { data: existing } = await supabase
    .from('wedding_profiles')
    .select('id')
    .eq('couple_id', couple.id)
    .maybeSingle()

  if (existing?.id) {
    return { coupleId: couple.id, profileId: existing.id }
  }

  const { data: profile, error: profileError } = await supabase
    .from('wedding_profiles')
    .insert({ couple_id: couple.id, readiness_score: 0 })
    .select('id')
    .single()

  if (profileError || !profile) {
    throw new Error(`Failed to create profile: ${profileError?.message ?? 'Unknown error'}`)
  }

  return { coupleId: couple.id, profileId: profile.id }
}

// ----------------------------------------------------------------
// Step 2 — Wedding Details
// ----------------------------------------------------------------
export async function saveOnboardingStep2(data: {
  coupleId: string
  venueName: string
  venueAddress: string
  weddingDate: string   // "YYYY-MM-DD"
  ceremonyTime: string  // "HH:MM"
  receptionTime: string // "HH:MM"
  parkingInfo: string
}): Promise<void> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { error } = await supabase
    .from('wedding_profiles')
    .update({
      venue_name: data.venueName || null,
      venue_address: data.venueAddress || null,
      wedding_date: data.weddingDate || null,
      ceremony_time: data.ceremonyTime || null,
      reception_time: data.receptionTime || null,
      parking_info: data.parkingInfo || null,
    })
    .eq('couple_id', data.coupleId)

  if (error) throw new Error(`Failed to save wedding details: ${error.message}`)
}

// ----------------------------------------------------------------
// Step 3 — Guest Essentials
// ----------------------------------------------------------------
export async function saveOnboardingStep3(data: {
  coupleId: string
  dressCode: string
  registryLinks: string[]
  hotelBlock: string
}): Promise<void> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { error } = await supabase
    .from('wedding_profiles')
    .update({
      dress_code: data.dressCode || null,
      registry_links: data.registryLinks.filter((l) => l.trim()),
      hotel_block: data.hotelBlock || null,
    })
    .eq('couple_id', data.coupleId)

  if (error) throw new Error(`Failed to save guest essentials: ${error.message}`)
}

// ----------------------------------------------------------------
// Step 4 — Tone & Personality
// ----------------------------------------------------------------
export async function saveOnboardingStep4(data: {
  coupleId: string
  tone: ToneStyle | null
  vibeWord: string
  sampleMessage: string
}): Promise<void> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { error } = await supabase
    .from('wedding_profiles')
    .update({
      tone: data.tone,
      vibe_word: data.vibeWord || null,
      sample_message: data.sampleMessage || null,
    })
    .eq('couple_id', data.coupleId)

  if (error) throw new Error(`Failed to save tone settings: ${error.message}`)
}

// ----------------------------------------------------------------
// Step 5 — Custom FAQs (replace all, reinsert)
// ----------------------------------------------------------------
export async function saveOnboardingStep5(data: {
  coupleId: string
  faqs: Array<{ question: string; answer: string; display_order: number }>
}): Promise<void> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { error: deleteError } = await supabase
    .from('faqs')
    .delete()
    .eq('couple_id', data.coupleId)

  if (deleteError) throw new Error(`Failed to clear FAQs: ${deleteError.message}`)

  const valid = data.faqs.filter((f) => f.question.trim())
  if (!valid.length) return

  const { error } = await supabase.from('faqs').insert(
    valid.map((f) => ({
      couple_id: data.coupleId,
      question: f.question,
      answer: f.answer,
      display_order: f.display_order,
    })),
  )

  if (error) throw new Error(`Failed to save FAQs: ${error.message}`)
}

// ----------------------------------------------------------------
// Step 6 — Readiness Check: persist computed score
// ----------------------------------------------------------------
export async function saveOnboardingStep6(data: {
  coupleId: string
  readinessScore: number
}): Promise<void> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { error } = await supabase
    .from('wedding_profiles')
    .update({ readiness_score: data.readinessScore })
    .eq('couple_id', data.coupleId)

  if (error) throw new Error(`Failed to save readiness score: ${error.message}`)
}

// ----------------------------------------------------------------
// Step 7 — Go Live: save partner email + activate profile
// ----------------------------------------------------------------
export async function saveOnboardingStep7(data: {
  coupleId: string
  partnerEmail: string
}): Promise<void> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const [coupleRes, profileRes] = await Promise.all([
    supabase
      .from('couples')
      .update({ partner_email: data.partnerEmail || null })
      .eq('id', data.coupleId),
    supabase
      .from('wedding_profiles')
      .update({ is_active: true })
      .eq('couple_id', data.coupleId),
  ])

  if (coupleRes.error) throw new Error(`Failed to update couple: ${coupleRes.error.message}`)
  if (profileRes.error) throw new Error(`Failed to activate profile: ${profileRes.error.message}`)
}

// ----------------------------------------------------------------
// Load existing onboarding data (resume support)
// ----------------------------------------------------------------
export async function getOnboardingData(clerkUserId: string): Promise<{
  coupleId: string
  yourName: string
  partnerName: string
  profile: {
    venueName: string
    venueAddress: string
    weddingDate: string
    ceremonyTime: string
    receptionTime: string
    parkingInfo: string
    dressCode: string
    registryLinks: string[]
    hotelBlock: string
    tone: ToneStyle | null
    vibeWord: string
    sampleMessage: string
  } | null
  faqs: Array<{ question: string; answer: string }>
} | null> {
  const supabase = getSupabaseUserClient(await getClerkToken())

  const { data: couple } = await supabase
    .from('couples')
    .select('id, your_name, partner_name')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!couple) return null

  const [profileResult, faqsResult] = await Promise.all([
    supabase
      .from('wedding_profiles')
      .select(
        'venue_name, venue_address, wedding_date, ceremony_time, reception_time, parking_info, dress_code, registry_links, hotel_block, tone, vibe_word, sample_message',
      )
      .eq('couple_id', couple.id)
      .maybeSingle(),
    supabase
      .from('faqs')
      .select('question, answer, display_order')
      .eq('couple_id', couple.id)
      .order('display_order'),
  ])

  const p = profileResult.data

  return {
    coupleId: couple.id as string,
    yourName: (couple.your_name as string | null) ?? '',
    partnerName: (couple.partner_name as string | null) ?? '',
    profile: p
      ? {
          venueName: (p.venue_name as string | null) ?? '',
          venueAddress: (p.venue_address as string | null) ?? '',
          weddingDate: (p.wedding_date as string | null) ?? '',
          ceremonyTime: (p.ceremony_time as string | null) ?? '',
          receptionTime: (p.reception_time as string | null) ?? '',
          parkingInfo: (p.parking_info as string | null) ?? '',
          dressCode: (p.dress_code as string | null) ?? '',
          registryLinks: (p.registry_links as string[] | null) ?? [],
          hotelBlock: (p.hotel_block as string | null) ?? '',
          tone: (p.tone as ToneStyle | null) ?? null,
          vibeWord: (p.vibe_word as string | null) ?? '',
          sampleMessage: (p.sample_message as string | null) ?? '',
        }
      : null,
    faqs: ((faqsResult.data ?? []) as Array<{ question: string; answer: string }>).map((f) => ({
      question: f.question,
      answer: f.answer,
    })),
  }
}
