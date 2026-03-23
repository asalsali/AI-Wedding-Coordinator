'use client'

import { useState } from 'react'
import { useSignUp, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
  forest: '#1C3B2B',
  cream: '#FDFBF7',
  terracotta: '#C4714A',
  text: '#1A1A1A',
} as const

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  color: '#1A1A1A',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#1A1A1A',
  fontSize: '14px',
  fontWeight: 500,
  marginBottom: '6px',
}

function extractClerkError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const clerkErr = err as { errors: Array<{ message: string }> }
    return clerkErr.errors[0]?.message ?? fallback
  }
  return fallback
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'register' | 'verify'

export default function SignUpForm() {
  const { signUp, fetchStatus } = useSignUp()
  const { setActive } = useClerk()
  const router = useRouter()

  const [step, setStep] = useState<Step>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isReady = fetchStatus === 'idle' && signUp !== undefined

  // ── Step 1: create account + send OTP ──────────────────────────────────────

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp) return
    setError('')
    setLoading(true)
    try {
      await signUp.create({ emailAddress: email })
      await signUp.password({ emailAddress: email, password })
      await signUp.verifications.sendEmailCode()
      setStep('verify')
    } catch (err: unknown) {
      setError(extractClerkError(err, 'Sign up failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp) return
    setError('')
    setLoading(true)
    try {
      await signUp.verifications.verifyEmailCode({ code })
      if (signUp.status === 'complete' && signUp.createdSessionId) {
        await setActive({ session: signUp.createdSessionId })
        router.push('/onboarding')
      }
    } catch (err: unknown) {
      setError(extractClerkError(err, 'Verification failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Back to step 1 ─────────────────────────────────────────────────────────

  const handleBack = () => {
    setStep('register')
    setCode('')
    setError('')
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    if (!signUp) return
    try {
      await signUp.sso({
        strategy: 'oauth_google',
        redirectUrl: '/onboarding',
        redirectCallbackUrl: '/sign-up/sso-callback',
      })
    } catch (err: unknown) {
      setError(extractClerkError(err, 'Google sign up failed.'))
    }
  }

  // ── Render: Step 1 ─────────────────────────────────────────────────────────

  if (step === 'register') {
    return (
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h2
          className="wf-serif"
          style={{ color: C.forest, fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}
        >
          Create your account
        </h2>
        <p style={{ color: 'rgba(26,26,26,0.55)', fontSize: '14px', marginBottom: '28px' }}>
          Set up Wedflow for your wedding day.
        </p>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={!isReady || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '14px',
            borderRadius: '24px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            color: C.text,
            fontSize: '14px',
            fontWeight: 500,
            cursor: isReady && !loading ? 'pointer' : 'not-allowed',
            marginBottom: '20px',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ color: 'rgba(26,26,26,0.4)', fontSize: '13px' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="signup-email" style={labelStyle}>Email address</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="signup-password" style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(26,26,26,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={!isReady || loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: C.terracotta,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isReady && !loading ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.75 : 1,
              marginTop: '4px',
            }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ color: 'rgba(26,26,26,0.55)', fontSize: '14px', textAlign: 'center', marginTop: '24px' }}>
          Already have an account?{' '}
          <Link href="/sign-in" style={{ color: C.forest, fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  // ── Render: Step 2 (OTP) ───────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(26,26,26,0.5)',
          fontSize: '13px',
          padding: 0,
          marginBottom: '24px',
        }}
      >
        <BackArrowIcon />
        Back
      </button>

      <h2
        className="wf-serif"
        style={{ color: C.forest, fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}
      >
        Check your inbox
      </h2>
      <p style={{ color: 'rgba(26,26,26,0.55)', fontSize: '14px', marginBottom: '28px' }}>
        We sent a 6-digit code to{' '}
        <span style={{ color: C.forest, fontWeight: 500 }}>{email}</span>.
      </p>

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="otp-code" style={labelStyle}>Verification code</label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            required
            placeholder="000000"
            style={{
              ...inputStyle,
              letterSpacing: '0.25em',
              fontSize: '20px',
              textAlign: 'center',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={!isReady || loading || code.length < 6}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '24px',
            border: 'none',
            backgroundColor: C.terracotta,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isReady && !loading && code.length === 6 ? 'pointer' : 'not-allowed',
            opacity: loading || code.length < 6 ? 0.75 : 1,
            marginTop: '4px',
          }}
        >
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
      </form>
    </div>
  )
}
