import Image from 'next/image'
import Link from 'next/link'
import SignUpForm from './SignUpForm'

export default function SignUpPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', minHeight: '100vh', background: 'var(--wf-cream)' }}>

      {/* Left — forest panel */}
      <div style={{
        background: 'var(--wf-forest)',
        color: 'var(--wf-cream)',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}>

        {/* Brand */}
        <Link href="/" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 12, textDecoration: 'none', zIndex: 2 }}>
          <div style={{ width: 56, height: 56, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Image src="/LogoDark.png" alt="Wedflow" width={90} height={90} style={{ width: 90, height: 90, objectFit: 'contain', flexShrink: 0 }} />
          </div>
          <span className="wf-serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Wedflow</span>
        </Link>

        {/* Middle — illustration + copy */}
        <div style={{ zIndex: 2, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <div style={{ background: 'rgba(253,251,247,0.06)', border: '1px solid rgba(253,251,247,0.12)', borderRadius: 28, padding: 20, marginBottom: 32 }}>
            <Image src="/Couple2.png" alt="Couple" width={300} height={220} style={{ width: 300, height: 220, objectFit: 'cover', borderRadius: 16, display: 'block' }} />
          </div>
          <span className="wf-eyebrow wf-eyebrow-centered wf-eyebrow-forest">For the month before</span>
          <h2 className="wf-serif" style={{ fontSize: 36, lineHeight: 1.2, color: 'var(--wf-cream)', fontWeight: 400, fontStyle: 'italic', margin: '20px 0 12px', letterSpacing: '-0.01em', textAlign: 'center' }}>
            Your wedding,<br />beautifully coordinated.
          </h2>
          <p className="wf-sans" style={{ color: 'var(--wf-cream-ink)', fontSize: 14, maxWidth: 320, lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
            One number for all your guests. One calm inbox for you.
          </p>
        </div>

        {/* Bottom — testimonial */}
        <div style={{ borderTop: '1px solid rgba(253,251,247,0.12)', paddingTop: 24, width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 16, zIndex: 2 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--wf-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--wf-serif)', fontWeight: 600, fontSize: 16, color: 'var(--wf-cream)', flexShrink: 0 }}>AK</div>
          <div>
            <p className="wf-serif" style={{ fontSize: 13, color: 'var(--wf-cream)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
              &ldquo;It felt like having a thoughtful friend in our pocket.&rdquo;
            </p>
            <p className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-cream-ink-50)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Alex &amp; Kirsten · July 2026
            </p>
          </div>
        </div>

        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -120, top: -120, width: 300, height: 300, borderRadius: '50%', background: 'rgba(196,113,74,0.08)', zIndex: 1 }} />
        <div style={{ position: 'absolute', left: -80, bottom: -80, width: 220, height: 220, borderRadius: '50%', background: 'rgba(253,251,247,0.04)', zIndex: 1 }} />
      </div>

      {/* Right — form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '56px 48px' }}>
        <SignUpForm />
      </div>

    </div>
  )
}
