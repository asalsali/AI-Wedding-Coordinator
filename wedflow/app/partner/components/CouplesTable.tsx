'use client'

import { useState, useEffect } from 'react'
import type { PartnerReferral, ReferralStatus } from '@/types'

interface CouplesTableProps {
  referrals: PartnerReferral[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusColor(status: string): string {
  switch (status) {
    case 'active': return '#4a6141'
    case 'pending': return 'var(--wf-terracotta)'
    case 'churned': return 'var(--wf-ink-45)'
    case 'cancelled': return 'var(--wf-rose)'
    default: return 'var(--wf-ink-60)'
  }
}

function statusBg(status: string): string {
  switch (status) {
    case 'active': return 'rgba(74,97,65,0.08)'
    case 'pending': return 'rgba(196,130,88,0.08)'
    case 'churned': return 'rgba(0,0,0,0.04)'
    case 'cancelled': return 'rgba(188,75,75,0.08)'
    default: return 'rgba(0,0,0,0.04)'
  }
}

const ALL_STATUSES: ReferralStatus[] = ['pending', 'active', 'churned', 'cancelled']

export function CouplesTable({ referrals }: CouplesTableProps) {
  const [filter, setFilter] = useState<ReferralStatus | 'all'>('all')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const filtered = filter === 'all' ? referrals : referrals.filter((r) => r.status === filter)

  if (referrals.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p className="wf-sans" style={{ fontSize: 15, color: 'var(--wf-ink-45)' }}>
          No referred couples yet. Share your referral link to get started.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <FilterBtn label="All" active={filter === 'all'} onClick={() => setFilter('all')} count={referrals.length} />
        {ALL_STATUSES.map((s) => {
          const count = referrals.filter((r) => r.status === s).length
          if (count === 0) return null
          return <FilterBtn key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={filter === s} onClick={() => setFilter(s)} count={count} />
        })}
      </div>

      {/* Mobile: cards */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((ref) => (
            <div
              key={ref.id}
              style={{
                background: 'var(--wf-paper)',
                border: '1px solid var(--wf-line)',
                borderRadius: 14,
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div className="wf-sans" style={{ fontSize: 14, fontWeight: 600, color: 'var(--wf-forest)' }}>
                  Couple #{ref.couple_id.slice(0, 6)}
                </div>
                <StatusBadge status={ref.status} />
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div className="wf-sans" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--wf-ink-45)', fontWeight: 600 }}>Referred</div>
                  <div className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', marginTop: 2 }}>{formatDate(ref.created_at)}</div>
                </div>
                {ref.converted_at && (
                  <div>
                    <div className="wf-sans" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--wf-ink-45)', fontWeight: 600 }}>Converted</div>
                    <div className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', marginTop: 2 }}>{formatDate(ref.converted_at)}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: table */
        <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 18, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Couple', 'Status', 'Referred', 'Converted'].map((h) => (
                  <th key={h} className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid var(--wf-line)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ref, idx) => (
                <tr key={ref.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--wf-line)' : 'none' }}>
                  <td className="wf-sans" style={{ fontSize: 14, fontWeight: 500, color: 'var(--wf-forest)', padding: '14px 20px' }}>
                    Couple #{ref.couple_id.slice(0, 6)}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <StatusBadge status={ref.status} />
                  </td>
                  <td className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', padding: '14px 20px' }}>
                    {formatDate(ref.created_at)}
                  </td>
                  <td className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', padding: '14px 20px' }}>
                    {ref.converted_at ? formatDate(ref.converted_at) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-45)' }}>
            No couples with this status.
          </p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="wf-sans"
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: statusColor(status),
        background: statusBg(status),
        padding: '3px 10px',
        borderRadius: 999,
      }}
    >
      {status}
    </span>
  )
}

function FilterBtn({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="wf-sans"
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: '6px 14px',
        borderRadius: 999,
        border: active ? '1px solid var(--wf-forest)' : '1px solid var(--wf-line)',
        background: active ? 'var(--wf-forest)' : 'var(--wf-paper)',
        color: active ? 'var(--wf-cream)' : 'var(--wf-ink-60)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label} ({count})
    </button>
  )
}
