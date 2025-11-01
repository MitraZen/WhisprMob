import { supabase } from '@/config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { QueryCache } from './queryCache';

// Telegram-style simple types
export interface SimpleChat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message?: string;
  last_message_time?: string;
}

export interface SimpleMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'emoji';
  created_at: string;
  is_read: boolean;
}

/**
 * 🚀 TELEGRAM-STYLE SIMPLE CHAT SERVICE
 * 
 * This follows Telegram's approach:
 * - Single service for all chat operations
 * - Consistent chat IDs (no reciprocal relationships)
 * - Simple cache with key-value storage
 * - Single real-time connection
 * - Server-side logic, client just displays
 */
export class TelegramStyleChatService {
  // Simple in-memory cache
  private static cache = new Map<string, any>();
  // Realtime channels
  private static messagesChannel: RealtimeChannel | null = null;
  private static chatsChannel: RealtimeChannel | null = null;
  
  /**
   * 🎯 CONSISTENT CHAT ID STRATEGY (Telegram's approach)
   * Always return the same chat ID for the same two users
   */
  private static getChatId(user1Id: string, user2Id: string): string {
    // Sort IDs to ensure consistency (smaller ID first)
    const [id1, id2] = [user1Id, user2Id].sort();
    return `${id1}-${id2}`;
  }
  
  /**
   * 📦 SIMPLE CACHE OPERATIONS
   */
  private static getCacheKey(type: string, key: string): string {
    return `${type}:${key}`;
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
   * 👥 GET OR CREATE CHAT (Telegram's approach)
   */
  static async getOrCreateChat(user1Id: string, user2Id: string): Promise<SimpleChat> {
    const chatId = this.getChatId(user1Id, user2Id);
    const cacheKey = this.getCacheKey('chat', chatId);
    
    // Check cache first
    const cached = this.getFromCache<SimpleChat>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Try to find existing chat
      const [id1, id2] = [user1Id, user2Id].sort();
      
      const { data: existingChat, error: findError } = await supabase
        .from('chats')
        .select('*')
        .eq('user1_id', id1)
        .eq('user2_id', id2)
        .single();
      
      if (existingChat && !findError) {
        // Chat exists, cache and return
        this.setCache(cacheKey, existingChat);
        return existingChat;
      }
      
      // Chat doesn't exist, create it
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          id: chatId,
          user1_id: id1,
          user2_id: id2
        })
        .select('*')
        .single();
      
      if (createError) {
        console.error('❌ Error creating chat:', createError);
        throw createError;
      }
      
      // Cache the new chat
      this.setCache(cacheKey, newChat);
      return newChat;
      
    } catch (error) {
      console.error('Failed to get/create chat:', error);
      throw error;
    }
  }
  
  /**
   * 💬 SEND MESSAGE (Telegram's approach) - TEMPORARY FIX FOR EXISTING SYSTEM
   * This method can accept either:
   * 1. Two user IDs (senderId, receiverId)
   * 2. One user ID and one buddy ID (senderId, buddyId)
   */
  static async sendMessage(senderId: string, receiverIdOrBuddyId: string, content: string, messageType: 'text' | 'image' | 'file' | 'emoji' = 'text'): Promise<string> {
    // Send message
    
    try {
      // TEMPORARY FIX: Use existing buddy_messages table until migration is complete
      let buddyData: any;
      
      // First, check if receiverIdOrBuddyId is actually a buddy ID by looking it up directly
      const { data: buddyById, error: buddyByIdError } = await supabase
        .from('buddies')
        .select('id, user_id, buddy_user_id')
        .eq('id', receiverIdOrBuddyId)
        .single();
      
      
      if (!buddyByIdError && buddyById) {
        // receiverIdOrBuddyId is a buddy ID, check if senderId is one of the users in this relationship
        
        if (buddyById.user_id === senderId || buddyById.buddy_user_id === senderId) {
          buddyData = buddyById;
        } else {
          console.error('❌ Sender ID does not match either user in the buddy relationship');
          throw new Error('Buddy relationship not found');
        }
      } else {
        // receiverIdOrBuddyId is not a buddy ID, treat it as a user ID and search for relationship
        
        const { data: initialBuddyData, error: buddyError } = await supabase
          .from('buddies')
          .select('id, user_id, buddy_user_id')
          .eq('user_id', senderId)
          .eq('buddy_user_id', receiverIdOrBuddyId)
          .single();
        
        
        // If not found, try the reverse relationship
        if (buddyError && buddyError.code === 'PGRST116') {
          
          const { data: reverseBuddyData, error: reverseError } = await supabase
            .from('buddies')
            .select('id, user_id, buddy_user_id')
            .eq('user_id', receiverIdOrBuddyId)
            .eq('buddy_user_id', senderId)
            .single();
          
          
          if (reverseError || !reverseBuddyData) {
            console.error('❌ Error finding buddy relationship (both directions):', reverseError);
            
            // Let's see what buddy relationships actually exist
            const { data: allBuddies, error: allBuddiesError } = await supabase
              .from('buddies')
              .select('id, user_id, buddy_user_id, created_at')
              .limit(10);
            
            
            throw new Error('Buddy relationship not found');
          }
          
          // Use the reverse relationship
          buddyData = reverseBuddyData;
        } else if (buddyError || !initialBuddyData) {
          console.error('❌ Error finding buddy relationship:', buddyError);
          throw new Error('Buddy relationship not found');
        } else {
          buddyData = initialBuddyData;
        }
      }
      
      // Insert message into existing buddy_messages table
      const { data: messageData, error: insertError } = await supabase
        .from('buddy_messages')
        .insert({
          buddy_id: buddyData.id,
          sender_id: senderId,
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
      
      // Update buddy's last message
      await supabase
        .from('buddies')
        .update({
          last_message: content,
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', buddyData.id);
      
      // Clear cache to force refresh for both users
      QueryCache.invalidateMessages(buddyData.id);
      
      // Also invalidate cache for the other user in the conversation
      try {
        const otherUserId = buddyData.user_id === senderId ? buddyData.buddy_user_id : buddyData.user_id;
        
        // Find the reciprocal buddy relationship
        const { data: reciprocalBuddy } = await supabase
          .from('buddies')
          .select('*')
          .eq('user_id', buddyData.buddy_user_id)
          .eq('buddy_user_id', buddyData.user_id)
          .single();
        
        if (reciprocalBuddy) {
          QueryCache.invalidateMessages(reciprocalBuddy.id);
        }
      } catch (error) {
      }
      
      return messageData.id;
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }
  
  /**
   * 📨 GET MESSAGES (Telegram's approach) - TEMPORARY FIX FOR EXISTING SYSTEM
   * This method can accept either:
   * 1. Two user IDs (user1Id, user2Id)
   * 2. One user ID and one buddy ID (user1Id, buddyId)
   */
  static async getMessages(user1Id: string, user2IdOrBuddyId: string): Promise<SimpleMessage[]> {
    
        try {
          // TEMPORARY FIX: Use existing buddy_messages table until migration is complete
          let buddyData: any;
          
          // First, check if user2IdOrBuddyId is a buddy ID and try to get from cache
          let cachedMessages = QueryCache.getMessages(user2IdOrBuddyId);
          
          // If no cached messages found, try to find the reciprocal buddy ID
          if (!cachedMessages || cachedMessages.length === 0) {
            
            // Try to find the buddy relationship to get the reciprocal buddy ID
            const { data: buddyById, error: buddyByIdError } = await supabase
              .from('buddies')
              .select('*')
              .eq('id', user2IdOrBuddyId)
              .single();
            
            if (buddyById && !buddyByIdError) {
              
              // Find the reciprocal buddy relationship
              const { data: reciprocalBuddy, error: reciprocalError } = await supabase
                .from('buddies')
                .select('*')
                .eq('user_id', buddyById.buddy_user_id)
                .eq('buddy_user_id', buddyById.user_id)
                .single();
              
              if (reciprocalBuddy && !reciprocalError) {
                cachedMessages = QueryCache.getMessages(reciprocalBuddy.id);
              }
            }
          }
          
          if (cachedMessages && cachedMessages.length > 0) {
            // Convert BuddyMessage[] to SimpleMessage[]
            const simpleMessages: SimpleMessage[] = cachedMessages.map(msg => ({
              id: msg.id,
              chat_id: msg.buddyId,
              sender_id: msg.senderId,
              content: msg.content,
              message_type: msg.messageType || 'text',
              created_at: msg.createdAt.toISOString(),
              is_read: msg.isRead || false
            }));
            return simpleMessages;
          }
      
      // First, check if user2IdOrBuddyId is actually a buddy ID by looking it up directly
      const { data: buddyById, error: buddyByIdError } = await supabase
        .from('buddies')
        .select('id, user_id, buddy_user_id')
        .eq('id', user2IdOrBuddyId)
        .single();
      
      
      if (!buddyByIdError && buddyById) {
        // user2IdOrBuddyId is a buddy ID, check if user1Id is one of the users in this relationship
        
        if (buddyById.user_id === user1Id || buddyById.buddy_user_id === user1Id) {
          buddyData = buddyById;
        } else {
          console.error('❌ User ID does not match either user in the buddy relationship');
          return [];
        }
      } else {
        // user2IdOrBuddyId is not a buddy ID, treat it as a user ID and search for relationship
        
        const { data: initialBuddyData, error: buddyError } = await supabase
          .from('buddies')
          .select('id, user_id, buddy_user_id')
          .eq('user_id', user1Id)
          .eq('buddy_user_id', user2IdOrBuddyId)
          .single();
        
        
        // If not found, try the reverse relationship
        if (buddyError && buddyError.code === 'PGRST116') {
          
          const { data: reverseBuddyData, error: reverseError } = await supabase
            .from('buddies')
            .select('id, user_id, buddy_user_id')
            .eq('user_id', user2IdOrBuddyId)
            .eq('buddy_user_id', user1Id)
            .single();
          
          
          if (reverseError || !reverseBuddyData) {
            console.error('❌ Error finding buddy relationship (both directions):', reverseError);
            
            // Let's see what buddy relationships actually exist
            const { data: allBuddies, error: allBuddiesError } = await supabase
              .from('buddies')
              .select('id, user_id, buddy_user_id, created_at')
              .limit(10);
            
            
            return [];
          }
          
          // Use the reverse relationship
          buddyData = reverseBuddyData;
        } else if (buddyError || !initialBuddyData) {
          console.error('❌ Error finding buddy relationship:', buddyError);
          return [];
        } else {
          buddyData = initialBuddyData;
        }
      }
      
      // Get messages from buddy_messages table
      
      // ULTRA SIMPLE SOLUTION: Query ALL messages for this user pair
      
      // Get both buddy IDs for this user pair
      const { data: allBuddies } = await supabase
        .from('buddies')
        .select('id')
        .or(`and(user_id.eq.${buddyData.user_id},buddy_user_id.eq.${buddyData.buddy_user_id}),and(user_id.eq.${buddyData.buddy_user_id},buddy_user_id.eq.${buddyData.user_id})`);
      
      const buddyIds = allBuddies?.map(b => b.id) || [];
      
      // Query messages for ALL buddy IDs in this relationship
      const { data: messages, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .in('buddy_id', buddyIds)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching messages:', error);
        return [];
      }
      
      // Convert to SimpleMessage format
      const simpleMessages: SimpleMessage[] = (messages || []).map(msg => ({
        id: msg.id,
        chat_id: buddyData.id, // Use buddy ID as chat ID for now
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type || 'text',
        created_at: msg.created_at,
        is_read: msg.is_read || false
      }));
      
      console.log('✅ Fetched', simpleMessages.length, 'messages from existing system');
      console.log('✅ Message details:', simpleMessages.map(m => ({
        id: m.id,
        content: m.content.substring(0, 20),
        sender_id: m.sender_id,
        created_at: m.created_at
      })));
      
      return simpleMessages;
      
    } catch (error) {
      console.error('❌ Failed to fetch messages:', error);
      return [];
    }
  }
  
  /**
   * 👥 GET USER'S CHATS (Telegram's approach)
   */
  static async getUserChats(userId: string): Promise<SimpleChat[]> {
    console.log('🔄 Fetching chats for user:', userId);
    
    try {
      // TEMPORARY FIX: Use existing buddies table until migration is complete
      const { data: buddies, error } = await supabase
        .from('buddies')
        .select('*')
        .or(`user_id.eq.${userId},buddy_user_id.eq.${userId}`)
        .order('last_message_time', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching user chats:', error);
        return [];
      }
      
      // Convert to SimpleChat format
      const chats: SimpleChat[] = (buddies || []).map(buddy => ({
        id: buddy.id,
        user1_id: buddy.user_id,
        user2_id: buddy.buddy_user_id,
        last_message: buddy.last_message || '',
        last_message_time: buddy.last_message_time || buddy.created_at,
        created_at: buddy.created_at,
        updated_at: buddy.updated_at || buddy.created_at
      }));
      
      console.log('✅ Fetched', chats.length, 'chats from existing system');
      return chats;
      
    } catch (error) {
      console.error('❌ Failed to fetch user chats:', error);
      return [];
    }
  }
  
  /**
   * 👁️ MARK AS READ (Telegram's approach)
   */
  static async markAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .neq('sender_id', userId); // Don't mark own messages as read
      
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
   * 🗑️ CLEAR CHAT (Fixed for buddy_messages table)
   */
  static async clearChat(user1Id: string, user2Id: string): Promise<void> {
      // console.log('🗑️ Clearing chat between users:', user1Id, 'and', user2Id);
    
    try {
      // Find the buddy relationship between these two users
      // Use limit(1) instead of single() to handle cases where no relationship exists
      const { data: buddyRelationships, error: buddyError } = await supabase
        .from('buddies')
        .select('id')
        .or(`and(user_id.eq.${user1Id},buddy_user_id.eq.${user2Id}),and(user_id.eq.${user2Id},buddy_user_id.eq.${user1Id})`)
        .limit(1);
      
      if (buddyError) {
        console.error('❌ Error finding buddy relationship:', buddyError);
        throw buddyError;
      }
      
      if (!buddyRelationships || buddyRelationships.length === 0) {
        console.error('❌ No buddy relationship found between users');
        
        // Debug: Let's see what buddy relationships actually exist for these users
        // const { data: user1Buddies, error: user1Error } = await supabase
        //   .from('buddies')
        //   .select('id, user_id, buddy_user_id')
        //   .or(`user_id.eq.${user1Id},buddy_user_id.eq.${user1Id}`)
        //   .limit(5);
        
        // const { data: user2Buddies, error: user2Error } = await supabase
        //   .from('buddies')
        //   .select('id, user_id, buddy_user_id')
        //   .or(`user_id.eq.${user2Id},buddy_user_id.eq.${user2Id}`)
        //   .limit(5);
        
        // console.log('🔍 Debug - User1 buddies:', user1Buddies);
        // console.log('🔍 Debug - User2 buddies:', user2Buddies);
        // console.log('🔍 Debug - User1 ID:', user1Id);
        // console.log('🔍 Debug - User2 ID:', user2Id);
        
        throw new Error('No buddy relationship found between these users');
      }
      
      const buddyId = buddyRelationships[0].id;
      // console.log('🔍 Found buddy ID:', buddyId);
      
      // Get ALL buddy IDs for this user pair (same logic as getMessages)
      const { data: allBuddies, error: allBuddiesError } = await supabase
        .from('buddies')
        .select('id')
        .or(`and(user_id.eq.${user1Id},buddy_user_id.eq.${user2Id}),and(user_id.eq.${user2Id},buddy_user_id.eq.${user1Id})`);
      
      if (allBuddiesError) {
        console.error('❌ Error getting all buddy relationships:', allBuddiesError);
        throw allBuddiesError;
      }
      
      const buddyIds = allBuddies?.map(b => b.id) || [];
      // console.log('🔍 All buddy IDs for this user pair:', buddyIds);
      
      // First, let's see how many messages exist before deletion
      // const { data: messagesBefore, error: countError } = await supabase
      //   .from('buddy_messages')
      //   .select('id')
      //   .in('buddy_id', buddyIds);
      
      // if (countError) {
      //   console.error('❌ Error counting messages before deletion:', countError);
      // } else {
      //   console.log(`📊 Messages before deletion: ${messagesBefore?.length || 0}`);
      // }
      
      // Delete all messages for ALL buddy relationships
      const { data: deletedData, error: messagesError } = await supabase
        .from('buddy_messages')
        .delete()
        .in('buddy_id', buddyIds)
        .select('id'); // Select to see what was deleted
      
      if (messagesError) {
        console.error('❌ Error clearing messages:', messagesError);
        throw messagesError;
      }
      
      // console.log(`🗑️ Deleted ${deletedData?.length || 0} messages`);
      // console.log('🗑️ Deleted message IDs:', deletedData?.map(m => m.id) || []);
      
      // Clear cache for all buddy IDs
      buddyIds.forEach(id => {
        this.clearCache(this.getCacheKey('messages', id));
      });
      
      // console.log('✅ Chat cleared successfully for buddy:', buddyId);
      
    } catch (error) {
      console.error('❌ Failed to clear chat:', error);
      throw error;
    }
  }
  
  /**
   * 🔄 REAL-TIME UPDATE HANDLER (Telegram's approach)
   */
  static handleRealtimeUpdate(type: 'message' | 'chat', payload: any): void {
    console.log(`🔄 Handling real-time ${type} update:`, payload);
    
    try {
      switch (type) {
        case 'message':
          this.handleMessageUpdate(payload);
          break;
        case 'chat':
          this.handleChatUpdate(payload);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling real-time update:', error);
    }
  }
  
  /**
   * 💬 HANDLE MESSAGE UPDATE (Telegram's approach)
   */
  private static handleMessageUpdate(payload: any): void {
    const chatId = payload.chat_id;
    const cacheKey = this.getCacheKey('messages', chatId);
    
    // Get current cached messages
    const cachedMessages = this.getFromCache<SimpleMessage[]>(cacheKey) || [];
    
    // Check if message already exists
    const messageExists = cachedMessages.some(msg => msg.id === payload.id);
    
    if (!messageExists) {
      // Add new message to cache
      const newMessage: SimpleMessage = {
        id: payload.id,
        chat_id: payload.chat_id,
        sender_id: payload.sender_id,
        content: payload.content,
        message_type: payload.message_type || 'text',
        created_at: payload.created_at,
        is_read: false
      };
      
      const updatedMessages = [...cachedMessages, newMessage];
      this.setCache(cacheKey, updatedMessages);
      
      console.log('✅ Message added to cache:', payload.id);
      
      // Dispatch UI update event
      this.dispatchUIUpdate('new-message', {
        chatId: chatId,
        message: newMessage
      });
    } else {
      console.log('⚠️ Message already exists in cache:', payload.id);
    }
  }
  
  /**
   * 👥 HANDLE CHAT UPDATE (Telegram's approach)
   */
  private static handleChatUpdate(payload: any): void {
    const chatId = payload.id;
    const cacheKey = this.getCacheKey('chat', chatId);
    
    // Update chat in cache
    this.setCache(cacheKey, payload);
    
    console.log('✅ Chat updated in cache:', chatId);
    
    // Dispatch UI update event
    this.dispatchUIUpdate('chat-updated', {
      chatId: chatId,
      chat: payload
    });
  }
  
  /**
   * 📢 DISPATCH UI UPDATE (Telegram's approach)
   */
  private static dispatchUIUpdate(eventType: string, data: any): void {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(eventType, { detail: data });
      window.dispatchEvent(event);
      console.log('📢 UI update dispatched:', eventType);
    }
  }
  
  /**
   * 🔄 SUBSCRIBE TO REAL-TIME UPDATES (Telegram's approach)
   */
  static async subscribeToUpdates(userId: string): Promise<void> {
    console.log('🔄 Subscribing to real-time updates for user:', userId);
    
    try {
      // Single subscription to messages
      this.messagesChannel = supabase
        .channel('telegram_style_messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('📨 Real-time message received:', payload);
          this.handleRealtimeUpdate('message', payload.new);
        })
        .subscribe((status) => {
          console.log('📡 Messages subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Messages subscription error');
            this.handleConnectionError(userId);
          }
        });
      
      // Single subscription to chats
      this.chatsChannel = supabase
        .channel('telegram_style_chats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chats'
        }, (payload) => {
          console.log('👥 Real-time chat update received:', payload);
          this.handleRealtimeUpdate('chat', payload.new || payload.old);
        })
        .subscribe((status) => {
          console.log('📡 Chats subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Chats subscription error');
            this.handleConnectionError(userId);
          }
        });
      
      console.log('✅ Real-time subscriptions established');
      
    } catch (error) {
      console.error('❌ Failed to subscribe to real-time updates:', error);
      throw error;
    }
  }
  
  /**
   * 🔌 UNSUBSCRIBE FROM REAL-TIME UPDATES (Telegram's approach)
   */
  static async unsubscribeFromUpdates(): Promise<void> {
    console.log('🔌 Unsubscribing from real-time updates');
    
    try {
      if (this.messagesChannel) {
        await supabase.removeChannel(this.messagesChannel);
        this.messagesChannel = null;
      }
      if (this.chatsChannel) {
        await supabase.removeChannel(this.chatsChannel);
        this.chatsChannel = null;
      }
      
      console.log('✅ Real-time subscriptions removed');
      
    } catch (error) {
      console.error('❌ Failed to unsubscribe from real-time updates:', error);
      throw error;
    }
  }
  
  /**
   * 🧹 CLEAR ALL CACHE (Telegram's approach)
   */
  static clearAllCache(): void {
    this.cache.clear();
    console.log('🧹 All cache cleared');
  }
  
  /**
   * 🔧 HELPER METHODS
   */
  private static async updateChatLastMessage(chatId: string, content: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chats')
        .update({
          last_message: content,
          last_message_time: new Date().toISOString()
        })
        .eq('id', chatId);
      
      if (error) {
        console.warn('⚠️ Failed to update chat last message:', error);
      }
    } catch (error) {
      console.warn('⚠️ Error updating chat last message:', error);
    }
  }
  
  private static handleConnectionError(userId: string): void {
    console.log('🔄 Connection error - switching to polling mode');
    
    // Simple polling fallback
    setInterval(async () => {
      try {
        // Poll for new messages
        const chats = await this.getUserChats(userId);
        for (const chat of chats) {
          const messages = await this.getMessages(chat.user1_id, chat.user2_id);
          // Process any new messages
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds
  }
}

// Export singleton instance
export const telegramStyleChat = new TelegramStyleChatService();
