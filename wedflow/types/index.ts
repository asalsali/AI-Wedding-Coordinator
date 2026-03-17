// ----------------------------------------------------------------
// Shared TypeScript types for Wedflow
// ----------------------------------------------------------------

export interface Faq {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export type ToneStyle = "warm" | "elegant" | "playful";

export interface WeddingProfile {
  id: string;
  couple_id: string;
  venue_name: string | null;
  venue_address: string | null;
  /** ISO datetime string — stored as TIMESTAMPTZ in Postgres */
  ceremony_time: string | null;
  /** ISO datetime string — stored as TIMESTAMPTZ in Postgres */
  reception_time: string | null;
  dress_code: string | null;
  registry_links: string[] | null;
  hotel_block: string | null;
  parking_info: string | null;
  tone: ToneStyle | null;
  vibe_word: string | null;
  sample_message: string | null;
  readiness_score: number;
  faqs: Faq[];
}
