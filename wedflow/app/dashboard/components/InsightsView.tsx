'use client'

import type { InsightsData } from '../actions'
import ChurnIndicator from './ChurnIndicator'

interface InsightsViewProps {
  data: InsightsData | null
  isLoading: boolean
  isMobile: boolean
  churnStatus: string
  usageStreakWeeks: number
}

function MetricCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div style={{
      background: 'var(--wf-cream)',
      border: '1px solid var(--wf-ink-10)',
      borderRadius: 14,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span className="wf-sans" style={{ fontSize: 11, fontWeight: 500, color: 'var(--wf-ink-50)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span className="wf-serif" style={{ fontSize: 32, fontWeight: 600, color: 'var(--wf-forest)', lineHeight: 1.1 }}>
        {value}
      </span>
      {subtitle && (
        <span className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-40)' }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function InsightsView({ data, isLoading, isMobile, churnStatus, usageStreakWeeks }: InsightsViewProps) {
  if (isLoading) {
    return (
      <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', maxWidth: 900, margin: '0 auto' }}>
        <h1 className="wf-serif" style={{ fontSize: isMobile ? 22 : 28, color: 'var(--wf-forest)', marginBottom: 8 }}>Insights</h1>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-40)', fontSize: 14 }}>Loading your metrics...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', maxWidth: 900, margin: '0 auto' }}>
        <h1 className="wf-serif" style={{ fontSize: isMobile ? 22 : 28, color: 'var(--wf-forest)', marginBottom: 8 }}>Insights</h1>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-40)', fontSize: 14 }}>Unable to load insights. Please try again later.</p>
      </div>
    )
  }

  const recentDays = data.dailyMetrics.slice(0, 7)
  const hasActivity = data.totalMessages > 0 || data.totalInboxOpens > 0

  return (
    <div style={{ padding: isMobile ? '24px 16px' : '40px 48px', maxWidth: 900, margin: '0 auto' }}>
      <h1 className="wf-serif" style={{ fontSize: isMobile ? 22 : 28, color: 'var(--wf-forest)', marginBottom: 4 }}>Insights</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-40)', fontSize: 14, margin: 0 }}>
          Last 30 days of activity
        </p>
        <ChurnIndicator churnStatus={churnStatus} usageStreakWeeks={usageStreakWeeks} />
      </div>

      {/* Metric cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: 14,
        marginBottom: 36,
      }}>
        <MetricCard
          label="Total Messages"
          value={String(data.totalMessages)}
          subtitle="from guests"
        />
        <MetricCard
          label="Auto-Reply Rate"
          value={`${data.autoReplyRate}%`}
          subtitle="handled by AI"
        />
        <MetricCard
          label="Escalations"
          value={String(data.totalEscalations)}
          subtitle="needed your input"
        />
        <MetricCard
          label="Draft Adoption"
          value={`${data.draftAdoptionRate}%`}
          subtitle="drafts used as-is"
        />
      </div>

      {/* Weekly activity */}
      <h2 className="wf-serif" style={{ fontSize: isMobile ? 18 : 20, color: 'var(--wf-forest)', marginBottom: 16 }}>
        Recent Activity
      </h2>

      {!hasActivity ? (
        <div style={{
          background: 'var(--wf-cream)',
          border: '1px solid var(--wf-ink-10)',
          borderRadius: 14,
          padding: '32px 24px',
          textAlign: 'center',
        }}>
          <p className="wf-sans" style={{ color: 'var(--wf-ink-40)', fontSize: 14, margin: 0 }}>
            No activity yet. Once guests start texting your Wedflow number, you will see daily breakdowns here.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--wf-cream)',
          border: '1px solid var(--wf-ink-10)',
          borderRadius: 14,
          overflow: 'hidden',
        }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr repeat(3, 56px)' : '1fr repeat(5, 80px)',
            gap: 0,
            padding: '12px 20px',
            borderBottom: '1px solid var(--wf-ink-10)',
            background: 'rgba(0,0,0,0.02)',
          }}>
            <span className="wf-sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wf-ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
            <span className="wf-sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wf-ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Msgs</span>
            <span className="wf-sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wf-ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Auto</span>
            <span className="wf-sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wf-ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Esc</span>
            {!isMobile && (
              <>
                <span className="wf-sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wf-ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Drafts</span>
                <span className="wf-sans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--wf-ink-40)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Opens</span>
              </>
            )}
          </div>

          {/* Data rows */}
          {recentDays.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-40)' }}>No data for the last 7 days</span>
            </div>
          ) : (
            recentDays.map((day, i) => (
              <div
                key={day.date}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr repeat(3, 56px)' : '1fr repeat(5, 80px)',
                  gap: 0,
                  padding: '12px 20px',
                  borderBottom: i < recentDays.length - 1 ? '1px solid var(--wf-ink-10)' : 'none',
                }}
              >
                <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-forest)', fontWeight: 500 }}>
                  {formatDate(day.date)}
                </span>
                <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', textAlign: 'right' }}>
                  {day.messages_received}
                </span>
                <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', textAlign: 'right' }}>
                  {day.messages_auto_replied}
                </span>
                <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', textAlign: 'right' }}>
                  {day.escalations}
                </span>
                {!isMobile && (
                  <>
                    <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', textAlign: 'right' }}>
                      {day.drafts_used}/{day.drafts_used + day.drafts_rewritten}
                    </span>
                    <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', textAlign: 'right' }}>
                      {day.inbox_opens}
                    </span>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Inbox opens summary card */}
      <div style={{
        marginTop: 20,
        background: 'var(--wf-cream)',
        border: '1px solid var(--wf-ink-10)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)' }}>
          Total inbox opens (30 days)
        </span>
        <span className="wf-sans" style={{ fontSize: 16, fontWeight: 600, color: 'var(--wf-forest)' }}>
          {data.totalInboxOpens}
        </span>
      </div>
    </div>
  )
}
