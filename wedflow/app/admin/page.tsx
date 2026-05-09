import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './AdminDashboard'

// Hardcoded admin email — only the founder gets access
const ADMIN_EMAILS = ['ak.salsali2025@gmail.com']

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options) }) } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export default async function AdminPage() {
  const user = await getUser()
  if (!user) redirect('/sign-in')
  if (!ADMIN_EMAILS.includes(user.email ?? '')) redirect('/dashboard')

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all couples with key fields
  const { data: couples } = await svc
    .from('couples')
    .select('id, email, your_name, partner_name, plan, subscription_status, churn_status, usage_streak_weeks, last_active_at, onboarding_completed_at, created_at')
    .order('created_at', { ascending: false })

  // Fetch aggregate metrics for last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: metrics } = await svc
    .from('couple_metrics')
    .select('couple_id, date, messages_received, messages_auto_replied, escalations, drafts_used, drafts_rewritten, inbox_opens')
    .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
    .order('date', { ascending: false })

  // Fetch message counts by classification (last 30 days via audit_logs)
  const { data: classificationLogs } = await svc
    .from('audit_logs')
    .select('metadata')
    .eq('event_type', 'message_classified')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Fetch safety escalations
  const { count: safetyEscalations } = await svc
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'message_escalated')
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Count conversations and messages
  const { count: totalConversations } = await svc
    .from('conversations')
    .select('id', { count: 'exact', head: true })

  const { count: totalGuests } = await svc
    .from('guests')
    .select('id', { count: 'exact', head: true })

  // Build classification breakdown
  const classificationBreakdown = { routine: 0, sensitive: 0, unclear: 0 }
  for (const log of classificationLogs ?? []) {
    const meta = log.metadata as Record<string, unknown> | null
    const cls = meta?.classification as string | undefined
    if (cls && cls in classificationBreakdown) {
      classificationBreakdown[cls as keyof typeof classificationBreakdown]++
    }
  }

  // Aggregate metrics across all couples
  const allMetrics = metrics ?? []
  const totalMessages = allMetrics.reduce((s, m) => s + (m.messages_received as number), 0)
  const totalAutoReplied = allMetrics.reduce((s, m) => s + (m.messages_auto_replied as number), 0)
  const totalEscalations = allMetrics.reduce((s, m) => s + (m.escalations as number), 0)
  const totalDraftsUsed = allMetrics.reduce((s, m) => s + (m.drafts_used as number), 0)
  const totalDraftsRewritten = allMetrics.reduce((s, m) => s + (m.drafts_rewritten as number), 0)
  const totalInboxOpens = allMetrics.reduce((s, m) => s + (m.inbox_opens as number), 0)

  // Per-couple metrics rollup
  const coupleMetricsMap = new Map<string, { messages: number; autoReplied: number; escalations: number; inboxOpens: number }>()
  for (const m of allMetrics) {
    const cid = m.couple_id as string
    const existing = coupleMetricsMap.get(cid) ?? { messages: 0, autoReplied: 0, escalations: 0, inboxOpens: 0 }
    existing.messages += m.messages_received as number
    existing.autoReplied += m.messages_auto_replied as number
    existing.escalations += m.escalations as number
    existing.inboxOpens += m.inbox_opens as number
    coupleMetricsMap.set(cid, existing)
  }

  // Daily totals for chart (last 14 days)
  const dailyTotals = new Map<string, { messages: number; autoReplied: number; escalations: number }>()
  for (const m of allMetrics) {
    const d = m.date as string
    const existing = dailyTotals.get(d) ?? { messages: 0, autoReplied: 0, escalations: 0 }
    existing.messages += m.messages_received as number
    existing.autoReplied += m.messages_auto_replied as number
    existing.escalations += m.escalations as number
    dailyTotals.set(d, existing)
  }
  const dailyData = Array.from(dailyTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, data]) => ({ date, ...data }))

  // Build couples list with metrics
  const couplesList = (couples ?? []).map((c) => {
    const cm = coupleMetricsMap.get(c.id as string)
    return {
      id: c.id as string,
      name: [c.your_name, c.partner_name].filter(Boolean).join(' & ') || c.email as string,
      email: c.email as string,
      plan: (c.plan as string | null) ?? 'none',
      subscriptionStatus: (c.subscription_status as string | null) ?? 'none',
      churnStatus: (c.churn_status as string | null) ?? 'unknown',
      usageStreakWeeks: (c.usage_streak_weeks as number | null) ?? 0,
      lastActiveAt: c.last_active_at as string | null,
      onboardingCompleted: c.onboarding_completed_at !== null,
      createdAt: c.created_at as string,
      messages30d: cm?.messages ?? 0,
      autoReplied30d: cm?.autoReplied ?? 0,
      escalations30d: cm?.escalations ?? 0,
      inboxOpens30d: cm?.inboxOpens ?? 0,
    }
  })

  // Plan distribution
  const planCounts = { none: 0, starter: 0, essential: 0, concierge: 0 }
  for (const c of couplesList) {
    if (c.plan in planCounts) planCounts[c.plan as keyof typeof planCounts]++
    else planCounts.none++
  }

  // Churn distribution
  const churnCounts = { active: 0, at_risk: 0, churned: 0 }
  for (const c of couplesList) {
    if (c.churnStatus in churnCounts) churnCounts[c.churnStatus as keyof typeof churnCounts]++
  }

  // MRR calculation
  const planPrices: Record<string, number> = { starter: 29, essential: 49, concierge: 79 }
  const mrr = couplesList
    .filter((c) => c.subscriptionStatus === 'active' || c.subscriptionStatus === 'trialing')
    .reduce((s, c) => s + (planPrices[c.plan] ?? 0), 0)

  return (
    <AdminDashboard
      data={{
        totalCouples: couplesList.length,
        mrr,
        planCounts,
        churnCounts,
        totalMessages,
        totalAutoReplied,
        totalEscalations,
        totalDraftsUsed,
        totalDraftsRewritten,
        totalInboxOpens,
        totalConversations: totalConversations ?? 0,
        totalGuests: totalGuests ?? 0,
        safetyEscalations: safetyEscalations ?? 0,
        classificationBreakdown,
        autoReplyRate: totalMessages > 0 ? Math.round((totalAutoReplied / totalMessages) * 100) : 0,
        draftAdoptionRate: (totalDraftsUsed + totalDraftsRewritten) > 0
          ? Math.round((totalDraftsUsed / (totalDraftsUsed + totalDraftsRewritten)) * 100)
          : 0,
        dailyData,
        couples: couplesList,
      }}
    />
  )
}
