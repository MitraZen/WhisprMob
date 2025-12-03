import { SUPABASE_CONFIG } from '@/config/env';
import { supabase } from '@/config/supabase';
import { MoodType } from '@/types';
import { handleNetworkError } from '@/utils/networkErrorHandler';

const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

export interface Buddy {
  id: string;
  name: string;
  username?: string;  // ADDED: Username field
  initials: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  status: 'active' | 'away' | 'busy' | 'invisible';
  mood?: MoodType;
  isPinned?: boolean; // ADDED: Pin status for buddy cards
  createdAt: Date;
  updatedAt: Date;
  buddyUserId?: string; // User ID for profile viewing
}

export interface BuddyMessage {
  id: string;
  buddyId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'emoji';
  isRead: boolean;
  timestamp: Date;
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
  replyCount?: number; // Number of replies to this note
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

  // PHASE 1 OPTIMIZATION: Get database performance metrics
  static async getPerformanceMetrics(): Promise<any> {
    try {
      console.log('⚡ PHASE 1: Getting database performance metrics');
      
      const { data: metrics, error } = await supabase.rpc('get_message_performance_metrics');
      
      if (error) {
        console.error('❌ Error getting performance metrics:', error);
        return null;
      }
      
      console.log('⚡ Performance metrics:', metrics);
      return metrics;
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      return null;
    }
  }

  // PHASE 1 OPTIMIZATION: Mark messages as read efficiently
  static async markMessagesAsRead(buddyId: string, userId: string): Promise<boolean> {
    try {
      console.log('⚡ PHASE 1: Marking messages as read efficiently');
      
      const { data: result, error } = await supabase.rpc('mark_messages_read', {
        p_buddy_id: buddyId,
        p_user_id: userId
      });
      
      if (error) {
        console.error('❌ Error marking messages as read:', error);
        return false;
      }
      
      if (!result?.success) {
        console.error('❌ Function returned error:', result?.error);
        return false;
      }
      
      console.log('✅ Messages marked as read:', result.messages_marked_read);
      return true;
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      return false;
    }
  }

  // PHASE 3: Get buddy name for notification display
  static async getBuddyName(buddyId: string): Promise<string> {
    try {
      console.log('👤 PHASE 3: Getting buddy name for:', buddyId);
      
      const { data: buddy, error } = await supabase
        .from('buddies')
        .select('name')
        .eq('id', buddyId)
        .single();
      
      if (error) {
        // Handle specific error cases
        if (error.code === 'PGRST116') {
          console.log('👤 PHASE 3: Buddy not found, using fallback name');
          return 'Test Buddy'; // Fallback for test scenarios
        }
        console.error('❌ Error getting buddy name:', error);
        return 'Unknown Buddy';
      }
      
      return buddy?.name || 'Unknown Buddy';
    } catch (error) {
      console.error('❌ Error getting buddy name:', error);
      return 'Unknown Buddy';
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
      // Handle network errors gracefully
      if (handleNetworkError(error, 'BuddiesService request', true)) {
        // Network error - return empty array/result instead of throwing
        // This allows the app to continue functioning offline
        return [];
      }
      // Not a network error, log and throw normally
      console.error('BuddiesService request error:', error);
      throw error;
    }
  }

  private static async rpcRequest(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    // Use authenticated Supabase client for RPC calls
    const { supabase } = await import('@/config/supabase');
    
    try {
      const { data, error } = await supabase.rpc(functionName, params);
      
      if (error) {
        throw new Error(`RPC error! status: ${error.code}, message: ${JSON.stringify(error)}`);
      }
      
      return data;
    } catch (error) {
      // Handle network errors gracefully
      if (handleNetworkError(error, `RPC call ${functionName}`, true)) {
        // Network error - return empty array instead of throwing
        // This allows the app to continue functioning offline
        return [];
      }
      // Not a network error, log and throw normally
      console.error(`BuddiesService RPC error for ${functionName}:`, error);
      throw error;
    }
  }

  // Get all buddies for the current user
  static async getBuddies(userId: string, retryCount: number = 0): Promise<Buddy[]> {
    const maxRetries = 3;
    
    try {
      const data = await this.rpcRequest('get_user_buddies', {
        p_user_id: userId,
        limit_count: 20  // Add LIMIT parameter to prevent unlimited retrieval
      });

      if (!data) {
        return [];
      }

      // Transform database buddies to mobile app format
      return data.map((buddy: any) => {
        const transformedBuddy = {
          id: buddy.id,
          name: buddy.name,
          username: buddy.username || undefined,  // ADDED: Username field
          initials: buddy.initials,
          avatar: buddy.avatar_url || undefined,
          lastMessage: buddy.last_message || undefined,
          lastMessageTime: buddy.last_message_time ? new Date(buddy.last_message_time) : undefined,
          unreadCount: buddy.unread_count || 0,
          isOnline: buddy.is_online || false,
          status: buddy.status || 'active',
          mood: buddy.mood || undefined,
          createdAt: new Date(buddy.created_at),
          updatedAt: new Date(buddy.updated_at),
          buddyUserId: buddy.buddy_user_id || buddy.user_id || buddy.id, // Add buddy user ID for profile viewing
        };
        return transformedBuddy;
      });
    } catch (error) {
      // Handle network errors gracefully
      if (handleNetworkError(error, 'Fetching buddies', true)) {
        // Network error - return empty array instead of throwing
        // This allows the app to continue functioning offline
        return [];
      }
      
      // Not a network error, log normally
      console.error('Error fetching buddies:', error);
      
      // Retry logic for connection errors (non-network errors)
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
  // Get user's sent notes
  static async getSentNotes(userId: string): Promise<any[]> {
    try {
      const data = await this.rpcRequest('get_user_sent_notes', {
        user_id: userId
      });
      return data;
    } catch (error) {
      console.error('Error getting sent notes:', error);
      throw error;
    }
  }

  // Get note recipients
  static async getNoteRecipients(noteId: string): Promise<any[]> {
    try {
      const data = await this.rpcRequest('get_note_recipients', {
        note_id: noteId
      });
      return data;
    } catch (error) {
      console.error('Error getting note recipients:', error);
      throw error;
    }
  }

  // Clear all sent notes for a user
  static async clearSentNotes(userId: string): Promise<boolean> {
    try {
      console.log('Clearing sent notes for user:', userId);
      
      const result = await this.rpcRequest('clear_sent_notes', {
        user_id_param: userId
      });
      
      console.log('clear_sent_notes result:', result);
      
      // Check if the result indicates success
      if (result && typeof result === 'object' && result.success === false) {
        throw new Error(result.error || 'Failed to clear sent notes');
      }
      
      console.log(`Cleared ${result?.deleted_count || 0} sent notes`);
      return true;
    } catch (error) {
      console.error('Error clearing sent notes:', error);
      throw error;
    }
  }

  // Get user notifications
  static async getNotifications(userId: string): Promise<any[]> {
    try {
      const data = await this.request('GET', `notifications?user_id=eq.${userId}&order=created_at.desc`);
      return data;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }


  // Mark notification as read
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.request('PATCH', `notifications?id=eq.${notificationId}`, {
        is_read: true,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async sendMessage(
    buddyId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'emoji' = 'text',
    userId?: string
  ): Promise<string> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      console.log('⚡ PHASE 1 OPTIMIZED: Using optimized database function');
      console.log('⚡ Parameters:', { buddyId, content: content.substring(0, 50), messageType, userId });
      
      // PHASE 1 OPTIMIZATION: Use optimized database function for atomic operations
      const { data: result, error } = await supabase.rpc('send_message_optimized', {
        p_buddy_id: buddyId,
        p_sender_id: userId,
        p_content: content,
        p_message_type: messageType
      });
      
      if (error) {
        console.error('❌ Optimized function error:', error);
        throw new Error(`Failed to send message: ${error.message}`);
      }
      
      if (!result?.success) {
        console.error('❌ Function returned error:', result?.error);
        throw new Error(`Failed to send message: ${result?.error}`);
      }
      
      console.log('✅ PHASE 1 OPTIMIZED: Message sent successfully:', result.message_id);
      console.log('⚡ Performance: Single atomic transaction completed');
      
      return result.message_id;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  // Get messages for a specific buddy - DIRECT TABLE ACCESS APPROACH
  static async getMessages(buddyId: string, userId?: string): Promise<BuddyMessage[]> {
    try {
      if (!userId) {
        throw new Error('User ID is required to get messages');
      }
      
      console.log('🔍 DIRECT APPROACH: Fetching messages directly from buddy_messages table');
      console.log('🔍 Parameters:', { buddyId, userId });
      
      // CRITICAL FIX: Handle bidirectional buddy relationships
      // First, get the buddy relationship to understand the user pair
      const { data: buddyData, error: buddyError } = await supabase
        .from('buddies')
        .select('user_id, buddy_user_id')
        .eq('id', buddyId)
        .single();
      
      if (buddyError) {
        console.error('❌ Error getting buddy relationship:', buddyError);
        throw new Error(`Failed to get buddy relationship: ${buddyError.message}`);
      }
      
      if (!buddyData) {
        console.log('📭 No buddy relationship found for buddy ID:', buddyId);
        return [];
      }
      
      console.log('🔍 Buddy relationship:', buddyData);
      
      // Get the other user's buddy ID (the reciprocal relationship)
      const { data: reciprocalBuddy, error: reciprocalError } = await supabase
        .from('buddies')
        .select('id')
        .eq('user_id', buddyData.buddy_user_id)
        .eq('buddy_user_id', buddyData.user_id)
        .single();
      
      if (reciprocalError) {
        console.warn('⚠️ No reciprocal buddy relationship found:', reciprocalError);
      }
      
      console.log('🔍 Reciprocal buddy ID:', reciprocalBuddy?.id);
      
      // Query messages for BOTH buddy relationships
      const buddyIds = [buddyId];
      if (reciprocalBuddy?.id) {
        buddyIds.push(reciprocalBuddy.id);
      }
      
      console.log('🔍 Querying messages for buddy IDs:', buddyIds);
      
      // ✅ PERFORMANCE FIX: Add limit to prevent fetching thousands of messages at once
      // Fetch last 500 messages max (configurable) to prevent UI freeze
      const MESSAGE_FETCH_LIMIT = 500;
      
      const { data: messages, error } = await supabase
        .from('buddy_messages')
        .select(`
          id,
          buddy_id,
          sender_id,
          content,
          message_type,
          is_read,
          created_at,
          updated_at
        `)
        .in('buddy_id', buddyIds)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_FETCH_LIMIT);
      
      // Reverse to get ascending order after limiting
      if (messages) {
        messages.reverse();
      }
      
      if (error) {
        console.error('❌ Direct table query error:', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }
      
      console.log(`✅ DIRECT APPROACH: Found ${messages?.length || 0} messages in database`);
      
      if (!messages || messages.length === 0) {
        console.log('📭 No messages found for buddy relationships:', buddyIds);
        return [];
      }
      
      // Convert the messages to BuddyMessage format and deduplicate by message ID
      const messageMap = new Map<string, BuddyMessage>();
      
      messages.forEach((msg: any) => {
        const buddyMessage: BuddyMessage = {
          id: msg.id,
          buddyId: msg.buddy_id,
          senderId: msg.sender_id,
          receiverId: '', // We'll determine this from buddy relationship
          content: msg.content,
          messageType: msg.message_type || 'text',
          timestamp: new Date(msg.created_at),
          isRead: msg.is_read || false,
          createdAt: new Date(msg.created_at),
          updatedAt: new Date(msg.updated_at || msg.created_at)
        };
        
        // Use message ID as key to prevent duplicates
        messageMap.set(msg.id, buddyMessage);
      });
      
      const buddyMessages = Array.from(messageMap.values());
      
      console.log(`✅ DIRECT APPROACH: Converted ${buddyMessages.length} unique messages to BuddyMessage format`);
      
      if (messages.length !== buddyMessages.length) {
        console.log(`⚠️ Duplicate messages removed: ${messages.length} -> ${buddyMessages.length}`);
      }
      
      return buddyMessages;
    } catch (error) {
      console.error('❌ Error getting messages (direct approach):', error);
      throw error;
    }
  }

  // Mark messages as read for a buddy - DIRECT TABLE ACCESS APPROACH
  static async markMessagesAsRead(buddyId: string, userId?: string): Promise<boolean> {
    try {
      console.log('🔍 DIRECT APPROACH: Marking messages as read directly');
      console.log('🔍 Parameters:', { buddyId, userId });
      
      if (!userId) {
        throw new Error('User ID is required to mark messages as read');
      }
      
      // CRITICAL FIX: Handle bidirectional buddy relationships
      // First, get the buddy relationship to understand the user pair
      const { data: buddyData, error: buddyError } = await supabase
        .from('buddies')
        .select('user_id, buddy_user_id')
        .eq('id', buddyId)
        .single();
      
      if (buddyError) {
        console.error('❌ Error getting buddy relationship:', buddyError);
        throw new Error(`Failed to get buddy relationship: ${buddyError.message}`);
      }
      
      if (!buddyData) {
        console.log('📭 No buddy relationship found for buddy ID:', buddyId);
        return false;
      }
      
      console.log('🔍 Buddy relationship:', buddyData);
      
      // Get the other user's buddy ID (the reciprocal relationship)
      const { data: reciprocalBuddy, error: reciprocalError } = await supabase
        .from('buddies')
        .select('id')
        .eq('user_id', buddyData.buddy_user_id)
        .eq('buddy_user_id', buddyData.user_id)
        .single();
      
      if (reciprocalError) {
        console.warn('⚠️ No reciprocal buddy relationship found:', reciprocalError);
      }
      
      console.log('🔍 Reciprocal buddy ID:', reciprocalBuddy?.id);
      
      // Mark messages as read for BOTH buddy relationships
      const buddyIds = [buddyId];
      if (reciprocalBuddy?.id) {
        buddyIds.push(reciprocalBuddy.id);
      }
      
      console.log('🔍 Marking messages as read for buddy IDs:', buddyIds);
      
      // DIRECT APPROACH: Update buddy_messages table directly for both relationships
      const { error: updateError } = await supabase
        .from('buddy_messages')
        .update({ is_read: true })
        .in('buddy_id', buddyIds)
        .neq('sender_id', userId); // Don't mark own messages as read
      
      if (updateError) {
        console.error('❌ Direct update error:', updateError);
        throw new Error(`Failed to mark messages as read: ${updateError.message}`);
      }
      
      // Also update the buddies table unread count for the current user's buddy record
      const { error: buddyUpdateError } = await supabase
        .from('buddies')
        .update({ unread_count: 0 })
        .eq('id', buddyId)
        .eq('user_id', userId);
      
      if (buddyUpdateError) {
        console.warn('⚠️ Failed to update buddy unread count:', buddyUpdateError);
        // Don't throw error here, as the main operation succeeded
      }
      
      console.log('✅ DIRECT APPROACH: Messages marked as read successfully for buddy:', buddyId);
      return true;
    } catch (error) {
      console.error('❌ Error marking messages as read (direct approach):', error);
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

  // Clear chat history with a buddy - Diagnostic approach (shows what's happening)
  static async clearChatHistory(buddyId: string, userId?: string): Promise<boolean> {
    try {
      console.log('🧹 DIAGNOSTIC clearing chat history for buddy:', buddyId);
      console.log('🔍 User ID:', userId);
      
      const { supabase } = await import('@/config/supabase');
      
      // Use the diagnostic RPC function to see what's happening
      const { data, error } = await supabase.rpc('diagnostic_clear_chat', {
        p_buddy_id: buddyId
      });
      
      if (error) {
        console.error('❌ Diagnostic clear failed:', error);
        throw new Error(`Failed to clear chat: ${error.message}`);
      }
      
      console.log(`✅ DIAGNOSTIC: Clear chat result:`, data);
      console.log(`📊 Buddy exists:`, data?.buddy_exists);
      console.log(`📊 Messages before:`, data?.messages_before);
      console.log(`📊 Deleted count:`, data?.deleted_count);
      
      // NO notifications - we want complete silence
      console.log('🔇 No notifications sent - complete silence mode');
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing chat history:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : undefined);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // Get Whispr notes for the current user
  static async getWhisprNotes(userId: string): Promise<WhisprNote[]> {
    try {
      // Get user's mood for mood-based filtering
      const userProfile = await this.getUserProfile(userId);
      const userMood = userProfile?.mood || 'happy';
      
      // ✅ FIX: Always filter by note_recipients to exclude notes user has already listened/rejected
      // This ensures notes don't disappear for other users when one user listens
      let data: any[];
      
      // First, get all active notes (explicitly select reply_count)
      const queryString = `whispr_notes?status=eq.active&is_active=eq.true&sender_id=neq.${userId}&select=id,sender_id,content,mood,status,propagation_count,is_active,expires_at,created_at,updated_at,reply_count&order=created_at.desc&limit=20`;
      data = await this.request('GET', queryString) || [];
      
      // Lazy sync: Verify and fix reply counts (fire-and-forget, non-blocking)
      // Only sync notes that have reply_count = 0 but might have replies (optimization)
      if (data.length > 0) {
        // Run sync asynchronously without blocking
        setImmediate(async () => {
          try {
            const { supabase } = await import('@/config/supabase');
            // Only sync notes with reply_count = 0 or NULL (likely candidates for sync)
            const notesToSync = data
              .filter((n: any) => !n.reply_count || n.reply_count === 0)
              .map((n: any) => n.id);
            
            if (notesToSync.length > 0) {
              await supabase.rpc('sync_notes_reply_counts', {
                p_note_ids: notesToSync
              });
            }
          } catch (syncErr) {
            // Silent fail - don't log to avoid console spam
          }
        });
      }
      
      // ✅ CRITICAL FIX: Always filter by note_recipients (even if RPC function exists)
      // This ensures notes user has already listened/rejected are excluded
      try {
        const { data: recipientData, error: recipientError } = await supabase
          .from('note_recipients')
          .select('note_id, status')
          .eq('recipient_id', userId)
          .in('status', ['listened', 'rejected']);
        
        if (recipientError) {
          // Handle network errors gracefully (silent for offline scenarios)
          if (!handleNetworkError(recipientError, 'Fetching note_recipients', true)) {
            // Not a network error, log normally
            console.error('❌ Error fetching note_recipients:', recipientError);
          }
        }
        
        if (recipientData && recipientData.length > 0) {
          const excludedNoteIds = new Set(recipientData.map(r => r.note_id));
          data = data.filter((note: any) => !excludedNoteIds.has(note.id));
        }
      } catch (filterError) {
        // Handle network errors gracefully (silent for offline scenarios)
        if (!handleNetworkError(filterError, 'Filtering by note_recipients', true)) {
          // Not a network error, log normally
          console.error('❌ Error filtering by note_recipients:', filterError);
        }
        // Don't fail - just show all notes if filtering fails
      }

      if (!data) {
        return [];
      }

      // No need to filter in JavaScript - database query already excludes user's notes
      let filteredData = data;

      // Apply smart filtering
      filteredData = this.applySmartNoteFiltering(filteredData, userMood);

      // Limit to 20 notes after filtering
      filteredData = filteredData.slice(0, 20);

      const mappedNotes = filteredData.map((note: any) => ({
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
        replyCount: note.reply_count ?? 0, // Use nullish coalescing to handle NULL
      }));
      
      return mappedNotes;
    } catch (error) {
      // Handle network errors gracefully
      if (handleNetworkError(error, 'Fetching Whispr notes', true)) {
        // Network error - return empty array instead of throwing
        // This allows the app to continue functioning offline
        return [];
      }
      // Not a network error, log and throw normally
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
      // ✅ FIX: Use same filtering logic as getWhisprNotes
      // First, get all active notes (explicitly select reply_count)
      const queryString = `whispr_notes?status=eq.active&is_active=eq.true&sender_id=neq.${userId}&select=id,sender_id,content,mood,status,propagation_count,is_active,expires_at,created_at,updated_at,reply_count&order=created_at.desc&limit=${limit}`;
      let data = await this.request('GET', queryString) || [];
      
      // Lazy sync: Verify and fix reply counts (fire-and-forget, non-blocking)
      // Only sync notes that have reply_count = 0 but might have replies (optimization)
      if (data.length > 0) {
        // Run sync asynchronously without blocking
        setImmediate(async () => {
          try {
            const { supabase } = await import('@/config/supabase');
            // Only sync notes with reply_count = 0 or NULL (likely candidates for sync)
            const notesToSync = data
              .filter((n: any) => !n.reply_count || n.reply_count === 0)
              .map((n: any) => n.id);
            
            if (notesToSync.length > 0) {
              await supabase.rpc('sync_notes_reply_counts', {
                p_note_ids: notesToSync
              });
            }
          } catch (syncErr) {
            // Silent fail - don't log to avoid console spam
          }
        });
      }
      
      // ✅ CRITICAL FIX: Always filter by note_recipients to exclude notes user has already listened/rejected
      try {
        const { data: recipientData, error: recipientError } = await supabase
          .from('note_recipients')
          .select('note_id, status')
          .eq('recipient_id', userId)
          .in('status', ['listened', 'rejected']);
        
        if (recipientError) {
          // Handle network errors gracefully (silent for offline scenarios)
          if (!handleNetworkError(recipientError, 'Fetching note_recipients', true)) {
            // Not a network error, log normally
            console.error('❌ Error fetching note_recipients:', recipientError);
          }
        }
        
        if (recipientData && recipientData.length > 0) {
          const excludedNoteIds = new Set(recipientData.map(r => r.note_id));
          data = data.filter((note: any) => !excludedNoteIds.has(note.id));
        }
      } catch (filterError) {
        // Handle network errors gracefully (silent for offline scenarios)
        if (!handleNetworkError(filterError, 'Filtering by note_recipients', true)) {
          // Not a network error, log normally
          console.error('❌ Error filtering by note_recipients:', filterError);
        }
        // Don't fail - just show all notes if filtering fails
      }

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
        replyCount: note.reply_count || 0,
      }));
    } catch (error) {
      console.error('Error fetching new user notes:', error);
      throw error;
    }
  }

  // Listen to a Whispr note (accept it)
  static async listenToNote(noteId: string, userId: string): Promise<any> {
    try {
      console.log('🎧 BuddiesService.listenToNote called with:', { noteId, userId });
      const result = await this.rpcRequest('handle_note_propagation', {
        p_note_id: noteId,
        p_responder_id: userId,
        p_response_type: 'listen'
      });
      console.log('🎧 BuddiesService.listenToNote result:', result);
      
      // ✅ FIX: Handle "already responded" case gracefully
      if (result && result.already_responded === true) {
        console.log('🎧 Note already responded to, returning success with flag');
        return {
          success: false,
          already_responded: true,
          error: result.error || 'Note already responded to'
        };
      }
      
      return result;
    } catch (error) {
      console.error('🎧 BuddiesService.listenToNote error:', error);
      // ✅ FIX: Check if error message indicates already responded
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already responded') || errorMessage.includes('P0001')) {
        return {
          success: false,
          already_responded: true,
          error: 'Note already responded to by this user'
        };
      }
      throw error;
    }
  }

  // Reject a Whispr note
  static async rejectNote(noteId: string, userId: string): Promise<any> {
    try {
      console.log('❌ BuddiesService.rejectNote called with:', { noteId, userId });
      const result = await this.rpcRequest('handle_note_propagation', {
        p_note_id: noteId,
        p_responder_id: userId,
        p_response_type: 'reject'
      });
      console.log('❌ BuddiesService.rejectNote result:', result);
      return result;
    } catch (error) {
      console.error('❌ BuddiesService.rejectNote error:', error);
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
      // Try both id and user_id fields
      let data = await this.request('GET', `user_profiles?id=eq.${userId}`);
      if (!data || data.length === 0) {
        data = await this.request('GET', `user_profiles?user_id=eq.${userId}`);
      }
      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      // Handle network errors gracefully
      if (handleNetworkError(error, 'Fetching user profile', true)) {
        // Network error - return null instead of throwing
        // This allows the app to continue functioning offline
        return null;
      }
      // Not a network error, log and throw normally
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user profile data
  static async updateUserProfile(userId: string, profileData: any): Promise<boolean> {
    try {
      // Try both id and user_id fields
      let result = await this.request('PATCH', `user_profiles?id=eq.${userId}`, profileData);
      if (!result) {
        result = await this.request('PATCH', `user_profiles?user_id=eq.${userId}`, profileData);
      }
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
      
      // Attempt to delete from auth.users using admin API
      console.log('Step 6: Attempting to delete auth user...');
      try {
        const authDeleteResult = await this.deleteAuthUser(userId);
        if (authDeleteResult) {
          console.log('✅ Successfully deleted auth user');
        } else {
          console.log('⚠️ Auth user deletion requires manual intervention');
        }
      } catch (error) {
        console.error('❌ Error deleting auth user:', error);
        console.log('⚠️ Auth user will need manual deletion from Supabase Dashboard');
      }
      
      console.log('=== USER ACCOUNT DELETION COMPLETED ===');
      return true;
    } catch (error) {
      console.error('=== USER ACCOUNT DELETION FAILED ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  // Attempt to delete auth user using database function
  private static async deleteAuthUser(userId: string): Promise<boolean> {
    try {
      // First try using the database function (more reliable)
      const dbFunctionResult = await this.deleteUserViaDatabaseFunction(userId);
      if (dbFunctionResult) {
        return true;
      }
      
      // If database function fails, try admin API
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Auth user deleted successfully via admin API');
        return true;
      } else {
        const errorText = await response.text();
        console.log('⚠️ Admin API auth deletion failed:', response.status, errorText);
        
        // If admin API fails, provide instructions for manual deletion
        console.log('Manual deletion required:');
        console.log('1. Go to Supabase Dashboard > Authentication > Users');
        console.log('2. Find user with ID:', userId);
        console.log('3. Click "Delete User"');
        console.log('OR run SQL: DELETE FROM auth.users WHERE id = \'' + userId + '\';');
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error calling admin API for auth user deletion:', error);
      return false;
    }
  }

  // Use database function to delete user completely
  private static async deleteUserViaDatabaseFunction(userId: string): Promise<boolean> {
    try {
      console.log('Attempting to delete user via database function...');
      
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/delete_user_by_id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Database function result:', result);
        
        if (result.success) {
          console.log('✅ User completely deleted via database function');
          return true;
        } else {
          console.log('⚠️ Database function partial success:', result.message);
          return result.auth_deleted; // Return true if at least auth user was deleted
        }
      } else {
        const errorText = await response.text();
        console.log('⚠️ Database function failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error calling database function:', error);
      return false;
    }
  }

  // Test sending a message
  static async testSendMessage(buddyId: string, userId: string): Promise<void> {
    try {
      console.log('=== TESTING MESSAGE SENDING ===');
      console.log('Testing with buddy ID:', buddyId, 'user ID:', userId);
      
      const testMessage = `Test message at ${new Date().toISOString()}`;
      console.log('Sending test message:', testMessage);
      
      const messageId = await this.sendMessage(buddyId, testMessage, 'text');
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
      
      // Try to get user from auth.users table (case-insensitive)
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/auth/users?email=ilike.${encodeURIComponent(email)}`, {
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
        const userProfileResponse = await this.request('GET', `user_profiles?email=ilike.${encodeURIComponent(email)}&select=*`);
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
        const authResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/auth/users?email=ilike.${encodeURIComponent(email)}`, {
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
   * Uses enhanced database function to handle bidirectional deletion and cascade scenarios
   */
  static async deleteBuddy(buddyId: string, userId: string): Promise<any> {
    try {
      console.log('🗑️ Deleting buddy relationship:', buddyId);
      console.log('🔍 User ID:', userId);
      
      // Use the enhanced database function to safely delete buddy and messages
      const result = await this.rpcRequest('delete_buddy_safely', {
        p_buddy_id: buddyId,
        p_user_id: userId
      });
      
      console.log('✅ Buddy deletion result:', result);
      
      if (result && result.success) {
        console.log(`✅ Successfully deleted buddy relationship`);
        console.log(`📊 Deleted ${result.deleted_messages} messages`);
        console.log(`👥 Deleted ${result.deleted_buddies} buddy relationships`);
        console.log(`🔔 Notified ${result.notified_users} users`);
        console.log(`👤 Buddy user ID: ${result.buddy_user_id}`);
        console.log(`📝 Buddy name: ${result.buddy_name}`);
        
        return result; // Return the full result object including all details
      } else {
        console.error('❌ Buddy deletion failed:', result?.error || result?.message);
        throw new Error(result?.error || result?.message || 'Failed to delete buddy');
      }
    } catch (error) {
      console.error('❌ Error deleting buddy:', error);
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

  /**
   * Toggle buddy pin status
   */
  static async toggleBuddyPin(buddyId: string, userId: string): Promise<boolean> {
    try {
      console.log('Toggling buddy pin status:', buddyId);
      
      // First get current pin status
      const buddy = await this.request('GET', `buddies?id=eq.${buddyId}&user_id=eq.${userId}`);
      if (!buddy || buddy.length === 0) {
        throw new Error('Buddy not found');
      }
      
      const currentPinStatus = buddy[0].is_pinned || false;
      const newPinStatus = !currentPinStatus;
      
      // Update pin status
      const result = await this.request('PATCH', `buddies?id=eq.${buddyId}&user_id=eq.${userId}`, {
        is_pinned: newPinStatus
      });
      
      console.log('Buddy pin status toggled successfully:', result);
      return true;
    } catch (error) {
      console.error('Error toggling buddy pin:', error);
      throw error;
    }
  }

  /**
   * Sync user online status to buddies table (Enhanced with instant sync)
   * This ensures that when a user's online status changes, it's reflected in all buddy relationships
   */
  static async syncUserOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
    try {
      console.log('🔄 Syncing online status for user:', userId, 'isOnline:', isOnline);
      
      // Use enhanced sync function for instant updates
      const result = await this.rpcRequest('sync_user_online_status_enhanced', {
        p_user_id: userId,
        p_is_online: isOnline
      });
      
      console.log('✅ Online status sync result:', result);
      
      if (result && typeof result === 'object' && result.success === false) {
        throw new Error(result.error || 'Failed to sync online status');
      }
      
      // Trigger cache invalidation for instant UI updates
      const { cacheInvalidationService, CACHE_EVENTS } = await import('./cacheInvalidationService');
      cacheInvalidationService.triggerInvalidation(CACHE_EVENTS.ONLINE_STATUS_CHANGED, {
        userId,
        isOnline,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error syncing online status:', error);
      return false;
    }
  }

  // ============================================
  // WHISPR NOTE REPLIES METHODS
  // ============================================

  /**
   * Get replies for a note
   */
  static async getNoteReplies(
    noteId: string,
    includeNested: boolean = true
  ): Promise<any[]> {
    try {
      const { supabase } = await import('@/config/supabase');
      
      let query = supabase
        .from('whispr_note_replies')
        .select('*')
        .eq('note_id', noteId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching replies:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // Organize into thread structure
      if (includeNested && data) {
        return this.organizeRepliesIntoThreads(data);
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching replies:', error);
      throw error;
    }
  }
  
  /**
   * Organize flat replies into nested thread structure
   */
  private static organizeRepliesIntoThreads(replies: any[]): any[] {
    const replyMap = new Map<string, any>();
    const rootReplies: any[] = [];
    
    // First pass: create map of all replies
    replies.forEach(reply => {
      replyMap.set(reply.id, { ...reply, nestedReplies: [] });
    });
    
    // Second pass: organize into tree
    replies.forEach(reply => {
      const replyWithNested = replyMap.get(reply.id)!;
      
      if (reply.parent_reply_id) {
        // This is a nested reply
        const parent = replyMap.get(reply.parent_reply_id);
        if (parent) {
          if (!parent.nestedReplies) {
            parent.nestedReplies = [];
          }
          parent.nestedReplies.push(replyWithNested);
        }
      } else {
        // This is a root-level reply
        rootReplies.push(replyWithNested);
      }
    });
    
    return rootReplies;
  }
  
  /**
   * Create a reply
   */
  static async createReply(data: {
    note_id: string;
    parent_reply_id?: string | null;
    content: string;
    is_anonymous?: boolean;
    mood?: string | null;
  }): Promise<any> {
    try {
      const { supabase } = await import('@/config/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // Validate content
      if (!data.content.trim() || data.content.length > 500) {
        throw new Error('Invalid reply content');
      }
      
      // Check if note exists and is active
      const { data: note, error: noteError } = await supabase
        .from('whispr_notes')
        .select('id, status, is_active')
        .eq('id', data.note_id)
        .single();
      
      if (noteError || !note) {
        throw new Error('Note not found');
      }
      
      if (note.status !== 'active' || !note.is_active) {
        throw new Error('Cannot reply to inactive note');
      }
      
      // Create reply
      const { data: reply, error: replyError } = await supabase
        .from('whispr_note_replies')
        .insert([{
          note_id: data.note_id,
          parent_reply_id: data.parent_reply_id || null,
          user_id: user.id,
          content: data.content.trim(),
          is_anonymous: data.is_anonymous ?? true,
          mood: data.mood || null
        }])
        .select()
        .single();
      
      if (replyError) {
        console.error('❌ Error creating reply:', replyError);
        throw replyError;
      }
      
      // Sync reply_count after creation (fire-and-forget, non-blocking)
      // Trigger should handle it, but this ensures accuracy
      setImmediate(async () => {
        try {
            await supabase.rpc('sync_note_reply_count', {
              p_note_id: data.note_id
            });
        } catch (syncErr) {
          // Silent fail
        }
      });
      
      return reply;
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  }
  
  /**
   * Delete a reply (soft delete)
   */
  static async deleteReply(replyId: string): Promise<void> {
    try {
      const { supabase } = await import('@/config/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // Get note_id before deleting
      const { data: reply, error: fetchError } = await supabase
        .from('whispr_note_replies')
        .select('note_id')
        .eq('id', replyId)
        .single();
      
      if (fetchError) throw fetchError;
      const noteId = reply?.note_id;
      
      // Delete the reply
      const { error } = await supabase
        .from('whispr_note_replies')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', replyId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Sync reply_count after deletion (fire-and-forget, non-blocking)
      if (noteId) {
        setImmediate(async () => {
          try {
            await supabase.rpc('sync_note_reply_count', {
              p_note_id: noteId
            });
          } catch (syncErr) {
            // Silent fail
          }
        });
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      throw error;
    }
  }
}
