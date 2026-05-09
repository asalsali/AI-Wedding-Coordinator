import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartnerProfile } from '@/app/actions/partner-actions'
import PartnerLoginClient from './PartnerLoginClient'

export default async function PartnerLoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If already authenticated, check if they have a partner profile and redirect
  if (user) {
    try {
      const partner = await getPartnerProfile()
      if (partner) {
        redirect('/partner')
      }
    } catch {
      // Not a partner or fetch failed, show the page anyway
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--wf-forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--wf-cream)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" />
            <path d="M23 11h-6" />
          </svg>
        </div>

        <h1
          className="wf-serif"
          style={{
            fontSize: 32,
            color: 'var(--wf-forest)',
            margin: '0 0 8px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          Partner Login
        </h1>

        <p
          className="wf-sans"
          style={{
            fontSize: 15,
            color: 'var(--wf-ink-60)',
            lineHeight: 1.6,
            textAlign: 'center',
            margin: '0 0 28px',
          }}
        >
          Sign in to your partner dashboard. Enter your email and we will send
          you a verification code.
        </p>

        <PartnerLoginClient />
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--wf-cream)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
}

const cardStyle: React.CSSProperties = {
  maxWidth: 440,
  width: '100%',
  padding: '40px 32px',
}
