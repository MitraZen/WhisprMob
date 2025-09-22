import { SUPABASE_CONFIG } from '@/config/env';
import { User, MoodType } from '@/types';

// HTTP-based authentication service for Supabase
export class AuthService {
  private static getHeaders() {
    return {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };
  }

  // Sign up with email and password
  static async signUp(email: string, password: string, mood: MoodType): Promise<{ user: User | null; error: string | null }> {
    try {
      // First, sign up the user with Supabase Auth
      const authResponse = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        return { user: null, error: errorData.msg || 'Sign up failed' };
      }

      const authData = await authResponse.json();
      
      if (!authData.user) {
        return { user: null, error: 'User creation failed' };
      }

      // Create user profile in our user_profiles table
      const profileResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          mood: mood,
          is_online: true,
        }),
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Profile creation error:', errorText);
        return { user: null, error: 'Profile creation failed' };
      }

      const profileData = await profileResponse.json();
      
      const user: User = {
        id: authData.user.id,
        anonymousId: `user_${authData.user.id.substring(0, 8)}`,
        mood: mood,
        createdAt: new Date(profileData[0].created_at),
        lastSeen: new Date(profileData[0].last_seen),
      };

      return { user, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { user: null, error: errorData.msg || 'Sign in failed' };
      }

      const authData = await response.json();
      
      if (!authData.user) {
        return { user: null, error: 'Authentication failed' };
      }

      // Get user profile from our user_profiles table
      const profileResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${authData.user.id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!profileResponse.ok) {
        return { user: null, error: 'Profile fetch failed' };
      }

      const profileData = await profileResponse.json();
      
      if (profileData.length === 0) {
        return { user: null, error: 'User profile not found' };
      }

      const user: User = {
        id: authData.user.id,
        anonymousId: profileData[0].anonymous_id || `user_${authData.user.id.substring(0, 8)}`,
        mood: profileData[0].mood as MoodType,
        createdAt: new Date(profileData[0].created_at),
        lastSeen: new Date(profileData[0].last_seen),
      };

      // Update online status
      await this.updateOnlineStatus(authData.user.id, true);

      return { user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Sign out
  static async signOut(): Promise<{ success: boolean; error: string | null }> {
    try {
      // Update online status to false
      // Note: We'd need the user ID for this, but for now we'll just return success
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update user online status
  static async updateOnlineStatus(userId: string, isOnline: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Update online status error:', error);
      return false;
    }
  }

  // Update user mood
  static async updateMood(userId: string, mood: MoodType): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          mood: mood,
          last_seen: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Update mood error:', error);
      return false;
    }
  }

  // Test authentication connection
  static async testAuthConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Auth connection test error:', error);
      return false;
    }
  }
}

export default AuthService;
