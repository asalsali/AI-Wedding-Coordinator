import { currentUser } from '@clerk/nextjs/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/stripe/plans'
import PricingClient from './PricingClient'

export default async function PricingPage() {
  const user = await currentUser()

  let currentPlan: string | null = null

  if (user) {
    const supabase = getSupabaseServerClient()
    const { data: couple } = await supabase
      .from('couples')
      .select('plan')
      .eq('clerk_user_id', user.id)
      .maybeSingle()
    currentPlan = (couple?.plan as string | null) ?? null
  }

  return <PricingClient plans={PLANS} currentPlan={currentPlan} />
}
