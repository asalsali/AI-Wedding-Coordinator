import { Icon } from './Icon'

export function ProfileSectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(196,113,74,0.12)', color: 'var(--wf-terracotta-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={15} />
      </div>
      <h2 className="wf-serif" style={{ fontSize: 22, color: 'var(--wf-forest)', fontWeight: 600, margin: 0 }}>{title}</h2>
      <span style={{ flex: 1, height: 1, background: 'var(--wf-line)', marginLeft: 12 }} />
    </div>
  )
}
