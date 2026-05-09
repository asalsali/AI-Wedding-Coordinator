import { redirect } from 'next/navigation'
import {
  getPartnerProfile,
  getPartnerReferrals,
  getPartnerStats,
  getChildPartners,
} from '@/app/actions/partner-actions'
import {
  getPartnerPerformanceMetricsForCurrentUser,
  getPartnerRevenueAttributionForCurrentUser,
} from '@/app/actions/partner-analytics-actions'
import { buildReferralUrl } from '@/lib/partner/referral'
import PartnerDashboardClient from './PartnerDashboardClient'

export default async function PartnerPage() {
  const partner = await getPartnerProfile()
  if (!partner) redirect('/sign-in')
  if (partner.status !== 'approved') {
    // Layout handles pending/suspended states
    return null
  }

  const [referrals, stats, childPartners, performanceMetrics, revenueAttribution] = await Promise.all([
    getPartnerReferrals(),
    getPartnerStats(),
    partner.partner_type === 'church' ? getChildPartners() : Promise.resolve([]),
    getPartnerPerformanceMetricsForCurrentUser(),
    getPartnerRevenueAttributionForCurrentUser(),
  ])

  const referralUrl = buildReferralUrl(partner.referral_code)

  return (
    <PartnerDashboardClient
      partner={partner}
      referrals={referrals}
      stats={stats}
      referralUrl={referralUrl}
      childPartners={childPartners}
      performanceMetrics={performanceMetrics ?? undefined}
      revenueAttribution={revenueAttribution ?? undefined}
    />
  )
}
