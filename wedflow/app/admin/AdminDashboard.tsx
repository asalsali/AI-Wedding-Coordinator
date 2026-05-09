'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { approvePartner, suspendPartner, invitePartner, getPartnerDetail } from '@/app/actions/admin-partner-actions'
import { PartnerPerformanceBadge } from '@/app/partner/components/PartnerPerformanceBadge'
import type { PartnerType, PartnerStatus, PartnerReferral } from '@/types'

interface PartnerRow {
  id: string
  organization_name: string
  contact_name: string
  contact_email: string
  partner_type: PartnerType
  status: PartnerStatus
  referral_code: string
  referral_count: number
  active_referrals: number
  conversionRate: number
  retentionRate: number
  created_at: string
}

interface PartnerSummary {
  totalPartners: number
  pendingCount: number
  approvedCount: number
  suspendedCount: number
  totalReferrals: number
  topReferrer: { name: string; count: number } | null
}

interface CoupleRow {
  id: string
  name: string
  email: string
  plan: string
  subscriptionStatus: string
  churnStatus: string
  usageStreakWeeks: number
  lastActiveAt: string | null
  onboardingCompleted: boolean
  createdAt: string
  messages30d: number
  autoReplied30d: number
  escalations30d: number
  inboxOpens30d: number
}

interface DailyDataPoint {
  date: string
  messages: number
  autoReplied: number
  escalations: number
}

interface AdminData {
  totalCouples: number
  mrr: number
  planCounts: { none: number; starter: number; essential: number; concierge: number }
  churnCounts: { active: number; at_risk: number; churned: number }
  totalMessages: number
  totalAutoReplied: number
  totalEscalations: number
  totalDraftsUsed: number
  totalDraftsRewritten: number
  totalInboxOpens: number
  totalConversations: number
  totalGuests: number
  safetyEscalations: number
  classificationBreakdown: { routine: number; sensitive: number; unclear: number }
  autoReplyRate: number
  draftAdoptionRate: number
  dailyData: DailyDataPoint[]
  couples: CoupleRow[]
  partners: PartnerRow[]
  partnerSummary: PartnerSummary
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      padding: '18px 22px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? '#1C3B2B', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    concierge: { bg: '#1C3B2B', text: '#fff' },
    essential: { bg: '#C4714A', text: '#fff' },
    starter: { bg: '#e5e7eb', text: '#374151' },
    none: { bg: '#f3f4f6', text: '#9ca3af' },
  }
  const c = colors[plan] ?? colors.none
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      textTransform: 'capitalize',
    }}>
      {plan === 'none' ? 'Free' : plan}
    </span>
  )
}

function ChurnBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: '#dcfce7', text: '#166534' },
    at_risk: { bg: '#fef3c7', text: '#92400e' },
    churned: { bg: '#fee2e2', text: '#991b1b' },
  }
  const c = colors[status] ?? { bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
    }}>
      {status === 'at_risk' ? 'At Risk' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const colors: Record<PartnerStatus, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#dcfce7', text: '#166534' },
    suspended: { bg: '#fee2e2', text: '#991b1b' },
  }
  const c = colors[status]
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  )
}

function PartnerTypeBadge({ type }: { type: PartnerType }) {
  const colors: Record<PartnerType, { bg: string; text: string }> = {
    officiant: { bg: '#1C3B2B', text: '#fff' },
    church: { bg: '#C4714A', text: '#fff' },
    counsellor: { bg: '#4338ca', text: '#fff' },
    vendor: { bg: '#9ca3af', text: '#fff' },
  }
  const c = colors[type]
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      textTransform: 'capitalize',
    }}>
      {type}
    </span>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ width: 60, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

type SortKey = 'name' | 'plan' | 'messages30d' | 'churnStatus' | 'lastActiveAt' | 'createdAt'

type AdminTab = 'overview' | 'partners'

export default function AdminDashboard({ data }: { data: AdminData }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [sortBy, setSortBy] = useState<SortKey>('messages30d')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  // Partner state
  const [partnerFilter, setPartnerFilter] = useState<string>('all')
  const [partnerTypeFilter, setPartnerTypeFilter] = useState<string>('all')
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null)
  const [partnerDetail, setPartnerDetail] = useState<{ referrals: PartnerReferral[]; conversionRate: number } | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', partnerType: 'officiant' as PartnerType, organizationName: '', contactName: '' })
  const [isPending, startTransition] = useTransition()
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [partnersList, setPartnersList] = useState(data.partners)

  const maxMessages = Math.max(...data.couples.map((c) => c.messages30d), 1)

  const filtered = data.couples.filter((c) => {
    if (filter === 'all') return true
    if (filter === 'paying') return c.plan !== 'none' && c.subscriptionStatus === 'active'
    if (filter === 'at_risk') return c.churnStatus === 'at_risk'
    if (filter === 'churned') return c.churnStatus === 'churned'
    return c.plan === filter
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1
    switch (sortBy) {
      case 'name': return dir * a.name.localeCompare(b.name)
      case 'plan': return dir * a.plan.localeCompare(b.plan)
      case 'messages30d': return dir * (a.messages30d - b.messages30d)
      case 'churnStatus': return dir * a.churnStatus.localeCompare(b.churnStatus)
      case 'lastActiveAt': return dir * ((a.lastActiveAt ?? '').localeCompare(b.lastActiveAt ?? ''))
      case 'createdAt': return dir * a.createdAt.localeCompare(b.createdAt)
      default: return 0
    }
  })

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(false) }
  }

  const sortArrow = (key: SortKey) => sortBy === key ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''

  // Daily chart max for scaling
  const chartMax = Math.max(...data.dailyData.map((d) => d.messages), 1)

  // Partner filtering
  const filteredPartners = partnersList.filter((p) => {
    if (partnerFilter !== 'all' && p.status !== partnerFilter) return false
    if (partnerTypeFilter !== 'all' && p.partner_type !== partnerTypeFilter) return false
    return true
  })

  function handleApprove(partnerId: string) {
    startTransition(async () => {
      try {
        await approvePartner(partnerId)
        setPartnersList((prev) => prev.map((p) =>
          p.id === partnerId ? { ...p, status: 'approved' as PartnerStatus } : p
        ))
        setActionMessage({ type: 'success', text: 'Partner approved' })
        setTimeout(() => setActionMessage(null), 3000)
      } catch (err) {
        setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to approve partner' })
      }
    })
  }

  function handleSuspend(partnerId: string) {
    startTransition(async () => {
      try {
        await suspendPartner(partnerId)
        setPartnersList((prev) => prev.map((p) =>
          p.id === partnerId ? { ...p, status: 'suspended' as PartnerStatus } : p
        ))
        setActionMessage({ type: 'success', text: 'Partner suspended' })
        setTimeout(() => setActionMessage(null), 3000)
      } catch (err) {
        setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to suspend partner' })
      }
    })
  }

  function handleExpandPartner(partnerId: string) {
    if (expandedPartnerId === partnerId) {
      setExpandedPartnerId(null)
      setPartnerDetail(null)
      return
    }
    setExpandedPartnerId(partnerId)
    startTransition(async () => {
      try {
        const detail = await getPartnerDetail(partnerId)
        setPartnerDetail({ referrals: detail.referrals, conversionRate: detail.conversionRate })
      } catch {
        setPartnerDetail(null)
      }
    })
  }

  function handleInviteSubmit() {
    if (!inviteForm.email || !inviteForm.organizationName || !inviteForm.contactName) return
    startTransition(async () => {
      try {
        const result = await invitePartner(inviteForm)
        setPartnersList((prev) => [{
          id: result.id,
          organization_name: inviteForm.organizationName,
          contact_name: inviteForm.contactName,
          contact_email: inviteForm.email,
          partner_type: inviteForm.partnerType,
          status: 'pending' as PartnerStatus,
          referral_code: result.referral_code,
          referral_count: 0,
          active_referrals: 0,
          conversionRate: 0,
          retentionRate: 0,
          created_at: new Date().toISOString(),
        }, ...prev])
        setShowInviteForm(false)
        setInviteForm({ email: '', partnerType: 'officiant', organizationName: '', contactName: '' })
        setActionMessage({ type: 'success', text: 'Partner invited' })
        setTimeout(() => setActionMessage(null), 3000)
      } catch (err) {
        setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to invite partner' })
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C3B2B', margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>
              Wedflow Admin
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Product analytics, last 30 days</p>
          </div>
          <Link
            href="/dashboard"
            style={{ fontSize: 13, color: '#1C3B2B', textDecoration: 'none', fontWeight: 500, padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
          >
            Back to dashboard
          </Link>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #e5e7eb' }}>
          {(['overview', 'partners'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === tab ? '#1C3B2B' : '#9ca3af',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #1C3B2B' : '2px solid transparent',
                padding: '10px 20px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab}
              {tab === 'partners' && data.partnerSummary.pendingCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#C4714A',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 7px',
                  verticalAlign: 'middle',
                }}>
                  {data.partnerSummary.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action message toast */}
        {actionMessage && (
          <div style={{
            padding: '10px 16px',
            marginBottom: 16,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: actionMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {actionMessage.text}
          </div>
        )}

        {activeTab === 'overview' && (<>

        {/* Business metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard label="Total Couples" value={String(data.totalCouples)} sub={`${data.planCounts.none} free, ${data.totalCouples - data.planCounts.none} paid`} />
          <StatCard label="MRR" value={`$${data.mrr}`} color="#C4714A" sub={`${data.planCounts.starter}S / ${data.planCounts.essential}E / ${data.planCounts.concierge}C`} />
          <StatCard label="Conversations" value={String(data.totalConversations)} sub={`${data.totalGuests} guests tracked`} />
          <StatCard label="Messages (30d)" value={String(data.totalMessages)} sub={`${data.autoReplyRate}% auto-replied`} />
        </div>

        {/* AI performance + Churn row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard label="Auto-Reply Rate" value={`${data.autoReplyRate}%`} sub={`${data.totalAutoReplied} of ${data.totalMessages}`} />
          <StatCard label="Escalations" value={String(data.totalEscalations)} sub={`${data.safetyEscalations} from safety checks`} />
          <StatCard label="Draft Adoption" value={`${data.draftAdoptionRate}%`} sub={`${data.totalDraftsUsed} used, ${data.totalDraftsRewritten} edited`} />
          <StatCard label="Churn" value={`${data.churnCounts.at_risk + data.churnCounts.churned}`} sub={`${data.churnCounts.active} active, ${data.churnCounts.at_risk} at risk, ${data.churnCounts.churned} churned`} color={data.churnCounts.churned > 0 ? '#991b1b' : '#1C3B2B'} />
        </div>

        {/* Partner summary card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard
            label="Partners"
            value={String(data.partnerSummary.totalPartners)}
            sub={`${data.partnerSummary.approvedCount} approved, ${data.partnerSummary.suspendedCount} suspended`}
          />
          <StatCard
            label="Pending Approvals"
            value={String(data.partnerSummary.pendingCount)}
            color={data.partnerSummary.pendingCount > 0 ? '#C4714A' : '#1C3B2B'}
            sub={data.partnerSummary.pendingCount > 0 ? 'Needs attention' : 'All clear'}
          />
          <StatCard
            label="Partner Referrals"
            value={String(data.partnerSummary.totalReferrals)}
            sub="Total across all partners"
          />
          <StatCard
            label="Top Referrer"
            value={data.partnerSummary.topReferrer?.name ?? '--'}
            sub={data.partnerSummary.topReferrer ? `${data.partnerSummary.topReferrer.count} active couples` : 'No referrals yet'}
          />
        </div>

        {/* Classification breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
          {/* Classification */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3B2B', marginBottom: 16 }}>Classification Breakdown (30d)</div>
            {(['routine', 'sensitive', 'unclear'] as const).map((cls) => {
              const count = data.classificationBreakdown[cls]
              const total = data.classificationBreakdown.routine + data.classificationBreakdown.sensitive + data.classificationBreakdown.unclear
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const colors = { routine: '#4a6141', sensitive: '#991b1b', unclear: '#92400e' }
              return (
                <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', width: 70, textTransform: 'capitalize' }}>{cls}</span>
                  <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colors[cls], borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#6b7280', width: 60, textAlign: 'right' }}>{count} ({pct}%)</span>
                </div>
              )
            })}
          </div>

          {/* Plan distribution */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3B2B', marginBottom: 16 }}>Plan Distribution</div>
            {(['concierge', 'essential', 'starter', 'none'] as const).map((plan) => {
              const count = data.planCounts[plan]
              const pct = data.totalCouples > 0 ? Math.round((count / data.totalCouples) * 100) : 0
              const colors = { concierge: '#1C3B2B', essential: '#C4714A', starter: '#9ca3af', none: '#e5e7eb' }
              const labels = { concierge: 'Concierge', essential: 'Essential', starter: 'Starter', none: 'Free' }
              return (
                <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', width: 70 }}>{labels[plan]}</span>
                  <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colors[plan], borderRadius: 4, minWidth: count > 0 ? 4 : 0 }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#6b7280', width: 60, textAlign: 'right' }}>{count} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Daily volume chart */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3B2B', marginBottom: 16 }}>Daily Message Volume (14d)</div>
          {data.dailyData.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No message data yet</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
              {data.dailyData.map((d) => {
                const msgH = (d.messages / chartMax) * 100
                const autoH = (d.autoReplied / chartMax) * 100
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 100 }}>
                      <div
                        style={{ width: '80%', maxWidth: 32, background: '#1C3B2B', borderRadius: '4px 4px 0 0', height: `${msgH}%`, minHeight: d.messages > 0 ? 3 : 0, position: 'relative' }}
                        title={`${d.date}: ${d.messages} msgs, ${d.autoReplied} auto, ${d.escalations} esc`}
                      >
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${d.messages > 0 ? (autoH / msgH) * 100 : 0}%`, background: '#4a6141', borderRadius: '0 0 0 0' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDate(d.date)}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1C3B2B', display: 'inline-block' }} /> Total
            </span>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#4a6141', display: 'inline-block' }} /> Auto-replied
            </span>
          </div>
        </div>

        {/* Couples table */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3B2B' }}>All Couples ({sorted.length})</div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', color: '#374151', background: '#fff' }}
            >
              <option value="all">All</option>
              <option value="paying">Paying</option>
              <option value="starter">Starter</option>
              <option value="essential">Essential</option>
              <option value="concierge">Concierge</option>
              <option value="at_risk">At Risk</option>
              <option value="churned">Churned</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
                  <th onClick={() => handleSort('name')} style={{ ...thStyle, cursor: 'pointer' }}>Couple{sortArrow('name')}</th>
                  <th onClick={() => handleSort('plan')} style={{ ...thStyle, cursor: 'pointer' }}>Plan{sortArrow('plan')}</th>
                  <th onClick={() => handleSort('churnStatus')} style={{ ...thStyle, cursor: 'pointer' }}>Status{sortArrow('churnStatus')}</th>
                  <th onClick={() => handleSort('messages30d')} style={{ ...thStyle, cursor: 'pointer', textAlign: 'right' }}>Msgs (30d){sortArrow('messages30d')}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Auto %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Esc</th>
                  <th onClick={() => handleSort('lastActiveAt')} style={{ ...thStyle, cursor: 'pointer' }}>Last Active{sortArrow('lastActiveAt')}</th>
                  <th onClick={() => handleSort('createdAt')} style={{ ...thStyle, cursor: 'pointer' }}>Joined{sortArrow('createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => {
                  const autoRate = c.messages30d > 0 ? Math.round((c.autoReplied30d / c.messages30d) * 100) : 0
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500, color: '#1C3B2B' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.email}</div>
                      </td>
                      <td style={tdStyle}><PlanBadge plan={c.plan} /></td>
                      <td style={tdStyle}><ChurnBadge status={c.churnStatus} /></td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <MiniBar value={c.messages30d} max={maxMessages} color="#1C3B2B" />
                          <span style={{ minWidth: 24 }}>{c.messages30d}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: autoRate >= 80 ? '#166534' : autoRate >= 50 ? '#92400e' : '#6b7280' }}>
                        {c.messages30d > 0 ? `${autoRate}%` : '--'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: c.escalations30d > 0 ? '#991b1b' : '#6b7280' }}>
                        {c.escalations30d || '--'}
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7280' }}>{timeAgo(c.lastActiveAt)}</td>
                      <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No couples match this filter</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        </>)}

        {activeTab === 'partners' && (<>

        {/* Partner list */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3B2B' }}>
              All Partners ({filteredPartners.length})
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', color: '#374151', background: '#fff' }}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={partnerTypeFilter}
                onChange={(e) => setPartnerTypeFilter(e.target.value)}
                style={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', color: '#374151', background: '#fff' }}
              >
                <option value="all">All types</option>
                <option value="officiant">Officiant</option>
                <option value="church">Church</option>
                <option value="counsellor">Counsellor</option>
                <option value="vendor">Vendor</option>
              </select>
              <button
                onClick={() => setShowInviteForm(!showInviteForm)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#1C3B2B',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                + Invite Partner
              </button>
            </div>
          </div>

          {/* Invite form */}
          {showInviteForm && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3B2B', marginBottom: 12 }}>Invite New Partner</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Contact name"
                  value={inviteForm.contactName}
                  onChange={(e) => setInviteForm({ ...inviteForm, contactName: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Organization name"
                  value={inviteForm.organizationName}
                  onChange={(e) => setInviteForm({ ...inviteForm, organizationName: e.target.value })}
                  style={inputStyle}
                />
                <select
                  value={inviteForm.partnerType}
                  onChange={(e) => setInviteForm({ ...inviteForm, partnerType: e.target.value as PartnerType })}
                  style={inputStyle}
                >
                  <option value="officiant">Officiant</option>
                  <option value="church">Church</option>
                  <option value="counsellor">Counsellor</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleInviteSubmit}
                  disabled={isPending || !inviteForm.email || !inviteForm.organizationName || !inviteForm.contactName}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#1C3B2B',
                    color: '#fff',
                    cursor: isPending ? 'wait' : 'pointer',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Inviting...' : 'Send Invite'}
                </button>
                <button
                  onClick={() => setShowInviteForm(false)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
                  <th style={thStyle}>Organization</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Health</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Referrals</th>
                  <th style={thStyle}>Joined</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((p) => (
                  <>
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: p.status === 'pending' ? '#fffbeb' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleExpandPartner(p.id)}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500, color: '#1C3B2B' }}>{p.organization_name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.referral_code}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500, color: '#374151' }}>{p.contact_name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.contact_email}</div>
                      </td>
                      <td style={tdStyle}><PartnerTypeBadge type={p.partner_type} /></td>
                      <td style={tdStyle}><PartnerStatusBadge status={p.status} /></td>
                      <td style={tdStyle}>
                        {p.referral_count > 0 ? (
                          <PartnerPerformanceBadge conversionRate={p.conversionRate} retentionRate={p.retentionRate} />
                        ) : (
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>--</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ fontWeight: 600, color: '#1C3B2B' }}>{p.referral_count}</span>
                        {p.active_referrals > 0 && (
                          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>
                            ({p.active_referrals} active)
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {p.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={isPending}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 5,
                                border: 'none',
                                background: '#166534',
                                color: '#fff',
                                cursor: isPending ? 'wait' : 'pointer',
                              }}
                            >
                              Approve
                            </button>
                          )}
                          {p.status === 'approved' && (
                            <button
                              onClick={() => handleSuspend(p.id)}
                              disabled={isPending}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 5,
                                border: '1px solid #fecaca',
                                background: '#fff',
                                color: '#991b1b',
                                cursor: isPending ? 'wait' : 'pointer',
                              }}
                            >
                              Suspend
                            </button>
                          )}
                          {p.status === 'suspended' && (
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={isPending}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 5,
                                border: '1px solid #bbf7d0',
                                background: '#fff',
                                color: '#166534',
                                cursor: isPending ? 'wait' : 'pointer',
                              }}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedPartnerId === p.id && (
                      <tr key={`${p.id}-detail`} style={{ background: '#fafafa' }}>
                        <td colSpan={8} style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
                            {/* Partner info */}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#1C3B2B', marginBottom: 10 }}>Partner Details</div>
                              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>
                                <div><strong>Organization:</strong> {p.organization_name}</div>
                                <div><strong>Contact:</strong> {p.contact_name}</div>
                                <div><strong>Email:</strong> {p.contact_email}</div>
                                <div><strong>Type:</strong> {p.partner_type}</div>
                                <div><strong>Referral Code:</strong> <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{p.referral_code}</code></div>
                                <div><strong>Status:</strong> {p.status}</div>
                                {partnerDetail && (
                                  <div><strong>Conversion Rate:</strong> {partnerDetail.conversionRate}%</div>
                                )}
                              </div>
                            </div>
                            {/* Referral list */}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#1C3B2B', marginBottom: 10 }}>
                                Referrals ({partnerDetail?.referrals.length ?? '...'})
                              </div>
                              {isPending && !partnerDetail && (
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading referrals...</div>
                              )}
                              {partnerDetail && partnerDetail.referrals.length === 0 && (
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>No referrals yet</div>
                              )}
                              {partnerDetail && partnerDetail.referrals.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <th style={{ ...thStyle, fontSize: 10, padding: '6px 8px' }}>Couple ID</th>
                                      <th style={{ ...thStyle, fontSize: 10, padding: '6px 8px' }}>Status</th>
                                      <th style={{ ...thStyle, fontSize: 10, padding: '6px 8px' }}>Code Used</th>
                                      <th style={{ ...thStyle, fontSize: 10, padding: '6px 8px' }}>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {partnerDetail.referrals.map((ref) => (
                                      <tr key={ref.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '6px 8px', color: '#6b7280', fontFamily: 'monospace', fontSize: 10 }}>
                                          {ref.couple_id.slice(0, 8)}...
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                          <ReferralStatusBadge status={ref.status} />
                                        </td>
                                        <td style={{ padding: '6px 8px', color: '#6b7280' }}>{ref.referral_code_used}</td>
                                        <td style={{ padding: '6px 8px', color: '#9ca3af' }}>
                                          {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filteredPartners.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>No partners match this filter</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        </>)}

      </div>
    </div>
  )
}

function ReferralStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    active: { bg: '#dcfce7', text: '#166534' },
    churned: { bg: '#fee2e2', text: '#991b1b' },
    cancelled: { bg: '#f3f4f6', text: '#6b7280' },
  }
  const c = colors[status] ?? { bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 6px',
      borderRadius: 5,
      background: c.bg,
      color: c.text,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '8px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  color: '#374151',
  background: '#fff',
  outline: 'none',
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  userSelect: 'none',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  whiteSpace: 'nowrap',
}
