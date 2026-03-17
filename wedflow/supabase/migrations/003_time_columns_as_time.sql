-- ============================================================
-- 003_time_columns_as_time.sql
-- Change ceremony_time and reception_time from TIMESTAMPTZ to
-- TIME so times are stored timezone-free (e.g. "15:30").
-- ============================================================

ALTER TABLE wedding_profiles
  ALTER COLUMN ceremony_time TYPE TIME
  USING ceremony_time::TIME;

ALTER TABLE wedding_profiles
  ALTER COLUMN reception_time TYPE TIME
  USING reception_time::TIME;
