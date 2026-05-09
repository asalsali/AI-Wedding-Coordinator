import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartnerByInviteEmail } from '@/app/actions/partner-actions'
import PartnerJoinClient from './PartnerJoinClient'

interface PageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function PartnerJoinPage({ searchParams }: PageProps) {
  const params = await searchParams
  const email = params.email

  if (!email) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 className="wf-serif" style={headingStyle}>
            Invalid Invitation
          </h1>
          <p className="wf-sans" style={bodyStyle}>
            This invitation link is missing required information. Please check
            the link you received and try again, or contact the person who
            invited you.
          </p>
        </div>
      </div>
    )
  }

  // Check if user is already authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Look up the pending partner record
  const invite = await getPartnerByInviteEmail(email)

  if (!invite) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 className="wf-serif" style={headingStyle}>
            Invalid or Expired Invitation
          </h1>
          <p className="wf-sans" style={bodyStyle}>
            We could not find a partner invitation for this email. It may have
            expired or already been used. Please contact us if you believe this
            is an error.
          </p>
        </div>
      </div>
    )
  }

  if (invite.alreadyClaimed) {
    redirect('/partner')
  }

  // Format the partner type for display
  const typeLabels: Record<string, string> = {
    officiant: 'Officiant',
    church: 'Church',
    counsellor: 'Counsellor',
    vendor: 'Vendor',
  }

  const partnerTypeLabel = typeLabels[invite.partner_type] ?? invite.partner_type

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
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
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
          You have been invited.
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
          Join WedFlow as a <strong style={{ color: 'var(--wf-ink)' }}>{partnerTypeLabel}</strong> partner.
        </p>

        <div
          style={{
            background: 'var(--wf-paper)',
            border: '1px solid var(--wf-line)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <span
                className="wf-sans"
                style={{
                  fontSize: 11,
                  color: 'var(--wf-ink-45)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Organization
              </span>
              <p
                className="wf-sans"
                style={{
                  fontSize: 15,
                  color: 'var(--wf-ink)',
                  margin: '2px 0 0',
                  fontWeight: 500,
                }}
              >
                {invite.organization_name}
              </p>
            </div>
            <div>
              <span
                className="wf-sans"
                style={{
                  fontSize: 11,
                  color: 'var(--wf-ink-45)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Contact
              </span>
              <p
                className="wf-sans"
                style={{
                  fontSize: 15,
                  color: 'var(--wf-ink)',
                  margin: '2px 0 0',
                  fontWeight: 500,
                }}
              >
                {invite.contact_name}
              </p>
            </div>
          </div>
        </div>

        <PartnerJoinClient
          email={email}
          isAuthenticated={!!user}
          authEmail={user?.email ?? null}
        />
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

const headingStyle: React.CSSProperties = {
  fontSize: 28,
  color: 'var(--wf-forest)',
  fontWeight: 600,
  marginBottom: 12,
  textAlign: 'center',
}

const bodyStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--wf-ink-60)',
  lineHeight: 1.6,
  textAlign: 'center',
}
