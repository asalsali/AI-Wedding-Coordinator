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

export type GuestGroup = "bride_family" | "groom_family" | "bridal_party" | "friends" | "other";
export type RsvpStatus = "pending" | "yes" | "no" | "maybe";

export interface Guest {
  id: string;
  created_at: string;
  updated_at: string;
  couple_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  rsvp_status: RsvpStatus;
  rsvp_guest_count: number;
  dietary_restrictions: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  group_tag: GuestGroup;
  notes: string | null;
  conversation_id: string | null;
}

export type AuditEventType =
  | "message_received"
  | "message_classified"
  | "message_sent"
  | "message_escalated"
  | "message_failed"
  | "guest_created"
  | "guest_updated"
  | "guest_rsvp_via_sms"
  | "number_provisioned"
  | "number_released";

export interface AuditLog {
  id: string;
  created_at: string;
  couple_id: string | null;
  event_type: AuditEventType;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
}

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
