import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as unknown
  if (
    typeof body !== 'object' ||
    body === null ||
    !('priceId' in body) ||
    typeof (body as Record<string, unknown>).priceId !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
  }
  const { priceId } = body as { priceId: string }

  const supabase = getSupabaseServerClient()
  const { data: couple } = await supabase
    .from('couples')
    .select('id')
    .eq('clerk_user_id', user.id)
    .maybeSingle()

  if (!couple) {
    return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
  }

  const primaryEmail = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.nextUrl.origin}/onboarding?checkout=success`,
    cancel_url: `${req.nextUrl.origin}/pricing`,
    ...(primaryEmail ? { customer_email: primaryEmail } : {}),
    metadata: {
      coupleId: couple.id as string,
      clerkUserId: user.id,
    },
  })

  return NextResponse.json({ url: session.url })
}
