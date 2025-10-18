import { supabase } from '../config/supabase';

export interface BuddyMessage {
  id: string;
  buddy_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'emoji';
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageNotification {
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  type: 'message' | 'notification';
  message_id: string;
  buddy_id: string;
  sender_id: string;
  content_preview: string;
  message_type: string;
  notification_type?: 'new_message' | 'message_read';
  is_read: boolean;
  new_record?: BuddyMessage;
  old_record?: BuddyMessage;
}

export class BuddyMessagesUnifiedService {
  private subscriptions: Map<string, any> = new Map();

  /**
   * Send a message using the unified trigger system
   */
  async sendMessage(
    buddyId: string,
    senderId: string,
    content: string,
    messageType: 'text' | 'image' | 'file' | 'emoji' = 'text'
  ): Promise<BuddyMessage> {
    try {
      const { data, error } = await supabase
        .from('buddy_messages')
        .insert({
          buddy_id: buddyId,
          sender_id: senderId,
          content,
          message_type: messageType,
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      console.log('Message sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time message updates for a specific user
   */
  subscribeToMessages(
    userId: string,
    onMessageUpdate: (notification: MessageNotification) => void,
    onNotification: (notification: MessageNotification) => void
  ): () => void {
    const messageChannel = `buddy_messages_${userId}`;
    const notificationChannel = `notifications_${userId}`;

    // Subscribe to message updates
    const messageSubscription = supabase
      .channel(messageChannel)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buddy_messages'
      }, (payload) => {
        console.log('Message update received:', payload);
        onMessageUpdate(payload.new as MessageNotification);
      })
      .subscribe();

    // Subscribe to notifications
    const notificationSubscription = supabase
      .channel(notificationChannel)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buddy_messages'
      }, (payload) => {
        console.log('Notification received:', payload);
        onNotification(payload.new as MessageNotification);
      })
      .subscribe();

    // Store subscriptions for cleanup
    this.subscriptions.set(messageChannel, messageSubscription);
    this.subscriptions.set(notificationChannel, notificationSubscription);

    // Return cleanup function
    return () => {
      messageSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
      this.subscriptions.delete(messageChannel);
      this.subscriptions.delete(notificationChannel);
    };
  }

  /**
   * Subscribe to messages for a specific buddy conversation
   */
  subscribeToBuddyMessages(
    buddyId: string,
    userId: string,
    onMessageUpdate: (message: BuddyMessage) => void,
    onNotification: (notification: MessageNotification) => void
  ): () => void {
    const messageChannel = `buddy_messages_${userId}_${buddyId}`;
    const notificationChannel = `notifications_${userId}_${buddyId}`;

    console.log('🔔 Setting up real-time subscription for:', {
      userId,
      buddyId,
      messageChannel,
      notificationChannel
    });

    // Subscribe to message updates with proper filtering
    const messageSubscription = supabase
      .channel(messageChannel)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'buddy_messages',
        filter: `buddy_id=eq.${buddyId}`
      }, async (payload) => {
        console.log('📨 Real-time message received:', payload);
        const message = payload.new as BuddyMessage;
        
        // Double-check this message is for the current user's buddy relationship
        try {
          const { data: isForUser } = await supabase.rpc('is_message_for_user', {
            message_buddy_id: message.buddy_id,
            user_id_param: userId
          });
          
          if (isForUser) {
            console.log('✅ Message confirmed for current user, updating chat');
            onMessageUpdate(message);
          } else {
            console.log('❌ Message not for current user, ignoring');
          }
        } catch (error) {
          console.error('Error checking message ownership:', error);
          // Fallback: if we can't check, assume it's for the user
          onMessageUpdate(message);
        }
      })
      .subscribe();

    // Subscribe to notifications
    const notificationSubscription = supabase
      .channel(notificationChannel)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('🔔 Real-time notification received:', payload);
        const notification = payload.new as any;
        
        // Check if this notification is for the current buddy
        if (notification.data && notification.data.buddy_id === buddyId) {
          console.log('✅ Notification confirmed for current buddy');
          onNotification(notification as MessageNotification);
        } else {
          console.log('❌ Notification not for current buddy, ignoring');
        }
      })
      .subscribe();

    // Store subscriptions for cleanup
    this.subscriptions.set(messageChannel, messageSubscription);
    this.subscriptions.set(notificationChannel, notificationSubscription);

    // Return cleanup function
    return () => {
      console.log('🔕 Cleaning up real-time subscriptions');
      messageSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
      this.subscriptions.delete(messageChannel);
      this.subscriptions.delete(notificationChannel);
    };
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buddy_messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('sender_id', '!=', userId); // Only mark as read if user is not the sender

      if (error) {
        console.error('Error marking message as read:', error);
        throw error;
      }

      console.log('Message marked as read:', messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  /**
   * Get messages for a buddy conversation
   */
  async getBuddyMessages(
    buddyId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<BuddyMessage[]> {
    try {
      const { data, error } = await supabase
        .from('buddy_messages')
        .select('*')
        .eq('buddy_id', buddyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching buddy messages:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch buddy messages:', error);
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('buddy_messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId); // Only allow sender to delete

      if (error) {
        console.error('Error deleting message:', error);
        throw error;
      }

      console.log('Message deleted:', messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }

  /**
   * Test the unified trigger system
   */
  async testUnifiedTrigger(
    buddyId: string,
    senderId: string,
    content: string = 'Test message from unified trigger'
  ): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('test_buddy_message_notification', {
        p_buddy_id: buddyId,
        p_sender_id: senderId,
        p_content: content
      });

      if (error) {
        console.error('Error testing unified trigger:', error);
        throw error;
      }

      console.log('Unified trigger test result:', data);
      return data;
    } catch (error) {
      console.error('Failed to test unified trigger:', error);
      throw error;
    }
  }

  /**
   * Clear all subscriptions
   */
  clearAllSubscriptions(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    console.log('All message subscriptions cleared');
  }

  /**
   * Get subscription status
   */
  getSubscriptionStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.subscriptions.forEach((subscription, key) => {
      status[key] = subscription.state === 'SUBSCRIBED';
    });
    return status;
  }
}

// Export singleton instance
export const buddyMessagesUnifiedService = new BuddyMessagesUnifiedService();
