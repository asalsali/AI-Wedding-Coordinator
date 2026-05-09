'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Partner, PartnerReferral, PartnerType, PartnerStatus } from '@/types'

// ----------------------------------------------------------------
// Admin auth — hardcoded email check (same pattern as /admin/page.tsx)
// ----------------------------------------------------------------

const ADMIN_EMAILS = ['ak.salsali2025@gmail.com']

async function requireAdmin(): Promise<string> {
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
            // Ignore
          }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  if (!ADMIN_EMAILS.includes(user.email ?? '')) throw new Error('Not authorized')
  return user.id
}

// ----------------------------------------------------------------
// Column selections (explicit, never select *)
// ----------------------------------------------------------------

const PARTNER_COLUMNS = `
  id, user_id, partner_type, organization_name, contact_name,
  contact_email, phone, website, referral_code, parent_partner_id,
  status, approved_at, approved_by, created_at, updated_at
` as const

const REFERRAL_COLUMNS = `
  id, partner_id, couple_id, referral_code_used, status,
  converted_at, created_at
` as const

// ----------------------------------------------------------------
// Types for admin partner views
// ----------------------------------------------------------------

export interface AdminPartnerRow {
  id: string
  organization_name: string
  contact_name: string
  contact_email: string
  partner_type: PartnerType
  status: PartnerStatus
  referral_code: string
  referral_count: number
  active_referrals: number
  created_at: string
}

export interface AdminPartnerDetail {
  partner: Partner
  referrals: PartnerReferral[]
  referralCount: number
  activeReferrals: number
  conversionRate: number
}

export interface AdminPartnerSummary {
  totalPartners: number
  pendingCount: number
  approvedCount: number
  suspendedCount: number
  totalReferrals: number
  topReferrer: { organization_name: string; referral_count: number } | null
}

// ----------------------------------------------------------------
// getAdminPartnerList — all partners with referral counts
// ----------------------------------------------------------------

export async function getAdminPartnerList(): Promise<AdminPartnerRow[]> {
  await requireAdmin()
  const svc = createServiceRoleClient()

  const { data: partners, error } = await svc
    .from('partners')
    .select(PARTNER_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch partners: ${error.message}`)
  if (!partners || partners.length === 0) return []

  const partnerIds = partners.map((p) => p.id as string)

  const { data: referrals, error: refError } = await svc
    .from('partner_referrals')
    .select('partner_id, status')
    .in('partner_id', partnerIds)

  if (refError) throw new Error(`Failed to fetch referrals: ${refError.message}`)

  const refsByPartner = new Map<string, { total: number; active: number }>()
  for (const ref of referrals ?? []) {
    const pid = ref.partner_id as string
    const entry = refsByPartner.get(pid) ?? { total: 0, active: 0 }
    entry.total++
    if (ref.status === 'active') entry.active++
    refsByPartner.set(pid, entry)
  }

  return partners.map((p) => {
    const stats = refsByPartner.get(p.id as string) ?? { total: 0, active: 0 }
    return {
      id: p.id as string,
      organization_name: p.organization_name as string,
      contact_name: p.contact_name as string,
      contact_email: p.contact_email as string,
      partner_type: p.partner_type as PartnerType,
      status: p.status as PartnerStatus,
      referral_code: p.referral_code as string,
      referral_count: stats.total,
      active_referrals: stats.active,
      created_at: p.created_at as string,
    }
  })
}

// ----------------------------------------------------------------
// getAdminPartnerSummary — aggregate stats for overview card
// ----------------------------------------------------------------

export async function getAdminPartnerSummary(): Promise<AdminPartnerSummary> {
  await requireAdmin()
  const svc = createServiceRoleClient()

  const { data: partners, error } = await svc
    .from('partners')
    .select('id, status, organization_name')

  if (error) throw new Error(`Failed to fetch partners: ${error.message}`)

  const all = partners ?? []
  const pendingCount = all.filter((p) => p.status === 'pending').length
  const approvedCount = all.filter((p) => p.status === 'approved').length
  const suspendedCount = all.filter((p) => p.status === 'suspended').length

  const partnerIds = all.map((p) => p.id as string)

  let totalReferrals = 0
  let topReferrer: AdminPartnerSummary['topReferrer'] = null

  if (partnerIds.length > 0) {
    const { data: referrals, error: refError } = await svc
      .from('partner_referrals')
      .select('partner_id, status')
      .in('partner_id', partnerIds)

    if (refError) throw new Error(`Failed to fetch referrals: ${refError.message}`)

    const refCounts = new Map<string, number>()
    for (const ref of referrals ?? []) {
      totalReferrals++
      if (ref.status === 'active') {
        const pid = ref.partner_id as string
        refCounts.set(pid, (refCounts.get(pid) ?? 0) + 1)
      }
    }

    let maxCount = 0
    let maxPartnerId: string | null = null
    for (const [pid, count] of refCounts) {
      if (count > maxCount) {
        maxCount = count
        maxPartnerId = pid
      }
    }

    if (maxPartnerId) {
      const partner = all.find((p) => (p.id as string) === maxPartnerId)
      if (partner) {
        topReferrer = {
          organization_name: partner.organization_name as string,
          referral_count: maxCount,
        }
      }
    }
  }

  return {
    totalPartners: all.length,
    pendingCount,
    approvedCount,
    suspendedCount,
    totalReferrals,
    topReferrer,
  }
}

// ----------------------------------------------------------------
// approvePartner — set status to 'approved'
// ----------------------------------------------------------------

export async function approvePartner(partnerId: string): Promise<void> {
  const adminUserId = await requireAdmin()
  const svc = createServiceRoleClient()

  const { error } = await svc
    .from('partners')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminUserId,
    })
    .eq('id', partnerId)

  if (error) throw new Error(`Failed to approve partner: ${error.message}`)
}

// ----------------------------------------------------------------
// suspendPartner — set status to 'suspended'
// ----------------------------------------------------------------

export async function suspendPartner(partnerId: string): Promise<void> {
  await requireAdmin()
  const svc = createServiceRoleClient()

  const { error } = await svc
    .from('partners')
    .update({ status: 'suspended' })
    .eq('id', partnerId)

  if (error) throw new Error(`Failed to suspend partner: ${error.message}`)
}

// ----------------------------------------------------------------
// getPartnerDetail — one partner with full referral list
// ----------------------------------------------------------------

export async function getPartnerDetail(partnerId: string): Promise<AdminPartnerDetail> {
  await requireAdmin()
  const svc = createServiceRoleClient()

  const { data: partner, error } = await svc
    .from('partners')
    .select(PARTNER_COLUMNS)
    .eq('id', partnerId)
    .single()

  if (error) throw new Error(`Failed to fetch partner: ${error.message}`)

  const { data: referrals, error: refError } = await svc
    .from('partner_referrals')
    .select(REFERRAL_COLUMNS)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })

  if (refError) throw new Error(`Failed to fetch referrals: ${refError.message}`)

  const allRefs = (referrals ?? []) as PartnerReferral[]
  const activeReferrals = allRefs.filter((r) => r.status === 'active').length

  return {
    partner: partner as Partner,
    referrals: allRefs,
    referralCount: allRefs.length,
    activeReferrals,
    conversionRate: allRefs.length > 0 ? Math.round((activeReferrals / allRefs.length) * 100) : 0,
  }
}

// ----------------------------------------------------------------
// invitePartner — create a pending partner record
// The actual auth/invite email is deferred to partner-auth agent.
// ----------------------------------------------------------------

interface InvitePartnerData {
  email: string
  partnerType: PartnerType
  organizationName: string
  contactName: string
}

export async function invitePartner(data: InvitePartnerData): Promise<{ id: string; referral_code: string }> {
  await requireAdmin()
  const svc = createServiceRoleClient()

  // Check if partner already exists with this email
  const { data: existing } = await svc
    .from('partners')
    .select('id')
    .eq('contact_email', data.email)
    .maybeSingle()

  if (existing) throw new Error('A partner with this email already exists')

  // Generate a unique referral code
  const { generateReferralCode } = await import('@/lib/partner/referral')
  let referralCode = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode()
    const { data: codeExists } = await svc
      .from('partners')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()
    if (!codeExists) {
      referralCode = code
      break
    }
  }
  if (!referralCode) throw new Error('Failed to generate unique referral code')

  const { data: partner, error } = await svc
    .from('partners')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // placeholder until partner claims account
      partner_type: data.partnerType,
      organization_name: data.organizationName,
      contact_name: data.contactName,
      contact_email: data.email,
      referral_code: referralCode,
      status: 'pending',
    })
    .select('id, referral_code')
    .single()

  if (error) throw new Error(`Failed to create partner: ${error.message}`)
  return { id: partner.id as string, referral_code: partner.referral_code as string }
}
