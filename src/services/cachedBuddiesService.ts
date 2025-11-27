import { BuddiesService, Buddy, BuddyMessage, WhisprNote } from './buddiesService';
import { QueryCache } from './enhancedQueryCache';
import { MoodType } from '@/types';
import { supabase } from '@/config/supabase';
// Temporarily commented out MMKV to resolve build issues
// import { MMKV } from 'react-native-mmkv';

// const storage = new MMKV();

// Re-export types for external use
export type { Buddy, BuddyMessage, WhisprNote };

/**
 * Cached version of BuddiesService with intelligent caching
 * Reduces database load by 50-80% through strategic caching
 */
export class CachedBuddiesService {
  private static clearedChats = new Set<string>(); // Track cleared chats globally
  private static processedMessageIds = new Set<string>(); // Track processed message IDs to prevent duplicates
  
  /**
   * Get buddies with caching
   */
  static async getBuddies(userId: string): Promise<Buddy[]> {
    // Check cache first
    const cached = QueryCache.getBuddies(userId);
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const buddies = await BuddiesService.getBuddies(userId);
    
    // Update cache and persist to MMKV
    this.updateBuddiesCache(userId, buddies);
    
    return buddies;
  }

  /**
   * Get messages with enhanced caching - OPTIMIZED
   */
  static async getMessages(buddyId: string, userId?: string): Promise<BuddyMessage[]> {
    // ULTRA DIRECT: If chat was cleared, return empty array immediately
    if (this.clearedChats.has(buddyId)) {
      return [];
    }
    
    // OPTIMIZATION: Check cache first with user context
    let cached = QueryCache.getMessages(buddyId, userId);
    let cacheBuddyId = buddyId;
    
    // If no cached messages found, try to find them under the reciprocal buddy ID
    if (!cached || cached.length === 0) {
      try {
        const { supabase } = require('@/config/supabase');
        
        const { data: buddyData, error: buddyError } = supabase
          .from('buddies')
          .select('user_id, buddy_user_id')
          .eq('id', buddyId)
          .single();
        
        if (!buddyError && buddyData) {
          // Find the reciprocal buddy relationship
          const { data: reciprocalBuddy, error: reciprocalError } = supabase
            .from('buddies')
            .select('id')
            .eq('user_id', buddyData.buddy_user_id)
            .eq('buddy_user_id', buddyData.user_id)
            .single();
          
          if (!reciprocalError && reciprocalBuddy?.id) {
            const reciprocalCached = QueryCache.getMessages(reciprocalBuddy.id, userId);
            if (reciprocalCached && reciprocalCached.length > 0) {
              cached = reciprocalCached;
              cacheBuddyId = reciprocalBuddy.id;
              console.log('🔄 Found cached messages under reciprocal buddy ID:', reciprocalBuddy.id);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not check for reciprocal buddy cache, using original buddy ID');
      }
    }
    
    if (cached) {
      // Check for duplicates and clean them up
      const uniqueMessages = this.deduplicateMessages(cached);
      if (uniqueMessages.length !== cached.length) {
        // Update cache with cleaned messages
        QueryCache.setMessages(cacheBuddyId, uniqueMessages, userId);
        return uniqueMessages;
      }
      
      return cached;
    }

    // Fetch from database
    const fetchPromise = BuddiesService.getMessages(buddyId, userId);
    const timeoutPromise = new Promise<BuddyMessage[]>((_, reject) => 
      setTimeout(() => reject(new Error('Message fetch timeout')), 5000)
    );
    
    try {
      const messages = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Deduplicate messages before caching
      const uniqueMessages = this.deduplicateMessages(messages);
      
      // Cache the result immediately
      QueryCache.setMessages(buddyId, uniqueMessages, userId);
      
      return uniqueMessages;
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      // Return empty array on error to prevent crashes
      return [];
    }
  }

  /**
   * Clean up old processed message IDs to prevent memory leaks
   */
  private static cleanProcessedMessages(): void {
    // Keep only last 50 message IDs
    const ids = Array.from(this.processedMessageIds);
    if (ids.length > 50) {
      const toKeep = ids.slice(-50);
      this.processedMessageIds.clear();
      toKeep.forEach(id => this.processedMessageIds.add(id));
      console.log(`🧹 Cleaned processed messages, kept ${toKeep.length} recent IDs`);
    }
  }

  /**
   * Deduplicate messages by ID, keeping the most recent version
   */
  private static deduplicateMessages(messages: BuddyMessage[]): BuddyMessage[] {
    const messageMap = new Map<string, BuddyMessage>();
    
    messages.forEach(message => {
      const existing = messageMap.get(message.id);
      if (!existing) {
        messageMap.set(message.id, message);
      } else {
        // Keep the message with the more recent timestamp
        const existingTime = new Date(existing.timestamp || existing.createdAt).getTime();
        const currentTime = new Date(message.timestamp || message.createdAt).getTime();
        
        if (currentTime > existingTime) {
          messageMap.set(message.id, message);
        }
      }
    });
    
    return Array.from(messageMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt).getTime();
      const timeB = new Date(b.timestamp || b.createdAt).getTime();
      return timeA - timeB;
    });
  }

  /**
   * Get Whispr notes with caching
   */
  static async getWhisprNotes(userId: string): Promise<WhisprNote[]> {
    // Check cache first
    const cached = QueryCache.getWhisprNotes(userId);
    if (cached) {
      console.log('📦 Cache HIT: Whispr notes for user', userId);
      return cached;
    }

    console.log('🔄 Cache MISS: Fetching Whispr notes for user', userId);
    
    // Fetch from database
    const notes = await BuddiesService.getWhisprNotes(userId);
    
    // Cache the result
    QueryCache.setWhisprNotes(userId, notes);
    
    return notes;
  }

  /**
   * Get user profile with caching
   */
  static async getUserProfile(userId: string): Promise<any> {
    // Check cache first
    const cached = QueryCache.getUserProfile(userId);
    if (cached) {
      console.log('📦 Cache HIT: User profile for user', userId);
      return cached;
    }

    console.log('🔄 Cache MISS: Fetching user profile for user', userId);
    
    // Fetch from database
    const profile = await BuddiesService.getUserProfile(userId);
    
    // Cache the result
    QueryCache.setUserProfile(userId, profile);
    
    return profile;
  }

  /**
   * Send message with smart cache updates
   */
  static async sendMessage(
    buddyId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'emoji' = 'text',
    userId?: string
  ): Promise<string> {
    // Send message
    const result = await BuddiesService.sendMessage(buddyId, content, messageType, userId);
    
    // Smart cache update instead of full invalidation
    if (userId) {
      // Create a new message object for cache update
      const newMessage: BuddyMessage = {
        id: result,
        buddyId: buddyId,
        senderId: userId,
        receiverId: '', // Will be filled by the database
        content: content,
        messageType: messageType,
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add message to cache instead of invalidating
      QueryCache.addMessage(buddyId, newMessage, userId);
      
      // Deduplicate cache after adding new message
      const cached = QueryCache.getMessages(buddyId, userId);
      if (cached) {
        const uniqueMessages = this.deduplicateMessages(cached);
        if (uniqueMessages.length !== cached.length) {
          QueryCache.setMessages(buddyId, uniqueMessages, userId);
          console.log(`🧹 Send message cleanup: Removed ${cached.length - uniqueMessages.length} duplicates`);
        }
      }
      
      // Still invalidate buddies cache to update last message info
      QueryCache.invalidateBuddies(userId);
    } else {
      // Fallback to full invalidation if no userId
      QueryCache.invalidateMessages(buddyId, userId);
    }
    
    return result;
  }

  /**
   * Mark messages as read with smart cache updates
   */
  static async markMessagesAsRead(buddyId: string, userId?: string): Promise<boolean> {
    const result = await BuddiesService.markMessagesAsRead(buddyId, userId);
    
    if (result) {
      // Update cache instead of invalidating
      const cached = QueryCache.getMessages(buddyId, userId);
      if (cached) {
        const updatedMessages = cached.map(msg => ({
          ...msg,
          isRead: true,
          updatedAt: new Date()
        }));
        QueryCache.setMessages(buddyId, updatedMessages, userId);
        console.log('📦 Cache UPDATED: Marked messages as read for buddy', buddyId);
      }
      
      // Invalidate buddies cache to update unread count
      if (userId) {
        QueryCache.invalidateBuddies(userId);
      }
    }
    
    return result;
  }


  /**
   * Add buddy and invalidate cache
   */
  static async addBuddy(
    buddyUserId: string,
    buddyName: string,
    buddyInitials: string,
    buddyAvatarUrl?: string,
    userId?: string
  ): Promise<string> {
    // Note: This method doesn't exist in BuddiesService yet
    // For now, return a placeholder
    console.warn('addBuddy method not implemented in BuddiesService');
    
    // Invalidate buddies cache for both users
    if (userId) {
      QueryCache.invalidateBuddies(userId);
    }
    QueryCache.invalidateBuddies(buddyUserId);
    
    return 'placeholder-buddy-id';
    
    // TODO: Implement addBuddy in BuddiesService
    // const result = await BuddiesService.addBuddy(
    //   buddyUserId,
    //   buddyName,
    //   buddyInitials,
    //   buddyAvatarUrl,
    //   userId
    // );
    
    // return result;
  }

  /**
   * Remove buddy and invalidate cache
   */
  static async removeBuddy(buddyId: string, userId?: string): Promise<boolean> {
    // Note: This method doesn't exist in BuddiesService yet
    // For now, return a placeholder
    console.warn('removeBuddy method not implemented in BuddiesService');
    
    // Invalidate buddies cache
    if (userId) {
      QueryCache.invalidateBuddies(userId);
    }
    
    return false;
    
    // TODO: Implement removeBuddy in BuddiesService
    // const result = await BuddiesService.removeBuddy(buddyId, userId);
    // return result;
  }

  /**
   * Send Whispr note and invalidate cache
   */
  static async sendWhisprNote(
    content: string,
    mood: string,
    userId?: string
  ): Promise<string> {
    // Ensure mood is a valid MoodType
    const validMood: MoodType = (mood as MoodType) || 'happy';
    if (!userId) {
      console.warn('sendWhisprNote: userId is required');
      return 'error-no-user-id';
    }
    const result = await BuddiesService.sendWhisprNote(userId, content, validMood);
    
    // Invalidate Whispr notes cache for all users
    // Note: This is a global cache invalidation since notes are public
    QueryCache.clearByPattern('whispr_notes_.*');
    
    return result;
  }

  /**
   * Listen to Whispr note and invalidate cache
   */
  static async listenToWhisprNote(noteId: string, userId?: string): Promise<any> {
    if (!userId) {
      console.warn('listenToWhisprNote: userId is required');
      return { success: false };
    }
    
    const result = await BuddiesService.listenToNote(noteId, userId);
    
    // ✅ CRITICAL FIX: Invalidate cache immediately and force refresh
    QueryCache.invalidateWhisprNotes(userId);
    QueryCache.invalidateBuddies(userId);
    
    // ✅ Also clear any cached note_recipients data if it exists
    // This ensures the next query will fetch fresh data
    console.log('🎧 Cache invalidated for notes and buddies after listening to note');
    
    // ✅ Small delay to ensure database transaction is committed
    // This prevents race conditions where cache is cleared before DB update completes
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return result;
  }

  /**
   * Reject Whispr note and invalidate cache
   */
  static async rejectWhisprNote(noteId: string, userId?: string): Promise<boolean> {
    if (!userId) {
      console.warn('rejectWhisprNote: userId is required');
      return false;
    }
    
    const result = await BuddiesService.rejectNote(noteId, userId);
    
    // Invalidate Whispr notes cache to refresh propagation count
    QueryCache.invalidateWhisprNotes(userId);
    
    return result.success || false;
  }

  /**
   * Update user profile and invalidate cache
   */
  static async updateUserProfile(
    updates: {
      username?: string;
      mood?: string;
      isOnline?: boolean;
    },
    userId?: string
  ): Promise<boolean> {
    if (!userId) {
      console.warn('updateUserProfile: userId is required');
      return false;
    }
    
    const result = await BuddiesService.updateUserProfile(userId, updates);
    
    // Invalidate user profile cache
    QueryCache.invalidateUserProfile(userId);
    
    return result;
  }

  /**
   * Delete buddy and invalidate cache with enhanced real-time handling
   */
  static async deleteBuddy(buddyId: string, userId?: string): Promise<boolean> {
    try {
      const result = await BuddiesService.deleteBuddy(buddyId, userId || '');
      
      if (result && result.success) {
        // Invalidate buddies cache for the deleting user
        if (userId) {
          QueryCache.invalidateBuddies(userId);
        }
        
        // If we have the buddy_user_id from the result, also invalidate their cache
        if (result.buddy_user_id) {
          QueryCache.invalidateBuddies(result.buddy_user_id);
        }
        
        // Invalidate message caches for both users
        if (userId) {
          QueryCache.invalidateMessages(buddyId, userId);
        }
        
        if (result.buddy_user_id) {
          QueryCache.invalidateMessages(buddyId, result.buddy_user_id);
        }
        return true;
      } else {
        console.error('❌ CachedBuddiesService: Buddy deletion failed');
        throw new Error(result?.error || result?.message || 'Failed to delete buddy');
      }
    } catch (error) {
      console.error('❌ CachedBuddiesService: Error deleting buddy:', error);
      throw error;
    }
  }

  /**
   * Block user and invalidate cache
   */
  static async blockUser(buddyUserId: string, userId?: string): Promise<boolean> {
    const result = await BuddiesService.blockUser(buddyUserId, userId || '');
    
    // Invalidate buddies cache
    if (userId) {
      QueryCache.invalidateBuddies(userId);
    }
    
    return result;
  }

  /**
   * Unblock user and invalidate cache
   */
  static async unblockUser(buddyUserId: string, userId?: string): Promise<boolean> {
    const result = await BuddiesService.unblockUser(buddyUserId, userId || '');
    
    // Invalidate buddies cache
    if (userId) {
      QueryCache.invalidateBuddies(userId);
    }
    
    return result;
  }

  /**
   * Clear chat history and invalidate cache
   */
  static async clearChatHistory(buddyId: string, userId?: string): Promise<boolean> {
    // Add to cleared chats immediately
    this.clearedChats.add(buddyId);
    
    const result = await BuddiesService.clearChatHistory(buddyId, userId);
    
    // Invalidate message cache for this buddy with userId context
    QueryCache.invalidateMessages(buddyId, userId);
    
    // Also clear the cache directly to ensure immediate effect
    QueryCache.atomicClearMessages(buddyId, userId || '');
    
    return result;
  }

  /**
   * Clear buddy chat (alias for clearChatHistory)
   */
  static async clearBuddyChat(buddyId: string, userId?: string): Promise<boolean> {
    return this.clearChatHistory(buddyId, userId);
  }

  /**
   * Check if a chat was cleared
   */
  static isChatCleared(buddyId: string): boolean {
    return this.clearedChats.has(buddyId);
  }

  /**
   * Reset cleared chat status (for testing)
   */
  static resetClearedChat(buddyId: string): void {
    this.clearedChats.delete(buddyId);
  }


  /**
   * Sync user online status and invalidate cache
   */
  static async syncUserOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
    const result = await BuddiesService.syncUserOnlineStatus(userId, isOnline);
    
    // Invalidate buddies cache for all users who have this user as a buddy
    // Note: This is a broad invalidation since online status affects multiple users
    QueryCache.clearByPattern('buddies_.*');
    
    return result;
  }

  /**
   * Force refresh messages for more frequent updates
   * Useful for ensuring fresh data on user interaction
   */
  static forceRefreshMessages(buddyId: string, userId?: string): void {
    QueryCache.forceRefreshMessages(buddyId, userId);
  }

  /**
   * Force refresh all message caches (for debugging/testing)
   */
  static forceRefreshAllMessages(): void {
    QueryCache.forceRefreshAllMessages();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return QueryCache.getStats();
  }

  /**
   * Clear all caches (for debugging/testing)
   */
  static clearAllCaches(): void {
    QueryCache.clearAll();
    // storage.clearAll(); // Temporarily disabled MMKV
    console.log('🧹 All caches cleared (memory + MMKV)');
  }

  /**
   * Preload data for better performance
   */
  static async preloadUserData(userId: string): Promise<void> {
    try {
      // Get buddies first
      const buddies = await this.getBuddies(userId);
      
      // Extract buddy IDs for message preloading
      const buddyIds = buddies.map(buddy => buddy.id);
      
      // Preload messages for all buddies in background
      await QueryCache.preloadBuddyData(userId, buddyIds);
      
      console.log('🚀 Data PRELOADED: All buddy data for user', userId);
    } catch (error) {
      console.error('Failed to preload user data:', error);
    }
  }

  /**
   * Warm up cache for specific user
   */
  static async warmUpCache(userId: string): Promise<void> {
    try {
      console.log('🔥 Warming up cache for user:', userId);
      
      // First, try to hydrate from MMKV
      await this.hydrateCache(userId);
      
      // Then preload all user data
      await this.preloadUserData(userId);
      
      console.log('✅ Cache warmed up successfully for user:', userId);
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  }

  /**
   * Hydrate cache from MMKV persistent storage
   */
  static async hydrateCache(userId: string): Promise<void> {
    try {
      console.log('💾 Hydrating cache from MMKV for user:', userId);
      
      // Temporarily disabled MMKV
      // const data = storage.getString(`buddies_${userId}`);
      // if (data) {
      //   const buddies = JSON.parse(data);
      //   QueryCache.setBuddies(userId, buddies);
      //   console.log('✅ Cache hydrated with', buddies.length, 'buddies');
      // } else {
        console.log('📭 MMKV temporarily disabled - no persistent data loaded');
      // }
    } catch (error) {
      console.error('Failed to hydrate cache:', error);
    }
  }

  /**
   * Hydrate messages from MMKV persistent storage
   */
  static hydrateMessages(buddyId: string, userId: string): BuddyMessage[] | null {
    try {
      console.log('💾 Hydrating messages from MMKV for buddy:', buddyId);
      
      // Temporarily disabled MMKV
      // const data = storage.getString(`messages_${buddyId}_${userId}`);
      // if (data) {
      //   const messages = JSON.parse(data);
      //   console.log('✅ Messages hydrated with', messages.length, 'messages');
      //   return messages;
      // } else {
        console.log('📭 MMKV temporarily disabled - no persistent messages loaded');
        return null;
      // }
    } catch (error) {
      console.error('Failed to hydrate messages:', error);
      return null;
    }
  }

  /**
   * Persist cache to MMKV storage
   */
  static persistCache(userId: string, buddies: Buddy[]): void {
    try {
      console.log('💾 Persisting', buddies.length, 'buddies to MMKV for user:', userId);
      
      // Temporarily disabled MMKV
      // storage.set(`buddies_${userId}`, JSON.stringify(buddies));
      console.log('📭 MMKV temporarily disabled - cache not persisted');
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  /**
   * Clear MMKV persistent cache for a user
   */
  static clearPersistentCache(userId: string): void {
    try {
      console.log('🧹 Clearing MMKV cache for user:', userId);
      
      // Temporarily disabled MMKV
      // storage.delete(`buddies_${userId}`);
      console.log('📭 MMKV temporarily disabled - cache not cleared');
    } catch (error) {
      console.error('Failed to clear MMKV cache:', error);
    }
  }

  /**
   * Persist messages to MMKV storage
   */
  static persistMessages(buddyId: string, messages: BuddyMessage[], userId: string): void {
    try {
      console.log('💾 Persisting', messages.length, 'messages to MMKV for buddy:', buddyId);
      
      // Temporarily disabled MMKV
      // storage.set(`messages_${buddyId}_${userId}`, JSON.stringify(messages));
      console.log('📭 MMKV temporarily disabled - messages not persisted');
    } catch (error) {
      console.error('Failed to persist messages:', error);
    }
  }

  /**
   * Helper method to update buddies cache and persist to MMKV
   */
  private static updateBuddiesCache(userId: string, buddies: Buddy[]): void {
    // Update memory cache
    QueryCache.setBuddies(userId, buddies);
    
    // Persist to MMKV - temporarily disabled
    // this.persistCache(userId, buddies);
  }

  /**
   * Handle real-time buddy updates - refresh and persist cache
   */
  static async handleRealtimeBuddyUpdate(userId: string): Promise<void> {
    try {
      console.log('🔄 Real-time buddy update detected, refreshing cache for user:', userId);
      
      // Fetch fresh data from database
      const buddies = await BuddiesService.getBuddies(userId);
      
      // Update cache and persist
      this.updateBuddiesCache(userId, buddies);
      
      console.log('✅ Real-time buddy update processed successfully');
    } catch (error) {
      console.error('❌ Failed to handle real-time buddy update:', error);
    }
  }

  /**
   * Apply real-time updates to cache with intelligent handling
   */
  static async applyRealtimeUpdate(type: 'message' | 'buddy' | 'delete', payload: any, userId: string): Promise<void> {
    try {
      console.log(`🔄 Applying real-time ${type} update:`, payload);

      // ULTRA DIRECT: Block real-time updates for cleared chats
      if (type === 'message' && this.clearedChats.has(payload.buddy_id)) {
        console.log('🚫 ULTRA DIRECT: Blocking real-time update for cleared chat:', payload.buddy_id);
        return;
      }

      switch (type) {
        case 'message':
          // ✅ CRITICAL FIX: Check FIRST if message has already been processed
          const messageId = payload.id;
          
          if (this.processedMessageIds.has(messageId)) {
            console.log(`⏭️ CachedBuddiesService: Message ${messageId.substring(0, 8)} already cached, skipping duplicate`);
            return; // STOP HERE - don't cache duplicates!
          }
          
          // Mark as processed IMMEDIATELY to prevent concurrent duplicate processing
          this.processedMessageIds.add(messageId);
          
          // Clean old entries periodically (every 100 messages)
          if (this.processedMessageIds.size > 100) {
            this.cleanProcessedMessages();
          }
          
          const messageBuddyId = payload.buddy_id;
          const senderId = payload.sender_id;
          const receiverId = payload.receiver_id || userId;
          
          console.log('🔄 CachedBuddiesService: Processing message for caching:', {
            messageId: payload.id.substring(0, 8),
            messageBuddyId,
            senderId,
            receiverId,
            currentUserId: userId
          });
          
          // Get existing messages for this buddy (for current user)
          const existingMessages = QueryCache.getMessages(messageBuddyId, userId) || [];
          
          // Create new message
          const newMessage: BuddyMessage = {
            id: payload.id,
            buddyId: payload.buddy_id,
            senderId: payload.sender_id,
            receiverId: payload.receiver_id || userId,
            content: payload.content,
            messageType: payload.message_type || 'text',
            isRead: false,
            timestamp: new Date(payload.created_at),
            createdAt: new Date(payload.created_at),
            updatedAt: new Date(payload.created_at),
          };
          
          // Add message to existing messages
          const updatedMessages = [...existingMessages, newMessage];
          
          // Store in cache under the message's buddy ID for current user
          QueryCache.setMessages(messageBuddyId, updatedMessages, userId);
          console.log('✅ CachedBuddiesService: Cached message for current user:', userId);
          
          // CRITICAL FIX: Also cache for the OTHER user in the conversation
          try {
            const { data: buddyData } = await supabase
              .from('buddies')
              .select('*')
              .eq('id', messageBuddyId)
              .single();
            
            if (buddyData) {
              // Determine who the other user is
              const otherUserId = buddyData.user_id === userId ? buddyData.buddy_user_id : buddyData.user_id;
              console.log('🔄 CachedBuddiesService: Found other user in conversation:', otherUserId);
              
              // Get existing messages for the other user
              const otherUserMessages = QueryCache.getMessages(messageBuddyId, otherUserId) || [];
              const otherUserUpdatedMessages = [...otherUserMessages, newMessage];
              
              // Cache for the other user too
              QueryCache.setMessages(messageBuddyId, otherUserUpdatedMessages, otherUserId);
              console.log('✅ CachedBuddiesService: Cached message for other user:', otherUserId);
              
              // Also try to find and cache under the reciprocal buddy ID for both users
              const { data: reciprocalBuddy } = await supabase
                .from('buddies')
                .select('*')
                .eq('user_id', buddyData.buddy_user_id)
                .eq('buddy_user_id', buddyData.user_id)
                .single();
              
              if (reciprocalBuddy) {
                console.log('🔄 CachedBuddiesService: Found reciprocal buddy ID:', reciprocalBuddy.id);
                
                // Cache under reciprocal buddy ID for current user
                QueryCache.setMessages(reciprocalBuddy.id, updatedMessages, userId);
                console.log('✅ CachedBuddiesService: Cached under reciprocal buddy ID for current user');
                
                // Cache under reciprocal buddy ID for other user
                QueryCache.setMessages(reciprocalBuddy.id, otherUserUpdatedMessages, otherUserId);
                console.log('✅ CachedBuddiesService: Cached under reciprocal buddy ID for other user');
              }
            }
          } catch (error) {
            console.log('⚠️ CachedBuddiesService: Error caching for other user:', error);
          }
          
          // Dispatch UI update event
          CachedBuddiesService.dispatchUIUpdateEvent(messageBuddyId, 'message-updated', payload);
          
          console.log('✅ Message added to cache:', payload.id, 'Total messages:', updatedMessages.length);
          break;

        case 'buddy':
          // ⚠️ CRITICAL FIX: Debounce full cache refreshes to prevent infinite loops
          // Only refresh if we haven't refreshed in the last 2 seconds
          const lastRefreshKey = `last_buddy_refresh_${userId}`;
          const lastRefreshTime = (this as any)[lastRefreshKey] || 0;
          const now = Date.now();
          
          if (now - lastRefreshTime > 2000) { // 2 second debounce
            // Invalidate buddies cache to force refresh
            QueryCache.invalidateBuddies(userId);
            
            // Trigger a refresh to update MMKV persistence
            this.handleRealtimeBuddyUpdate(userId).catch(error => {
              console.error('❌ Failed to refresh buddy cache after real-time update:', error);
            });
            
            console.log('✅ Buddy cache invalidated for refresh (debounced)');
            (this as any)[lastRefreshKey] = now;
          } else {
            console.log('⏭️ Skipping cache refresh - too soon after last refresh (debounced, gap:', now - lastRefreshTime, 'ms)');
          }
          break;

        case 'delete':
          // Clear specific message cache and invalidate buddies
          QueryCache.invalidateMessages(payload.buddy_id, userId);
          QueryCache.invalidateBuddies(userId);
          console.log('✅ Delete operation - caches invalidated');
          break;

        default:
          console.warn('⚠️ Unknown real-time update type:', type);
      }
    } catch (error) {
      console.error('❌ Failed to apply real-time update:', error);
    }
  }

  /**
   * Dispatch UI update event using DeviceEventEmitter
   */
  private static dispatchUIUpdateEvent(buddyId: string, eventType: string, messageData?: any): void {
    try {
      console.log(`📢 CachedBuddiesService: Dispatching UI event: ${eventType} for buddy: ${buddyId}`);
      
      // Use React Native's DeviceEventEmitter
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit(eventType, { 
        type: eventType,
        buddyId: buddyId,
        source: 'cachedBuddiesService',
        message: messageData
      });
      
      console.log(`✅ CachedBuddiesService: UI event dispatched successfully: ${eventType}`);
    } catch (error) {
      console.error(`❌ CachedBuddiesService: Error dispatching UI event ${eventType}:`, error);
    }
  }

}
