-- Add auth_user_id column to couples table
-- This links the couples table to Supabase Auth users

-- Add the column
ALTER TABLE couples
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Add unique constraint for upsert operations
ALTER TABLE couples
ADD CONSTRAINT couples_auth_user_id_key UNIQUE (auth_user_id);

-- Optional: Add foreign key constraint to auth.users
-- Note: This requires the auth schema to exist (it does in Supabase)
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_couples_auth_user_id
ON couples(auth_user_id);
