import type { ChildPartnerWithStats } from '@/app/actions/partner-actions'

interface ChurchOfficiantsProps {
  children: ChildPartnerWithStats[]
  isMobile: boolean
}

function statusColor(status: string): string {
  switch (status) {
    case 'approved': return '#4a6141'
    case 'pending': return 'var(--wf-terracotta)'
    case 'suspended': return 'var(--wf-rose)'
    default: return 'var(--wf-ink-60)'
  }
}

export function ChurchOfficiants({ children, isMobile }: ChurchOfficiantsProps) {
  if (children.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-45)' }}>
          No officiants linked to your church yet. Officiants who register with your church as their parent will appear here.
        </p>
      </div>
    )
  }

  const totalReferrals = children.reduce((sum, c) => sum + c.totalReferrals, 0)
  const totalActive = children.reduce((sum, c) => sum + c.activeCouples, 0)

  return (
    <div>
      {/* Aggregate stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? 12 : 16,
        marginBottom: 24,
      }}>
        <MiniStat eyebrow="Officiants" value={children.length} />
        <MiniStat eyebrow="Total Referrals" value={totalReferrals} />
        <MiniStat eyebrow="Active Couples" value={totalActive} />
      </div>

      {/* Officiants list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children.map((child) => (
          <div
            key={child.id}
            style={{
              background: 'var(--wf-paper)',
              border: '1px solid var(--wf-line)',
              borderRadius: 14,
              padding: isMobile ? '16px' : '18px 24px',
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 12 : 20,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="wf-sans" style={{ fontSize: 14, fontWeight: 600, color: 'var(--wf-forest)' }}>
                  {child.contact_name}
                </div>
                <span className="wf-sans" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: statusColor(child.status) }}>
                  {child.status}
                </span>
              </div>
              <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginTop: 2 }}>
                {child.organization_name}
              </div>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 20 : 32, flexShrink: 0 }}>
              <div style={{ textAlign: isMobile ? 'left' : 'center' }}>
                <div className="wf-sans" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--wf-ink-45)', fontWeight: 600 }}>Referrals</div>
                <div className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', marginTop: 2 }}>{child.totalReferrals}</div>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'center' }}>
                <div className="wf-sans" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--wf-ink-45)', fontWeight: 600 }}>Active</div>
                <div className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', marginTop: 2 }}>{child.activeCouples}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ eyebrow, value }: { eyebrow: string; value: number }) {
  return (
    <div style={{
      background: 'var(--wf-paper)',
      border: '1px solid var(--wf-line)',
      borderRadius: 14,
      padding: '16px 18px',
    }}>
      <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
        {eyebrow}
      </div>
      <div className="wf-serif" style={{ fontSize: 28, fontWeight: 600, color: 'var(--wf-forest)', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}
