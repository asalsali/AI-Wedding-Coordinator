import { WeddingProfile } from "@/types";

// ----------------------------------------------------------------
// Safety check — pure TypeScript, no AI calls.
// Conservative by design: block on any doubt.
// Returns false if the reply contains any verifiable fact (time,
// address, dress code, URL) that cannot be confirmed against the
// wedding profile. False positives are acceptable — a blocked reply
// that escalates is always safer than a sent reply with wrong info.
// ----------------------------------------------------------------

// ----------------------------------------------------------------
// Patterns for extracting verifiable claims from a reply
// ----------------------------------------------------------------

const URL_PATTERN = /https?:\/\/[^\s]+/gi;

// Matches: "3pm", "3 PM", "3:00 pm", "3:30 PM", "11:00 AM"
const TIME_PATTERN = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi;

// Matches: "123 Oak Street", "45 Main Ave", "1 Grand Blvd"
const ADDRESS_PATTERN =
  /\b\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)?\s+(?:street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|court|ct|place|pl)\b/gi;

// Specific dress code terms the AI might include in a reply
const DRESS_CODE_TERMS = [
  "black tie optional",
  "creative black tie",
  "black tie",
  "white tie",
  "cocktail attire",
  "semi-formal",
  "business casual",
  "smart casual",
  "casual attire",
  "beach formal",
  "garden party",
  "festive attire",
  "lounge suit",
];

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Extracts hours and minutes from a time string and generates all reasonable
 * string representations the AI might use when formatting a time in a reply.
 *
 * Accepts both ISO datetime ("2024-06-15T15:00:00-05:00") and plain HH:MM ("15:00", "14:30").
 *
 * Example: "15:00" → ["3pm", "3 pm", "3:00pm", "3:00 pm", "15:00"]
 */
function generateTimeVariants(timeString: string): string[] {
  // Try ISO format first (has T prefix), then plain HH:MM
  const match = timeString.match(/T(\d{2}):(\d{2})/) ?? timeString.match(/^(\d{2}):(\d{2})/);
  if (!match) return [];

  const h24 = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? "pm" : "am";
  const minPart = min > 0 ? `:${String(min).padStart(2, "0")}` : "";
  const minPartPadded = `:${String(min).padStart(2, "0")}`;

  return [
    `${h12}${minPart}${ampm}`,           // "3pm" or "3:30pm"
    `${h12}${minPart} ${ampm}`,          // "3 pm" or "3:30 pm"
    `${h12}${minPartPadded}${ampm}`,     // "3:00pm"
    `${h12}${minPartPadded} ${ampm}`,   // "3:00 pm"
    `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`, // "15:00"
  ];
}

/** Normalize a time string for comparison: lowercase, remove spaces. */
function normalizeTime(t: string): string {
  return t.toLowerCase().replace(/\s+/g, "");
}

/**
 * Build a searchable lowercase corpus from all verifiable text facts
 * in the profile, including time variants derived from ISO timestamps.
 */
function buildCorpus(profile: WeddingProfile): string {
  const textParts: Array<string | null | undefined> = [
    profile.venue_name,
    profile.venue_address,
    profile.dress_code,
    profile.hotel_block,
    profile.parking_info,
    profile.vibe_word,
    profile.sample_message,
    ...(profile.registry_links ?? []),
    ...profile.faqs.map((f) => `${f.question} ${f.answer}`),
  ];

  const timeVariants: string[] = [
    ...(profile.ceremony_time
      ? generateTimeVariants(profile.ceremony_time)
      : []),
    ...(profile.reception_time
      ? generateTimeVariants(profile.reception_time)
      : []),
  ];

  return [
    ...textParts.filter((p): p is string => typeof p === "string" && p.length > 0),
    ...timeVariants,
  ]
    .join(" ")
    .toLowerCase();
}

// ----------------------------------------------------------------
// Main safety check
// ----------------------------------------------------------------

/**
 * Returns true if the reply is safe to send — all verifiable facts
 * in the reply can be confirmed against the wedding profile.
 * Returns false if any fact cannot be verified (block + escalate).
 */
export function checkReplySafety(
  reply: string,
  profile: WeddingProfile
): boolean {
  // Empty reply is always unsafe
  if (!reply || reply.trim().length === 0) return false;

  const replyLower = reply.toLowerCase();
  const corpus = buildCorpus(profile);

  // 1. URL check — every URL in the reply must exactly match a registry link
  const replyUrls = reply.match(URL_PATTERN) ?? [];
  const profileUrls = (profile.registry_links ?? []).map((u) =>
    u.toLowerCase()
  );
  for (const url of replyUrls) {
    if (!profileUrls.includes(url.toLowerCase())) {
      return false;
    }
  }

  // 2. Dress code check — any specific term must appear in corpus
  // (checked longest-first so "black tie optional" beats "black tie")
  for (const term of DRESS_CODE_TERMS) {
    if (replyLower.includes(term) && !corpus.includes(term)) {
      return false;
    }
  }

  // 3. Time check — extract time patterns from reply, normalize, verify in corpus
  const replyTimes = (reply.match(TIME_PATTERN) ?? []).map(normalizeTime);
  for (const t of replyTimes) {
    if (!corpus.includes(t)) {
      return false;
    }
  }

  // 4. Street address check — any address must appear (lowercased) in corpus
  const replyAddresses = (reply.match(ADDRESS_PATTERN) ?? []).map((a) =>
    a.toLowerCase()
  );
  for (const addr of replyAddresses) {
    if (!corpus.includes(addr)) {
      return false;
    }
  }

  return true;
}
