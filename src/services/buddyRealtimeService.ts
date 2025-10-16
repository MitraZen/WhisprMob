// Real-time Buddy Management Service
// Handles real-time notifications for buddy operations

import { supabase } from '@/config/supabase';
import { QueryCache } from './queryCache';

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
}
