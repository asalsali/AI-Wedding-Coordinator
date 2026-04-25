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

    const isDuplicate = error?.code === '23505'
    if (error && !isDuplicate) throw error

    // Notify founder on every signup (including duplicates, so you know someone tried)
    const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL
    const resendKey = process.env.RESEND_API_KEY
    if (notifyEmail && resendKey) {
      const resend = new Resend(resendKey)
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'WedFlow <onboarding@resend.dev>',
        to: notifyEmail,
        subject: isDuplicate
          ? `Waitlist retry: ${email}`
          : `New waitlist signup: ${email}`,
        text: isDuplicate
          ? `${email} tried to join the waitlist again (already signed up).`
          : `${email} just joined the Wedflow paid beta waitlist.`,
      })

      if (emailError) {
        console.error('Waitlist notify error:', JSON.stringify(emailError))
      } else {
        console.log('Waitlist notify sent:', emailData?.id)
      }
    } else {
      console.warn('Waitlist notify skipped: WAITLIST_NOTIFY_EMAIL=' + (notifyEmail ?? 'unset') + ', RESEND_API_KEY=' + (resendKey ? 'set' : 'unset'))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
