'use server'

import { auth } from '@clerk/nextjs/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { ToneStyle } from '@/types'

// ----------------------------------------------------------------
// Shared message row type (used by page.tsx and DashboardClient)
// ----------------------------------------------------------------
export interface MessageRow {
  id: string
  body: string
  classified_as: string | null
  was_sent: boolean
  created_at: string
  direction: string
  guest_phone_hash: string
}

// ----------------------------------------------------------------
// Profile update fields type
// ----------------------------------------------------------------
export type ProfileUpdateFields = {
  venue_name?: string | null
  venue_address?: string | null
  wedding_date?: string | null
  ceremony_time?: string | null
  reception_time?: string | null
  dress_code?: string | null
  registry_links?: string[] | null
  hotel_block?: string | null
  parking_info?: string | null
  tone?: ToneStyle | null
  vibe_word?: string | null
  sample_message?: string | null
}

// ----------------------------------------------------------------
// Internal: resolve couple_id from the authed Clerk session
// ----------------------------------------------------------------
async function getAuthedCoupleId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('couples')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (error || !data) throw new Error('Couple not found')
  return data.id as string
}

// ----------------------------------------------------------------
// Update wedding profile fields
// ----------------------------------------------------------------
export async function updateWeddingProfileField(updates: ProfileUpdateFields): Promise<void> {
  const coupleId = await getAuthedCoupleId()
  const supabase = getSupabaseServerClient()

  const { error } = await supabase
    .from('wedding_profiles')
    .update(updates)
    .eq('couple_id', coupleId)

  if (error) throw new Error(`Failed to update profile: ${error.message}`)
}

// ----------------------------------------------------------------
// Update partner email
// ----------------------------------------------------------------
export async function updatePartnerEmailAction(email: string): Promise<void> {
  const coupleId = await getAuthedCoupleId()
  const supabase = getSupabaseServerClient()

  const { error } = await supabase
    .from('couples')
    .update({ partner_email: email.trim() || null })
    .eq('id', coupleId)

  if (error) throw new Error(`Failed to update partner email: ${error.message}`)
}

// ----------------------------------------------------------------
// Refresh inbox messages (manual pull)
// ----------------------------------------------------------------
type ConvoRow = {
  id: string
  guest_phone_hash: string
  messages: {
    id: string
    body: string
    classified_as: string | null
    was_sent: boolean
    created_at: string
    direction: string
  }[] | null
}

export async function refreshInboxMessages(): Promise<MessageRow[]> {
  const coupleId = await getAuthedCoupleId()
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      guest_phone_hash,
      messages (
        id,
        body,
        classified_as,
        was_sent,
        created_at,
        direction
      )
    `)
    .eq('couple_id', coupleId)

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)

  const rows: MessageRow[] = ((data ?? []) as unknown as ConvoRow[]).flatMap((convo) =>
    (convo.messages ?? []).map((msg) => ({
      ...msg,
      guest_phone_hash: convo.guest_phone_hash,
    })),
  )

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return rows
}
