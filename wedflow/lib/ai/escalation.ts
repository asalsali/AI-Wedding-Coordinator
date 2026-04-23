import Anthropic from "@anthropic-ai/sdk";
import { WeddingProfile } from "@/types";
import { ESCALATION_DRAFT_PROMPT } from "./prompts";

// requires: ANTHROPIC_API_KEY

export async function draftEscalationReply(
  message: string,
  profile: WeddingProfile,
  client: Anthropic
): Promise<string> {
  const profileContext = buildProfileContext(profile);

  let rawText: string;

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 300,
      temperature: 0.6,
      system: ESCALATION_DRAFT_PROMPT,
      messages: [
        {
          role: "user",
          content: `Couple's wedding profile:\n${profileContext}\n\nGuest message to respond to:\n"${message}"`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected non-text response from escalation drafter");
    }
    rawText = block.text.trim();
  } catch (err) {
    throw new Error(
      `Escalation drafter AI call failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!rawText) {
    throw new Error("Escalation drafter returned an empty response");
  }

  return rawText;
}

function buildProfileContext(profile: WeddingProfile): string {
  const lines: string[] = [];

  if (profile.tone) lines.push(`Tone: ${profile.tone}`);
  if (profile.vibe_word) lines.push(`Vibe: ${profile.vibe_word}`);
  if (profile.sample_message)
    lines.push(`Sample message style: "${profile.sample_message}"`);
  if (profile.venue_name) lines.push(`Venue: ${profile.venue_name}`);
  if (profile.venue_address) lines.push(`Address: ${profile.venue_address}`);
  if (profile.ceremony_time) lines.push(`Ceremony time: ${profile.ceremony_time}`);
  if (profile.reception_time) lines.push(`Reception time: ${profile.reception_time}`);
  if (profile.dress_code) lines.push(`Dress code: ${profile.dress_code}`);
  if (profile.hotel_block) lines.push(`Hotel block: ${profile.hotel_block}`);
  if (profile.parking_info) lines.push(`Parking: ${profile.parking_info}`);
  if (profile.registry_links && profile.registry_links.length > 0)
    lines.push(`Registry: ${profile.registry_links.join(", ")}`);

  if (profile.faqs.length > 0) {
    lines.push("");
    lines.push("Couple's FAQs:");
    for (const faq of profile.faqs) {
      lines.push(`  Q: ${faq.question}`);
      lines.push(`  A: ${faq.answer}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "(No profile details available.)";
}
