'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  refreshInboxMessages,
  sendReplyAction,
  signOutAction,
} from './actions'
import { getCircleMembers } from '@/app/circle/actions'
import type { CircleMember } from '@/types'
import type { MessageRow } from './actions'
import type { View, Couple, Profile, DashboardProps } from './types'
import { groupMessagesByConversation } from './types'
import { Icon } from './components/Icon'
import { ReplyModal } from './components/ReplyModal'
import { HomeView } from './components/HomeView'
import { InboxView } from './components/InboxView'
import { GuestsView } from './components/GuestsView'
import { ProfileView } from './components/ProfileView'
import { SettingsView } from './components/SettingsView'
import { CircleView } from './components/CircleView'

export default function DashboardClient({ couple, profile, phoneNumber, initialMessages, stats, isDemo = false }: DashboardProps) {
  const [view, setView] = useState<View>('home')
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [localProfile, setLocalProfile] = useState<Profile | null>(profile)
  const [isRefreshing, startRefresh] = useTransition()
  const [replyModal, setReplyModal] = useState<{ inboundMsg: MessageRow; draftBody: string; draftMsgId: string | null } | null>(null)
  const [isSendingReply, startSendReply] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([])

  useEffect(() => {
    getCircleMembers().then(setCircleMembers).catch(() => {})
  }, [])

  const daysUntilWedding = useMemo(() => {
    if (!localProfile?.wedding_date) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const wedding = new Date(localProfile.wedding_date); wedding.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  }, [localProfile?.wedding_date])

  const coupleNames = [couple.your_name, couple.partner_name].filter(Boolean).join(' & ') || 'Your Wedding'

  const repliedInboundMsgIds = useMemo(() => new Set(messages.filter((m) => m.direction === 'outbound' && m.was_sent && m.classified_as === 'escalated' && m.replied_to_message_id !== null).map((m) => m.replied_to_message_id as string)), [messages])
  const conversations = useMemo(() => groupMessagesByConversation(messages, repliedInboundMsgIds), [messages, repliedInboundMsgIds])
  const needsReplyMessages = useMemo(() => messages.filter((m) => m.direction === 'inbound' && m.classified_as === 'escalated' && !repliedInboundMsgIds.has(m.id)), [messages, repliedInboundMsgIds])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  function handleRefresh() {
    startRefresh(async () => {
      try { const fresh = await refreshInboxMessages(); setMessages(fresh) } catch { /* user can retry */ }
    })
  }

  function handleSendReply(replyText: string, inboundMsg?: MessageRow) {
    const msg = inboundMsg ?? replyModal?.inboundMsg
    if (!msg) return

    startSendReply(async () => {
      try {
        await sendReplyAction(msg.conversation_id, replyText, msg.id)
        setReplyModal(null)
        const fresh = await refreshInboxMessages()
        setMessages(fresh)
        setToast({ type: 'success', text: 'Reply sent!' })
      } catch (err) {
        setToast({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send reply. Please try again.' })
      }
    })
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'inbox', label: 'Inbox', icon: 'inbox' },
    { id: 'circle', label: 'Circle', icon: 'heart' },
    { id: 'guests', label: 'Guests', icon: 'users' },
    { id: 'profile', label: 'Wedding Profile', icon: 'ring' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

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
        {view === 'home' && (
          <HomeView
            coupleNames={coupleNames}
            localProfile={localProfile}
            phoneNumber={phoneNumber}
            daysUntilWedding={daysUntilWedding}
            messages={messages}
            needsReplyMessages={needsReplyMessages}
            stats={stats}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            onNavigateInbox={() => setView('inbox')}
          />
        )}
        {view === 'inbox' && (
          <InboxView
            conversations={conversations}
            messages={messages}
            needsReplyMessages={needsReplyMessages}
            repliedInboundMsgIds={repliedInboundMsgIds}
            circleMembers={circleMembers}
            isRefreshing={isRefreshing}
            isSendingReply={isSendingReply}
            onRefresh={handleRefresh}
            onSendReply={handleSendReply}
          />
        )}
        {view === 'circle' && <CircleView />}
        {view === 'guests' && <GuestsView />}
        {view === 'profile' && localProfile && (
          <ProfileView
            profile={localProfile}
            phoneNumber={phoneNumber}
            onProfileUpdate={(updater) => setLocalProfile((prev) => prev ? updater(prev) : prev)}
          />
        )}
        {view === 'profile' && !localProfile && (
          <div style={{ padding: '40px 48px', maxWidth: 800, margin: '0 auto' }}>
            <p className="wf-sans" style={{ color: 'var(--wf-ink-60)' }}>No wedding profile found. Please complete onboarding.</p>
          </div>
        )}
        {view === 'settings' && (
          <SettingsView
            couple={couple}
            onPartnerEmailUpdate={() => {}}
          />
        )}
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
