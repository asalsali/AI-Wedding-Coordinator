'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  updateWeddingProfileField,
  updatePartnerEmailAction,
  refreshInboxMessages,
  sendReplyAction,
  signOutAction,
} from './actions'
import type { MessageRow, ProfileUpdateFields } from './actions'

// ─── Types ──────────────────────────────────────────────────────────────────────

type View = 'home' | 'inbox' | 'guests' | 'profile' | 'settings'
type InboxTab = 'needs-reply' | 'all'
type ToneStyle = 'warm' | 'elegant' | 'playful'

interface Conversation {
  id: string
  guest_phone_hash: string
  guest_phone: string | null
  guest_name: string | null
  messages: MessageRow[]
  lastMessageAt: string
  hasNeedsReply: boolean
  messageCount: number
  aiSummary?: string
}

interface Couple {
  id: string
  email: string
  your_name: string | null
  partner_name: string | null
  partner_email: string | null
}

interface Profile {
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

interface Props {
  couple: Couple
  profile: Profile | null
  phoneNumber: string | null
  initialMessages: MessageRow[]
  stats: { totalMessages: number; needsReply: number }
  isDemo?: boolean
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function buildProfileUpdate(field: string, value: string): ProfileUpdateFields {
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

function applyProfileUpdate(prev: Profile, field: string, value: string): Profile {
  if (field === 'registry_links') {
    return { ...prev, registry_links: value ? value.split('\n').map((s) => s.trim()).filter(Boolean) : null }
  }
  if (field === 'tone') return { ...prev, tone: (value as ToneStyle) || null }
  return { ...prev, [field]: value || null }
}

function getFieldDraftValue(profile: Profile, field: string): string {
  if (field === 'registry_links') return (profile.registry_links ?? []).join('\n')
  const val = profile[field as keyof Profile]
  return val != null ? String(val) : ''
}

const TEXTAREA_FIELDS = new Set(['parking_info', 'hotel_block', 'sample_message', 'registry_links'])
const DATE_FIELDS = new Set(['wedding_date'])
const TIME_FIELDS = new Set(['ceremony_time', 'reception_time'])
const SELECT_FIELDS = new Set(['tone'])

function groupMessagesByConversation(messages: MessageRow[]): Conversation[] {
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
    const hasNeedsReply = msgs.some((m) => m.direction === 'inbound' && m.classified_as === 'escalated')
    const summary = generateSummary(msgs)
    conversations.push({ id: convoId, guest_phone_hash: lastMsg.guest_phone_hash, guest_phone: lastMsg.guest_phone, guest_name: lastMsg.guest_name, messages: msgs, lastMessageAt: lastMsg.created_at, hasNeedsReply, messageCount: msgs.length, aiSummary: summary })
  })
  return conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
}

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

function getConversationTitle(convo: Conversation): string {
  if (convo.guest_name) return convo.guest_name
  if (convo.guest_phone) return convo.guest_phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, 'Guest $2-$3-$4')
  return `Guest ····${convo.guest_phone_hash.slice(-4)}`
}

function getInitials(convo: Conversation): string {
  if (convo.guest_name) {
    const parts = convo.guest_name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return convo.guest_name.slice(0, 2).toUpperCase()
  }
  return convo.guest_phone_hash.slice(-2).toUpperCase()
}

// ─── Icon (inline SVG) ─────────────────────────────────────────────────────────

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 9l9-7 9 7"/><path d="M5 9v11h14V9"/></>,
    inbox: <><path d="M3 5h18v14H3z"/><path d="M3 10h5l2 3h4l2-3h5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 17c.4-2.2 2-3.5 4-3.5 1 0 1.7.3 2 .6"/></>,
    ring: <><circle cx="12" cy="14" r="6"/><path d="M9 5l1.5 3m3 0L15 5"/><path d="M9 5h6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.8.4l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.6-1.1 1.7 1.7 0 00-.4-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
    arrowRight: <><path d="M4 12h16"/><path d="M14 6l6 6-6 6"/></>,
    check: <><path d="M4 12l5 5 11-11"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></>,
    send: <><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></>,
    refresh: <><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    shield: <><path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z"/><path d="M9 12l2 2 4-4"/></>,
    messageCircle: <><path d="M21 11.5a8.4 8.4 0 01-1 4 8.5 8.5 0 01-7.6 4.5 8.4 8.4 0 01-4-1L3 21l2-5.5a8.4 8.4 0 01-1-4 8.5 8.5 0 014.5-7.6 8.4 8.4 0 014-1h.5a8.5 8.5 0 018 8z"/></>,
    sparkle: <><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></>,
    mapPin: <><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/></>,
    flag: <><path d="M4 21V4"/><path d="M4 4h13l-2 4 2 4H4"/></>,
    signOut: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>,
    more: <><circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 000-7.7z"/></>,
    external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></>,
    x: <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths[name]}
    </svg>
  )
}

// ─── Profile Field ─────────────────────────────────────────────────────────────

function ProfileField({
  label, field, profile, editField, draftValue, saving, onEdit, onSave, onCancel, onDraftChange,
}: {
  label: string; field: string; profile: Profile; editField: string | null; draftValue: string; saving: boolean
  onEdit: (field: string, value: string) => void; onSave: (field: string) => void; onCancel: () => void; onDraftChange: (value: string) => void
}) {
  const isEditing = editField === field
  const currentDisplay = getFieldDraftValue(profile, field)

  return (
    <div
      style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '14px 18px', position: 'relative', transition: 'all 0.15s', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--wf-line-strong)' }}
      onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.borderColor = 'var(--wf-line)' }}
    >
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SELECT_FIELDS.has(field) ? (
            <select value={draftValue} onChange={(e) => onDraftChange(e.target.value)} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 10px', outline: 'none', fontFamily: 'var(--wf-sans)' }}>
              <option value="">— none —</option>
              <option value="warm">Warm</option>
              <option value="elegant">Elegant</option>
              <option value="playful">Playful</option>
            </select>
          ) : TEXTAREA_FIELDS.has(field) ? (
            <textarea value={draftValue} onChange={(e) => onDraftChange(e.target.value)} rows={field === 'registry_links' ? 3 : 2} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 10px', outline: 'none', resize: 'none', fontFamily: 'var(--wf-sans)' }} placeholder={field === 'registry_links' ? 'One URL per line' : ''} />
          ) : (
            <input type={DATE_FIELDS.has(field) ? 'date' : TIME_FIELDS.has(field) ? 'time' : 'text'} value={draftValue} onChange={(e) => onDraftChange(e.target.value)} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 10px', outline: 'none', fontFamily: 'var(--wf-sans)' }} />
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => onSave(field)} disabled={saving} className="wf-btn wf-btn-forest wf-btn-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={onCancel} disabled={saving} className="wf-btn wf-btn-ghost wf-btn-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="wf-sans" style={{ fontSize: 13, color: currentDisplay ? 'var(--wf-ink)' : 'var(--wf-ink-25)', fontStyle: currentDisplay ? 'normal' : 'italic', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: 28 }}>
            {currentDisplay || 'Not set'}
          </p>
          <button onClick={() => onEdit(field, currentDisplay)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--wf-cream-warm)'; e.currentTarget.style.color = 'var(--wf-forest)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--wf-ink-45)' }}>
            <Icon name="edit" size={13} />
          </button>
        </>
      )}
    </div>
  )
}

// ─── Reply Modal ───────────────────────────────────────────────────────────────

function ReplyModal({ inboundBody, initialDraft, onClose, onSend, isSending }: {
  inboundBody: string; initialDraft: string; onClose: () => void; onSend: (text: string) => void; isSending: boolean
}) {
  const TRIAL_CHAR_LIMIT = 120
  const truncated = initialDraft.length > TRIAL_CHAR_LIMIT ? initialDraft.slice(0, TRIAL_CHAR_LIMIT - 3) + '...' : initialDraft
  const [text, setText] = useState(truncated)
  const charCount = text.length
  const isOverLimit = charCount > TRIAL_CHAR_LIMIT

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: 'var(--wf-paper)', borderRadius: 20, boxShadow: 'var(--wf-shadow-xl)', width: '100%', maxWidth: 520 }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--wf-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="wf-serif" style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)' }}>Reply to guest</h3>
          <button onClick={onClose} disabled={isSending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, marginBottom: 8 }}>Guest&apos;s message</div>
            <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink)', background: 'var(--wf-cream-warm)', borderRadius: 10, padding: '12px 14px', margin: 0, lineHeight: 1.55 }}>
              {inboundBody}
            </p>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, marginBottom: 8 }}>Your reply</div>
            <div style={{ border: '1px solid var(--wf-line-strong)', borderRadius: 12, padding: '12px 14px 8px' }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} disabled={isSending} className="wf-sans" style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: 'var(--wf-ink)', fontFamily: 'var(--wf-sans)', lineHeight: 1.55, background: 'transparent' }} placeholder="Type your reply…" />
              <div style={{ textAlign: 'right', fontSize: 11, color: isOverLimit ? 'var(--wf-rose)' : 'var(--wf-ink-45)', marginTop: 4 }}>
                {isOverLimit ? `${charCount} / ${TRIAL_CHAR_LIMIT} — too long for trial` : `${charCount} / ${TRIAL_CHAR_LIMIT}`}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={isSending} className="wf-btn wf-btn-ghost">Cancel</button>
          <button onClick={() => onSend(text)} disabled={isSending || !text.trim() || isOverLimit} className="wf-btn wf-btn-primary">
            <Icon name="send" size={13} /> {isSending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DashboardClient({ couple, profile, phoneNumber, initialMessages, stats, isDemo = false }: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const [inboxTab, setInboxTab] = useState<InboxTab>('needs-reply')
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [localProfile, setLocalProfile] = useState<Profile | null>(profile)

  const daysUntilWedding = useMemo(() => {
    if (!localProfile?.wedding_date) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const wedding = new Date(localProfile.wedding_date); wedding.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  }, [localProfile?.wedding_date])

  const [editField, setEditField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  const [isSaving, startSave] = useTransition()
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(couple.partner_email ?? '')
  const [localPartnerEmail, setLocalPartnerEmail] = useState(couple.partner_email ?? '')
  const [isSavingEmail, startSaveEmail] = useTransition()
  const [isRefreshing, startRefresh] = useTransition()
  const [replyModal, setReplyModal] = useState<{ inboundMsg: MessageRow; draftBody: string; draftMsgId: string | null } | null>(null)
  const [isSendingReply, startSendReply] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'escalated' | 'routine'>('all')

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const conversations = useMemo(() => groupMessagesByConversation(messages), [messages])
  const filteredConversations = useMemo(() => {
    let filtered = conversations
    if (inboxTab === 'needs-reply') filtered = filtered.filter((c) => c.hasNeedsReply)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => c.guest_name?.toLowerCase().includes(q) || c.guest_phone?.toLowerCase().includes(q) || c.messages.some((m) => m.body.toLowerCase().includes(q)))
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((c) => priorityFilter === 'escalated' ? c.messages.some((m) => m.classified_as === 'escalated') : c.messages.every((m) => m.classified_as === 'routine'))
    }
    return filtered
  }, [conversations, inboxTab, searchQuery, priorityFilter])

  const selectedConversation = useMemo(() => conversations.find((c) => c.id === selectedConversationId) || null, [conversations, selectedConversationId])

  const coupleNames = [couple.your_name, couple.partner_name].filter(Boolean).join(' & ') || 'Your Wedding'

  const repliedInboundMsgIds = new Set(messages.filter((m) => m.direction === 'outbound' && m.was_sent && m.classified_as === 'escalated' && m.replied_to_message_id !== null).map((m) => m.replied_to_message_id as string))
  const needsReplyMessages = messages.filter((m) => m.direction === 'inbound' && m.classified_as === 'escalated' && !repliedInboundMsgIds.has(m.id))

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  function handleRefresh() {
    startRefresh(async () => {
      try { const fresh = await refreshInboxMessages(); setMessages(fresh) } catch { /* user can retry */ }
    })
  }

  function handleEditField(field: string, value: string) { setEditField(field); setDraftValue(value) }

  function handleSaveField(field: string) {
    if (!localProfile) return
    const updates = buildProfileUpdate(field, draftValue)
    startSave(async () => {
      try { await updateWeddingProfileField(updates); setLocalProfile((prev) => (prev ? applyProfileUpdate(prev, field, draftValue) : prev)); setEditField(null) } catch { /* keep edit state */ }
    })
  }

  function handleSaveEmail() {
    startSaveEmail(async () => {
      try { await updatePartnerEmailAction(emailDraft); setLocalPartnerEmail(emailDraft); setEditingEmail(false) } catch { /* keep edit state */ }
    })
  }

  function handleReplyClick(inboundMsg: MessageRow) {
    const draftMsg = messages.find((m) => m.conversation_id === inboundMsg.conversation_id && m.direction === 'outbound' && m.classified_as === 'escalated' && !m.was_sent)
    setReplyModal({ inboundMsg, draftBody: draftMsg?.body ?? '', draftMsgId: draftMsg?.id ?? null })
  }

  function handleSendReply(replyText: string) {
    if (!replyModal) return
    startSendReply(async () => {
      try {
        await sendReplyAction(replyModal.inboundMsg.conversation_id, replyText, replyModal.inboundMsg.id)
        setReplyModal(null)
        const fresh = await refreshInboxMessages()
        setMessages(fresh)
        setToast({ type: 'success', text: 'Reply sent!' })
      } catch (err) {
        setToast({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send reply. Please try again.' })
      }
    })
  }

  // ─── Nav items ────────────────────────────────────────────────────────────────

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox' },
    { id: 'guests', label: 'Guests', icon: 'users' },
    { id: 'profile', label: 'Wedding Profile', icon: 'ring' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  // ─── Home ─────────────────────────────────────────────────────────────────────

  function renderHome() {
    const autoReplied = messages.filter((m) => m.direction === 'outbound' && m.was_sent).length
    const totalIn = messages.filter((m) => m.direction === 'inbound').length
    const pct = totalIn > 0 ? Math.round((autoReplied / totalIn) * 100) : 0

    return (
      <div style={{ padding: '40px 48px 80px', maxWidth: 1080, margin: '0 auto' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 480px', minWidth: 0 }}>
            <span className="wf-eyebrow">Your dashboard</span>
            <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Welcome back, <em style={{ fontWeight: 500 }}>{coupleNames}.</em>
            </h1>
            {localProfile?.wedding_date && (
              <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>
                {localProfile.venue_name && `${localProfile.venue_name} · `}{daysUntilWedding > 0 ? `${daysUntilWedding} days to go` : 'Today! 🎉'}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleRefresh} disabled={isRefreshing} className="wf-btn wf-btn-ghost">
              <Icon name="refresh" size={14} /> {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={() => setView('inbox')} className="wf-btn wf-btn-forest">
              Open Inbox <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>

        {/* Hero card — phone number */}
        <div style={{ background: 'var(--wf-forest)', borderRadius: 28, overflow: 'hidden', marginBottom: 28, display: 'grid', gridTemplateColumns: '1.25fr 1fr', minHeight: 300, boxShadow: 'var(--wf-shadow-lg)' }}>
          <div style={{ padding: '44px 48px', color: 'var(--wf-cream)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="wf-eyebrow wf-eyebrow-forest">Your Wedflow number</span>
            <div className="wf-serif" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, color: 'var(--wf-cream)', marginTop: 14, marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {phoneNumber ? phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4') : 'Not yet assigned'}
            </div>
            <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-cream-ink)', marginBottom: 24, maxWidth: 360 }}>
              Share this with your guests. Every message they send lands in your inbox — quietly, in your voice.
            </p>
            {phoneNumber && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => navigator.clipboard.writeText(phoneNumber)} className="wf-btn" style={{ background: 'var(--wf-terracotta)', color: 'var(--wf-cream)', fontSize: 13 }}>
                  <Icon name="copy" size={13} /> Copy number
                </button>
              </div>
            )}
          </div>
          <div style={{ background: 'var(--wf-cream-warm)', position: 'relative', overflow: 'hidden' }}>
            <Image src="/Couple1.png" alt="Couple illustration" fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatTile eyebrow="Needs your reply" value={needsReplyMessages.length} hint={needsReplyMessages.length === 0 ? 'All caught up!' : 'waiting for you'} />
          <StatTile eyebrow="Total messages" value={stats.totalMessages} hint="+from your guests" />
          <StatTile eyebrow="Auto-replied" value={autoReplied} hint={`${pct}% handled for you`} />
          <StatTile eyebrow="Days until" value={daysUntilWedding > 0 ? daysUntilWedding : '🎉'} hint={localProfile?.wedding_date ? new Date(localProfile.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined} />
        </div>

        {/* Recent messages */}
        {needsReplyMessages.length > 0 && (
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '24px 26px' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', margin: 0 }}>Waiting for you</h3>
              <p className="wf-sans" style={{ fontSize: 12.5, color: 'var(--wf-ink-45)', margin: '4px 0 0' }}>Messages the AI held for your review</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {needsReplyMessages.slice(0, 4).map((msg) => {
                const initials = msg.guest_name ? msg.guest_name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : msg.guest_phone_hash.slice(-2).toUpperCase()
                const name = msg.guest_name || (msg.guest_phone ? msg.guest_phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, 'Guest $2-$3-$4') : `Guest ···${msg.guest_phone_hash.slice(-4)}`)
                const isSensitive = msg.classified_as === 'sensitive' || msg.classified_as === 'escalated'
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'var(--wf-cream)', border: '1px solid var(--wf-cream-border)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--wf-line-strong)'; e.currentTarget.style.background = 'var(--wf-cream-warm)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--wf-cream-border)'; e.currentTarget.style.background = 'var(--wf-cream)' }}
                    onClick={() => { setView('inbox'); setInboxTab('needs-reply') }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(28,59,43,0.08)', color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span className="wf-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--wf-forest)' }}>{name}</span>
                        <span className="wf-sans" style={{ fontSize: 10.5, color: 'var(--wf-ink-45)' }}>{timeAgo(msg.created_at)}</span>
                      </div>
                      <p className="wf-sans" style={{ fontSize: 12.5, color: 'var(--wf-ink-60)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.body}</p>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 10.5, color: isSensitive ? 'var(--wf-rose)' : 'var(--wf-sage)', fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSensitive ? 'var(--wf-rose)' : 'var(--wf-sage)' }} />
                      {isSensitive ? 'Sensitive' : 'Routine'}
                    </span>
                  </div>
                )
              })}
            </div>
            <button onClick={() => setView('inbox')} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--wf-forest)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--wf-sans)' }}>
              View all in Inbox <Icon name="arrowRight" size={12} />
            </button>
          </div>
        )}

        {needsReplyMessages.length === 0 && (
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '48px 26px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(123,145,116,0.15)', color: 'var(--wf-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Icon name="check" size={22} />
            </div>
            <h3 className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 6px' }}>All caught up</h3>
            <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', margin: 0 }}>No messages waiting for your reply right now.</p>
          </div>
        )}
      </div>
    )
  }

  // ─── Inbox ────────────────────────────────────────────────────────────────────

  function renderInbox() {
    const needsReplyCount = conversations.filter((c) => c.hasNeedsReply).length
    const totalCount = conversations.length
    const isEmpty = filteredConversations.length === 0

    return (
      <div style={{ display: 'grid', gridTemplateColumns: selectedConversation ? '340px 1fr' : '1fr', height: 'calc(100vh - 0px)', background: 'var(--wf-cream)' }}>
        {/* Thread list */}
        <div style={{ borderRight: '1px solid var(--wf-line)', display: 'flex', flexDirection: 'column', background: 'var(--wf-cream)' }}>
          <div style={{ padding: '24px 22px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h2 className="wf-serif" style={{ fontSize: 24, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Inbox</h2>
              <button onClick={handleRefresh} disabled={isRefreshing} style={{ background: 'none', border: 'none', color: 'var(--wf-ink-60)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--wf-sans)' }}>
                <Icon name="refresh" size={13} /> {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--wf-ink-45)' }}>
                <Icon name="search" size={14} />
              </div>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search threads" className="wf-sans" style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 999, fontSize: 13, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink)', outline: 'none' }} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 2 }}>✕</button>}
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--wf-cream-warm)', borderRadius: 10, padding: 3 }}>
              {([['needs-reply', 'Needs reply', needsReplyCount], ['all', 'All', totalCount]] as [InboxTab, string, number][]).map(([k, label, count]) => (
                <button key={k} onClick={() => setInboxTab(k)} className="wf-sans" style={{ flex: 1, padding: '7px 10px', background: inboxTab === k ? 'var(--wf-paper)' : 'transparent', border: 'none', borderRadius: 8, boxShadow: inboxTab === k ? 'var(--wf-shadow-sm)' : 'none', fontSize: 12, fontWeight: 500, color: inboxTab === k ? 'var(--wf-forest)' : 'var(--wf-ink-60)', cursor: 'pointer', fontFamily: 'var(--wf-sans)' }}>
                  {label} · {count}
                </button>
              ))}
            </div>
          </div>

          {/* Thread list */}
          <div className="wf-scroll" style={{ flex: 1, overflow: 'auto', padding: '4px 10px 20px' }}>
            {isEmpty ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Image src="/Couple2.png" alt="No messages" width={160} height={128} style={{ margin: '0 auto 16px', opacity: 0.7 }} />
                <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontWeight: 500, fontSize: 13 }}>
                  {inboxTab === 'needs-reply' ? 'Nothing needs a reply right now.' : 'No conversations yet.'}
                </p>
                <p className="wf-sans" style={{ color: 'var(--wf-ink-45)', fontSize: 12, marginTop: 4 }}>
                  {inboxTab === 'needs-reply' ? 'Check back after guests reach out.' : 'Share your number with guests to get started.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const title = getConversationTitle(convo)
                const initials = getInitials(convo)
                const isSel = convo.id === selectedConversationId
                const lastMsg = convo.messages[convo.messages.length - 1]
                const toneDot = convo.hasNeedsReply ? 'var(--wf-rose)' : 'var(--wf-sage)'

                return (
                  <button key={convo.id} onClick={() => setSelectedConversationId(isSel ? null : convo.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px', background: isSel ? 'var(--wf-paper)' : 'transparent', border: isSel ? '1px solid var(--wf-line)' : '1px solid transparent', borderRadius: 12, cursor: 'pointer', marginBottom: 2, boxShadow: isSel ? 'var(--wf-shadow-sm)' : 'none', transition: 'all 0.15s', fontFamily: 'var(--wf-sans)' }}
                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--wf-paper)' }}
                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(28,59,43,0.1)', color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', gap: 6 }} className="wf-sans">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: toneDot, flexShrink: 0 }} />
                            {title}
                          </span>
                          <span className="wf-sans" style={{ fontSize: 10.5, color: 'var(--wf-ink-45)', flexShrink: 0 }}>{timeAgo(lastMsg.created_at)}</span>
                        </div>
                        <p className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)', margin: 0, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {lastMsg.body}
                        </p>
                        {convo.hasNeedsReply && (
                          <div style={{ marginTop: 6 }}>
                            <span className="wf-sans" style={{ fontSize: 10, color: 'var(--wf-terracotta-deep)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              ● Waiting for you
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Conversation detail */}
        {selectedConversation && (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--wf-cream-warm)' }}>
            {/* Thread header */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--wf-line)', background: 'var(--wf-cream)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--wf-forest)', color: 'var(--wf-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--wf-serif)', fontWeight: 600, fontSize: 16 }}>
                {getInitials(selectedConversation)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <h3 className="wf-serif" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--wf-forest)' }}>{getConversationTitle(selectedConversation)}</h3>
                  {selectedConversation.hasNeedsReply && (
                    <span className="wf-badge wf-badge-sensitive"><Icon name="shield" size={10} /> Sensitive</span>
                  )}
                </div>
                {selectedConversation.guest_phone && (
                  <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)', marginTop: 2, fontFamily: 'monospace' }}>
                    {selectedConversation.guest_phone} · {selectedConversation.messageCount} messages
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {selectedConversation.hasNeedsReply && (
                  <button onClick={() => handleReplyClick(selectedConversation.messages.filter((m) => m.direction === 'inbound' && m.classified_as === 'escalated').slice(-1)[0])} className="wf-btn wf-btn-primary wf-btn-sm">
                    <Icon name="send" size={12} /> Reply
                  </button>
                )}
                <button onClick={() => setSelectedConversationId(null)} className="wf-btn wf-btn-ghost wf-btn-sm">
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="wf-scroll" style={{ flex: 1, overflow: 'auto', padding: '36px 60px 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
              {selectedConversation.messages.map((msg, i) => {
                const isIn = msg.direction === 'inbound'
                return (
                  <div key={i} style={{ alignSelf: isIn ? 'flex-start' : 'flex-end', maxWidth: '75%' }}>
                    {msg.classified_as === 'escalated' && isIn && (
                      <div className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-terracotta-deep)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
                        <Icon name="shield" size={11} /> Held for your review — not auto-replied
                      </div>
                    )}
                    <div style={{ background: isIn ? 'var(--wf-paper)' : 'var(--wf-forest)', color: isIn ? 'var(--wf-ink)' : 'var(--wf-cream)', border: isIn ? '1px solid var(--wf-line)' : 'none', padding: '12px 16px', borderRadius: 16, borderTopLeftRadius: isIn ? 4 : 16, borderTopRightRadius: isIn ? 16 : 4, fontSize: 14, lineHeight: 1.55, boxShadow: isIn ? 'var(--wf-shadow-sm)' : '0 4px 14px rgba(28,59,43,0.14)' }}>
                      {msg.body}
                    </div>
                    <div className="wf-sans" style={{ fontSize: 10.5, color: 'var(--wf-ink-45)', marginTop: 5, paddingLeft: isIn ? 12 : 0, paddingRight: isIn ? 0 : 12, textAlign: isIn ? 'left' : 'right', display: 'flex', gap: 6, justifyContent: isIn ? 'flex-start' : 'flex-end' }}>
                      {msg.was_sent && !isIn && <span style={{ color: 'var(--wf-sage)', fontWeight: 600 }}>✓ Auto-replied</span>}
                      <span>{timeAgo(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Guests ───────────────────────────────────────────────────────────────────

  function renderGuests() {
    return (
      <div style={{ padding: '40px 48px 80px', maxWidth: 800, margin: '0 auto' }}>
        <span className="wf-eyebrow">Guest list</span>
        <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 32px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Everyone you&apos;ll <em style={{ fontWeight: 500 }}>celebrate with.</em>
        </h1>
        <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '48px 32px', textAlign: 'center' }}>
          <Image src="/Couple2.png" alt="Guests" width={200} height={160} style={{ margin: '0 auto 24px', opacity: 0.7 }} />
          <h3 className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 8px' }}>Guest list coming soon</h3>
          <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-60)', margin: 0 }}>We&apos;re building a better way to manage your guest list.</p>
        </div>
      </div>
    )
  }

  // ─── Profile ──────────────────────────────────────────────────────────────────

  function renderProfile() {
    if (!localProfile) {
      return (
        <div style={{ padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
          <p className="wf-sans" style={{ color: 'var(--wf-ink-60)' }}>No wedding profile found. Please complete onboarding.</p>
        </div>
      )
    }

    const fieldProps = {
      profile: localProfile, editField, draftValue, saving: isSaving,
      onEdit: handleEditField, onSave: handleSaveField, onCancel: () => setEditField(null), onDraftChange: setDraftValue,
    }

    const phoneFormatted = phoneNumber ? phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4') : null

    return (
      <div style={{ padding: '40px 48px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <span className="wf-eyebrow">Wedding profile</span>
          <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            The details your <em style={{ fontWeight: 500 }}>AI knows by heart.</em>
          </h1>
          <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>Edit anything — we&apos;ll retrain your concierge in seconds.</p>
        </div>

        {/* Phone + readiness */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 28 }}>
          <div style={{ background: 'var(--wf-forest)', borderRadius: 20, padding: '28px 32px', color: 'var(--wf-cream)' }}>
            <span className="wf-eyebrow wf-eyebrow-forest">Your Wedflow number</span>
            <div className="wf-serif" style={{ fontSize: 42, fontWeight: 500, marginTop: 14, marginBottom: 8, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
              {phoneFormatted || 'Not yet assigned'}
            </div>
            {phoneFormatted && (
              <button onClick={() => navigator.clipboard.writeText(phoneNumber!)} className="wf-btn wf-btn-sm" style={{ background: 'rgba(253,251,247,0.12)', color: 'var(--wf-cream)', border: '1px solid rgba(253,251,247,0.2)' }}>
                <Icon name="copy" size={12} /> Copy
              </button>
            )}
          </div>
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span className="wf-eyebrow">Readiness</span>
              <span className="wf-serif" style={{ fontSize: 32, fontWeight: 600, color: 'var(--wf-forest)' }}>{localProfile.readiness_score}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--wf-cream-warm)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${localProfile.readiness_score}%`, height: '100%', background: `linear-gradient(90deg, var(--wf-terracotta), #d18860)`, transition: 'width 0.5s' }} />
            </div>
            <p className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: localProfile.is_active ? '#6ea260' : 'var(--wf-ink-25)' }} />
              {localProfile.is_active ? 'Active and responding — no missing details.' : 'Not yet active.'}
            </p>
          </div>
        </div>

        {/* Venue & Date */}
        <ProfileSectionHeader icon="mapPin" title="Venue & date" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <ProfileField label="Venue name" field="venue_name" {...fieldProps} />
          <ProfileField label="Venue address" field="venue_address" {...fieldProps} />
          <ProfileField label="Wedding date" field="wedding_date" {...fieldProps} />
          <ProfileField label="Ceremony time" field="ceremony_time" {...fieldProps} />
          <ProfileField label="Reception time" field="reception_time" {...fieldProps} />
          <ProfileField label="Parking info" field="parking_info" {...fieldProps} />
        </div>

        {/* Guest info */}
        <ProfileSectionHeader icon="users" title="Guest information" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          <ProfileField label="Dress code" field="dress_code" {...fieldProps} />
          <ProfileField label="Hotel block" field="hotel_block" {...fieldProps} />
          <ProfileField label="Registry links (one per line)" field="registry_links" {...fieldProps} />
        </div>

        {/* Tone & Voice */}
        <ProfileSectionHeader icon="sparkle" title="Tone & voice" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <ProfileField label="Tone style" field="tone" {...fieldProps} />
          <ProfileField label="Vibe word" field="vibe_word" {...fieldProps} />
          <div style={{ gridColumn: 'span 3' }}>
            <ProfileField label="Sample message (for AI calibration)" field="sample_message" {...fieldProps} />
          </div>
        </div>
      </div>
    )
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  function renderSettings() {
    return (
      <div style={{ padding: '40px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <span className="wf-eyebrow">Settings</span>
          <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Shape how <em style={{ fontWeight: 500 }}>your concierge behaves.</em>
          </h1>
          <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>Account, notifications, and billing.</p>
        </div>

        {/* Account */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(196,113,74,0.12)', color: 'var(--wf-terracotta-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="users" size={14} />
            </div>
            <h2 className="wf-serif" style={{ fontSize: 20, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Your account</h2>
          </div>
          <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, padding: '16px 22px', borderBottom: '1px solid var(--wf-line)', alignItems: 'center' }}>
              <div>
                <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Account email</div>
                <div className="wf-sans" style={{ fontSize: 11.5, color: 'var(--wf-ink-45)', marginTop: 3 }}>Managed by Clerk — edit in your account settings</div>
              </div>
              <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)' }}>{couple.email}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, padding: '16px 22px', alignItems: 'center' }}>
              <div>
                <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Partner email</div>
                <div className="wf-sans" style={{ fontSize: 11.5, color: 'var(--wf-ink-45)', marginTop: 3 }}>For notifications and shared access</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {editingEmail ? (
                  <>
                    <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="partner@example.com" className="wf-sans" style={{ fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontFamily: 'var(--wf-sans)' }} />
                    <button onClick={handleSaveEmail} disabled={isSavingEmail} className="wf-btn wf-btn-forest wf-btn-sm">
                      {isSavingEmail ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEmailDraft(localPartnerEmail); setEditingEmail(false) }} disabled={isSavingEmail} className="wf-btn wf-btn-ghost wf-btn-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', fontStyle: localPartnerEmail ? 'normal' : 'italic' }}>
                      {localPartnerEmail || 'Not set'}
                    </span>
                    <button onClick={() => { setEmailDraft(localPartnerEmail); setEditingEmail(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4 }}>
                      <Icon name="edit" size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ marginTop: 32, padding: '20px 24px', background: 'rgba(180,84,78,0.06)', border: '1px solid rgba(180,84,78,0.2)', borderRadius: 14 }}>
          <h3 className="wf-serif" style={{ color: 'var(--wf-rose)', margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>Danger zone</h3>
          <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', margin: '0 0 12px' }}>
            Permanently removes your wedding profile and all guest messages. This can&apos;t be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button disabled className="wf-btn wf-btn-light wf-btn-sm" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Coming soon">Delete all data</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Layout ───────────────────────────────────────────────────────────────────

  const isInboxFullHeight = view === 'inbox'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: 'var(--wf-cream)' }}>
      {/* Sidebar */}
      <aside style={{ background: 'var(--wf-forest)', color: 'var(--wf-cream)', padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 28px' }}>
          <div style={{ width: 104, height: 104, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Image src="/LogoDark.png" alt="Wedflow" width={168} height={168} style={{ width: 168, height: 168, objectFit: 'contain', flexShrink: 0 }} />
          </div>
          <span className="wf-serif" style={{ fontSize: 20, fontWeight: 600 }}>Wedflow</span>
        </div>

        {/* Couple card */}
        <div style={{ background: 'rgba(253,251,247,0.06)', border: '1px solid rgba(253,251,247,0.1)', borderRadius: 14, padding: '14px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--wf-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--wf-serif)', fontWeight: 600, fontSize: 14, color: 'var(--wf-cream)' }}>
            {coupleNames.split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wf-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--wf-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{coupleNames}</div>
            {daysUntilWedding > 0 && <div className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-cream-ink-50)' }}>{daysUntilWedding} days to go</div>}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((n) => {
            const active = view === n.id
            return (
              <button key={n.id} onClick={() => setView(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: active ? 'var(--wf-cream)' : 'transparent', color: active ? 'var(--wf-forest)' : 'var(--wf-cream-ink)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--wf-sans)', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(253,251,247,0.06)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <Icon name={n.icon} size={17} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.id === 'inbox' && needsReplyMessages.length > 0 && (
                  <span style={{ background: 'var(--wf-terracotta)', color: 'var(--wf-cream)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, minWidth: 18, textAlign: 'center' }}>
                    {needsReplyMessages.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer: readiness + sign out */}
        <div style={{ marginTop: 'auto' }}>
          {localProfile && (
            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(253,251,247,0.05)', border: '1px solid rgba(253,251,247,0.08)', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--wf-cream-ink-50)' }}>Readiness</span>
                <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-cream)', fontWeight: 600 }}>{localProfile.readiness_score}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(253,251,247,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${localProfile.readiness_score}%`, height: '100%', background: 'var(--wf-terracotta)' }} />
              </div>
              <div className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-cream-ink-50)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: localProfile.is_active ? '#6ea260' : 'rgba(253,251,247,0.3)' }} />
                {localProfile.is_active ? 'Active & responding' : 'Not yet active'}
              </div>
            </div>
          )}
          <button onClick={async () => { await signOutAction(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', color: 'var(--wf-cream-ink-50)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--wf-sans)' }}>
            <Icon name="signOut" size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ overflow: isInboxFullHeight ? 'hidden' : 'auto', height: isInboxFullHeight ? '100vh' : 'auto' }}>
        {view === 'home' && renderHome()}
        {view === 'inbox' && renderInbox()}
        {view === 'guests' && renderGuests()}
        {view === 'profile' && renderProfile()}
        {view === 'settings' && renderSettings()}
      </main>

      {/* Reply modal */}
      {replyModal && (
        <ReplyModal
          inboundBody={replyModal.inboundMsg.body}
          initialDraft={replyModal.draftBody}
          onClose={() => setReplyModal(null)}
          onSend={handleSendReply}
          isSending={isSendingReply}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 16px', borderRadius: 12, boxShadow: 'var(--wf-shadow-lg)', fontSize: 13, fontWeight: 500, color: 'var(--wf-cream)', background: toast.type === 'success' ? '#4a6141' : 'var(--wf-rose)', zIndex: 50, fontFamily: 'var(--wf-sans)' }}>
          {toast.text}
        </div>
      )}
    </div>
  )
}

// ─── Profile section header ────────────────────────────────────────────────────

function ProfileSectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,113,74,0.12)', color: 'var(--wf-terracotta-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} />
      </div>
      <h2 className="wf-serif" style={{ fontSize: 22, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>{title}</h2>
      <span style={{ flex: 1, height: 1, background: 'var(--wf-line)', marginLeft: 12 }} />
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ eyebrow, value, hint }: { eyebrow: string; value: string | number; hint?: string }) {
  return (
    <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 18, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>{eyebrow}</div>
      <div className="wf-serif" style={{ fontSize: 44, fontWeight: 600, color: 'var(--wf-forest)', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 10, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)' }}>{hint}</div>}
    </div>
  )
}
