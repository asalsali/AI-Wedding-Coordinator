'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

function friendlyError(msg: string): string {
  if (msg.includes('User already registered')) return 'An account with this email already exists. Try signing in.'
  if (msg.includes('Password should be')) return 'Password must be at least 6 characters.'
  if (msg.includes('Unable to validate email')) return 'Please enter a valid email address.'
  if (msg.includes('Too many requests')) return 'Too many attempts. Please wait a moment and try again.'
  return msg
}

function EyeOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function SignUpForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/auth/callback` },
      })

      if (signUpError) {
        setError(friendlyError(signUpError.message))
        return
      }

      if (data.session) {
        // Email confirmation disabled — signed in immediately
        router.refresh()
        router.push('/onboarding')
      } else {
        // Email confirmation required
        setCheckEmail(true)
      }
    } catch {
      setError('Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (googleLoading) return
    setError('')
    setGoogleLoading(true)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${appUrl}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (oauthError) setError(friendlyError(oauthError.message))
    } catch {
      setError('Google sign up failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--wf-cream)' }}>
          <CheckIcon />
        </div>
        <h1 className="wf-serif" style={{ fontSize: 32, color: 'var(--wf-forest)', margin: '0 0 12px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          Check your inbox.
        </h1>
        <p className="wf-sans" style={{ fontSize: 15, color: 'var(--wf-ink-60)', lineHeight: 1.6, marginBottom: 32 }}>
          We sent a confirmation link to <strong style={{ color: 'var(--wf-ink)' }}>{email}</strong>. Click it to activate your account and get started.
        </p>
        <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-45)' }}>
          Wrong email?{' '}
          <button onClick={() => setCheckEmail(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-forest)', fontWeight: 600, fontSize: 13, padding: 0, fontFamily: 'var(--wf-sans)' }}>
            Go back
          </button>
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <h1 className="wf-serif" style={{ fontSize: 40, color: 'var(--wf-forest)', margin: '0 0 10px', fontWeight: 600, letterSpacing: '-0.02em' }}>
        Begin <em style={{ fontWeight: 500 }}>your journey.</em>
      </h1>
      <p className="wf-sans" style={{ fontSize: 15, color: 'var(--wf-ink-60)', marginBottom: 32 }}>
        Create your concierge account.
      </p>

      <button type="button" onClick={handleGoogle} disabled={loading || googleLoading} className="wf-btn wf-btn-light wf-btn-lg" style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }}>
        <GoogleIcon /> Continue with Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--wf-line)' }} />
        <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-ink-45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>or with email</span>
        <span style={{ flex: 1, height: 1, background: 'var(--wf-line)' }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthField label="Email address" id="signup-email">
          <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="wf-sans" style={fieldInputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </AuthField>

        <AuthField label="Password" id="signup-password">
          <div style={{ position: 'relative' }}>
            <input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="wf-sans" style={{ ...fieldInputStyle, paddingRight: 44 }} onFocus={focusStyle} onBlur={blurStyle} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', display: 'flex', alignItems: 'center', padding: 4 }}>
              {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
        </AuthField>

        <AuthField label="Confirm password" id="signup-confirm">
          <input id="signup-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="wf-sans" style={fieldInputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </AuthField>

        {error && (
          <p className="wf-sans" style={{ color: 'var(--wf-rose)', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <button type="submit" disabled={loading} className="wf-btn wf-btn-primary wf-btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      <p className="wf-sans" style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'var(--wf-ink-60)' }}>
        Already have an account?{' '}
        <Link href="/sign-in" style={{ color: 'var(--wf-forest)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  )
}

function AuthField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="wf-sans" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--wf-forest)', marginBottom: 6, letterSpacing: '0.02em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid var(--wf-line-strong)',
  borderRadius: 10,
  background: 'var(--wf-paper)',
  fontFamily: 'var(--wf-sans)',
  fontSize: 14,
  color: 'var(--wf-ink)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
}

function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--wf-forest)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(28,59,43,0.1)'
}

function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--wf-line-strong)'
  e.currentTarget.style.boxShadow = 'none'
}
