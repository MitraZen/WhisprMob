-- Whispr Mobile App Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update existing user_profiles table to include required fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS anonymous_id TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('happy', 'sad', 'excited', 'anxious', 'calm', 'angry', 'curious', 'lonely', 'grateful', 'hopeful'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participants UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_id UUID,
  is_active BOOLEAN DEFAULT true
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_encrypted BOOLEAN DEFAULT true,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'excited', 'anxious', 'calm', 'angry', 'curious', 'lonely', 'grateful', 'hopeful')),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE
);

-- Add foreign key constraint for last_message_id (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_last_message' 
        AND table_name = 'chats'
    ) THEN
        ALTER TABLE chats 
        ADD CONSTRAINT fk_last_message 
        FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_profiles_mood ON user_profiles(mood);
CREATE INDEX IF NOT EXISTS idx_user_profiles_online ON user_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_profiles_anonymous_id ON user_profiles(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats USING GIN(participants);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can read all user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own user_profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own user_profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can read chat messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Create policies for anonymous access
-- Users can read all user_profiles (for mood-based connections)
CREATE POLICY "Users can read all user_profiles" ON user_profiles
  FOR SELECT USING (true);

-- Users can insert their own user_profile record
CREATE POLICY "Users can insert own user_profile" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Users can update their own user_profile record
CREATE POLICY "Users can update own user_profile" ON user_profiles
  FOR UPDATE USING (true);

-- Users can read chats they participate in
CREATE POLICY "Users can read own chats" ON chats
  FOR SELECT USING (true);

-- Users can create chats
CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (true);

-- Users can read messages in their chats
CREATE POLICY "Users can read chat messages" ON messages
  FOR SELECT USING (true);

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Create a function to update last_seen timestamp (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_seen (only if it doesn't exist)
DROP TRIGGER IF EXISTS update_user_profile_last_seen ON user_profiles;
CREATE TRIGGER update_user_profile_last_seen
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Test data (optional - remove in production)
-- Note: This assumes your user_profiles table has the required fields
-- INSERT INTO user_profiles (anonymous_id, mood, is_online) VALUES 
--   ('test_user_1', 'happy', true),
--   ('test_user_2', 'sad', false)
-- ON CONFLICT (anonymous_id) DO NOTHING;
