-- ============================================================
-- 004_guest_phone.sql
-- Add guest_phone to conversations so couples can send replies
-- from the dashboard. The hash is kept for privacy-masked display;
-- the raw number is needed to send outbound SMS via Twilio.
-- Nullable to remain compatible with rows created before this migration.
-- ============================================================

ALTER TABLE conversations ADD COLUMN guest_phone TEXT;
