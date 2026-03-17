-- ============================================================
-- 001_initial_schema.sql
-- Wedflow initial schema: couples, phone_numbers, wedding_profiles,
-- faqs, conversations, messages.
-- RLS: uses (auth.jwt() ->> 'sub') = clerk_user_id (Option A).
-- Requires a Clerk JWT template configured in Supabase dashboard
-- so that Supabase trusts Clerk-issued tokens.
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

CREATE TYPE phone_number_status   AS ENUM ('active', 'released');
CREATE TYPE tone_style            AS ENUM ('warm', 'elegant', 'playful');
CREATE TYPE message_direction     AS ENUM ('inbound', 'outbound');
CREATE TYPE message_classification AS ENUM ('routine', 'sensitive', 'unclear', 'escalated');

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE couples (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL    DEFAULT now(),
  clerk_user_id TEXT        NOT NULL    UNIQUE,
  email         TEXT        NOT NULL
);

CREATE TABLE phone_numbers (
  id             UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id      UUID                NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  twilio_number  TEXT                NOT NULL UNIQUE,
  status         phone_number_status NOT NULL DEFAULT 'active',
  activated_at   TIMESTAMPTZ,
  released_at    TIMESTAMPTZ,
  wedding_date   DATE
);

CREATE TABLE wedding_profiles (
  id              UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID       NOT NULL UNIQUE REFERENCES couples(id) ON DELETE CASCADE,
  venue_name      TEXT,
  venue_address   TEXT,
  ceremony_time   TIMESTAMPTZ,
  reception_time  TIMESTAMPTZ,
  dress_code      TEXT,
  registry_links  TEXT[],
  hotel_block     TEXT,
  parking_info    TEXT,
  tone            tone_style,
  vibe_word       TEXT,
  sample_message  TEXT,
  readiness_score INT        NOT NULL DEFAULT 0
);

CREATE TABLE faqs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id     UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0
);

CREATE TABLE conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id        UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  guest_phone_hash TEXT        NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id              UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID                   NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       message_direction      NOT NULL,
  body            TEXT                   NOT NULL,
  classified_as   message_classification,
  ai_confidence   FLOAT4,
  was_sent        BOOLEAN                NOT NULL DEFAULT false,
  sent_at         TIMESTAMPTZ,
  escalated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ            NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Row Level Security — enable on every table
-- ------------------------------------------------------------

ALTER TABLE couples           ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS policies
-- couples: direct match on clerk_user_id
-- ------------------------------------------------------------

CREATE POLICY "couples: own rows only"
  ON couples
  FOR ALL
  USING     ((auth.jwt() ->> 'sub') = clerk_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = clerk_user_id);

-- ------------------------------------------------------------
-- phone_numbers: one-level join → couples
-- ------------------------------------------------------------

CREATE POLICY "phone_numbers: own rows only"
  ON phone_numbers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = phone_numbers.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = phone_numbers.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  );

-- ------------------------------------------------------------
-- wedding_profiles: one-level join → couples
-- ------------------------------------------------------------

CREATE POLICY "wedding_profiles: own rows only"
  ON wedding_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = wedding_profiles.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = wedding_profiles.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  );

-- ------------------------------------------------------------
-- faqs: one-level join → couples
-- ------------------------------------------------------------

CREATE POLICY "faqs: own rows only"
  ON faqs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = faqs.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = faqs.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  );

-- ------------------------------------------------------------
-- conversations: one-level join → couples
-- ------------------------------------------------------------

CREATE POLICY "conversations: own rows only"
  ON conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = conversations.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = conversations.couple_id
        AND (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  );

-- ------------------------------------------------------------
-- messages: two-level join → conversations → couples
-- ------------------------------------------------------------

CREATE POLICY "messages: own rows only"
  ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   conversations
      JOIN   couples ON couples.id = conversations.couple_id
      WHERE  conversations.id = messages.conversation_id
        AND  (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   conversations
      JOIN   couples ON couples.id = conversations.couple_id
      WHERE  conversations.id = messages.conversation_id
        AND  (auth.jwt() ->> 'sub') = couples.clerk_user_id
    )
  );

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

CREATE INDEX idx_phone_numbers_couple_id      ON phone_numbers(couple_id);
CREATE INDEX idx_phone_numbers_twilio_number  ON phone_numbers(twilio_number);
CREATE INDEX idx_conversations_couple_id      ON conversations(couple_id);
CREATE INDEX idx_messages_conversation_id     ON messages(conversation_id);
CREATE INDEX idx_messages_created_at          ON messages(created_at);
