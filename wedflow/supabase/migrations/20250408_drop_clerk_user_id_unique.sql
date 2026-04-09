-- Migration: Drop clerk_user_id unique constraint
-- This allows multiple NULL values in clerk_user_id column

-- Drop the unique constraint on clerk_user_id
ALTER TABLE couples
DROP CONSTRAINT IF EXISTS couples_clerk_user_id_key;

-- Also drop any other unique constraints that might exist on clerk_user_id
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  FOR constraint_rec IN 
    SELECT constraint_name 
    FROM information_schema.table_constraints
    WHERE table_name = 'couples' 
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%clerk%'
  LOOP
    EXECUTE format('ALTER TABLE couples DROP CONSTRAINT IF EXISTS %I', constraint_rec.constraint_name);
  END LOOP;
END $$;

-- Verify: Show current constraints on couples table
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'couples';
