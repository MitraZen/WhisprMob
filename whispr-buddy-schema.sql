-- Whispr Buddy System Database Schema
-- Complete implementation based on the buddy logic documentation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WHISPR_NOTES Table - Anonymous message storage
CREATE TABLE IF NOT EXISTS public.whispr_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL REFERENCES auth.users(id),
    content text NOT NULL,
    mood text NOT NULL CHECK (mood IN ('happy', 'sad', 'excited', 'anxious', 'calm', 'angry', 'curious', 'lonely', 'grateful', 'hopeful')),
    status text DEFAULT 'active' CHECK (status IN ('active', 'listened', 'rejected', 'expired')),
    propagation_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. BUDDIES Table - Buddy relationship management
CREATE TABLE IF NOT EXISTS public.buddies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    buddy_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    initials text NOT NULL,
    avatar_url text,
    is_pinned boolean DEFAULT false,
    is_online boolean DEFAULT false,
    status text DEFAULT 'active' CHECK (status IN ('active', 'away', 'busy', 'invisible')),
    mood text CHECK (mood IN ('happy', 'sad', 'excited', 'anxious', 'calm', 'angry', 'curious', 'lonely', 'grateful', 'hopeful')),
    last_message text,
    last_message_time timestamp with time zone,
    unread_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique buddy relationships
    UNIQUE(user_id, buddy_user_id)
);

-- 3. BUDDY_MESSAGES Table - Chat message storage
CREATE TABLE IF NOT EXISTS public.buddy_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buddy_id uuid NOT NULL REFERENCES public.buddies(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'emoji')),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. BLOCKED_USERS Table - User blocking functionality
CREATE TABLE IF NOT EXISTS public.blocked_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(blocker_id, blocked_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whispr_notes_sender ON public.whispr_notes(sender_id);
CREATE INDEX IF NOT EXISTS idx_whispr_notes_status ON public.whispr_notes(status);
CREATE INDEX IF NOT EXISTS idx_whispr_notes_active ON public.whispr_notes(is_active);
CREATE INDEX IF NOT EXISTS idx_whispr_notes_created ON public.whispr_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_buddies_user_id ON public.buddies(user_id);
CREATE INDEX IF NOT EXISTS idx_buddies_buddy_user_id ON public.buddies(buddy_user_id);
CREATE INDEX IF NOT EXISTS idx_buddies_pinned ON public.buddies(is_pinned);
CREATE INDEX IF NOT EXISTS idx_buddies_online ON public.buddies(is_online);
CREATE INDEX IF NOT EXISTS idx_buddies_last_message_time ON public.buddies(last_message_time);

CREATE INDEX IF NOT EXISTS idx_buddy_messages_buddy_id ON public.buddy_messages(buddy_id);
CREATE INDEX IF NOT EXISTS idx_buddy_messages_sender_id ON public.buddy_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_buddy_messages_created ON public.buddy_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_buddy_messages_read ON public.buddy_messages(is_read);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.whispr_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all whispr_notes" ON public.whispr_notes;
DROP POLICY IF EXISTS "Users can insert whispr_notes" ON public.whispr_notes;
DROP POLICY IF EXISTS "Users can update own whispr_notes" ON public.whispr_notes;

DROP POLICY IF EXISTS "Users can read own buddies" ON public.buddies;
DROP POLICY IF EXISTS "Users can insert buddies" ON public.buddies;
DROP POLICY IF EXISTS "Users can update own buddies" ON public.buddies;

DROP POLICY IF EXISTS "Users can read buddy messages" ON public.buddy_messages;
DROP POLICY IF EXISTS "Users can insert buddy messages" ON public.buddy_messages;
DROP POLICY IF EXISTS "Users can update buddy messages" ON public.buddy_messages;

DROP POLICY IF EXISTS "Users can read blocked users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can insert blocked users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can delete blocked users" ON public.blocked_users;

-- Create RLS policies for anonymous access
-- Whispr Notes policies
CREATE POLICY "Users can read all whispr_notes" ON public.whispr_notes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert whispr_notes" ON public.whispr_notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own whispr_notes" ON public.whispr_notes
    FOR UPDATE USING (true);

-- Buddies policies
CREATE POLICY "Users can read own buddies" ON public.buddies
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert buddies" ON public.buddies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own buddies" ON public.buddies
    FOR UPDATE USING (user_id = auth.uid());

-- Buddy Messages policies
CREATE POLICY "Users can read buddy messages" ON public.buddy_messages
    FOR SELECT USING (
        buddy_id IN (
            SELECT id FROM public.buddies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert buddy messages" ON public.buddy_messages
    FOR INSERT WITH CHECK (
        buddy_id IN (
            SELECT id FROM public.buddies WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update buddy messages" ON public.buddy_messages
    FOR UPDATE USING (
        buddy_id IN (
            SELECT id FROM public.buddies WHERE user_id = auth.uid()
        )
    );

-- Blocked Users policies
CREATE POLICY "Users can read blocked users" ON public.blocked_users
    FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY "Users can insert blocked users" ON public.blocked_users
    FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete blocked users" ON public.blocked_users
    FOR DELETE USING (blocker_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Create helper function to get note sender info
DROP FUNCTION IF EXISTS public.get_note_sender_info(uuid);
CREATE OR REPLACE FUNCTION public.get_note_sender_info(note_id uuid)
RETURNS TABLE(
    sender_id uuid,
    sender_name text,
    sender_initials text,
    sender_avatar_url text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id as sender_id,
        COALESCE(up.display_name, up.username) as sender_name,
        CASE 
            WHEN up.display_name IS NOT NULL THEN 
                UPPER(LEFT(SPLIT_PART(up.display_name, ' ', 1), 1) || 
                      COALESCE(LEFT(SPLIT_PART(up.display_name, ' ', 2), 1), ''))
            ELSE 
                UPPER(LEFT(up.username, 2))
        END as sender_initials,
        up.avatar_url as sender_avatar_url
    FROM public.whispr_notes wn
    JOIN public.user_profiles up ON wn.sender_id = up.id
    WHERE wn.id = note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle note propagation (listen/reject)
DROP FUNCTION IF EXISTS public.handle_note_propagation(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.handle_note_propagation(
    note_id uuid,
    responder_id uuid,
    response_type text
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    buddy_id uuid;
    note_sender_id uuid;
    note_record RECORD;
BEGIN
    -- Validate response type
    IF response_type NOT IN ('listen', 'reject') THEN
        RAISE EXCEPTION 'Invalid response type. Must be "listen" or "reject"';
    END IF;
    
    -- Get current user
    IF responder_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: responder_id must match authenticated user';
    END IF;
    
    -- Get the note details
    SELECT * INTO note_record
    FROM public.whispr_notes
    WHERE id = note_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Note with ID % not found or inactive', note_id;
    END IF;
    
    note_sender_id := note_record.sender_id;
    
    -- Handle the note response
    IF response_type = 'listen' THEN
        -- Try to create buddy relationship when listening to a note
        BEGIN
            buddy_id := public.create_buddy_from_note(note_id, responder_id);
            
            -- Log the buddy creation
            IF buddy_id IS NOT NULL THEN
                RAISE NOTICE 'Buddy relationship created from note % for user %', note_id, responder_id;
            ELSE
                RAISE NOTICE 'Buddy relationship not created (already exists or self-buddy) from note % for user %', note_id, responder_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Log the error but don't fail the note response
            RAISE NOTICE 'Failed to create buddy relationship: %', SQLERRM;
            buddy_id := null;
        END;
        
        -- Mark the note as listened and inactive
        UPDATE public.whispr_notes
        SET
            status = 'listened',
            propagation_count = propagation_count + 1,
            is_active = FALSE,
            expires_at = NOW()
        WHERE id = note_id;
        
    ELSIF response_type = 'reject' THEN
        -- Mark the note as rejected
        UPDATE public.whispr_notes
        SET
            status = 'rejected',
            is_active = FALSE,
            expires_at = NOW()
        WHERE id = note_id;
    END IF;
    
    -- Return success response
    result := jsonb_build_object(
        'success', true,
        'note_id', note_id,
        'responder_id', responder_id,
        'response_type', response_type,
        'buddy_created', buddy_id IS NOT NULL,
        'buddy_id', buddy_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create buddy from note
DROP FUNCTION IF EXISTS public.create_buddy_from_note(uuid, uuid);
CREATE OR REPLACE FUNCTION public.create_buddy_from_note(
    note_id uuid,
    responder_id uuid
)
RETURNS uuid AS $$
DECLARE
    sender_info RECORD;
    buddy_id uuid;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get sender information
    SELECT * INTO sender_info
    FROM public.get_note_sender_info(note_id);
    
    IF sender_info.sender_id IS NULL THEN
        RAISE EXCEPTION 'Note not found or sender information unavailable';
    END IF;
    
    -- Don't create buddy relationship with yourself
    IF sender_info.sender_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot create buddy relationship with yourself';
    END IF;
    
    -- Check if buddy relationship already exists
    IF EXISTS (
        SELECT 1 FROM public.buddies 
        WHERE user_id = current_user_id 
        AND buddy_user_id = sender_info.sender_id
    ) THEN
        -- Relationship already exists, return existing buddy ID
        SELECT id INTO buddy_id
        FROM public.buddies 
        WHERE user_id = current_user_id 
        AND buddy_user_id = sender_info.sender_id;
        
        RETURN buddy_id;
    END IF;
    
    -- Create the buddy relationship
    INSERT INTO public.buddies (
        user_id,
        buddy_user_id,
        name,
        initials,
        avatar_url,
        is_pinned,
        is_online,
        status,
        mood,
        last_message,
        last_message_time,
        unread_count
    ) VALUES (
        current_user_id,
        sender_info.sender_id,
        sender_info.sender_name,
        sender_info.sender_initials,
        sender_info.sender_avatar_url,
        false, -- Not pinned by default
        false, -- Offline by default
        'active',
        null, -- No mood set initially
        null, -- No last message initially
        null, -- No last message time initially
        0 -- No unread messages initially
    ) RETURNING id INTO buddy_id;
    
    -- Also create the reverse relationship (bidirectional)
    INSERT INTO public.buddies (
        user_id,
        buddy_user_id,
        name,
        initials,
        avatar_url,
        is_pinned,
        is_online,
        status,
        mood,
        last_message,
        last_message_time,
        unread_count
    )
    SELECT 
        sender_info.sender_id,
        current_user_id,
        COALESCE(up.display_name, up.username),
        CASE 
            WHEN up.display_name IS NOT NULL THEN 
                UPPER(LEFT(SPLIT_PART(up.display_name, ' ', 1), 1) || 
                      COALESCE(LEFT(SPLIT_PART(up.display_name, ' ', 2), 1), ''))
            ELSE 
                UPPER(LEFT(up.username, 2))
        END,
        up.avatar_url,
        false,
        false,
        'active',
        null,
        null,
        null,
        0
    FROM public.user_profiles up
    WHERE up.id = current_user_id;
    
    RETURN buddy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user buddies
DROP FUNCTION IF EXISTS public.get_user_buddies(uuid);
CREATE OR REPLACE FUNCTION public.get_user_buddies(user_id uuid)
RETURNS TABLE(
    id uuid,
    name text,
    initials text,
    avatar_url text,
    is_pinned boolean,
    is_online boolean,
    status text,
    mood text,
    last_message text,
    last_message_time timestamp with time zone,
    unread_count integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.initials,
        b.avatar_url,
        b.is_pinned,
        b.is_online,
        b.status,
        b.mood,
        b.last_message,
        b.last_message_time,
        b.unread_count,
        b.created_at,
        b.updated_at
    FROM public.buddies b
    WHERE b.user_id = get_user_buddies.user_id
    ORDER BY b.is_pinned DESC, b.last_message_time DESC NULLS LAST, b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send buddy message
DROP FUNCTION IF EXISTS public.send_buddy_message(uuid, text, text);
CREATE OR REPLACE FUNCTION public.send_buddy_message(
    buddy_id_param uuid,
    content text,
    message_type text DEFAULT 'text',
    user_id_param uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    message_id uuid;
    current_user_id uuid;
    target_user_id uuid;
    recipient_buddy_id uuid;
BEGIN
    current_user_id := COALESCE(auth.uid(), user_id_param);
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated or user_id_param must be provided';
    END IF;
    
    -- Verify user owns this buddy relationship and get the buddy_user_id
    SELECT b.buddy_user_id INTO target_user_id
    FROM public.buddies b
    WHERE b.id = buddy_id_param AND b.user_id = current_user_id;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Buddy relationship not found';
    END IF;
    
    -- Insert the message for the sender's buddy relationship
    INSERT INTO public.buddy_messages (
        buddy_id,
        sender_id,
        content,
        message_type
    ) VALUES (
        buddy_id_param,
        current_user_id,
        content,
        message_type
    ) RETURNING id INTO message_id;
    
    -- Update sender's buddy relationship (last message)
    UPDATE public.buddies 
    SET 
        last_message = content,
        last_message_time = now(),
        updated_at = now()
    WHERE id = buddy_id_param;
    
    -- Find the recipient's buddy relationship for this conversation
    SELECT b.id INTO recipient_buddy_id
    FROM public.buddies b
    WHERE b.user_id = target_user_id AND b.buddy_user_id = current_user_id;
    
    -- If recipient buddy relationship exists, create a message record for them too
    IF recipient_buddy_id IS NOT NULL THEN
        
        INSERT INTO public.buddy_messages (
            buddy_id,
            sender_id,
            content,
            message_type
        ) VALUES (
            recipient_buddy_id,
            current_user_id,
            content,
            message_type
        );
        
        -- Update recipient's buddy relationship (last message and unread count)
        UPDATE public.buddies 
        SET 
            last_message = content,
            last_message_time = now(),
            unread_count = unread_count + 1,
            updated_at = now()
        WHERE id = recipient_buddy_id;
    END IF;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark buddy messages as read
DROP FUNCTION IF EXISTS public.mark_buddy_messages_read(uuid);
CREATE OR REPLACE FUNCTION public.mark_buddy_messages_read(buddy_id_param uuid, user_id_param uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Try to get user from auth context first, fallback to parameter
    current_user_id := COALESCE(auth.uid(), user_id_param);
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated or user_id_param must be provided';
    END IF;
    
    -- Mark messages as read for this buddy relationship
    UPDATE public.buddy_messages 
    SET is_read = true
    WHERE buddy_id = buddy_id_param 
    AND sender_id != current_user_id;
    
    -- Reset unread count
    UPDATE public.buddies 
    SET unread_count = 0
    WHERE id = buddy_id_param AND user_id = current_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to toggle buddy pin
DROP FUNCTION IF EXISTS public.toggle_buddy_pin(uuid);
CREATE OR REPLACE FUNCTION public.toggle_buddy_pin(buddy_id_param uuid, user_id_param uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := COALESCE(auth.uid(), user_id_param);
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated or user_id_param must be provided';
    END IF;
    
    -- Toggle pin status
    UPDATE public.buddies 
    SET 
        is_pinned = NOT is_pinned,
        updated_at = now()
    WHERE id = buddy_id_param AND user_id = current_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to block user
DROP FUNCTION IF EXISTS public.block_user(uuid, text);
CREATE OR REPLACE FUNCTION public.block_user(blocked_user_id_param uuid, reason_param text DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Don't allow blocking yourself
    IF current_user_id = blocked_user_id_param THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;
    
    -- Insert into blocked_users table
    INSERT INTO public.blocked_users (blocker_id, blocked_user_id, reason)
    VALUES (current_user_id, blocked_user_id_param, reason_param)
    ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING;
    
    -- Remove buddy relationships
    DELETE FROM public.buddies 
    WHERE (user_id = current_user_id AND buddy_user_id = blocked_user_id_param)
       OR (user_id = blocked_user_id_param AND buddy_user_id = current_user_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unblock user
DROP FUNCTION IF EXISTS public.unblock_user(uuid);
CREATE OR REPLACE FUNCTION public.unblock_user(blocked_user_id_param uuid)
RETURNS boolean AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Remove from blocked_users table
    DELETE FROM public.blocked_users 
    WHERE blocker_id = current_user_id AND blocked_user_id = blocked_user_id_param;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get blocked users
DROP FUNCTION IF EXISTS public.get_blocked_users();
CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS TABLE(
    id uuid,
    blocked_user_id uuid,
    reason text,
    created_at timestamp with time zone
) AS $$
DECLARE
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        bu.id,
        bu.blocked_user_id,
        bu.reason,
        bu.created_at
    FROM public.blocked_users bu
    WHERE bu.blocker_id = current_user_id
    ORDER BY bu.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear chat history
DROP FUNCTION IF EXISTS public.clear_chat_history(uuid);
CREATE OR REPLACE FUNCTION public.clear_chat_history(buddy_id_param uuid)
RETURNS boolean AS $$
DECLARE
    current_user_id uuid;
    target_user_id uuid;
    recipient_buddy_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get the buddy_user_id
    SELECT b.buddy_user_id INTO target_user_id
    FROM public.buddies b
    WHERE b.id = buddy_id_param AND b.user_id = current_user_id;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Buddy relationship not found';
    END IF;
    
    -- Clear messages for sender's buddy relationship
    DELETE FROM public.buddy_messages 
    WHERE buddy_id = buddy_id_param;
    
    -- Update sender's buddy relationship
    UPDATE public.buddies 
    SET 
        last_message = NULL,
        last_message_time = NULL,
        unread_count = 0,
        updated_at = now()
    WHERE id = buddy_id_param;
    
    -- Find and clear recipient's buddy relationship
    SELECT b.id INTO recipient_buddy_id
    FROM public.buddies b
    WHERE b.user_id = target_user_id AND b.buddy_user_id = current_user_id;
    
    IF recipient_buddy_id IS NOT NULL THEN
        -- Clear messages for recipient's buddy relationship
        DELETE FROM public.buddy_messages 
        WHERE buddy_id = recipient_buddy_id;
        
        -- Update recipient's buddy relationship
        UPDATE public.buddies 
        SET 
            last_message = NULL,
            last_message_time = NULL,
            unread_count = 0,
            updated_at = now()
        WHERE id = recipient_buddy_id;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test data (optional - remove in production)
-- Note: This assumes your user_profiles table has the required fields
-- INSERT INTO public.whispr_notes (sender_id, content, mood) VALUES 
--   ('user-uuid-1', 'Feeling grateful for the small moments today 🌟', 'grateful'),
--   ('user-uuid-2', 'Anyone else feeling the Monday blues? 😔', 'sad')
-- ON CONFLICT DO NOTHING;
