'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getTwilioClient } from '@/lib/twilio/client'
import type { ToneStyle, Guest, GuestGroup, RsvpStatus } from '@/types'

// ----------------------------------------------------------------
// Supabase server helpers
// ----------------------------------------------------------------

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function getAuthedUserId(): Promise<string> {
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
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

// ----------------------------------------------------------------
// Shared message row type (used by page.tsx and DashboardClient)
// ----------------------------------------------------------------
export interface MessageRow {
  id: string
  body: string
  classified_as: string | null
  was_sent: boolean
  ai_confidence?: number | null
  created_at: string
  direction: string
  guest_phone_hash: string
  guest_phone: string | null
  guest_name: string | null
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
async function getAuthedContext(): Promise<{ supabase: ReturnType<typeof getSupabaseServerClient>; coupleId: string }> {
  const userId = await getAuthedUserId()
  const supabase = getSupabaseServerClient()

  const { data, error } = await supabase
    .from('couples')
    .select('id')
    .eq('auth_user_id', userId)
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
  guest_name: string | null
  messages: {
    id: string
    body: string
    classified_as: string | null
    was_sent: boolean
    ai_confidence?: number | null
    created_at: string
    direction: string
    conversation_id: string
    replied_to_message_id: string | null
  }[] | null
}

export async function refreshInboxMessages(): Promise<MessageRow[]> {
  const { supabase, coupleId } = await getAuthedContext()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      guest_phone_hash,
      guest_phone,
      guest_name,
      messages (
        id,
        body,
        classified_as,
        was_sent,
        ai_confidence,
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
        guest_phone: convo.guest_phone,
        guest_name: convo.guest_name,
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
  originalDraft?: string,
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

  // 5. Track draft adoption in couple_metrics
  if (originalDraft) {
    const draftUsed = parsed.data.replyBody.trim() === originalDraft.trim()
    const adminSupabase = getSupabaseServerClient()
    await adminSupabase.rpc('increment_couple_metrics', {
      p_couple_id: coupleId,
      p_date: new Date().toISOString().slice(0, 10),
      p_drafts_used: draftUsed ? 1 : 0,
      p_drafts_rewritten: draftUsed ? 0 : 1,
    })
  }
}

// ----------------------------------------------------------------
// Guest management actions
// ----------------------------------------------------------------

const GuestCreateSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  group_tag: z.enum(['bride_family', 'groom_family', 'bridal_party', 'friends', 'other', 'vendor_photo', 'vendor_music', 'vendor_floral', 'vendor_catering', 'vendor_venue', 'vendor_other']).default('other'),
  notes: z.string().max(1000).nullable().optional(),
})

export async function createGuestAction(
  data: z.infer<typeof GuestCreateSchema>
): Promise<Guest> {
  const parsed = GuestCreateSchema.safeParse(data)
  if (!parsed.success) throw new Error(`Invalid guest data: ${parsed.error.message}`)

  const { supabase, coupleId } = await getAuthedContext()

  const { data: guest, error } = await supabase
    .from('guests')
    .insert({
      couple_id: coupleId,
      name: parsed.data.name,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.trim() || null,
      group_tag: parsed.data.group_tag,
      notes: parsed.data.notes || null,
    })
    .select('id, created_at, updated_at, couple_id, name, phone, email, rsvp_status, rsvp_guest_count, dietary_restrictions, plus_one, plus_one_name, group_tag, notes, conversation_id')
    .single()

  if (error) throw new Error(`Failed to create guest: ${error.message}`)
  return guest as Guest
}

const GuestUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  rsvp_status: z.enum(['pending', 'yes', 'no', 'maybe']).optional(),
  rsvp_guest_count: z.number().int().min(0).max(20).optional(),
  dietary_restrictions: z.string().max(500).nullable().optional(),
  plus_one: z.boolean().optional(),
  plus_one_name: z.string().max(200).nullable().optional(),
  group_tag: z.enum(['bride_family', 'groom_family', 'bridal_party', 'friends', 'other', 'vendor_photo', 'vendor_music', 'vendor_floral', 'vendor_catering', 'vendor_venue', 'vendor_other']).optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function updateGuestAction(
  data: z.infer<typeof GuestUpdateSchema>
): Promise<Guest> {
  const parsed = GuestUpdateSchema.safeParse(data)
  if (!parsed.success) throw new Error(`Invalid guest data: ${parsed.error.message}`)

  const { supabase, coupleId } = await getAuthedContext()

  // Build update object with only defined fields
  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone?.trim() || null
  if (parsed.data.email !== undefined) updates.email = parsed.data.email?.trim() || null
  if (parsed.data.rsvp_status !== undefined) updates.rsvp_status = parsed.data.rsvp_status
  if (parsed.data.rsvp_guest_count !== undefined) updates.rsvp_guest_count = parsed.data.rsvp_guest_count
  if (parsed.data.dietary_restrictions !== undefined) updates.dietary_restrictions = parsed.data.dietary_restrictions
  if (parsed.data.plus_one !== undefined) updates.plus_one = parsed.data.plus_one
  if (parsed.data.plus_one_name !== undefined) updates.plus_one_name = parsed.data.plus_one_name
  if (parsed.data.group_tag !== undefined) updates.group_tag = parsed.data.group_tag
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes

  const { data: guest, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', parsed.data.id)
    .eq('couple_id', coupleId)
    .select('id, created_at, updated_at, couple_id, name, phone, email, rsvp_status, rsvp_guest_count, dietary_restrictions, plus_one, plus_one_name, group_tag, notes, conversation_id')
    .single()

  if (error) throw new Error(`Failed to update guest: ${error.message}`)
  return guest as Guest
}

export async function deleteGuestAction(guestId: string): Promise<void> {
  const { supabase, coupleId } = await getAuthedContext()

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('couple_id', coupleId)

  if (error) throw new Error(`Failed to delete guest: ${error.message}`)
}

export async function listGuestsAction(): Promise<Guest[]> {
  const { supabase, coupleId } = await getAuthedContext()

  const { data, error } = await supabase
    .from('guests')
    .select('id, created_at, updated_at, couple_id, name, phone, email, rsvp_status, rsvp_guest_count, dietary_restrictions, plus_one, plus_one_name, group_tag, notes, conversation_id')
    .eq('couple_id', coupleId)
    .order('name')

  if (error) throw new Error(`Failed to list guests: ${error.message}`)
  return (data ?? []) as Guest[]
}

const CSVRowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  group: z.enum(['bride_family', 'groom_family', 'bridal_party', 'friends', 'other', 'vendor_photo', 'vendor_music', 'vendor_floral', 'vendor_catering', 'vendor_venue', 'vendor_other']).default('other'),
})

export interface CSVImportResult {
  imported: number
  failed: number
  errors: string[]
}

export async function importGuestsCSVAction(csvContent: string): Promise<CSVImportResult> {
  const { supabase, coupleId } = await getAuthedContext()

  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row')
  }

  // Parse header to find column indices
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
  const nameIdx = header.indexOf('name')
  const phoneIdx = header.indexOf('phone')
  const emailIdx = header.indexOf('email')
  const groupIdx = header.indexOf('group')

  if (nameIdx === -1) {
    throw new Error('CSV must have a "Name" column')
  }

  const guests: Array<{
    couple_id: string
    name: string
    phone: string | null
    email: string | null
    group_tag: GuestGroup
  }> = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]
    if (!row.trim()) continue

    // Simple CSV parsing (handles basic quoted fields)
    const fields: string[] = []
    let field = ''
    let inQuotes = false
    for (let j = 0; j < row.length; j++) {
      const char = row[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(field.trim())
        field = ''
      } else {
        field += char
      }
    }
    fields.push(field.trim())

    const name = fields[nameIdx]?.trim() || ''
    if (!name) {
      errors.push(`Row ${i + 1}: Missing name`)
      continue
    }

    const phone = phoneIdx !== -1 ? fields[phoneIdx]?.trim() || null : null
    const email = emailIdx !== -1 ? fields[emailIdx]?.trim() || null : null
    const group = (groupIdx !== -1 ? fields[groupIdx]?.trim() : null) as GuestGroup | null

    // Normalize phone to E.164 if possible
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : null

    const parsed = CSVRowSchema.safeParse({
      name,
      phone: normalizedPhone,
      email,
      group: group || 'other',
    })

    if (!parsed.success) {
      errors.push(`Row ${i + 1}: ${parsed.error.issues.map(e => e.message).join(', ')}`)
      continue
    }

    guests.push({
      couple_id: coupleId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      group_tag: parsed.data.group,
    })
  }

  if (guests.length === 0) {
    return { imported: 0, failed: errors.length, errors }
  }

  const { error } = await supabase.from('guests').insert(guests)

  if (error) {
    throw new Error(`Failed to import guests: ${error.message}`)
  }

  return { imported: guests.length, failed: errors.length, errors }
}

function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters except leading +
  const digits = phone.replace(/[^\d]/g, '')
  if (digits.length === 10) {
    return `+1${digits}` // Assume US/Canada
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (phone.startsWith('+')) {
    return phone // Already E.164
  }
  return phone.length >= 10 ? `+${digits}` : phone
}

// ----------------------------------------------------------------
// Analytics: track inbox open
// ----------------------------------------------------------------
export async function trackInboxOpen(): Promise<void> {
  const { supabase, coupleId } = await getAuthedContext()

  const today = new Date().toISOString().slice(0, 10)

  // Upsert couple_metrics for today, incrementing inbox_opens
  const { error: metricsErr } = await supabase.rpc('increment_inbox_opens', {
    p_couple_id: coupleId,
    p_date: today,
  })

  // Fallback: if RPC doesn't exist yet, do upsert directly
  if (metricsErr) {
    const { data: existing } = await supabase
      .from('couple_metrics')
      .select('id, inbox_opens')
      .eq('couple_id', coupleId)
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('couple_metrics')
        .update({ inbox_opens: (existing.inbox_opens as number) + 1 })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('couple_metrics')
        .insert({ couple_id: coupleId, date: today, inbox_opens: 1 })
    }
  }

  // Update last_active_at on couples table
  await supabase
    .from('couples')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', coupleId)
}

// ----------------------------------------------------------------
// Analytics: get insights data for last 30 days
// ----------------------------------------------------------------
export interface DailyMetrics {
  date: string
  messages_received: number
  messages_auto_replied: number
  escalations: number
  drafts_used: number
  drafts_rewritten: number
  inbox_opens: number
}

export interface InsightsData {
  totalMessages: number
  autoReplyRate: number
  totalEscalations: number
  draftAdoptionRate: number
  totalInboxOpens: number
  dailyMetrics: DailyMetrics[]
}

export async function getInsightsData(): Promise<InsightsData> {
  const { supabase, coupleId } = await getAuthedContext()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('couple_metrics')
    .select('date, messages_received, messages_auto_replied, escalations, drafts_used, drafts_rewritten, inbox_opens')
    .eq('couple_id', coupleId)
    .gte('date', since)
    .order('date', { ascending: false })

  if (error) throw new Error(`Failed to fetch insights: ${error.message}`)

  const rows = (data ?? []) as DailyMetrics[]

  const totalMessages = rows.reduce((sum, r) => sum + r.messages_received, 0)
  const totalAutoReplied = rows.reduce((sum, r) => sum + r.messages_auto_replied, 0)
  const totalEscalations = rows.reduce((sum, r) => sum + r.escalations, 0)
  const totalDraftsUsed = rows.reduce((sum, r) => sum + r.drafts_used, 0)
  const totalDraftsRewritten = rows.reduce((sum, r) => sum + r.drafts_rewritten, 0)
  const totalInboxOpens = rows.reduce((sum, r) => sum + r.inbox_opens, 0)

  const autoReplyRate = totalMessages > 0
    ? Math.round((totalAutoReplied / totalMessages) * 100)
    : 0

  const totalDrafts = totalDraftsUsed + totalDraftsRewritten
  const draftAdoptionRate = totalDrafts > 0
    ? Math.round((totalDraftsUsed / totalDrafts) * 100)
    : 0

  return {
    totalMessages,
    autoReplyRate,
    totalEscalations,
    draftAdoptionRate,
    totalInboxOpens,
    dailyMetrics: rows,
  }
}

// ----------------------------------------------------------------
// Sign out action — clears auth cookies server-side
// ----------------------------------------------------------------
export async function signOutAction(): Promise<void> {
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
  
  await supabase.auth.signOut()
}

// ----------------------------------------------------------------
// Demo mode: Get demo couple data for Alex & Kirsten
// ----------------------------------------------------------------
export async function getDemoCoupleData(): Promise<{
  couple: { id: string; email: string; your_name: string; partner_name: string; partner_email: string | null; plan: string | null; usage_streak_weeks: number; churn_status: string }
  profile: {
    id: string
    venue_name: string
    venue_address: string
    wedding_date: string
    ceremony_time: string | null
    reception_time: string | null
    dress_code: string | null
    registry_links: string[] | null
    hotel_block: string | null
    parking_info: string | null
    tone: ToneStyle
    vibe_word: string | null
    sample_message: string | null
    readiness_score: number
    is_active: boolean
  }
  phoneNumber: string
  messages: MessageRow[]
} | null> {
  const supabase = await getSupabaseServerClient()
  
  // Find the demo couple
  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('id, email, your_name, partner_name, partner_email, plan, usage_streak_weeks, churn_status')
    .eq('email', 'ak.salsali2025@gmail.com')
    .maybeSingle()
  
  if (coupleError || !couple) {
    console.error('Demo couple not found:', coupleError)
    return null
  }
  
  // Get phone number
  const { data: phoneData } = await supabase
    .from('phone_numbers')
    .select('twilio_number')
    .eq('couple_id', couple.id)
    .maybeSingle()
  
  // Get profile
  const { data: profile } = await supabase
    .from('wedding_profiles')
    .select('id, venue_name, venue_address, wedding_date, ceremony_time, reception_time, dress_code, registry_links, hotel_block, parking_info, tone, vibe_word, sample_message, readiness_score, is_active')
    .eq('couple_id', couple.id)
    .maybeSingle()
  
  // Get messages via conversations (correct join direction — mirrors refreshInboxMessages)
  const { data: convosData } = await supabase
    .from('conversations')
    .select(`
      id,
      guest_phone_hash,
      guest_phone,
      guest_name,
      messages (
        id,
        body,
        classified_as,
        was_sent,
        ai_confidence,
        created_at,
        direction,
        replied_to_message_id
      )
    `)
    .eq('couple_id', couple.id)

  type DemoConvoRow = {
    id: string
    guest_phone_hash: string
    guest_phone: string | null
    guest_name: string | null
    messages: {
      id: string
      body: string
      classified_as: string | null
      was_sent: boolean
      ai_confidence: number | null
      created_at: string
      direction: string
      replied_to_message_id: string | null
    }[] | null
  }

  const transformedMessages: MessageRow[] = ((convosData ?? []) as unknown as DemoConvoRow[]).flatMap(
    (convo) =>
      (convo.messages ?? []).map((msg) => ({
        ...msg,
        guest_phone_hash: convo.guest_phone_hash,
        guest_phone: convo.guest_phone,
        guest_name: convo.guest_name,
        conversation_id: convo.id,
      }))
  )

  transformedMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  return {
    couple: {
      id: couple.id,
      email: couple.email,
      your_name: couple.your_name || 'Alex',
      partner_name: couple.partner_name || 'Kirsten',
      partner_email: couple.partner_email,
      plan: (couple as Record<string, unknown>).plan as string | null ?? null,
      usage_streak_weeks: (couple as Record<string, unknown>).usage_streak_weeks as number ?? 0,
      churn_status: (couple as Record<string, unknown>).churn_status as string ?? 'active',
    },
    profile: profile ? {
      id: profile.id,
      venue_name: profile.venue_name || '',
      venue_address: profile.venue_address || '',
      wedding_date: profile.wedding_date || '',
      ceremony_time: profile.ceremony_time,
      reception_time: profile.reception_time,
      dress_code: profile.dress_code,
      registry_links: profile.registry_links,
      hotel_block: profile.hotel_block,
      parking_info: profile.parking_info,
      tone: (profile.tone as ToneStyle) || 'warm',
      vibe_word: profile.vibe_word,
      sample_message: profile.sample_message,
      readiness_score: profile.readiness_score || 0,
      is_active: profile.is_active ?? true,
    } : {
      id: '',
      venue_name: 'The Manor by Peter and Paul',
      venue_address: '167 Main St, Whitchurch-Stouffville, ON',
      wedding_date: '2026-09-12',
      ceremony_time: '14:00',
      reception_time: '17:00',
      dress_code: 'Garden Party Elegant',
      registry_links: null,
      hotel_block: 'Hilton Garden Inn - 15% off',
      parking_info: 'Free valet parking',
      tone: 'warm',
      vibe_word: 'joyful',
      sample_message: "We're so excited to celebrate with you!",
      readiness_score: 95,
      is_active: true,
    },
    phoneNumber: phoneData?.twilio_number || '+1 (437) 523-1847',
    messages: transformedMessages,
  }
}