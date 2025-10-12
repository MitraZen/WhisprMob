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

  async initialize(userId: string): Promise<boolean> {
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
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }
    
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      throw new Error(`Connection test failed: ${error.message}`);
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
          filter: `receiver_id=eq.${this.userId}`,
        },
        async (payload) => {
          console.log('📨 New message received via realtime:', payload);
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
      // Get buddy information
      const buddyInfo = await this.getBuddyInfo(payload.new.sender_id);
      
      // Send notification
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

  // Test realtime connection
  async testConnection(): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client is not available');
        return false;
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Realtime test connection error:', error);
        return false;
      }

      console.log('Realtime test connection successful');
      return true;
    } catch (error) {
      console.error('Realtime test connection failed:', error);
      return false;
    }
  }
}

export const realtimeService = new RealtimeService();






