# Whispr Buddy Logic Flow Documentation

## 🎯 **Complete Buddy System Flow: From Whispr Notes to Chat**

This document provides a comprehensive guide to the buddy logic flow in Whispr, from accepting Whispr notes to creating buddy relationships and enabling chat functionality. Use this as a reference for developing the mobile app.

---

## 📋 **Overview**

The buddy system in Whispr follows this flow:
1. **Whispr Notes** → User receives anonymous messages
2. **Note Acceptance** → User "listens" to a note (accepts it)
3. **Buddy Creation** → System automatically creates buddy relationship
4. **Chat Interface** → Users can now chat directly
5. **Message Management** → Real-time messaging with read receipts

---

## 🗄️ **Database Schema**

### **Core Tables**

#### **1. `whispr_notes` Table**
```sql
CREATE TABLE public.whispr_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL REFERENCES auth.users(id),
    content text NOT NULL,
    mood text NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'listened', 'rejected', 'expired')),
    propagation_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

#### **2. `buddies` Table**
```sql
CREATE TABLE public.buddies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    buddy_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    initials text NOT NULL,
    avatar_url text,
    is_pinned boolean DEFAULT false,
    is_online boolean DEFAULT false,
    status text DEFAULT 'active' CHECK (status IN ('active', 'away', 'busy', 'invisible')),
    mood text,
    last_message text,
    last_message_time timestamp with time zone,
    unread_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique buddy relationships
    UNIQUE(user_id, buddy_user_id)
);
```

#### **3. `buddy_messages` Table**
```sql
CREATE TABLE public.buddy_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buddy_id uuid NOT NULL REFERENCES public.buddies(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'emoji')),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

#### **4. `blocked_users` Table**
```sql
CREATE TABLE public.blocked_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(blocker_id, blocked_user_id)
);
```

---

## 🔄 **Complete Flow Process**

### **Step 1: Whispr Notes Reception**

#### **Frontend Component: `WhisprNoteInbox`**
```typescript
// File: src/components/whispr-note-inbox.tsx

const handleListen = async (noteId: string) => {
  try {
    await listenToNote(noteId)
    
    // Show success message
    toast.success('Note listened to! Check your Buddies tab to start chatting.', {
      duration: 4000,
      icon: '👂',
    })
  } catch (error) {
    console.error('Error listening to note:', error)
    toast.error('Failed to listen to note. Please try again.')
  }
}
```

#### **Store Action: `listenToNote`**
```typescript
// File: src/store/notes-store.ts
listenToNote: async (noteId: string) => {
  const { data, error } = await supabase.rpc('handle_note_propagation', {
    note_id: noteId,
    responder_id: user.id,
    response_type: 'listen'
  })
  
  if (error) throw error
  return data
}
```

### **Step 2: Database Function Processing**

#### **Function: `handle_note_propagation`**
```sql
-- File: supabase/migrations/022_add_status_column_and_fix_function.sql

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
```

### **Step 3: Buddy Creation**

#### **Function: `create_buddy_from_note`**
```sql
-- File: supabase/migrations/018_integrate_whispr_notes_to_buddies.sql

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
```

### **Step 4: Buddy List Management**

#### **Service Layer: `BuddiesService`**
```typescript
// File: src/lib/buddies-service.ts

export class BuddiesService {
  // Get all buddies for the current user
  static async getBuddies(retryCount: number = 0): Promise<Buddy[]> {
    const maxRetries = 3
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('get_user_buddies', {
        user_id: user.id
      })

      if (error) {
        console.error('Error fetching buddies:', error)
        
        // Retry logic for connection errors
        if (error.message.includes('connection') || error.message.includes('disconnected')) {
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying buddies fetch (attempt ${retryCount + 1}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
            return this.getBuddies(retryCount + 1)
          }
        }
        
        throw new Error(`Failed to fetch buddies: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getBuddies:', error)
      throw error
    }
  }
}
```

#### **Store Management: `useBuddiesStore`**
```typescript
// File: src/store/buddies-store.ts

export const useBuddiesStore = create<BuddiesStore>()(
  persist(
    (set, get) => ({
      // Fetch buddies from database
      fetchBuddies: async () => {
        try {
          set({ isLoading: true, error: null })
          
          console.log('Fetching buddies...')
          const buddies = await BuddiesService.getBuddies()
          console.log('Raw buddies from database:', buddies)
          
          // Transform database buddies to store format
          const transformedBuddies: Buddy[] = buddies.map((buddy: DatabaseBuddy) => ({
            id: buddy.id,
            name: buddy.name,
            initials: buddy.initials,
            avatar: buddy.avatar_url || undefined,
            lastMessage: buddy.last_message || undefined,
            lastMessageTime: buddy.last_message_time ? new Date(buddy.last_message_time) : undefined,
            unreadCount: buddy.unread_count,
            isOnline: buddy.is_online,
            isPinned: buddy.is_pinned,
            status: buddy.status,
            mood: buddy.mood || undefined,
            createdAt: new Date(buddy.created_at),
            updatedAt: new Date(buddy.updated_at),
          }))

          console.log('Transformed buddies:', transformedBuddies)
          set({ buddies: transformedBuddies, isLoading: false })
          
          // Pre-load messages for the first few buddies to improve UX
          const buddiesToPreload = transformedBuddies.slice(0, 3)
          for (const buddy of buddiesToPreload) {
            try {
              await get().fetchMessages(buddy.id)
              console.log(`✅ Pre-loaded messages for ${buddy.name}`)
            } catch (error) {
              console.warn(`⚠️ Failed to pre-load messages for ${buddy.name}:`, error)
            }
          }
        } catch (error) {
          console.error('Error fetching buddies:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch buddies',
            isLoading: false 
          })
        }
      },
    }),
    {
      name: 'whispr-buddies-store',
      partialize: (state) => ({
        buddies: state.buddies,
        selectedBuddy: state.selectedBuddy,
        filter: state.filter,
      }),
    }
  )
)
```

### **Step 5: Chat Interface**

#### **Message Sending**
```typescript
// File: src/lib/buddies-service.ts

static async sendMessage(
  buddyId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' | 'emoji' = 'text'
): Promise<string> {
  const { data, error } = await supabase.rpc('send_buddy_message', {
    buddy_id_param: buddyId,
    content,
    message_type: messageType
  })

  if (error) {
    console.error('Error sending message:', error)
    throw new Error(`Failed to send message: ${error.message}`)
  }

  return data
}
```

#### **Database Function: `send_buddy_message`**
```sql
-- File: supabase/migrations/029_fix_send_message_bidirectional.sql

CREATE OR REPLACE FUNCTION public.send_buddy_message(
    buddy_id_param uuid,
    content text,
    message_type text DEFAULT 'text'
)
RETURNS uuid AS $$
DECLARE
    message_id uuid;
    current_user_id uuid;
    target_user_id uuid;
    recipient_buddy_id uuid;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
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
```

### **Step 6: Real-time Updates**

#### **Supabase Realtime Subscription**
```typescript
// File: src/lib/buddies-service.ts

static subscribeToBuddiesUpdates(
  onUpdate: (payload: any) => void,
  onError?: (error: any) => void,
  onStatusChange?: (status: string) => void
) {
  const subscription = supabase
    .channel('buddies-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'buddies'
      },
      (payload) => onUpdate({...payload, table: 'buddies'})
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'buddy_messages'
      },
      (payload) => onUpdate({...payload, table: 'buddy_messages'})
    )
    .subscribe((status) => {
      console.log('Supabase subscription status:', status)
      onStatusChange?.(status)
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to buddies updates')
        console.log('📡 Listening for changes on tables: buddies, buddy_messages')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to buddies updates')
        onError?.(new Error('Failed to subscribe to buddies updates'))
      }
    })

  return subscription
}
```

---

## 🔧 **Key Database Functions**

### **1. Buddy Management Functions**

#### **`get_user_buddies(user_id uuid)`**
- Returns all buddies for a specific user
- Includes buddy information, last message, unread count
- Used by frontend to populate buddy list

#### **`add_buddy(buddy_user_id uuid, buddy_name text, buddy_initials text, buddy_avatar_url text)`**
- Manually add a buddy relationship
- Creates bidirectional relationship
- Returns the buddy ID

#### **`update_buddy_status(buddy_id uuid, is_online boolean, status text, mood text)`**
- Updates buddy online status, status, and mood
- Used for presence tracking

#### **`toggle_buddy_pin(buddy_id uuid)`**
- Toggles the pinned status of a buddy
- Pinned buddies appear at the top of the list

### **2. Message Functions**

#### **`send_buddy_message(buddy_id_param uuid, content text, message_type text)`**
- Sends a message between buddies
- Creates message records for both users
- Updates last message and unread count
- Returns message ID

#### **`mark_buddy_messages_read(buddy_id uuid)`**
- Marks all messages as read for a buddy
- Resets unread count to 0
- Handles bidirectional relationships

#### **`clear_chat_history(buddy_id_param uuid)`**
- Clears all messages between two users
- Removes message records from both buddy relationships
- Resets last message and unread count

### **3. Blocking Functions**

#### **`block_user(blocked_user_id_param uuid, reason_param text)`**
- Blocks a user and removes buddy relationship
- Adds entry to blocked_users table
- Prevents future interactions

#### **`unblock_user(blocked_user_id_param uuid)`**
- Unblocks a user
- Removes entry from blocked_users table
- Allows future interactions

#### **`get_blocked_users()`**
- Returns list of blocked users
- Includes blocking reason and timestamp

---

## 📱 **Mobile App Implementation Guide**

### **1. Database Integration**

#### **Supabase Client Setup**
```typescript
// Mobile app setup
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

#### **Authentication Flow**
```typescript
// Sign up/Sign in
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// Profile completion
const { data, error } = await supabase
  .from('user_profiles')
  .insert({
    id: user.id,
    username: 'username',
    display_name: 'Display Name',
    // ... other profile fields
  })
```

### **2. Whispr Notes Implementation**

#### **Note Reception**
```typescript
// Fetch received notes
const { data: notes, error } = await supabase
  .from('whispr_notes')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })

// Listen to a note (accept it)
const { data, error } = await supabase.rpc('handle_note_propagation', {
  note_id: noteId,
  responder_id: user.id,
  response_type: 'listen'
})
```

### **3. Buddy Management**

#### **Fetch Buddies**
```typescript
// Get user's buddies
const { data: buddies, error } = await supabase.rpc('get_user_buddies', {
  user_id: user.id
})
```

#### **Real-time Updates**
```typescript
// Subscribe to buddy updates
const subscription = supabase
  .channel('buddies-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'buddies'
  }, (payload) => {
    // Handle buddy updates
    console.log('Buddy updated:', payload)
  })
  .subscribe()
```

### **4. Chat Implementation**

#### **Send Message**
```typescript
// Send a message
const { data, error } = await supabase.rpc('send_buddy_message', {
  buddy_id_param: buddyId,
  content: messageText,
  message_type: 'text'
})
```

#### **Fetch Messages**
```typescript
// Get messages for a buddy
const { data: messages, error } = await supabase
  .from('buddy_messages')
  .select('*')
  .eq('buddy_id', buddyId)
  .order('created_at', { ascending: true })
```

#### **Mark Messages as Read**
```typescript
// Mark messages as read
const { data, error } = await supabase.rpc('mark_buddy_messages_read', {
  buddy_id_param: buddyId
})
```

### **5. State Management (Mobile)**

#### **Zustand Store (React Native)**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BuddiesState {
  buddies: Buddy[]
  selectedBuddy: string | null
  messages: Record<string, Message[]>
  isLoading: boolean
}

interface BuddiesActions {
  fetchBuddies: () => Promise<void>
  sendMessage: (buddyId: string, content: string) => Promise<void>
  markMessagesAsRead: (buddyId: string) => Promise<void>
  setSelectedBuddy: (buddyId: string | null) => void
}

export const useBuddiesStore = create<BuddiesState & BuddiesActions>()(
  persist(
    (set, get) => ({
      buddies: [],
      selectedBuddy: null,
      messages: {},
      isLoading: false,
      
      fetchBuddies: async () => {
        set({ isLoading: true })
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('User not authenticated')
          
          const { data, error } = await supabase.rpc('get_user_buddies', {
            user_id: user.id
          })
          
          if (error) throw error
          
          set({ buddies: data || [], isLoading: false })
        } catch (error) {
          console.error('Error fetching buddies:', error)
          set({ isLoading: false })
        }
      },
      
      sendMessage: async (buddyId: string, content: string) => {
        try {
          const { data, error } = await supabase.rpc('send_buddy_message', {
            buddy_id_param: buddyId,
            content,
            message_type: 'text'
          })
          
          if (error) throw error
          
          // Refresh messages
          await get().fetchMessages(buddyId)
        } catch (error) {
          console.error('Error sending message:', error)
        }
      },
      
      markMessagesAsRead: async (buddyId: string) => {
        try {
          const { data, error } = await supabase.rpc('mark_buddy_messages_read', {
            buddy_id_param: buddyId
          })
          
          if (error) throw error
        } catch (error) {
          console.error('Error marking messages as read:', error)
        }
      },
      
      setSelectedBuddy: (buddyId: string | null) => {
        set({ selectedBuddy: buddyId })
      },
    }),
    {
      name: 'whispr-buddies-store',
      partialize: (state) => ({
        buddies: state.buddies,
        selectedBuddy: state.selectedBuddy,
      }),
    }
  )
)
```

---

## 🔄 **Complete Flow Summary**

### **1. User Journey**
```
Whispr Notes → Listen to Note → Buddy Created → Chat Interface
     ↓              ↓              ↓              ↓
  Receive        Accept Note    Auto-create    Send Messages
  Anonymous      (Listen)       Relationship   Real-time
  Messages                       Bidirectional  Updates
```

### **2. Database Operations**
```
whispr_notes → handle_note_propagation → create_buddy_from_note → buddies table
     ↓                    ↓                        ↓                    ↓
  Note Status         Note Processing          Buddy Creation        Chat Ready
  Updated             Triggers                 Bidirectional         Real-time
  (listened)          Buddy Creation           Relationship          Messaging
```

### **3. Frontend Integration**
```
Notes Store → Buddies Store → Chat Interface → Real-time Updates
     ↓              ↓              ↓              ↓
  Note Actions    Buddy List    Message Send    Live Updates
  (Listen/Reject) Management   & Receive       & Read Receipts
```

---

## 📋 **Implementation Checklist for Mobile App**

### **Core Features**
- [ ] **Authentication**: Sign up, sign in, profile completion
- [ ] **Whispr Notes**: Receive, listen to, reject notes
- [ ] **Buddy Management**: List, search, filter, pin buddies
- [ ] **Chat Interface**: Send/receive messages, read receipts
- [ ] **Real-time Updates**: Live messaging, online status
- [ ] **Blocking**: Block/unblock users, manage blocked list

### **Database Functions to Implement**
- [ ] `handle_note_propagation` - Note acceptance/rejection
- [ ] `create_buddy_from_note` - Automatic buddy creation
- [ ] `get_user_buddies` - Fetch buddy list
- [ ] `send_buddy_message` - Send messages
- [ ] `mark_buddy_messages_read` - Read receipts
- [ ] `clear_chat_history` - Clear messages
- [ ] `block_user` / `unblock_user` - User blocking
- [ ] `toggle_buddy_pin` - Pin/unpin buddies

### **Real-time Features**
- [ ] **Supabase Realtime**: Subscribe to buddy updates
- [ ] **Message Updates**: Live message delivery
- [ ] **Online Status**: Real-time presence tracking
- [ ] **Typing Indicators**: Show when users are typing
- [ ] **Push Notifications**: Notify on new messages

### **Mobile-Specific Features**
- [ ] **Offline Support**: Queue messages when offline
- [ ] **Push Notifications**: Background message notifications
- [ ] **Camera Integration**: Profile pictures, image messages
- [ ] **Location Services**: Country selection for profile
- [ ] **Biometric Auth**: Fingerprint/Face ID login
- [ ] **Deep Linking**: Direct chat links

---

## 🎯 **Key Points for Mobile Development**

1. **Bidirectional Relationships**: Every buddy relationship creates two records (one for each user)
2. **Real-time Updates**: Use Supabase Realtime for live messaging
3. **Error Handling**: Implement retry logic for network issues
4. **State Management**: Use Zustand or similar for client-side state
5. **Authentication**: Ensure proper session management
6. **Performance**: Pre-load messages for active conversations
7. **Offline Support**: Queue messages and sync when online
8. **Push Notifications**: Implement background message delivery

This documentation provides everything needed to implement the complete buddy system flow in your mobile app! 🚀
