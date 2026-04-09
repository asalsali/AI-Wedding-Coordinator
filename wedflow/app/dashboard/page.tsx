import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'
import type { MessageRow } from './actions'
import { getDemoCoupleData } from './actions'

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
    status: string | null
    ai_confidence: number | null
    created_at: string
    direction: string
    replied_to_message_id: string | null
  }[] | null
}

async function getUser() {
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
  return user
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>
}) {
  const params = await searchParams
  const isDemo = params.demo === 'true'
  
  // If demo mode, load demo couple data
  if (isDemo) {
    const demoData = await getDemoCoupleData()
    if (demoData) {
      const messages = demoData.messages
      const needsReply = messages.filter(
        (m) => m.direction === 'inbound' && m.classified_as === 'escalated'
      )
      const stats = {
        totalMessages: messages.filter((m) => m.direction === 'inbound').length,
        needsReply: needsReply.length,
      }
      return (
        <DashboardClient
          couple={demoData.couple}
          profile={demoData.profile}
          phoneNumber={demoData.phoneNumber}
          initialMessages={messages}
          stats={stats}
          isDemo={true}
        />
      )
    }
  }
  
  const user = await getUser()
  if (!user) redirect('/sign-in')

  // Create service role client for database queries
  const { createClient } = await import('@supabase/supabase-js')
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: couple } = await serviceClient
    .from('couples')
    .select('id, email, your_name, partner_name, partner_email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!couple) redirect('/onboarding')

  const coupleId = couple.id as string

  const [profileRes, phoneRes, convosRes] = await Promise.all([
    serviceClient
      .from('wedding_profiles')
      .select(
        'id, venue_name, venue_address, wedding_date, ceremony_time, reception_time, dress_code, registry_links, hotel_block, parking_info, tone, vibe_word, sample_message, readiness_score, is_active',
      )
      .eq('couple_id', coupleId)
      .maybeSingle(),
    serviceClient
      .from('phone_numbers')
      .select('twilio_number')
      .eq('couple_id', coupleId)
      .eq('status', 'active')
      .maybeSingle(),
    serviceClient
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
      .eq('couple_id', coupleId),
  ])

  const messages: MessageRow[] = ((convosRes.data ?? []) as unknown as ConvoRow[]).flatMap(
    (convo) =>
      (convo.messages ?? []).map((msg) => ({
        ...msg,
        guest_phone_hash: convo.guest_phone_hash,
        guest_phone: convo.guest_phone,
        guest_name: convo.guest_name,
        conversation_id: convo.id,
      })),
  )
  messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalMessages = messages.filter((m) => m.direction === 'inbound').length
  const repliedInboundMsgIds = new Set(
    messages
      .filter(
        (m) =>
          m.direction === 'outbound' &&
          m.was_sent &&
          m.classified_as === 'escalated' &&
          m.replied_to_message_id !== null,
      )
      .map((m) => m.replied_to_message_id as string),
  )
  const needsReply = messages.filter(
    (m) =>
      m.direction === 'inbound' &&
      m.classified_as === 'escalated' &&
      !repliedInboundMsgIds.has(m.id),
  ).length

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
      stats={{ totalMessages, needsReply }}
      isDemo={false}
    />
  )
}
