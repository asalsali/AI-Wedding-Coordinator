'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Icon } from '@/app/dashboard/components/Icon'
import type { Partner } from '@/types'

export type PartnerView = 'overview' | 'couples' | 'referral' | 'officiants' | 'settings'

interface PartnerSidebarProps {
  partner: Partner
  currentView: PartnerView
  onNavigate: (view: PartnerView) => void
  onSignOut: () => void
}

export function PartnerSidebar({ partner, currentView, onNavigate, onSignOut }: PartnerSidebarProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches)
      if (!e.matches) setSidebarOpen(false)
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const handleNavClick = useCallback((view: PartnerView) => {
    onNavigate(view)
    if (isMobile) setSidebarOpen(false)
  }, [isMobile, onNavigate])

  const partnerTypeLabel = partner.partner_type.charAt(0).toUpperCase() + partner.partner_type.slice(1)
  const initials = partner.organization_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')

  const navItems: { id: PartnerView; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'home' },
    { id: 'couples', label: 'Couples', icon: 'users' },
    { id: 'referral', label: 'Referral Link', icon: 'external' },
    ...(partner.partner_type === 'church' ? [{ id: 'officiants' as PartnerView, label: 'Officiants', icon: 'heart' }] : []),
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]

  const sidebarContent = (
    <>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 28px' }}>
        <div style={{ width: 104, height: 104, borderRadius: '22%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Image src="/LogoDark.png" alt="Wedflow" width={168} height={168} style={{ width: 168, height: 168, objectFit: 'contain', flexShrink: 0 }} />
        </div>
        <span className="wf-serif" style={{ fontSize: 20, fontWeight: 600 }}>Wedflow</span>
      </div>

      {/* Partner card */}
      <div style={{ background: 'rgba(253,251,247,0.06)', border: '1px solid rgba(253,251,247,0.1)', borderRadius: 14, padding: '14px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--wf-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--wf-serif)', fontWeight: 600, fontSize: 14, color: 'var(--wf-cream)' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--wf-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partner.organization_name}
          </div>
          <div className="wf-sans" style={{ fontSize: 11, color: 'var(--wf-cream-ink-50)' }}>
            {partnerTypeLabel} Partner
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((n) => {
          const active = currentView === n.id
          return (
            <button
              key={n.id}
              onClick={() => handleNavClick(n.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                background: active ? 'var(--wf-cream)' : 'transparent',
                color: active ? 'var(--wf-forest)' : 'var(--wf-cream-ink)',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--wf-sans)',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(253,251,247,0.06)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon name={n.icon} size={17} />
              <span style={{ flex: 1 }}>{n.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer: sign out */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={onSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            color: 'var(--wf-cream-ink-50)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'var(--wf-sans)',
          }}
        >
          <Icon name="signOut" size={15} /> Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--wf-forest)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--wf-cream)',
              cursor: 'pointer',
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-cream)' }}>Wedflow</span>
          <div style={{ width: 30 }} />
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 50,
            }}
          />
          <aside style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 280,
            background: 'var(--wf-forest)',
            color: 'var(--wf-cream)',
            padding: '28px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 51,
            overflowY: 'auto',
          }}>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{
          background: 'var(--wf-forest)',
          color: 'var(--wf-cream)',
          padding: '28px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}>
          {sidebarContent}
        </aside>
      )}
    </>
  )
}
