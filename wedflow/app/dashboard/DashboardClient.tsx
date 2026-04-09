'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'

const C = {
  forest: '#1C3B2B',
  cream: '#FDFBF7',
  terracotta: '#C4714A',
  text: '#1A1A1A',
}
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  updateWeddingProfileField,
  updatePartnerEmailAction,
  refreshInboxMessages,
  sendReplyAction,
  signOutAction,
} from './actions'
import type { MessageRow, ProfileUpdateFields } from './actions'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type View = 'home' | 'inbox' | 'guests' | 'profile' | 'settings'
type InboxTab = 'needs-reply' | 'all'
type ToneStyle = 'warm' | 'elegant' | 'playful'

// Conversation thread type
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
  stats: {
    totalMessages: number
    needsReply: number
  }
  isDemo?: boolean
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function classificationBadge(c: string | null): { label: string; className: string } {
  switch (c) {
    case 'routine':
      return { label: 'Routine', className: 'bg-green-100 text-green-700' }
    case 'sensitive':
      return { label: 'Sensitive', className: 'bg-red-100 text-red-700' }
    case 'unclear':
      return { label: 'Unclear', className: 'bg-yellow-100 text-yellow-700' }
    case 'escalated':
      return { label: 'Escalated', className: 'bg-orange-100 text-orange-700' }
    default:
      return { label: 'Unknown', className: 'bg-stone-100 text-stone-500' }
  }
}

function buildProfileUpdate(field: string, value: string): ProfileUpdateFields {
  switch (field) {
    case 'venue_name':
      return { venue_name: value || null }
    case 'venue_address':
      return { venue_address: value || null }
    case 'wedding_date':
      return { wedding_date: value || null }
    case 'ceremony_time':
      return { ceremony_time: value || null }
    case 'reception_time':
      return { reception_time: value || null }
    case 'dress_code':
      return { dress_code: value || null }
    case 'registry_links':
      return {
        registry_links: value
          ? value
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
      }
    case 'hotel_block':
      return { hotel_block: value || null }
    case 'parking_info':
      return { parking_info: value || null }
    case 'tone':
      return { tone: (value as ToneStyle) || null }
    case 'vibe_word':
      return { vibe_word: value || null }
    case 'sample_message':
      return { sample_message: value || null }
    default:
      return {}
  }
}

function applyProfileUpdate(prev: Profile, field: string, value: string): Profile {
  if (field === 'registry_links') {
    return {
      ...prev,
      registry_links: value
        ? value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
    }
  }
  if (field === 'tone') {
    return { ...prev, tone: (value as ToneStyle) || null }
  }
  return { ...prev, [field]: value || null }
}

function getFieldDraftValue(profile: Profile, field: string): string {
  if (field === 'registry_links') {
    return (profile.registry_links ?? []).join('\n')
  }
  const val = profile[field as keyof Profile]
  return val != null ? String(val) : ''
}

const TEXTAREA_FIELDS = new Set(['parking_info', 'hotel_block', 'sample_message', 'registry_links'])
const DATE_FIELDS = new Set(['wedding_date'])
const TIME_FIELDS = new Set(['ceremony_time', 'reception_time'])
const SELECT_FIELDS = new Set(['tone'])

// ----------------------------------------------------------------
// Conversation Helpers
// ----------------------------------------------------------------

function groupMessagesByConversation(messages: MessageRow[]): Conversation[] {
  const convoMap = new Map<string, MessageRow[]>()

  // Group messages by conversation_id
  messages.forEach((msg) => {
    const existing = convoMap.get(msg.conversation_id) || []
    existing.push(msg)
    convoMap.set(msg.conversation_id, existing)
  })

  // Convert to Conversation objects
  const conversations: Conversation[] = []
  convoMap.forEach((msgs, convoId) => {
    // Sort messages chronologically
    msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const lastMsg = msgs[msgs.length - 1]
    const hasNeedsReply = msgs.some(
      (m) => m.direction === 'inbound' && m.classified_as === 'escalated'
    )

    // Generate a simple AI-like summary based on message content
    const summary = generateConversationSummary(msgs)

    conversations.push({
      id: convoId,
      guest_phone_hash: lastMsg.guest_phone_hash,
      guest_phone: lastMsg.guest_phone,
      guest_name: lastMsg.guest_name,
      messages: msgs,
      lastMessageAt: lastMsg.created_at,
      hasNeedsReply,
      messageCount: msgs.length,
      aiSummary: summary,
    })
  })

  // Sort by most recent message
  return conversations.sort((a, b) =>
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

function generateConversationSummary(messages: MessageRow[]): string {
  const inbound = messages.filter((m) => m.direction === 'inbound')
  const outbound = messages.filter((m) => m.direction === 'outbound')

  if (inbound.length === 0) return 'No messages yet'

  const lastInbound = inbound[inbound.length - 1]
  const lastClassification = lastInbound.classified_as

  const topics: string[] = []
  const content = inbound.map((m) => m.body.toLowerCase()).join(' ')

  if (content.includes('rsvp') || content.includes('coming') || content.includes('attend')) {
    topics.push('RSVP')
  }
  if (content.includes('plus') || content.includes('guest') || content.includes('date')) {
    topics.push('plus-one')
  }
  if (content.includes('food') || content.includes('diet') || content.includes('allerg') || content.includes('vegan') || content.includes('vegetarian')) {
    topics.push('dietary')
  }
  if (content.includes('gift') || content.includes('registry')) {
    topics.push('gifts')
  }
  if (content.includes('hotel') || content.includes('stay') || content.includes('accommodat')) {
    topics.push('accommodation')
  }
  if (content.includes('sorry') || content.includes('can\'t make') || content.includes('decline')) {
    topics.push('regret')
  }

  let status = ''
  if (lastClassification === 'escalated') {
    status = 'Needs your attention'
  } else if (lastClassification === 'sensitive') {
    status = 'Sensitive topic'
  } else if (lastClassification === 'routine') {
    status = 'Routine question'
  } else {
    status = 'Question'
  }

  if (topics.length > 0) {
    return `${status} · ${topics.slice(0, 3).join(', ')}`
  }

  return status
}

function getConversationTitle(convo: Conversation): string {
  // Use guest name if available
  if (convo.guest_name) {
    return convo.guest_name
  }
  if (convo.guest_phone) {
    return convo.guest_phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, 'Guest $2-$3-$4')
  }
  return `Guest ····${convo.guest_phone_hash.slice(-4)}`
}

function getInitials(convo: Conversation): string {
  // Use guest name initials if available
  if (convo.guest_name) {
    const parts = convo.guest_name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return convo.guest_name.slice(0, 2).toUpperCase()
  }
  // Fallback to phone hash
  return convo.guest_phone_hash.slice(-2).toUpperCase()
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-semibold" style={{ color: C.forest }}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

function MessageCard({ message, onReply }: { message: MessageRow; onReply?: () => void }) {
  const badge = classificationBadge(message.classified_as)

  // Format phone number for display
  const phoneDisplay = message.guest_phone
    ? message.guest_phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4')
    : `···${message.guest_phone_hash.slice(-4)}`

  // Get initials from guest name or phone hash as avatar
  const initials = message.guest_name
    ? message.guest_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : message.guest_phone_hash.slice(-2).toUpperCase()

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium" style={{ backgroundColor: `${C.forest}1A`, color: C.forest }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-stone-600 font-medium">
            {phoneDisplay}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="text-xs text-stone-400 ml-auto">{timeAgo(message.created_at)}</span>
        </div>
        <p className="text-sm text-stone-700 line-clamp-2">{message.body}</p>
      </div>
      {onReply && (
        <div className="flex-shrink-0">
          <button
            onClick={onReply}
            className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: C.forest }}
          >
            Reply
          </button>
        </div>
      )}
    </div>
  )
}

function ThreadCard({
  conversation,
  onReply,
}: {
  conversation: Conversation
  onReply?: (msg: MessageRow) => void
}) {
  const title = getConversationTitle(conversation)
  const initials = getInitials(conversation)
  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const needsReply = conversation.hasNeedsReply

  // Find the most recent question that needs a reply
  const pendingQuestion = needsReply
    ? [...conversation.messages]
        .reverse()
        .find((m) => m.direction === 'inbound' && m.classified_as === 'escalated')
    : null

  // Find AI responses to previous questions (routine questions that got auto-replied)
  const routinePairs: { question: MessageRow; response: MessageRow | null }[] = []
  conversation.messages.forEach((msg, i) => {
    if (msg.direction === 'inbound' && msg.classified_as === 'routine') {
      // Look for the next outbound message that was sent
      const response = conversation.messages
        .slice(i + 1)
        .find((m) => m.direction === 'outbound' && m.was_sent)
      routinePairs.push({ question: msg, response: response || null })
    }
  })

  return (
    <div className={`bg-white rounded-xl border p-5 ${needsReply ? 'border-orange-200 bg-orange-50/20' : 'border-stone-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
            style={{ backgroundColor: `${C.forest}1A`, color: C.forest }}
          >
            {initials}
          </div>
          <div>
            <h3 className="font-medium text-stone-900">{title}</h3>
            {conversation.guest_phone && (
              <p className="text-xs text-stone-500 font-mono">{conversation.guest_phone}</p>
            )}
            {!conversation.guest_phone && conversation.aiSummary && (
              <p className="text-xs text-stone-500">{conversation.aiSummary}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-stone-400">{timeAgo(lastMessage.created_at)}</span>
      </div>

      {/* Thread Content */}
      <div className="space-y-4">
        {/* Pending Question (Needs Reply) */}
        {pendingQuestion && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👋</span>
              <div className="flex-1">
                <p className="text-sm text-stone-800 mb-2">{pendingQuestion.body}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-600 font-medium">Waiting for your reply</span>
                  <span className="text-xs text-stone-400">· {timeAgo(pendingQuestion.created_at)}</span>
                </div>
              </div>
            </div>
            {onReply && (
              <button
                onClick={() => onReply(pendingQuestion)}
                className="mt-3 w-full py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: C.terracotta }}
              >
                Reply
              </button>
            )}
          </div>
        )}

        {/* Routine Q&A Pairs */}
        {routinePairs.slice(-2).reverse().map((pair, idx) => (
          <div key={pair.question.id} className="border-l-2 border-stone-200 pl-4 space-y-3">
            {/* Question */}
            <div>
              <p className="text-sm text-stone-700">{pair.question.body}</p>
              <span className="text-xs text-stone-400">{timeAgo(pair.question.created_at)}</span>
            </div>

            {/* Response */}
            {pair.response && (
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-sm text-stone-600">{pair.response.body}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600 font-medium">✓ Auto-replied</span>
                  <span className="text-xs text-stone-400">· {timeAgo(pair.response.created_at)}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Show message count if there are more */}
        {conversation.messages.length > (routinePairs.length + (pendingQuestion ? 1 : 0)) && (
          <p className="text-xs text-stone-400 text-center">
            {conversation.messages.length} total messages
          </p>
        )}
      </div>
    </div>
  )
}

function ProfileField({
  label,
  field,
  profile,
  editField,
  draftValue,
  saving,
  onEdit,
  onSave,
  onCancel,
  onDraftChange,
}: {
  label: string
  field: string
  profile: Profile
  editField: string | null
  draftValue: string
  saving: boolean
  onEdit: (field: string, value: string) => void
  onSave: (field: string) => void
  onCancel: () => void
  onDraftChange: (value: string) => void
}) {
  const isEditing = editField === field
  const currentDisplay = getFieldDraftValue(profile, field)

  return (
    <div
      className="bg-white rounded-xl p-4 relative group h-full"
      style={{ border: '1px solid rgba(28,59,43,0.08)', boxShadow: '0 1px 4px rgba(28,59,43,0.05)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'rgba(28,59,43,0.5)' }}>
        {label}
      </p>
      {isEditing ? (
        <div className="space-y-2">
          {SELECT_FIELDS.has(field) ? (
            <select
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]"
            >
              <option value="">- none -</option>
              <option value="warm">Warm</option>
              <option value="elegant">Elegant</option>
              <option value="playful">Playful</option>
            </select>
          ) : TEXTAREA_FIELDS.has(field) ? (
            <textarea
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={field === 'registry_links' ? 3 : 2}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B] resize-none"
              placeholder={field === 'registry_links' ? 'One URL per line' : ''}
            />
          ) : (
            <input
              type={DATE_FIELDS.has(field) ? 'date' : TIME_FIELDS.has(field) ? 'time' : 'text'}
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]"
            />
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => onSave(field)}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: C.forest }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p
            className="text-sm break-words whitespace-pre-wrap pr-12"
            style={{ color: currentDisplay ? C.text : 'rgba(26,26,26,0.35)', fontStyle: currentDisplay ? 'normal' : 'italic' }}
          >
            {currentDisplay || 'Not set'}
          </p>
          <button
            onClick={() => onEdit(field, currentDisplay)}
            className="absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: C.forest, backgroundColor: 'rgba(28,59,43,0.08)' }}
          >
            Edit
          </button>
        </>
      )}
    </div>
  )
}

function ReplyModal({
  inboundBody,
  initialDraft,
  onClose,
  onSend,
  isSending,
}: {
  inboundBody: string
  initialDraft: string
  onClose: () => void
  onSend: (text: string) => void
  isSending: boolean
}) {
  const TRIAL_CHAR_LIMIT = 120
  const truncated =
    initialDraft.length > TRIAL_CHAR_LIMIT
      ? initialDraft.slice(0, TRIAL_CHAR_LIMIT - 3) + '...'
      : initialDraft
  const [text, setText] = useState(truncated)
  const charCount = text.length
  const isOverLimit = charCount > TRIAL_CHAR_LIMIT

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900">Reply to guest</h3>
          <button
            onClick={onClose}
            disabled={isSending}
            className="text-stone-400 hover:text-stone-600 disabled:opacity-50 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
              Guest&apos;s message
            </p>
            <p className="text-sm text-stone-700 bg-stone-50 rounded-lg px-4 py-3">
              {inboundBody}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
              Your reply
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              disabled={isSending}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B] resize-none disabled:opacity-50"
              placeholder="Type your reply..."
            />
            {isOverLimit ? (
              <p className="text-xs mt-1 text-red-600 font-medium">
                {charCount} / {TRIAL_CHAR_LIMIT} chars - Message too long for trial account - keep under {TRIAL_CHAR_LIMIT} characters
              </p>
            ) : (
              <p className="text-xs mt-1 text-right text-stone-400">
                {charCount} / {TRIAL_CHAR_LIMIT} chars
              </p>
            )}
          </div>
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSend(text)}
            disabled={isSending || !text.trim() || isOverLimit}
            className="px-4 py-2 text-sm font-medium text-white disabled:opacity-50 rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: C.forest }}
          >
            {isSending ? 'Sending...' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------
// Main component
// ----------------------------------------------------------------

export default function DashboardClient({
  couple,
  profile,
  phoneNumber,
  initialMessages,
  stats,
  isDemo = false,
}: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('home')
  const [inboxTab, setInboxTab] = useState<InboxTab>('needs-reply')
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [localProfile, setLocalProfile] = useState<Profile | null>(profile)

  const daysUntilWedding = useMemo(() => {
    if (!localProfile?.wedding_date) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const wedding = new Date(localProfile.wedding_date)
    wedding.setHours(0, 0, 0, 0)
    const diff = wedding.getTime() - today.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localProfile?.wedding_date])

  // Inline edit state - profile
  const [editField, setEditField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  const [isSaving, startSave] = useTransition()

  // Inline edit state - partner email
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(couple.partner_email ?? '')
  const [localPartnerEmail, setLocalPartnerEmail] = useState(couple.partner_email ?? '')
  const [isSavingEmail, startSaveEmail] = useTransition()

  // Inbox refresh
  const [isRefreshing, startRefresh] = useTransition()

  // Reply modal
  const [replyModal, setReplyModal] = useState<{
    inboundMsg: MessageRow
    draftBody: string
    draftMsgId: string | null
  } | null>(null)
  const [isSendingReply, startSendReply] = useTransition()

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Conversations state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'escalated' | 'routine'>('all')
  const conversations = useMemo(() => groupMessagesByConversation(messages), [messages])

  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Filter by tab (needs reply vs all)
    if (inboxTab === 'needs-reply') {
      filtered = filtered.filter((c) => c.hasNeedsReply)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => {
        const nameMatch = c.guest_name?.toLowerCase().includes(query)
        const phoneMatch = c.guest_phone?.toLowerCase().includes(query)
        const contentMatch = c.messages.some(m => m.body.toLowerCase().includes(query))
        return nameMatch || phoneMatch || contentMatch
      })
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((c) => {
        if (priorityFilter === 'escalated') {
          return c.messages.some(m => m.classified_as === 'escalated')
        }
        if (priorityFilter === 'routine') {
          return c.messages.every(m => m.classified_as === 'routine')
        }
        return true
      })
    }

    return filtered
  }, [conversations, inboxTab, searchQuery, priorityFilter])

  const selectedConversation = useMemo(() =>
    conversations.find((c) => c.id === selectedConversationId) || null,
  [conversations, selectedConversationId])

  const coupleNames =
    [couple.your_name, couple.partner_name].filter(Boolean).join(' & ') || 'Your Wedding'

  // "Needs reply" = inbound escalated messages that have no outbound sent reply
  // linked to them specifically via replied_to_message_id.
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
  const needsReplyMessages = messages.filter(
    (m) =>
      m.direction === 'inbound' &&
      m.classified_as === 'escalated' &&
      !repliedInboundMsgIds.has(m.id),
  )

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  function handleRefresh() {
    startRefresh(async () => {
      try {
        const fresh = await refreshInboxMessages()
        setMessages(fresh)
      } catch {
        // user can retry
      }
    })
  }

  function handleEditField(field: string, value: string) {
    setEditField(field)
    setDraftValue(value)
  }

  function handleSaveField(field: string) {
    if (!localProfile) return
    const updates = buildProfileUpdate(field, draftValue)
    startSave(async () => {
      try {
        await updateWeddingProfileField(updates)
        setLocalProfile((prev) => (prev ? applyProfileUpdate(prev, field, draftValue) : prev))
        setEditField(null)
      } catch {
        // keep edit state so user can retry
      }
    })
  }

  function handleSaveEmail() {
    startSaveEmail(async () => {
      try {
        await updatePartnerEmailAction(emailDraft)
        setLocalPartnerEmail(emailDraft)
        setEditingEmail(false)
      } catch {
        // keep edit state
      }
    })
  }

  function handleReplyClick(inboundMsg: MessageRow) {
    const draftMsg = messages.find(
      (m) =>
        m.conversation_id === inboundMsg.conversation_id &&
        m.direction === 'outbound' &&
        m.classified_as === 'escalated' &&
        !m.was_sent,
    )
    setReplyModal({
      inboundMsg,
      draftBody: draftMsg?.body ?? '',
      draftMsgId: draftMsg?.id ?? null,
    })
  }

  function handleSendReply(replyText: string) {
    if (!replyModal) return
    const { inboundMsg } = replyModal
    startSendReply(async () => {
      try {
        await sendReplyAction(inboundMsg.conversation_id, replyText, inboundMsg.id)
        setReplyModal(null)
        const fresh = await refreshInboxMessages()
        setMessages(fresh)
setToast({ type: 'success', text: 'Reply sent!' })
      } catch (err) {
        setToast({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to send reply. Please try again.',
        })
      }
    })
  }

  // ----------------------------------------------------------------
  // Nav
  // ----------------------------------------------------------------

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'inbox', label: 'Inbox', icon: '✉' },
    { id: 'guests', label: 'Guests', icon: '👥' },
    { id: 'profile', label: 'Profile', icon: '💍' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ]

  // ----------------------------------------------------------------
  // Views
  // ----------------------------------------------------------------

  function renderHome() {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="rounded-2xl p-8" style={{ backgroundColor: C.forest }}>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: C.cream }}>
            Welcome back, {coupleNames} 💍
          </h1>
          <p className="text-sm" style={{ color: 'rgba(253,251,247,0.7)' }}>
            Here&apos;s a snapshot of your Wedflow dashboard.
          </p>
        </div>

        <div className="flex justify-center">
          <Image
            src="/Couple1.png"
            alt="Couple illustration"
            width={400}
            height={320}
            className="rounded-2xl object-cover max-w-full"
            priority
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total messages" value={stats.totalMessages} sub="from your guests" />
          <StatCard
            label="Needs reply"
            value={needsReplyMessages.length}
            sub={needsReplyMessages.length === 0 ? 'All caught up!' : 'waiting for you'}
          />
          <StatCard
            label="Days until wedding"
            value={
              daysUntilWedding === null
                ? '-'
                : daysUntilWedding === 0
                  ? 'Today! 🎉'
                  : daysUntilWedding
            }
            sub={daysUntilWedding !== null && daysUntilWedding > 0 ? 'to go' : undefined}
          />
        </div>

        <button
          onClick={() => setView('inbox')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-xl transition-colors hover:opacity-90"
          style={{ backgroundColor: C.terracotta }}
        >
          Go to Inbox →
        </button>
      </div>
    )
  }

  function renderInbox() {
    const isEmpty = filteredConversations.length === 0
    const needsReplyCount = conversations.filter((c) => c.hasNeedsReply).length
    const totalCount = conversations.length

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Inbox</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isRefreshing ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </>
            ) : (
              <>↻ Refresh</>
            )}
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col gap-4">
          {/* Tabs row */}
          <div className="flex border-b border-stone-200">
            {(
              [
                { id: 'needs-reply', label: `Needs reply${needsReplyCount > 0 ? ` (${needsReplyCount})` : ''}` },
                { id: 'all', label: `All threads${totalCount > 0 ? ` (${totalCount})` : ''}` },
              ] as { id: InboxTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setInboxTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  inboxTab === tab.id
                    ? 'border-[#1C3B2B] text-[#1C3B2B]'
                    : 'border-transparent text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Filter row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or message content..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C3B2B] focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Priority filter - only show in All threads tab */}
            {inboxTab === 'all' && (
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'escalated' | 'routine')}
                className="px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C3B2B] focus:border-transparent bg-white"
              >
                <option value="all">All priorities</option>
                <option value="escalated">🔥 Escalated</option>
                <option value="routine">✓ Routine</option>
              </select>
            )}
          </div>
        </div>

        {/* Results count */}
        {(searchQuery || priorityFilter !== 'all') && (
          <p className="text-sm text-stone-500">
            Showing {filteredConversations.length} of {conversations.length} conversations
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        )}

        {/* Thread Cards */}
        {isEmpty ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Image
              src="/Couple2.png"
              alt="No messages"
              width={200}
              height={160}
              className="mb-6 opacity-70"
            />
            <p className="text-stone-500 font-medium">
              {inboxTab === 'needs-reply' ? 'No conversations need a reply right now.' : 'No conversations yet.'}
            </p>
            <p className="text-stone-400 text-sm mt-1">
              {inboxTab === 'needs-reply'
                ? 'Check back after your guests start reaching out.'
                : 'Share your Wedflow number with guests to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map((convo) => (
              <ThreadCard
                key={convo.id}
                conversation={convo}
                onReply={inboxTab === 'needs-reply' ? handleReplyClick : undefined}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderGuests() {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-xl font-semibold text-stone-900">Guests</h2>
        <div className="flex flex-col items-center py-16 text-center">
          <Image
            src="/Couple2.png"
            alt="No guests"
            width={200}
            height={160}
            className="mb-6 opacity-70"
          />
          <p className="text-stone-500 font-medium">Guest list coming soon.</p>
          <p className="text-stone-400 text-sm mt-1">
            We&apos;re working on a better way to manage your guest list.
          </p>
        </div>
      </div>
    )
  }

  function renderProfile() {
    if (!localProfile) {
      return (
        <div className="max-w-2xl mx-auto">
          <p className="text-stone-500">No wedding profile found. Please complete onboarding.</p>
        </div>
      )
    }

    const fieldProps = {
      profile: localProfile,
      editField,
      draftValue,
      saving: isSaving,
      onEdit: handleEditField,
      onSave: handleSaveField,
      onCancel: () => setEditField(null),
      onDraftChange: setDraftValue,
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold" style={{ color: C.forest, fontFamily: 'var(--newsreader)' }}>Wedding Profile</h2>

        {/* Hero: phone + readiness - two equal cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-8 flex flex-col justify-between" style={{ backgroundColor: C.forest }}>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide mb-4" style={{ color: 'rgba(253,251,247,0.7)' }}>Your Wedflow Number</p>
              <p className="text-4xl font-mono font-bold" style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.25)', letterSpacing: '0.08em' }}>{phoneNumber ? phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4') : 'Not yet assigned'}</p>
            </div>
            <p className="text-base mt-6 font-medium" style={{ color: 'rgba(253,251,247,0.8)' }}>Share this with your guests</p>
          </div>
          <div className="rounded-2xl p-8 flex flex-col justify-between" style={{ backgroundColor: C.forest }}>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide mb-4" style={{ color: 'rgba(253,251,247,0.7)' }}>Readiness Score</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(253,251,247,0.2)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${localProfile.readiness_score}%`,
                      backgroundColor: localProfile.readiness_score >= 80 ? '#4ADE80' : localProfile.readiness_score >= 50 ? '#FBBF24' : C.terracotta,
                    }}
                  />
                </div>
                <span className="text-3xl font-bold" style={{ color: '#FFFFFF' }}>{localProfile.readiness_score}%</span>
              </div>
            </div>
            <p className="text-base mt-6 font-medium" style={{ color: localProfile.is_active ? '#4ADE80' : 'rgba(253,251,247,0.7)' }}>
              {localProfile.is_active ? '✓ Active and responding' : '○ Not yet active'}
            </p>
          </div>
        </div>

        {/* Venue & Date - 3-column card grid */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(28,59,43,0.45)' }}>📍 Venue &amp; Date</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileField label="Venue name" field="venue_name" {...fieldProps} />
            <ProfileField label="Venue address" field="venue_address" {...fieldProps} />
            <ProfileField label="Wedding date" field="wedding_date" {...fieldProps} />
            <ProfileField label="Ceremony time" field="ceremony_time" {...fieldProps} />
            <ProfileField label="Reception time" field="reception_time" {...fieldProps} />
            <ProfileField label="Parking info" field="parking_info" {...fieldProps} />
          </div>
        </section>

        {/* Guest Info + Tone - two columns side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(28,59,43,0.45)' }}>👗 Guest Information</p>
            <div className="grid grid-cols-2 gap-4">
              <ProfileField label="Dress code" field="dress_code" {...fieldProps} />
              <ProfileField label="Hotel block" field="hotel_block" {...fieldProps} />
              <div className="col-span-2">
                <ProfileField label="Registry links (one per line)" field="registry_links" {...fieldProps} />
              </div>
            </div>
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(28,59,43,0.45)' }}>✨ Tone &amp; Voice</p>
            <div className="grid grid-cols-2 gap-4">
              <ProfileField label="Tone style" field="tone" {...fieldProps} />
              <ProfileField label="Vibe word" field="vibe_word" {...fieldProps} />
              <div className="col-span-2">
                <ProfileField label="Sample message (for AI calibration)" field="sample_message" {...fieldProps} />
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  function renderSettings() {
    return (
      <div className="max-w-xl mx-auto space-y-8">
        <h2 className="text-xl font-semibold text-stone-900">Settings</h2>

        {/* Account */}
        <section className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
          <div className="p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
              Account email
            </p>
            <p className="text-sm text-stone-700">{couple.email}</p>
            <p className="text-xs text-stone-400 mt-1">Managed by Clerk - edit in your account settings</p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
              Partner email
            </p>
            {editingEmail ? (
              <div className="flex gap-2 items-center">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="partner@example.com"
                  className="flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1C3B2B]"
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={isSavingEmail}
                  className="px-3 py-2 text-xs font-medium text-white disabled:opacity-50 rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: C.forest }}
                >
                  {isSavingEmail ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEmailDraft(localPartnerEmail)
                    setEditingEmail(false)
                  }}
                  disabled={isSavingEmail}
                  className="px-3 py-2 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-700">
                  {localPartnerEmail || <span className="italic text-stone-400">Not set</span>}
                </p>
                <button
                  onClick={() => {
                    setEmailDraft(localPartnerEmail)
                    setEditingEmail(true)
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <h3 className="text-sm font-semibold text-red-600 mb-3">Danger zone</h3>
          <div className="border border-red-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-800">Delete all data</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Permanently removes your wedding profile and all guest messages.
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 text-sm font-medium text-red-500 border border-red-300 rounded-lg opacity-50 cursor-not-allowed"
              title="Coming soon"
            >
              Delete
            </button>
          </div>
        </section>
      </div>
    )
  }

  // ----------------------------------------------------------------
  // Layout
  // ----------------------------------------------------------------

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: C.cream }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{ backgroundColor: C.forest }}>
        {/* Wordmark */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p
            className="text-2xl font-semibold"
            style={{ color: C.cream, fontFamily: 'var(--newsreader)' }}
          >
            Wedflow
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                view === item.id
                  ? 'text-white'
                  : 'hover:text-white'
              }`}
              style={
                view === item.id
                  ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }
                  : { color: 'rgba(253,251,247,0.7)' }
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {item.id === 'inbox' && needsReplyMessages.length > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white rounded-full" style={{ backgroundColor: C.terracotta }}>
                  {needsReplyMessages.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <p className="text-xs mb-3 px-1 truncate" style={{ color: 'rgba(253,251,247,0.6)' }}>{coupleNames}</p>
          <button
            onClick={async () => {
              await signOutAction()
              // Force a full page reload to clear server-side auth state
              window.location.href = '/'
            }}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left hover:opacity-90"
            style={{ color: 'rgba(253,251,247,0.7)', backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: C.cream }}>
        <div className="p-8">
          {view === 'home' && renderHome()}
          {view === 'inbox' && renderInbox()}
          {view === 'guests' && renderGuests()}
          {view === 'profile' && renderProfile()}
          {view === 'settings' && renderSettings()}
        </div>
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
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white z-50 transition-opacity ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
