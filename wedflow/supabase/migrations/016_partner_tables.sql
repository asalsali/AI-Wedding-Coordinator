-- 016_partner_tables.sql
-- B2B2C partner system: partners, referrals, RLS policies, indexes.

-- ============================================================
-- Helper: check if user is a partner (for RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_partner_id_for_user()
RETURNS UUID AS $$
  SELECT id FROM public.partners WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE partners (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES auth.users(id),
  partner_type      TEXT        NOT NULL CHECK (partner_type IN ('officiant', 'church', 'counsellor', 'vendor')),
  organization_name TEXT        NOT NULL,
  contact_name      TEXT        NOT NULL,
  contact_email     TEXT        NOT NULL,
  phone             TEXT,
  website           TEXT,
  referral_code     TEXT        NOT NULL UNIQUE,
  parent_partner_id UUID        REFERENCES partners(id),
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE partner_referrals (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         UUID        NOT NULL REFERENCES partners(id),
  couple_id          UUID        NOT NULL REFERENCES auth.users(id),
  referral_code_used TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'churned', 'cancelled')),
  converted_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_partners_parent_partner_id ON partners(parent_partner_id);
CREATE INDEX idx_partner_referrals_partner_id ON partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_couple_id ON partner_referrals(couple_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

-- Partners: read own row
CREATE POLICY "Partners can read own profile"
  ON partners FOR SELECT
  USING (user_id = auth.uid());

-- Partners: update own row
CREATE POLICY "Partners can update own profile"
  ON partners FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Partner referrals: partner can read their own referrals
CREATE POLICY "Partners can read own referrals"
  ON partner_referrals FOR SELECT
  USING (partner_id = public.get_partner_id_for_user());

-- Service role bypasses RLS automatically (no policy needed).
-- No policies for couples on partner tables — they have no access.

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER partners_set_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
