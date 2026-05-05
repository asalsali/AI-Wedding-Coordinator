-- 013_analytics.sql
-- Daily per-couple metrics snapshots for the Base church pilot.

-- 1. couple_metrics table
CREATE TABLE IF NOT EXISTS couple_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_received INT NOT NULL DEFAULT 0,
  messages_auto_replied INT NOT NULL DEFAULT 0,
  escalations INT NOT NULL DEFAULT 0,
  drafts_used INT NOT NULL DEFAULT 0,
  drafts_rewritten INT NOT NULL DEFAULT 0,
  inbox_opens INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(couple_id, date)
);

-- RLS: couples can only read their own metrics
ALTER TABLE couple_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples can read own metrics"
  ON couple_metrics FOR SELECT
  USING (couple_id IN (
    SELECT id FROM couples WHERE auth_user_id = auth.uid()
  ));

-- Index for fast lookups by couple + date range
CREATE INDEX idx_couple_metrics_couple_date
  ON couple_metrics(couple_id, date DESC);

-- 2. Add tracking columns to couples table
ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
