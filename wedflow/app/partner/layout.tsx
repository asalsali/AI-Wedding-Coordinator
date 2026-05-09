import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPartnerProfile } from '@/app/actions/partner-actions'
import type { Partner } from '@/types'

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  let partner: Partner | null = null
  try {
    partner = await getPartnerProfile()
  } catch {
    // Not authenticated or fetch failed — redirect
    redirect('/sign-in')
  }

  if (!partner) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wf-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 440, textAlign: 'center', padding: '40px 24px' }}>
          <h1 className="wf-serif" style={{ fontSize: 28, color: 'var(--wf-forest)', fontWeight: 600, marginBottom: 12 }}>
            Not a Partner
          </h1>
          <p className="wf-sans" style={{ fontSize: 15, color: 'var(--wf-ink-60)', lineHeight: 1.6 }}>
            You do not have a partner account. If you believe this is an error, please contact us.
          </p>
        </div>
      </div>
    )
  }

  if (partner.status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wf-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 440, textAlign: 'center', padding: '40px 24px' }}>
          <h1 className="wf-serif" style={{ fontSize: 28, color: 'var(--wf-forest)', fontWeight: 600, marginBottom: 12 }}>
            Application Pending
          </h1>
          <p className="wf-sans" style={{ fontSize: 15, color: 'var(--wf-ink-60)', lineHeight: 1.6 }}>
            Your partner application is under review. We will notify you at {partner.contact_email} once it has been approved.
          </p>
        </div>
      </div>
    )
  }

  if (partner.status === 'suspended') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--wf-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 440, textAlign: 'center', padding: '40px 24px' }}>
          <h1 className="wf-serif" style={{ fontSize: 28, color: 'var(--wf-forest)', fontWeight: 600, marginBottom: 12 }}>
            Account Suspended
          </h1>
          <p className="wf-sans" style={{ fontSize: 15, color: 'var(--wf-ink-60)', lineHeight: 1.6 }}>
            Your partner account has been suspended. Please contact support for more information.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
