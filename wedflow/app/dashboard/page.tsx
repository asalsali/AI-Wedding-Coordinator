import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClerkToken } from '@/lib/supabase/get-clerk-token'
import { getSupabaseUserClient } from '@/lib/supabase/client-user'
import DashboardClient from './DashboardClient'
import type { MessageRow } from './actions'

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

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const token = await getClerkToken()
  const supabase = getSupabaseUserClient(token)

  const { data: couple } = await supabase
    .from('couples')
    .select('id, email, your_name, partner_name, partner_email')
    .eq('clerk_user_id', user.id)
    .maybeSingle()

  if (!couple) redirect('/onboarding')

  const coupleId = couple.id as string

  const [profileRes, phoneRes, convosRes] = await Promise.all([
    supabase
      .from('wedding_profiles')
      .select(
        'id, venue_name, venue_address, wedding_date, ceremony_time, reception_time, dress_code, registry_links, hotel_block, parking_info, tone, vibe_word, sample_message, readiness_score, is_active',
      )
      .eq('couple_id', coupleId)
      .maybeSingle(),
    supabase
      .from('phone_numbers')
      .select('twilio_number')
      .eq('couple_id', coupleId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
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
      .eq('couple_id', coupleId),
  ])

  const messages: MessageRow[] = ((convosRes.data ?? []) as unknown as ConvoRow[]).flatMap(
    (convo) =>
      (convo.messages ?? []).map((msg) => ({
        ...msg,
        guest_phone_hash: convo.guest_phone_hash,
        conversation_id: convo.id,
      })),
  )
  messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalMessages = messages.filter((m) => m.direction === 'inbound').length
  const escalatedInboundConvIds = new Set(
    messages
      .filter((m) => m.direction === 'inbound' && m.classified_as === 'escalated')
      .map((m) => m.conversation_id),
  )
  const repliedConvIds = new Set(
    messages
      .filter(
        (m) =>
          m.direction === 'outbound' &&
          m.was_sent &&
          escalatedInboundConvIds.has(m.conversation_id),
      )
      .map((m) => m.conversation_id),
  )
  const needsReply = messages.filter(
    (m) =>
      m.direction === 'inbound' &&
      m.classified_as === 'escalated' &&
      !repliedConvIds.has(m.conversation_id),
  ).length

  const weddingDate = profileRes.data?.wedding_date as string | null | undefined
  let daysUntilWedding: number | null = null
  if (weddingDate) {
    const diff = new Date(weddingDate).getTime() - Date.now()
    daysUntilWedding = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const p = profileRes.data

  return (
    <DashboardClient
      couple={{
        id: coupleId,
        email: couple.email as string,
        your_name: couple.your_name as string | null,
        partner_name: couple.partner_name as string | null,
        partner_email: couple.partner_email as string | null,
      }}
      profile={
        p
          ? {
              id: p.id as string,
              venue_name: p.venue_name as string | null,
              venue_address: p.venue_address as string | null,
              wedding_date: p.wedding_date as string | null,
              ceremony_time: p.ceremony_time as string | null,
              reception_time: p.reception_time as string | null,
              dress_code: p.dress_code as string | null,
              registry_links: p.registry_links as string[] | null,
              hotel_block: p.hotel_block as string | null,
              parking_info: p.parking_info as string | null,
              tone: p.tone as 'warm' | 'elegant' | 'playful' | null,
              vibe_word: p.vibe_word as string | null,
              sample_message: p.sample_message as string | null,
              readiness_score: p.readiness_score as number,
              is_active: p.is_active as boolean,
            }
          : null
      }
      phoneNumber={(phoneRes.data?.twilio_number as string | null) ?? null}
      initialMessages={messages}
      stats={{ totalMessages, needsReply, daysUntilWedding }}
    />
  )
}
