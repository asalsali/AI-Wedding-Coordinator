import type { PartnerPerformanceMetrics } from '@/app/actions/partner-analytics-actions'
import type { PartnerRevenueAttribution } from '@/app/actions/partner-analytics-actions'

interface PartnerMetricsDetailProps {
  metrics: PartnerPerformanceMetrics
  revenue: PartnerRevenueAttribution
  isMobile: boolean
}

export function PartnerMetricsDetail({ metrics, revenue, isMobile }: PartnerMetricsDetailProps) {
  const funnelSteps = [
    { label: 'Referred', value: metrics.totalReferrals, color: 'var(--wf-ink-45)' },
    { label: 'Converted', value: metrics.activeReferrals + metrics.churnedReferrals, color: '#C4714A' },
    { label: 'Active', value: metrics.activeReferrals, color: 'var(--wf-forest)' },
  ]

  const funnelMax = Math.max(metrics.totalReferrals, 1)

  return (
    <div style={{
      background: 'var(--wf-paper)',
      border: '1px solid var(--wf-line)',
      borderRadius: 18,
      padding: isMobile ? '20px 16px' : '24px 28px',
    }}>
      <h2 className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-forest)', marginBottom: 20 }}>
        Performance Analytics
      </h2>

      {/* Conversion Funnel */}
      <div style={{ marginBottom: 24 }}>
        <div className="wf-sans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', marginBottom: 12 }}>
          Conversion Funnel
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {funnelSteps.map((step) => {
            const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0
            return (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="wf-sans" style={{ fontSize: 12, fontWeight: 500, color: 'var(--wf-ink-60)', width: 72, flexShrink: 0 }}>
                  {step.label}
                </span>
                <div style={{ flex: 1, height: 10, background: 'var(--wf-line)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.max(pct, step.value > 0 ? 3 : 0)}%`,
                    height: '100%',
                    background: step.color,
                    borderRadius: 5,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span className="wf-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--wf-forest)', width: 36, textAlign: 'right', flexShrink: 0 }}>
                  {step.value}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 24,
      }}>
        <MetricBox
          label="Conversion Rate"
          value={`${Math.round(metrics.conversionRate * 100)}%`}
          hint="Referred to active"
        />
        <MetricBox
          label="Retention Rate"
          value={`${Math.round(metrics.retentionRate * 100)}%`}
          hint="Active of converted"
        />
        <MetricBox
          label="Avg. Conversion Time"
          value={metrics.averageConversionDays !== null ? `${metrics.averageConversionDays}d` : '--'}
          hint="Referral to onboard"
        />
      </div>

      {/* Message Volume */}
      <div style={{ marginBottom: 24 }}>
        <div className="wf-sans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', marginBottom: 12 }}>
          Message Volume
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 12,
        }}>
          <MetricBox
            label="Total Messages"
            value={String(metrics.totalMessages)}
            hint="Across referred couples"
          />
          <MetricBox
            label="Auto-Reply Rate"
            value={`${metrics.autoReplyRate}%`}
            hint="Handled automatically"
          />
          <MetricBox
            label="Msgs / Couple / Week"
            value={String(metrics.averageMessagesPerCouplePerWeek)}
            hint="Average engagement"
          />
        </div>
      </div>

      {/* Revenue Attribution */}
      <div>
        <div className="wf-sans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', marginBottom: 12 }}>
          Revenue Attribution
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: 12,
        }}>
          <MetricBox
            label="Attributed MRR"
            value={`$${revenue.totalAttributedMRR}`}
            hint="From active couples"
          />
          <MetricBox
            label="Active Couples"
            value={String(revenue.activeCouples)}
            hint="On paid plans"
          />
          <MetricBox
            label="Avg. Revenue / Couple"
            value={`$${revenue.averageRevenuePerCouple}`}
            hint="Per referred couple"
          />
        </div>
        {revenue.byPlan.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {revenue.byPlan.map((p) => (
              <span key={p.plan} className="wf-sans" style={{
                fontSize: 11,
                color: 'var(--wf-ink-60)',
                background: 'var(--wf-line)',
                padding: '3px 10px',
                borderRadius: 10,
              }}>
                {p.plan === 'none' ? 'Free' : p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}: {p.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricBox({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{
      background: 'var(--wf-cream)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
        {label}
      </div>
      <div className="wf-serif" style={{ fontSize: 26, fontWeight: 600, color: 'var(--wf-forest)', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 6, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-60)' }}>
        {hint}
      </div>
    </div>
  )
}
