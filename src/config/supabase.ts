import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from './env';

// Create Supabase client with minimal configuration to avoid protocol issues
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'whispr-mobile-app',
    },
  },
});

// Database table names (should match your website)
export const TABLES = {
  USERS: 'user_profiles',
  MESSAGES: 'messages',
  CHATS: 'chats',
  MOODS: 'moods',
  CONNECTIONS: 'connections',
} as const;

// Database types (should match your website schema)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          anonymous_id: string;
          mood: string;
          created_at: string;
          last_seen: string;
          is_online: boolean;
        };
        Insert: {
          id?: string;
          anonymous_id: string;
          mood: string;
          created_at?: string;
          last_seen?: string;
          is_online?: boolean;
        };
        Update: {
          id?: string;
          anonymous_id?: string;
          mood?: string;
          created_at?: string;
          last_seen?: string;
          is_online?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          timestamp: string;
          is_encrypted: boolean;
          mood?: string;
          chat_id: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          timestamp?: string;
          is_encrypted?: boolean;
          mood?: string;
          chat_id: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          timestamp?: string;
          is_encrypted?: boolean;
          mood?: string;
          chat_id?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          participants: string[];
          created_at: string;
          last_message_id?: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          participants: string[];
          created_at?: string;
          last_message_id?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          participants?: string[];
          created_at?: string;
          last_message_id?: string;
          is_active?: boolean;
        };
      };
    };
  };
}

export default supabase;
