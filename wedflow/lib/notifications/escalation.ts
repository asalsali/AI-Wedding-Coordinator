import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";

// requires: RESEND_API_KEY
// requires: NEXT_PUBLIC_APP_URL

type EscalationReason = "classification" | "safety_check_failed";

const REASON_COPY: Record<EscalationReason, string> = {
  classification:
    "We flagged it as something personal that deserves your voice rather than an automated reply.",
  safety_check_failed:
    "Our safety check was not confident enough to send an automated reply on your behalf.",
};

/**
 * Notify the couple (and partner, if present) that a guest message was
 * escalated and needs their attention. Failures are logged, never thrown —
 * notification must not break the SMS pipeline.
 */
export async function notifyEscalation(
  coupleId: string,
  reason: EscalationReason,
  messageId: string
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { data: couple, error: coupleError } = await supabase
      .from("couples")
      .select("email, partner_email")
      .eq("id", coupleId)
      .maybeSingle();

    if (coupleError || !couple?.email) {
      console.error(
        "[notifyEscalation] Could not look up couple emails",
        { coupleId, error: coupleError?.message }
      );
      return;
    }

    const recipients: string[] = [couple.email];
    if (couple.partner_email) {
      recipients.push(couple.partner_email);
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("[notifyEscalation] RESEND_API_KEY not set");
      return;
    }

    const resend = new Resend(resendKey);

    // Dashboard link — use env var when available, fall back to production URL
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://wedflow-theta.vercel.app";
    const dashboardUrl = `${appUrl}/dashboard/inbox`;

    const reasonText = REASON_COPY[reason];

    const html = `
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
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 20px; font-weight: 600; color: #1C3B2B; letter-spacing: -0.01em;">WedFlow</span>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-radius: 20px; padding: 40px 36px; border: 1px solid #f0ede8;">
              <h1 style="font-size: 24px; font-weight: 400; color: #1C3B2B; line-height: 1.3; margin: 0 0 16px; text-align: center;">
                A guest message needs your attention
              </h1>
              <p style="font-size: 15px; line-height: 1.6; color: #4a4745; margin: 0 0 12px;">
                One of your guests sent a message that we think deserves your personal touch.
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4a4745; margin: 0 0 24px;">
                ${reasonText}
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4a4745; margin: 0 0 24px;">
                We have drafted a suggested reply for you. Head to your dashboard to review it and send when you are ready.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #1C3B2B; color: #FDFBF7; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-size: 15px; font-weight: 500;">
                      View in your dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; color: #8a8580; line-height: 1.5; margin: 0; text-align: center;">
                For your guests' privacy, message content is only visible on your dashboard.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="font-size: 12px; color: #b0aca7; margin: 0;">
                Sent by WedFlow
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const { error: sendError } = await resend.emails.send({
      from: "WedFlow <onboarding@resend.dev>",
      to: recipients,
      subject: "A guest message needs your attention",
      html,
    });

    if (sendError) {
      console.error("[notifyEscalation] Resend send error", {
        messageId,
        error: sendError,
      });
      return;
    }

    console.log("[notifyEscalation] Escalation email sent", {
      messageId,
      recipientCount: recipients.length,
    });
  } catch (err) {
    console.error("[notifyEscalation] Unexpected error", {
      messageId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
