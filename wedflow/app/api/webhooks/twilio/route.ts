import { createHash } from "crypto";
import { z } from "zod";
import { validateTwilioWebhook } from "@/lib/twilio/validate";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { writeAuditLog } from "@/lib/audit/service";

// POST only — no GET handler exported
export const dynamic = "force-dynamic";

// ----------------------------------------------------------------
// Zod schema for inbound Twilio SMS webhook payload
// ----------------------------------------------------------------

const TwilioSmsPayloadSchema = z.object({
  From: z.string().min(1),
  To: z.string().min(1),
  Body: z.string(),
  MessageSid: z.string().min(1),
});

// ----------------------------------------------------------------
// DB result schemas — narrow Supabase query data safely
// ----------------------------------------------------------------

const GuestRowSchema = z.object({
  couple_id: z.string().uuid(),
});

const ConversationRowSchema = z.object({
  id: z.string().uuid(),
});

const ConversationWithCoupleRowSchema = z.object({
  id: z.string().uuid(),
  couple_id: z.string().uuid(),
});

const CoupleRowSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
});

const MessageRowSchema = z.object({
  id: z.string().uuid(),
});

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
}

/**
 * When a guest phone matches multiple couples and there's no prior conversation,
 * resolve to the most recently created couple record.
 */
async function resolveMostRecentCouple(
  supabase: ReturnType<typeof createServiceRoleClient>,
  coupleIds: string[],
  messageSid: string
): Promise<string> {
  const { data: couples, error } = await supabase
    .from("couples")
    .select("id, created_at")
    .in("id", coupleIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !couples) {
    // Should not happen — these couple IDs came from the guests table
    console.error("wedflow/sms.received: failed to resolve most recent couple", {
      messageSid,
    });
    // Fall back to first coupleId from the list
    return coupleIds[0];
  }

  const parsed = CoupleRowSchema.safeParse(couples);
  if (!parsed.success) {
    return coupleIds[0];
  }
  return parsed.data.id;
}

// ----------------------------------------------------------------
// POST /api/webhooks/twilio
// ----------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Step 1: Validate Twilio webhook signature
  const isValid = await validateTwilioWebhook(request);
  if (!isValid) {
    return new Response("Forbidden", { status: 403 });
  }

  // Step 2: Parse form-encoded body
  let payload: z.infer<typeof TwilioSmsPayloadSchema>;
  try {
    const formData = await request.formData();
    const raw = {
      From: formData.get("From"),
      To: formData.get("To"),
      Body: formData.get("Body"),
      MessageSid: formData.get("MessageSid"),
    };
    payload = TwilioSmsPayloadSchema.parse(raw);
  } catch {
    // Malformed payload — return 400 so Twilio retries with the same data
    return new Response("Bad Request", { status: 400 });
  }

  const { From, To, Body, MessageSid } = payload;
  const supabase = createServiceRoleClient();

  // Step 3: Resolve the couple by looking up the guest's phone number.
  // Beta model: all couples share one Twilio number, so we route by guest phone.
  const { data: guestRows, error: guestError } = await supabase
    .from("guests")
    .select("couple_id")
    .eq("phone", From);

  if (guestError) {
    console.error("wedflow/sms.received: guests lookup failed", {
      messageSid: MessageSid,
    });
    return new Response("", { status: 500 });
  }

  if (!guestRows || guestRows.length === 0) {
    // Guest phone not registered — return a friendly TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hi! This number isn&apos;t set up for your wedding yet. Ask your couple to add your phone number to their guest list on WedFlow.</Message></Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  let coupleId: string;

  if (guestRows.length === 1) {
    const parsed = GuestRowSchema.safeParse(guestRows[0]);
    if (!parsed.success) {
      console.error("wedflow/sms.received: unexpected guests row shape", {
        messageSid: MessageSid,
      });
      return new Response("", { status: 500 });
    }
    coupleId = parsed.data.couple_id;
  } else {
    // Edge case: guest phone matches multiple couples.
    // Use the couple with the most recent conversation with this guest.
    const guestPhoneHashForLookup = hashPhone(From);
    const coupleIds = guestRows
      .map((r) => GuestRowSchema.safeParse(r))
      .filter((r): r is { success: true; data: z.infer<typeof GuestRowSchema> } => r.success)
      .map((r) => r.data.couple_id);

    const { data: recentConv } = await supabase
      .from("conversations")
      .select("id, couple_id")
      .eq("guest_phone_hash", guestPhoneHashForLookup)
      .in("couple_id", coupleIds)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentConv) {
      const parsed = ConversationWithCoupleRowSchema.safeParse(recentConv);
      if (parsed.success) {
        coupleId = parsed.data.couple_id;
      } else {
        // Fallback: most recently created couple
        coupleId = await resolveMostRecentCouple(supabase, coupleIds, MessageSid);
      }
    } else {
      // No prior conversation — use the most recently created couple
      coupleId = await resolveMostRecentCouple(supabase, coupleIds, MessageSid);
    }
  }
  const guestPhoneHash = hashPhone(From);

  // Step 4: Find or create a conversation for this (couple, guest) pair
  const { data: existingConv, error: convLookupError } = await supabase
    .from("conversations")
    .select("id")
    .eq("couple_id", coupleId)
    .eq("guest_phone_hash", guestPhoneHash)
    .limit(1)
    .maybeSingle();

  if (convLookupError) {
    console.error("wedflow/sms.received: conversation lookup failed", {
      messageSid: MessageSid,
    });
    return new Response("", { status: 500 });
  }

  let conversationId: string;

  if (existingConv) {
    const parsed = ConversationRowSchema.safeParse(existingConv);
    if (!parsed.success) {
      console.error("wedflow/sms.received: unexpected conversations row shape", {
        messageSid: MessageSid,
      });
      return new Response("", { status: 500 });
    }
    conversationId = parsed.data.id;

    // Update last_message_at (and backfill guest_phone if missing) on the existing conversation
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString(), guest_phone: From })
      .eq("id", conversationId);

    if (updateError) {
      console.error("wedflow/sms.received: failed to update last_message_at", {
        messageSid: MessageSid,
      });
      return new Response("", { status: 500 });
    }
  } else {
    // Create a new conversation
    const { data: newConv, error: convCreateError } = await supabase
      .from("conversations")
      .insert({ couple_id: coupleId, guest_phone_hash: guestPhoneHash, guest_phone: From })
      .select("id")
      .single();

    if (convCreateError || !newConv) {
      console.error("wedflow/sms.received: failed to create conversation", {
        messageSid: MessageSid,
      });
      return new Response("", { status: 500 });
    }

    const parsed = ConversationRowSchema.safeParse(newConv);
    if (!parsed.success) {
      console.error(
        "wedflow/sms.received: unexpected new conversations row shape",
        { messageSid: MessageSid }
      );
      return new Response("", { status: 500 });
    }
    conversationId = parsed.data.id;
  }

  // Step 5: Persist the inbound message and capture its ID for the pipeline
  const { data: msgData, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      direction: "inbound",
      body: Body,
    })
    .select("id")
    .single();

  if (msgError || !msgData) {
    console.error("wedflow/sms.received: failed to persist message", {
      messageSid: MessageSid,
    });
    return new Response("", { status: 500 });
  }

  const msgParsed = MessageRowSchema.safeParse(msgData);
  if (!msgParsed.success) {
    console.error("wedflow/sms.received: unexpected messages row shape", {
      messageSid: MessageSid,
    });
    return new Response("", { status: 500 });
  }

  // Audit: message received
  await writeAuditLog({
    coupleId,
    eventType: "message_received",
    resourceType: "message",
    resourceId: msgParsed.data.id,
    metadata: { messageSid: MessageSid, conversationId },
  });

  // Step 6: Enqueue the AI pipeline — return 200 immediately (Twilio 15s timeout)
  // The full classifier → reply → safety → send flow runs inside Inngest.
  try {
    await inngest.send({
      name: "wedflow/sms.received",
      data: {
        messageId: msgParsed.data.id,
        conversationId,
        coupleId,
        body: Body,
        guestPhone: From,
        twilioNumber: To,
      },
    });
  } catch (err) {
    // Message is safely persisted — log the enqueue failure but don't return 500,
    // which would cause Twilio to retry and potentially duplicate the DB write.
    console.error("wedflow/sms.received: failed to enqueue Inngest job", {
      messageSid: MessageSid,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  console.info("wedflow/sms.received: message persisted and pipeline enqueued", {
    messageSid: MessageSid,
    coupleId,
  });

  return new Response("", { status: 200 });
}
