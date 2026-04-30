import { useState } from 'react'
import { Icon } from './Icon'

export function ReplyModal({ inboundBody, initialDraft, onClose, onSend, isSending }: {
  inboundBody: string; initialDraft: string; onClose: () => void; onSend: (text: string) => void; isSending: boolean
}) {
  const TRIAL_CHAR_LIMIT = 120
  const [text, setText] = useState(initialDraft)
  const charCount = text.length
  const isOverLimit = charCount > TRIAL_CHAR_LIMIT

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: 'var(--wf-paper)', borderRadius: 20, boxShadow: 'var(--wf-shadow-xl)', width: '100%', maxWidth: 520 }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--wf-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="wf-serif" style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--wf-forest)' }}>Reply to guest</h3>
          <button onClick={onClose} disabled={isSending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wf-ink-45)', padding: 4, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, marginBottom: 8 }}>Guest&apos;s message</div>
            <p className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink)', background: 'var(--wf-cream-warm)', borderRadius: 10, padding: '12px 14px', margin: 0, lineHeight: 1.55 }}>
              {inboundBody}
            </p>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600, marginBottom: 8 }}>Your reply</div>
            <div style={{ border: '1px solid var(--wf-line-strong)', borderRadius: 12, padding: '12px 14px 8px' }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} disabled={isSending} className="wf-sans" style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: 'var(--wf-ink)', fontFamily: 'var(--wf-sans)', lineHeight: 1.55, background: 'transparent' }} placeholder="Type your reply…" />
              <div style={{ textAlign: 'right', fontSize: 11, color: isOverLimit ? 'var(--wf-rose)' : 'var(--wf-ink-45)', marginTop: 4 }}>
                {isOverLimit
                  ? `Replies are limited to ${TRIAL_CHAR_LIMIT} characters during the trial period (${charCount} / ${TRIAL_CHAR_LIMIT})`
                  : `${charCount} / ${TRIAL_CHAR_LIMIT}`}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={isSending} className="wf-btn wf-btn-ghost">Cancel</button>
          <button onClick={() => onSend(text)} disabled={isSending || !text.trim() || isOverLimit} className="wf-btn wf-btn-primary">
            <Icon name="send" size={13} /> {isSending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
