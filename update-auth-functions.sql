-- Update database functions to work with mobile app authentication
-- Run this in your Supabase SQL Editor

-- Update mark_buddy_messages_read function
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

-- Update send_buddy_message function
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

-- Update toggle_buddy_pin function
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




