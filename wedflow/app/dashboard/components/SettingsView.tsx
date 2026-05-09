import { useState, useEffect, useTransition } from 'react'
import { Icon } from './Icon'
import { updatePartnerEmailAction } from '../actions'
import type { Couple } from '../types'

const PLAN_DETAILS: Record<string, { name: string; price: number; description: string }> = {
  starter: { name: 'Starter', price: 29, description: 'Dedicated number with AI auto-replies' },
  essential: { name: 'Essential', price: 49, description: 'Escalation drafts, unlimited messages, partner access' },
  concierge: { name: 'Concierge', price: 79, description: 'White-glove experience with priority support' },
}

interface SettingsViewProps {
  couple: Couple
  onPartnerEmailUpdate: (email: string) => void
}

export function SettingsView({ couple, onPartnerEmailUpdate }: SettingsViewProps) {
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(couple.partner_email ?? '')
  const [localPartnerEmail, setLocalPartnerEmail] = useState(couple.partner_email ?? '')
  const [isSavingEmail, startSaveEmail] = useTransition()
  const [isMobile, setIsMobile] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  function handleSaveEmail() {
    startSaveEmail(async () => {
      try {
        await updatePartnerEmailAction(emailDraft)
        setLocalPartnerEmail(emailDraft)
        onPartnerEmailUpdate(emailDraft)
        setEditingEmail(false)
      } catch { /* keep edit state */ }
    })
  }

  async function handleManageSubscription() {
    setIsLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Failed to open billing portal')
      }
      window.location.href = data.url
    } catch (err) {
      console.error('Portal error:', err instanceof Error ? err.message : String(err))
      setIsLoadingPortal(false)
    }
  }

  const currentPlan = couple.plan && PLAN_DETAILS[couple.plan] ? PLAN_DETAILS[couple.plan] : null
  const hasSubscription = couple.subscription_status === 'active' || couple.subscription_status === 'trialing'
  const isCanceled = couple.subscription_status === 'canceled'

  return (
    <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: isMobile ? 24 : 32 }}>
        <span className="wf-eyebrow">Settings</span>
        <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Shape how <em style={{ fontWeight: 500 }}>your concierge behaves.</em>
        </h1>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>Account, notifications, and billing.</p>
      </div>

      {/* Plan & Billing */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(28,59,43,0.1)', color: 'var(--wf-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="barChart" size={14} />
          </div>
          <h2 className="wf-serif" style={{ fontSize: 20, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Plan & billing</h2>
        </div>
        <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Current plan row */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 20, padding: isMobile ? '16px 16px' : '18px 22px', borderBottom: '1px solid var(--wf-line)', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Current plan</div>
              {currentPlan ? (
                <div style={{ marginTop: 4 }}>
                  <span className="wf-sans" style={{ fontSize: 15, fontWeight: 600, color: 'var(--wf-forest)' }}>
                    {currentPlan.name}
                  </span>
                  <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-45)', marginLeft: 8 }}>
                    ${currentPlan.price}/mo
                  </span>
                  {isCanceled && (
                    <span className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-rose)', marginLeft: 8, fontWeight: 500 }}>
                      Canceled
                    </span>
                  )}
                  <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginTop: 2 }}>
                    {currentPlan.description}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 4 }}>
                  <span className="wf-sans" style={{ fontSize: 15, fontWeight: 600, color: 'var(--wf-ink-45)' }}>
                    No plan selected
                  </span>
                  <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginTop: 2 }}>
                    Choose a plan to unlock your wedding concierge.
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {hasSubscription ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="wf-btn wf-btn-forest wf-btn-sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isLoadingPortal ? 'Loading...' : 'Manage subscription'}
                </button>
              ) : (
                <a
                  href="/pricing"
                  className="wf-btn wf-btn-forest wf-btn-sm"
                  style={{ whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  {currentPlan ? 'Resubscribe' : 'Choose a plan'}
                </a>
              )}
            </div>
          </div>

          {/* Plan features summary */}
          {currentPlan && (
            <div style={{ padding: isMobile ? '14px 16px' : '14px 22px', borderBottom: '1px solid var(--wf-line)' }}>
              <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)', marginBottom: 8 }}>What you get</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {getPlanFeatures(couple.plan!).map((feature) => (
                  <span
                    key={feature}
                    className="wf-sans"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--wf-forest)',
                      background: 'rgba(28,59,43,0.06)',
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Upgrade prompt for non-concierge */}
          {currentPlan && couple.plan !== 'concierge' && hasSubscription && (
            <div style={{ padding: isMobile ? '14px 16px' : '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)' }}>
                {couple.plan === 'starter'
                  ? 'Upgrade for escalation drafts, unlimited messages, and partner access.'
                  : 'Upgrade for full phone visibility, priority support, and custom tone tuning.'}
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="wf-btn wf-btn-light wf-btn-sm"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Upgrade
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(196,113,74,0.12)', color: 'var(--wf-terracotta-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="users" size={14} />
          </div>
          <h2 className="wf-serif" style={{ fontSize: 20, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>Your account</h2>
        </div>
        <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 20, padding: isMobile ? '14px 16px' : '16px 22px', borderBottom: '1px solid var(--wf-line)', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Account email</div>
              <div className="wf-sans" style={{ fontSize: 11.5, color: 'var(--wf-ink-45)', marginTop: 3 }}>Managed by Clerk — edit in your account settings</div>
            </div>
            <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)' }}>{couple.email}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 20, padding: isMobile ? '14px 16px' : '16px 22px', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Partner email</div>
              <div className="wf-sans" style={{ fontSize: 11.5, color: 'var(--wf-ink-45)', marginTop: 3 }}>For notifications and shared access</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {editingEmail ? (
                <>
                  <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="partner@example.com" className="wf-sans" style={{ fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontFamily: 'var(--wf-sans)' }} />
                  <button onClick={handleSaveEmail} disabled={isSavingEmail} className="wf-btn wf-btn-forest wf-btn-sm">
                    {isSavingEmail ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEmailDraft(localPartnerEmail); setEditingEmail(false) }} disabled={isSavingEmail} className="wf-btn wf-btn-ghost wf-btn-sm">Cancel</button>
                </>
              ) : (
                <>
                  <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', fontStyle: localPartnerEmail ? 'normal' : 'italic' }}>
                    {localPartnerEmail || 'Not set'}
                  </span>
                  <button onClick={() => { setEmailDraft(localPartnerEmail); setEditingEmail(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4 }}>
                    <Icon name="edit" size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ marginTop: 32, padding: '20px 24px', background: 'rgba(180,84,78,0.06)', border: '1px solid rgba(180,84,78,0.2)', borderRadius: 14 }}>
        <h3 className="wf-serif" style={{ color: 'var(--wf-rose)', margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>Danger zone</h3>
        <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)', margin: '0 0 12px' }}>
          Permanently removes your wedding profile and all guest messages. This can&apos;t be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button disabled className="wf-btn wf-btn-light wf-btn-sm" style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Coming soon">Delete all data</button>
        </div>
      </div>
    </div>
  )
}

function getPlanFeatures(planId: string): string[] {
  switch (planId) {
    case 'starter':
      return ['Dedicated number', 'AI auto-replies', '6 FAQ templates', 'Guest inbox', '200 msgs/mo']
    case 'essential':
      return ['Dedicated number', 'AI auto-replies', 'Unlimited FAQs', 'Escalation drafts', 'Partner access', 'Unlimited messages']
    case 'concierge':
      return ['Everything in Essential', 'Full phone visibility', 'Setup call', 'Priority support', 'Custom tone tuning']
    default:
      return []
  }
}
