-- ============================================================
-- 002_onboarding_fields.sql
-- Adds fields required for the 7-step onboarding flow.
-- ============================================================

-- couples: partner identity + invite
ALTER TABLE couples ADD COLUMN IF NOT EXISTS your_name    TEXT;
ALTER TABLE couples ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE couples ADD COLUMN IF NOT EXISTS partner_email TEXT;

-- wedding_profiles: date + activation flag
ALTER TABLE wedding_profiles ADD COLUMN IF NOT EXISTS wedding_date DATE;
ALTER TABLE wedding_profiles ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT false;
