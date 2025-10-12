// Phase 1: Supabase Realtime Connection Test
// This script validates that Supabase Realtime is working correctly

import { supabase } from '@/config/supabase';
import { realtimeService } from '@/services/realtimeService';

export const testSupabaseRealtime = async (): Promise<{
  success: boolean;
  results: {
    basicConnection: boolean;
    realtimeSubscription: boolean;
    serviceInitialization: boolean;
  };
  errors: string[];
}> => {
  const results = {
    basicConnection: false,
    realtimeSubscription: false,
    serviceInitialization: false,
  };
  const errors: string[] = [];

  console.log('🧪 Starting Supabase Realtime validation tests...');

  // Test 1: Basic Supabase Connection
  try {
    console.log('🔍 Test 1: Basic Supabase connection...');
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      errors.push(`Basic connection failed: ${error.message}`);
      console.error('❌ Basic connection failed:', error);
    } else {
      results.basicConnection = true;
      console.log('✅ Basic Supabase connection successful');
    }
  } catch (error) {
    errors.push(`Basic connection error: ${error}`);
    console.error('❌ Basic connection error:', error);
  }

  // Test 2: Realtime Subscription Test
  try {
    console.log('🔍 Test 2: Realtime subscription test...');
    
    let subscriptionSuccess = false;
    const testChannel = supabase
      .channel('realtime-test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('📡 Realtime event received:', payload);
          subscriptionSuccess = true;
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          results.realtimeSubscription = true;
          console.log('✅ Realtime subscription successful');
          
          // Clean up test channel after 3 seconds
          setTimeout(() => {
            supabase.removeChannel(testChannel);
            console.log('🧹 Test channel cleaned up');
          }, 3000);
        } else if (status === 'CHANNEL_ERROR') {
          errors.push('Realtime subscription failed with CHANNEL_ERROR');
          console.error('❌ Realtime subscription failed');
        }
      });

    // Wait for subscription result
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    errors.push(`Realtime subscription error: ${error}`);
    console.error('❌ Realtime subscription error:', error);
  }

  // Test 3: RealtimeService Initialization
  try {
    console.log('🔍 Test 3: RealtimeService initialization...');
    
    // Use a test user ID
    const testUserId = 'test-user-realtime-validation';
    const initResult = await realtimeService.initialize(testUserId);
    
    if (initResult) {
      results.serviceInitialization = true;
      console.log('✅ RealtimeService initialization successful');
      
      // Test connection status
      const status = realtimeService.getConnectionStatus();
      console.log('📊 Connection status:', status);
      
      // Clean up
      await realtimeService.disconnect();
      console.log('🧹 RealtimeService cleaned up');
    } else {
      errors.push('RealtimeService initialization failed');
      console.error('❌ RealtimeService initialization failed');
    }
  } catch (error) {
    errors.push(`RealtimeService error: ${error}`);
    console.error('❌ RealtimeService error:', error);
  }

  // Summary
  const success = results.basicConnection && results.realtimeSubscription && results.serviceInitialization;
  
  console.log('📋 Test Results Summary:');
  console.log(`  Basic Connection: ${results.basicConnection ? '✅' : '❌'}`);
  console.log(`  Realtime Subscription: ${results.realtimeSubscription ? '✅' : '❌'}`);
  console.log(`  Service Initialization: ${results.serviceInitialization ? '✅' : '❌'}`);
  console.log(`  Overall Success: ${success ? '✅' : '❌'}`);
  
  if (errors.length > 0) {
    console.log('❌ Errors encountered:');
    errors.forEach(error => console.log(`  - ${error}`));
  }

  return {
    success,
    results,
    errors
  };
};

// Test specific table subscriptions
export const testTableSubscriptions = async (): Promise<{
  buddyMessages: boolean;
  whisprNotes: boolean;
}> => {
  console.log('🔍 Testing specific table subscriptions...');
  
  const results = {
    buddyMessages: false,
    whisprNotes: false,
  };

  try {
    // Test buddy_messages subscription
    const messagesChannel = supabase
      .channel('test-buddy-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_messages',
          filter: 'receiver_id=eq.test-user'
        },
        (payload) => {
          console.log('📨 Buddy message event:', payload);
          results.buddyMessages = true;
        }
      )
      .subscribe((status) => {
        console.log('📨 Buddy messages subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Buddy messages subscription successful');
          setTimeout(() => supabase.removeChannel(messagesChannel), 2000);
        }
      });

    // Test whispr_notes subscription
    const notesChannel = supabase
      .channel('test-whispr-notes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whispr_notes',
          filter: 'sender_id=neq.test-user'
        },
        (payload) => {
          console.log('📝 Whispr note event:', payload);
          results.whisprNotes = true;
        }
      )
      .subscribe((status) => {
        console.log('📝 Whispr notes subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Whispr notes subscription successful');
          setTimeout(() => supabase.removeChannel(notesChannel), 2000);
        }
      });

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.error('❌ Table subscription test error:', error);
  }

  return results;
};

// Performance test
export const testRealtimePerformance = async (): Promise<{
  connectionTime: number;
  subscriptionTime: number;
  eventLatency: number;
}> => {
  console.log('⚡ Testing realtime performance...');
  
  const startTime = Date.now();
  let connectionTime = 0;
  let subscriptionTime = 0;
  let eventLatency = 0;

  try {
    // Test connection time
    const connectionStart = Date.now();
    await supabase.from('user_profiles').select('id').limit(1);
    connectionTime = Date.now() - connectionStart;

    // Test subscription time
    const subscriptionStart = Date.now();
    const perfChannel = supabase
      .channel('performance-test')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles'
      }, (payload) => {
        eventLatency = Date.now() - subscriptionStart;
        console.log('⚡ Event latency:', eventLatency, 'ms');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscriptionTime = Date.now() - subscriptionStart;
          console.log('⚡ Subscription time:', subscriptionTime, 'ms');
          
          // Clean up
          setTimeout(() => supabase.removeChannel(perfChannel), 1000);
        }
      });

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ Performance test error:', error);
  }

  console.log('⚡ Performance Results:');
  console.log(`  Connection Time: ${connectionTime}ms`);
  console.log(`  Subscription Time: ${subscriptionTime}ms`);
  console.log(`  Event Latency: ${eventLatency}ms`);

  return {
    connectionTime,
    subscriptionTime,
    eventLatency
  };
};

export default {
  testSupabaseRealtime,
  testTableSubscriptions,
  testRealtimePerformance
};
