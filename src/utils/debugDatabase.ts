// Test function to debug database issues
// Add this to your BuddiesService temporarily

import { SUPABASE_CONFIG } from '@/config/env';

export const debugDatabase = {
  // Test basic database connection
  async testConnection(): Promise<void> {
    try {
      console.log('=== TESTING DATABASE CONNECTION ===');
      
      // Test 1: Check if we can connect to Supabase
      const testResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Supabase connection test:', testResponse.ok ? 'SUCCESS' : 'FAILED');
      
      // Test 2: Check buddies table
      const buddiesResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/buddies?select=*&limit=5`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      const buddiesData = await buddiesResponse.json();
      console.log('Buddies table test:', buddiesResponse.ok ? 'SUCCESS' : 'FAILED');
      console.log('Buddies count:', buddiesData.length);
      console.log('Sample buddy:', buddiesData[0]);
      
      // Test 3: Check buddy_messages table
      const messagesResponse = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/buddy_messages?select=*&limit=5`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      const messagesData = await messagesResponse.json();
      console.log('Messages table test:', messagesResponse.ok ? 'SUCCESS' : 'FAILED');
      console.log('Messages count:', messagesData.length);
      console.log('Sample message:', messagesData[0]);
      
      console.log('=== END DATABASE CONNECTION TEST ===');
    } catch (error) {
      console.error('Database connection test failed:', error);
    }
  },

  // Test RPC function
  async testRPCFunction(): Promise<void> {
    try {
      console.log('=== TESTING RPC FUNCTION ===');
      
      // Test if the function exists by calling it with dummy data
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/send_buddy_message`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buddy_id_param: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          content: 'test',
          message_type: 'text',
          user_id_param: '00000000-0000-0000-0000-000000000000' // Dummy UUID
        }),
      });
      
      console.log('RPC function test response:', response.status);
      const responseText = await response.text();
      console.log('RPC function test response text:', responseText);
      
      console.log('=== END RPC FUNCTION TEST ===');
    } catch (error) {
      console.error('RPC function test failed:', error);
    }
  }
};
