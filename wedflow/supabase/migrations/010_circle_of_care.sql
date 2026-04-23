-- ============================================================
-- 010_circle_of_care.sql
-- Circle of Care MVP: circle_members and task_assignments tables.
-- Enables inner circle roles (MOH, best man, family lead, etc.)
-- to receive task assignments and view role-filtered conversations.
-- ============================================================

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

CREATE TYPE circle_role AS ENUM (
  'moh',
  'best_man',
  'family_lead',
  'bridesmaid',
  'groomsman'
);

CREATE TYPE circle_member_status AS ENUM (
  'invited',
  'active',
  'removed'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'done',
  'dismissed'
);

-- ------------------------------------------------------------
-- circle_members
-- ------------------------------------------------------------

CREATE TABLE circle_members (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id         UUID                 NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id           UUID                 REFERENCES auth.users(id) ON DELETE SET NULL,
  name              TEXT                 NOT NULL,
  email             TEXT                 NOT NULL,
  phone_hash        TEXT,
  role              circle_role          NOT NULL,
  status            circle_member_status NOT NULL DEFAULT 'invited',
  invite_token      UUID                 NOT NULL DEFAULT gen_random_uuid(),
  invite_expires_at TIMESTAMPTZ          NOT NULL DEFAULT now() + interval '72 hours',
  invited_at        TIMESTAMPTZ          NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT now()
);

-- Prevent duplicate invites to the same email for the same couple
CREATE UNIQUE INDEX idx_circle_members_couple_email
  ON circle_members(couple_id, email)
  WHERE status != 'removed';

-- Fast lookup by invite token (used during /join/[token] flow)
CREATE UNIQUE INDEX idx_circle_members_invite_token
  ON circle_members(invite_token);

-- Fast lookup by user_id (used in RLS policies and portal queries)
CREATE INDEX idx_circle_members_user_id
  ON circle_members(user_id)
  WHERE user_id IS NOT NULL;

-- ------------------------------------------------------------
-- task_assignments
-- ------------------------------------------------------------

CREATE TABLE task_assignments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  assigned_to  UUID        NOT NULL REFERENCES circle_members(id) ON DELETE CASCADE,
  message_id   UUID        REFERENCES messages(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  status       task_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_task_assignments_assigned_to
  ON task_assignments(assigned_to);

CREATE INDEX idx_task_assignments_couple_id
  ON task_assignments(couple_id);

-- ------------------------------------------------------------
-- Composite index on guests for role-based conversation filtering
-- MOH portal joins conversations -> guests -> group_tag
-- ------------------------------------------------------------

CREATE INDEX idx_guests_couple_group_tag
  ON guests(couple_id, group_tag);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE circle_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments  ENABLE ROW LEVEL SECURITY;

-- ---- circle_members policies ----

-- Couple can manage (CRUD) their own circle members
CREATE POLICY "circle_members: couple manages own circle"
  ON circle_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = circle_members.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = circle_members.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  );

-- Circle member can read their own row (needed for portal)
CREATE POLICY "circle_members: member reads own row"
  ON circle_members
  FOR SELECT
  USING (user_id = auth.uid());

-- ---- task_assignments policies ----

-- Couple can manage all task assignments for their wedding
CREATE POLICY "task_assignments: couple manages own tasks"
  ON task_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = task_assignments.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couples
      WHERE couples.id = task_assignments.couple_id
        AND couples.auth_user_id = auth.uid()
    )
  );

-- Circle member can read and update (mark done/dismissed) their own assignments
CREATE POLICY "task_assignments: member manages own assignments"
  ON task_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.id = task_assignments.assigned_to
        AND circle_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_members.id = task_assignments.assigned_to
        AND circle_members.user_id = auth.uid()
    )
  );

-- ---- conversation access for circle members ----
-- Circle members need SELECT access to conversations and messages
-- for their role-filtered view. They cannot modify conversations.

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
          -- MOH and bridesmaids see bridal_party conversations
          (cm.role IN ('moh', 'bridesmaid') AND g.group_tag = 'bridal_party')
          -- Best man and groomsmen see bridal_party too (cross-silo visibility)
          OR (cm.role IN ('best_man', 'groomsman') AND g.group_tag = 'bridal_party')
          -- Family leads see their family side
          OR (cm.role = 'family_lead' AND g.group_tag IN ('bride_family', 'groom_family'))
        )
    )
  );

-- Circle members can read messages in conversations they have access to
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
