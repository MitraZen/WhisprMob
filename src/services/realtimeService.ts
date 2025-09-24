import { supabase } from '@/config/supabase';
import { notificationService } from './notificationService';

interface RealtimeSubscription {
  channel: any;
  unsubscribe: () => void;
}

class RealtimeService {
  private subscriptions: RealtimeSubscription[] = [];
  private userId: string | null = null;
  private isConnected = false;

  async initialize(userId: string) {
    this.userId = userId;
    console.log('Initializing realtime service for user:', userId);
    
    try {
      // Subscribe to buddy messages
      await this.subscribeToMessages();
      
      // Subscribe to Whispr notes
      await this.subscribeToNotes();
      
      this.isConnected = true;
      console.log('Realtime service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize realtime service:', error);
      throw error;
    }
  }

  private async subscribeToMessages() {
    if (!this.userId) return;

    console.log('Subscribing to buddy messages...');
    
    const channel = supabase
      .channel('buddy-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_messages',
          filter: `receiver_id=eq.${this.userId}`,
        },
        async (payload) => {
          console.log('New message received via realtime:', payload);
          
          try {
            // Get buddy information
            const { data: buddyData } = await supabase
              .from('buddies')
              .select('name, initials')
              .eq('user_id', payload.new.sender_id)
              .single();

            const buddyName = buddyData?.name || buddyData?.initials || 'Buddy';
            
            // Send notification
            await notificationService.showMessageNotification(
              'New Message',
              payload.new.content,
              buddyName
            );
            
            console.log('Message notification sent for:', buddyName);
          } catch (error) {
            console.error('Error processing message notification:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Message subscription status:', status);
      });

    this.subscriptions.push({
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from buddy messages');
        supabase.removeChannel(channel);
      }
    });
  }

  private async subscribeToNotes() {
    if (!this.userId) return;

    console.log('Subscribing to Whispr notes...');
    
    const channel = supabase
      .channel('whispr-notes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whispr_notes',
          filter: `sender_id=neq.${this.userId}`,
        },
        async (payload) => {
          console.log('New Whispr note received via realtime:', payload);
          
          try {
            // Send notification
            await notificationService.showNoteNotification(
              'New Whispr Note',
              payload.new.content
            );
            
            console.log('Note notification sent');
          } catch (error) {
            console.error('Error processing note notification:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Note subscription status:', status);
      });

    this.subscriptions.push({
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from Whispr notes');
        supabase.removeChannel(channel);
      }
    });
  }

  async disconnect() {
    console.log('Disconnecting realtime service...');
    
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    
    this.subscriptions = [];
    this.isConnected = false;
    this.userId = null;
    
    console.log('Realtime service disconnected');
  }

  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  // Test realtime connection
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
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

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      userId: this.userId,
      subscriptionCount: this.subscriptions.length,
    };
  }
}

export const realtimeService = new RealtimeService();




