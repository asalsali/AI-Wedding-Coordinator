'use client'

import { useState, useEffect } from 'react'
import { PartnerSidebar } from './components/PartnerSidebar'
import { StatsCards } from './components/StatsCards'
import { ReferralsList } from './components/ReferralsList'
import { ReferralLinkCard } from './components/ReferralLinkCard'
import { CouplesTable } from './components/CouplesTable'
import { ChurchOfficiants } from './components/ChurchOfficiants'
import { PartnerMetricsDetail } from './components/PartnerMetricsDetail'
import type { Partner, PartnerReferral } from '@/types'
import type { PartnerStats, ChildPartnerWithStats } from '@/app/actions/partner-actions'
import type { PartnerPerformanceMetrics, PartnerRevenueAttribution } from '@/app/actions/partner-analytics-actions'
import type { PartnerView } from './components/PartnerSidebar'

interface PartnerDashboardClientProps {
  partner: Partner
  referrals: PartnerReferral[]
  stats: PartnerStats
  referralUrl: string
  childPartners: ChildPartnerWithStats[]
  performanceMetrics?: PartnerPerformanceMetrics
  revenueAttribution?: PartnerRevenueAttribution
}

export default function PartnerDashboardClient({
  partner,
  referrals,
  stats,
  referralUrl,
  childPartners,
  performanceMetrics,
  revenueAttribution,
}: PartnerDashboardClientProps) {
  const [view, setView] = useState<PartnerView>('overview')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  async function handleSignOut() {
    const { signOutAction } = await import('@/app/dashboard/actions')
    await signOutAction()
    window.location.href = '/'
  }

  const partnerTypeLabel = partner.partner_type.charAt(0).toUpperCase() + partner.partner_type.slice(1)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '260px 1fr',
      gridTemplateRows: isMobile ? 'auto 1fr' : '1fr',
      minHeight: '100vh',
      background: 'var(--wf-cream)',
    }}>
      <PartnerSidebar
        partner={partner}
        currentView={view}
        onNavigate={setView}
        onSignOut={handleSignOut}
      />

      <main style={{ overflow: 'auto', minHeight: 0 }}>
        {/* Overview */}
        {view === 'overview' && (
          <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 1080, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
                Partner Dashboard
              </span>
              <h1 className="wf-serif" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 6px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Welcome, <em style={{ fontWeight: 500 }}>{partner.contact_name}.</em>
              </h1>
              <p className="wf-sans" style={{ color: 'var(--wf-ink-60)', fontSize: 15 }}>
                {partner.organization_name} {partnerTypeLabel !== partner.organization_name ? `\u00B7 ${partnerTypeLabel}` : ''}
              </p>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <StatsCards stats={stats} isMobile={isMobile} />
            </div>

            {/* Performance Analytics */}
            {performanceMetrics && revenueAttribution && (
              <div style={{ marginBottom: isMobile ? 24 : 32 }}>
                <PartnerMetricsDetail metrics={performanceMetrics} revenue={revenueAttribution} isMobile={isMobile} />
              </div>
            )}

            {/* Referral link (compact) */}
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <ReferralLinkCard referralCode={partner.referral_code} referralUrl={referralUrl} compact />
            </div>

            {/* Recent referrals */}
            <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 18, padding: isMobile ? '20px 16px' : '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-forest)' }}>
                  Recent Referrals
                </h2>
                {referrals.length > 5 && (
                  <button
                    onClick={() => setView('couples')}
                    className="wf-sans"
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--wf-forest)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    View all
                  </button>
                )}
              </div>
              <ReferralsList referrals={referrals} limit={5} isMobile={isMobile} />
            </div>

            {/* Church: officiant summary */}
            {partner.partner_type === 'church' && childPartners.length > 0 && (
              <div style={{ marginTop: isMobile ? 24 : 32, background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 18, padding: isMobile ? '20px 16px' : '24px 28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-forest)' }}>
                    Your Officiants
                  </h2>
                  <button
                    onClick={() => setView('officiants')}
                    className="wf-sans"
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--wf-forest)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                  >
                    View all
                  </button>
                </div>
                <div className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-ink-60)' }}>
                  {childPartners.length} officiant{childPartners.length !== 1 ? 's' : ''} linked to your church, with {childPartners.reduce((s, c) => s + c.totalReferrals, 0)} total referrals.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Couples */}
        {view === 'couples' && (
          <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 1080, margin: '0 auto' }}>
            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
              <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
                Partner Dashboard
              </span>
              <h1 className="wf-serif" style={{ fontSize: 'clamp(24px, 3vw, 34px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Referred Couples
              </h1>
            </div>
            <CouplesTable referrals={referrals} />
          </div>
        )}

        {/* Referral Link */}
        {view === 'referral' && (
          <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
                Partner Dashboard
              </span>
              <h1 className="wf-serif" style={{ fontSize: 'clamp(24px, 3vw, 34px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Your Referral Link
              </h1>
            </div>
            <ReferralLinkCard referralCode={partner.referral_code} referralUrl={referralUrl} />

            {/* Referral stats */}
            <div style={{ marginTop: isMobile ? 24 : 32 }}>
              <StatsCards stats={stats} isMobile={isMobile} />
            </div>
          </div>
        )}

        {/* Officiants (church only) */}
        {view === 'officiants' && partner.partner_type === 'church' && (
          <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 1080, margin: '0 auto' }}>
            <div style={{ marginBottom: isMobile ? 20 : 28 }}>
              <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
                Partner Dashboard
              </span>
              <h1 className="wf-serif" style={{ fontSize: 'clamp(24px, 3vw, 34px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Your Officiants
              </h1>
            </div>
            <ChurchOfficiants children={childPartners} isMobile={isMobile} />
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div style={{ padding: isMobile ? '24px 16px 80px' : '40px 48px 80px', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
              <span className="wf-sans" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--wf-ink-45)', fontWeight: 600 }}>
                Partner Dashboard
              </span>
              <h1 className="wf-serif" style={{ fontSize: 'clamp(24px, 3vw, 34px)', color: 'var(--wf-forest)', fontWeight: 600, margin: '14px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Settings
              </h1>
            </div>

            <div style={{ background: 'var(--wf-paper)', border: '1px solid var(--wf-line)', borderRadius: 18, padding: isMobile ? '20px 16px' : '28px 32px' }}>
              <h2 className="wf-serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--wf-forest)', marginBottom: 20 }}>
                Account Information
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SettingsRow label="Organization" value={partner.organization_name} />
                <SettingsRow label="Contact name" value={partner.contact_name} />
                <SettingsRow label="Email" value={partner.contact_email} />
                <SettingsRow label="Phone" value={partner.phone ?? '--'} />
                <SettingsRow label="Website" value={partner.website ?? '--'} />
                <SettingsRow label="Partner type" value={partnerTypeLabel} />
                <SettingsRow label="Referral code" value={partner.referral_code} />
                <SettingsRow label="Status" value={partner.status.charAt(0).toUpperCase() + partner.status.slice(1)} />
                {partner.approved_at && (
                  <SettingsRow label="Approved" value={new Date(partner.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid var(--wf-line)' }}>
      <span className="wf-sans" style={{ fontSize: 13, color: 'var(--wf-ink-45)', fontWeight: 500 }}>{label}</span>
      <span className="wf-sans" style={{ fontSize: 14, color: 'var(--wf-forest)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
