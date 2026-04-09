-- ============================================================
-- Demo data for Alex & Kirsten
-- Creates a complete demo couple with sample conversations
-- for showcasing during 1:1 sales meetings
-- ============================================================

-- First, let's create a demo user function that bypasses RLS
-- This should be run as a superuser or with appropriate permissions

-- Demo couple data
DO $$
DECLARE
    demo_couple_id UUID;
    demo_phone_id UUID;
    conv1_id UUID;
    conv2_id UUID;
    conv3_id UUID;
    conv4_id UUID;
BEGIN
    -- Check if demo couple already exists
    SELECT id INTO demo_couple_id FROM couples WHERE email = 'demo@alexandkirsten.wed';
    
    IF demo_couple_id IS NOT NULL THEN
        -- Clean up existing demo data
        DELETE FROM messages WHERE conversation_id IN (
            SELECT id FROM conversations WHERE couple_id = demo_couple_id
        );
        DELETE FROM conversations WHERE couple_id = demo_couple_id;
        DELETE FROM faqs WHERE couple_id = demo_couple_id;
        DELETE FROM wedding_profiles WHERE couple_id = demo_couple_id;
        DELETE FROM phone_numbers WHERE couple_id = demo_couple_id;
        DELETE FROM couples WHERE id = demo_couple_id;
    END IF;

    -- Insert demo couple (using a placeholder auth_user_id that won't match real users)
    INSERT INTO couples (id, auth_user_id, email, your_name, partner_name, partner_email)
    VALUES (
        gen_random_uuid(),
        'demo-user-alex-kirsten-2026',
        'demo@alexandkirsten.wed',
        'Alex',
        'Kirsten',
        'kirsten@example.com'
    )
    RETURNING id INTO demo_couple_id;

    -- Insert phone number
    INSERT INTO phone_numbers (id, couple_id, twilio_number, status, activated_at, wedding_date)
    VALUES (
        gen_random_uuid(),
        demo_couple_id,
        '+1 (437) 523-1847',
        'active',
        '2026-01-15 10:00:00+00',
        '2026-09-12'
    )
    RETURNING id INTO demo_phone_id;

    -- Insert wedding profile
    INSERT INTO wedding_profiles (
        id, couple_id, venue_name, venue_address, wedding_date,
        ceremony_time, reception_time, dress_code, registry_links, hotel_block,
        parking_info, tone, vibe_word, sample_message, readiness_score
    )
    VALUES (
        gen_random_uuid(),
        demo_couple_id,
        'The Manor by Peter and Paul',
        '167 Main St, Whitchurch-Stouffville, ON L4A 1S8',
        '2026-09-12',
        '14:00',
        '17:00',
        'Garden Party Elegant (suits & cocktail dresses)',
        ARRAY['https://www.crateandbarrel.ca/gift-registry/kirsten-smith/r6169380', 'https://www.bedbathandbeyond.ca/store/giftregistry/viewregistryowner/543210987'],
        'Hilton Garden Inn - mention Smith-Lee wedding for 15% off. 2 km from venue.',
        'Free valet parking included. Additional lot across the street.',
        'warm',
        'joyful',
        'We''re so excited to celebrate with you! Feel free to text this number with any questions about our big day. xx Alex & Kirsten',
        95
    );

    -- Insert FAQs
    INSERT INTO faqs (id, couple_id, question, answer, display_order) VALUES
        (gen_random_uuid(), demo_couple_id, 'What time should I arrive?', 'Ceremony starts at 2pm - please arrive by 1:30pm.', 1),
        (gen_random_uuid(), demo_couple_id, 'Can I bring a plus one?', 'Due to venue capacity, invitations are for named guests only.', 2),
        (gen_random_uuid(), demo_couple_id, 'Is there a registry?', 'Yes! Links are on our website under "Gifts".', 3),
        (gen_random_uuid(), demo_couple_id, 'What''s the parking situation?', 'Complimentary valet parking is included. There''s also a lot across the street.', 4),
        (gen_random_uuid(), demo_couple_id, 'Are kids welcome?', 'While we love your little ones, this will be an adults-only celebration.', 5);

    -- Conversation 1: Sarah (Needs Reply - RSVP + Dietary)
    INSERT INTO conversations (id, couple_id, guest_phone_hash, started_at, last_message_at)
    VALUES (gen_random_uuid(), demo_couple_id, 'sarah_miller_hash', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
    RETURNING id INTO conv1_id;

    INSERT INTO messages (id, conversation_id, direction, body, classified_as, was_sent, created_at) VALUES
        (gen_random_uuid(), conv1_id, 'inbound', 'Hi! This is Sarah Miller. I got your invitation and I''m so excited! Can I bring my boyfriend Jake?', 'escalated', false, NOW() - INTERVAL '2 hours');

    -- Conversation 2: Mike (Auto-replied - Plus One)
    INSERT INTO conversations (id, couple_id, guest_phone_hash, started_at, last_message_at)
    VALUES (gen_random_uuid(), demo_couple_id, 'mike_ross_hash', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
    RETURNING id INTO conv2_id;

    INSERT INTO messages (id, conversation_id, direction, body, classified_as, was_sent, created_at) VALUES
        (gen_random_uuid(), conv2_id, 'inbound', 'Hey Alex! Quick question - my girlfriend Rachel is visiting that weekend. Any chance she could join?', 'routine', false, NOW() - INTERVAL '1 day'),
        (gen_random_uuid(), conv2_id, 'outbound', 'Hi Mike! Thanks for asking. Due to venue capacity constraints, we''ve had to keep the guest list to named invitees only. We''d love to celebrate with just you this time - hope you understand!', 'routine', true, NOW() - INTERVAL '23 hours');

    -- Conversation 3: Emma (Auto-replied - Hotel)
    INSERT INTO conversations (id, couple_id, guest_phone_hash, started_at, last_message_at)
    VALUES (gen_random_uuid(), demo_couple_id, 'emma_watson_hash', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
    RETURNING id INTO conv3_id;

    INSERT INTO messages (id, conversation_id, direction, body, classified_as, was_sent, created_at) VALUES
        (gen_random_uuid(), conv3_id, 'inbound', 'Hi! Do you have a hotel block reserved? Coming from out of town.', 'routine', false, NOW() - INTERVAL '2 days'),
        (gen_random_uuid(), conv3_id, 'outbound', 'Hi Emma! Yes! We have a block at the Hilton Garden Inn - just mention the Smith-Lee wedding for 15% off. It''s only 2km from the venue. Let us know if you need any other details!', 'routine', true, NOW() - INTERVAL '2 days'),
        (gen_random_uuid(), conv3_id, 'inbound', 'Perfect, thank you! Can''t wait to celebrate with you both! 🎉', 'routine', false, NOW() - INTERVAL '1 day'),
        (gen_random_uuid(), conv3_id, 'outbound', 'We can''t wait either! Thanks for being there with us. 💕', 'routine', true, NOW() - INTERVAL '1 day');

    -- Conversation 4: David (Auto-replied - Dietary)
    INSERT INTO conversations (id, couple_id, guest_phone_hash, started_at, last_message_at)
    VALUES (gen_random_uuid(), demo_couple_id, 'david_chen_hash', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days')
    RETURNING id INTO conv4_id;

    INSERT INTO messages (id, conversation_id, direction, body, classified_as, was_sent, created_at) VALUES
        (gen_random_uuid(), conv4_id, 'inbound', 'Hey! I have a gluten allergy - will there be options for me?', 'routine', false, NOW() - INTERVAL '3 days'),
        (gen_random_uuid(), conv4_id, 'outbound', 'Absolutely, David! The venue is fully equipped to handle gluten-free dietary needs. We''ll make sure to note this for your meal. The chef will reach out directly if there are any questions!', 'routine', true, NOW() - INTERVAL '3 days');

    RAISE NOTICE 'Demo data created successfully for Alex & Kirsten. Couple ID: %', demo_couple_id;

END $$;
