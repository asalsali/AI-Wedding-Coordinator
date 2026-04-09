-- Run this in Supabase SQL Editor (not through migrations since RLS blocks it)

-- Check if demo couple exists and delete
DELETE FROM messages WHERE conversation_id IN (
    SELECT id FROM conversations WHERE couple_id IN (
        SELECT id FROM couples WHERE email = 'demo@alexandkirsten.wed'
    )
);
DELETE FROM conversations WHERE couple_id IN (SELECT id FROM couples WHERE email = 'demo@alexandkirsten.wed');
DELETE FROM faqs WHERE couple_id IN (SELECT id FROM couples WHERE email = 'demo@alexandkirsten.wed');
DELETE FROM wedding_profiles WHERE couple_id IN (SELECT id FROM couples WHERE email = 'demo@alexandkirsten.wed');
DELETE FROM phone_numbers WHERE couple_id IN (SELECT id FROM couples WHERE email = 'demo@alexandkirsten.wed');
DELETE FROM couples WHERE email = 'demo@alexandkirsten.wed';

-- Insert demo couple (requires a valid auth_user_id from auth.users)
-- First, create a demo user in auth.users (run this separately if needed)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@alexandkirsten.wed',
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Now insert the couple
INSERT INTO couples (email, your_name, partner_name, partner_email, auth_user_id) VALUES (
    'demo@alexandkirsten.wed',
    'Alex',
    'Kirsten',
    'kirsten@example.com',
    '00000000-0000-0000-0000-000000000001'
);
