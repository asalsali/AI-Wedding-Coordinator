'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { SignOutButton } from '@clerk/nextjs'
import {
  updateWeddingProfileField,
  updatePartnerEmailAction,
  refreshInboxMessages,
} from './actions'
import type { MessageRow, ProfileUpdateFields } from './actions'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type View = 'home' | 'inbox' | 'profile' | 'settings'
type InboxTab = 'needs-reply' | 'all'
type ToneStyle = 'warm' | 'elegant' | 'playful'

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
    daysUntilWedding: number | null
  }
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
      <p className="text-3xl font-semibold text-stone-900">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

function MessageCard({ message }: { message: MessageRow }) {
  const badge = classificationBadge(message.classified_as)
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-start gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-sm font-medium text-rose-600">
        {message.guest_phone_hash.slice(-2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-stone-400">
            ···{message.guest_phone_hash.slice(-6)}
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
      <div className="flex-shrink-0 relative group">
        <button
          disabled
          className="px-3 py-1.5 text-xs font-medium text-stone-400 bg-stone-100 rounded-lg cursor-not-allowed"
        >
          Reply
        </button>
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-stone-800 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Coming soon
        </span>
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
    <div className="flex items-start justify-between py-4 border-b border-stone-100 last:border-0 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">{label}</p>
        {isEditing ? (
          SELECT_FIELDS.has(field) ? (
            <select
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <option value="">— none —</option>
              <option value="warm">Warm</option>
              <option value="elegant">Elegant</option>
              <option value="playful">Playful</option>
            </select>
          ) : TEXTAREA_FIELDS.has(field) ? (
            <textarea
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={field === 'registry_links' ? 3 : 2}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
              placeholder={field === 'registry_links' ? 'One URL per line' : ''}
            />
          ) : (
            <input
              type={
                DATE_FIELDS.has(field) ? 'date' : TIME_FIELDS.has(field) ? 'time' : 'text'
              }
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          )
        ) : (
          <p className="text-sm text-stone-800 break-words whitespace-pre-wrap">
            {currentDisplay || <span className="text-stone-400 italic">Not set</span>}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 pt-5">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={() => onSave(field)}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => onEdit(field, currentDisplay)}
            className="px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            Edit
          </button>
        )}
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
}: Props) {
  const [view, setView] = useState<View>('home')
  const [inboxTab, setInboxTab] = useState<InboxTab>('needs-reply')
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [localProfile, setLocalProfile] = useState<Profile | null>(profile)

  // Inline edit state — profile
  const [editField, setEditField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  const [isSaving, startSave] = useTransition()

  // Inline edit state — partner email
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(couple.partner_email ?? '')
  const [localPartnerEmail, setLocalPartnerEmail] = useState(couple.partner_email ?? '')
  const [isSavingEmail, startSaveEmail] = useTransition()

  // Inbox refresh
  const [isRefreshing, startRefresh] = useTransition()

  const coupleNames =
    [couple.your_name, couple.partner_name].filter(Boolean).join(' & ') || 'Your Wedding'

  const needsReplyMessages = messages.filter(
    (m) => m.classified_as === 'escalated' && !m.was_sent,
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

  // ----------------------------------------------------------------
  // Nav
  // ----------------------------------------------------------------

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '⌂' },
    { id: 'inbox', label: 'Inbox', icon: '✉' },
    { id: 'profile', label: 'Profile', icon: '💍' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ]

  // ----------------------------------------------------------------
  // Views
  // ----------------------------------------------------------------

  function renderHome() {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1">
            Welcome back, {coupleNames} 💍
          </h1>
          <p className="text-stone-500 text-sm">
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
            value={stats.needsReply}
            sub={stats.needsReply === 0 ? 'All caught up!' : 'waiting for you'}
          />
          <StatCard
            label="Days until wedding"
            value={
              stats.daysUntilWedding === null
                ? '—'
                : stats.daysUntilWedding === 0
                  ? 'Today! 🎉'
                  : stats.daysUntilWedding
            }
            sub={stats.daysUntilWedding !== null && stats.daysUntilWedding > 0 ? 'to go' : undefined}
          />
        </div>

        <button
          onClick={() => setView('inbox')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Go to Inbox →
        </button>
      </div>
    )
  }

  function renderInbox() {
    const displayed = inboxTab === 'needs-reply' ? needsReplyMessages : messages
    const isEmpty = displayed.length === 0

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
                Refreshing…
              </>
            ) : (
              <>↻ Refresh</>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          {(
            [
              { id: 'needs-reply', label: `Needs reply${needsReplyMessages.length > 0 ? ` (${needsReplyMessages.length})` : ''}` },
              { id: 'all', label: `All messages${messages.length > 0 ? ` (${messages.length})` : ''}` },
            ] as { id: InboxTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInboxTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                inboxTab === tab.id
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Messages or empty state */}
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
              {inboxTab === 'needs-reply' ? 'No messages need a reply right now.' : 'No messages yet.'}
            </p>
            <p className="text-stone-400 text-sm mt-1">
              {inboxTab === 'needs-reply'
                ? 'Check back after your guests start reaching out.'
                : 'Share your Wedflow number with guests to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((msg) => (
              <MessageCard key={msg.id} message={msg} />
            ))}
          </div>
        )}
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
      <div className="max-w-2xl mx-auto space-y-8">
        <h2 className="text-xl font-semibold text-stone-900">Profile</h2>

        {/* Twilio number + readiness */}
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-rose-500 uppercase tracking-wide mb-1">
              Your Wedflow number
            </p>
            <p className="text-2xl font-mono font-semibold text-stone-900">
              {phoneNumber ?? 'Not yet assigned'}
            </p>
            <p className="text-xs text-stone-500 mt-1">Share this number with your guests</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
              Readiness
            </p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all"
                  style={{ width: `${localProfile.readiness_score}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-stone-700">
                {localProfile.readiness_score}%
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              {localProfile.is_active ? '🟢 Active' : '⚪ Not active'}
            </p>
          </div>
        </div>

        {/* Venue & date */}
        <section>
          <h3 className="text-sm font-semibold text-stone-700 mb-3 pb-2 border-b border-stone-200">
            Venue &amp; Date
          </h3>
          <ProfileField label="Venue name" field="venue_name" {...fieldProps} />
          <ProfileField label="Venue address" field="venue_address" {...fieldProps} />
          <ProfileField label="Wedding date" field="wedding_date" {...fieldProps} />
          <ProfileField label="Ceremony time" field="ceremony_time" {...fieldProps} />
          <ProfileField label="Reception time" field="reception_time" {...fieldProps} />
          <ProfileField label="Parking info" field="parking_info" {...fieldProps} />
        </section>

        {/* Guest info */}
        <section>
          <h3 className="text-sm font-semibold text-stone-700 mb-3 pb-2 border-b border-stone-200">
            Guest Info
          </h3>
          <ProfileField label="Dress code" field="dress_code" {...fieldProps} />
          <ProfileField label="Registry links (one per line)" field="registry_links" {...fieldProps} />
          <ProfileField label="Hotel block" field="hotel_block" {...fieldProps} />
        </section>

        {/* Tone */}
        <section>
          <h3 className="text-sm font-semibold text-stone-700 mb-3 pb-2 border-b border-stone-200">
            Tone &amp; Voice
          </h3>
          <ProfileField label="Tone style" field="tone" {...fieldProps} />
          <ProfileField label="Vibe word" field="vibe_word" {...fieldProps} />
          <ProfileField label="Sample message (for AI calibration)" field="sample_message" {...fieldProps} />
        </section>
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
            <p className="text-xs text-stone-400 mt-1">Managed by Clerk — edit in your account settings</p>
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
                  className="flex-1 text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={isSavingEmail}
                  className="px-3 py-2 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isSavingEmail ? 'Saving…' : 'Save'}
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
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-stone-100">
          <Image
            src="/ClassicLogo.png"
            alt="Wedflow"
            width={48}
            height={48}
            className="rounded-lg"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === item.id
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
              {item.id === 'inbox' && stats.needsReply > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-rose-500 text-white rounded-full">
                  {stats.needsReply}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100">
          <p className="text-xs font-medium text-stone-700 mb-3 px-1 truncate">{coupleNames}</p>
          <SignOutButton>
            <button className="w-full px-3 py-2 text-xs font-medium text-stone-500 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors text-left">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {view === 'home' && renderHome()}
          {view === 'inbox' && renderInbox()}
          {view === 'profile' && renderProfile()}
          {view === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  )
}
