import { supabase } from '@/config/supabase';
import { Buddy, BuddyMessage } from './buddiesService';

/**
 * 🚀 UNIFIED CHAT SERVICE - SIMPLIFIED ARCHITECTURE
 * 
 * This replaces ALL the complex chat services with a single, unified approach:
 * - Single cache system
 * - Single real-time handler
 * - Consistent buddy ID strategy
 * - No more complexity or conflicts
 */
export class UnifiedChatService {
  // Simple in-memory cache - no complex TTL or eviction
  private static cache = new Map<string, any>();
  
  // Track cleared chats to prevent updates
  private static clearedChats = new Set<string>();
  
  // Real-time subscription management
  private static subscriptions = new Map<string, any>();
  
  /**
   * 🎯 CONSISTENT BUDDY ID STRATEGY
   * Always use the same buddy ID for cache keys regardless of perspective
   */
  private static getConsistentBuddyId(buddyId: string, userId: string): string {
    // For now, just return the buddyId as-is
    // In the future, we can implement consistent ID logic here
    return buddyId;
  }
  
  /**
   * 📦 SIMPLE CACHE OPERATIONS
   */
  private static getCacheKey(type: string, id: string, userId?: string): string {
    return userId ? `${type}:${id}:${userId}` : `${type}:${id}`;
  }
  
  private static getFromCache<T>(key: string): T | null {
    return this.cache.get(key) || null;
  }
  
  private static setCache<T>(key: string, data: T): void {
    this.cache.set(key, data);
  }
  
  private static clearCache(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * 👥 GET BUDDIES - SIMPLIFIED
   */
  static async getBuddies(userId: string): Promise<Buddy[]> {
    const cacheKey = this.getCacheKey('buddies', userId);
    
    // Check cache first
    const cached = this.getFromCache<Buddy[]>(cacheKey);
    if (cached) {
      console.log('📦 Cache HIT: Buddies for user', userId);
      return cached;
    }
    
    console.log('🔄 Cache MISS: Fetching buddies for user', userId);
    
    try {
      const { data, error } = await supabase
        .from('buddies')
        .select(`
          id,
          buddy_user_id,
          user_id,
          last_message,
          last_message_time,
          created_at,
          updated_at,
          buddy_user:buddy_user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('last_message_time', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching buddies:', error);
        throw error;
      }
      
      const buddies = data || [];
      
      // Cache the result
      this.setCache(cacheKey, buddies);
      
      console.log('✅ Fetched and cached', buddies.length, 'buddies');
      return buddies;
      
    } catch (error) {
      console.error('❌ Failed to fetch buddies:', error);
      throw error;
    }
  }
  
  /**
   * 💬 GET MESSAGES - SIMPLIFIED
   */
  static async getMessages(buddyId: string, userId: string): Promise<BuddyMessage[]> {
    const consistentBuddyId = this.getConsistentBuddyId(buddyId, userId);
    const cacheKey = this.getCacheKey('messages', consistentBuddyId, userId);
    
    // Check if chat was cleared
    if (this.clearedChats.has(consistentBuddyId)) {
      console.log('🚫 Chat was cleared, returning empty messages');
      return [];
    }
    
    // Check cache first
    const cached = this.getFromCache<BuddyMessage[]>(cacheKey);
    if (cached) {
      console.log('📦 Cache HIT: Messages for buddy', consistentBuddyId, `(${cached.length} messages)`);
      return cached;
    }
    
    console.log('🔄 Cache MISS: Fetching messages for buddy', consistentBuddyId);
    
    try {
      const { data, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .eq('buddy_id', consistentBuddyId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }
      
      const messages: BuddyMessage[] = (data || []).map(msg => ({
        id: msg.id,
        buddyId: msg.buddy_id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        messageType: msg.message_type || 'text',
        isRead: msg.is_read || false,
        timestamp: new Date(msg.created_at),
        createdAt: new Date(msg.created_at),
        updatedAt: new Date(msg.updated_at || msg.created_at),
      }));
      
      // Cache the result
      this.setCache(cacheKey, messages);
      
      console.log('✅ Fetched and cached', messages.length, 'messages');
      return messages;
      
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      throw error;
    }
  }
  
  /**
   * 📤 SEND MESSAGE - SIMPLIFIED
   */
  static async sendMessage(buddyId: string, content: string, messageType: 'text' | 'image' | 'file' | 'emoji' = 'text', userId: string): Promise<string> {
    const consistentBuddyId = this.getConsistentBuddyId(buddyId, userId);
    
    console.log('📤 Sending message to buddy:', consistentBuddyId);
    
    try {
      // Insert message directly into database
      const { data: messageData, error: insertError } = await supabase
        .from('buddy_messages')
        .insert({
          buddy_id: consistentBuddyId,
          sender_id: userId,
          content: content,
          message_type: messageType,
          is_read: false
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('❌ Error inserting message:', insertError);
        throw insertError;
      }
      
      console.log('✅ Message sent successfully:', messageData.id);
      
      // Update buddy last message
      await this.updateBuddyLastMessage(consistentBuddyId, content);
      
      // Invalidate cache to force refresh
      this.invalidateBuddyCache(consistentBuddyId, userId);
      
      return messageData.id;
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }
  
  /**
   * 👁️ MARK AS READ - SIMPLIFIED
   */
  static async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buddy_messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('receiver_id', userId);
      
      if (error) {
        console.error('❌ Error marking message as read:', error);
        throw error;
      }
      
      console.log('✅ Message marked as read:', messageId);
      
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
      throw error;
    }
  }
  
  /**
   * 🗑️ CLEAR CHAT - SIMPLIFIED
   */
  static async clearChat(buddyId: string, userId: string): Promise<void> {
    const consistentBuddyId = this.getConsistentBuddyId(buddyId, userId);
    
    console.log('🗑️ Clearing chat for buddy:', consistentBuddyId);
    
    try {
      // Mark chat as cleared
      this.clearedChats.add(consistentBuddyId);
      
      // Clear cache
      const cacheKey = this.getCacheKey('messages', consistentBuddyId, userId);
      this.clearCache(cacheKey);
      
      // Delete messages from database
      const { error } = await supabase
        .from('buddy_messages')
        .delete()
        .eq('buddy_id', consistentBuddyId);
      
      if (error) {
        console.error('❌ Error clearing chat:', error);
        throw error;
      }
      
      console.log('✅ Chat cleared successfully');
      
    } catch (error) {
      console.error('❌ Failed to clear chat:', error);
      throw error;
    }
  }
  
  /**
   * 🔄 REAL-TIME UPDATE HANDLER - SIMPLIFIED
   */
  static handleRealtimeUpdate(type: 'message' | 'buddy' | 'delete', payload: any, userId: string): void {
    console.log(`🔄 Handling real-time ${type} update:`, payload);
    
    try {
      switch (type) {
        case 'message':
          this.handleMessageUpdate(payload, userId);
          break;
        case 'buddy':
          this.handleBuddyUpdate(payload, userId);
          break;
        case 'delete':
          this.handleDeleteUpdate(payload, userId);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling real-time update:', error);
    }
  }
  
  /**
   * 💬 HANDLE MESSAGE UPDATE - SIMPLIFIED
   */
  private static handleMessageUpdate(payload: any, userId: string): void {
    const buddyId = payload.buddy_id;
    const consistentBuddyId = this.getConsistentBuddyId(buddyId, userId);
    
    // Check if chat was cleared
    if (this.clearedChats.has(consistentBuddyId)) {
      console.log('🚫 Ignoring message update for cleared chat');
      return;
    }
    
    // Check if message already exists in cache
    const cacheKey = this.getCacheKey('messages', consistentBuddyId, userId);
    const cachedMessages = this.getFromCache<BuddyMessage[]>(cacheKey) || [];
    
    const messageExists = cachedMessages.some(msg => msg.id === payload.id);
    
    if (!messageExists) {
      // Add new message to cache
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
      
      const updatedMessages = [...cachedMessages, newMessage];
      this.setCache(cacheKey, updatedMessages);
      
      console.log('✅ Message added to cache:', payload.id);
      
      // Dispatch UI update event
      this.dispatchUIUpdate('message-updated', {
        buddyId: consistentBuddyId,
        messageId: payload.id,
        message: newMessage
      });
    } else {
      console.log('⚠️ Message already exists in cache:', payload.id);
    }
  }
  
  /**
   * 👥 HANDLE BUDDY UPDATE - SIMPLIFIED
   */
  private static handleBuddyUpdate(payload: any, userId: string): void {
    // Invalidate buddies cache to force refresh
    const cacheKey = this.getCacheKey('buddies', userId);
    this.clearCache(cacheKey);
    
    console.log('✅ Buddy cache invalidated');
    
    // Dispatch UI update event
    this.dispatchUIUpdate('buddy-updated', {
      buddyId: payload.id,
      userId: userId
    });
  }
  
  /**
   * 🗑️ HANDLE DELETE UPDATE - SIMPLIFIED
   */
  private static handleDeleteUpdate(payload: any, userId: string): void {
    const buddyId = payload.buddy_id;
    const consistentBuddyId = this.getConsistentBuddyId(buddyId, userId);
    
    // Clear cache
    const cacheKey = this.getCacheKey('messages', consistentBuddyId, userId);
    this.clearCache(cacheKey);
    
    console.log('✅ Messages cache cleared for deleted chat');
    
    // Dispatch UI update event
    this.dispatchUIUpdate('chat-deleted', {
      buddyId: consistentBuddyId,
      userId: userId
    });
  }
  
  /**
   * 📢 DISPATCH UI UPDATE - SIMPLIFIED
   */
  private static dispatchUIUpdate(eventType: string, data: any): void {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(eventType, { detail: data });
      window.dispatchEvent(event);
      console.log('📢 UI update dispatched:', eventType);
    }
  }
  
  /**
   * 🔄 SUBSCRIBE TO REAL-TIME UPDATES - SIMPLIFIED
   */
  static async subscribeToUpdates(userId: string): Promise<void> {
    console.log('🔄 Subscribing to real-time updates for user:', userId);
    
    try {
      // Subscribe to buddy_messages changes
      const messagesChannel = supabase
        .channel('buddy_messages_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'buddy_messages'
        }, (payload) => {
          console.log('📨 Real-time message update received:', payload);
          this.handleRealtimeUpdate('message', payload.new || payload.old, userId);
        })
        .subscribe();
      
      // Subscribe to buddies changes
      const buddiesChannel = supabase
        .channel('buddies_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'buddies'
        }, (payload) => {
          console.log('👥 Real-time buddy update received:', payload);
          this.handleRealtimeUpdate('buddy', payload.new || payload.old, userId);
        })
        .subscribe();
      
      // Store subscriptions
      this.subscriptions.set(`messages:${userId}`, messagesChannel);
      this.subscriptions.set(`buddies:${userId}`, buddiesChannel);
      
      console.log('✅ Real-time subscriptions established');
      
    } catch (error) {
      console.error('❌ Failed to subscribe to real-time updates:', error);
      throw error;
    }
  }
  
  /**
   * 🔌 UNSUBSCRIBE FROM REAL-TIME UPDATES - SIMPLIFIED
   */
  static async unsubscribeFromUpdates(userId: string): Promise<void> {
    console.log('🔌 Unsubscribing from real-time updates for user:', userId);
    
    try {
      // Unsubscribe from messages
      const messagesChannel = this.subscriptions.get(`messages:${userId}`);
      if (messagesChannel) {
        await supabase.removeChannel(messagesChannel);
        this.subscriptions.delete(`messages:${userId}`);
      }
      
      // Unsubscribe from buddies
      const buddiesChannel = this.subscriptions.get(`buddies:${userId}`);
      if (buddiesChannel) {
        await supabase.removeChannel(buddiesChannel);
        this.subscriptions.delete(`buddies:${userId}`);
      }
      
      console.log('✅ Real-time subscriptions removed');
      
    } catch (error) {
      console.error('❌ Failed to unsubscribe from real-time updates:', error);
      throw error;
    }
  }
  
  /**
   * 🧹 CLEAR ALL CACHE - SIMPLIFIED
   */
  static clearAllCache(): void {
    this.cache.clear();
    this.clearedChats.clear();
    console.log('🧹 All cache cleared');
  }
  
  /**
   * 🔧 HELPER METHODS
   */
  private static async updateBuddyLastMessage(buddyId: string, content: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buddies')
        .update({
          last_message: content,
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', buddyId);
      
      if (error) {
        console.warn('⚠️ Failed to update buddy last message:', error);
      }
    } catch (error) {
      console.warn('⚠️ Error updating buddy last message:', error);
    }
  }
  
  private static invalidateBuddyCache(buddyId: string, userId: string): void {
    const cacheKey = this.getCacheKey('messages', buddyId, userId);
    this.clearCache(cacheKey);
  }
}

// Export singleton instance
export const unifiedChatService = new UnifiedChatService();
