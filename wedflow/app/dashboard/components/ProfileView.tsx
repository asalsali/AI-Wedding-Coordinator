import { useState, useTransition } from 'react'
import { Icon } from './Icon'
import { ProfileField } from './ProfileField'
import { ProfileSectionHeader } from './ProfileSectionHeader'
import { updateWeddingProfileField } from '../actions'
import type { Profile } from '../types'
import { buildProfileUpdate, applyProfileUpdate } from '../types'

interface ProfileViewProps {
  profile: Profile
  phoneNumber: string | null
  onProfileUpdate: (updater: (prev: Profile) => Profile) => void
  isMobile?: boolean
  plan?: string | null
}

export function ProfileView({ profile, phoneNumber, onProfileUpdate, isMobile = false, plan = null }: ProfileViewProps) {
  const [editField, setEditField] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState<string>('')
  const [isSaving, startSave] = useTransition()
  const [copied, setCopied] = useState(false)

  function handleEditField(field: string, value: string) { setEditField(field); setDraftValue(value) }

  function handleSaveField(field: string) {
    const updates = buildProfileUpdate(field, draftValue)
    startSave(async () => {
      try {
        await updateWeddingProfileField(updates)
        onProfileUpdate((prev) => applyProfileUpdate(prev, field, draftValue))
        setEditField(null)
      } catch { /* keep edit state */ }
    })
  }

  const fieldProps = {
    profile, editField, draftValue, saving: isSaving,
    onEdit: handleEditField, onSave: handleSaveField, onCancel: () => setEditField(null), onDraftChange: setDraftValue,
  }

  const phoneFormatted = phoneNumber ? phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4') : null

  const gridColumns = isMobile ? '1fr' : 'repeat(3, 1fr)'

  return (
    <div style={{ padding: isMobile ? '24px 16px 60px' : '40px 48px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: isMobile ? 24 : 32 }}>
        <span className="wf-eyebrow">Wedding profile</span>
        <h1 className="wf-serif" style={{ fontSize: isMobile ? 'clamp(24px, 6vw, 32px)' : 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          The details your <em style={{ fontWeight: 500 }}>AI knows by heart.</em>
        </h1>
        <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: isMobile ? 14 : 15 }}>Edit anything — we&apos;ll retrain your concierge in seconds.</p>
      </div>

      {/* Phone + readiness */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 20, marginBottom: isMobile ? 20 : 28 }}>
        <div style={{ background: 'var(--wf-forest)', borderRadius: 20, padding: isMobile ? '22px 20px' : '28px 32px', color: 'var(--wf-cream)' }}>
          <span className="wf-eyebrow wf-eyebrow-forest">Your Wedflow number</span>
          <div className="wf-serif" style={{ fontSize: isMobile ? 28 : 42, fontWeight: 500, marginTop: 14, marginBottom: 8, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
            {phoneFormatted || 'Not yet assigned'}
          </div>
          {phoneFormatted && (
            <button onClick={() => {
              navigator.clipboard.writeText(phoneNumber!).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }).catch(() => {
                setCopied(false)
              })
            }} className="wf-btn wf-btn-sm" style={{ background: 'rgba(253,251,247,0.12)', color: 'var(--wf-cream)', border: '1px solid rgba(253,251,247,0.2)' }}>
              <Icon name={copied ? 'check' : 'copy'} size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 20, padding: isMobile ? '22px 20px' : '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="wf-eyebrow">Readiness</span>
            <span className="wf-serif" style={{ fontSize: isMobile ? 26 : 32, fontWeight: 600, color: 'var(--wf-forest)' }}>{profile.readiness_score}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--wf-cream-warm)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${profile.readiness_score}%`, height: '100%', background: `linear-gradient(90deg, var(--wf-terracotta), #d18860)`, transition: 'width 0.5s' }} />
          </div>
          <p className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-60)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: profile.is_active ? '#6ea260' : 'var(--wf-ink-25)' }} />
            {profile.is_active ? 'Active and responding — no missing details.' : 'Not yet active.'}
          </p>
        </div>
      </div>

      {/* Venue & Date */}
      <ProfileSectionHeader icon="mapPin" title="Venue & date" />
      <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 12, marginBottom: isMobile ? 20 : 28 }}>
        <ProfileField label="Venue name" field="venue_name" {...fieldProps} />
        <ProfileField label="Venue address" field="venue_address" {...fieldProps} />
        <ProfileField label="Wedding date" field="wedding_date" {...fieldProps} />
        <ProfileField label="Ceremony time" field="ceremony_time" {...fieldProps} />
        <ProfileField label="Reception time" field="reception_time" {...fieldProps} />
        <ProfileField label="Parking info" field="parking_info" {...fieldProps} />
      </div>

      {/* Guest info */}
      <ProfileSectionHeader icon="users" title="Guest information" />
      <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 12, marginBottom: isMobile ? 20 : 28 }}>
        <ProfileField label="Dress code" field="dress_code" {...fieldProps} />
        <ProfileField label="Hotel block" field="hotel_block" {...fieldProps} />
        <ProfileField label="Registry links (one per line)" field="registry_links" {...fieldProps} />
      </div>

      {/* Tone & Voice */}
      <ProfileSectionHeader icon="sparkle" title="Tone & voice" />
      {plan === 'concierge' ? (
        <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 12 }}>
          <ProfileField label="Tone style" field="tone" {...fieldProps} />
          <ProfileField label="Vibe word" field="vibe_word" {...fieldProps} />
          <div style={{ gridColumn: isMobile ? 'span 1' : 'span 3' }}>
            <ProfileField label="Sample message (for AI calibration)" field="sample_message" {...fieldProps} />
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 20px', background: 'var(--wf-sand)', border: '1px solid var(--wf-line)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="wf-sans" style={{ fontSize: 13, fontWeight: 500, color: 'var(--wf-forest)' }}>
              Custom tone tuning is a Concierge feature
            </div>
            <div className="wf-sans" style={{ fontSize: 12, color: 'var(--wf-ink-45)', marginTop: 2 }}>
              Your AI uses the default {profile.tone ?? 'warm'} tone. Upgrade to fine-tune your voice with vibe words and sample messages.
            </div>
          </div>
          <a href="/pricing" className="wf-btn wf-btn-forest wf-btn-sm" style={{ whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0 }}>Upgrade</a>
        </div>
      )}
    </div>
  )
}
