'use client'

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
  refreshInboxMessages,
  sendReplyAction,
  signOutAction,
  trackInboxOpen,
  getInsightsData,
} from './actions'
import type { InsightsData } from './actions'
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
import { NotificationPrompt } from './components/NotificationPrompt'
import { InsightsView } from './components/InsightsView'

export default function DashboardClient({ couple, profile, phoneNumber, initialMessages, stats, isDemo = false }: DashboardProps) {
  const [view, setView] = useState<View>('home')
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [localProfile, setLocalProfile] = useState<Profile | null>(profile)
  const [isRefreshing, startRefresh] = useTransition()
  const [replyModal, setReplyModal] = useState<{ inboundMsg: MessageRow; draftBody: string; draftMsgId: string | null } | null>(null)
  const [isSendingReply, startSendReply] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches)
      if (!e.matches) setSidebarOpen(false)
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    getCircleMembers().then(setCircleMembers).catch(() => {})
  }, [])

  const daysUntilWedding = useMemo(() => {
    if (!localProfile?.wedding_date) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const wedding = new Date(localProfile.wedding_date); wedding.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  }, [localProfile?.wedding_date])

  const [localCouple, setLocalCouple] = useState<Couple>(couple)
  const coupleNames = [localCouple.your_name, localCouple.partner_name].filter(Boolean).join(' & ') || 'Your Wedding'

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
        await sendReplyAction(msg.conversation_id, replyText, msg.id, replyModal?.draftBody)
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
    { id: 'insights', label: 'Insights', icon: 'barChart' },
    { id: 'profile', label: 'Wedding Profile', icon: 'ring' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  const isInboxFullHeight = view === 'inbox'

  const handleNavClick = useCallback((id: View) => {
    setView(id)
    if (isMobile) setSidebarOpen(false)

    // Track inbox opens
    if (id === 'inbox' && !isDemo) {
      trackInboxOpen().catch(() => {})
    }

    // Load insights data on demand
    if (id === 'insights' && !isDemo) {
      setIsLoadingInsights(true)
      getInsightsData()
        .then(setInsightsData)
        .catch(() => {})
        .finally(() => setIsLoadingInsights(false))
    }
  }, [isMobile, isDemo])

  const sidebarContent = (
    <>
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
            <button key={n.id} onClick={() => handleNavClick(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: active ? 'var(--wf-cream)' : 'transparent', color: active ? 'var(--wf-forest)' : 'var(--wf-cream-ink)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--wf-sans)', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}
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

      {/* Footer: sign out */}
      <div style={{ marginTop: 'auto' }}>
        <button onClick={async () => { await signOutAction(); window.location.href = '/' }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'transparent', color: 'var(--wf-cream-ink-50)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--wf-sans)' }}>
          <Icon name="signOut" size={15} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '260px 1fr',
      gridTemplateRows: isMobile ? 'auto 1fr' : '1fr',
      minHeight: '100vh',
      background: 'var(--wf-cream)',
    }}>
      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--wf-forest)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--wf-cream)',
              cursor: 'pointer',
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-cream)' }}>Wedflow</span>
          <div style={{ width: 30 }} />
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 50,
            }}
          />
          <aside style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 280,
            background: 'var(--wf-forest)',
            color: 'var(--wf-cream)',
            padding: '28px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 51,
            overflowY: 'auto',
          }}>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{ background: 'var(--wf-forest)', color: 'var(--wf-cream)', padding: '28px 20px 24px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      <main style={{ overflow: isInboxFullHeight ? 'hidden' : 'auto', height: isInboxFullHeight ? (isMobile ? 'calc(100vh - 50px)' : '100vh') : 'auto' }}>
        {view === 'home' && (
          <>
          <NotificationPrompt />
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
          </>
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
            isMobile={isMobile}
          />
        )}
        {view === 'circle' && <CircleView />}
        {view === 'guests' && <GuestsView plan={localCouple.plan} />}
        {view === 'profile' && localProfile && (
          <ProfileView
            profile={localProfile}
            phoneNumber={phoneNumber}
            onProfileUpdate={(updater) => setLocalProfile((prev) => prev ? updater(prev) : prev)}
            isMobile={isMobile}
          />
        )}
        {view === 'profile' && !localProfile && (
          <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', maxWidth: 800, margin: '0 auto' }}>
            <p className="wf-sans" style={{ color: 'var(--wf-ink-60)' }}>No wedding profile found. Please complete onboarding.</p>
          </div>
        )}
        {view === 'insights' && (
          <InsightsView
            data={insightsData}
            isLoading={isLoadingInsights}
            isMobile={isMobile}
            churnStatus={couple.churn_status ?? 'active'}
            usageStreakWeeks={couple.usage_streak_weeks ?? 0}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            couple={localCouple}
            onPartnerEmailUpdate={(email: string) => setLocalCouple((prev) => ({ ...prev, partner_email: email }))}
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
        <div style={{ position: 'fixed', bottom: 24, left: isMobile ? 16 : 'auto', right: isMobile ? 16 : 24, padding: '12px 16px', borderRadius: 12, boxShadow: 'var(--wf-shadow-lg)', fontSize: 13, fontWeight: 500, color: 'var(--wf-cream)', background: toast.type === 'success' ? '#4a6141' : 'var(--wf-rose)', zIndex: 50, fontFamily: 'var(--wf-sans)' }}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
