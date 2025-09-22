-- Fix existing policies by dropping them first, then recreating
-- Run this in your Supabase SQL Editor

-- Drop existing policies for user_profiles table
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;

-- Drop existing policies for buddies table
DROP POLICY IF EXISTS "buddies_select_policy" ON public.buddies;
DROP POLICY IF EXISTS "buddies_insert_policy" ON public.buddies;
DROP POLICY IF EXISTS "buddies_update_policy" ON public.buddies;
DROP POLICY IF EXISTS "buddies_delete_policy" ON public.buddies;

-- Drop existing policies for buddy_messages table
DROP POLICY IF EXISTS "buddy_messages_select_policy" ON public.buddy_messages;
DROP POLICY IF EXISTS "buddy_messages_insert_policy" ON public.buddy_messages;
DROP POLICY IF EXISTS "buddy_messages_update_policy" ON public.buddy_messages;
DROP POLICY IF EXISTS "buddy_messages_delete_policy" ON public.buddy_messages;

-- Drop existing policies for whispr_notes table
DROP POLICY IF EXISTS "whispr_notes_select_policy" ON public.whispr_notes;
DROP POLICY IF EXISTS "whispr_notes_insert_policy" ON public.whispr_notes;
DROP POLICY IF EXISTS "whispr_notes_update_policy" ON public.whispr_notes;
DROP POLICY IF EXISTS "whispr_notes_delete_policy" ON public.whispr_notes;

-- Now create the policies (these should work without errors)
-- User profiles policies
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
    FOR UPDATE USING (true);

CREATE POLICY "user_profiles_delete_policy" ON public.user_profiles
    FOR DELETE USING (true);

-- Buddies policies
CREATE POLICY "buddies_select_policy" ON public.buddies
    FOR SELECT USING (true);

CREATE POLICY "buddies_insert_policy" ON public.buddies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "buddies_update_policy" ON public.buddies
    FOR UPDATE USING (true);

CREATE POLICY "buddies_delete_policy" ON public.buddies
    FOR DELETE USING (true);

-- Buddy messages policies
CREATE POLICY "buddy_messages_select_policy" ON public.buddy_messages
    FOR SELECT USING (true);

CREATE POLICY "buddy_messages_insert_policy" ON public.buddy_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "buddy_messages_update_policy" ON public.buddy_messages
    FOR UPDATE USING (true);

CREATE POLICY "buddy_messages_delete_policy" ON public.buddy_messages
    FOR DELETE USING (true);

-- Whispr notes policies
CREATE POLICY "whispr_notes_select_policy" ON public.whispr_notes
    FOR SELECT USING (true);

CREATE POLICY "whispr_notes_insert_policy" ON public.whispr_notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "whispr_notes_update_policy" ON public.whispr_notes
    FOR UPDATE USING (true);

CREATE POLICY "whispr_notes_delete_policy" ON public.whispr_notes
    FOR DELETE USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'buddies', 'buddy_messages', 'whispr_notes')
ORDER BY tablename, policyname;


