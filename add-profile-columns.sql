-- Add missing columns to user_profiles table for ProfileScreen
-- Run this in your Supabase SQL Editor

-- Add missing profile columns
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS age TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Not specified', 'Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON public.user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender ON public.user_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON public.user_profiles(location);

-- Update RLS policies to allow access to new columns
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;

-- Recreate policies for the updated table
CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles FOR SELECT
USING (true); -- Allow all users to select profiles

CREATE POLICY "user_profiles_insert_policy"
ON public.user_profiles FOR INSERT
WITH CHECK (true); -- Allow all users to create profiles

CREATE POLICY "user_profiles_update_policy"
ON public.user_profiles FOR UPDATE
USING (true); -- Allow all users to update profiles

-- Grant necessary permissions
GRANT ALL ON public.user_profiles TO anon;
GRANT ALL ON public.user_profiles TO authenticated;






