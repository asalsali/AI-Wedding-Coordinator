import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Icon } from './Icon'
import { StatTile } from './StatTile'
import { timeAgo } from '../types'
import type { MessageRow } from '../types'
import type { Profile } from '../types'

interface HomeViewProps {
  coupleNames: string
  localProfile: Profile | null
  phoneNumber: string | null
  daysUntilWedding: number
  messages: MessageRow[]
  needsReplyMessages: MessageRow[]
  stats: { totalMessages: number; needsReply: number }
  isRefreshing: boolean
  onRefresh: () => void
  onNavigateInbox: () => void
}

export function HomeView({
  coupleNames, localProfile, phoneNumber, daysUntilWedding,
  messages, needsReplyMessages, stats, isRefreshing, onRefresh, onNavigateInbox,
}: HomeViewProps) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  const [copied, setCopied] = useState(false)
  const autoReplied = messages.filter((m) => m.direction === 'outbound' && m.was_sent).length
  const totalIn = messages.filter((m) => m.direction === 'inbound').length
  const pct = totalIn > 0 ? Math.round((autoReplied / totalIn) * 100) : 0

  return (
    <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 1080, margin: '0 auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: isMobile ? 16 : 24, marginBottom: isMobile ? 24 : 32, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <span className="wf-eyebrow">Your dashboard</span>
          <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Welcome back, <em style={{ fontWeight: 500 }}>{coupleNames}.</em>
          </h1>
          {localProfile?.wedding_date && (
            <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>
              {localProfile.venue_name && `${localProfile.venue_name} · `}{daysUntilWedding > 0 ? `${daysUntilWedding} days to go` : 'Today!'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onRefresh} disabled={isRefreshing} className="wf-btn wf-btn-ghost">
            <Icon name="refresh" size={14} /> {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={onNavigateInbox} className="wf-btn wf-btn-forest">
            Open Inbox <Icon name="arrowRight" size={14} />
          </button>
        </div>
      </div>

      {/* Hero card — phone number */}
      <div style={{ background: 'var(--wf-forest)', borderRadius: isMobile ? 20 : 28, overflow: 'hidden', marginBottom: isMobile ? 20 : 28, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.25fr 1fr', minHeight: isMobile ? undefined : 300, boxShadow: 'var(--wf-shadow-lg)' }}>
        <div style={{ padding: isMobile ? '28px 20px' : '44px 48px', color: 'var(--wf-cream)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span className="wf-eyebrow wf-eyebrow-forest">Your Wedflow number</span>
          <div className="wf-serif" style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500, color: 'var(--wf-cream)', marginTop: 14, marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {phoneNumber ? phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4') : 'Not yet assigned'}
          </div>
          <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-cream-ink)', marginBottom: 24, maxWidth: 360 }}>
            Share this with your guests. Every message they send lands in your inbox — quietly, in your voice.
          </p>
          {phoneNumber && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => {
                navigator.clipboard.writeText(phoneNumber).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }).catch(() => {
                  setCopied(false)
                })
              }} className="wf-btn" style={{ background: 'var(--wf-terracotta)', color: 'var(--wf-cream)', fontSize: 13 }}>
                <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied!' : 'Copy number'}
              </button>
            </div>
          )}
        </div>
        <div style={{ background: 'var(--wf-cream-warm)', position: 'relative', overflow: 'hidden', display: isMobile ? 'none' : 'block' }}>
          <Image src="/Couple1.png" alt="Couple illustration" fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 20 : 28 }}>
        <StatTile eyebrow="Needs your reply" value={needsReplyMessages.length} hint={needsReplyMessages.length === 0 ? 'All caught up!' : 'waiting for you'} />
        <StatTile eyebrow="Total messages" value={stats.totalMessages} hint="+from your guests" />
        <StatTile eyebrow="Auto-replied" value={autoReplied} hint={`${pct}% handled for you`} />
        <StatTile eyebrow="Days until" value={daysUntilWedding > 0 ? daysUntilWedding : 'Today'} hint={localProfile?.wedding_date ? new Date(localProfile.wedding_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined} />
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
                  onClick={onNavigateInbox}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(28,59,43,0.08)', color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span className="wf-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--wf-forest)' }}>{name}</span>
                      <span className="wf-sans" style={{ fontSize: 10.5, color: 'var(--wf-ink-45)' }}>{timeAgo(msg.created_at)}</span>
                    </div>
                    <p className="wf-sans" style={{ fontSize: 12.5, color: 'var(--wf-ink-60)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{msg.body}</p>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 10.5, color: isSensitive ? 'var(--wf-rose)' : 'var(--wf-sage)', fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isSensitive ? 'var(--wf-rose)' : 'var(--wf-sage)' }} />
                    {isSensitive ? 'Sensitive' : 'Routine'}
                  </span>
                </div>
              )
            })}
          </div>
          <button onClick={onNavigateInbox} style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--wf-forest)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--wf-sans)' }}>
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
