'use client'

interface ChurnIndicatorProps {
  churnStatus: string
  usageStreakWeeks: number
}

export default function ChurnIndicator({ churnStatus, usageStreakWeeks }: ChurnIndicatorProps) {
  const badge = getBadge(churnStatus)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Status badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: badge.bg,
          color: badge.color,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: badge.dot,
            flexShrink: 0,
          }}
        />
        {badge.label}
      </span>

      {/* Streak counter — only show if there is a streak */}
      {usageStreakWeeks > 0 && (
        <span
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          {usageStreakWeeks} week{usageStreakWeeks !== 1 ? 's' : ''} streak
        </span>
      )}
    </div>
  )
}

function getBadge(status: string): {
  label: string
  bg: string
  color: string
  dot: string
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        bg: 'rgba(78, 204, 163, 0.15)',
        color: '#4ecca3',
        dot: '#4ecca3',
      }
    case 'at_risk':
      return {
        label: 'Activity declining',
        bg: 'rgba(245, 166, 35, 0.15)',
        color: '#f5a623',
        dot: '#f5a623',
      }
    case 'churned':
      return {
        label: 'Inactive',
        bg: 'rgba(233, 69, 96, 0.15)',
        color: '#e94560',
        dot: '#e94560',
      }
    default:
      return {
        label: 'Active',
        bg: 'rgba(78, 204, 163, 0.15)',
        color: '#4ecca3',
        dot: '#4ecca3',
      }
  }
}
