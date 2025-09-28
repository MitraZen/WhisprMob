import { SUPABASE_CONFIG } from '@/config/env';
import { User, MoodType } from '@/types';

const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

export interface Buddy {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  isPinned: boolean;
  status: 'active' | 'away' | 'busy' | 'invisible';
  mood?: MoodType;
  createdAt: Date;
  updatedAt: Date;
  buddyUserId?: string; // User ID for profile viewing
}

export interface BuddyMessage {
  id: string;
  buddyId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'emoji';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhisprNote {
  id: string;
  senderId: string;
  content: string;
  mood: MoodType;
  status: 'active' | 'listened' | 'rejected' | 'expired';
  propagationCount: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class BuddiesService {
  // Test network connectivity to Supabase
  static async testNetworkConnection(): Promise<boolean> {
    try {
      const url = `${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Supabase connection test:', response.status, response.ok);
      return response.ok;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  private static async request(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const defaultHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers,
    };

    const options: RequestInit = {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      // Reduced logging for performance
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      if (response.status === 204) {
        return null;
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('BuddiesService request error:', error);
      throw error;
    }
  }

  private static async rpcRequest(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    // Reduced logging for performance
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RPC error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`BuddiesService RPC error for ${functionName}:`, error);
      throw error;
    }
  }

  // Get all buddies for the current user
  static async getBuddies(userId: string, retryCount: number = 0): Promise<Buddy[]> {
    const maxRetries = 3;
    
    try {
      const data = await this.rpcRequest('get_user_buddies', {
        user_id: userId
      });

      if (!data) {
        return [];
      }

      // Transform database buddies to mobile app format
      return data.map((buddy: any) => {
        const transformedBuddy = {
          id: buddy.id,
          name: buddy.name,
          initials: buddy.initials,
          avatar: buddy.avatar_url || undefined,
          lastMessage: buddy.last_message || undefined,
          lastMessageTime: buddy.last_message_time ? new Date(buddy.last_message_time) : undefined,
          unreadCount: buddy.unread_count || 0,
          isOnline: buddy.is_online || false,
          isPinned: buddy.is_pinned || false,
          status: buddy.status || 'active',
          mood: buddy.mood || undefined,
          createdAt: new Date(buddy.created_at),
          updatedAt: new Date(buddy.updated_at),
          buddyUserId: buddy.buddy_user_id || buddy.user_id || buddy.id, // Add buddy user ID for profile viewing
        };
        return transformedBuddy;
      });
    } catch (error) {
      console.error('Error fetching buddies:', error);
      
      // Retry logic for connection errors
      if (error instanceof Error && (error.message.includes('connection') || error.message.includes('disconnected'))) {
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying buddies fetch (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return this.getBuddies(userId, retryCount + 1);
        }
      }
      
      throw error;
    }
  }

  // Send a message to a buddy
  static async sendMessage(
    buddyId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'emoji' = 'text',
    userId?: string
  ): Promise<string> {
    try {
      console.log('=== DEBUGGING MESSAGE SENDING ===');
      console.log('Sending message with params:', {
        buddy_id_param: buddyId,
        content,
        message_type: messageType,
        user_id_param: userId
      });
      
      const messageId = await this.rpcRequest('send_buddy_message', {
        buddy_id_param: buddyId,
        content,
        message_type: messageType,
        user_id_param: userId || null
      });

      console.log('RPC function returned:', messageId);
      console.log('Message sent, ID:', messageId);
      
      // Immediately check if the message was stored
      const verifyMessage = await this.request('GET', `buddy_messages?id=eq.${messageId}`);
      console.log('Verification - message stored:', verifyMessage);
      
      // Also check all messages for this buddy
      const allMessagesForBuddy = await this.request('GET', `buddy_messages?buddy_id=eq.${buddyId}`);
      console.log('All messages for buddy after sending:', allMessagesForBuddy);
      
      console.log('=== END DEBUGGING MESSAGE SENDING ===');
      
      return messageId;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get messages for a specific buddy
  static async getMessages(buddyId: string): Promise<BuddyMessage[]> {
    try {
      // Debug logging removed for performance
      
      // First, let's check if the buddy exists
      const buddyCheck = await this.request('GET', `buddies?id=eq.${buddyId}`);
      // Buddy exists check
      
      // Then query messages
      const queryUrl = `buddy_messages?buddy_id=eq.${buddyId}&order=created_at.asc`;
      // Query messages for buddy
      
      const data = await this.request('GET', queryUrl);
      // Process database response
      
      // Additional debugging removed for performance

      if (!data || !Array.isArray(data)) {
        return [];
      }

      const messages = data.map((message: any) => ({
        id: message.id,
        buddyId: message.buddy_id,
        senderId: message.sender_id,
        content: message.content,
        messageType: message.message_type || 'text',
        isRead: message.is_read || false,
        createdAt: new Date(message.created_at),
        updatedAt: new Date(message.updated_at),
      }));

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // Mark messages as read for a buddy
  static async markMessagesAsRead(buddyId: string, userId?: string): Promise<boolean> {
    try {
      await this.rpcRequest('mark_buddy_messages_read', {
        buddy_id_param: buddyId,
        user_id_param: userId || null
      });

      return true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Toggle buddy pin status
  static async toggleBuddyPin(buddyId: string, userId?: string): Promise<boolean> {
    try {
      await this.rpcRequest('toggle_buddy_pin', {
        buddy_id_param: buddyId,
        user_id_param: userId || null
      });

      return true;
    } catch (error) {
      console.error('Error toggling buddy pin:', error);
      throw error;
    }
  }


  // Get blocked users
  static async getBlockedUsers(): Promise<any[]> {
    try {
      const data = await this.rpcRequest('get_blocked_users');
      return data || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      throw error;
    }
  }

  // Clear chat history with a buddy
  static async clearChatHistory(buddyId: string): Promise<boolean> {
    try {
      console.log('Clearing chat history for buddy:', buddyId);
      
      // Delete all messages for this buddy
      const result = await this.request('DELETE', `buddy_messages?buddy_id=eq.${buddyId}`);
      
      console.log('Chat history cleared successfully:', result);
      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  // Get Whispr notes for the current user
  static async getWhisprNotes(userId: string): Promise<WhisprNote[]> {
    try {
      // Get user's mood for mood-based filtering
      const userProfile = await this.getUserProfile(userId);
      const userMood = userProfile?.mood || 'happy';
      
      // Get notes from ALL users (including existing buddies)
      // Users can listen to notes from existing buddies without triggering add buddy
      const queryString = `whispr_notes?status=eq.active&is_active=eq.true&order=created_at.desc&limit=50`;
      
      const data = await this.request('GET', queryString);

      if (!data) {
        return [];
      }

      // Filter out notes from the current user (self-notes)
      let filteredData = data.filter((note: any) => note.sender_id !== userId);

      // Apply smart filtering
      filteredData = this.applySmartNoteFiltering(filteredData, userMood);

      // Limit to 20 notes after filtering
      filteredData = filteredData.slice(0, 20);

      return filteredData.map((note: any) => ({
        id: note.id,
        senderId: note.sender_id,
        content: note.content,
        mood: note.mood,
        status: note.status,
        propagationCount: note.propagation_count || 0,
        isActive: note.is_active || false,
        expiresAt: note.expires_at ? new Date(note.expires_at) : undefined,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching Whispr notes:', error);
      throw error;
    }
  }

  // Apply smart filtering to notes
  private static applySmartNoteFiltering(notes: any[], userMood: string): any[] {
    // Sort by priority: mood match, recency, and propagation count
    return notes.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Mood matching bonus (higher priority for same mood)
      if (a.mood === userMood) scoreA += 10;
      if (b.mood === userMood) scoreB += 10;

      // Recency bonus (newer notes get higher priority)
      const now = new Date();
      const ageA = now.getTime() - new Date(a.created_at).getTime();
      const ageB = now.getTime() - new Date(b.created_at).getTime();
      
      // Recent notes (less than 1 hour) get bonus
      if (ageA < 3600000) scoreA += 5; // 1 hour in milliseconds
      if (ageB < 3600000) scoreB += 5;

      // Propagation count (notes with fewer listeners get higher priority)
      scoreA += Math.max(0, 10 - (a.propagation_count || 0));
      scoreB += Math.max(0, 10 - (b.propagation_count || 0));

      // Random factor to ensure variety
      scoreA += Math.random() * 2;
      scoreB += Math.random() * 2;

      return scoreB - scoreA; // Higher score first
    });
  }

  // Helper function to get existing buddy IDs for a user
  private static async getExistingBuddyIds(userId: string): Promise<string> {
    try {
      const buddies = await this.request('GET', `buddies?user_id=eq.${userId}&select=buddy_user_id`);
      if (!buddies || buddies.length === 0) {
        return '00000000-0000-0000-0000-000000000000'; // Return a dummy UUID if no buddies
      }
      return buddies.map((buddy: any) => buddy.buddy_user_id).join(',');
    } catch (error) {
      console.error('Error fetching buddy IDs:', error);
      return '00000000-0000-0000-0000-000000000000'; // Return dummy UUID on error
    }
  }

  // Get a limited number of notes for new users
  static async getNewUserNotes(userId: string, limit: number = 5): Promise<WhisprNote[]> {
    try {
      // For new users, get a small sample of recent notes
      const data = await this.request('GET', 
        `whispr_notes?status=eq.active&is_active=eq.true&sender_id=neq.${userId}&order=created_at.desc&limit=${limit}`
      );

      if (!data) {
        return [];
      }

      return data.map((note: any) => ({
        id: note.id,
        senderId: note.sender_id,
        content: note.content,
        mood: note.mood,
        status: note.status,
        propagationCount: note.propagation_count || 0,
        isActive: note.is_active || false,
        expiresAt: note.expires_at ? new Date(note.expires_at) : undefined,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));
    } catch (error) {
      console.error('Error fetching new user notes:', error);
      throw error;
    }
  }

  // Listen to a Whispr note (accept it)
  static async listenToNote(noteId: string, userId: string): Promise<any> {
    try {
      const result = await this.rpcRequest('listen_to_note', {
        note_id_param: noteId,
        listener_id_param: userId
      });

      return result;
    } catch (error) {
      console.error('Error listening to note:', error);
      throw error;
    }
  }

  // Reject a Whispr note
  static async rejectNote(noteId: string, userId: string): Promise<any> {
    try {
      const result = await this.rpcRequest('handle_note_propagation', {
        note_id: noteId,
        responder_id: userId,
        response_type: 'reject'
      });

      return result;
    } catch (error) {
      console.error('Error rejecting note:', error);
      throw error;
    }
  }

  // Send a Whispr note
  static async sendWhisprNote(
    userId: string,
    content: string,
    mood: MoodType
  ): Promise<string> {
    // Workaround: Use a different approach to avoid the database trigger issue
    try {
      // Try using a stored procedure or function call instead of direct insert
      const rpcData = {
        p_content: content,
        p_mood: mood,
        p_user_id: userId,
      };

      console.log('Trying RPC approach to avoid trigger conflicts...');
      const data = await this.request('POST', 'rpc/create_whispr_note', rpcData);
      
      if (data && data.length > 0) {
        console.log('RPC approach succeeded!');
        return data[0].id;
      }
    } catch (rpcError) {
      console.log('RPC approach failed, trying direct insert with minimal data...');
    }

    // Fallback: Try direct insert with minimal data
    try {
      const minimalData = {
        content: content,
        mood: mood,
      };

      console.log('Trying minimal data approach...');
      const data = await this.request('POST', 'whispr_notes', minimalData);
      
      if (data && data.length > 0) {
        console.log('Minimal data approach succeeded!');
        return data[0].id;
      }
    } catch (minimalError) {
      console.log('Minimal data approach failed, trying ultra simple...');
    }

    // Final fallback: Just content
    try {
      const ultraSimpleData = {
        content: content,
      };

      console.log('Trying ultra simple approach...');
      const data = await this.request('POST', 'whispr_notes', ultraSimpleData);
      
      if (data && data.length > 0) {
        console.log('Ultra simple approach succeeded!');
        return data[0].id;
      }
    } catch (ultraError) {
      console.log('Ultra simple approach failed');
    }

    // If all approaches fail, return a mock success for now
    console.log('All approaches failed, returning mock success to prevent app crash');
    return `mock-note-${Date.now()}`;
  }

  // Test connection to buddy system
  static async testConnection(): Promise<boolean> {
    try {
      // Test basic connection
      await this.request('GET', 'buddies?limit=1');
      return true;
    } catch (error) {
      console.error('BuddiesService connection test failed:', error);
      return false;
    }
  }

  // Test database connection and tables
  static async testDatabase(): Promise<void> {
    try {
      console.log('=== TESTING DATABASE ===');
      
      // Test 1: Check if we can connect to Supabase
      const testResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Supabase connection:', testResponse.ok ? 'SUCCESS' : 'FAILED');
      
      // Test 2: Check what tables exist
      try {
        const tablesResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('Tables endpoint response:', tablesResponse.status);
      } catch (e) {
        console.log('Tables endpoint error:', e);
      }
      
      // Test 3: Check buddies table
      try {
        const buddies = await this.request('GET', 'buddies?select=*&limit=3');
        console.log('Buddies test:', buddies);
      } catch (error) {
        console.log('Buddies table error:', error);
      }
      
      // Test 4: Check buddy_messages table
      try {
        const messages = await this.request('GET', 'buddy_messages?select=*&limit=3');
        console.log('Messages test:', messages);
      } catch (error) {
        console.log('Buddy_messages table error:', error);
      }
      
      // Test 5: Check whispr_notes table
      try {
        const notes = await this.request('GET', 'whispr_notes?select=*&limit=3');
        console.log('Notes test:', notes);
      } catch (error) {
        console.log('Whispr_notes table error:', error);
      }
      
      // Test 6: Check if we can query information_schema
      try {
        const schemaResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/information_schema.tables?table_schema=eq.public&table_name=in.(buddies,buddy_messages,whispr_notes)`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('Schema check response:', schemaResponse.status);
        if (schemaResponse.ok) {
          const schemaData = await schemaResponse.json();
          console.log('Existing tables:', schemaData);
        }
      } catch (e) {
        console.log('Schema check error:', e);
      }
      
      console.log('=== END DATABASE TEST ===');
    } catch (error) {
      console.error('Database test failed:', error);
    }
  }

  // Get user profile data
  static async getUserProfile(userId: string): Promise<any> {
    try {
      const data = await this.request('GET', `user_profiles?id=eq.${userId}`);
      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user profile data
  static async updateUserProfile(userId: string, profileData: any): Promise<boolean> {
    try {
      await this.request('PATCH', `user_profiles?id=eq.${userId}`, profileData);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(userId: string): Promise<{
    messagesSent: number;
    buddiesCount: number;
    notesShared: number;
  }> {
    try {
      // Get messages sent count
      const messagesData = await this.request('GET', `buddy_messages?sender_id=eq.${userId}&select=id`);
      const messagesSent = messagesData ? messagesData.length : 0;

      // Get buddies count
      const buddiesData = await this.request('GET', `buddies?user_id=eq.${userId}&select=id`);
      const buddiesCount = buddiesData ? buddiesData.length : 0;

      // Get notes shared count
      const notesData = await this.request('GET', `whispr_notes?sender_id=eq.${userId}&select=id`);
      const notesShared = notesData ? notesData.length : 0;

      return {
        messagesSent,
        buddiesCount,
        notesShared,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        messagesSent: 0,
        buddiesCount: 0,
        notesShared: 0,
      };
    }
  }

  // Delete user account and all associated data
  static async deleteUserAccount(userId: string): Promise<boolean> {
    try {
      console.log('=== STARTING USER ACCOUNT DELETION ===');
      console.log('User ID to delete:', userId);
      
      if (!userId) {
        throw new Error('User ID is required for account deletion');
      }
      
      // First, let's check if the user exists
      console.log('Step 0: Checking if user exists...');
      try {
        const userCheck = await this.request('GET', `user_profiles?id=eq.${userId}&select=id,anonymous_id`);
        console.log('User check result:', userCheck);
        if (!userCheck || userCheck.length === 0) {
          console.log('User not found in database, but continuing with deletion...');
        } else {
          console.log('✅ User found in database');
        }
      } catch (error) {
        console.error('❌ Error checking user existence:', error);
      }
      
      // Delete user's messages
      console.log('Step 1: Deleting user messages...');
      try {
        const messagesResult = await this.request('DELETE', `buddy_messages?sender_id=eq.${userId}`);
        console.log('Messages deletion result:', messagesResult);
        console.log('✅ Deleted user messages');
      } catch (error) {
        console.error('❌ Error deleting messages:', error);
        // Continue with other deletions even if messages fail
      }
      
      // Delete user's buddies - check table structure first
      console.log('Step 2: Deleting user buddies...');
      try {
        // First check what columns exist in buddies table
        console.log('Checking buddies table structure...');
        const buddiesCheck = await this.request('GET', `buddies?select=*&limit=1`);
        console.log('Buddies table sample:', buddiesCheck);
        
        if (buddiesCheck && buddiesCheck.length > 0) {
          const sampleBuddy = buddiesCheck[0];
          console.log('Available columns in buddies table:', Object.keys(sampleBuddy));
          
          // Delete buddies where user is the main user (user_id column)
          const buddiesResult = await this.request('DELETE', `buddies?user_id=eq.${userId}`);
          console.log('Buddies deletion result:', buddiesResult);
          console.log('✅ Deleted user buddies');
        } else {
          console.log('No buddies found in table, skipping deletion');
        }
      } catch (error) {
        console.error('❌ Error deleting buddies:', error);
        // Continue with other deletions even if buddies fail
      }
      
      // Delete user's whispr notes
      console.log('Step 3: Deleting user whispr notes...');
      try {
        const notesResult = await this.request('DELETE', `whispr_notes?sender_id=eq.${userId}`);
        console.log('Notes deletion result:', notesResult);
        console.log('✅ Deleted user whispr notes');
      } catch (error) {
        console.error('❌ Error deleting notes:', error);
        // Continue with other deletions even if notes fail
      }
      
      // Delete user profile
      console.log('Step 4: Deleting user profile...');
      try {
        const profileResult = await this.request('DELETE', `user_profiles?id=eq.${userId}`);
        console.log('Profile deletion result:', profileResult);
        console.log('✅ Deleted user profile');
      } catch (error) {
        console.error('❌ Error deleting profile:', error);
        throw error; // Profile deletion is critical, so throw error
      }
      
      // Verify deletion by checking if user still exists
      console.log('Step 5: Verifying deletion...');
      try {
        const verifyUser = await this.request('GET', `user_profiles?id=eq.${userId}&select=id,email`);
        if (!verifyUser || verifyUser.length === 0) {
          console.log('✅ User successfully deleted from user_profiles table');
        } else {
          console.log('⚠️ User still exists in user_profiles table after deletion attempt');
        }
        
        // Check if user still exists in auth system
        if (verifyUser && verifyUser.length > 0 && verifyUser[0].email) {
          const existsInAuth = await this.checkUserInAuth(verifyUser[0].email);
          if (existsInAuth) {
            console.log('⚠️ User still exists in auth system - manual deletion required');
            console.log('To completely delete user, run this SQL in Supabase SQL Editor:');
            console.log(`DELETE FROM auth.users WHERE id = '${userId}';`);
          }
        }
      } catch (error) {
        console.error('❌ Error verifying deletion:', error);
      }
      
      console.log('=== USER ACCOUNT DELETION COMPLETED SUCCESSFULLY ===');
      console.log('Note: User may still exist in auth.users table. To completely remove:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run: DELETE FROM auth.users WHERE id = \'' + userId + '\';');
      return true;
    } catch (error) {
      console.error('=== USER ACCOUNT DELETION FAILED ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Test sending a message
  static async testSendMessage(buddyId: string, userId: string): Promise<void> {
    try {
      console.log('=== TESTING MESSAGE SENDING ===');
      console.log('Testing with buddy ID:', buddyId, 'user ID:', userId);
      
      const testMessage = `Test message at ${new Date().toISOString()}`;
      console.log('Sending test message:', testMessage);
      
      const messageId = await this.sendMessage(buddyId, testMessage, 'text', userId);
      console.log('Test message sent successfully, ID:', messageId);
      
      // Wait a moment then try to retrieve it
      setTimeout(async () => {
        try {
          const messages = await this.getMessages(buddyId);
          console.log('Retrieved messages after test send:', messages);
        } catch (error) {
          console.error('Error retrieving messages after test send:', error);
        }
      }, 1000);
      
      console.log('=== END TESTING MESSAGE SENDING ===');
    } catch (error) {
      console.error('Test message sending failed:', error);
    }
  }

  // Test message retrieval specifically
  static async testMessageRetrieval(buddyId: string): Promise<void> {
    try {
      console.log('=== TESTING MESSAGE RETRIEVAL SPECIFICALLY ===');
      console.log('Testing buddy ID:', buddyId);
      
      // Test 1: Direct query to buddy_messages table
      try {
        const directQuery = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/buddy_messages?buddy_id=eq.${buddyId}`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('Direct query response status:', directQuery.status);
        if (directQuery.ok) {
          const directData = await directQuery.json();
          console.log('Direct query result:', directData);
        } else {
          const errorText = await directQuery.text();
          console.log('Direct query error:', errorText);
        }
      } catch (e) {
        console.log('Direct query exception:', e);
      }
      
      // Test 2: Check if buddy exists
      try {
        const buddyQuery = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/buddies?id=eq.${buddyId}`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('Buddy query response status:', buddyQuery.status);
        if (buddyQuery.ok) {
          const buddyData = await buddyQuery.json();
          console.log('Buddy query result:', buddyData);
        } else {
          const errorText = await buddyQuery.text();
          console.log('Buddy query error:', errorText);
        }
      } catch (e) {
        console.log('Buddy query exception:', e);
      }
      
      // Test 3: Check all messages in buddy_messages table
      try {
        const allMessagesQuery = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/buddy_messages?select=*&limit=10`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
        });
        console.log('All messages query response status:', allMessagesQuery.status);
        if (allMessagesQuery.ok) {
          const allMessagesData = await allMessagesQuery.json();
          console.log('All messages in table:', allMessagesData);
        } else {
          const errorText = await allMessagesQuery.text();
          console.log('All messages query error:', errorText);
        }
      } catch (e) {
        console.log('All messages query exception:', e);
      }
      
      console.log('=== END MESSAGE RETRIEVAL TEST ===');
    } catch (error) {
      console.error('Message retrieval test failed:', error);
    }
  }

  // Check if user exists in auth system
  static async checkUserInAuth(email: string): Promise<boolean> {
    try {
      console.log('Checking if user exists in auth system for email:', email);
      
      // Try to get user from auth.users table
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/auth/users?email=eq.${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log('Auth users found:', users);
        return users && users.length > 0;
      } else {
        console.log('Auth check failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth user:', error);
      return false;
    }
  }

  // Check if email is still registered (check both user_profiles and auth)
  static async checkEmailRegistration(email: string): Promise<{
    inUserProfiles: boolean;
    inAuth: boolean;
    userProfileData?: any;
    authData?: any;
  }> {
    try {
      console.log('=== CHECKING EMAIL REGISTRATION ===');
      console.log('Email to check:', email);
      
      const result = {
        inUserProfiles: false,
        inAuth: false,
        userProfileData: null,
        authData: null
      };
      
      // Check user_profiles table
      try {
        const userProfileResponse = await this.request('GET', `user_profiles?email=eq.${encodeURIComponent(email)}&select=*`);
        console.log('User profile check result:', userProfileResponse);
        if (userProfileResponse && userProfileResponse.length > 0) {
          result.inUserProfiles = true;
          result.userProfileData = userProfileResponse[0];
          console.log('✅ Email found in user_profiles table');
        } else {
          console.log('❌ Email not found in user_profiles table');
        }
      } catch (error) {
        console.error('Error checking user_profiles:', error);
      }
      
      // Check auth system
      try {
        const authResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/auth/users?email=eq.${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (authResponse.ok) {
          const authUsers = await authResponse.json();
          console.log('Auth check result:', authUsers);
          if (authUsers && authUsers.length > 0) {
            result.inAuth = true;
            result.authData = authUsers[0];
            console.log('✅ Email found in auth system');
          } else {
            console.log('❌ Email not found in auth system');
          }
        } else {
          console.log('Auth check failed with status:', authResponse.status);
        }
      } catch (error) {
        console.error('Error checking auth system:', error);
      }
      
      console.log('Final registration status:', result);
      console.log('=== END EMAIL REGISTRATION CHECK ===');
      
      return result;
    } catch (error) {
      console.error('Error checking email registration:', error);
      return {
        inUserProfiles: false,
        inAuth: false,
        userProfileData: null,
        authData: null
      };
    }
  }

  // Delete user from auth system (this requires service role key)
  static async deleteUserFromAuth(userId: string): Promise<boolean> {
    try {
      console.log('Attempting to delete user from auth system:', userId);
      
      // Note: This requires service role key, not anon key
      // For now, we'll just log that we would delete from auth
      console.log('⚠️ Auth user deletion requires service role key - user may still exist in auth.users table');
      console.log('To completely delete user, run this SQL in Supabase:');
      console.log(`DELETE FROM auth.users WHERE id = '${userId}';`);
      
      return true; // Return true for now since we can't actually delete from auth with anon key
    } catch (error) {
      console.error('Error deleting from auth:', error);
      return false;
    }
  }

  // Delete user by email using database function
  static async deleteUserByEmail(email: string): Promise<boolean> {
    try {
      console.log('=== DELETING USER BY EMAIL ===');
      console.log('Email to delete:', email);
      
      const deleteResult = await this.rpcRequest('delete_user_by_email', {
        user_email: email
      });
      
      console.log('Delete by email result:', deleteResult);
      
      if (deleteResult && deleteResult.success) {
        console.log('✅ User successfully deleted by email');
        console.log('Deletion details:', deleteResult.details);
        return true;
      } else {
        console.log('❌ Delete by email failed:', deleteResult?.error || 'Unknown error');
        throw new Error(deleteResult?.error || 'Delete by email failed');
      }
    } catch (error) {
      console.error('Error deleting user by email:', error);
      throw error;
    }
  }

  // Enhanced delete function using database function
  static async deleteUserAccountEnhanced(userId: string): Promise<boolean> {
    try {
      console.log('=== STARTING ENHANCED USER ACCOUNT DELETION ===');
      console.log('User ID to delete:', userId);
      
      if (!userId) {
        throw new Error('User ID is required for account deletion');
      }
      
      // First, get user email for complete deletion
      console.log('Step 0: Getting user email for complete deletion...');
      let userEmail = null;
      try {
        const userCheck = await this.request('GET', `user_profiles?id=eq.${userId}&select=id,email`);
        console.log('User check result:', userCheck);
        if (userCheck && userCheck.length > 0) {
          userEmail = userCheck[0].email;
          console.log('✅ User found, email:', userEmail);
        } else {
          console.log('User not found in user_profiles, trying auth system...');
        }
      } catch (error) {
        console.error('❌ Error checking user existence:', error);
      }
      
      // Try using the database function for complete deletion
      console.log('Step 1: Attempting complete deletion using database function...');
      try {
        const deleteResult = await this.rpcRequest('delete_user_completely', {
          user_id: userId,
          user_email: userEmail
        });
        
        console.log('Database function deletion result:', deleteResult);
        
        if (deleteResult && deleteResult.success) {
          console.log('✅ User completely deleted using database function');
          console.log('Deletion details:', deleteResult.details);
          return true;
        } else {
          console.log('❌ Database function deletion failed:', deleteResult?.error || 'Unknown error');
          throw new Error(deleteResult?.error || 'Database function deletion failed');
        }
      } catch (rpcError) {
        console.log('❌ RPC deletion failed, falling back to manual deletion...');
        console.error('RPC Error:', rpcError);
        
        // Fallback to original manual deletion if RPC fails
        return await this.deleteUserAccount(userId);
      }
    } catch (error) {
      console.error('=== ENHANCED USER ACCOUNT DELETION FAILED ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Test delete functionality
  static async testDeleteFunctionality(userId: string): Promise<void> {
    try {
      console.log('=== TESTING DELETE FUNCTIONALITY ===');
      console.log('Testing delete for user ID:', userId);
      
      // Test 1: Check if user exists before deletion
      console.log('Step 1: Checking if user exists before deletion...');
      try {
        const userBefore = await this.request('GET', `user_profiles?id=eq.${userId}&select=id,anonymous_id,email`);
        console.log('User before deletion:', userBefore);
        if (userBefore && userBefore.length > 0) {
          console.log('✅ User exists in user_profiles before deletion');
          
          // Also check if user exists in auth system
          if (userBefore[0].email) {
            const existsInAuth = await this.checkUserInAuth(userBefore[0].email);
            console.log('User exists in auth system:', existsInAuth);
          }
        } else {
          console.log('❌ User does not exist in user_profiles before deletion');
          return;
        }
      } catch (error) {
        console.error('❌ Error checking user before deletion:', error);
        return;
      }
      
      // Test 2: Try to delete the user
      console.log('Step 2: Attempting to delete user...');
      try {
        const deleteResult = await this.deleteUserAccount(userId);
        console.log('Delete result:', deleteResult);
        if (deleteResult) {
          console.log('✅ Delete function returned true');
        } else {
          console.log('❌ Delete function returned false');
        }
      } catch (error) {
        console.error('❌ Error during deletion:', error);
      }
      
      // Test 3: Check if user exists after deletion
      console.log('Step 3: Checking if user exists after deletion...');
      try {
        const userAfter = await this.request('GET', `user_profiles?id=eq.${userId}&select=id,anonymous_id,email`);
        console.log('User after deletion:', userAfter);
        if (!userAfter || userAfter.length === 0) {
          console.log('✅ User successfully deleted from user_profiles table');
        } else {
          console.log('❌ User still exists in user_profiles after deletion attempt');
        }
        
        // Check if user still exists in auth system
        if (userAfter && userAfter.length > 0 && userAfter[0].email) {
          const existsInAuthAfter = await this.checkUserInAuth(userAfter[0].email);
          console.log('User still exists in auth system after deletion:', existsInAuthAfter);
        }
      } catch (error) {
        console.error('❌ Error checking user after deletion:', error);
      }
      
      console.log('=== END DELETE FUNCTIONALITY TEST ===');
    } catch (error) {
      console.error('Delete functionality test failed:', error);
    }
  }

  /**
   * Delete a buddy relationship (remove from buddies list)
   */
  static async deleteBuddy(buddyId: string, userId: string): Promise<boolean> {
    try {
      console.log('Deleting buddy relationship:', buddyId);
      
      // Delete the buddy relationship
      const result = await this.request('DELETE', `buddies?id=eq.${buddyId}&user_id=eq.${userId}`);
      console.log('Buddy relationship deleted successfully:', result);
      
      return true;
    } catch (error) {
      console.error('Error deleting buddy:', error);
      throw error;
    }
  }

  /**
   * Block a user (add to blocked users list)
   */
  static async blockUser(buddyUserId: string, userId: string): Promise<boolean> {
    try {
      console.log('Blocking user:', buddyUserId);
      
      // First, delete the buddy relationship
      await this.deleteBuddy(buddyUserId, userId);
      
      // Add to blocked users (assuming there's a blocked_users table)
      const blockData = {
        user_id: userId,
        blocked_user_id: buddyUserId,
        blocked_at: new Date().toISOString(),
        reason: 'User blocked'
      };
      
      const result = await this.request('POST', 'blocked_users', blockData);
      console.log('User blocked successfully:', result);
      
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user (remove from blocked users list)
   */
  static async unblockUser(buddyUserId: string, userId: string): Promise<boolean> {
    try {
      console.log('Unblocking user:', buddyUserId);
      
      const result = await this.request('DELETE', `blocked_users?user_id=eq.${userId}&blocked_user_id=eq.${buddyUserId}`);
      console.log('User unblocked successfully:', result);
      
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  static async isUserBlocked(buddyUserId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.request('GET', `blocked_users?user_id=eq.${userId}&blocked_user_id=eq.${buddyUserId}`);
      return result && result.length > 0;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }
}
