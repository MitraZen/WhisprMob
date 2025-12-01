import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { supabase } from '@/config/supabase';
import { QueryCache } from './enhancedQueryCache'; // Add this import
import { CachedBuddiesService } from './cachedBuddiesService';
import { activeChatService } from './activeChatService';
import { fcmService } from './fcmService';
import { connectionRecoveryService, ConnectionState } from './connectionRecoveryService';
//import { diagnoseBackgroundNotifications, instrumentMessageHandler } from './backgroundDiagnostic';
import { phase3NotificationLogicService } from './phase3NotificationLogicService';


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
  private phase3Service = phase3NotificationLogicService;
  private maxRetries = 8; // Phase 2: Increased for better resilience
  private retryDelay = 500; // Phase 2: Faster initial retry
  private maxRetryDelay = 30000; // Max 30 seconds
  private circuitBreakerOpen = false;
  private circuitBreakerTimeout = 30000; // Phase 2: Shorter circuit breaker timeout
  private recentNotificationSenders?: Set<string>;
  private userProfileCache = new Map<string, { name: string; timestamp: number }>();
  private lastCircuitBreakerReset = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<boolean> | null = null; // Prevent multiple simultaneous initializations
  private recentNotifications: Set<string> = new Set(); // Track recent notifications to prevent duplicates
  private processedMessages: Set<string> = new Set(); // Track processed messages to prevent duplicates
  private processedMessageUpdates: Map<string, number> = new Map(); // Track processed message UPDATEs (messageId-updatedAt -> timestamp) to prevent infinite loops
  private recentEvents: Set<string> = new Set(); // Track recent events by commit_timestamp to prevent duplicate processing from Supabase re-deliveries
  private pendingUIUpdates: Map<string, NodeJS.Timeout> = new Map(); // Track pending UI update batches per buddy (buddyId -> timeout)
  private uiUpdateBatchDelay = 500; // Batch UI updates for 500ms to reduce spam
  private verboseRealtime = false; // Set to true for debugging realtime events
  
  // Hybrid Notification System Properties
  private notificationCooldown = 2000; // 2 seconds cooldown for immediate notifications
  private lastNotificationTime = 0;
  private pendingMessages: Array<{messageId: string, timestamp: number, buddyId: string, fullMessage: any}> = [];
  private batchThreshold = 3; // Route to batch if 3+ messages in queue
  
  private connectionStateUnsubscribe: (() => void) | null = null;
  private isConnectionRecoveryEnabled = true;
  private isCleaningUp = false; // Prevent multiple simultaneous cleanup calls
  
  // Phase 2: Performance metrics
  private performanceMetrics = {
    messagesProcessed: 0,
    notificationsSent: 0,
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    lastConnectionTime: 0,
    totalUptime: 0,
    startTime: Date.now(),
  };

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
    const startTime = Date.now();
    this.trackConnectionAttempt();
    
    try {
      console.log('🚀 Phase 2: Initializing realtime service for user:', userId);
      
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
      this.isCleaningUp = false; // Reset cleanup flag on successful connection
      
      const connectionTime = Date.now() - startTime;
      this.trackSuccessfulConnection(connectionTime);
      
      console.log(`✅ Phase 2: Realtime service initialized successfully in ${connectionTime}ms`);
      return true;
      
    } catch (error) {
      console.error('❌ Phase 2: Failed to initialize realtime service:', error);
      this.trackFailedConnection();
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
      this.isCleaningUp = false; // Reset cleanup flag on successful reconnection
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
      
      // Set up new subscriptions (force resubscribe to all channels)
      console.log('🔄 Force resubscribing to all channels after reconnect...');
      await this.setupSubscriptions(this.userId);
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      this.circuitBreakerOpen = false;
      this.isCleaningUp = false; // Reset cleanup flag on successful reconnection
      
      console.log('✅ Realtime reconnection successful with subscriptions restored');
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
      
      // 🚧 Prevent duplicate subscriptions - check if buddy_messages channel already exists
      // But allow reconnection if subscription was in error state
      const existing = supabase.getChannels().find(ch => ch.topic === 'realtime:public:buddy_messages');
      if (existing) {
        console.log('⚠️ Already subscribed to buddy_messages channel');
        // Check if the channel is in error state - if so, unsubscribe and recreate
        const channelState = existing.state;
        console.log('⚠️ Existing channel state:', channelState);
        if (channelState === 'errored' || channelState === 'closed') {
          console.log('🔄 Existing channel is in error/closed state - cleaning up and recreating...');
          await existing.unsubscribe();
          // Continue with new subscription
        } else {
          console.log('⚠️ Channel exists and is active, skipping duplicate subscription');
          return;
        }
      }
      
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
            console.log('🚨 ===== REALTIME EVENT FIRED =====');
            console.log('🚨 Event timestamp:', new Date().toISOString());
            console.log('🚨 AppState:', require('react-native').AppState.currentState);
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
            // 🚧 Filter out bulk "is_read" updates to reduce log spam
            // Only log meaningful message content updates (edits, sends), not read-status changes
            const isReadOnlyUpdate = payload.new?.is_read && payload.old && !payload.old.is_read;
            
            if (!isReadOnlyUpdate) {
              // Log meaningful updates (content changes, etc.) when verbose mode is enabled
              if (__DEV__ && this.verboseRealtime) {
                console.log('📝 Message updated via realtime:', payload);
              }
            }
            
            this.handleMessageUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('📡 Buddy messages subscription status:', status);
          if (status === 'CHANNEL_ERROR') {
            console.error('❌ Buddy messages subscription error - switching to polling');
            console.error('❌ Subscription error details - will attempt reconnection');
            // Don't immediately call handleConnectionError - let connection recovery service handle it
            // But log that we need to reconnect
            setTimeout(() => {
              if (this.userId) {
                console.log('🔄 Attempting to re-establish buddy_messages subscription...');
                this.attemptReconnection().catch(err => {
                  console.error('❌ Failed to re-establish subscription:', err);
                });
              }
            }, 2000); // Wait 2 seconds before retry
          } else if (status === 'SUBSCRIBED') {
            console.log('✅ Buddy messages subscription is now SUBSCRIBED and active');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Buddy messages subscription CLOSED');
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
            console.error('❌ This is a backup channel - messages may not be received');
            // Log but don't trigger full error handling - this is a backup channel
          } else if (status === 'SUBSCRIBED') {
            console.log('✅ Database notification subscription is now SUBSCRIBED and active (backup channel)');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Database notification subscription CLOSED');
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
      console.log('🚨 ===== MESSAGE RECEIVED - STARTING PROCESSING =====');
      console.log('🚨 Timestamp:', new Date().toISOString());
      console.log('🚨 AppState:', require('react-native').AppState.currentState);
      console.log('🚨 Phase 2: handleNewMessage called with payload:', JSON.stringify(payload, null, 2));
      
      if (!payload || !payload.new) {
        console.warn('Invalid payload structure:', payload);
        return;
      }

      // 🔄 Message Deduplication: Prevent same message from being processed multiple times
      const messageId = payload.new.id;
      if (this.processedMessages.has(messageId)) {
        console.log(`🔄 Message ${messageId} already processed, skipping duplicate processing`);
        return; // Skip processing but don't affect notifications
      }

      // Mark message as processed
      this.processedMessages.add(messageId);

      // Clean up old processed messages (keep memory efficient)
      if (this.processedMessages.size > 100) {
        const oldestMessages = Array.from(this.processedMessages).slice(0, 50);
        oldestMessages.forEach(id => this.processedMessages.delete(id));
        console.log(`🧹 Cleaned up ${oldestMessages.length} old processed messages`);
      }

      // Phase 2: Track message processing
      this.trackMessageProcessed();

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
      console.log('🚨 Checking if message is for current user...');
      console.log('🚨 Realtime connection status:', this.isConnected);
      console.log('🚨 Current userId:', this.userId);
      console.log('🚨 Message buddy_id:', payload.new.buddy_id);
      console.log('🚨 Message sender_id:', payload.new.sender_id);
      const isForCurrentUser = await this.isMessageForCurrentUser(payload.new.buddy_id);
      console.log('🚨 Message for current user check result:', isForCurrentUser);
      
      if (!isForCurrentUser) {
        console.log('🚨 Message not for current user, ignoring:', payload.new.buddy_id);
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
          console.log('🔔 Active chat check result:', { buddyId: payload.new.buddy_id, isChatActive });
          
          if (isChatActive) {
            console.log('🔕 Skipping notification - user is actively viewing this chat');
          } else {
            console.log('🔔 Showing notification - user is NOT actively viewing this chat');
            console.log('🚨 About to call handleHybridNotificationRouting...');
            // 🔄 Hybrid Notification Routing
            await this.handleHybridNotificationRouting(payload.new);
            console.log('🚨 handleHybridNotificationRouting completed');
            
            // Add to recent notifications to prevent duplicates
            this.recentNotifications.add(notificationKey);
            
            // Clean up old entries (keep only last 100 notifications)
            if (this.recentNotifications.size > 100) {
              const firstKey = Array.from(this.recentNotifications)[0];
              this.recentNotifications.delete(firstKey);
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
      if (!payload || !payload.new) {
        console.warn('📝 Invalid payload structure:', payload);
        return;
      }

      // ✅ CLIENT-SIDE DEDUPLICATION: Use commit_timestamp to prevent duplicate processing
      // Supabase may re-deliver the same event during reconnections, so we deduplicate by commit_timestamp
      const messageId = payload.new.id;
      const commitTimestamp = payload.commit_timestamp || Date.now().toString();
      const eventKey = `${messageId}-${commitTimestamp}`;
      
      // Check if we've already processed this exact event (same message + same commit)
      if (this.recentEvents.has(eventKey)) {
        // Event already processed - skip (likely a re-delivery from Supabase reconnect)
        return;
      }
      
      // Mark event as processed and auto-cleanup after 5 seconds
      this.recentEvents.add(eventKey);
      setTimeout(() => this.recentEvents.delete(eventKey), 5000);
      
      // Legacy deduplication (kept for backward compatibility and additional safety)
      const updatedAt = payload.new.updated_at ? new Date(payload.new.updated_at).getTime() : Date.now();
      const updateKey = `${messageId}-${updatedAt}`;
      const now = Date.now();
      const lastProcessedTime = this.processedMessageUpdates.get(updateKey);
      
      // ✅ CRITICAL FIX: Atomic check-and-set to prevent race conditions
      // If we processed this exact update (same messageId AND same updatedAt) recently, skip it
      if (lastProcessedTime && (now - lastProcessedTime < 5000)) { // 5 second deduplication window (increased)
        // Reduced logging - only log if really needed for debugging
        // console.log('⏭️ Skipping duplicate message update:', updateKey, 'processed', now - lastProcessedTime, 'ms ago');
        return;
      }
      
      // ✅ ATOMIC: Set timestamp BEFORE processing to prevent race conditions
      // This ensures that concurrent updates with the same key will be blocked
      this.processedMessageUpdates.set(updateKey, now);
      
      // Clean up old entries (keep only last 200 for better coverage)
      if (this.processedMessageUpdates.size > 200) {
        // Remove oldest 50 entries to prevent memory bloat
        const entries = Array.from(this.processedMessageUpdates.entries());
        entries.sort((a, b) => a[1] - b[1]); // Sort by timestamp
        entries.slice(0, 50).forEach(([key]) => this.processedMessageUpdates.delete(key));
      }
      
      // ⚠️ CRITICAL FIX: For message UPDATEs, do NOT refresh entire buddy cache
      // This was causing infinite loops. Message updates (e.g., read status changes) 
      // should only trigger UI updates, not full cache refreshes.
      // The cache will be refreshed when needed (e.g., when user opens buddy list).
      
      // Dispatch custom event to trigger UI refresh only (batched to reduce spam)
      this.dispatchUIUpdateEvent(payload.new.buddy_id, 'message-updated', payload.new);
      
    } catch (error) {
      console.error('❌ Error processing message update:', error);
    }
  }

  private async handleNewNote(payload: any): Promise<void> {
    try {
      if (!payload || !payload.new) {
        console.warn('📝 Invalid note payload structure:', payload);
        return;
      }

      const note = payload.new;
      const noteId = note.id;
      const senderId = note.sender_id;

      // Skip if note is from current user
      if (senderId === this.userId) {
        console.log('📝 Note from current user, skipping notification:', senderId);
        // Still dispatch UI event and invalidate cache for UI consistency
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
        QueryCache.invalidateWhisprNotes(this.userId || '');
        return;
      }

      // Check app state
      const { AppState } = require('react-native');
      const appState = AppState.currentState;
      const isAppActive = appState === 'active';

      console.log('📝 New note received via realtime:', {
        noteId,
        senderId,
        content: note.content?.substring(0, 50),
        appState,
        isAppActive
      });

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
      
      // Show notification using batching service (groups multiple notes)
      try {
        const noteContent = note.content || 'New Whispr Note';
        const notificationKey = `note-${noteId}`;
        
        // Prevent duplicate notifications
        if (!this.recentNotifications.has(notificationKey)) {
          console.log('📝 Adding note to batch:', { noteId, senderId });
          
          // Use note batching service to group multiple notes
          const { noteBatchingService } = await import('@/services/noteBatchingService');
          // Note: sender name is not in the note object, would need to be fetched separately
          // For now, we'll just use the senderId
          noteBatchingService.addNoteToBatch(
            noteId,
            noteContent,
            senderId
          );
          
          // Add to recent notifications to prevent duplicates
          this.recentNotifications.add(notificationKey);
          
          // Clean up old entries (keep only last 100 notifications)
          if (this.recentNotifications.size > 100) {
            const firstKey = Array.from(this.recentNotifications)[0];
            this.recentNotifications.delete(firstKey);
          }
        } else {
          console.log('🔕 Duplicate note notification prevented:', notificationKey);
        }
      } catch (notificationError) {
        console.error('❌ Error adding note to batch:', notificationError);
        // Don't throw - continue with cache invalidation
      }
      
      console.log('✅ Note update processed, cache invalidated, and notification shown');
      
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
      // ✅ BATCH UI UPDATES: Instead of dispatching immediately, batch multiple updates for the same buddy
      // This prevents spam when bulk operations (e.g., marking many messages as read) trigger many events
      const updateKey = `${buddyId}-${eventType}`;
      
      // Clear existing timeout for this buddy+eventType combination
      const existingTimeout = this.pendingUIUpdates.get(updateKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Set a new timeout to dispatch the batched update
      const timeout = setTimeout(() => {
        // Remove from pending map
        this.pendingUIUpdates.delete(updateKey);
        
        // Dispatch the batched update (only one event per buddy within the batch window)
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit(eventType, { 
          type: eventType,
          buddyId: buddyId,
          userId: this.userId,
          source: 'realtime',
          message: messageData, // Include latest message data (or null for batched read-status updates)
          batched: true // Flag to indicate this is a batched update
        });
        
        // Reduced logging - only log once per batch
        // console.log(`✅ Batched UI event dispatched: ${eventType} for buddy: ${buddyId}`);
      }, this.uiUpdateBatchDelay);
      
      // Store the timeout so we can cancel it if more updates come in
      this.pendingUIUpdates.set(updateKey, timeout);
      
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
      
      // ✅ CRITICAL: Only process DELETE events, ignore all UPDATE/INSERT events
      // This prevents buddy-deleted from being emitted when buddies table is updated (e.g., marking messages as read)
      // Supabase DELETE events have `old` but no `new`, UPDATE events have both `old` and `new`
      if (payload.new) {
        // Has `new` data - this is an UPDATE or INSERT, not a DELETE
        console.log('⏭️ Ignoring non-DELETE buddy event (has new data)');
        return;
      }
      
      // Additional check: if eventType is specified and not DELETE, ignore
      if (payload.eventType && payload.eventType !== 'DELETE') {
        console.log('⏭️ Ignoring non-DELETE buddy event:', payload.eventType);
        return;
      }
      
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
      // Note: System notification - no buddyId needed as buddy is deleted
      console.log('🔔 Showing buddy deletion notification');
      await notificationService.showMessageNotification(
        'Buddy Deleted',
        'A buddy has been removed from your contacts',
        'System',
        undefined, // messageCount
        undefined // buddyId - not applicable for deleted buddy
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
    // Prevent multiple simultaneous error handling (all subscriptions fail at once)
    if (this.isCleaningUp) {
      console.log('🔄 Cleanup already in progress, skipping duplicate error handler');
      return;
    }
    
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
    // Prevent multiple simultaneous cleanup calls
    if (this.isCleaningUp) {
      console.log('🔄 Cleanup already in progress, skipping duplicate cleanup');
      return;
    }
    
    this.isCleaningUp = true;
    console.log('🧹 Cleaning up realtime subscriptions');
    
    try {
      // ✅ CRITICAL: Remove all Supabase channels first to prevent duplicate subscriptions
      supabase.getChannels().forEach(ch => supabase.removeChannel(ch));
      
      this.subscriptions.forEach(subscription => {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from channel:', error);
        }
      });
      
      this.subscriptions = [];
      
      // Clean up recent events tracking
      this.recentEvents.clear();
      
      // Clean up pending UI update batches
      this.pendingUIUpdates.forEach((timeout) => {
        clearTimeout(timeout);
      });
      this.pendingUIUpdates.clear();
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
    } finally {
      // Reset flag after cleanup completes
      this.isCleaningUp = false;
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

  /**
   * Phase 2: Get performance metrics
   */
  getPerformanceMetrics(): any {
    const now = Date.now();
    const uptime = now - this.performanceMetrics.startTime;
    
    return {
      ...this.performanceMetrics,
      uptime: uptime,
      uptimePercentage: this.isConnected ? (uptime / (now - this.performanceMetrics.startTime)) * 100 : 0,
      connectionSuccessRate: this.performanceMetrics.connectionAttempts > 0 
        ? (this.performanceMetrics.successfulConnections / this.performanceMetrics.connectionAttempts) * 100 
        : 0,
      messagesPerMinute: uptime > 0 ? (this.performanceMetrics.messagesProcessed / (uptime / 60000)) : 0,
      notificationsPerMinute: uptime > 0 ? (this.performanceMetrics.notificationsSent / (uptime / 60000)) : 0,
    };
  }

  /**
   * Phase 2: Track connection attempt
   */
  private trackConnectionAttempt(): void {
    this.performanceMetrics.connectionAttempts++;
  }

  /**
   * Phase 2: Track successful connection
   */
  private trackSuccessfulConnection(connectionTime: number): void {
    this.performanceMetrics.successfulConnections++;
    this.performanceMetrics.lastConnectionTime = connectionTime;
    
    // Update average connection time
    const totalConnections = this.performanceMetrics.successfulConnections;
    this.performanceMetrics.averageConnectionTime = 
      ((this.performanceMetrics.averageConnectionTime * (totalConnections - 1)) + connectionTime) / totalConnections;
  }

  /**
   * Phase 2: Track failed connection
   */
  private trackFailedConnection(): void {
    this.performanceMetrics.failedConnections++;
  }

  /**
   * Phase 2: Track message processing
   */
  private trackMessageProcessed(): void {
    this.performanceMetrics.messagesProcessed++;
  }

  /**
   * Phase 2: Track notification sent
   */
  private trackNotificationSent(): void {
    this.performanceMetrics.notificationsSent++;
  }
  // Clear processed messages (useful for testing or reset scenarios)
  public clearProcessedMessages(): void {
    console.log('🧹 Clearing processed messages cache');
    this.processedMessages.clear();
  }

  // Get count of processed messages (for debugging)
  public getProcessedMessagesCount(): number {
    return this.processedMessages.size;
  }

  /**
   * 🔄 Hybrid Notification Routing System
   * Routes all messages through batch system to group messages from the same user
   */
  private async handleHybridNotificationRouting(messageData: any): Promise<void> {
    try {
      console.log('🚨 ===== handleHybridNotificationRouting CALLED =====');
      console.log('🚨 Timestamp:', new Date().toISOString());
      console.log('🚨 AppState:', require('react-native').AppState.currentState);
      console.log('🚨 Message data:', JSON.stringify(messageData, null, 2));
      
      const now = Date.now();
      const messageId = messageData.id;
      const buddyId = messageData.buddy_id;
      
      // Always route through batch system to group messages from same user
      console.log('📦 Routing message to BATCH system (will group by user):', messageId);
      
      // Force immediate cache update and UI refresh (don't wait for batch)
      await CachedBuddiesService.applyRealtimeUpdate('message', messageData, this.userId!);
      this.dispatchUIUpdateEvent(messageData.buddy_id, 'message-updated', messageData);
      
      // Route to batch system which will group messages from the same user
      console.log('🚨 About to call routeToBatchSystem...');
      await this.routeToBatchSystem(messageData);
      console.log('🚨 routeToBatchSystem completed');
      
      this.lastNotificationTime = now;
      
      console.log('✅ Message routed to batch system for user grouping');
      
    } catch (error) {
      console.error('❌ Error in hybrid notification routing:', error);
    }
  }

  /**
   * Send immediate notification (realtime system)
   */
  private async sendImmediateNotification(messageData: any): Promise<void> {
    try {
      console.log('⚡ Sending immediate notification');
      console.log('⚡ Message data:', messageData);
      
      // Force immediate cache update and UI refresh
      await CachedBuddiesService.applyRealtimeUpdate('message', messageData, this.userId!);
      this.dispatchUIUpdateEvent(messageData.buddy_id, 'message-updated', messageData);
      
      console.log('⚡ About to get buddy display name for senderId:', messageData.sender_id);
      
      // Get buddy name
      const buddyDisplayName = await this.getBuddyDisplayName(messageData.sender_id);
      
      console.log('⚡ Got buddy display name:', buddyDisplayName);
      
      // Show LOCAL notification (works in both foreground and background)
      const { notificationService } = await import('@/services/notificationService');
      await notificationService.showMessageNotification(
        'New Message',
        messageData.content || 'New message',
        buddyDisplayName,
        undefined, // messageCount
        messageData.buddy_id // Pass buddyId for faster navigation
      );
      
      console.log('✅ Immediate notification sent successfully');
      
    } catch (error) {
      console.error('❌ Error sending immediate notification:', error);
    }
  }

  /**
   * Route to batch notification system (Phase 3)
   */
  private async routeToBatchSystem(messageData: any): Promise<void> {
    try {
      console.log('🚨 ===== routeToBatchSystem CALLED =====');
      console.log('🚨 Timestamp:', new Date().toISOString());
      console.log('🚨 AppState:', require('react-native').AppState.currentState);
      console.log('📦 Routing to batch notification system');
      
      // Force immediate cache update and UI refresh
      await CachedBuddiesService.applyRealtimeUpdate('message', messageData, this.userId!);
      this.dispatchUIUpdateEvent(messageData.buddy_id, 'message-updated', messageData);
      
      // Get buddy name
      const buddyDisplayName = await this.getBuddyDisplayName(messageData.sender_id);
      
      // Right before calling phase3NotificationLogicService.addNotificationToBatch
      //instrumentMessageHandler(
      //  buddyDisplayName,
      //  messageData.buddy_id,
      //  messageData.id,
      //  messageData.content || 'New message'
      //);
      
      // Then call Phase 3 as normal
      this.phase3Service.addNotificationToBatch(
        buddyDisplayName,
        messageData.buddy_id, // buddyId
        messageData.id, // messageId
        messageData.content || 'New message' // content
      );
      
      console.log('✅ Message routed to batch system successfully');
      
    } catch (error) {
      console.error('❌ Error routing to batch system:', error);
    }
  }

  /**
   * Process pending messages when timeout is reached
   */
  private async processPendingMessages(): Promise<void> {
    if (this.pendingMessages.length === 0) return;
    
    try {
      console.log(`📦 Processing ${this.pendingMessages.length} pending messages`);
      
      // Get the most recent message
      const latestPendingMessage = this.pendingMessages[this.pendingMessages.length - 1];
      const latestFullMessage = latestPendingMessage.fullMessage;
      
      // ✅ FIXED: Always route through batch system to prevent duplicate notifications
      // Even single messages go through batch system, which uses consistent notification IDs
      await this.routeToBatchSystem(latestFullMessage);
      
      this.pendingMessages = [];
      
    } catch (error) {
      console.error('❌ Error processing pending messages:', error);
    }
  }

  /**
   * Get buddy display name with caching
   */
  private async getBuddyDisplayName(senderId: string): Promise<string> {
    try {
      console.log('👤 Getting buddy display name for senderId:', senderId);
      
      // Check cache first
      const cachedProfile = this.userProfileCache.get(senderId);
      if (cachedProfile && (Date.now() - cachedProfile.timestamp) < 300000) { // 5 minutes cache
        console.log('👤 Using cached buddy name:', cachedProfile.name);
        return cachedProfile.name;
      }
      
      console.log('👤 Cache miss, fetching from database for senderId:', senderId);
      
      // Fetch from database
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('id', senderId)
        .single();
      
      if (error) {
        console.error('👤 Database error fetching user profile:', error);
        return 'Buddy';
      }
      
      console.log('👤 User profile data:', userProfile);
      
      const buddyDisplayName = userProfile?.display_name || userProfile?.username || 'Buddy';
      
      console.log('👤 Resolved buddy display name:', buddyDisplayName);
      
      // Cache the name
      this.userProfileCache.set(senderId, {
        name: buddyDisplayName,
        timestamp: Date.now()
      });
      
      return buddyDisplayName;
      
    } catch (error) {
      console.error('👤 Error fetching buddy name:', error);
      return 'Buddy';
    }
  }
}

export { RealtimeService };
export const realtimeService = new RealtimeService();

// Expose activeChatService for debugging
if (__DEV__) {
  (global as any).activeChatService = activeChatService;
  (global as any).testActiveChat = () => activeChatService.testActiveChat();
}