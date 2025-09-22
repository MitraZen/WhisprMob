import { SUPABASE_CONFIG } from '@/config/env';
import { User, MoodType } from '@/types';

// Simple HTTP-based database service to bypass Supabase client protocol issues
export class HttpDatabaseService {
  private static getHeaders() {
    return {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };
  }

  // User operations using direct HTTP requests
  static async createUser(userData: {
    anonymousId: string;
    mood: MoodType;
  }): Promise<User | null> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          anonymous_id: userData.anonymousId,
          mood: userData.mood,
          is_online: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating user:', errorText);
        return null;
      }

      const data = await response.json();
      return {
        id: data[0].id,
        anonymousId: data[0].anonymous_id,
        mood: data[0].mood as MoodType,
        createdAt: new Date(data[0].created_at),
        lastSeen: new Date(data[0].last_seen),
      };
    } catch (error) {
      console.error('HTTP Database error creating user:', error);
      return null;
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Error fetching user:', await response.text());
        return null;
      }

      const data = await response.json();
      if (data.length === 0) return null;

      return {
        id: data[0].id,
        anonymousId: data[0].anonymous_id,
        mood: data[0].mood as MoodType,
        createdAt: new Date(data[0].created_at),
        lastSeen: new Date(data[0].last_seen),
      };
    } catch (error) {
      console.error('HTTP Database error fetching user:', error);
      return null;
    }
  }

  static async updateUserMood(userId: string, mood: MoodType): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          mood,
          last_seen: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Error updating user mood:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('HTTP Database error updating user mood:', error);
      return false;
    }
  }

  static async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Error updating user online status:', await response.text());
        return false;
      }

      return true;
    } catch (error) {
      console.error('HTTP Database error updating user online status:', error);
      return false;
    }
  }

  static async findUsersByMood(mood: MoodType, excludeUserId?: string): Promise<User[]> {
    try {
      let url = `${SUPABASE_CONFIG.url}/rest/v1/user_profiles?mood=eq.${mood}&is_online=eq.true&order=last_seen.desc&limit=20`;
      
      if (excludeUserId) {
        url += `&id=neq.${excludeUserId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Error finding users by mood:', await response.text());
        return [];
      }

      const data = await response.json();
      return data.map((user: any) => ({
        id: user.id,
        anonymousId: user.anonymous_id,
        mood: user.mood as MoodType,
        createdAt: new Date(user.created_at),
        lastSeen: new Date(user.last_seen),
      }));
    } catch (error) {
      console.error('HTTP Database error finding users by mood:', error);
      return [];
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?limit=1`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Database connection test failed:', await response.text());
        return false;
      }

      console.log('HTTP Database connection successful!');
      return true;
    } catch (error) {
      console.error('HTTP Database connection test error:', error);
      return false;
    }
  }
}

export default HttpDatabaseService;
