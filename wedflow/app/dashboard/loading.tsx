export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FDFBF7' }}>
      {/* Sidebar skeleton */}
      <aside style={{ width: 260, flexShrink: 0, background: '#1C3B2B', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 24, borderBottom: '1px solid rgba(253,251,247,0.08)' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(253,251,247,0.1)', borderRadius: 10, animation: 'pulse 1.8s ease-in-out infinite' }} />
        </div>
        <nav style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 40, background: 'rgba(253,251,247,0.06)', borderRadius: 10, animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(253,251,247,0.08)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 16, background: 'rgba(253,251,247,0.06)', borderRadius: 4, animation: 'pulse 1.8s ease-in-out infinite', width: '75%' }} />
          <div style={{ height: 32, background: 'rgba(253,251,247,0.06)', borderRadius: 8, animation: 'pulse 1.8s ease-in-out infinite' }} />
        </div>
      </aside>

      {/* Main content skeleton */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ height: 40, background: '#e8e4df', borderRadius: 12, animation: 'pulse 1.8s ease-in-out infinite', width: 288 }} />
          <div style={{ height: 256, background: '#e8e4df', borderRadius: 16, animation: 'pulse 1.8s ease-in-out infinite', animationDelay: '0.15s' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 112, background: '#e8e4df', borderRadius: 12, animation: 'pulse 1.8s ease-in-out infinite', animationDelay: `${0.2 + i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
