import type { PartnerStats } from '@/app/actions/partner-actions'

interface StatsCardsProps {
  stats: PartnerStats
  isMobile: boolean
}

export function StatsCards({ stats, isMobile }: StatsCardsProps) {
  const cards = [
    { eyebrow: 'Total Referrals', value: stats.totalReferrals, hint: 'All time' },
    { eyebrow: 'Active Couples', value: stats.activeCouples, hint: 'Currently using Wedflow' },
    { eyebrow: 'Conversion Rate', value: stats.totalReferrals > 0 ? `${Math.round(stats.conversionRate * 100)}%` : '--', hint: 'Referrals to active' },
    { eyebrow: 'Pending', value: stats.pendingReferrals, hint: 'Awaiting activation' },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
      gap: isMobile ? 12 : 16,
    }}>
      {cards.map((card) => (
        <div
          key={card.eyebrow}
          style={{
            background: 'var(--wf-paper)',
            border: '1px solid var(--wf-line)',
            borderRadius: 18,
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
            {card.eyebrow}
          </div>
          <div className="wf-serif" style={{ fontSize: isMobile ? 32 : 44, fontWeight: 600, color: 'var(--wf-forest)', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 10, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
            {card.value}
          </div>
          <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)' }}>
            {card.hint}
          </div>
        </div>
      ))}
    </div>
  )
}
