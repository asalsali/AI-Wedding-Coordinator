import { useState, useMemo, useRef, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { Icon } from './Icon'
import { AIDraftCard } from './AIDraftCard'
import { InlineReplyComposer } from './InlineReplyComposer'
import { createTaskAssignment } from '@/app/circle/actions'
import type { CircleMember } from '@/types'
import type { Conversation, MessageRow, InboxTab, EmotionalWeight } from '../types'
import { timeAgo, getConversationTitle, getInitials } from '../types'

const ROLE_LABELS: Record<string, string> = {
  moh: 'MOH',
  best_man: 'Best Man',
  family_lead: 'Family Lead',
  bridesmaid: 'Bridesmaid',
  groomsman: 'Groomsman',
}

interface InboxViewProps {
  conversations: Conversation[]
  messages: MessageRow[]
  needsReplyMessages: MessageRow[]
  repliedInboundMsgIds: Set<string>
  circleMembers: CircleMember[]
  isRefreshing: boolean
  isSendingReply: boolean
  onRefresh: () => void
  onSendReply: (text: string, inboundMsg: MessageRow) => void
  isMobile?: boolean
}

export function InboxView({
  conversations, messages, needsReplyMessages, repliedInboundMsgIds,
  circleMembers, isRefreshing, isSendingReply, onRefresh, onSendReply,
  isMobile = false,
}: InboxViewProps) {
  const [inboxTab, setInboxTab] = useState<InboxTab>('needs-reply')
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [triageFilter, setTriageFilter] = useState<'all' | EmotionalWeight>('all')
  const [composerInitialText, setComposerInitialText] = useState('')
  const [dismissedDraftIds, setDismissedDraftIds] = useState<Set<string>>(new Set())
  const [assigningMsgId, setAssigningMsgId] = useState<string | null>(null)
  const [isAssigning, startAssign] = useTransition()
  const [assignToast, setAssignToast] = useState<string | null>(null)
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const assignDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!assigningMsgId) return
    const handler = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setAssigningMsgId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [assigningMsgId])

  const activeCircleMembers = useMemo(() => circleMembers.filter((m) => m.status === 'active'), [circleMembers])

  const filteredConversations = useMemo(() => {
    let filtered = conversations
    if (inboxTab === 'needs-reply') filtered = filtered.filter((c) => c.hasNeedsReply)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((c) => c.guest_name?.toLowerCase().includes(q) || c.guest_phone?.toLowerCase().includes(q) || c.messages.some((m) => m.body.toLowerCase().includes(q)))
    }
    if (triageFilter !== 'all') {
      filtered = filtered.filter((c) => c.emotionalWeight === triageFilter)
    }
    return filtered
  }, [conversations, inboxTab, searchQuery, triageFilter])

  const selectedConversation = useMemo(() => conversations.find((c) => c.id === selectedConversationId) || null, [conversations, selectedConversationId])

  const needsReplyCount = conversations.filter((c) => c.hasNeedsReply).length
  const totalCount = conversations.length
  const isEmpty = filteredConversations.length === 0

  const tabConversations = useMemo(() => {
    return inboxTab === 'needs-reply' ? conversations.filter((c) => c.hasNeedsReply) : conversations
  }, [conversations, inboxTab])
  const sensitiveCount = tabConversations.filter((c) => c.emotionalWeight === 'sensitive').length
  const unclearCount = tabConversations.filter((c) => c.emotionalWeight === 'unclear').length
  const routineCount = tabConversations.filter((c) => c.emotionalWeight === 'routine').length

  // Auto-pre-fill composer with draft when selecting a conversation that has one
  useEffect(() => {
    if (!selectedConversation) return
    // Find an unsent escalated outbound draft in this conversation
    const draft = selectedConversation.messages.find(
      (msg) => msg.direction === 'outbound' && msg.classified_as === 'escalated' && !msg.was_sent
    )
    if (!draft) return
    // Only pre-fill if the inbound message it replies to hasn't been replied to yet
    const inboundRepliedTo = draft.replied_to_message_id
    if (inboundRepliedTo && repliedInboundMsgIds.has(inboundRepliedTo)) return
    // Don't pre-fill if the user dismissed this draft
    if (dismissedDraftIds.has(draft.id)) return
    setComposerInitialText(draft.body)
  }, [selectedConversationId])

  function handleSendReply(text: string) {
    const inboundMsg = selectedConversation
      ? selectedConversation.messages.filter((m) => m.direction === 'inbound').slice(-1)[0]
      : null
    if (inboundMsg) onSendReply(text, inboundMsg)
  }

  function handleAssignToMember(memberId: string, msgBody: string) {
    const member = activeCircleMembers.find((m) => m.id === memberId)
    if (!member) return
    startAssign(async () => {
      const result = await createTaskAssignment({
        assignedTo: memberId,
        title: `Review: "${msgBody.slice(0, 80)}${msgBody.length > 80 ? '...' : ''}"`,
      })
      if (result.success) {
        setAssigningMsgId(null)
        setAssignToast(`Assigned to ${member.name}`)
        setTimeout(() => setAssignToast(null), 3000)
      }
    })
  }

  function handleSelectConversation(convoId: string) {
    const isSel = convoId === selectedConversationId
    setSelectedConversationId(isSel ? null : convoId)
    if (!isSel && isMobile) setMobileShowDetail(true)
  }

  function handleMobileBack() {
    setMobileShowDetail(false)
  }

  // On mobile, show either thread list or detail, not both
  const showThreadList = !isMobile || !mobileShowDetail
  const showDetail = !isMobile || mobileShowDetail

  /* ---- Thread list panel ---- */
  const threadListPanel = (
    <div style={{
      borderRight: isMobile ? 'none' : '1px solid var(--wf-line)',
      display: showThreadList ? 'flex' : 'none',
      flexDirection: 'column',
      background: 'var(--wf-cream)',
      width: '100%',
    }}>
      <div style={{ padding: isMobile ? '16px 14px 12px' : '24px 22px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h2 className="wf-serif" style={{ fontSize: isMobile ? 20 : 24, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Inbox</h2>
          <button onClick={onRefresh} disabled={isRefreshing} style={{ background: 'none', border: 'none', color: 'var(--wf-ink-60)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--wf-sans)' }}>
            <Icon name="refresh" size={13} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--wf-ink-45)' }}>
            <Icon name="search" size={14} />
          </div>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search threads" className="wf-sans" style={{ width: '100%', padding: '9px 12px 9px 36px', background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 999, fontSize: 13, fontFamily: 'var(--wf-sans)', color: 'var(--wf-ink)', outline: 'none' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 2 }}>&#x2715;</button>}
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--wf-cream-warm)', borderRadius: 10, padding: 3 }}>
          {([['needs-reply', 'Needs reply', needsReplyCount], ['all', 'All', totalCount]] as [InboxTab, string, number][]).map(([k, label, count]) => (
            <button key={k} onClick={() => { setInboxTab(k); setTriageFilter('all') }} className="wf-sans" style={{ flex: 1, padding: '7px 10px', background: inboxTab === k ? 'var(--wf-paper)' : 'transparent', border: 'none', borderRadius: 8, boxShadow: inboxTab === k ? 'var(--wf-shadow-sm)' : 'none', fontSize: 12, fontWeight: 500, color: inboxTab === k ? 'var(--wf-forest)' : 'var(--wf-ink-60)', cursor: 'pointer', fontFamily: 'var(--wf-sans)' }}>
              {label} · {count}
            </button>
          ))}
        </div>
        {/* Triage filter pills */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {([
            ['all', 'All', tabConversations.length, 'var(--wf-forest)'],
            ['sensitive', 'Sensitive', sensitiveCount, 'var(--wf-rose)'],
            ['unclear', 'Unclear', unclearCount, 'var(--wf-terracotta-deep)'],
            ['routine', 'Routine', routineCount, 'var(--wf-sage)'],
          ] as ['all' | EmotionalWeight, string, number, string][]).map(([key, label, count, color]) => {
            const active = triageFilter === key
            return (
              <button key={key} onClick={() => setTriageFilter(key)} className="wf-sans" style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, border: active ? `1.5px solid ${color}` : '1px solid var(--wf-line)', background: active ? `${color}12` : 'transparent', color: active ? color : 'var(--wf-ink-60)', cursor: 'pointer', fontFamily: 'var(--wf-sans)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}>
                {key !== 'all' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
                {label}{count > 0 ? ` · ${count}` : ''}
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread list */}
      <div className="wf-scroll" style={{ flex: 1, overflow: 'auto', padding: isMobile ? '4px 8px 20px' : '4px 10px 20px' }}>
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
            const weightColor = convo.emotionalWeight === 'sensitive' ? 'var(--wf-rose)' : convo.emotionalWeight === 'unclear' ? 'var(--wf-terracotta)' : 'var(--wf-sage)'
            const toneDot = convo.hasNeedsReply ? 'var(--wf-rose)' : weightColor
            const autoRepliedCount = convo.messages.filter((m) => m.direction === 'outbound' && m.was_sent && m.classified_as !== 'escalated').length
            const escalatedCount = convo.messages.filter((m) => m.direction === 'inbound' && m.classified_as === 'escalated').length

            return (
              <button key={convo.id} onClick={() => handleSelectConversation(convo.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 16px', background: isSel ? 'var(--wf-paper)' : 'transparent', border: isSel ? '1px solid var(--wf-line)' : '1px solid transparent', borderRadius: 12, cursor: 'pointer', marginBottom: 2, boxShadow: isSel ? 'var(--wf-shadow-sm)' : 'none', transition: 'all 0.15s', fontFamily: 'var(--wf-sans)' }}
                onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--wf-paper)' }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: convo.hasNeedsReply ? 'rgba(180,84,78,0.1)' : 'rgba(28,59,43,0.1)', color: convo.hasNeedsReply ? 'var(--wf-rose)' : 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', gap: 6 }} className="wf-sans">
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: toneDot, flexShrink: 0 }} />
                        {title}
                      </span>
                      <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-45)', flexShrink: 0 }}>{timeAgo(lastMsg.created_at)}</span>
                    </div>
                    <p className="wf-sans" style={{ fontSize: 12.5, color: 'var(--wf-ink-60)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {lastMsg.body}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                      {convo.hasNeedsReply && (
                        <span className="wf-sans" style={{ fontSize: 10, color: 'var(--wf-terracotta-deep)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          &#x25CF; Waiting for you
                        </span>
                      )}
                      {!convo.hasNeedsReply && autoRepliedCount > 0 && (
                        <span className="wf-sans" style={{ fontSize: 10, color: 'var(--wf-sage)', fontWeight: 500 }}>
                          &#x2713; {autoRepliedCount} auto-replied
                        </span>
                      )}
                      {escalatedCount > 0 && !convo.hasNeedsReply && (
                        <span className="wf-sans" style={{ fontSize: 10, color: 'var(--wf-ink-45)' }}>
                          · {escalatedCount} escalated
                        </span>
                      )}
                      {convo.emotionalWeight !== 'routine' && (
                        <span className="wf-sans" style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: convo.emotionalWeight === 'sensitive' ? 'rgba(180,84,78,0.1)' : 'rgba(196,113,74,0.1)', color: convo.emotionalWeight === 'sensitive' ? 'var(--wf-rose)' : 'var(--wf-terracotta-deep)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {convo.emotionalWeight}
                        </span>
                      )}
                      <span className="wf-sans" style={{ fontSize: 10, color: 'var(--wf-ink-25)', marginLeft: 'auto' }}>
                        {convo.messageCount} msg{convo.messageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  /* ---- Conversation detail panel ---- */
  const detailPanel = selectedConversation ? (
    <div style={{
      display: showDetail ? 'flex' : 'none',
      flexDirection: 'column',
      background: 'var(--wf-cream-warm)',
      height: '100%',
    }}>
      {/* Thread header */}
      <div style={{ padding: isMobile ? '14px 16px' : '18px 28px', borderBottom: '1px solid var(--wf-line)', background: 'var(--wf-cream)', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, flexShrink: 0 }}>
        {isMobile && (
          <button onClick={handleMobileBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-forest)', padding: 4, display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: '50%', background: 'var(--wf-forest)', color: 'var(--wf-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--wf-serif)', fontWeight: 600, fontSize: isMobile ? 14 : 16 }}>
          {getInitials(selectedConversation)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <h3 className="wf-serif" style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 600, color: 'var(--wf-forest)' }}>{getConversationTitle(selectedConversation)}</h3>
            {selectedConversation.hasNeedsReply && (
              <span className="wf-badge wf-badge-sensitive"><Icon name="shield" size={10} /> Sensitive</span>
            )}
          </div>
          <div className="wf-sans" style={{ fontSize: isMobile ? 11 : 12, color: 'var(--wf-ink-60)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedConversation.guest_phone && (
              <span style={{ fontFamily: 'monospace' }}>{selectedConversation.guest_phone}</span>
            )}
            <span>· {selectedConversation.messageCount} messages</span>
            {!isMobile && selectedConversation.aiSummary && (
              <span style={{ color: 'var(--wf-ink-45)' }}>· {selectedConversation.aiSummary}</span>
            )}
          </div>
        </div>
        {!isMobile && (
          <button onClick={() => setSelectedConversationId(null)} className="wf-btn wf-btn-ghost wf-btn-sm">
            <Icon name="x" size={13} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="wf-scroll" style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 14px 12px' : '16px 28px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(() => {
          const draftsByInbound = new Map<string, MessageRow>()
          selectedConversation.messages.forEach((msg) => {
            if (msg.direction === 'outbound' && msg.classified_as === 'escalated' && !msg.was_sent && msg.replied_to_message_id) {
              draftsByInbound.set(msg.replied_to_message_id, msg)
            }
          })
          const orphanDrafts = selectedConversation.messages.filter((msg) =>
            msg.direction === 'outbound' && msg.classified_as === 'escalated' && !msg.was_sent && !msg.replied_to_message_id
          )
          if (orphanDrafts.length > 0) {
            const lastEscalated = [...selectedConversation.messages].reverse().find((m) => m.direction === 'inbound' && m.classified_as === 'escalated')
            if (lastEscalated && !draftsByInbound.has(lastEscalated.id)) {
              draftsByInbound.set(lastEscalated.id, orphanDrafts[0])
            }
          }

          return selectedConversation.messages.map((msg, i) => {
            const isIn = msg.direction === 'inbound'
            const isEscalatedInbound = msg.classified_as === 'escalated' && isIn
            const isDraft = !isIn && msg.classified_as === 'escalated' && !msg.was_sent
            const isRepliedTo = repliedInboundMsgIds.has(msg.id)
            const draft = isEscalatedInbound ? draftsByInbound.get(msg.id) : null
            const showDraft = draft && !isRepliedTo && !dismissedDraftIds.has(draft.id)

            if (isDraft) return null

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ alignSelf: isIn ? 'flex-start' : 'flex-end', maxWidth: isMobile ? '90%' : '80%' }}>
                  {isEscalatedInbound && (
                    <div className="wf-sans" style={{ fontSize: 10.5, color: isRepliedTo ? 'var(--wf-sage)' : 'var(--wf-terracotta-deep)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5, marginLeft: 10, flexWrap: 'wrap' }}>
                      <Icon name="shield" size={11} /> {isRepliedTo ? 'Replied' : 'Needs your review'}
                      {!isRepliedTo && activeCircleMembers.length > 0 && (
                        <div ref={assignDropdownRef} style={{ position: 'relative', marginLeft: 6 }}>
                          <button
                            onClick={() => setAssigningMsgId(assigningMsgId === msg.id ? null : msg.id)}
                            disabled={isAssigning}
                            style={{ background: 'none', border: '1px solid rgba(196,113,74,0.3)', borderRadius: 6, padding: '1px 6px', cursor: 'pointer', fontSize: 10, color: 'var(--wf-terracotta-deep)', fontFamily: 'var(--wf-sans)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(196,113,74,0.06)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Icon name="users" size={9} /> Assign
                          </button>
                          {assigningMsgId === msg.id && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 10, boxShadow: 'var(--wf-shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                              {activeCircleMembers.map((m) => (
                                <button key={m.id} onClick={() => handleAssignToMember(m.id, msg.body)} className="wf-sans" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--wf-forest)', fontFamily: 'var(--wf-sans)', transition: 'background 0.1s' }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--wf-cream-warm)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                  {m.name} <span style={{ color: 'var(--wf-ink-45)', fontSize: 10 }}>({ROLE_LABELS[m.role] ?? m.role})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{
                    background: isIn ? 'var(--wf-paper)' : 'var(--wf-forest)',
                    color: isIn ? 'var(--wf-ink)' : 'var(--wf-cream)',
                    border: isEscalatedInbound && !isRepliedTo
                      ? '1px solid rgba(196,113,74,0.35)'
                      : isIn ? '1px solid var(--wf-line)' : 'none',
                    borderLeft: isEscalatedInbound && !isRepliedTo
                      ? '3px solid var(--wf-terracotta-deep)'
                      : isIn ? '1px solid var(--wf-line)' : 'none',
                    padding: '10px 14px',
                    borderRadius: 14, borderTopLeftRadius: isIn ? 4 : 14, borderTopRightRadius: isIn ? 14 : 4,
                    fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
                    boxShadow: isIn ? 'var(--wf-shadow-sm)' : '0 2px 8px rgba(28,59,43,0.12)',
                  }}>
                    {msg.body}
                  </div>
                  <div className="wf-sans" style={{ fontSize: 10.5, color: 'var(--wf-ink-45)', marginTop: 3, paddingLeft: isIn ? 10 : 0, paddingRight: isIn ? 0 : 10, textAlign: isIn ? 'left' : 'right', display: 'flex', gap: 6, justifyContent: isIn ? 'flex-start' : 'flex-end' }}>
                    {msg.was_sent && !isIn && <span style={{ color: 'var(--wf-sage)', fontWeight: 600 }}>&#x2713; Auto-replied</span>}
                    <span>{timeAgo(msg.created_at)}</span>
                  </div>
                </div>

                {showDraft && (
                  <AIDraftCard
                    draft={draft}
                    isSending={isSendingReply}
                    onSend={() => onSendReply(draft.body, selectedConversation.messages.filter((m) => m.direction === 'inbound').slice(-1)[0])}
                    onEdit={() => setComposerInitialText(draft.body)}
                    onDismiss={() => setDismissedDraftIds((prev) => new Set([...prev, draft.id]))}
                    onAssign={(memberId) => handleAssignToMember(memberId, msg.body)}
                    circleMembers={activeCircleMembers.map((m) => ({ id: m.id, name: m.name, role: ROLE_LABELS[m.role] ?? m.role }))}
                  />
                )}
              </div>
            )
          })
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Inline reply composer */}
      <InlineReplyComposer
        onSend={handleSendReply}
        isSending={isSendingReply}
        initialText={composerInitialText}
        onClearInitial={() => setComposerInitialText('')}
        isMobile={isMobile}
      />
    </div>
  ) : (
    !isMobile ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--wf-cream-warm)', padding: 48 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(28,59,43,0.06)', color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Icon name="messageCircle" size={28} />
        </div>
        <h3 className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 8px' }}>Select a conversation</h3>
        <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', margin: 0, textAlign: 'center', maxWidth: 280 }}>
          Choose a thread from the left to view the full conversation and reply to your guests.
        </p>
        {needsReplyMessages.length > 0 && (
          <div style={{ marginTop: 20, padding: '10px 16px', background: 'rgba(196,113,74,0.08)', border: '1px solid rgba(196,113,74,0.2)', borderRadius: 10 }}>
            <span className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-terracotta-deep)', fontWeight: 500 }}>
              {needsReplyMessages.length} message{needsReplyMessages.length !== 1 ? 's' : ''} waiting for your reply
            </span>
          </div>
        )}
      </div>
    ) : null
  )

  return (
    <div style={{
      display: isMobile ? 'flex' : 'grid',
      gridTemplateColumns: isMobile ? undefined : '400px 1fr',
      height: 'calc(100vh - 0px)',
      background: 'var(--wf-cream)',
    }}>
      {threadListPanel}
      {detailPanel}

      {/* Assign toast */}
      {assignToast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '10px 16px', borderRadius: 10, boxShadow: 'var(--wf-shadow-lg)', fontSize: 13, fontWeight: 500, color: 'var(--wf-cream)', background: '#4a6141', zIndex: 50, fontFamily: 'var(--wf-sans)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="check" size={13} /> {assignToast}
        </div>
      )}
    </div>
  )
}
