import type { MessageRow, ProfileUpdateFields } from './actions'

export type { MessageRow, ProfileUpdateFields }

export type View = 'home' | 'inbox' | 'circle' | 'guests' | 'profile' | 'settings'
export type InboxTab = 'needs-reply' | 'all'
export type ToneStyle = 'warm' | 'elegant' | 'playful'

export type EmotionalWeight = 'sensitive' | 'unclear' | 'routine'

export interface Conversation {
  id: string
  guest_phone_hash: string
  guest_phone: string | null
  guest_name: string | null
  messages: MessageRow[]
  lastMessageAt: string
  hasNeedsReply: boolean
  messageCount: number
  aiSummary?: string
  emotionalWeight: EmotionalWeight
}

export interface Couple {
  id: string
  email: string
  your_name: string | null
  partner_name: string | null
  partner_email: string | null
  plan: string | null
}

export interface Profile {
  id: string
  venue_name: string | null
  venue_address: string | null
  wedding_date: string | null
  ceremony_time: string | null
  reception_time: string | null
  dress_code: string | null
  registry_links: string[] | null
  hotel_block: string | null
  parking_info: string | null
  tone: ToneStyle | null
  vibe_word: string | null
  sample_message: string | null
  readiness_score: number
  is_active: boolean
}

export interface DashboardProps {
  couple: Couple
  profile: Profile | null
  phoneNumber: string | null
  initialMessages: MessageRow[]
  stats: { totalMessages: number; needsReply: number }
  isDemo?: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function buildProfileUpdate(field: string, value: string): ProfileUpdateFields {
  switch (field) {
    case 'venue_name': return { venue_name: value || null }
    case 'venue_address': return { venue_address: value || null }
    case 'wedding_date': return { wedding_date: value || null }
    case 'ceremony_time': return { ceremony_time: value || null }
    case 'reception_time': return { reception_time: value || null }
    case 'dress_code': return { dress_code: value || null }
    case 'registry_links': return { registry_links: value ? value.split('\n').map((s) => s.trim()).filter(Boolean) : null }
    case 'hotel_block': return { hotel_block: value || null }
    case 'parking_info': return { parking_info: value || null }
    case 'tone': return { tone: (value as ToneStyle) || null }
    case 'vibe_word': return { vibe_word: value || null }
    case 'sample_message': return { sample_message: value || null }
    default: return {}
  }
}

export function applyProfileUpdate(prev: Profile, field: string, value: string): Profile {
  if (field === 'registry_links') {
    return { ...prev, registry_links: value ? value.split('\n').map((s) => s.trim()).filter(Boolean) : null }
  }
  if (field === 'tone') return { ...prev, tone: (value as ToneStyle) || null }
  return { ...prev, [field]: value || null }
}

export function getFieldDraftValue(profile: Profile, field: string): string {
  if (field === 'registry_links') return (profile.registry_links ?? []).join('\n')
  const val = profile[field as keyof Profile]
  return val != null ? String(val) : ''
}

export const TEXTAREA_FIELDS = new Set(['parking_info', 'hotel_block', 'sample_message', 'registry_links'])
export const DATE_FIELDS = new Set(['wedding_date'])
export const TIME_FIELDS = new Set(['ceremony_time', 'reception_time'])
export const SELECT_FIELDS = new Set(['tone'])

function generateSummary(messages: MessageRow[]): string {
  const inbound = messages.filter((m) => m.direction === 'inbound')
  if (inbound.length === 0) return 'No messages yet'
  const content = inbound.map((m) => m.body.toLowerCase()).join(' ')
  const topics: string[] = []
  if (content.includes('rsvp') || content.includes('attend')) topics.push('RSVP')
  if (content.includes('food') || content.includes('allerg') || content.includes('diet')) topics.push('dietary')
  if (content.includes('gift') || content.includes('registry')) topics.push('gifts')
  if (content.includes('hotel') || content.includes('stay')) topics.push('accommodation')
  const lastClass = inbound[inbound.length - 1].classified_as
  const status = lastClass === 'escalated' ? 'Needs your attention' : lastClass === 'sensitive' ? 'Sensitive topic' : 'Routine question'
  return topics.length > 0 ? `${status} · ${topics.slice(0, 3).join(', ')}` : status
}

const WEIGHT_ORDER: Record<EmotionalWeight, number> = { sensitive: 0, unclear: 1, routine: 2 }

function computeEmotionalWeight(msgs: MessageRow[]): EmotionalWeight {
  const inbound = msgs.filter((m) => m.direction === 'inbound')
  if (inbound.some((m) => m.classified_as === 'escalated' || m.classified_as === 'sensitive')) return 'sensitive'
  if (inbound.some((m) => m.classified_as === 'unclear')) return 'unclear'
  return 'routine'
}

export function groupMessagesByConversation(messages: MessageRow[], repliedIds: Set<string>): Conversation[] {
  const convoMap = new Map<string, MessageRow[]>()
  messages.forEach((msg) => {
    const existing = convoMap.get(msg.conversation_id) || []
    existing.push(msg)
    convoMap.set(msg.conversation_id, existing)
  })
  const conversations: Conversation[] = []
  convoMap.forEach((msgs, convoId) => {
    msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const lastMsg = msgs[msgs.length - 1]
    const hasNeedsReply = msgs.some((m) => m.direction === 'inbound' && m.classified_as === 'escalated' && !repliedIds.has(m.id))
    const summary = generateSummary(msgs)
    const emotionalWeight = computeEmotionalWeight(msgs)
    conversations.push({ id: convoId, guest_phone_hash: lastMsg.guest_phone_hash, guest_phone: lastMsg.guest_phone, guest_name: lastMsg.guest_name, messages: msgs, lastMessageAt: lastMsg.created_at, hasNeedsReply, messageCount: msgs.length, aiSummary: summary, emotionalWeight })
  })
  // Sort: emotional weight first (sensitive > unclear > routine), then recency within each group
  return conversations.sort((a, b) => {
    const weightDiff = WEIGHT_ORDER[a.emotionalWeight] - WEIGHT_ORDER[b.emotionalWeight]
    if (weightDiff !== 0) return weightDiff
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  })
}

export function getConversationTitle(convo: Conversation): string {
  if (convo.guest_name) return convo.guest_name
  if (convo.guest_phone) return convo.guest_phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, 'Guest $2-$3-$4')
  return `Guest ····${convo.guest_phone_hash.slice(-4)}`
}

export function getInitials(convo: Conversation): string {
  if (convo.guest_name) {
    const parts = convo.guest_name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return convo.guest_name.slice(0, 2).toUpperCase()
  }
  return convo.guest_phone_hash.slice(-2).toUpperCase()
}
