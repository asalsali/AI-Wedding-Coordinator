import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getTwilioClient } from "@/lib/twilio/client";
import { classifyMessage, shouldEscalate } from "@/lib/ai/classifier";
import { generateReply } from "@/lib/ai/reply";
import { checkReplySafety } from "@/lib/ai/safety";
import { draftEscalationReply } from "@/lib/ai/escalation";
import { WeddingProfile, Faq, ToneStyle } from "@/types";

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
  const supabase = getSupabaseServerClient();

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
      return { skipped: true, reason: "no_profile" };
    }

    // Step 2: Classify the message
    const classification = await step.run("classify", () => {
      const client = new Anthropic();
      return classifyMessage(body, client);
    });

    const escalate = shouldEscalate(classification);

    // Step 3a: Escalation path (sensitive or low-confidence unclear)
    if (escalate) {
      const draft = await step.run("draft-escalation", () => {
        const client = new Anthropic();
        return draftEscalationReply(body, profile, client);
      });

      await step.run("persist-escalation", async () => {
        const supabase = getSupabaseServerClient();
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
        const supabase = getSupabaseServerClient();
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
        });
      });

      return { escalated: true, reason: "safety_check_failed" };
    }

    // Step 5: Send outbound SMS via Twilio
    await step.run("send-reply", async () => {
      const twilioClient = getTwilioClient();

      console.log("[send-reply] Sending SMS", {
        toNumber: guestPhone,
        fromNumber: twilioNumber,
        messageLength: reply.length,
      });

      const twilioResponse = await twilioClient.messages.create({
        body: reply,
        from: twilioNumber,
        to: guestPhone,
      });

      console.log("[send-reply] Twilio response", twilioResponse);

      if (twilioResponse == null) {
        throw new Error(
          `[send-reply] Twilio returned null/undefined for messageId=${messageId}`
        );
      }
    });

    // Step 6: Persist outbound message and mark inbound as classified
    await step.run("persist-outbound", async () => {
      const supabase = getSupabaseServerClient();
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

    return { sent: true };
  }
);
