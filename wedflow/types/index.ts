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

// ----------------------------------------------------------------
// Circle of Care types
// ----------------------------------------------------------------

export type CircleRole = "moh" | "best_man" | "family_lead" | "bridesmaid" | "groomsman";
export type CircleMemberStatus = "invited" | "active" | "removed";
export type TaskStatus = "pending" | "in_progress" | "done" | "dismissed";

export interface CircleMember {
  id: string;
  couple_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone_hash: string | null;
  role: CircleRole;
  status: CircleMemberStatus;
  invite_token: string;
  invite_expires_at: string;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface TaskAssignment {
  id: string;
  couple_id: string;
  assigned_to: string;
  message_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}

// ----------------------------------------------------------------
// Wedding Profile
// ----------------------------------------------------------------

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
