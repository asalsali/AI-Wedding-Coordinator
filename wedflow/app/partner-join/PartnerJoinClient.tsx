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
  const [step, setStep] = useState<'initial' | 'otp-sent' | 'verifying' | 'claiming' | 'done'>(
    isAuthenticated ? 'claiming' : 'initial'
  )
  const [otpToken, setOtpToken] = useState('')
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

  async function handleSendOtp() {
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
        setError(friendlyOtpError(otpError.message))
        return
      }

      setStep('otp-sent')
    } catch {
      setError('Failed to send verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpToken.trim()) return

    setError('')
    setStep('verifying')
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpToken.trim(),
        type: 'email',
      })

      if (verifyError) {
        setError(friendlyOtpError(verifyError.message))
        setStep('otp-sent')
        return
      }

      // OTP verified, user is now authenticated. Claim the invite.
      await handleClaim()
    } catch {
      setError('Verification failed. Please try again.')
      setStep('otp-sent')
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

  // OTP sent — show verification input
  if (step === 'otp-sent' || step === 'verifying') {
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
          <strong style={{ color: 'var(--wf-ink)' }}>{email}</strong>. Click the
          link in your email, or enter the 6-digit code below if one was
          included.
        </p>

        <form
          onSubmit={handleVerifyOtp}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label
              htmlFor="otp-code"
              className="wf-sans"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--wf-forest)',
                marginBottom: 6,
                letterSpacing: '0.02em',
              }}
            >
              Verification code
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
              required
              autoComplete="one-time-code"
              autoFocus
              className="wf-sans"
              style={fieldInputStyle}
              placeholder="000000"
            />
          </div>

          {error && (
            <p
              className="wf-sans"
              style={{ color: 'var(--wf-rose)', fontSize: 13, margin: 0 }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={otpToken.length < 6}
            className="wf-btn wf-btn-primary wf-btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {step === 'verifying' ? 'Verifying...' : 'Verify and continue'}
          </button>
        </form>

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
            onClick={handleSendOtp}
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
        We will send a verification code to{' '}
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
        onClick={handleSendOtp}
        disabled={loading}
        className="wf-btn wf-btn-primary wf-btn-lg"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? 'Sending...' : 'Get started'}
      </button>
    </div>
  )
}

function friendlyOtpError(msg: string): string {
  if (msg.includes('Token has expired')) return 'Code has expired. Please request a new one.'
  if (msg.includes('Invalid token') || msg.includes('invalid'))
    return 'Invalid code. Please check and try again.'
  if (msg.includes('Too many requests') || msg.includes('rate'))
    return 'Too many attempts. Please wait a moment and try again.'
  return msg
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid var(--wf-line-strong)',
  borderRadius: 10,
  background: 'var(--wf-paper)',
  fontFamily: 'var(--wf-sans)',
  fontSize: 20,
  color: 'var(--wf-ink)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
  textAlign: 'center',
  letterSpacing: '0.3em',
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
