import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const coupleId = session.metadata?.coupleId
    if (coupleId) {
      await supabase
        .from('couples')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
        })
        .eq('id', coupleId)

      // Resolve plan from the price ID
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        )
        const priceId = subscription.items.data[0]?.price.id
        if (priceId) {
          const { PLANS } = await import('@/lib/stripe/plans')
          const matched = PLANS.find((p) => p.priceId === priceId)
          if (matched) {
            await supabase
              .from('couples')
              .update({ plan: matched.id })
              .eq('id', coupleId)
          }
        }
      }
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    await supabase
      .from('couples')
      .update({ subscription_status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id)
  } else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const priceId = subscription.items.data[0]?.price.id
    const { PLANS } = await import('@/lib/stripe/plans')
    const matched = PLANS.find((p) => p.priceId === priceId)
    await supabase
      .from('couples')
      .update({
        subscription_status: subscription.status,
        ...(matched ? { plan: matched.id } : {}),
      })
      .eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ received: true })
}
