-- 014_churn_tracking.sql
-- Churn detection columns on couples table for the church pilot.
-- Tracks consecutive active weeks and flags couples who stop using the product.

-- Note: last_active_at is added by migration 013_analytics.sql.
-- We use IF NOT EXISTS defensively but do not re-add it here.

ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS usage_streak_weeks INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS churned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS churn_status TEXT NOT NULL DEFAULT 'active';

-- Constraint to enforce valid churn_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'couples_churn_status_check'
  ) THEN
    ALTER TABLE couples
      ADD CONSTRAINT couples_churn_status_check
      CHECK (churn_status IN ('active', 'at_risk', 'churned'));
  END IF;
END $$;

-- Index for quick filtering by churn status (e.g. weekly cron)
CREATE INDEX IF NOT EXISTS idx_couples_churn_status
  ON couples(churn_status);
