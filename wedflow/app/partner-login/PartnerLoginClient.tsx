'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Step = 'email' | 'otp-sent' | 'verifying' | 'done'

const supabase = createClient()

export default function PartnerLoginClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setError('')
    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
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
        email: email.trim(),
        token: otpToken.trim(),
        type: 'email',
      })

      if (verifyError) {
        setError(friendlyOtpError(verifyError.message))
        setStep('otp-sent')
        return
      }

      setStep('done')
      setTimeout(() => {
        router.push('/partner')
      }, 1500)
    } catch {
      setError('Verification failed. Please try again.')
      setStep('otp-sent')
    }
  }

  // Success state
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
          Signed in. Redirecting to your dashboard...
        </p>
      </div>
    )
  }

  // OTP verification step
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
            {step === 'verifying' ? 'Verifying...' : 'Sign in'}
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
            onClick={() => {
              setOtpToken('')
              setError('')
              handleSendOtp({ preventDefault: () => {} } as React.FormEvent)
            }}
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

        <p
          className="wf-sans"
          style={{
            textAlign: 'center',
            marginTop: 12,
            fontSize: 13,
            color: 'var(--wf-ink-45)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtpToken('')
              setError('')
            }}
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
            Use a different email
          </button>
        </p>
      </div>
    )
  }

  // Email entry step
  return (
    <div>
      <form
        onSubmit={handleSendOtp}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div>
          <label
            htmlFor="partner-email"
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
            Email address
          </label>
          <input
            id="partner-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="wf-sans"
            style={emailInputStyle}
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <p
            className="wf-sans"
            style={{
              color: 'var(--wf-rose)',
              fontSize: 13,
              margin: 0,
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="wf-btn wf-btn-primary wf-btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? 'Sending...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

function friendlyOtpError(msg: string): string {
  if (msg.includes('Token has expired')) return 'Code has expired. Please request a new one.'
  if (msg.includes('Invalid token') || msg.includes('invalid'))
    return 'Invalid code. Please check and try again.'
  if (msg.includes('Too many requests') || msg.includes('rate'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('Signups not allowed'))
    return 'No partner account found for this email. Contact your WedFlow administrator.'
  return msg
}

const emailInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid var(--wf-line-strong)',
  borderRadius: 10,
  background: 'var(--wf-paper)',
  fontFamily: 'var(--wf-sans)',
  fontSize: 15,
  color: 'var(--wf-ink)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
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
