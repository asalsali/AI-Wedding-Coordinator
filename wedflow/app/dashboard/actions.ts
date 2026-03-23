'use server'

import { auth } from '@clerk/nextjs/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getClerkToken } from '@/lib/supabase/get-clerk-token'
import { getSupabaseUserClient } from '@/lib/supabase/client-user'
import { getTwilioClient } from '@/lib/twilio/client'
import type { ToneStyle } from '@/types'

// requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

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
  conversation_id: string
  replied_to_message_id: string | null
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
// Internal: create a user-scoped Supabase client and resolve couple_id
// ----------------------------------------------------------------
async function getAuthedContext(): Promise<{ supabase: SupabaseClient; coupleId: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const token = await getClerkToken()
  const supabase = getSupabaseUserClient(token)

  const { data, error } = await supabase
    .from('couples')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle()

  if (error || !data) throw new Error('Couple not found')
  return { supabase, coupleId: data.id as string }
}

// ----------------------------------------------------------------
// Update wedding profile fields
// ----------------------------------------------------------------
export async function updateWeddingProfileField(updates: ProfileUpdateFields): Promise<void> {
  const { supabase, coupleId } = await getAuthedContext()

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
  const { supabase, coupleId } = await getAuthedContext()

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
  guest_phone: string | null
  messages: {
    id: string
    body: string
    classified_as: string | null
    was_sent: boolean
    created_at: string
    direction: string
    conversation_id: string
    replied_to_message_id: string | null
  }[] | null
}

export async function refreshInboxMessages(): Promise<MessageRow[]> {
  const _token = await getClerkToken()
  const { supabase, coupleId } = await getAuthedContext()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      guest_phone_hash,
      guest_phone,
      messages (
        id,
        body,
        classified_as,
        was_sent,
        created_at,
        direction,
        conversation_id,
        replied_to_message_id
      )
    `)
    .eq('couple_id', coupleId)

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)

  const conversations = (data ?? []) as unknown as ConvoRow[]

  const rows: MessageRow[] = conversations.flatMap((convo) =>
    (convo.messages ?? []).map((msg) => ({
      ...msg,
      guest_phone_hash: convo.guest_phone_hash,
      conversation_id: convo.id,
    })),
  )

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return rows
}

// ----------------------------------------------------------------
// Send reply to guest — inserts a new outbound message linked to
// the specific inbound message being answered.
// ----------------------------------------------------------------

const SendReplySchema = z.object({
  conversationId: z.string().uuid(),
  replyBody: z.string().min(1).max(1600),
  inboundMessageId: z.string().uuid(),
})

const ConvPhoneRowSchema = z.object({ guest_phone: z.string().min(1) })
const TwilioNumberRowSchema = z.object({ twilio_number: z.string().min(1) })

export async function sendReplyAction(
  conversationId: string,
  replyBody: string,
  inboundMessageId: string,
): Promise<void> {
  const parsed = SendReplySchema.safeParse({ conversationId, replyBody, inboundMessageId })
  if (!parsed.success) throw new Error('Invalid reply parameters')

  const { supabase, coupleId } = await getAuthedContext()

  // 1. Get guest's raw phone from the conversation (RLS ensures it belongs to this couple)
  const { data: convRow, error: convErr } = await supabase
    .from('conversations')
    .select('guest_phone')
    .eq('id', conversationId)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (convErr) throw new Error(`Failed to load conversation: ${convErr.message}`)

  const convParsed = ConvPhoneRowSchema.safeParse(convRow)
  if (!convParsed.success) {
    throw new Error(
      'Guest phone number not available for this conversation. ' +
      'The guest must text again before you can reply (older conversations pre-date this feature).'
    )
  }

  // 2. Get couple's active Twilio number
  const { data: phoneRow, error: phoneErr } = await supabase
    .from('phone_numbers')
    .select('twilio_number')
    .eq('couple_id', coupleId)
    .eq('status', 'active')
    .maybeSingle()

  if (phoneErr) throw new Error(`Failed to load phone number: ${phoneErr.message}`)

  const phoneParsed = TwilioNumberRowSchema.safeParse(phoneRow)
  if (!phoneParsed.success) throw new Error('No active Wedflow number found for your account')

  // 3. Send the SMS via Twilio — must succeed before we write to DB
  const twilioClient = getTwilioClient()
  try {
    await twilioClient.messages.create({
      body: parsed.data.replyBody,
      from: phoneParsed.data.twilio_number,
      to: convParsed.data.guest_phone,
    })
  } catch (error) {
    console.error('[send-reply-action]', error)
    throw error
  }

  // 4. Insert a new outbound message linked to the specific inbound message
  const { error: insertErr } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    body: parsed.data.replyBody,
    classified_as: 'escalated',
    was_sent: true,
    sent_at: new Date().toISOString(),
    replied_to_message_id: parsed.data.inboundMessageId,
  })

  if (insertErr) throw new Error(`Failed to record sent message: ${insertErr.message}`)
}
