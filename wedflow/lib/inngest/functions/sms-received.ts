import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTwilioClient } from "@/lib/twilio/client";
import { classifyMessage, shouldEscalate } from "@/lib/ai/classifier";
import { generateReply } from "@/lib/ai/reply";
import { checkReplySafety } from "@/lib/ai/safety";
import { draftEscalationReply } from "@/lib/ai/escalation";
import { WeddingProfile, Faq, ToneStyle } from "@/types";
import { writeAuditLog } from "@/lib/audit/service";
import { notifyEscalation } from "@/lib/notifications/escalation";
import { sendPushToCouple } from "@/lib/push/send";

// requires: ANTHROPIC_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
// requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// requires: INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY

// ----------------------------------------------------------------
// Event payload schema
// ----------------------------------------------------------------

const SmsReceivedPayloadSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  coupleId: z.string().uuid(),
  body: z.string(),
  guestPhone: z.string().min(1),
  twilioNumber: z.string().min(1),
});

// ----------------------------------------------------------------
// DB row schemas — narrow Supabase query results safely
// ----------------------------------------------------------------

const WeddingProfileRowSchema = z.object({
  id: z.string().uuid(),
  couple_id: z.string().uuid(),
  venue_name: z.string().nullable(),
  venue_address: z.string().nullable(),
  ceremony_time: z.string().nullable(),
  reception_time: z.string().nullable(),
  dress_code: z.string().nullable(),
  registry_links: z.array(z.string()).nullable(),
  hotel_block: z.string().nullable(),
  parking_info: z.string().nullable(),
  tone: z.enum(["warm", "elegant", "playful"]).nullable(),
  vibe_word: z.string().nullable(),
  sample_message: z.string().nullable(),
  readiness_score: z.number(),
});

const FaqRowSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  answer: z.string(),
  display_order: z.number(),
});

// ----------------------------------------------------------------
// Profile loader
// ----------------------------------------------------------------

async function fetchWeddingProfile(
  coupleId: string
): Promise<WeddingProfile | null> {
  const supabase = createServiceRoleClient();

  const { data: profileRow, error: profileError } = await supabase
    .from("wedding_profiles")
    .select(
      "id, couple_id, venue_name, venue_address, ceremony_time, reception_time, dress_code, registry_links, hotel_block, parking_info, tone, vibe_word, sample_message, readiness_score"
    )
    .eq("couple_id", coupleId)
    .maybeSingle();

  if (profileError || !profileRow) return null;

  const parsedProfile = WeddingProfileRowSchema.safeParse(profileRow);
  if (!parsedProfile.success) return null;

  const { data: faqRows } = await supabase
    .from("faqs")
    .select("id, question, answer, display_order")
    .eq("couple_id", coupleId)
    .order("display_order", { ascending: true });

  const faqs: Faq[] = (faqRows ?? [])
    .map((row) => FaqRowSchema.safeParse(row))
    .filter((r): r is { success: true; data: Faq } => r.success)
    .map((r) => r.data);

  return {
    ...parsedProfile.data,
    tone: parsedProfile.data.tone as ToneStyle | null,
    faqs,
  };
}

// ----------------------------------------------------------------
// Inngest function — full SMS pipeline
// ----------------------------------------------------------------

export const smsReceived = inngest.createFunction(
  {
    id: "sms-received",
    name: "wedflow/sms.received",
    triggers: [{ event: "wedflow/sms.received" }],
  },
  async ({ event, step }) => {
    // Validate event payload — Inngest retries on throw
    const payload = SmsReceivedPayloadSchema.parse(event.data);
    const { messageId, conversationId, coupleId, body, guestPhone, twilioNumber } =
      payload;

    // Step 1: Fetch wedding profile (with FAQs)
    const profile = await step.run("fetch-profile", () =>
      fetchWeddingProfile(coupleId)
    );

    if (!profile) {
      // Couple hasn't finished onboarding — no profile to reply from. Skip silently.
      await step.run("audit-no-profile", () =>
        writeAuditLog({
          coupleId,
          eventType: "message_failed",
          resourceType: "message",
          resourceId: messageId,
          metadata: { reason: "no_profile" },
        })
      );
      return { skipped: true, reason: "no_profile" };
    }

    // Step 2: Classify the message
    const classification = await step.run("classify", () => {
      const client = new Anthropic();
      return classifyMessage(body, client);
    });

    // Audit: classification result
    await step.run("audit-classified", () =>
      writeAuditLog({
        coupleId,
        eventType: "message_classified",
        resourceType: "message",
        resourceId: messageId,
        metadata: {
          classification: classification.classification,
          confidence: classification.confidence,
        },
      })
    );

    const escalate = shouldEscalate(classification);

    // Step 3a: Escalation path (sensitive or low-confidence unclear)
    if (escalate) {
      const draft = await step.run("draft-escalation", () => {
        const client = new Anthropic();
        return draftEscalationReply(body, profile, client);
      });

      await step.run("persist-escalation", async () => {
        const supabase = createServiceRoleClient();
        const now = new Date().toISOString();

        // Update inbound message with classification and escalation timestamp
        await supabase
          .from("messages")
          .update({
            classified_as: "escalated",
            ai_confidence: classification.confidence,
            escalated_at: now,
          })
          .eq("id", messageId);

        // Persist draft as an unsent outbound message for the dashboard to surface
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          direction: "outbound",
          body: draft,
          classified_as: "escalated",
          was_sent: false,
          escalated_at: now,
          replied_to_message_id: messageId,
        });
      });

      // Audit: escalation due to classification
      await step.run("audit-escalated-classification", () =>
        writeAuditLog({
          coupleId,
          eventType: "message_escalated",
          resourceType: "message",
          resourceId: messageId,
          metadata: {
            reason: "classification",
            classification: classification.classification,
            confidence: classification.confidence,
          },
        })
      );

      // Notify couple via email
      await step.run("notify-escalation-classification", () =>
        notifyEscalation(coupleId, "classification", messageId)
      );

      // Push notification to couple's devices (best-effort, non-blocking)
      await step.run("push-notify-classification", async () => {
        try {
          await sendPushToCouple(coupleId, {
            title: "Message needs your attention",
            body: body.slice(0, 40) + (body.length > 40 ? "..." : ""),
            data: { url: "/dashboard" },
          });
        } catch {
          // Push is additive — failure does not block escalation
        }
      });

      // Track metrics: inbound message + escalation
      await step.run("metrics-escalation-classification", async () => {
        const supabase = createServiceRoleClient();
        const today = new Date().toISOString().slice(0, 10);
        await supabase.rpc("increment_couple_metrics", {
          p_couple_id: coupleId,
          p_date: today,
          p_messages_received: 1,
          p_escalations: 1,
        });
      });

      return { escalated: true, reason: "classification" };
    }

    // Step 3b: Reply path — generate AI reply
    const reply = await step.run("generate-reply", () => {
      const client = new Anthropic();
      return generateReply(body, profile, client);
    });

    // Step 4: Safety check — pure TypeScript, no AI call
    const isSafe = await step.run("check-safety", () =>
      checkReplySafety(reply, profile)
    );

    if (!isSafe) {
      // Safety check failed — escalate with a draft rather than sending wrong info
      const draft = await step.run("draft-safety-escalation", () => {
        const client = new Anthropic();
        return draftEscalationReply(body, profile, client);
      });

      await step.run("persist-safety-escalation", async () => {
        const supabase = createServiceRoleClient();
        const now = new Date().toISOString();

        await supabase
          .from("messages")
          .update({
            classified_as: "escalated",
            ai_confidence: classification.confidence,
            escalated_at: now,
          })
          .eq("id", messageId);

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          direction: "outbound",
          body: draft,
          classified_as: "escalated",
          was_sent: false,
          escalated_at: now,
          replied_to_message_id: messageId,
        });
      });

      // Audit: escalation due to safety check failure
      await step.run("audit-escalated-safety", () =>
        writeAuditLog({
          coupleId,
          eventType: "message_escalated",
          resourceType: "message",
          resourceId: messageId,
          metadata: {
            reason: "safety_check_failed",
            classification: classification.classification,
            confidence: classification.confidence,
          },
        })
      );

      // Notify couple via email
      await step.run("notify-escalation-safety", () =>
        notifyEscalation(coupleId, "safety_check_failed", messageId)
      );

      // Push notification to couple's devices (best-effort, non-blocking)
      await step.run("push-notify-safety", async () => {
        try {
          await sendPushToCouple(coupleId, {
            title: "Message needs your attention",
            body: body.slice(0, 40) + (body.length > 40 ? "..." : ""),
            data: { url: "/dashboard" },
          });
        } catch {
          // Push is additive — failure does not block escalation
        }
      });

      // Track metrics: inbound message + escalation (safety)
      await step.run("metrics-escalation-safety", async () => {
        const supabase = createServiceRoleClient();
        const today = new Date().toISOString().slice(0, 10);
        await supabase.rpc("increment_couple_metrics", {
          p_couple_id: coupleId,
          p_date: today,
          p_messages_received: 1,
          p_escalations: 1,
        });
      });

      return { escalated: true, reason: "safety_check_failed" };
    }

    // Step 5: Send outbound SMS via Twilio
    const twilioSid = await step.run("send-reply", async () => {
      const twilioClient = getTwilioClient();

      console.log("[send-reply] Sending SMS", {
        messageId,
        fromNumber: twilioNumber,
        messageLength: reply.length,
      });

      const twilioResponse = await twilioClient.messages.create({
        body: reply,
        from: twilioNumber,
        to: guestPhone,
      });

      console.log("[send-reply] Twilio SID", twilioResponse?.sid);

      if (twilioResponse == null) {
        throw new Error(
          `[send-reply] Twilio returned null/undefined for messageId=${messageId}`
        );
      }

      return twilioResponse.sid;
    });

    // Step 6: Persist outbound message and mark inbound as classified
    await step.run("persist-outbound", async () => {
      const supabase = createServiceRoleClient();
      const now = new Date().toISOString();

      await supabase
        .from("messages")
        .update({
          classified_as: classification.classification,
          ai_confidence: classification.confidence,
        })
        .eq("id", messageId);

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        body: reply,
        classified_as: classification.classification,
        was_sent: true,
        sent_at: now,
      });
    });

    // Audit: message sent successfully
    await step.run("audit-sent", () =>
      writeAuditLog({
        coupleId,
        eventType: "message_sent",
        resourceType: "message",
        resourceId: messageId,
        metadata: {
          twilioSid: twilioSid ?? null,
          classification: classification.classification,
          confidence: classification.confidence,
        },
      })
    );

    // Track metrics: inbound message + auto-reply
    await step.run("metrics-auto-reply", async () => {
      const supabase = createServiceRoleClient();
      const today = new Date().toISOString().slice(0, 10);
      await supabase.rpc("increment_couple_metrics", {
        p_couple_id: coupleId,
        p_date: today,
        p_messages_received: 1,
        p_messages_auto_replied: 1,
      });
    });

    return { sent: true };
  }
);
