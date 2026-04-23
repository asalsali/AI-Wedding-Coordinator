import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// requires: RESEND_API_KEY

const ROLE_LABELS: Record<string, string> = {
  moh: 'Maid of Honor',
  best_man: 'Best Man',
  family_lead: 'Family Lead',
  bridesmaid: 'Bridesmaid',
  groomsman: 'Groomsman',
}

export async function POST(request: Request) {
  try {
    const { token, email, name, role, coupleName, origin } = await request.json()

    if (!token || !email || !name || !coupleName || !origin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Generate magic link without sending Supabase's default email
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/join/${token}/accept`,
      },
    })

    if (linkError || !data?.properties?.action_link) {
      return NextResponse.json(
        { error: 'Could not generate sign-in link.' },
        { status: 500 }
      )
    }

    const magicLink = data.properties.action_link
    const roleLabel = ROLE_LABELS[role] || role

    // Send personalized email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const { error: emailError } = await resend.emails.send({
      from: 'WedFlow <onboarding@resend.dev>',
      to: email,
      subject: `${coupleName} invited you into their wedding circle`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDFBF7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 600; color: #1C3B2B; letter-spacing: -0.01em;">WedFlow</span>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background: #ffffff; border-radius: 20px; padding: 40px 36px; border: 1px solid #f0ede8;">
              <h1 style="font-size: 24px; font-weight: 400; color: #1C3B2B; line-height: 1.3; margin: 0 0 8px; text-align: center;">
                ${coupleName} invited you into their circle
              </h1>

              <p style="font-size: 14px; color: #8a8580; text-align: center; margin: 0 0 24px;">
                as their <strong style="color: #1C3B2B;">${roleLabel}</strong>
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #4a4745; margin: 0 0 12px;">
                Hi ${name},
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4a4745; margin: 0 0 24px;">
                ${coupleName} would love your help as their wedding day approaches. As their ${roleLabel.toLowerCase()}, you will have your own portal where you can see tasks they assign to you and conversations relevant to your role.
              </p>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${magicLink}" style="display: inline-block; background-color: #1C3B2B; color: #FDFBF7; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-size: 15px; font-weight: 500;">
                      Join their circle
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #8a8580; line-height: 1.5; margin: 0; text-align: center;">
                This link expires in 24 hours. If the button does not work, copy and paste this URL into your browser:
              </p>
              <p style="font-size: 12px; color: #b0aca7; word-break: break-all; margin: 8px 0 0; text-align: center;">
                ${magicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="font-size: 12px; color: #b0aca7; margin: 0;">
                Sent by WedFlow on behalf of ${coupleName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json(
        { error: 'Could not send the invite email.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-invite-email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
