'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { claimPartnerInvite } from '@/app/actions/partner-actions'

interface PartnerJoinClientProps {
  email: string
  isAuthenticated: boolean
  authEmail: string | null
}

const supabase = createClient()

export default function PartnerJoinClient({
  email,
  isAuthenticated,
  authEmail,
}: PartnerJoinClientProps) {
  const router = useRouter()
  const [step, setStep] = useState<'initial' | 'link-sent' | 'claiming' | 'done'>(
    isAuthenticated ? 'claiming' : 'initial'
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If user is already authenticated, try to claim immediately
  useEffect(() => {
    if (isAuthenticated && step === 'claiming') {
      handleClaim()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleClaim() {
    setStep('claiming')
    setError('')
    try {
      const result = await claimPartnerInvite()
      if (result.success) {
        setStep('done')
        // Short delay so the user sees the success state
        setTimeout(() => {
          router.push('/partner')
        }, 1500)
      } else {
        setError(result.error ?? 'Failed to claim invitation')
        setStep('initial')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('initial')
    }
  }

  async function handleSendLink() {
    setError('')
    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/partner`,
        },
      })

      if (otpError) {
        setError(friendlyError(otpError.message))
        return
      }

      setStep('link-sent')
    } catch {
      setError('Failed to send sign-in link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Already authenticated with matching email — claiming
  if (step === 'claiming') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={spinnerContainerStyle}>
          <div style={spinnerStyle} />
        </div>
        <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-60)' }}>
          Setting up your partner account...
        </p>
      </div>
    )
  }

  // Done — success
  if (step === 'done') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--wf-forest)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--wf-cream)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p
          className="wf-sans"
          style={{ fontSize: 15, color: 'var(--wf-forest)', fontWeight: 600 }}
        >
          Welcome aboard. Redirecting to your dashboard...
        </p>
      </div>
    )
  }

  // Already authenticated but with a different email
  if (isAuthenticated && authEmail && authEmail !== email) {
    return (
      <div>
        <p
          className="wf-sans"
          style={{
            fontSize: 14,
            color: 'var(--wf-ink-60)',
            lineHeight: 1.6,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          You are currently signed in as{' '}
          <strong style={{ color: 'var(--wf-ink)' }}>{authEmail}</strong>, but
          this invitation is for{' '}
          <strong style={{ color: 'var(--wf-ink)' }}>{email}</strong>. Please
          sign out and try again with the correct account.
        </p>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut()
            router.refresh()
          }}
          className="wf-btn wf-btn-light wf-btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Sign out
        </button>
      </div>
    )
  }

  // Link sent confirmation
  if (step === 'link-sent') {
    return (
      <div>
        <p
          className="wf-sans"
          style={{
            fontSize: 14,
            color: 'var(--wf-ink-60)',
            lineHeight: 1.6,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          We sent a sign-in link to{' '}
          <strong style={{ color: 'var(--wf-ink)' }}>{email}</strong>. Check your
          inbox and click the link to continue.
        </p>

        {error && (
          <p
            className="wf-sans"
            style={{ color: 'var(--wf-rose)', fontSize: 13, margin: '0 0 16px', textAlign: 'center' }}
          >
            {error}
          </p>
        )}

        <p
          className="wf-sans"
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 13,
            color: 'var(--wf-ink-45)',
          }}
        >
          Did not receive an email?{' '}
          <button
            type="button"
            onClick={handleSendLink}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--wf-forest)',
              fontWeight: 600,
              fontSize: 13,
              padding: 0,
              fontFamily: 'var(--wf-sans)',
            }}
          >
            Resend
          </button>
        </p>
      </div>
    )
  }

  // Initial state — show "Get Started" button
  return (
    <div>
      <p
        className="wf-sans"
        style={{
          fontSize: 14,
          color: 'var(--wf-ink-60)',
          lineHeight: 1.6,
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        We will send a sign-in link to{' '}
        <strong style={{ color: 'var(--wf-ink)' }}>{email}</strong> to confirm
        your identity.
      </p>

      {error && (
        <p
          className="wf-sans"
          style={{
            color: 'var(--wf-rose)',
            fontSize: 13,
            margin: '0 0 16px',
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSendLink}
        disabled={loading}
        className="wf-btn wf-btn-primary wf-btn-lg"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? 'Sending...' : 'Get started'}
      </button>
    </div>
  )
}

function friendlyError(msg: string): string {
  if (msg.includes('Too many requests') || msg.includes('rate'))
    return 'Too many attempts. Please wait a moment and try again.'
  return msg
}

const spinnerContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 16,
}

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: '3px solid var(--wf-line)',
  borderTopColor: 'var(--wf-forest)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
