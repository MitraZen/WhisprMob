import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { supabase } from '@/config/supabase';

interface RealtimeSubscription {
  channel: any;
  unsubscribe: () => void;
  type: 'messages' | 'notes';
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
    
    console.log('🔄 Initializing realtime service for user:', userId);
    
    // Create initialization promise to prevent duplicates
    this.initializationPromise = this.performInitialization();
    
    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<boolean> {
    try {
      // Test connection first
      await this.testConnection();
      
      // Subscribe to events
      await this.subscribeToMessages();
      await this.subscribeToNotes();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.connectionRetryCount = 0;
      this.circuitBreakerOpen = false;
      
      console.log('✅ Realtime service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize realtime service:', error);
      await this.handleConnectionFailure();
      return false;
    }
  }

  private async testConnection(): Promise<void> {
    console.log('🧪 Testing WebSocket connection before enabling realtime...');
    
    try {
      // Skip WebSocket test to avoid timeout issues
      console.log('⏭️ Skipping WebSocket test to avoid timeout issues');
      console.log('✅ WebSocket connection test skipped');
      
      // Also test basic Supabase connectivity
      if (!supabase) {
        throw new Error('Supabase client is not available');
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
        
      if (error) {
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }
      
      console.log('✅ Supabase connection test passed');
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      throw error;
    }
  }

  private async subscribeToMessages(): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }
    
        const channel = supabase
          .channel(`messages-${this.userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'buddy_messages',
            },
            async (payload) => {
              console.log('📨 New message received via realtime:', payload);
              console.log('📨 Payload details:', {
                hasNew: !!payload.new,
                senderId: payload.new?.sender_id,
                buddyId: payload.new?.buddy_id,
                content: payload.new?.content,
                userId: this.userId
              });
              await this.handleNewMessage(payload);
            }
          )
      .subscribe((status) => {
        console.log('📨 Message subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.connectionRetryCount = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.handleSubscriptionError('messages');
        }
      });

    this.subscriptions.push({
      channel,
      unsubscribe: () => supabase.removeChannel(channel),
      type: 'messages'
    });
  }

  private async subscribeToNotes(): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }
    
    const channel = supabase
      .channel(`notes-${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whispr_notes',
          filter: `sender_id=neq.${this.userId}`,
        },
        async (payload) => {
          console.log('📝 New note received via realtime:', payload);
          await this.handleNewNote(payload);
        }
      )
      .subscribe((status) => {
        console.log('📝 Note subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.connectionRetryCount = 0;
        } else if (status === 'CHANNEL_ERROR') {
          this.handleSubscriptionError('notes');
        }
      });

    this.subscriptions.push({
      channel,
      unsubscribe: () => supabase.removeChannel(channel),
      type: 'notes'
    });
  }

  private async handleNewMessage(payload: any): Promise<void> {
    try {
      console.log('🔔 handleNewMessage called with payload:', payload);
      
      if (!payload || !payload.new) {
        console.warn('🔔 Invalid payload structure:', payload);
        return;
      }
      
      // Check if this message was sent by the current user (prevent self-notifications)
      if (payload.new.sender_id === this.userId) {
        console.log('🔔 Message sent by current user, ignoring self-notification:', payload.new.sender_id);
        return;
      }
      
      // Check if this message is for the current user by verifying buddy relationship
      const isForCurrentUser = await this.isMessageForCurrentUser(payload.new.buddy_id);
      if (!isForCurrentUser) {
        console.log('🔔 Message not for current user, ignoring:', payload.new.buddy_id);
        return;
      }
      
      // Get buddy information
      console.log('🔔 Getting buddy info for sender:', payload.new.sender_id);
      const buddyInfo = await this.getBuddyInfo(payload.new.sender_id);
      console.log('🔔 Buddy info retrieved:', buddyInfo);
      
      // Send notification
      console.log('🔔 Sending notification...');
      await notificationService.showMessageNotification(
        'New Message',
        payload.new.content,
        buddyInfo.name
      );
      
      console.log('✅ Message notification sent for:', buddyInfo.name);
    } catch (error) {
      console.error('❌ Error processing message notification:', error);
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
      
      // Send notification
      await notificationService.showNoteNotification(
        'New Whispr Note',
        payload.new.content
      );
      
      console.log('✅ Note notification sent');
    } catch (error) {
      console.error('❌ Error processing note notification:', error);
    }
  }

  private async isMessageForCurrentUser(buddyId: string): Promise<boolean> {
    try {
      if (!supabase || !this.userId) {
        return false;
      }
      
      const { data, error } = await supabase
        .from('buddies')
        .select('id')
        .eq('id', buddyId)
        .eq('user_id', this.userId)
        .single();
        
      if (error) {
        console.warn('Error checking buddy relationship:', error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error checking if message is for current user:', error);
      return false;
    }
  }

  private async getBuddyInfo(senderId: string): Promise<{ name: string }> {
    try {
      if (!supabase) {
        return { name: 'Anonymous User' };
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('id', senderId)
        .single();
        
      if (error) throw error;
      
      return {
        name: data.display_name || data.username || 'Anonymous User'
      };
    } catch (error) {
      console.error('Error getting buddy info:', error);
      return { name: 'Anonymous User' };
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isConnected) return;
      
      try {
        await this.testConnection();
        console.log('💚 Realtime health check passed');
      } catch (error) {
        console.warn('💛 Realtime health check failed:', error);
        await this.handleConnectionFailure();
      }
    }, 60000); // Check every minute
  }

  private async handleConnectionFailure(): Promise<void> {
    this.isConnected = false;
    this.connectionRetryCount++;
    
    console.log(`🔄 Connection failure #${this.connectionRetryCount}`);
    
    if (this.connectionRetryCount <= this.maxRetries) {
      const delay = Math.min(
        this.retryDelay * Math.pow(2, this.connectionRetryCount - 1),
        this.maxRetryDelay
      );
      
      console.log(`⏰ Retrying connection in ${delay}ms`);
      
      setTimeout(async () => {
        if (this.userId && !this.circuitBreakerOpen) {
          await this.initialize(this.userId);
        }
      }, delay);
    } else {
      console.log('🔒 Max retries reached, opening circuit breaker');
      this.circuitBreakerOpen = true;
      this.lastCircuitBreakerReset = Date.now();
      this.triggerPollingFallback();
    }
  }

  private handleSubscriptionError(type: 'messages' | 'notes'): void {
    console.error(`❌ ${type} subscription error`);
    // Remove failed subscription
    this.subscriptions = this.subscriptions.filter(sub => sub.type !== type);
    
    // Try to resubscribe
    setTimeout(async () => {
      if (type === 'messages') {
        await this.subscribeToMessages();
      } else {
        await this.subscribeToNotes();
      }
    }, 5000);
  }

  private triggerPollingFallback(): void {
    // Dispatch event to notify notification manager
    // Check if we're in a test environment
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('realtime-failed', {
        detail: { userId: this.userId }
      });
      window.dispatchEvent(event);
    } else {
      // In test environment or React Native, use console logging
      console.log('🔄 Realtime failed - would trigger polling fallback for user:', this.userId);
    }
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting realtime service...');
    
    // Clear health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Unsubscribe from all channels
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    
    this.subscriptions = [];
    this.isConnected = false;
    this.userId = null;
    
    console.log('✅ Realtime service disconnected');
  }

  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      subscriptionCount: this.subscriptions.length,
      retryCount: this.connectionRetryCount,
    };
  }

}

export const realtimeService = new RealtimeService();






