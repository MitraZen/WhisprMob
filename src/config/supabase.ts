import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from './env';

// Create Supabase client with realtime ENABLED and WebSocket polyfill
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
  realtime: {
    // Enable realtime with WebSocket polyfill support
    enabled: true,
    params: {
      eventsPerSecond: 10, // Rate limiting for performance
    },
  },
});

// Database table names (actual tables in use)
export const TABLES = {
  USERS: 'user_profiles',
  MESSAGES: 'buddy_messages', // Updated to actual table name
  NOTES: 'whispr_notes', // Added actual table name
  BUDDIES: 'buddies', // Added actual table name
  CHATS: 'chats',
  MOODS: 'moods',
  CONNECTIONS: 'connections',
} as const;

// Database types (actual schema in use)
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          anonymous_id: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          mood: string;
          created_at: string;
          updated_at: string;
          is_online: boolean;
        };
        Insert: {
          id?: string;
          anonymous_id: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          mood: string;
          created_at?: string;
          updated_at?: string;
          is_online?: boolean;
        };
        Update: {
          id?: string;
          anonymous_id?: string;
          display_name?: string;
          username?: string;
          avatar_url?: string;
          mood?: string;
          created_at?: string;
          updated_at?: string;
          is_online?: boolean;
        };
      };
      buddy_messages: {
        Row: {
          id: string;
          buddy_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          message_type: string;
          timestamp: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buddy_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          message_type?: string;
          timestamp?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buddy_id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          message_type?: string;
          timestamp?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      whispr_notes: {
        Row: {
          id: string;
          sender_id: string;
          content: string;
          mood: string;
          status: string;
          propagation_count: number;
          is_active: boolean;
          expires_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          content: string;
          mood: string;
          status?: string;
          propagation_count?: number;
          is_active?: boolean;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          content?: string;
          mood?: string;
          status?: string;
          propagation_count?: number;
          is_active?: boolean;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      buddies: {
        Row: {
          id: string;
          user_id: string;
          buddy_user_id: string;
          name: string;
          initials: string;
          avatar_url?: string;
          is_pinned: boolean;
          is_online: boolean;
          status: string;
          mood?: string;
          last_message?: string;
          last_message_time?: string;
          unread_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          buddy_user_id: string;
          name: string;
          initials: string;
          avatar_url?: string;
          is_pinned?: boolean;
          is_online?: boolean;
          status?: string;
          mood?: string;
          last_message?: string;
          last_message_time?: string;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          buddy_user_id?: string;
          name?: string;
          initials?: string;
          avatar_url?: string;
          is_pinned?: boolean;
          is_online?: boolean;
          status?: string;
          mood?: string;
          last_message?: string;
          last_message_time?: string;
          unread_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export default supabase;
