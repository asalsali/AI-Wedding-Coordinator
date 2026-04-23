-- ============================================================
-- 011_guests_and_circle_fixup.sql
-- Run this ONCE in Supabase SQL editor.
-- Creates the guests table (from 007) with corrected RLS
-- (auth_user_id instead of clerk_user_id), then applies the
-- guests-dependent objects from 010 that were skipped.
-- ============================================================

-- ============================================================
-- PART 1: Guests table + audit_logs (from 007, corrected)
-- ============================================================

-- Enums (skip if they already exist from a partial 007 run)
DO $$ BEGIN
  CREATE TYPE guest_group AS ENUM ('bride_family', 'groom_family', 'bridal_party', 'friends', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE rsvp_status AS ENUM ('pending', 'yes', 'no', 'maybe');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  rsvp_status rsvp_status NOT NULL DEFAULT 'pending',
  rsvp_guest_count INT NOT NULL DEFAULT 0,
  dietary_restrictions TEXT,
  plus_one BOOLEAN NOT NULL DEFAULT false,
  plus_one_name TEXT,
  group_tag guest_group NOT NULL DEFAULT 'other',
  notes TEXT,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  error_message TEXT
);

-- RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Guests: couple can CRUD their own guests (corrected: auth_user_id)
DROP POLICY IF EXISTS "guests: own rows only" ON guests;
CREATE POLICY "guests: own rows only"
  ON guests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = guests.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = guests.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  );

-- Audit logs: couple can read their own logs (corrected: auth_user_id)
DROP POLICY IF EXISTS "audit_logs: own rows only" ON audit_logs;
CREATE POLICY "audit_logs: own rows only"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = audit_logs.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guests_couple_id ON guests(couple_id);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guests_group_tag ON guests(group_tag);
CREATE INDEX IF NOT EXISTS idx_audit_logs_couple_id ON audit_logs(couple_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PART 2: Guests-dependent objects from 010 (skipped earlier)
-- ============================================================

-- Composite index for portal role-filtered queries
CREATE INDEX IF NOT EXISTS idx_guests_couple_group_tag
  ON guests(couple_id, group_tag);

-- Circle members can read conversations matching their role's guest groups
DROP POLICY IF EXISTS "conversations: circle member reads by guest group" ON conversations;
CREATE POLICY "conversations: circle member reads by guest group"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM circle_members cm
      JOIN guests g ON g.couple_id = cm.couple_id
        AND g.conversation_id = conversations.id
      WHERE cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND (
          (cm.role IN ('moh', 'bridesmaid') AND g.group_tag = 'bridal_party')
          OR (cm.role IN ('best_man', 'groomsman') AND g.group_tag = 'bridal_party')
          OR (cm.role = 'family_lead' AND g.group_tag IN ('bride_family', 'groom_family'))
        )
    )
  );

-- Circle members can read messages in accessible conversations
DROP POLICY IF EXISTS "messages: circle member reads accessible conversations" ON messages;
CREATE POLICY "messages: circle member reads accessible conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      JOIN circle_members cm ON cm.user_id = auth.uid() AND cm.status = 'active'
      JOIN guests g ON g.couple_id = cm.couple_id AND g.conversation_id = c.id
      WHERE c.id = messages.conversation_id
        AND (
          (cm.role IN ('moh', 'bridesmaid', 'best_man', 'groomsman') AND g.group_tag = 'bridal_party')
          OR (cm.role = 'family_lead' AND g.group_tag IN ('bride_family', 'groom_family'))
        )
    )
  );
