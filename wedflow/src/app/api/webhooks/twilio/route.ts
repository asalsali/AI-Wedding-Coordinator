import { createHash } from "crypto";
import { z } from "zod";
import { validateTwilioWebhook } from "@/lib/twilio/validate";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

const PhoneNumberRowSchema = z.object({
  couple_id: z.string().uuid(),
});

const ConversationRowSchema = z.object({
  id: z.string().uuid(),
});

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone).digest("hex");
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
  const supabase = getSupabaseServerClient();

  // Step 3: Look up the couple by the Twilio number they were texted on
  const { data: phoneRow, error: phoneError } = await supabase
    .from("phone_numbers")
    .select("couple_id")
    .eq("twilio_number", To)
    .eq("status", "active")
    .single();

  if (phoneError || !phoneRow) {
    // Number not registered to any couple — acknowledge and discard
    // Log message ID only, never log body content
    console.info("wedflow/sms.received: unregistered number", {
      messageSid: MessageSid,
      to: To,
    });
    return new Response("", { status: 200 });
  }

  const phoneRowParsed = PhoneNumberRowSchema.safeParse(phoneRow);
  if (!phoneRowParsed.success) {
    console.error("wedflow/sms.received: unexpected phone_numbers row shape", {
      messageSid: MessageSid,
    });
    return new Response("", { status: 500 });
  }

  const { couple_id: coupleId } = phoneRowParsed.data;
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

    // Update last_message_at on the existing conversation
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
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
      .insert({ couple_id: coupleId, guest_phone_hash: guestPhoneHash })
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

  // Step 5: Persist the inbound message
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "inbound",
    body: Body,
  });

  if (msgError) {
    console.error("wedflow/sms.received: failed to persist message", {
      messageSid: MessageSid,
    });
    return new Response("", { status: 500 });
  }

  console.info("wedflow/sms.received: message persisted", {
    messageSid: MessageSid,
    coupleId,
  });

  return new Response("", { status: 200 });
}
