-- Check RLS status and policies
-- Run this in your Supabase SQL Editor to see current state

-- Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'buddies', 'buddy_messages', 'whispr_notes')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'buddies', 'buddy_messages', 'whispr_notes')
ORDER BY tablename, policyname;

-- Check if tables exist and have data
SELECT 
    'user_profiles' as table_name, 
    count(*) as row_count 
FROM public.user_profiles 
UNION ALL
SELECT 
    'buddies' as table_name, 
    count(*) as row_count 
FROM public.buddies 
UNION ALL
SELECT 
    'buddy_messages' as table_name, 
    count(*) as row_count 
FROM public.buddy_messages 
UNION ALL
SELECT 
    'whispr_notes' as table_name, 
    count(*) as row_count 
FROM public.whispr_notes;

-- Test a simple query to see if REST API access works
SELECT * FROM public.buddy_messages LIMIT 3;




