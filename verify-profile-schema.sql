-- Quick verification script to check user_profiles table structure
-- Run this in Supabase SQL Editor to verify the table has all required columns

-- Check if user_profiles table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public')
        THEN 'user_profiles table EXISTS'
        ELSE 'user_profiles table DOES NOT EXIST'
    END as table_status;

-- Check all columns in user_profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if specific required columns exist
SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'age') 
         THEN 'age column EXISTS' 
         ELSE 'age column MISSING' 
    END as age_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') 
         THEN 'bio column EXISTS' 
         ELSE 'bio column MISSING' 
    END as bio_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'location') 
         THEN 'location column EXISTS' 
         ELSE 'location column MISSING' 
    END as location_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'gender') 
         THEN 'gender column EXISTS' 
         ELSE 'gender column MISSING' 
    END as gender_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'display_name') 
         THEN 'display_name column EXISTS' 
         ELSE 'display_name column MISSING' 
    END as display_name_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'username') 
         THEN 'username column EXISTS' 
         ELSE 'username column MISSING' 
    END as username_status;






