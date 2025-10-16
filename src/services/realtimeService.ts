import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { supabase } from '@/config/supabase';
import { QueryCache } from './enhancedQueryCache'; // Add this import

interface RealtimeSubscription {
  channel: any;
  unsubscribe: () => void;
  type: 'messages' | 'notes' | 'notifications';
}

class RealtimeService {
  private subscriptions: RealtimeSubscription[] = [];
  private userId: string | null = null;
  private isConnected = false;
  private connectionRetryCount = 0;
  private maxRetries = 3; // Reduced from 5 to prevent excessive retries
  private retryDelay = 2000; // Increased to 2 seconds
  private maxRetryDelay = 30000; // Max 30 seconds
  private circuitBreakerOpen = false;
  private circuitBreakerTimeout = 300000; // 5 minutes before trying again
  private lastCircuitBreakerReset = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<boolean> | null = null; // Prevent multiple simultaneous initializations

  async initialize(userId: string): Promise<boolean> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      console.log('🔄 Realtime initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    // If already connected for the same user, return true
    if (this.isConnected && this.userId === userId) {
      console.log('✅ Realtime service already connected for user:', userId);
      return true;
    }

    this.userId = userId;
    
    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now - this.lastCircuitBreakerReset < this.circuitBreakerTimeout) {
        console.log('🔒 Circuit breaker open - skipping realtime initialization');
        return false;
      } else {
        console.log('🔄 Circuit breaker timeout expired - resetting');
        this.circuitBreakerOpen = false;
        this.connectionRetryCount = 0;
      }
    }

    this.initializationPromise = this.performInitialization(userId);
    const result = await this.initializationPromise;
    this.initializationPromise = null;
    return result;
  }

  private async performInitialization(userId: string): Promise<boolean> {
    try {
      console.log('🚀 Initializing realtime service for user:', userId);
      
      // Test connection before proceeding
      await this.testConnection();
      
      // Clear existing subscriptions
      this.cleanup();
      
      // Set up new subscriptions
      await this.setupSubscriptions(userId);
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      this.circuitBreakerOpen = false;
      
      console.log('✅ Realtime service initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize realtime service:', error);
      this.handleConnectionError();
      return false;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      console.log('🧪 Testing WebSocket connection before enabling realtime...');
      
      // Skip WebSocket test to avoid timeout issues
      console.log('⏭️ Skipping WebSocket test to avoid timeout issues');
      console.log('✅ WebSocket connection test skipped');
      
      // Test Supabase connection
      const { data, error } = await supabase.from('buddies').select('id').limit(1);
      if (error) {
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }
      
      console.log('✅ Supabase connection test passed');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  private async setupSubscriptions(userId: string): Promise<void> {
    try {
      console.log('📡 Setting up realtime subscriptions for user:', userId);
      
      // Subscribe to buddy messages
      const messagesChannel = supabase
        .channel('buddy_messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'buddy_messages' 
          }, 
          (payload) => {
            console.log('📨 New message received via realtime:', payload);
            console.log('📨 Payload details:', {
              hasNew: !!payload.new,
              senderId: payload.new?.sender_id,
              buddyId: payload.new?.buddy_id,
              content: payload.new?.content,
              userId: this.userId
            });
            this.handleNewMessage(payload);
          }
        )
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'buddy_messages' 
          }, 
          (payload) => {
            console.log('📝 Message updated via realtime:', payload);
            this.handleMessageUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('📡 Buddy messages subscription status:', status);
        });

      this.subscriptions.push({
        channel: messagesChannel,
        unsubscribe: () => messagesChannel.unsubscribe(),
        type: 'messages'
      });

      // Subscribe to whispr notes
      const notesChannel = supabase
        .channel('whispr_notes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'whispr_notes' 
          }, 
          (payload) => {
            console.log('📝 New note received via realtime:', payload);
            this.handleNewNote(payload);
          }
        )
        .subscribe((status) => {
          console.log('📡 Whispr notes subscription status:', status);
        });

      this.subscriptions.push({
        channel: notesChannel,
        unsubscribe: () => notesChannel.unsubscribe(),
        type: 'notes'
      });

      // Subscribe to database trigger notifications via PostgreSQL changes
      // Note: We can't filter by buddy relationship in the subscription, so we'll filter in the handler
      const notificationChannel = supabase
        .channel(`message_notifications_${userId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT',
            schema: 'public',
            table: 'buddy_messages'
          }, 
          (payload) => {
            console.log('Database trigger notification received via postgres_changes:', JSON.stringify(payload, null, 2));
            this.handleDatabaseNotification(payload);
          }
        )
        .subscribe((status) => {
          console.log('Database notification subscription status:', status);
        });

      this.subscriptions.push({
        channel: notificationChannel,
        unsubscribe: () => notificationChannel.unsubscribe(),
        type: 'notifications'
      });

      console.log('✅ Realtime subscriptions set up successfully');
      
    } catch (error) {
      console.error('❌ Failed to set up subscriptions:', error);
      throw error;
    }
  }

  private async handleNewMessage(payload: any): Promise<void> {
    try {
      console.log('handleNewMessage called with payload:', JSON.stringify(payload, null, 2));
      
      if (!payload || !payload.new) {
        console.warn('Invalid payload structure:', payload);
        return;
      }
      
      // Log message details
      console.log('Message details:', {
        messageId: payload.new.id,
        buddyId: payload.new.buddy_id,
        senderId: payload.new.sender_id,
        content: payload.new.content?.substring(0, 50),
        messageType: payload.new.message_type,
        isRead: payload.new.is_read,
        createdAt: payload.new.created_at,
        currentUserId: this.userId
      });
      
      // Check if this message was sent by the current user (prevent self-notifications)
      if (payload.new.sender_id === this.userId) {
        console.log('Message sent by current user, ignoring self-notification:', payload.new.sender_id);
        // Still invalidate cache for UI consistency
        console.log('Invalidating cache for self-message UI consistency');
        QueryCache.safeInvalidateMessages(payload.new.buddy_id, this.userId || '');
        QueryCache.invalidateBuddies(this.userId || '');
        this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated');
        console.log('Self-message cache invalidation completed');
        return;
      }
      
      // Check if this message is for the current user by verifying buddy relationship
      console.log('Checking if message is for current user...');
      const isForCurrentUser = await this.isMessageForCurrentUser(payload.new.buddy_id);
      console.log('Message for current user check result:', isForCurrentUser);
      
      if (!isForCurrentUser) {
        console.log('Message not for current user, ignoring:', payload.new.buddy_id);
        return;
      }
      
      // CRITICAL FIX: Only handle cache invalidation and UI updates
      // NOTIFICATIONS ARE NOW HANDLED BY DATABASE TRIGGERS ONLY
      console.log('Processing message for current user - cache invalidation only');
      console.log('Safely invalidating message cache for buddy:', payload.new.buddy_id);
      QueryCache.safeInvalidateMessages(payload.new.buddy_id, this.userId || '');
      
      console.log('Invalidating buddies cache for user:', this.userId);
      QueryCache.invalidateBuddies(this.userId || '');
      
      // Dispatch UI refresh event
      console.log('Dispatching UI update event');
      this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated');
      
      console.log('Message processing completed - cache invalidated and UI refresh triggered (no client-side notification)');
      
    } catch (error) {
      console.error(' Error processing message notification:', error);
      console.error(' Error stack:', (error as Error).stack);
    }
  }

  private async handleMessageUpdate(payload: any): Promise<void> {
    try {
      console.log('📝 handleMessageUpdate called with payload:', payload);
      
      if (!payload || !payload.new) {
        console.warn('📝 Invalid payload structure:', payload);
        return;
      }
      
      // Invalidate message cache for this buddy
      console.log('🔄 Invalidating message cache for updated message:', payload.new.buddy_id);
      QueryCache.invalidateMessages(payload.new.buddy_id, this.userId || '');
      
      // Dispatch custom event to trigger UI refresh
      console.log('🔄 Dispatching message-updated event for UI refresh');
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new CustomEvent('message-updated', {
          detail: { 
            type: 'message-updated',
            buddyId: payload.new.buddy_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            userId: this.userId,
            source: 'realtime'
          }
        });
        window.dispatchEvent(event);
      }
      
      console.log('✅ Message update processed and cache invalidated');
      
    } catch (error) {
      console.error('❌ Error processing message update:', error);
    }
  }

  private async handleNewNote(payload: any): Promise<void> {
    try {
      // Dispatch event to notify UI components
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new CustomEvent('notes-updated', {
          detail: { 
            type: 'notes-updated',
            newNotesCount: 1,
            userId: this.userId,
            source: 'realtime'
          }
        });
        window.dispatchEvent(event);
      }
      
      // Invalidate notes cache
      QueryCache.invalidateWhisprNotes(this.userId || '');
      
      console.log('✅ Note update processed and cache invalidated');
      
    } catch (error) {
      console.error('❌ Error processing note notification:', error);
    }
  }

  private async isMessageForCurrentUser(buddyId: string): Promise<boolean> {
    try {
      // Check if the current user is either the user_id or buddy_user_id in this relationship
      const { data, error } = await supabase
        .from('buddies')
        .select('id')
        .eq('id', buddyId)
        .or(`user_id.eq.${this.userId},buddy_user_id.eq.${this.userId}`)
        .single();

      if (error) {
        console.error('Error checking buddy relationship:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking buddy relationship:', error);
      return false;
    }
  }

  private async getBuddyInfo(senderId: string): Promise<{ name: string }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', senderId)
        .single();

      if (error) {
        console.error('Error getting buddy info:', error);
        return { name: 'Unknown' };
      }

      return { name: data.name || 'Unknown' };
    } catch (error) {
      console.error('Error getting buddy info:', error);
      return { name: 'Unknown' };
    }
  }

  private dispatchUIUpdateEvent(buddyId: string, eventType: string): void {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(eventType, {
        detail: { 
          type: eventType,
          buddyId: buddyId,
          userId: this.userId,
          source: 'realtime'
        }
      });
      window.dispatchEvent(event);
      console.log(`📢 Dispatched ${eventType} event for buddy ${buddyId}`);
    }
  }

  private async handleDatabaseNotification(payload: any): Promise<void> {
    try {
      console.log('Processing database notification:', JSON.stringify(payload, null, 2));
      
      // Handle PostgreSQL changes payload format
      if (!payload || !payload.new) {
        console.warn(' Invalid notification payload:', payload);
        return;
      }

      // Extract notification data from the message record
      const message = payload.new;
      
      // Log notification details
      console.log('Database notification details:', {
        messageId: message.id,
        buddyId: message.buddy_id,
        senderId: message.sender_id,
        content: message.content?.substring(0, 50),
        messageType: message.message_type,
        isRead: message.is_read,
        createdAt: message.created_at,
        currentUserId: this.userId
      });
      
      // Check if this notification is for current user
      if (message.sender_id === this.userId) {
        console.log('Self-notification ignored - sender matches current user');
        return;
      }
      
      // Check if this message is for the current user by verifying buddy relationship
      console.log('Checking if message is for current user...');
      const isForCurrentUser = await this.isMessageForCurrentUser(message.buddy_id);
      console.log('Message for current user check result:', isForCurrentUser);
      
      if (!isForCurrentUser) {
        console.log('Message not for current user, ignoring:', message.buddy_id);
        return;
      }
      
      console.log('Processing new message notification from database trigger');
      
      // Invalidate cache and refresh UI (using safe operations)
      console.log('Safely invalidating message cache for buddy:', message.buddy_id);
      QueryCache.safeInvalidateMessages(message.buddy_id, this.userId || '');
      
      console.log('Invalidating buddies cache for user:', this.userId);
      QueryCache.invalidateBuddies(this.userId || '');
      
      // Dispatch UI refresh events
      console.log('Dispatching UI refresh events');
      this.dispatchUIUpdateEvent(message.buddy_id, 'messages-updated');
      this.dispatchUIUpdateEvent(message.buddy_id, 'buddies-updated');
      
      // Show notification (only from database trigger)
      console.log('Showing notification from database trigger');
      await notificationService.showMessageNotification(
        'New Message',
        message.content ? message.content.substring(0, 100) : 'New message',
        'Buddy' // We'll get the actual name from the database trigger
      );
      
      console.log('Database notification processed successfully');
      
    } catch (error) {
      console.error(' Error processing database notification:', error);
      console.error(' Error stack:', (error as Error).stack);
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        // Simple health check
        const { data, error } = await supabase.from('buddies').select('id').limit(1);
        if (error) {
          throw new Error(`Health check failed: ${error.message}`);
        }
        
        console.log('💚 Realtime health check passed');
      } catch (error) {
        console.error('💔 Realtime health check failed:', error);
        this.handleConnectionError();
      }
    }, 30000); // Check every 30 seconds
  }

  private handleConnectionError(): void {
    console.error('❌ Realtime connection error occurred');
    this.connectionRetryCount++;
    
    if (this.connectionRetryCount >= this.maxRetries) {
      console.error('🔒 Max retries reached, opening circuit breaker');
      this.circuitBreakerOpen = true;
      this.lastCircuitBreakerReset = Date.now();
    }
    
    this.isConnected = false;
    this.cleanup();
  }

  private cleanup(): void {
    console.log('🧹 Cleaning up realtime subscriptions');
    
    this.subscriptions.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from channel:', error);
      }
    });
    
    this.subscriptions = [];
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting realtime service');
    this.cleanup();
    this.isConnected = false;
    this.userId = null;
  }

  isConnectedToRealtime(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): { connected: boolean; userId: string | null; retryCount: number } {
    return {
      connected: this.isConnected,
      userId: this.userId,
      retryCount: this.connectionRetryCount
    };
  }
}

export const realtimeService = new RealtimeService();