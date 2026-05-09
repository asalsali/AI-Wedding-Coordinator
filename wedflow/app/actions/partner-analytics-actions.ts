'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'

// ----------------------------------------------------------------
// Auth helper
// ----------------------------------------------------------------

async function getAuthedUserId(): Promise<string> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: unknown }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as Record<string, unknown>)
            })
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return user.id
}

// ----------------------------------------------------------------
// Plan pricing for revenue attribution
// ----------------------------------------------------------------

const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  essential: 49,
  concierge: 79,
}

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface PartnerPerformanceMetrics {
  conversionRate: number
  averageConversionDays: number | null
  retentionRate: number
  totalMessages: number
  autoReplyRate: number
  averageMessagesPerCouplePerWeek: number
  totalReferrals: number
  activeReferrals: number
  pendingReferrals: number
  churnedReferrals: number
}

export interface PartnerLeaderboardEntry {
  partnerId: string
  organizationName: string
  contactName: string
  partnerType: string
  activeReferrals: number
  totalReferrals: number
  conversionRate: number
  retentionRate: number
}

export interface PartnerTimeSeriesPoint {
  period: string
  newReferrals: number
  conversions: number
}

export interface PartnerRevenueAttribution {
  totalAttributedMRR: number
  activeCouples: number
  averageRevenuePerCouple: number
  byPlan: { plan: string; count: number; mrr: number }[]
}

// ----------------------------------------------------------------
// getPartnerPerformanceMetrics
// ----------------------------------------------------------------

export async function getPartnerPerformanceMetrics(
  partnerId: string
): Promise<PartnerPerformanceMetrics> {
  const supabase = createServiceRoleClient()

  // Fetch all referrals for this partner
  const { data: referrals, error: refError } = await supabase
    .from('partner_referrals')
    .select('id, couple_id, status, converted_at, created_at')
    .eq('partner_id', partnerId)

  if (refError) throw new Error(`Failed to fetch referrals: ${refError.message}`)

  const all = referrals ?? []
  const totalReferrals = all.length
  const activeReferrals = all.filter((r) => r.status === 'active').length
  const pendingReferrals = all.filter((r) => r.status === 'pending').length
  const churnedReferrals = all.filter((r) => r.status === 'churned').length
  const nonPending = all.filter((r) => r.status !== 'pending')
  const conversionRate = totalReferrals > 0 ? activeReferrals / totalReferrals : 0
  const retentionRate = nonPending.length > 0
    ? activeReferrals / nonPending.length
    : 0

  // Average conversion time (for those with converted_at)
  const converted = all.filter((r) => r.converted_at)
  let averageConversionDays: number | null = null
  if (converted.length > 0) {
    const totalDays = converted.reduce((sum, r) => {
      const created = new Date(r.created_at).getTime()
      const conv = new Date(r.converted_at!).getTime()
      return sum + (conv - created) / (1000 * 60 * 60 * 24)
    }, 0)
    averageConversionDays = Math.round((totalDays / converted.length) * 10) / 10
  }

  // Fetch couple_metrics for referred couples
  const coupleIds = all.map((r) => r.couple_id as string)
  let totalMessages = 0
  let totalAutoReplied = 0
  let averageMessagesPerCouplePerWeek = 0

  if (coupleIds.length > 0) {
    const { data: metricsData, error: metricsError } = await supabase
      .from('couple_metrics')
      .select('couple_id, date, messages_received, messages_auto_replied')
      .in('couple_id', coupleIds)

    if (metricsError) throw new Error(`Failed to fetch couple metrics: ${metricsError.message}`)

    const allMetrics = metricsData ?? []
    totalMessages = allMetrics.reduce((s, m) => s + (m.messages_received as number), 0)
    totalAutoReplied = allMetrics.reduce((s, m) => s + (m.messages_auto_replied as number), 0)

    // Average messages per couple per week
    if (coupleIds.length > 0 && allMetrics.length > 0) {
      const dates = allMetrics.map((m) => new Date(m.date as string).getTime())
      const minDate = Math.min(...dates)
      const maxDate = Math.max(...dates)
      const spanWeeks = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24 * 7))
      averageMessagesPerCouplePerWeek =
        Math.round((totalMessages / coupleIds.length / spanWeeks) * 10) / 10
    }
  }

  const autoReplyRate = totalMessages > 0
    ? Math.round((totalAutoReplied / totalMessages) * 100)
    : 0

  return {
    conversionRate,
    averageConversionDays,
    retentionRate,
    totalMessages,
    autoReplyRate,
    averageMessagesPerCouplePerWeek,
    totalReferrals,
    activeReferrals,
    pendingReferrals,
    churnedReferrals,
  }
}

// ----------------------------------------------------------------
// getPartnerPerformanceMetricsForCurrentUser
// ----------------------------------------------------------------

export async function getPartnerPerformanceMetricsForCurrentUser(): Promise<PartnerPerformanceMetrics | null> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  const { data: partner, error } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch partner: ${error.message}`)
  if (!partner) return null

  return getPartnerPerformanceMetrics(partner.id as string)
}

// ----------------------------------------------------------------
// getPartnerLeaderboard — for admin: rank all partners
// ----------------------------------------------------------------

export async function getPartnerLeaderboard(): Promise<PartnerLeaderboardEntry[]> {
  const supabase = createServiceRoleClient()

  const { data: partners, error: pError } = await supabase
    .from('partners')
    .select('id, organization_name, contact_name, partner_type, status')
    .eq('status', 'approved')

  if (pError) throw new Error(`Failed to fetch partners: ${pError.message}`)

  const allPartners = partners ?? []
  if (allPartners.length === 0) return []

  const partnerIds = allPartners.map((p) => p.id as string)

  const { data: referrals, error: rError } = await supabase
    .from('partner_referrals')
    .select('partner_id, status')
    .in('partner_id', partnerIds)

  if (rError) throw new Error(`Failed to fetch referrals: ${rError.message}`)

  const refsByPartner = new Map<string, { total: number; active: number; nonPending: number }>()
  for (const ref of referrals ?? []) {
    const pid = ref.partner_id as string
    const entry = refsByPartner.get(pid) ?? { total: 0, active: 0, nonPending: 0 }
    entry.total++
    if (ref.status === 'active') entry.active++
    if (ref.status !== 'pending') entry.nonPending++
    refsByPartner.set(pid, entry)
  }

  const leaderboard: PartnerLeaderboardEntry[] = allPartners.map((p) => {
    const stats = refsByPartner.get(p.id as string) ?? { total: 0, active: 0, nonPending: 0 }
    return {
      partnerId: p.id as string,
      organizationName: p.organization_name as string,
      contactName: p.contact_name as string,
      partnerType: p.partner_type as string,
      activeReferrals: stats.active,
      totalReferrals: stats.total,
      conversionRate: stats.total > 0 ? stats.active / stats.total : 0,
      retentionRate: stats.nonPending > 0 ? stats.active / stats.nonPending : 0,
    }
  })

  // Sort by active referrals descending
  leaderboard.sort((a, b) => b.activeReferrals - a.activeReferrals)

  return leaderboard
}

// ----------------------------------------------------------------
// getPartnerTimeSeriesData
// ----------------------------------------------------------------

export async function getPartnerTimeSeriesData(
  partnerId: string,
  period: 'week' | 'month'
): Promise<PartnerTimeSeriesPoint[]> {
  const supabase = createServiceRoleClient()

  const { data: referrals, error } = await supabase
    .from('partner_referrals')
    .select('status, converted_at, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch referrals: ${error.message}`)

  const all = referrals ?? []
  if (all.length === 0) return []

  // Group by period
  const buckets = new Map<string, { newReferrals: number; conversions: number }>()

  for (const ref of all) {
    const createdDate = new Date(ref.created_at)
    const key = periodKey(createdDate, period)
    const bucket = buckets.get(key) ?? { newReferrals: 0, conversions: 0 }
    bucket.newReferrals++
    buckets.set(key, bucket)

    if (ref.converted_at) {
      const convertedDate = new Date(ref.converted_at)
      const convKey = periodKey(convertedDate, period)
      const convBucket = buckets.get(convKey) ?? { newReferrals: 0, conversions: 0 }
      convBucket.conversions++
      buckets.set(convKey, convBucket)
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, data]) => ({ period: p, ...data }))
}

function periodKey(date: Date, period: 'week' | 'month'): string {
  if (period === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  // ISO week: get the Monday of the week
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

// ----------------------------------------------------------------
// getPartnerRevenueAttribution
// ----------------------------------------------------------------

export async function getPartnerRevenueAttribution(
  partnerId: string
): Promise<PartnerRevenueAttribution> {
  const supabase = createServiceRoleClient()

  // Get active referrals for this partner
  const { data: referrals, error: refError } = await supabase
    .from('partner_referrals')
    .select('couple_id')
    .eq('partner_id', partnerId)
    .eq('status', 'active')

  if (refError) throw new Error(`Failed to fetch referrals: ${refError.message}`)

  const activeRefs = referrals ?? []
  if (activeRefs.length === 0) {
    return { totalAttributedMRR: 0, activeCouples: 0, averageRevenuePerCouple: 0, byPlan: [] }
  }

  const coupleIds = activeRefs.map((r) => r.couple_id as string)

  // Get couple plans
  const { data: couples, error: cError } = await supabase
    .from('couples')
    .select('id, plan, subscription_status')
    .in('id', coupleIds)

  if (cError) throw new Error(`Failed to fetch couples: ${cError.message}`)

  const activeCouples = couples ?? []
  const planCounts = new Map<string, number>()

  let totalMRR = 0
  for (const c of activeCouples) {
    const plan = (c.plan as string | null) ?? 'none'
    const subStatus = c.subscription_status as string | null
    const price = PLAN_PRICES[plan] ?? 0
    const isActive = subStatus === 'active' || subStatus === 'trialing'
    if (isActive) {
      totalMRR += price
    }
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1)
  }

  const byPlan = Array.from(planCounts.entries()).map(([plan, count]) => ({
    plan,
    count,
    mrr: count * (PLAN_PRICES[plan] ?? 0),
  }))

  return {
    totalAttributedMRR: totalMRR,
    activeCouples: activeCouples.length,
    averageRevenuePerCouple: activeCouples.length > 0
      ? Math.round((totalMRR / activeCouples.length) * 100) / 100
      : 0,
    byPlan,
  }
}

// ----------------------------------------------------------------
// getPartnerRevenueAttributionForCurrentUser
// ----------------------------------------------------------------

export async function getPartnerRevenueAttributionForCurrentUser(): Promise<PartnerRevenueAttribution | null> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  const { data: partner, error } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch partner: ${error.message}`)
  if (!partner) return null

  return getPartnerRevenueAttribution(partner.id as string)
}
