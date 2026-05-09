import type { PartnerReferral } from '@/types'

interface ReferralsListProps {
  referrals: PartnerReferral[]
  limit?: number
  isMobile: boolean
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

export function ReferralsList({ referrals, limit, isMobile }: ReferralsListProps) {
  const display = limit ? referrals.slice(0, limit) : referrals

  if (display.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-45)' }}>
          No referrals yet. Share your referral link to get started.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {display.map((ref, idx) => (
        <div
          key={ref.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '14px 0' : '14px 0',
            borderBottom: idx < display.length - 1 ? '1px solid var(--wf-line)' : 'none',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wf-sans" style={{ fontSize: 14, fontWeight: 500, color: 'var(--wf-forest)' }}>
              Couple #{ref.couple_id.slice(0, 6)}
            </div>
            <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginTop: 2 }}>
              Referred {formatDate(ref.created_at)}
            </div>
          </div>
          <span
            className="wf-sans"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: statusColor(ref.status),
              flexShrink: 0,
            }}
          >
            {ref.status}
          </span>
        </div>
      ))}
    </div>
  )
}
