import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { updatePartnerEmailAction } from '../actions'
import type { Couple } from '../types'

interface SettingsViewProps {
  couple: Couple
  onPartnerEmailUpdate: (email: string) => void
}

export function SettingsView({ couple, onPartnerEmailUpdate }: SettingsViewProps) {
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState(couple.partner_email ?? '')
  const [localPartnerEmail, setLocalPartnerEmail] = useState(couple.partner_email ?? '')
  const [isSavingEmail, startSaveEmail] = useTransition()

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

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <span className="wf-eyebrow">Settings</span>
        <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Shape how <em style={{ fontWeight: 500 }}>your concierge behaves.</em>
        </h1>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>Account, notifications, and billing.</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, padding: '16px 22px', borderBottom: '1px solid var(--wf-line)', alignItems: 'center' }}>
            <div>
              <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Account email</div>
              <div className="wf-sans" style={{ fontSize: 11.5, color: 'var(--wf-ink-45)', marginTop: 3 }}>Managed by Clerk — edit in your account settings</div>
            </div>
            <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-60)' }}>{couple.email}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, padding: '16px 22px', alignItems: 'center' }}>
            <div>
              <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>Partner email</div>
              <div className="wf-sans" style={{ fontSize: 11.5, color: 'var(--wf-ink-45)', marginTop: 3 }}>For notifications and shared access</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {editingEmail ? (
                <>
                  <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder="partner@example.com" className="wf-sans" style={{ fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 12px', outline: 'none', fontFamily: 'var(--wf-sans)' }} />
                  <button onClick={handleSaveEmail} disabled={isSavingEmail} className="wf-btn wf-btn-forest wf-btn-sm">
                    {isSavingEmail ? 'Saving…' : 'Save'}
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
