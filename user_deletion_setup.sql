-- =====================================================
-- USER DELETION SETUP SCRIPT FOR WHISPR MOBILE APP
-- =====================================================
-- This script sets up proper user deletion functionality
-- Run this in Supabase SQL Editor

-- 1. Create a function to delete user from auth.users table
-- This requires service role permissions
CREATE OR REPLACE FUNCTION delete_user_from_auth(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.users table
  DELETE FROM auth.users WHERE email = user_email;
  
  -- Return true if deletion was successful
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false
    RAISE LOG 'Error deleting user from auth: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- 2. Create a comprehensive user deletion function
-- This function deletes user from all tables including auth
CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID, user_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  deleted_messages INTEGER := 0;
  deleted_buddies INTEGER := 0;
  deleted_notes INTEGER := 0;
  deleted_profile INTEGER := 0;
  deleted_auth INTEGER := 0;
  error_message TEXT := '';
BEGIN
  -- Initialize result object
  result := '{"success": false, "details": {}}'::JSON;
  
  BEGIN
    -- Delete user's messages
    DELETE FROM buddy_messages WHERE sender_id = user_id;
    GET DIAGNOSTICS deleted_messages = ROW_COUNT;
    
    -- Delete user's buddies (where user is the main user)
    DELETE FROM buddies WHERE user_id = user_id;
    GET DIAGNOSTICS deleted_buddies = ROW_COUNT;
    
    -- Delete user's whispr notes
    DELETE FROM whispr_notes WHERE sender_id = user_id;
    GET DIAGNOSTICS deleted_notes = ROW_COUNT;
    
    -- Delete user profile
    DELETE FROM user_profiles WHERE id = user_id;
    GET DIAGNOSTICS deleted_profile = ROW_COUNT;
    
    -- Delete from auth.users if email is provided
    IF user_email IS NOT NULL THEN
      DELETE FROM auth.users WHERE email = user_email;
      GET DIAGNOSTICS deleted_auth = ROW_COUNT;
    END IF;
    
    -- Build success result
    result := json_build_object(
      'success', true,
      'details', json_build_object(
        'deleted_messages', deleted_messages,
        'deleted_buddies', deleted_buddies,
        'deleted_notes', deleted_notes,
        'deleted_profile', (deleted_profile > 0),
        'deleted_auth', (deleted_auth > 0),
        'user_id', user_id,
        'user_email', user_email
      )
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Build error result
      error_message := SQLERRM;
      result := json_build_object(
        'success', false,
        'error', error_message,
        'details', json_build_object(
          'deleted_messages', deleted_messages,
          'deleted_buddies', deleted_buddies,
          'deleted_notes', deleted_notes,
          'deleted_profile', (deleted_profile > 0),
          'deleted_auth', (deleted_auth > 0),
          'user_id', user_id,
          'user_email', user_email
        )
      );
  END;
  
  RETURN result;
END;
$$;

-- 3. Create a function to check if user exists in both systems
CREATE OR REPLACE FUNCTION check_user_registration(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_profile_data JSON;
  auth_user_data JSON;
BEGIN
  -- Check user_profiles table
  SELECT to_json(up.*) INTO user_profile_data
  FROM user_profiles up
  WHERE up.email = user_email
  LIMIT 1;
  
  -- Check auth.users table
  SELECT to_json(au.*) INTO auth_user_data
  FROM auth.users au
  WHERE au.email = user_email
  LIMIT 1;
  
  -- Build result
  result := json_build_object(
    'email', user_email,
    'in_user_profiles', (user_profile_data IS NOT NULL),
    'in_auth', (auth_user_data IS NOT NULL),
    'user_profile_data', user_profile_data,
    'auth_data', auth_user_data
  );
  
  RETURN result;
END;
$$;

-- 4. Grant necessary permissions
-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_from_auth(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_registration(TEXT) TO authenticated;

-- 5. Create a simple function to delete user by email only
CREATE OR REPLACE FUNCTION delete_user_by_email(user_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result JSON;
BEGIN
  -- Get user ID from user_profiles
  SELECT id INTO user_id
  FROM user_profiles
  WHERE email = user_email
  LIMIT 1;
  
  -- If user not found in user_profiles, try to get from auth.users
  IF user_id IS NULL THEN
    SELECT id::UUID INTO user_id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
  END IF;
  
  -- If still no user found, return error
  IF user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found with email: ' || user_email
    );
  END IF;
  
  -- Call the comprehensive deletion function
  SELECT delete_user_completely(user_id, user_email) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_by_email(TEXT) TO authenticated;

-- 6. Test the functions (optional - remove in production)
-- Uncomment these lines to test the functions:

-- Test check function
-- SELECT check_user_registration('testusr13@gmail.com');

-- Test deletion function
-- SELECT delete_user_by_email('testusr13@gmail.com');

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The functions will be created and ready to use
-- 3. Use these functions in your app:
--    - check_user_registration('email@example.com') - Check if user exists
--    - delete_user_by_email('email@example.com') - Delete user completely
--    - delete_user_completely(user_id, 'email@example.com') - Delete by ID and email

-- =====================================================
-- MANUAL DELETION COMMANDS (if needed)
-- =====================================================
-- If you need to manually delete testusr13@gmail.com:
-- DELETE FROM auth.users WHERE email = 'testusr13@gmail.com';
-- DELETE FROM user_profiles WHERE email = 'testusr13@gmail.com';
-- DELETE FROM buddy_messages WHERE sender_id IN (SELECT id FROM user_profiles WHERE email = 'testusr13@gmail.com');
-- DELETE FROM buddies WHERE user_id IN (SELECT id FROM user_profiles WHERE email = 'testusr13@gmail.com');
-- DELETE FROM whispr_notes WHERE sender_id IN (SELECT id FROM user_profiles WHERE email = 'testusr13@gmail.com');
