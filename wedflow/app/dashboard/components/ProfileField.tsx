import { Icon } from './Icon'
import type { Profile } from '../types'
import { getFieldDraftValue, TEXTAREA_FIELDS, DATE_FIELDS, TIME_FIELDS, SELECT_FIELDS } from '../types'

export function ProfileField({
  label, field, profile, editField, draftValue, saving, onEdit, onSave, onCancel, onDraftChange,
}: {
  label: string; field: string; profile: Profile; editField: string | null; draftValue: string; saving: boolean
  onEdit: (field: string, value: string) => void; onSave: (field: string) => void; onCancel: () => void; onDraftChange: (value: string) => void
}) {
  const isEditing = editField === field
  const currentDisplay = getFieldDraftValue(profile, field)

  return (
    <div
      style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 14, padding: '14px 18px', position: 'relative', transition: 'all 0.15s', cursor: 'pointer' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--wf-line-strong)' }}
      onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.borderColor = 'var(--wf-line)' }}
    >
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SELECT_FIELDS.has(field) ? (
            <select value={draftValue} onChange={(e) => onDraftChange(e.target.value)} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 10px', outline: 'none', fontFamily: 'var(--wf-sans)' }}>
              <option value="">— none —</option>
              <option value="warm">Warm</option>
              <option value="elegant">Elegant</option>
              <option value="playful">Playful</option>
            </select>
          ) : TEXTAREA_FIELDS.has(field) ? (
            <textarea value={draftValue} onChange={(e) => onDraftChange(e.target.value)} rows={field === 'registry_links' ? 3 : 2} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 10px', outline: 'none', resize: 'none', fontFamily: 'var(--wf-sans)' }} placeholder={field === 'registry_links' ? 'One URL per line' : ''} />
          ) : (
            <input type={DATE_FIELDS.has(field) ? 'date' : TIME_FIELDS.has(field) ? 'time' : 'text'} value={draftValue} onChange={(e) => onDraftChange(e.target.value)} className="wf-sans" style={{ width: '100%', fontSize: 13, border: '1px solid var(--wf-line-strong)', borderRadius: 8, padding: '8px 10px', outline: 'none', fontFamily: 'var(--wf-sans)' }} />
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => onSave(field)} disabled={saving} className="wf-btn wf-btn-forest wf-btn-sm">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={onCancel} disabled={saving} className="wf-btn wf-btn-ghost wf-btn-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="wf-sans" style={{ fontSize: 13, color: currentDisplay ? 'var(--wf-ink)' : 'var(--wf-ink-25)', fontStyle: currentDisplay ? 'normal' : 'italic', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingRight: 28 }}>
            {currentDisplay || 'Not set'}
          </p>
          <button onClick={() => onEdit(field, currentDisplay)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--wf-cream-warm)'; e.currentTarget.style.color = 'var(--wf-forest)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--wf-ink-45)' }}>
            <Icon name="edit" size={13} />
          </button>
        </>
      )}
    </div>
  )
}
