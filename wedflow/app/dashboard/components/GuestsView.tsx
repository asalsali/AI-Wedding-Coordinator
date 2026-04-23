import Image from 'next/image'

export function GuestsView() {
  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 800, margin: '0 auto' }}>
      <span className="wf-eyebrow">Guest list</span>
      <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 32px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        Everyone you&apos;ll <em style={{ fontWeight: 500 }}>celebrate with.</em>
      </h1>
      <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: '48px 32px', textAlign: 'center' }}>
        <Image src="/Couple2.png" alt="Guests" width={200} height={160} style={{ margin: '0 auto 24px', opacity: 0.7 }} />
        <h3 className="wf-serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)', margin: '0 0 8px' }}>Guest list coming soon</h3>
        <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-60)', margin: 0 }}>We&apos;re building a better way to manage your guest list.</p>
      </div>
    </div>
  )
}
