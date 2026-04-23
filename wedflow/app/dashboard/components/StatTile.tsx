export function StatTile({ eyebrow, value, hint }: { eyebrow: string; value: string | number; hint?: string }) {
  return (
    <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 18, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>{eyebrow}</div>
      <div className="wf-serif" style={{ fontSize: 44, fontWeight: 600, color: 'var(--wf-forest)', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 10, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)' }}>{hint}</div>}
    </div>
  )
}
