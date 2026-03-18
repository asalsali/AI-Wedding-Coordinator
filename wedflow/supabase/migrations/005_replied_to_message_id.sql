-- ============================================================
-- 005_replied_to_message_id.sql
-- Add replied_to_message_id to messages so outbound replies can
-- be linked to the specific inbound message they answer.
-- Enables per-message "needs reply" tracking on the dashboard.
-- Nullable: existing rows have no explicit link.
-- ============================================================

ALTER TABLE messages
  ADD COLUMN replied_to_message_id UUID REFERENCES messages(id);
