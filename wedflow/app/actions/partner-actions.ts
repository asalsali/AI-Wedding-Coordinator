'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { generateReferralCode } from '@/lib/partner/referral'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Partner, PartnerReferral, PartnerType, PartnerStatus } from '@/types'

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
// Partner profile columns selected in queries
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
// getPartnerProfile — get current user's partner profile
// ----------------------------------------------------------------

export async function getPartnerProfile(): Promise<Partner | null> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('partners')
    .select(PARTNER_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch partner profile: ${error.message}`)
  return data as Partner | null
}

// ----------------------------------------------------------------
// getPartnerReferrals — get referrals for current partner
// ----------------------------------------------------------------

export async function getPartnerReferrals(): Promise<PartnerReferral[]> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  // First get the partner ID for this user
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (partnerError) throw new Error(`Failed to fetch partner: ${partnerError.message}`)
  if (!partner) throw new Error('Partner profile not found')

  const { data, error } = await supabase
    .from('partner_referrals')
    .select(REFERRAL_COLUMNS)
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch referrals: ${error.message}`)
  return (data ?? []) as PartnerReferral[]
}

// ----------------------------------------------------------------
// getPartnerStats — aggregate stats for the partner dashboard
// ----------------------------------------------------------------

export interface PartnerStats {
  totalReferrals: number
  activeCouples: number
  conversionRate: number
  pendingReferrals: number
}

export async function getPartnerStats(): Promise<PartnerStats> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (partnerError) throw new Error(`Failed to fetch partner: ${partnerError.message}`)
  if (!partner) throw new Error('Partner profile not found')

  const { data: referrals, error } = await supabase
    .from('partner_referrals')
    .select('id, status')
    .eq('partner_id', partner.id)

  if (error) throw new Error(`Failed to fetch referral stats: ${error.message}`)

  const all = referrals ?? []
  const totalReferrals = all.length
  const activeCouples = all.filter((r) => r.status === 'active').length
  const pendingReferrals = all.filter((r) => r.status === 'pending').length
  const conversionRate = totalReferrals > 0 ? activeCouples / totalReferrals : 0

  return { totalReferrals, activeCouples, conversionRate, pendingReferrals }
}

// ----------------------------------------------------------------
// getChildPartners — get child partners for a church partner
// ----------------------------------------------------------------

export interface ChildPartnerWithStats {
  id: string
  partner_type: PartnerType
  organization_name: string
  contact_name: string
  referral_code: string
  status: PartnerStatus
  created_at: string
  totalReferrals: number
  activeCouples: number
}

export async function getChildPartners(): Promise<ChildPartnerWithStats[]> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  const { data: parent, error: parentError } = await supabase
    .from('partners')
    .select('id, partner_type')
    .eq('user_id', userId)
    .maybeSingle()

  if (parentError) throw new Error(`Failed to fetch partner: ${parentError.message}`)
  if (!parent) throw new Error('Partner profile not found')
  if (parent.partner_type !== 'church') return []

  const { data: children, error: childError } = await supabase
    .from('partners')
    .select('id, partner_type, organization_name, contact_name, referral_code, status, created_at')
    .eq('parent_partner_id', parent.id)
    .order('created_at', { ascending: false })

  if (childError) throw new Error(`Failed to fetch child partners: ${childError.message}`)
  if (!children || children.length === 0) return []

  const childIds = children.map((c) => c.id)
  const { data: referrals, error: refError } = await supabase
    .from('partner_referrals')
    .select('partner_id, status')
    .in('partner_id', childIds)

  if (refError) throw new Error(`Failed to fetch child referrals: ${refError.message}`)

  const refsByPartner = new Map<string, { total: number; active: number }>()
  for (const ref of referrals ?? []) {
    const pid = ref.partner_id as string
    const entry = refsByPartner.get(pid) ?? { total: 0, active: 0 }
    entry.total++
    if (ref.status === 'active') entry.active++
    refsByPartner.set(pid, entry)
  }

  return children.map((c) => {
    const stats = refsByPartner.get(c.id as string) ?? { total: 0, active: 0 }
    return {
      id: c.id as string,
      partner_type: c.partner_type as PartnerType,
      organization_name: c.organization_name as string,
      contact_name: c.contact_name as string,
      referral_code: c.referral_code as string,
      status: c.status as PartnerStatus,
      created_at: c.created_at as string,
      totalReferrals: stats.total,
      activeCouples: stats.active,
    }
  })
}

// ----------------------------------------------------------------
// generateUniqueReferralCode — create a short unique referral code
// Retries up to 5 times on collision.
// ----------------------------------------------------------------

export async function generateUniqueReferralCode(
  _partnerType: PartnerType,
  _orgName: string
): Promise<string> {
  const supabase = createServiceRoleClient()
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateReferralCode()

    const { data: existing } = await supabase
      .from('partners')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()

    if (!existing) return code
  }

  throw new Error('Failed to generate a unique referral code after multiple attempts')
}

// ----------------------------------------------------------------
// createPartnerFromInvite — create partner record after invite
// ----------------------------------------------------------------

interface CreatePartnerData {
  partnerType: PartnerType
  organizationName: string
  contactName: string
  contactEmail: string
  phone?: string
  website?: string
  parentPartnerId?: string
}

export async function createPartnerFromInvite(data: CreatePartnerData): Promise<Partner> {
  const userId = await getAuthedUserId()
  const supabase = createServiceRoleClient()

  // Check if partner already exists for this user
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) throw new Error('Partner profile already exists for this user')

  const referralCode = await generateUniqueReferralCode(data.partnerType, data.organizationName)

  const { data: partner, error } = await supabase
    .from('partners')
    .insert({
      user_id: userId,
      partner_type: data.partnerType,
      organization_name: data.organizationName,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      phone: data.phone ?? null,
      website: data.website ?? null,
      referral_code: referralCode,
      parent_partner_id: data.parentPartnerId ?? null,
      status: 'pending',
    })
    .select(PARTNER_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to create partner: ${error.message}`)
  return partner as Partner
}

// ----------------------------------------------------------------
// getPartnerByInviteEmail — public lookup for the join page
// Returns only non-sensitive fields. Does NOT require auth.
// ----------------------------------------------------------------

export interface PartnerInviteInfo {
  organization_name: string
  partner_type: PartnerType
  contact_name: string
  status: PartnerStatus
  alreadyClaimed: boolean
}

export async function getPartnerByInviteEmail(
  email: string
): Promise<PartnerInviteInfo | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('partners')
    .select('organization_name, partner_type, contact_name, status, user_id')
    .eq('contact_email', email)
    .maybeSingle()

  if (error) throw new Error(`Failed to look up partner invite: ${error.message}`)
  if (!data) return null

  const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000000'
  const alreadyClaimed =
    !!data.user_id && (data.user_id as string) !== PLACEHOLDER_USER_ID

  return {
    organization_name: data.organization_name as string,
    partner_type: data.partner_type as PartnerType,
    contact_name: data.contact_name as string,
    status: data.status as PartnerStatus,
    alreadyClaimed,
  }
}

// ----------------------------------------------------------------
// claimPartnerInvite — link authenticated user to pending partner
// Called after the partner signs up / verifies email.
// ----------------------------------------------------------------

export async function claimPartnerInvite(): Promise<{
  success: boolean
  error?: string
}> {
  let userId: string
  try {
    userId = await getAuthedUserId()
  } catch {
    return { success: false, error: 'Not authenticated' }
  }

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

  // Get the user's email from auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'No email on auth user' }

  const svc = createServiceRoleClient()
  const PLACEHOLDER_USER_ID = '00000000-0000-0000-0000-000000000000'

  // Find pending partner record matching this email
  const { data: partner, error: lookupError } = await svc
    .from('partners')
    .select('id, user_id, status')
    .eq('contact_email', user.email)
    .maybeSingle()

  if (lookupError)
    return { success: false, error: `Lookup failed: ${lookupError.message}` }
  if (!partner)
    return { success: false, error: 'No partner invitation found for this email' }

  // Already claimed by someone
  if (
    partner.user_id &&
    (partner.user_id as string) !== PLACEHOLDER_USER_ID
  ) {
    if ((partner.user_id as string) === userId) {
      // Same user — already claimed, just redirect
      return { success: true }
    }
    return { success: false, error: 'This invitation has already been claimed' }
  }

  // Link the auth user to the partner record
  const { error: updateError } = await svc
    .from('partners')
    .update({ user_id: userId })
    .eq('id', partner.id)

  if (updateError)
    return { success: false, error: `Failed to claim invite: ${updateError.message}` }

  return { success: true }
}

// ----------------------------------------------------------------
// recordReferral — record a new referral when a couple signs up
// with a referral code. Called from the signup/onboarding flow.
// ----------------------------------------------------------------

export async function recordReferral(
  referralCode: string,
  coupleId: string
): Promise<PartnerReferral> {
  const supabase = createServiceRoleClient()

  // Look up the partner by referral code
  const { data: partner, error: lookupError } = await supabase
    .from('partners')
    .select('id, status')
    .eq('referral_code', referralCode)
    .maybeSingle()

  if (lookupError) throw new Error(`Failed to look up referral code: ${lookupError.message}`)
  if (!partner) throw new Error('Invalid referral code')
  if (partner.status !== 'approved') throw new Error('Partner is not active')

  // Check for duplicate referral
  const { data: existingReferral } = await supabase
    .from('partner_referrals')
    .select('id')
    .eq('partner_id', partner.id)
    .eq('couple_id', coupleId)
    .maybeSingle()

  if (existingReferral) throw new Error('Referral already recorded for this couple')

  const { data: referral, error } = await supabase
    .from('partner_referrals')
    .insert({
      partner_id: partner.id,
      couple_id: coupleId,
      referral_code_used: referralCode,
      status: 'pending',
    })
    .select(REFERRAL_COLUMNS)
    .single()

  if (error) throw new Error(`Failed to record referral: ${error.message}`)
  return referral as PartnerReferral
}
