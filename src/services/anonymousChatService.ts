import { supabase } from '@/config/supabase';
import { notificationService } from '@/services/notificationService';

export interface ChatRoom {
  id: string;
  whispr_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  anonymous_name: string;
  joined_at: string;
  last_seen_at: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_user_id: string;
  message_text: string;
  character_count: number;
  created_at: string;
}

export interface BuddyRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  whispr_id?: string;
  chat_room_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  request_message?: string;
  created_at: string;
  responded_at?: string;
}

class AnonymousChatService {
  private static instance: AnonymousChatService;
  private realtimeSubscription: any = null;
  private onNewMessage: ((message: ChatMessage) => void) | null = null;
  private onNewParticipant: ((participant: ChatParticipant) => void) | null = null;
  private onNewBuddyRequest: ((request: BuddyRequest) => void) | null = null;

  static getInstance(): AnonymousChatService {
    if (!AnonymousChatService.instance) {
      AnonymousChatService.instance = new AnonymousChatService();
    }
    return AnonymousChatService.instance;
  }

  /**
   * Create a chat room for a whispr (first user)
   */
  async createChatRoom(whisprId: string, userId: string): Promise<ChatRoom> {
    try {
      console.log('💬 Creating chat room for whispr:', whisprId, 'user:', userId);

      // Check if any chat room exists for this whispr (active or inactive)
      const { data: existingRoom, error: checkError } = await supabase
        .from('whispr_chat_rooms')
        .select('*')
        .eq('whispr_id', whisprId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing room:', checkError);
        throw new Error(`Failed to check existing room: ${checkError.message}`);
      }

      if (existingRoom) {
        console.log('⚠️ Chat room already exists:', existingRoom.id, 'is_active:', existingRoom.is_active);
        
        if (existingRoom.is_active) {
          throw new Error('Active chat room already exists for this whispr');
        } else {
          // Reactivate the existing inactive room
          console.log('🔄 Reactivating existing chat room:', existingRoom.id);
          const { data: reactivatedRoom, error: reactivateError } = await supabase
            .from('whispr_chat_rooms')
            .update({
              is_active: true,
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Reset expiry to 1 hour
            })
            .eq('id', existingRoom.id)
            .select('*')
            .single();

          if (reactivateError) {
            console.error('❌ Error reactivating chat room:', reactivateError);
            throw new Error(`Failed to reactivate chat room: ${reactivateError.message}`);
          }

          // Add creator as first participant
          await this.joinChatRoom(reactivatedRoom.id, userId);

          console.log('✅ Chat room reactivated successfully:', reactivatedRoom.id);
          return reactivatedRoom;
        }
      }

      // Create new chat room
      const { data: chatRoom, error: roomError } = await supabase
        .from('whispr_chat_rooms')
        .insert({
          whispr_id: whisprId,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          is_active: true
        })
        .select('*')
        .single();

      if (roomError) {
        console.error('❌ Error creating chat room:', roomError);
        throw new Error(`Failed to create chat room: ${roomError.message}`);
      }

      // Add creator as first participant
      await this.joinChatRoom(chatRoom.id, userId);

      console.log('✅ Chat room created successfully:', chatRoom.id);
      return chatRoom;
    } catch (error) {
      console.error('❌ Error creating chat room:', error);
      throw error;
    }
  }

  /**
   * Join an existing chat room (max 2 participants)
   */
  async joinChatRoom(chatRoomId: string, userId: string): Promise<ChatParticipant> {
    try {
      // Check current participant count
      const { data: currentParticipants, error: countError } = await supabase
        .from('whispr_chat_participants')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .eq('is_active', true);

      if (countError) {
        throw new Error(`Failed to check participant count: ${countError.message}`);
      }

      // Check if user is already in the room
      const existingParticipant = currentParticipants?.find(p => p.user_id === userId);
      
      if (existingParticipant) {
        // Update last seen and reactivate
        const { data: updatedParticipant, error } = await supabase
          .from('whispr_chat_participants')
          .update({
            last_seen_at: new Date().toISOString(),
            is_active: true
          })
          .eq('id', existingParticipant.id)
          .select('*')
          .single();

        if (error) throw error;
        return updatedParticipant;
      }

      // Check if room is at capacity (2 people max)
      if (currentParticipants && currentParticipants.length >= 2) {
        throw new Error('Chat room is full. Only 2 people can join a chat room.');
      }

      // Generate anonymous name
      const anonymousName = this.generateAnonymousName();

      // Add new participant
      const { data: participant, error } = await supabase
        .from('whispr_chat_participants')
        .insert({
          chat_room_id: chatRoomId,
          user_id: userId,
          anonymous_name: anonymousName,
          is_active: true
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to join chat room: ${error.message}`);
      }

      return participant;
    } catch (error) {
      console.error('Error joining chat room:', error);
      throw error;
    }
  }

  /**
   * Send a message to chat room
   */
  async sendMessage(chatRoomId: string, userId: string, messageText: string): Promise<ChatMessage> {
    try {
      console.log('💬 Sending message to chat room:', chatRoomId);

      // Validate message
      if (!messageText || messageText.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      if (messageText.length > 500) {
        throw new Error('Message cannot exceed 500 characters');
      }

      const trimmedText = messageText.trim();
      const characterCount = trimmedText.length;

      // Send message
      const { data: message, error } = await supabase
        .from('whispr_chat_messages')
        .insert({
          chat_room_id: chatRoomId,
          sender_user_id: userId,
          message_text: trimmedText,
          character_count: characterCount
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to send message: ${error.message}`);
      }

      console.log('✅ Message sent successfully');
      return message;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get chat room for a whispr (only active, non-closed rooms)
   */
  async getChatRoom(whisprId: string): Promise<ChatRoom | null> {
    try {
      const { data, error } = await supabase
        .from('whispr_chat_rooms')
        .select('*')
        .eq('whispr_id', whisprId)
        .eq('is_active', true) // Only active rooms
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error getting chat room:', error);
      return null;
    }
  }

  /**
   * Check if two users have already chatted in a closed room for this whispr
   */
  async haveUsersChattedBefore(whisprId: string, userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('whispr_chat_rooms')
        .select(`
          id,
          whispr_chat_participants!inner(user_id)
        `)
        .eq('whispr_id', whisprId)
        .eq('is_active', false) // Only closed rooms
        .eq('whispr_chat_participants.user_id', userId1);

      if (error) {
        console.error('❌ Error checking previous chats:', error);
        return false;
      }

      // Check if userId2 was also in any of these closed rooms
      for (const room of data || []) {
        const { data: participants } = await supabase
          .from('whispr_chat_participants')
          .select('user_id')
          .eq('chat_room_id', room.id);

        const participantIds = participants?.map(p => p.user_id) || [];
        if (participantIds.includes(userId2)) {
          return true; // These users have chatted before
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking previous chats:', error);
      return false;
    }
  }

  /**
   * Close a chat room (mark as closed)
   */
  async closeChatRoom(chatRoomId: string, closedByUserId: string): Promise<void> {
    try {
      console.log('🔒 Closing chat room:', chatRoomId);

      const { error } = await supabase
        .from('whispr_chat_rooms')
        .update({
          is_active: false
        })
        .eq('id', chatRoomId);

      if (error) {
        throw new Error(`Failed to close chat room: ${error.message}`);
      }

      // Also deactivate all participants
      await supabase
        .from('whispr_chat_participants')
        .update({ is_active: false })
        .eq('chat_room_id', chatRoomId);

      console.log('✅ Chat room closed successfully');
    } catch (error) {
      console.error('❌ Error closing chat room:', error);
      throw error;
    }
  }

  /**
   * Get chat participants
   */
  async getChatParticipants(chatRoomId: string): Promise<ChatParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('whispr_chat_participants')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting participants:', error);
      return [];
    }
  }

  /**
   * Get chat messages
   */
  async getChatMessages(chatRoomId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('whispr_chat_messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting messages:', error);
      return [];
    }
  }

  /**
   * Check if two users are already buddies
   * This checks the actual buddies table, not buddy_requests
   */
  async areUsersBuddies(userId1: string, userId2: string): Promise<boolean> {
    try {
      console.log(`🔍 Checking if users are buddies: ${userId1} <-> ${userId2}`);
      
      // Check the actual buddies table for existing relationship
      // Use limit(1) instead of maybeSingle() to handle duplicate relationships gracefully
      const { data: buddyRelationships, error } = await supabase
        .from('buddies')
        .select('id')
        .or(`and(user_id.eq.${userId1},buddy_user_id.eq.${userId2}),and(user_id.eq.${userId2},buddy_user_id.eq.${userId1})`)
        .limit(1); // Limit to 1 row to avoid PGRST116 error

      if (error) {
        console.error('❌ Error checking buddy relationship:', error);
        return false;
      }

      const areBuddies = buddyRelationships && buddyRelationships.length > 0;
      console.log(`✅ Buddy relationship check result: ${areBuddies}`);
      
      // If we found relationships, log if there are duplicates
      if (areBuddies && buddyRelationships.length > 1) {
        console.log(`⚠️ Found ${buddyRelationships.length} buddy relationships between users (duplicates detected)`);
      }
      
      return areBuddies;
    } catch (error) {
      console.error('❌ Error checking buddy status:', error);
      return false;
    }
  }

  /**
   * Check if there's a pending buddy request between two users
   */
  async hasPendingBuddyRequest(userId1: string, userId2: string): Promise<boolean> {
    try {
      const { data: buddyRequests, error } = await supabase
        .from('buddy_requests')
        .select('status')
        .or(`and(requester_id.eq.${userId1},receiver_id.eq.${userId2}),and(requester_id.eq.${userId2},receiver_id.eq.${userId1})`)
        .eq('status', 'pending')
        .limit(1); // Limit to 1 row to avoid PGRST116 error

      if (error) {
        console.error('Error checking pending buddy request:', error);
        return false;
      }

      const hasPending = buddyRequests && buddyRequests.length > 0;
      
      // If we found requests, log if there are duplicates
      if (hasPending && buddyRequests.length > 1) {
        console.log(`⚠️ Found ${buddyRequests.length} pending buddy requests between users (duplicates detected)`);
      }
      
      return hasPending;
    } catch (error) {
      console.error('Error checking pending buddy request:', error);
      return false;
    }
  }

  /**
   * Send buddy request
   */
  async sendBuddyRequest(requesterId: string, receiverId: string, chatRoomId: string, whisprId: string, message?: string): Promise<BuddyRequest> {
    try {
      console.log('👥 Sending buddy request');
      console.log('sendBuddyRequest parameters:');
      console.log('- requesterId:', requesterId);
      console.log('- receiverId:', receiverId);
      console.log('- chatRoomId:', chatRoomId);
      console.log('- whisprId:', whisprId);
      console.log('- message:', message);

      // First check if a buddy request already exists between these users
      const { data: existingRequest, error: checkError } = await supabase
        .from('buddy_requests')
        .select('*')
        .eq('requester_id', requesterId)
        .eq('receiver_id', receiverId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Failed to check existing buddy request: ${checkError.message}`);
      }

      if (existingRequest) {
        // Check the status of the existing request
        if (existingRequest.status === 'pending') {
          throw new Error('A buddy request is already pending between you and this user.');
        } else if (existingRequest.status === 'accepted') {
          throw new Error('You are already buddies with this user.');
        } else if (existingRequest.status === 'rejected') {
          // Allow creating a new request if the previous one was rejected
          console.log('Previous request was rejected, creating new request...');
        }
      }

      const { data: request, error } = await supabase
        .from('buddy_requests')
        .insert({
          requester_id: requesterId,
          receiver_id: receiverId,
          chat_room_id: chatRoomId,
          whispr_id: whisprId,
          request_message: message,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to send buddy request: ${error.message}`);
      }

      // Send notification to the receiver via real-time subscription
      // The real-time subscription will handle notifying the receiver
      console.log('✅ Buddy request created successfully - real-time notification will be sent to receiver');
      
      console.log('✅ Buddy request sent successfully');
      return request;
    } catch (error) {
      console.error('❌ Error sending buddy request:', error);
      throw error;
    }
  }

  /**
   * Create buddy relationship between two users using the improved database function
   */
  async createBuddyRelationship(userId1: string, userId2: string): Promise<void> {
    try {
      console.log('👥 Creating buddy relationship between:', userId1, 'and', userId2);

      // Get user information for both users
      const { data: user1, error: error1 } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId1)
        .single();

      const { data: user2, error: error2 } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId2)
        .single();

      if (error1 || error2) {
        throw new Error('Failed to get user information for buddy creation');
      }

      // Generate initials for both users
      const getInitials = (name: string) => {
        return name
          .split(' ')
          .map(word => word.charAt(0))
          .join('')
          .toUpperCase()
          .slice(0, 2);
      };

      const user1Initials = getInitials(user1.display_name || 'User');
      const user2Initials = getInitials(user2.display_name || 'User');

      // Use the improved database function for safe buddy creation
      const { data, error } = await supabase.rpc('create_buddy_relationship_safe', {
        p_user_id_1: userId1,
        p_user_id_2: userId2,
        p_user_1_name: user1.display_name || 'Anonymous User',
        p_user_2_name: user2.display_name || 'Anonymous User',
        p_user_1_initials: user1Initials,
        p_user_2_initials: user2Initials,
        p_user_1_avatar_url: user1.avatar_url,
        p_user_2_avatar_url: user2.avatar_url
      });

      if (error) {
        console.error('Error creating buddy relationship:', error);
        throw new Error(`Failed to create buddy relationship: ${error.message}`);
      }

      console.log('✅ Buddy relationships created successfully:', data);
      
      // ENHANCED: Dispatch real-time events immediately after buddy creation
      try {
        const { DeviceEventEmitter } = require('react-native');
        
        // Dispatch buddy-created events for both users
        const buddyCreatedEvent1 = {
          type: 'buddy-created',
          buddyId: data.buddy_id_1,
          userId: userId1,
          buddyUserId: userId2,
          source: 'anonymousChatService',
          timestamp: new Date().toISOString()
        };
        
        const buddyCreatedEvent2 = {
          type: 'buddy-created',
          buddyId: data.buddy_id_2,
          userId: userId2,
          buddyUserId: userId1,
          source: 'anonymousChatService',
          timestamp: new Date().toISOString()
        };
        
        // Notify both users immediately
        DeviceEventEmitter.emit('buddy-created', buddyCreatedEvent1);
        DeviceEventEmitter.emit('buddy-created', buddyCreatedEvent2);
        
        // Also dispatch buddies-updated events for immediate UI refresh
        DeviceEventEmitter.emit('buddies-updated', {
          type: 'buddies-updated',
          userId: userId1,
          buddyUserId: userId2,
          source: 'anonymousChatService',
          timestamp: new Date().toISOString()
        });
        
        DeviceEventEmitter.emit('buddies-updated', {
          type: 'buddies-updated',
          userId: userId2,
          buddyUserId: userId1,
          source: 'anonymousChatService',
          timestamp: new Date().toISOString()
        });
        
        console.log('📢 Dispatched real-time events for both users after buddy creation');
      } catch (eventError) {
        console.log('⚠️ Could not dispatch real-time events (not in React Native context):', eventError);
      }
    } catch (error) {
      console.error('❌ Error creating buddy relationship:', error);
      throw error;
    }
  }

  /**
   * Respond to buddy request
   */
  async respondToBuddyRequest(requestId: string, status: 'accepted' | 'declined'): Promise<void> {
    try {
      console.log('👥 Responding to buddy request:', status);

      // First get the buddy request details
      const { data: request, error: fetchError } = await supabase
        .from('buddy_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch buddy request: ${fetchError.message}`);
      }

      // Update the buddy request status
      const { error } = await supabase
        .from('buddy_requests')
        .update({
          status,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        throw new Error(`Failed to respond to buddy request: ${error.message}`);
      }

      // If accepted, create the buddy relationship
      if (status === 'accepted') {
        console.log('✅ Creating buddy relationship for accepted request');
        await this.createBuddyRelationship(request.requester_id, request.receiver_id);
      }

      console.log('✅ Buddy request responded successfully');
    } catch (error) {
      console.error('❌ Error responding to buddy request:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for a chat room
   */
  subscribeToChatRoom(
    chatRoomId: string,
    userId: string,
    onNewMessage: (message: ChatMessage) => void,
    onNewParticipant: (participant: ChatParticipant) => void,
    onNewBuddyRequest: (request: BuddyRequest) => void
  ): void {
    try {
      console.log('🔄  Setting up real-time chat subscription for room:', chatRoomId);
      console.log('🔄  User ID:', userId);
      
      // Store callbacks
      this.onNewMessage = onNewMessage;
      this.onNewParticipant = onNewParticipant;
      this.onNewBuddyRequest = onNewBuddyRequest;

      // Unsubscribe from previous subscription
      if (this.realtimeSubscription) {
        console.log('🔄  Unsubscribing from previous subscription');
        this.realtimeSubscription.unsubscribe();
      }

      // Subscribe to chat messages
      console.log('🔄  Creating new real-time subscription...');
      this.realtimeSubscription = supabase
        .channel(`chat-room-${chatRoomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whispr_chat_messages',
            filter: `chat_room_id=eq.${chatRoomId}`
          },
          (payload) => {
            console.log('💬  New chat message received:', payload.new);
            if (this.onNewMessage) {
              this.onNewMessage(payload.new as ChatMessage);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whispr_chat_participants',
            filter: `chat_room_id=eq.${chatRoomId}`
          },
          (payload) => {
            console.log('👥  New chat participant received via real-time:', payload.new);
            console.log('👥  - Participant ID:', payload.new.id);
            console.log('👥  - Participant name:', payload.new.anonymous_name);
            console.log('👥  - Participant user ID:', payload.new.user_id);
            if (this.onNewParticipant) {
              this.onNewParticipant(payload.new as ChatParticipant);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_requests',
            filter: `receiver_id=eq.${userId}`
          },
          (payload) => {
            console.log('👥 New buddy request received:', payload.new);
            if (this.onNewBuddyRequest) {
              this.onNewBuddyRequest(payload.new as BuddyRequest);
            }
          }
        )
        .subscribe((status) => {
          console.log('💬 Chat subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Chat room real-time subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Chat room subscription error');
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Chat room subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('🔌 Chat room subscription closed');
          }
        });

    } catch (error) {
      console.error('❌ Error setting up chat subscription:', error);
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromChatRoom(): void {
    try {
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
        this.realtimeSubscription = null;
        console.log('✅ Unsubscribed from chat room real-time updates');
      }
      
      // Clear callbacks
      this.onNewMessage = null;
      this.onNewParticipant = null;
      this.onNewBuddyRequest = null;
    } catch (error) {
      console.error('❌ Error unsubscribing from chat:', error);
    }
  }

  /**
   * Get buddy requests for a user
   */
  async getBuddyRequests(userId: string): Promise<BuddyRequest[]> {
    try {
      const { data, error } = await supabase
        .from('buddy_requests')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error getting buddy requests:', error);
      return [];
    }
  }

  /**
   * Generate anonymous name with simple icons
   */
  private generateAnonymousName(): string {
    const icons = ['👤', '👥', '🌟', '✨', '💫', '⭐', '🔮', '🎭', '🎪', '🎨', '🎯', '🎲', '🎸', '🎺', '🎻', '🎹'];
    const icon = icons[Math.floor(Math.random() * icons.length)];
    
    // Use simple numbering to differentiate users
    const number = Math.floor(Math.random() * 99) + 1;
    
    return `${icon}${number}`;
  }

  /**
   * Clean up stale buddy requests (for testing purposes)
   */
  async cleanupStaleBuddyRequests(): Promise<void> {
    try {
      console.log('🧹  Cleaning up stale buddy requests...');
      
      // Delete buddy requests older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('buddy_requests')
        .delete()
        .lt('created_at', oneHourAgo);
      
      if (error) {
        console.error('❌ Error cleaning up stale buddy requests:', error);
      } else {
        console.log('✅ Stale buddy requests cleaned up successfully');
      }
    } catch (error) {
      console.error('❌ Error cleaning up stale buddy requests:', error);
    }
  }

  /**
   * Get all buddy requests for debugging
   */
  async getAllBuddyRequests(): Promise<BuddyRequest[]> {
    try {
      const { data, error } = await supabase
        .from('buddy_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error getting all buddy requests:', error);
        return [];
      }
      
      console.log('All buddy requests:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Error getting all buddy requests:', error);
      return [];
    }
  }
}

export default AnonymousChatService.getInstance();
