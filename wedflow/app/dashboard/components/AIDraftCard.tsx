import { useState } from 'react'
import { Icon } from './Icon'
import type { MessageRow } from '../types'

interface CircleMemberOption {
  id: string
  name: string
  role: string
}

export function AIDraftCard({ draft, onSend, onEdit, onDismiss, onAssign, isSending, circleMembers }: {
  draft: MessageRow
  onSend: () => void
  onEdit: () => void
  onDismiss: () => void
  onAssign?: (memberId: string) => void
  isSending: boolean
  circleMembers?: CircleMemberOption[]
}) {
  const [showAssignMenu, setShowAssignMenu] = useState(false)

  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '85%', marginTop: -2 }}>
      <div style={{ border: '1.5px dashed rgba(196,113,74,0.4)', borderRadius: 14, padding: '12px 16px 10px', background: 'rgba(196,113,74,0.04)' }}>
        <div className="wf-sans" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--wf-terracotta-deep)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          <Icon name="sparkle" size={11} /> Suggested reply
        </div>
        <p className="wf-sans" style={{ fontSize: 13.5, color: 'var(--wf-ink)', lineHeight: 1.55, margin: '0 0 12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {draft.body}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={onSend} disabled={isSending} className="wf-btn wf-btn-primary wf-btn-sm" style={{ fontSize: 12, borderRadius: 10 }}>
            <Icon name="send" size={11} /> {isSending ? 'Sending...' : 'Send as-is'}
          </button>
          <button onClick={onEdit} disabled={isSending} className="wf-btn wf-btn-ghost wf-btn-sm" style={{ fontSize: 12, borderRadius: 10, color: 'var(--wf-forest)' }}>
            <Icon name="edit" size={11} /> Edit
          </button>
          {onAssign && circleMembers && circleMembers.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                disabled={isSending}
                className="wf-btn wf-btn-ghost wf-btn-sm"
                style={{ fontSize: 12, borderRadius: 10, color: 'var(--wf-terracotta-deep)' }}
              >
                <Icon name="users" size={11} /> Assign
              </button>
              {showAssignMenu && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 10, boxShadow: 'var(--wf-shadow-lg)', zIndex: 20, minWidth: 180, overflow: 'hidden' }}>
                  {circleMembers.map((m) => (
                    <button key={m.id} onClick={() => { onAssign(m.id); setShowAssignMenu(false) }} className="wf-sans" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--wf-forest)', fontFamily: 'var(--wf-sans)', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--wf-cream-warm)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                      {m.name} <span style={{ color: 'var(--wf-ink-45)', fontSize: 10 }}>({m.role})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={onDismiss} disabled={isSending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', fontSize: 11, fontFamily: 'var(--wf-sans)', padding: '4px 6px' }}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
