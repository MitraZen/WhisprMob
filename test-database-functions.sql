-- Test script to verify database functions are working
-- Run this in your Supabase SQL Editor after running update-auth-functions.sql

-- Test 1: Check if the updated functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('send_buddy_message', 'mark_buddy_messages_read', 'toggle_buddy_pin')
ORDER BY routine_name;

-- Test 2: Check if buddy_messages table exists and has data
SELECT COUNT(*) as total_messages FROM public.buddy_messages;

-- Test 3: Check if buddies table exists and has data
SELECT COUNT(*) as total_buddies FROM public.buddies;

-- Test 4: Check recent messages (if any exist)
SELECT 
    id,
    buddy_id,
    sender_id,
    content,
    created_at
FROM public.buddy_messages 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 5: Check recent buddies (if any exist)
SELECT 
    id,
    user_id,
    buddy_user_id,
    name,
    created_at
FROM public.buddies 
ORDER BY created_at DESC 
LIMIT 5;


