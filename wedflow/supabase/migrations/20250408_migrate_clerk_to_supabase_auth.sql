-- Migration: Migrate from Clerk to Supabase Auth
-- Makes clerk_user_id nullable and sets up auth_user_id

-- Step 1: Make clerk_user_id nullable (was required for Clerk)
ALTER TABLE couples
ALTER COLUMN clerk_user_id DROP NOT NULL;

-- Step 2: Add auth_user_id column if not exists
ALTER TABLE couples
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Step 3: Add unique constraint for auth_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'couples_auth_user_id_key'
    AND table_name = 'couples'
  ) THEN
    ALTER TABLE couples
    ADD CONSTRAINT couples_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- Step 4: Add foreign key to auth.users (optional but recommended)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'couples_auth_user_id_fkey'
    AND table_name = 'couples'
  ) THEN
    ALTER TABLE couples
    ADD CONSTRAINT couples_auth_user_id_fkey
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_couples_auth_user_id
ON couples(auth_user_id);

-- Step 6: Optional - copy existing clerk_user_id to auth_user_id if they match format
-- (only if you have users with matching IDs - usually not needed)
-- UPDATE couples SET auth_user_id = clerk_user_id::UUID WHERE clerk_user_id IS NOT NULL;
