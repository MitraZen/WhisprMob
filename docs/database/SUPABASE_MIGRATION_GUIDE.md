# Supabase Database Migration Guide

## 🎯 Migration Overview
Migrating from: `bkfonnecvqlppivnrgxe.supabase.co` (Current)
Migrating to: `[NEW_PROJECT_URL]` (Target)

## 📋 Pre-Migration Checklist

### ✅ Step 1: Create New Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project name: `Whispr-Mobile-App-Production`
5. Set database password (save it securely!)
6. Choose region closest to your users
7. Click "Create new project"

### ✅ Step 2: Create Tables in New Project
**FIRST**, create the table structure in your **NEW** Supabase project using this complete schema:

```sql
-- Run this in your NEW Supabase project SQL Editor
-- This creates all the tables with proper structure

-- 1. Create user_profiles table
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  username text NOT NULL DEFAULT '@user_anonymous'::text UNIQUE,
  email text,
  bio text,
  interests text[] DEFAULT '{}'::text[],
  communication_style text CHECK (communication_style = ANY (ARRAY['deep'::text, 'casual'::text, 'learning'::text, 'cultural'::text])),
  location text,
  timezone text DEFAULT 'UTC'::text,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  status text DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'away'::text, 'busy'::text, 'offline'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non-binary'::text, 'prefer-not-to-say'::text])),
  date_of_birth date,
  country text,
  profile_completed boolean DEFAULT false,
  latitude numeric,
  longitude numeric,
  location_enabled boolean DEFAULT false,
  last_location_update timestamp with time zone DEFAULT now(),
  show_location boolean DEFAULT false,
  show_online_status boolean DEFAULT true,
  allow_nearby_discovery boolean DEFAULT true,
  avatar_url text,
  anonymous_id text UNIQUE,
  mood text CHECK (mood = ANY (ARRAY['happy'::text, 'sad'::text, 'excited'::text, 'anxious'::text, 'calm'::text, 'angry'::text, 'curious'::text, 'lonely'::text, 'grateful'::text, 'hopeful'::text])),
  age text,
  device_token text,
  display_name text NOT NULL DEFAULT 'Anonymous User'::text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 2. Create buddies table
CREATE TABLE public.buddies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  buddy_user_id uuid NOT NULL,
  name text NOT NULL,
  initials text NOT NULL,
  avatar_url text,
  is_pinned boolean DEFAULT false,
  is_online boolean DEFAULT false,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'away'::text, 'busy'::text, 'invisible'::text])),
  mood text,
  last_message text,
  last_message_time timestamp with time zone,
  unread_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddies_pkey PRIMARY KEY (id),
  CONSTRAINT buddies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT buddies_buddy_user_id_fkey FOREIGN KEY (buddy_user_id) REFERENCES auth.users(id)
);

-- 3. Create buddy_messages table
CREATE TABLE public.buddy_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buddy_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text'::text CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'emoji'::text])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_messages_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_messages_buddy_id_fkey FOREIGN KEY (buddy_id) REFERENCES public.buddies(id),
  CONSTRAINT buddy_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);

-- 4. Create whispr_notes table
CREATE TABLE public.whispr_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid,
  content text NOT NULL,
  mood text,
  is_anonymous boolean DEFAULT true,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  propagation_count integer DEFAULT 0,
  max_propagation integer DEFAULT 4,
  current_recipient_id uuid,
  propagation_chain jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'listened'::text, 'rejected'::text, 'expired'::text])),
  CONSTRAINT whispr_notes_pkey PRIMARY KEY (id)
);

-- 5. Create blocked_users table
CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocked_users_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_users_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id),
  CONSTRAINT blocked_users_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id)
);

-- 6. Create user_fcm_tokens table
CREATE TABLE public.user_fcm_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fcm_token text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['android'::text, 'ios'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_fcm_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_fcm_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 7. Create user_preferences table
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  match_notifications boolean DEFAULT true,
  show_online_status boolean DEFAULT true,
  language text DEFAULT 'en'::text,
  theme text DEFAULT 'system'::text CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  auto_play_audio boolean DEFAULT false,
  compact_mode boolean DEFAULT false,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id)
);
```

### ✅ Step 3: Export Current Data
1. Run `export-database-data.sql` in your **CURRENT** project
2. Save the JSON output for each table
3. This will give you all your data in JSON format

## 🔄 Migration Process

### Phase 1: Schema Setup (Already Done Above)
1. ✅ **Tables created** in new project (Step 2 above)
2. **Run `essential-database-indexes.sql`** to add performance indexes
3. **Set up Row Level Security (RLS)** policies

### Phase 2: Data Migration
1. **Import user_profiles first** (no dependencies)
2. **Import buddies** (depends on user_profiles)
3. **Import buddy_messages** (depends on buddies)
4. **Import whispr_notes** (depends on user_profiles)
5. **Import blocked_users** (depends on user_profiles)
6. **Import user_fcm_tokens** (depends on user_profiles)
7. **Import user_preferences** (depends on user_profiles)

### Phase 3: App Configuration
1. **Update `src/config/env.ts`** with new project credentials
2. **Test all functionality** in new project
3. **Update any hardcoded URLs** in the app

## 🛠️ Migration Scripts

### Schema Creation Script
```sql
-- Run this in your NEW Supabase project
-- This creates all tables with proper structure

-- 1. Create user_profiles table
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  username text NOT NULL DEFAULT '@user_anonymous'::text UNIQUE,
  email text,
  bio text,
  interests text[] DEFAULT '{}'::text[],
  communication_style text CHECK (communication_style = ANY (ARRAY['deep'::text, 'casual'::text, 'learning'::text, 'cultural'::text])),
  location text,
  timezone text DEFAULT 'UTC'::text,
  is_online boolean DEFAULT false,
  last_seen timestamp with time zone DEFAULT now(),
  status text DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'away'::text, 'busy'::text, 'offline'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_admin boolean DEFAULT false,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'non-binary'::text, 'prefer-not-to-say'::text])),
  date_of_birth date,
  country text,
  profile_completed boolean DEFAULT false,
  latitude numeric,
  longitude numeric,
  location_enabled boolean DEFAULT false,
  last_location_update timestamp with time zone DEFAULT now(),
  show_location boolean DEFAULT false,
  show_online_status boolean DEFAULT true,
  allow_nearby_discovery boolean DEFAULT true,
  avatar_url text,
  anonymous_id text UNIQUE,
  mood text CHECK (mood = ANY (ARRAY['happy'::text, 'sad'::text, 'excited'::text, 'anxious'::text, 'calm'::text, 'angry'::text, 'curious'::text, 'lonely'::text, 'grateful'::text, 'hopeful'::text])),
  age text,
  device_token text,
  display_name text NOT NULL DEFAULT 'Anonymous User'::text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 2. Create buddies table
CREATE TABLE public.buddies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  buddy_user_id uuid NOT NULL,
  name text NOT NULL,
  initials text NOT NULL,
  avatar_url text,
  is_pinned boolean DEFAULT false,
  is_online boolean DEFAULT false,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'away'::text, 'busy'::text, 'invisible'::text])),
  mood text,
  last_message text,
  last_message_time timestamp with time zone,
  unread_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddies_pkey PRIMARY KEY (id),
  CONSTRAINT buddies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT buddies_buddy_user_id_fkey FOREIGN KEY (buddy_user_id) REFERENCES auth.users(id)
);

-- 3. Create buddy_messages table
CREATE TABLE public.buddy_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  buddy_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text'::text CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'emoji'::text])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buddy_messages_pkey PRIMARY KEY (id),
  CONSTRAINT buddy_messages_buddy_id_fkey FOREIGN KEY (buddy_id) REFERENCES public.buddies(id),
  CONSTRAINT buddy_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);

-- 4. Create whispr_notes table
CREATE TABLE public.whispr_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid,
  content text NOT NULL,
  mood text,
  is_anonymous boolean DEFAULT true,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  propagation_count integer DEFAULT 0,
  max_propagation integer DEFAULT 4,
  current_recipient_id uuid,
  propagation_chain jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'listened'::text, 'rejected'::text, 'expired'::text])),
  CONSTRAINT whispr_notes_pkey PRIMARY KEY (id)
);

-- 5. Create blocked_users table
CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blocked_users_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_users_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES auth.users(id),
  CONSTRAINT blocked_users_blocked_user_id_fkey FOREIGN KEY (blocked_user_id) REFERENCES auth.users(id)
);

-- 6. Create user_fcm_tokens table
CREATE TABLE public.user_fcm_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fcm_token text NOT NULL,
  platform text NOT NULL CHECK (platform = ANY (ARRAY['android'::text, 'ios'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_fcm_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_fcm_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 7. Create user_preferences table
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  match_notifications boolean DEFAULT true,
  show_online_status boolean DEFAULT true,
  language text DEFAULT 'en'::text,
  theme text DEFAULT 'system'::text CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sound_enabled boolean DEFAULT true,
  vibration_enabled boolean DEFAULT true,
  auto_play_audio boolean DEFAULT false,
  compact_mode boolean DEFAULT false,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id)
);
```

## 🔐 Post-Migration Steps

### 1. Update App Configuration
Replace the values in `src/config/env.ts`:

```typescript
export const SUPABASE_CONFIG = {
  url: 'https://YOUR_NEW_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_NEW_ANON_KEY',
  serviceRoleKey: 'YOUR_NEW_SERVICE_ROLE_KEY',
};
```

### 2. Test Migration
1. **Build and test the app** with new configuration
2. **Verify all data** is accessible
3. **Test core functionality**: messaging, notes, user profiles
4. **Check performance** with new indexes

### 3. Cleanup Old Project
1. **Export final backup** from old project
2. **Update DNS/domain** if using custom domains
3. **Delete old project** after confirming migration success

## ⚠️ Important Notes

- **Backup everything** before starting migration
- **Test thoroughly** before switching production traffic
- **Keep old project** until migration is confirmed successful
- **Update all environment variables** in your deployment pipeline
- **Consider downtime** for seamless migration

## 🆘 Rollback Plan

If migration fails:
1. **Revert `src/config/env.ts`** to old project credentials
2. **Redeploy app** with old configuration
3. **Investigate issues** in new project
4. **Fix problems** and retry migration
