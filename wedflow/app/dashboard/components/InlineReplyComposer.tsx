import { useState, useEffect, useRef } from 'react'
import { Icon } from './Icon'

export function InlineReplyComposer({ onSend, isSending, initialText, onClearInitial }: {
  onSend: (text: string) => void
  isSending: boolean
  initialText: string
  onClearInitial: () => void
}) {
  const TRIAL_CHAR_LIMIT = 120
  const [replyText, setReplyText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const charCount = replyText.length
  const isOverLimit = charCount > TRIAL_CHAR_LIMIT

  useEffect(() => {
    if (initialText) {
      setReplyText(initialText)
      onClearInitial()
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [initialText])

  return (
    <div style={{ borderTop: '1px solid var(--wf-line)', background: 'var(--wf-cream)', padding: '14px 28px 18px', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, border: '1px solid var(--wf-line-strong)', borderRadius: 14, padding: '10px 14px 6px', background: 'var(--wf-paper)', transition: 'border-color 0.15s' }}>
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            disabled={isSending}
            className="wf-sans"
            style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 13.5, color: 'var(--wf-ink)', fontFamily: 'var(--wf-sans)', lineHeight: 1.55, background: 'transparent' }}
            placeholder="Type a reply to this guest..."
          />
          <div style={{ textAlign: 'right', marginTop: 2 }}>
            <span className="wf-sans" style={{ fontSize: 10, color: isOverLimit ? 'var(--wf-rose)' : 'var(--wf-ink-25)' }}>
              {isOverLimit
                ? `Replies are limited to ${TRIAL_CHAR_LIMIT} characters during the trial period (${charCount} / ${TRIAL_CHAR_LIMIT})`
                : charCount > 0 ? `${charCount} / ${TRIAL_CHAR_LIMIT}` : ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => { onSend(replyText); setReplyText('') }}
          disabled={isSending || !replyText.trim() || isOverLimit}
          className="wf-btn wf-btn-primary"
          style={{ height: 44, paddingLeft: 18, paddingRight: 18, borderRadius: 14, flexShrink: 0 }}
        >
          <Icon name="send" size={14} /> {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
