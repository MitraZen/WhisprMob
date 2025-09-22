import { SUPABASE_CONFIG } from '@/config/env';
import { User, MoodType } from '@/types';

const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

export class FlexibleDatabaseService {
  private static async request(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const defaultHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers,
    };

    const options: RequestInit = {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      if (response.status === 204) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Flexible Database request error:', error);
      throw error;
    }
  }

  // Test connection to any table
  static async testTableConnection(tableName: string): Promise<boolean> {
    try {
      const response = await this.request('GET', `${tableName}?limit=1`);
      return true;
    } catch (error) {
      console.error(`Table ${tableName} connection test failed:`, error);
      return false;
    }
  }

  // Get table structure
  static async getTableStructure(tableName: string): Promise<any[]> {
    try {
      const response = await this.request('GET', `${tableName}?limit=1`);
      if (response && response.length > 0) {
        return Object.keys(response[0]);
      }
      return [];
    } catch (error) {
      console.error(`Error getting table structure for ${tableName}:`, error);
      return [];
    }
  }

  // Flexible user creation - adapts to your table structure
  static async createUser(userData: {
    email?: string;
    mood?: MoodType;
    [key: string]: any; // Allow any additional fields
  }, tableName: string = 'user_profiles'): Promise<User | null> {
    try {
      // First, let's see what columns exist in the table
      const columns = await this.getTableStructure(tableName);
      console.log(`Available columns in ${tableName}:`, columns);

      // Build payload based on available columns
      const payload: any = {};
      
      // Map common fields
      if (columns.includes('email') && userData.email) {
        payload.email = userData.email;
      }
      if (columns.includes('mood') && userData.mood) {
        payload.mood = userData.mood;
      }
      if (columns.includes('is_online')) {
        payload.is_online = true;
      }
      if (columns.includes('last_seen')) {
        payload.last_seen = new Date().toISOString();
      }
      if (columns.includes('created_at')) {
        payload.created_at = new Date().toISOString();
      }

      // Add any additional fields from userData
      Object.keys(userData).forEach(key => {
        if (columns.includes(key) && userData[key] !== undefined) {
          payload[key] = userData[key];
        }
      });

      console.log(`Creating user with payload:`, payload);

      const data = await this.request('POST', tableName, payload);
      
      if (!data || data.length === 0) {
        return null;
      }

      const user = data[0];
      return {
        id: user.id,
        anonymousId: user.anonymous_id || user.id, // Fallback to id if no anonymous_id
        mood: user.mood,
        createdAt: new Date(user.created_at || user.createdAt || new Date()),
        lastSeen: new Date(user.last_seen || user.lastSeen || new Date()),
        email: user.email,
      };
    } catch (error) {
      console.error(`Flexible Database error creating user in ${tableName}:`, error);
      return null;
    }
  }

  // Flexible user lookup
  static async getUserById(userId: string, tableName: string = 'user_profiles'): Promise<User | null> {
    try {
      const data = await this.request('GET', `${tableName}?id=eq.${userId}`);
      
      if (!data || data.length === 0) {
        return null;
      }

      const user = data[0];
      return {
        id: user.id,
        anonymousId: user.anonymous_id || user.id,
        mood: user.mood,
        createdAt: new Date(user.created_at || user.createdAt || new Date()),
        lastSeen: new Date(user.last_seen || user.lastSeen || new Date()),
        email: user.email,
      };
    } catch (error) {
      console.error(`Flexible Database error fetching user by ID from ${tableName}:`, error);
      return null;
    }
  }

  // Flexible user lookup by email
  static async getUserByEmail(email: string, tableName: string = 'user_profiles'): Promise<User | null> {
    try {
      const data = await this.request('GET', `${tableName}?email=eq.${email}`);
      
      if (!data || data.length === 0) {
        return null;
      }

      const user = data[0];
      return {
        id: user.id,
        anonymousId: user.anonymous_id || user.id,
        mood: user.mood,
        createdAt: new Date(user.created_at || user.createdAt || new Date()),
        lastSeen: new Date(user.last_seen || user.lastSeen || new Date()),
        email: user.email,
      };
    } catch (error) {
      console.error(`Flexible Database error fetching user by email from ${tableName}:`, error);
      return null;
    }
  }

  // Update user mood
  static async updateUserMood(userId: string, mood: MoodType, tableName: string = 'user_profiles'): Promise<boolean> {
    try {
      const updateData: any = { mood };
      
      // Add last_seen if column exists
      const columns = await this.getTableStructure(tableName);
      if (columns.includes('last_seen')) {
        updateData.last_seen = new Date().toISOString();
      }

      await this.request('PATCH', `${tableName}?id=eq.${userId}`, updateData);
      return true;
    } catch (error) {
      console.error(`Flexible Database error updating user mood in ${tableName}:`, error);
      return false;
    }
  }

  // Update user online status
  static async updateUserOnlineStatus(userId: string, isOnline: boolean, tableName: string = 'user_profiles'): Promise<boolean> {
    try {
      const updateData: any = { is_online: isOnline };
      
      // Add last_seen if column exists
      const columns = await this.getTableStructure(tableName);
      if (columns.includes('last_seen')) {
        updateData.last_seen = new Date().toISOString();
      }

      await this.request('PATCH', `${tableName}?id=eq.${userId}`, updateData);
      return true;
    } catch (error) {
      console.error(`Flexible Database error updating user online status in ${tableName}:`, error);
      return false;
    }
  }

  // Determine if profile is complete based on available columns
  static async isProfileComplete(userId: string, tableName: string = 'user_profiles'): Promise<boolean> {
    try {
      const data = await this.request('GET', `${tableName}?id=eq.${userId}&limit=1`);
      if (!data || data.length === 0) return false;
      const row = data[0] || {};

      // Consider commonly expected fields
      const gender = row.gender;
      const dob = row.date_of_birth || row.dob || row.dateOfBirth;
      const country = row.country;
      const bio = row.bio;
      const profileCompleted = row.profile_completed || row.profileCompleted;

      if (typeof profileCompleted === 'boolean') {
        return profileCompleted;
      }

      // Fallback heuristic: required fields present and non-empty
      const hasGender = typeof gender === 'string' && gender.length > 0;
      const hasDob = typeof dob === 'string' && dob.length > 0;
      const hasCountry = typeof country === 'string' && country.length > 0;
      // Bio optional, do not require

      return hasGender && hasDob && hasCountry;
    } catch (error) {
      console.error('Flexible Database error checking profile completeness:', error);
      return false;
    }
  }

  // Update user profile fields and optionally set profile_completed flag
  static async updateUserProfile(userId: string, update: Record<string, any>, tableName: string = 'user_profiles'): Promise<boolean> {
    try {
      await this.request('PATCH', `${tableName}?id=eq.${userId}`, update);
      return true;
    } catch (error) {
      console.error('Flexible Database error updating user profile:', error);
      return false;
    }
  }

  // Find users by mood
  static async findUsersByMood(mood: MoodType, excludeUserId?: string, tableName: string = 'user_profiles'): Promise<User[]> {
    try {
      let url = `${tableName}?mood=eq.${mood}`;
      
      // Add online filter if column exists
      const columns = await this.getTableStructure(tableName);
      if (columns.includes('is_online')) {
        url += '&is_online=eq.true';
      }
      
      if (columns.includes('last_seen')) {
        url += '&order=last_seen.desc';
      }
      
      url += '&limit=20';
      
      if (excludeUserId) {
        url += `&id=neq.${excludeUserId}`;
      }

      const data = await this.request('GET', url);

      if (!data) {
        return [];
      }

      return data.map((user: any) => ({
        id: user.id,
        anonymousId: user.anonymous_id || user.id,
        mood: user.mood,
        createdAt: new Date(user.created_at || user.createdAt || new Date()),
        lastSeen: new Date(user.last_seen || user.lastSeen || new Date()),
        email: user.email,
      }));
    } catch (error) {
      console.error(`Flexible Database error finding users by mood in ${tableName}:`, error);
      return [];
    }
  }

  // Test connection
  static async testConnection(): Promise<boolean> {
    try {
      // Try common table names
      const commonTables = ['user_profiles', 'users', 'profiles'];
      
      for (const table of commonTables) {
        const isConnected = await this.testTableConnection(table);
        if (isConnected) {
          console.log(`Successfully connected to table: ${table}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Flexible Database connection test failed:', error);
      return false;
    }
  }
}

