/**
 * Plan-based feature permissions.
 * Single source of truth for what each tier unlocks.
 */

export type PlanId = 'starter' | 'essential' | 'concierge'

export interface PlanPermissions {
  monthlyMessageLimit: number | null // null = unlimited
  maxCustomFaqs: number | null       // null = unlimited
  escalationDrafts: boolean
  partnerAccess: boolean
  fullPhoneVisibility: boolean
  customToneTuning: boolean
}

const PLAN_PERMISSIONS: Record<PlanId, PlanPermissions> = {
  starter: {
    monthlyMessageLimit: 200,
    maxCustomFaqs: 6,
    escalationDrafts: false,
    partnerAccess: false,
    fullPhoneVisibility: false,
    customToneTuning: false,
  },
  essential: {
    monthlyMessageLimit: null,
    maxCustomFaqs: null,
    escalationDrafts: true,
    partnerAccess: true,
    fullPhoneVisibility: false,
    customToneTuning: false,
  },
  concierge: {
    monthlyMessageLimit: null,
    maxCustomFaqs: null,
    escalationDrafts: true,
    partnerAccess: true,
    fullPhoneVisibility: true,
    customToneTuning: true,
  },
}

// No plan = no permissions (must subscribe)
const NO_PLAN_PERMISSIONS: PlanPermissions = {
  monthlyMessageLimit: 0,
  maxCustomFaqs: 0,
  escalationDrafts: false,
  partnerAccess: false,
  fullPhoneVisibility: false,
  customToneTuning: false,
}

export function getPlanPermissions(plan: string | null): PlanPermissions {
  if (!plan || !(plan in PLAN_PERMISSIONS)) return NO_PLAN_PERMISSIONS
  return PLAN_PERMISSIONS[plan as PlanId]
}

export function isPaidPlan(plan: string | null): boolean {
  return plan !== null && plan in PLAN_PERMISSIONS
}
