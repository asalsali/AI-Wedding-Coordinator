import Anthropic from "@anthropic-ai/sdk";
import { WeddingProfile } from "@/types";
import { ESCALATION_DRAFT_PROMPT } from "./prompts";

// requires: ANTHROPIC_API_KEY

export async function draftEscalationReply(
  message: string,
  profile: WeddingProfile,
  client: Anthropic
): Promise<string> {
  // Inject minimal profile context so the tone/vibe informs the draft.
  // Full logistics are deliberately omitted — the couple adds those when editing.
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
          content: `Couple's profile (tone only — do not include logistics in the draft):\n${profileContext}\n\nGuest message to respond to:\n"${message}"`,
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
  const parts: string[] = [];
  if (profile.tone) parts.push(`Tone: ${profile.tone}`);
  if (profile.vibe_word) parts.push(`Vibe: ${profile.vibe_word}`);
  if (profile.sample_message)
    parts.push(`Sample message style: "${profile.sample_message}"`);
  return parts.length > 0 ? parts.join("\n") : "(No tone details available.)";
}
