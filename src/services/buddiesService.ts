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
      console.log('Making request to:', url);
      console.log('Request options:', options);
      
      const response = await fetch(url, options);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      if (response.status === 204) {
        console.log('Response is 204 (No Content)');
        return null;
      }
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
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

    console.log(`RPC Request to ${functionName}:`, { url, params });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      console.log(`RPC Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`RPC Error response: ${errorText}`);
        throw new Error(`RPC error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log(`RPC Response result:`, result);
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
      return data.map((buddy: any) => ({
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
      }));
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
      console.log('=== DEBUGGING MESSAGE RETRIEVAL ===');
      console.log('Querying messages for buddy_id:', buddyId);
      
      // First, let's check if the buddy exists
      const buddyCheck = await this.request('GET', `buddies?id=eq.${buddyId}`);
      console.log('Buddy exists check:', buddyCheck);
      
      // Then query messages
      const queryUrl = `buddy_messages?buddy_id=eq.${buddyId}&order=created_at.asc`;
      console.log('Query URL:', queryUrl);
      console.log('Full URL:', `${SUPABASE_URL}/rest/v1/${queryUrl}`);
      
      const data = await this.request('GET', queryUrl);
      console.log('Raw database response:', data);
      console.log('Response type:', typeof data);
      console.log('Response length:', Array.isArray(data) ? data.length : 'Not an array');
      
      // Also check if there are ANY messages in the table
      try {
        const allMessages = await this.request('GET', `buddy_messages?select=*&limit=5`);
        console.log('All messages in table (first 5):', allMessages);
      } catch (error) {
        console.log('Error accessing buddy_messages table:', error);
      }
      
      // Test if we can access the table at all (without filters)
      try {
        const tableTest = await this.request('GET', `buddy_messages?limit=1`);
        console.log('Table access test (limit 1):', tableTest);
      } catch (error) {
        console.log('Error accessing buddy_messages table (limit 1):', error);
      }

      if (!data) {
        console.log('No data returned from database');
        return [];
      }

      if (!Array.isArray(data)) {
        console.log('Data is not an array:', data);
        return [];
      }

      const messages = data.map((message: any) => {
        console.log('Mapping message:', message);
        return {
          id: message.id,
          buddyId: message.buddy_id,
          senderId: message.sender_id,
          content: message.content,
          messageType: message.message_type || 'text',
          isRead: message.is_read || false,
          createdAt: new Date(message.created_at),
          updatedAt: new Date(message.updated_at),
        };
      });

      console.log(`Mapped ${messages.length} messages`);
      console.log('=== END DEBUGGING ===');
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

  // Block a user
  static async blockUser(blockedUserId: string, reason?: string): Promise<boolean> {
    try {
      await this.rpcRequest('block_user', {
        blocked_user_id_param: blockedUserId,
        reason_param: reason || null
      });

      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  // Unblock a user
  static async unblockUser(blockedUserId: string): Promise<boolean> {
    try {
      await this.rpcRequest('unblock_user', {
        blocked_user_id_param: blockedUserId
      });

      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
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
      await this.rpcRequest('clear_chat_history', {
        buddy_id_param: buddyId
      });

      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw error;
    }
  }

  // Get Whispr notes for the current user
  static async getWhisprNotes(userId: string): Promise<WhisprNote[]> {
    try {
      const data = await this.request('GET', `whispr_notes?status=eq.active&is_active=eq.true&order=created_at.desc&limit=20`);

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
      console.error('Error fetching Whispr notes:', error);
      throw error;
    }
  }

  // Listen to a Whispr note (accept it)
  static async listenToNote(noteId: string, userId: string): Promise<any> {
    try {
      const result = await this.rpcRequest('handle_note_propagation', {
        note_id: noteId,
        responder_id: userId,
        response_type: 'listen'
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
    try {
      const data = await this.request('POST', 'whispr_notes', {
        sender_id: userId,
        content,
        mood,
        status: 'active',
        is_active: true,
        propagation_count: 0,
        created_at: new Date().toISOString(),
      });

      return data[0].id;
    } catch (error) {
      console.error('Error sending Whispr note:', error);
      throw error;
    }
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
}
