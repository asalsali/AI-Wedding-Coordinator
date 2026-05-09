'use client'

import { useState } from 'react'
import Link from 'next/link'

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

export default function AdminDashboard({ data }: { data: AdminData }) {
  const [sortBy, setSortBy] = useState<SortKey>('messages30d')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<string>('all')

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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
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
      </div>
    </div>
  )
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
