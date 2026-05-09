interface PartnerPerformanceBadgeProps {
  conversionRate: number
  retentionRate: number
}

export function PartnerPerformanceBadge({ conversionRate, retentionRate }: PartnerPerformanceBadgeProps) {
  const convPct = conversionRate * 100
  const retPct = retentionRate * 100

  let level: 'green' | 'yellow' | 'red'
  let label: string

  if (convPct > 70 && retPct > 80) {
    level = 'green'
    label = 'Strong'
  } else if (convPct < 40 || retPct < 50) {
    level = 'red'
    label = 'Needs Attention'
  } else {
    level = 'yellow'
    label = 'Moderate'
  }

  const colors = {
    green: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    yellow: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    red: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  }

  const c = colors[level]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: c.dot,
        flexShrink: 0,
      }} />
      {label}
    </span>
  )
}
