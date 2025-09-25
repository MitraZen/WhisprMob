import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_CONFIG } from './env';

// Create a React Native compatible Supabase client
let supabase: any = null;

// React Native compatible Supabase client
console.log('🔧 Creating React Native compatible Supabase client');
console.log('Supabase URL:', SUPABASE_CONFIG.url);
console.log('Supabase Key (first 20 chars):', SUPABASE_CONFIG.anonKey.substring(0, 20) + '...');

// Create a custom Supabase client that works with React Native
supabase = {
  auth: {
    signIn: async (credentials: any) => {
      console.log('🔐 Supabase auth signIn called');
      try {
        const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        
        const data = await response.json();
        if (data.access_token) {
          await AsyncStorage.setItem('supabase.auth.token', data.access_token);
          return { data: { user: data.user, session: data }, error: null };
        } else {
          return { data: null, error: data };
        }
      } catch (error) {
        console.error('Auth signIn error:', error);
        return { data: null, error };
      }
    },
    signUp: async (credentials: any) => {
      console.log('📝 Supabase auth signUp called');
      try {
        const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
          method: 'POST',
    headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });
        
        const data = await response.json();
        return { data: { user: data.user, session: data }, error: data.error || null };
      } catch (error) {
        console.error('Auth signUp error:', error);
        return { data: null, error };
      }
    },
    signOut: async () => {
      console.log('🚪 Supabase auth signOut called');
      await AsyncStorage.removeItem('supabase.auth.token');
      return { error: null };
    },
    getSession: async () => {
      console.log('🔍 Supabase auth getSession called');
      try {
        const token = await AsyncStorage.getItem('supabase.auth.token');
        if (token) {
          return { data: { session: { access_token: token } }, error: null };
        }
        return { data: { session: null }, error: null };
      } catch (error) {
        return { data: { session: null }, error };
      }
    },
    getUser: async () => {
      console.log('👤 Supabase auth getUser called');
      try {
        const token = await AsyncStorage.getItem('supabase.auth.token');
        if (token) {
          // You could decode the JWT token here to get user info
          return { data: { user: { id: 'user-id', email: 'user@example.com' } }, error: null };
        }
        return { data: { user: null }, error: null };
      } catch (error) {
        return { data: { user: null }, error };
      }
    },
    onAuthStateChange: (callback: any) => {
      console.log('🔄 Supabase auth onAuthStateChange called');
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from: (table: string) => {
    // Create a query builder that supports method chaining
    const createQueryBuilder = (baseUrl: string, filters: any[] = []) => {
      const queryBuilder = {
        eq: (column: string, value: any) => {
          console.log(`🔍 Supabase eq(${column}, ${value}) called`);
          filters.push(`${column}=eq.${value}`);
          console.log(`🔍 Filters after eq:`, filters);
          return queryBuilder;
        },
        order: (column: string, options: any = {}) => {
          console.log(`📋 Supabase order(${column}) called with options:`, options);
          const direction = options.ascending === false ? 'desc' : 'asc';
          filters.push(`order=${column}.${direction}`);
          console.log(`📋 Filters after order:`, filters);
          return queryBuilder;
        },
        limit: (count: number) => {
          console.log(`📏 Supabase limit(${count}) called`);
          filters.push(`limit=${count}`);
          console.log(`📏 Filters after limit:`, filters);
          return queryBuilder;
        },
        then: async (resolve: any, reject: any) => {
          try {
            const queryString = filters.length > 0 ? `&${filters.join('&')}` : '';
            const url = `${baseUrl}${queryString}`;
            const token = await AsyncStorage.getItem('supabase.auth.token');
            
            console.log(`📊 Making request to: ${url}`);
            
            const response = await fetch(url, {
              headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
              },
            });
            
            const data = await response.json();
            console.log(`📊 Supabase query result for ${table}:`, data);
            resolve({ data, error: null });
          } catch (error) {
            console.error(`📊 Supabase query error for ${table}:`, error);
            reject({ data: null, error });
          }
        }
      };
      return queryBuilder;
    };

    return {
      select: (columns = '*') => {
        console.log(`📊 Supabase from(${table}).select(${columns}) called`);
        const baseUrl = `${SUPABASE_CONFIG.url}/rest/v1/${table}?select=${columns}`;
        return createQueryBuilder(baseUrl);
      },
      insert: (data: any) => {
        console.log(`➕ Supabase from(${table}).insert() called`);
        return {
          then: async (resolve: any, reject: any) => {
            try {
              const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
              const token = await AsyncStorage.getItem('supabase.auth.token');
              
              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_CONFIG.anonKey,
                  'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
              });
              
              const result = await response.json();
              console.log(`➕ Supabase insert result for ${table}:`, result);
              resolve({ data: result, error: null });
            } catch (error) {
              console.error(`➕ Supabase insert error for ${table}:`, error);
              reject({ data: null, error });
            }
          }
        };
      },
      update: (data: any) => {
        console.log(`✏️ Supabase from(${table}).update() called`);
        const updateBuilder = createQueryBuilder(`${SUPABASE_CONFIG.url}/rest/v1/${table}`, []);
        updateBuilder.then = async (resolve: any, reject: any) => {
          try {
            const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
            const token = await AsyncStorage.getItem('supabase.auth.token');
            
            const response = await fetch(url, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            });
            
            const result = await response.json();
            console.log(`✏️ Supabase update result for ${table}:`, result);
            resolve({ data: result, error: null });
          } catch (error) {
            console.error(`✏️ Supabase update error for ${table}:`, error);
            reject({ data: null, error });
          }
        };
        return updateBuilder;
      },
      delete: () => {
        console.log(`🗑️ Supabase from(${table}).delete() called`);
        const deleteBuilder = createQueryBuilder(`${SUPABASE_CONFIG.url}/rest/v1/${table}`, []);
        deleteBuilder.then = async (resolve: any, reject: any) => {
          try {
            const url = `${SUPABASE_CONFIG.url}/rest/v1/${table}`;
            const token = await AsyncStorage.getItem('supabase.auth.token');
            
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
              },
            });
            
            const result = await response.json();
            console.log(`🗑️ Supabase delete result for ${table}:`, result);
            resolve({ data: result, error: null });
          } catch (error) {
            console.error(`🗑️ Supabase delete error for ${table}:`, error);
            reject({ data: null, error });
          }
        };
        return deleteBuilder;
      },
    };
  },
  rpc: (functionName: string, params: any = {}) => {
    console.log(`🔧 Supabase rpc(${functionName}) called with params:`, params);
    return {
      then: async (resolve: any, reject: any) => {
        try {
          const url = `${SUPABASE_CONFIG.url}/rest/v1/rpc/${functionName}`;
          const token = await AsyncStorage.getItem('supabase.auth.token');
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_CONFIG.anonKey,
              'Authorization': token ? `Bearer ${token}` : `Bearer ${SUPABASE_CONFIG.anonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
          });
          
          const result = await response.json();
          console.log(`🔧 Supabase RPC result for ${functionName}:`, result);
          resolve({ data: result, error: null });
        } catch (error) {
          console.error(`🔧 Supabase RPC error for ${functionName}:`, error);
          reject({ data: null, error });
        }
      }
    };
  },
  channel: (name: string) => ({
    on: (event: string, filter: any, callback: any) => {
      console.log(`📡 Supabase channel(${name}).on(${event}) called`);
      return { subscribe: () => ({ status: 'SUBSCRIBED' }) };
    },
    subscribe: () => {
      console.log(`📡 Supabase channel(${name}).subscribe() called`);
      return { status: 'SUBSCRIBED' };
    },
  }),
  removeChannel: (channel: any) => {
    console.log('📡 Supabase removeChannel called');
  },
};

console.log('✅ React Native compatible Supabase client created successfully');

export { supabase };

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
