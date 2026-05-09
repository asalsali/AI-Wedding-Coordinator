'use client'

import { useState } from 'react'
import { Icon } from '@/app/dashboard/components/Icon'

interface ReferralLinkCardProps {
  referralCode: string
  referralUrl: string
  compact?: boolean
}

export function ReferralLinkCard({ referralCode, referralUrl, compact = false }: ReferralLinkCardProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  if (compact) {
    return (
      <div style={{
        background: 'var(--wf-forest)',
        borderRadius: 18,
        padding: '20px 24px',
        color: 'var(--wf-cream)',
      }}>
        <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-cream-ink-50)', fontWeight: 600, marginBottom: 10 }}>
          Your referral link
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1,
            background: 'rgba(253,251,247,0.08)',
            border: '1px solid rgba(253,251,247,0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            fontFamily: 'var(--wf-sans)',
            color: 'var(--wf-cream)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {referralUrl}
          </div>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              background: 'var(--wf-cream)',
              color: 'var(--wf-forest)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--wf-sans)',
              flexShrink: 0,
            }}
          >
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--wf-forest)',
      borderRadius: 28,
      padding: '44px 48px',
      color: 'var(--wf-cream)',
      boxShadow: 'var(--wf-shadow-lg)',
    }}>
      <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-cream-ink-50)', fontWeight: 600 }}>
        Your referral code
      </span>
      <div className="wf-serif" style={{
        fontSize: 48,
        fontWeight: 500,
        color: 'var(--wf-cream)',
        marginTop: 14,
        marginBottom: 8,
        letterSpacing: '0.08em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {referralCode}
      </div>

      <div className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-cream-ink-50)', fontWeight: 600, marginTop: 32, marginBottom: 10 }}>
        Shareable link
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1,
          background: 'rgba(253,251,247,0.08)',
          border: '1px solid rgba(253,251,247,0.15)',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 14,
          fontFamily: 'var(--wf-sans)',
          color: 'var(--wf-cream)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {referralUrl}
        </div>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '12px 20px',
            background: 'var(--wf-cream)',
            color: 'var(--wf-forest)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--wf-sans)',
            flexShrink: 0,
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} size={16} />
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-cream-ink)', marginTop: 24, lineHeight: 1.6 }}>
        Share this link with couples you work with. When they sign up through your link, they will automatically appear in your dashboard.
      </p>
    </div>
  )
}
