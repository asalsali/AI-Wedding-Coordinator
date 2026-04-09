-- Move ALL data from the old couple (no auth_user_id) to the new couple (with auth_user_id)
-- Old couple: 31def40a-9c51-4a50-a0e2-42aa55c1f62f
-- New couple: 3f094275-d362-4c28-a8a3-ed95118ef94b

-- Move phone number
UPDATE phone_numbers
SET couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
WHERE couple_id = '31def40a-9c51-4a50-a0e2-42aa55c1f62f';

-- Move wedding profile
UPDATE wedding_profiles
SET couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
WHERE couple_id = '31def40a-9c51-4a50-a0e2-42aa55c1f62f';

-- Move FAQs
UPDATE faqs
SET couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
WHERE couple_id = '31def40a-9c51-4a50-a0e2-42aa55c1f62f';

-- Move conversations
UPDATE conversations
SET couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
WHERE couple_id = '31def40a-9c51-4a50-a0e2-42aa55c1f62f';

-- Also update guests table if you have it
UPDATE guests
SET couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
WHERE couple_id = '31def40a-9c51-4a50-a0e2-42aa55c1f62f';

-- Now delete the old couple record (optional - only if you're sure)
-- DELETE FROM couples WHERE id = '31def40a-9c51-4a50-a0e2-42aa55c1f62f';

-- Verify everything moved
SELECT 'phone_numbers' as table_name, count(*) as row_count
FROM phone_numbers WHERE couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
UNION ALL
SELECT 'wedding_profiles', count(*) FROM wedding_profiles WHERE couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
UNION ALL
SELECT 'faqs', count(*) FROM faqs WHERE couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
UNION ALL
SELECT 'conversations', count(*) FROM conversations WHERE couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b'
UNION ALL
SELECT 'guests', count(*) FROM guests WHERE couple_id = '3f094275-d362-4c28-a8a3-ed95118ef94b';
