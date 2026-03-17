import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type Classification = "routine" | "sensitive" | "unclear";

export interface ClassificationResult {
  classification: Classification;
  confidence: number; // 0.0 – 1.0
  reason: string;
  triggeredHardRule: boolean;
}

// ----------------------------------------------------------------
// Hard-coded sensitive patterns (enforced in TypeScript, not prompt)
// These fire BEFORE the AI is called — no LLM can override them.
// ----------------------------------------------------------------

const ALWAYS_SENSITIVE_PATTERNS: RegExp[] = [
  /\b(cancer|diagnosis|diagnosed|illness|sick|hospital|surgery)\b/i,
  /\b(died|death|funeral|passed away|grieving|grief)\b/i,
  /\b(divorce|separated|not coming together|coming alone)\b/i,
  /\b(can't make it|cannot attend|won't be able|unable to attend)\b/i,
  /\b(sorry|apologi|feel terrible|feel awful|feel bad)\b/i,
  /\b(pregnant|expecting|due date|having a baby)\b/i,
  /\b(fight|argument|issue between|problem with|falling out)\b/i,
  /\b(mental health|anxiety|depression|panic)\b/i,
];

function matchesHardRule(message: string): string | null {
  for (const pattern of ALWAYS_SENSITIVE_PATTERNS) {
    const match = message.match(pattern);
    if (match) return match[0];
  }
  return null;
}

// ----------------------------------------------------------------
// Zod schema — validates raw AI JSON response
// ----------------------------------------------------------------

const ClassifierResponseSchema = z.object({
  classification: z.enum(["routine", "sensitive", "unclear"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(300),
});

// ----------------------------------------------------------------
// System prompt — edit with care; test suite must pass after changes
// ----------------------------------------------------------------

const CLASSIFIER_SYSTEM_PROMPT = `You are a message classifier for Wedflow, an AI wedding coordinator.

Your job is to classify incoming SMS messages from wedding guests into one of three categories:

ROUTINE — factual, logistical questions with clear answers from the wedding profile.
Examples: dress code, start time, venue address, parking, registry link, hotel block, schedule.

SENSITIVE — messages with emotional weight, personal news, or complex interpersonal context
that the couple must handle personally. When in doubt, classify as sensitive.
Examples: health issues, bereavement, relationship problems, the guest can't attend,
apologies for something serious, pregnancy announcements, family conflict.

UNCLEAR — the message is ambiguous, combines routine and sensitive elements, or you cannot
determine the intent with confidence. Use this when you are genuinely unsure.

Rules you must follow:
- Err heavily toward SENSITIVE. A false negative (calling something routine when it's sensitive)
  is far worse than a false positive.
- Short, neutral questions about logistics are ROUTINE.
- Any emotional language, personal news, or apology → SENSITIVE.
- If a message has both logistical and emotional content → SENSITIVE.
- Questions about bringing extra guests (plus-ones, children) are UNCLEAR — they have
  real logistical implications the couple must decide.

Respond ONLY with a JSON object in this exact format, no preamble, no markdown:
{
  "classification": "routine" | "sensitive" | "unclear",
  "confidence": <float between 0.0 and 1.0>,
  "reason": "<one sentence explaining your classification>"
}`;

// ----------------------------------------------------------------
// Main classifier function
// ----------------------------------------------------------------

export async function classifyMessage(
  message: string,
  client: Anthropic
): Promise<ClassificationResult> {
  // Guard: empty or whitespace-only message
  if (!message || message.trim().length === 0) {
    throw new Error("Cannot classify an empty message");
  }

  // Step 1: Check hard-coded patterns before calling AI
  const triggeredRule = matchesHardRule(message);
  if (triggeredRule) {
    return {
      classification: "sensitive",
      confidence: 1.0,
      reason: `Hard rule triggered: matched pattern "${triggeredRule}"`,
      triggeredHardRule: true,
    };
  }

  // Step 2: Call AI classifier
  let rawText: string;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      temperature: 0.3,
      system: CLASSIFIER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Classify this wedding guest message:\n\n"${message}"`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected non-text response from classifier");
    }
    rawText = block.text.trim();
  } catch (err) {
    // AI call failed — escalate rather than guess
    throw new Error(
      `Classifier AI call failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Step 3: Parse and validate JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Classifier returned malformed JSON: ${rawText.slice(0, 200)}`
    );
  }

  const validated = ClassifierResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Classifier response failed validation: ${validated.error.message}`
    );
  }

  return {
    ...validated.data,
    triggeredHardRule: false,
  };
}

// ----------------------------------------------------------------
// Decision helper — used by the pipeline to route after classifying
// ----------------------------------------------------------------

export const CONFIDENCE_THRESHOLD = 0.75;

export function shouldEscalate(result: ClassificationResult): boolean {
  if (result.classification === "sensitive") return true;
  if (result.classification === "unclear" && result.confidence < CONFIDENCE_THRESHOLD)
    return true;
  return false;
}
