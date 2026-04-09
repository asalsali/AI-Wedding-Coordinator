import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase
      .from('waitlist')
      .insert({ email })

    if (error) {
      // Duplicate email — return success so we don't leak whether an address is registered
      if (error.code === '23505') return NextResponse.json({ ok: true })
      throw error
    }

    // Notify founder — fire and forget, don't block the response
    const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL
    const resendKey = process.env.RESEND_API_KEY
    if (notifyEmail && resendKey) {
      const resend = new Resend(resendKey)
      resend.emails.send({
        from: 'Wedflow <onboarding@resend.dev>',
        to: notifyEmail,
        subject: `New waitlist signup: ${email}`,
        text: `${email} just joined the Wedflow paid beta waitlist.`,
      }).catch(() => {
        // Swallow — a failed notification should never fail the signup
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
