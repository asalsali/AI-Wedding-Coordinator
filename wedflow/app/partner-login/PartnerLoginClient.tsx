'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Step = 'email' | 'link-sent'

const supabase = createClient()

export default function PartnerLoginClient() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendLink(e: React.FormEvent) {
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
            onClick={() => {
              setError('')
              handleSendLink({ preventDefault: () => {} } as React.FormEvent)
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
        onSubmit={handleSendLink}
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

function friendlyError(msg: string): string {
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
