import { supabase } from '@/config/supabase';

export interface OnlineStatusResult {
  isOnline: boolean;
  lastSeen: string | null;
  userId: string;
}

export class OnlineStatusService {
  /**
   * Check if a user is currently online
   */
  static async checkUserOnlineStatus(userId: string): Promise<OnlineStatusResult> {
    try {
      console.log('🔍 Checking online status for user:', userId);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_online, last_seen')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error checking online status:', error);
        return {
          isOnline: false,
          lastSeen: null,
          userId
        };
      }

      const result = {
        isOnline: data?.is_online || false,
        lastSeen: data?.last_seen || null,
        userId
      };

      console.log('🔍 Online status result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in checkUserOnlineStatus:', error);
      return {
        isOnline: false,
        lastSeen: null,
        userId
      };
    }
  }

  /**
   * Check if multiple users are online (batch check)
   */
  static async checkMultipleUsersOnlineStatus(userIds: string[]): Promise<OnlineStatusResult[]> {
    try {
      console.log('🔍 Batch checking online status for users:', userIds);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, is_online, last_seen')
        .in('id', userIds);

      if (error) {
        console.error('❌ Error batch checking online status:', error);
        return userIds.map(userId => ({
          isOnline: false,
          lastSeen: null,
          userId
        }));
      }

      const results = userIds.map(userId => {
        const userData = data?.find(d => d.id === userId);
        return {
          isOnline: userData?.is_online || false,
          lastSeen: userData?.last_seen || null,
          userId
        };
      });

      console.log('🔍 Batch online status results:', results);
      return results;
    } catch (error) {
      console.error('❌ Error in checkMultipleUsersOnlineStatus:', error);
      return userIds.map(userId => ({
        isOnline: false,
        lastSeen: null,
        userId
      }));
    }
  }

  /**
   * Check if user was recently active (within last 5 minutes)
   */
  static async isUserRecentlyActive(userId: string, minutesThreshold: number = 5): Promise<boolean> {
    try {
      const status = await this.checkUserOnlineStatus(userId);
      
      if (status.isOnline) {
        return true;
      }

      if (!status.lastSeen) {
        return false;
      }

      const lastSeenTime = new Date(status.lastSeen);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeenTime.getTime()) / (1000 * 60);

      return diffMinutes <= minutesThreshold;
    } catch (error) {
      console.error('❌ Error checking recent activity:', error);
      return false;
    }
  }
}
