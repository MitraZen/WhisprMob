// Real-time Buddy Management Service
// Handles real-time notifications for buddy operations

import { supabase } from '@/config/supabase';
import { QueryCache } from './queryCache';
import { DeviceEventEmitter } from 'react-native';

export class BuddyRealtimeService {
  private static subscriptions: Map<string, any> = new Map();

  /**
   * Subscribe to buddy deletion notifications (BIDIRECTIONAL)
   */
  static subscribeToBuddyDeletions(userId: string, onBuddyDeleted: (data: any) => void): void {
    console.log('🔔 Subscribing to buddy deletion notifications for user:', userId);
    
    const subscription = supabase
      .channel('buddy_deletions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'buddies',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('📢 Buddy change notification (user_id):', payload);
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ Buddy deleted (user_id):', payload.old);
            onBuddyDeleted(payload.old);
            
            // Invalidate cache for this user
            QueryCache.invalidateBuddies(userId);
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'buddies',
          filter: `buddy_user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('📢 Buddy change notification (buddy_user_id):', payload);
          
          if (payload.eventType === 'DELETE') {
            console.log('🗑️ Buddy deleted (buddy_user_id):', payload.old);
            onBuddyDeleted(payload.old);
            
            // Invalidate cache for this user
            QueryCache.invalidateBuddies(userId);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Buddy deletion subscription status:', status);
      });

    this.subscriptions.set(`buddy_deletions_${userId}`, subscription);
  }

  /**
   * Subscribe to buddy creation notifications (BIDIRECTIONAL)
   */
  static subscribeToBuddyCreations(userId: string, onBuddyCreated: (data: any) => void): void {
    console.log('🔔 Subscribing to buddy creation notifications for user:', userId);
    
    const subscription = supabase
      .channel('buddy_creations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'buddies',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('📢 Buddy created notification (user_id):', payload);
          onBuddyCreated(payload.new);
          
          // Invalidate cache for this user
          QueryCache.invalidateBuddies(userId);
        }
      )
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'buddies',
          filter: `buddy_user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('📢 Buddy created notification (buddy_user_id):', payload);
          onBuddyCreated(payload.new);
          
          // Invalidate cache for this user
          QueryCache.invalidateBuddies(userId);
        }
      )
      .subscribe((status) => {
        console.log('📡 Buddy creation subscription status:', status);
      });

    this.subscriptions.set(`buddy_creations_${userId}`, subscription);
  }

  /**
   * Subscribe to buddy update notifications (BIDIRECTIONAL)
   */
  static subscribeToBuddyUpdates(userId: string, onBuddyUpdated: (data: any) => void): void {
    console.log('🔔 Subscribing to buddy update notifications for user:', userId);
    
    const subscription = supabase
      .channel('buddy_updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'buddies',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('📢 Buddy updated notification (user_id):', payload);
          onBuddyUpdated(payload.new);
          
          // Invalidate cache for this user
          QueryCache.invalidateBuddies(userId);
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'buddies',
          filter: `buddy_user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('📢 Buddy updated notification (buddy_user_id):', payload);
          onBuddyUpdated(payload.new);
          
          // Invalidate cache for this user
          QueryCache.invalidateBuddies(userId);
        }
      )
      .subscribe((status) => {
        console.log('📡 Buddy update subscription status:', status);
      });

    this.subscriptions.set(`buddy_updates_${userId}`, subscription);
  }

  /**
   * Subscribe to all buddy notifications for a user (COMPREHENSIVE)
   */
  static subscribeToAllBuddyNotifications(
    userId: string, 
    onBuddyDeleted: (data: any) => void,
    onBuddyCreated: (data: any) => void,
    onBuddyUpdated?: (data: any) => void
  ): void {
    this.subscribeToBuddyDeletions(userId, onBuddyDeleted);
    this.subscribeToBuddyCreations(userId, onBuddyCreated);
    
    if (onBuddyUpdated) {
      this.subscribeToBuddyUpdates(userId, onBuddyUpdated);
    }
  }

  /**
   * Unsubscribe from buddy notifications for a user
   */
  static unsubscribeFromBuddyNotifications(userId: string): void {
    console.log('🔕 Unsubscribing from buddy notifications for user:', userId);
    
    const deletionKey = `buddy_deletions_${userId}`;
    const creationKey = `buddy_creations_${userId}`;
    const updateKey = `buddy_updates_${userId}`;
    
    if (this.subscriptions.has(deletionKey)) {
      supabase.removeChannel(this.subscriptions.get(deletionKey));
      this.subscriptions.delete(deletionKey);
    }
    
    if (this.subscriptions.has(creationKey)) {
      supabase.removeChannel(this.subscriptions.get(creationKey));
      this.subscriptions.delete(creationKey);
    }
    
    if (this.subscriptions.has(updateKey)) {
      supabase.removeChannel(this.subscriptions.get(updateKey));
      this.subscriptions.delete(updateKey);
    }
  }

  /**
   * Unsubscribe from all notifications
   */
  static unsubscribeFromAllNotifications(): void {
    console.log('🔕 Unsubscribing from all buddy notifications');
    
    this.subscriptions.forEach((subscription, key) => {
      supabase.removeChannel(subscription);
    });
    
    this.subscriptions.clear();
  }

  /**
   * Get subscription status for a user
   */
  static getSubscriptionStatus(userId: string): { deletions: boolean; creations: boolean; updates: boolean } {
    return {
      deletions: this.subscriptions.has(`buddy_deletions_${userId}`),
      creations: this.subscriptions.has(`buddy_creations_${userId}`),
      updates: this.subscriptions.has(`buddy_updates_${userId}`)
    };
  }

  /**
   * Subscribe to DeviceEventEmitter buddy deletion events
   * This handles buddy deletions triggered by other users
   */
  static subscribeToDeviceBuddyEvents(
    userId: string, 
    onBuddyDeleted: (data: any) => void,
    onBuddyCreated?: (data: any) => void,
    onBuddyUpdated?: (data: any) => void
  ): () => void {
    console.log('🔔 Subscribing to DeviceEventEmitter buddy events for user:', userId);
    
    const handleBuddyDeleted = (eventData: any) => {
      console.log('🗑️ DeviceEventEmitter buddy deletion received:', eventData);
      
      // Extract buddy data from the event
      const buddyData = eventData?.message || eventData;
      
      // Check if this deletion affects the current user
      // A buddy deletion affects the current user if:
      // 1. The current user was the one who had the buddy relationship (user_id)
      // 2. The current user was the buddy being deleted (buddy_user_id)
      if (buddyData?.user_id === userId || buddyData?.buddy_user_id === userId) {
        console.log('✅ Buddy deletion affects current user, processing...');
        console.log('🔍 Deleted buddy details:', {
          buddyId: buddyData.id,
          userId: buddyData.user_id,
          buddyUserId: buddyData.buddy_user_id,
          currentUserId: userId
        });
        onBuddyDeleted(buddyData);
      } else {
        console.log('❌ Buddy deletion does not affect current user, ignoring');
        console.log('🔍 Buddy deletion details:', {
          buddyId: buddyData?.id,
          userId: buddyData?.user_id,
          buddyUserId: buddyData?.buddy_user_id,
          currentUserId: userId
        });
      }
    };

    const handleBuddyCreated = (eventData: any) => {
      console.log('➕ DeviceEventEmitter buddy creation received:', eventData);
      if (onBuddyCreated) {
        onBuddyCreated(eventData);
      }
    };

    const handleBuddyUpdated = (eventData: any) => {
      console.log('🔄 DeviceEventEmitter buddy update received:', eventData);
      if (onBuddyUpdated) {
        onBuddyUpdated(eventData);
      }
    };

    // Add event listeners
    const buddyDeletedSubscription = DeviceEventEmitter.addListener('buddy-deleted', handleBuddyDeleted);
    const buddyCreatedSubscription = onBuddyCreated ? DeviceEventEmitter.addListener('buddy-created', handleBuddyCreated) : null;
    const buddyUpdatedSubscription = onBuddyUpdated ? DeviceEventEmitter.addListener('buddy-updated', handleBuddyUpdated) : null;

    // Return cleanup function
    return () => {
      console.log('🔕 Cleaning up DeviceEventEmitter buddy event listeners');
      buddyDeletedSubscription.remove();
      buddyCreatedSubscription?.remove();
      buddyUpdatedSubscription?.remove();
    };
  }
}
