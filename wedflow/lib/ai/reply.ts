import Anthropic from "@anthropic-ai/sdk";
import { WeddingProfile } from "@/types";
import { REPLY_SYSTEM_PROMPT } from "./prompts";

// requires: ANTHROPIC_API_KEY

export async function generateReply(
  message: string,
  profile: WeddingProfile,
  client: Anthropic
): Promise<string> {
  let rawText: string;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      temperature: 0.7,
      system: REPLY_SYSTEM_PROMPT(profile),
      messages: [{ role: "user", content: message }],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected non-text response from reply generator");
    }
    rawText = block.text.trim();
  } catch (err) {
    throw new Error(
      `Reply generator AI call failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!rawText) {
    throw new Error("Reply generator returned an empty response");
  }

  return rawText;
}
