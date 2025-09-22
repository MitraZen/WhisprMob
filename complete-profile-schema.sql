-- Complete Profile Schema Update for Whispr Mobile App
-- Run this ENTIRE script in your Supabase SQL Editor
-- This will add all missing columns to the user_profiles table

-- Step 1: Check if user_profiles table exists, create if not
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 2: Add all missing columns with proper constraints
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS anonymous_id TEXT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('happy', 'sad', 'excited', 'anxious', 'calm', 'angry', 'curious', 'lonely', 'grateful', 'hopeful'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS age TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Not specified', 'Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_anonymous_id ON public.user_profiles(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_mood ON public.user_profiles(mood);
CREATE INDEX IF NOT EXISTS idx_user_profiles_online ON public.user_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON public.user_profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON public.user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON public.user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON public.user_profiles(location);

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read all user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profiles;

-- Step 6: Create new RLS policies for anonymous access
CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles FOR SELECT
USING (true); -- Allow all users to select profiles

CREATE POLICY "user_profiles_insert_policy"
ON public.user_profiles FOR INSERT
WITH CHECK (true); -- Allow all users to create profiles

CREATE POLICY "user_profiles_update_policy"
ON public.user_profiles FOR UPDATE
USING (true); -- Allow all users to update profiles

CREATE POLICY "user_profiles_delete_policy"
ON public.user_profiles FOR DELETE
USING (true); -- Allow all users to delete profiles

-- Step 7: Grant necessary permissions
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO authenticated;

-- Step 8: Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 9: Test insert (optional - remove after testing)
-- INSERT INTO public.user_profiles (anonymous_id, mood, display_name, username, bio, age, location, gender)
-- VALUES ('test-user-123', 'happy', 'Test User', 'testuser', 'Test bio', '25 years old', 'United States', 'Not specified');

-- Success message
SELECT 'Profile schema updated successfully! All columns added to user_profiles table.' as status;



