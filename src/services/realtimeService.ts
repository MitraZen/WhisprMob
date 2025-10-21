import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { supabase } from '@/config/supabase';
import { QueryCache } from './enhancedQueryCache'; // Add this import
import { CachedBuddiesService } from './cachedBuddiesService';
import { activeChatService } from './activeChatService';
import { fcmService } from './fcmService';
import { connectionRecoveryService, ConnectionState } from './connectionRecoveryService';

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
  private recentNotificationSenders?: Set<string>;
  private userProfileCache = new Map<string, { name: string; timestamp: number }>();
  private lastCircuitBreakerReset = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<boolean> | null = null; // Prevent multiple simultaneous initializations
  private recentNotifications: Set<string> = new Set(); // Track recent notifications to prevent duplicates
  private connectionStateUnsubscribe: (() => void) | null = null;
  private isConnectionRecoveryEnabled = true;

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
    
    // Initialize connection recovery service if not already done
    if (this.isConnectionRecoveryEnabled) {
      await connectionRecoveryService.initialize();
      this.setupConnectionRecovery();
    }
    
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

  /**
   * Setup connection recovery integration
   */
  private setupConnectionRecovery(): void {
    if (!this.isConnectionRecoveryEnabled) {
      return;
    }

    console.log('🔄 Setting up connection recovery integration');

    // Register for connection state changes
    this.connectionStateUnsubscribe = connectionRecoveryService.onConnectionStateChange((state: ConnectionState) => {
      this.handleConnectionStateChange(state);
    });

    // Register reconnection callback
    connectionRecoveryService.onReconnectionAttempt(async () => {
      return await this.attemptReconnection();
    });
  }

  /**
   * Handle connection state changes from recovery service
   */
  private handleConnectionStateChange(state: ConnectionState): void {
    console.log('📡 Connection state changed:', {
      isConnected: state.isConnected,
      isRealtimeConnected: state.isRealtimeConnected,
      connectionQuality: state.connectionQuality,
      retryCount: state.retryCount,
    });

    // Update our internal state
    if (!state.isConnected && this.isConnected) {
      console.log('🔴 Network disconnected - marking realtime as disconnected');
      this.isConnected = false;
    } else if (state.isConnected && !this.isConnected && state.isRealtimeConnected) {
      console.log('🟢 Network reconnected and realtime restored');
      this.isConnected = true;
    }
  }

  /**
   * Attempt reconnection (called by connection recovery service)
   */
  private async attemptReconnection(): Promise<boolean> {
    if (!this.userId) {
      console.log('❌ Cannot reconnect - no userId');
      return false;
    }

    try {
      console.log('🔄 Attempting realtime reconnection');
      
      // Clean up existing subscriptions
      this.cleanup();
      
      // Test connection
      await this.testConnection();
      
      // Set up new subscriptions
      await this.setupSubscriptions(this.userId);
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      this.circuitBreakerOpen = false;
      
      console.log('✅ Realtime reconnection successful');
      return true;
      
    } catch (error) {
      console.error('❌ Realtime reconnection failed:', error);
      this.isConnected = false;
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
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Buddy messages subscription error - switching to polling');
            this.handleConnectionError(userId);
          }
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
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Whispr notes subscription error');
            this.handleConnectionError(userId);
          }
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
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Database notification subscription error');
            this.handleConnectionError(userId);
          }
        });

      // Subscribe to buddy deletion notifications
      const handleBuddyDeletion = this.handleBuddyDeletion.bind(this);
      console.log('🔧 Setting up buddy deletion handler:', typeof handleBuddyDeletion);
      const buddyDeletionChannel = supabase
        .channel(`buddy_deletions_${userId}`)
        .on('postgres_changes', 
          { 
            event: 'DELETE',
            schema: 'public',
            table: 'buddies'
          }, 
          (payload) => {
            console.log('Buddy deletion notification received:', JSON.stringify(payload, null, 2));
            console.log('🔧 Handler type:', typeof handleBuddyDeletion);
            try {
              handleBuddyDeletion(payload);
            } catch (error) {
              console.error('❌ Error in buddy deletion handler:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('Buddy deletion subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Buddy deletion subscription error');
            this.handleConnectionError(userId);
          }
        });

      this.subscriptions.push({
        channel: notificationChannel,
        unsubscribe: () => notificationChannel.unsubscribe(),
        type: 'notifications'
      });

      this.subscriptions.push({
        channel: buddyDeletionChannel,
        unsubscribe: () => buddyDeletionChannel.unsubscribe(),
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

      // 🧩 Step 2: Skip duplicate events caused by database trigger
      if (payload.new?.origin === 'trigger' && payload.new?.sender_id === this.userId) {
        console.log('🛑 Duplicate trigger event detected — skipping cache invalidation.');
        return;
      }
      
      // For trigger-originated messages from other users, we still process them
      // but we'll handle notifications differently to avoid duplicates
      const isTriggerEvent = payload.origin === 'trigger';
      const isSelfMessage = payload.new?.sender_id === this.userId;
      
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
        console.log('Message sent by current user, applying real-time update for UI consistency:', payload.new.sender_id);
        
        // Apply real-time update for self-message UI consistency
        await CachedBuddiesService.applyRealtimeUpdate('message', payload.new, this.userId!);
        
        this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated', payload.new);
        console.log('Self-message real-time update completed');
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
      
      // CRITICAL FIX: Use CachedBuddiesService for intelligent cache updates
      console.log('Processing message for current user - applying real-time update');
      
      // Apply real-time update using the new centralized method
      CachedBuddiesService.applyRealtimeUpdate('message', payload.new, this.userId!);
      
      // Dispatch UI refresh event
      console.log('Dispatching UI update event');
      this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated', payload.new);
      
      // Show notification for messages from other users (not self-messages)
      // This handles both realtime INSERT events and database trigger events
      if (!isSelfMessage) {
        // Create a unique key for this notification to prevent duplicates
        const notificationKey = `${payload.new.id}-${payload.new.sender_id}`;
        
        if (!this.recentNotifications.has(notificationKey)) {
          // Check if the user is currently viewing this chat (handles reciprocal buddy relationships)
          const isChatActive = await activeChatService.isMessageForActiveChat(payload.new.buddy_id);
          
          if (isChatActive) {
            console.log('🔕 Skipping notification - user is actively viewing this chat');
          } else {
            console.log('🔔 Showing notification for message from other user');
            try {
              // OPTION 1 FIX: Force immediate cache update and UI refresh BEFORE notification
              console.log('⚡ Forcing immediate cache update and UI refresh');
              await CachedBuddiesService.applyRealtimeUpdate('message', payload.new, this.userId!);
              this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated', payload.new);
              
              // SIMPLE FIX: Get buddy name directly from the message sender
              let buddyDisplayName = 'Buddy';
              
              // Add rate limiting to prevent excessive database queries
              const notificationKey = `notification-${payload.new.sender_id}-${Date.now()}`;
              const recentNotificationKey = `recent-${payload.new.sender_id}`;
              
              // Check if we've already processed a notification for this sender recently
              if (this.recentNotificationSenders?.has(recentNotificationKey)) {
                console.log('🔔 Skipping notification - already processed for this sender recently');
                return;
              }
              
              // Mark this sender as recently processed
              if (!this.recentNotificationSenders) {
                this.recentNotificationSenders = new Set();
              }
              this.recentNotificationSenders.add(recentNotificationKey);
              
              // Clean up after 10 seconds
              setTimeout(() => {
                this.recentNotificationSenders?.delete(recentNotificationKey);
              }, 10000);
              
              // Get buddy name for notification
              
              // The sender is the buddy (not the current user)
              const buddyUserId = payload.new.sender_id;
              
              // Check cache first
              const cachedProfile = this.userProfileCache.get(buddyUserId);
              if (cachedProfile && (Date.now() - cachedProfile.timestamp) < 300000) { // 5 minutes cache
                buddyDisplayName = cachedProfile.name;
                console.log('✅ Using cached sender name:', buddyDisplayName);
              } else {
                try {
                  const { data: userProfile } = await supabase
                    .from('user_profiles')
                    .select('display_name, username')
                    .eq('id', buddyUserId)
                    .single();
                  
                  if (userProfile?.display_name) {
                    buddyDisplayName = userProfile.display_name;
                    console.log('✅ Using sender display_name:', buddyDisplayName);
                  } else if (userProfile?.username) {
                    buddyDisplayName = userProfile.username;
                    console.log('✅ Using sender username:', buddyDisplayName);
                  } else {
                    console.log('⚠️ No name found for sender, using default');
                  }
                  
                  // Cache the result
                  this.userProfileCache.set(buddyUserId, { name: buddyDisplayName, timestamp: Date.now() });
                } catch (error) {
                  console.log('⚠️ Error getting sender name:', error);
                }
              }
              
              console.log('🔔 Final buddy display name for notification:', buddyDisplayName);
              
              // Send local notification (for foreground)
              await notificationService.showMessageNotification(
                'New Message',
                payload.new.content ? payload.new.content.substring(0, 100) : 'New message',
                buddyDisplayName
              );
              
              // Send FCM notification (for background/closed app)
              try {
                const fcmResult = await fcmService.sendMessageNotification(
                  payload.new.sender_id,
                  this.userId!,
                  payload.new.content ? payload.new.content.substring(0, 100) : 'New message',
                  buddyDisplayName
                );
                if (fcmResult) {
                  console.log('🔥 FCM message notification sent');
                } else {
                  console.log('🔥 FCM notification skipped - user has no FCM token yet');
                }
              } catch (fcmError) {
                console.warn('🔥 FCM notification failed (using local only):', fcmError);
                // FCM is not available, local notifications will work fine
              }
            } catch (error) {
              console.error('❌ Error showing notification:', error);
            }
          }
        } else {
          console.log('🔕 Duplicate notification prevented:', notificationKey);
        }
      } else {
        console.log('🔕 Skipping notification for self-message');
      }
      
      console.log('Message processing completed - real-time update applied and UI refresh triggered');
      
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
      
      // Apply real-time update using the new centralized method
      console.log('🔄 Applying real-time buddy update for message change');
      await CachedBuddiesService.applyRealtimeUpdate('buddy', payload.new, this.userId!);
      
      // Dispatch custom event to trigger UI refresh
      console.log('🔄 Dispatching message-updated event for UI refresh');
      this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated', payload.new);
      
      console.log('✅ Message update processed with real-time update');
      
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
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

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

  private dispatchUIUpdateEvent(buddyId: string, eventType: string, messageData?: any): void {
    try {
      console.log(`📢 Dispatching UI event: ${eventType} for buddy: ${buddyId}`);
      
      // Use React Native's DeviceEventEmitter instead of window events
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit(eventType, { 
        type: eventType,
        buddyId: buddyId,
        userId: this.userId,
        source: 'realtime',
        message: messageData // Include message data for message-updated events
      });
      
      console.log(`✅ UI event dispatched successfully: ${eventType}`);
    } catch (error) {
      console.error(`❌ Error dispatching UI event ${eventType}:`, error);
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
      
      // Step 1: Tag trigger-originated messages and route to handleNewMessage for unified processing
      console.log('🔄 Tagging trigger-originated message and routing to handleNewMessage');
      const messageWithOrigin = { ...message, origin: 'trigger' };
      const triggerPayload = { ...payload, new: messageWithOrigin };
      
      // Route to handleNewMessage for unified deduplication logic
      await this.handleNewMessage(triggerPayload);
      
      console.log('Database notification processed successfully via unified handler');
      
    } catch (error) {
      console.error(' Error processing database notification:', error);
      console.error(' Error stack:', (error as Error).stack);
    }
  }

  private async handleBuddyDeletion(payload: any): Promise<void> {
    try {
      console.log('🗑️ Processing buddy deletion notification:', JSON.stringify(payload, null, 2));
      
      // Handle PostgreSQL changes payload format
      if (!payload || !payload.old) {
        console.warn('⚠️ Invalid buddy deletion payload:', payload);
        return;
      }

      // Extract buddy data from the deleted record
      const deletedBuddy = payload.old;
      
      // Log deletion details
      console.log('🗑️ Buddy deletion details:', {
        buddyId: deletedBuddy.id,
        userId: deletedBuddy.user_id || 'unknown',
        buddyUserId: deletedBuddy.buddy_user_id || 'unknown',
        buddyName: deletedBuddy.name || 'unknown',
        buddyInitials: deletedBuddy.initials || 'unknown',
        currentUserId: this.userId
      });
      
      // Check if this deletion affects the current user
      // Since we only have the buddy ID, we need to check if this user has any buddy relationships
      // For now, we'll invalidate cache for all buddies to be safe
      const affectsCurrentUser = true; // Assume it affects current user for safety
      
      if (!affectsCurrentUser) {
        console.log('🗑️ Buddy deletion does not affect current user, ignoring');
        return;
      }
      
      console.log('🗑️ Processing buddy deletion for current user');
      
      // Apply real-time update using the new centralized method
      console.log('🔄 Applying real-time delete update');
      await CachedBuddiesService.applyRealtimeUpdate('delete', payload.old, this.userId!);
      
      // Dispatch UI refresh events with buddy data
      console.log('📢 Dispatching buddy deletion events');
      this.dispatchUIUpdateEvent(deletedBuddy.id, 'buddy-deleted', deletedBuddy);
      this.dispatchUIUpdateEvent(deletedBuddy.id, 'buddies-updated', deletedBuddy);
      
      // Show notification about buddy deletion
      console.log('🔔 Showing buddy deletion notification');
      await notificationService.showMessageNotification(
        'Buddy Deleted',
        'A buddy has been removed from your contacts',
        'System'
      );
      
      console.log('✅ Buddy deletion notification processed successfully');
      
    } catch (error) {
      console.error('❌ Error processing buddy deletion notification:', error);
      console.error('❌ Error stack:', (error as Error).stack);
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

  private handleConnectionError(userId?: string): void {
    console.error('❌ Realtime connection error occurred');
    this.connectionRetryCount++;
    
    if (this.connectionRetryCount >= this.maxRetries) {
      console.error('🔒 Max retries reached, opening circuit breaker');
      this.circuitBreakerOpen = true;
      this.lastCircuitBreakerReset = Date.now();
    }
    
    this.isConnected = false;
    this.cleanup();
    
    // If connection recovery is enabled, let it handle the reconnection
    if (this.isConnectionRecoveryEnabled) {
      console.log('🔄 Connection recovery service will handle reconnection');
      return;
    }
    
    // Fallback to old behavior if connection recovery is disabled
    if (userId) {
      try {
        const { RealtimeErrorHandler } = require('./realtimeErrorHandler');
        RealtimeErrorHandler.handleConnectionError(userId);
      } catch (error) {
        console.error('❌ Failed to start polling fallback:', error);
      }
    }
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
    
    // Clean up connection recovery integration
    if (this.connectionStateUnsubscribe) {
      this.connectionStateUnsubscribe();
      this.connectionStateUnsubscribe = null;
    }
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

  /**
   * Enable or disable connection recovery
   */
  setConnectionRecoveryEnabled(enabled: boolean): void {
    this.isConnectionRecoveryEnabled = enabled;
    console.log(`🔄 Connection recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnection(): Promise<boolean> {
    if (!this.isConnectionRecoveryEnabled) {
      console.log('❌ Connection recovery is disabled');
      return false;
    }

    return await connectionRecoveryService.forceReconnection();
  }

  /**
   * Get connection recovery status
   */
  getConnectionRecoveryStatus(): any {
    if (!this.isConnectionRecoveryEnabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      connectionState: connectionRecoveryService.getConnectionState(),
      isHealthy: connectionRecoveryService.isConnectionHealthy(),
    };
  }
}

export { RealtimeService };
export const realtimeService = new RealtimeService();

// Expose activeChatService for debugging
if (__DEV__) {
  (global as any).activeChatService = activeChatService;
  (global as any).testActiveChat = () => activeChatService.testActiveChat();
}