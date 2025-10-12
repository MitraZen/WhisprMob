// Simple test script for Phase 1 validation
import { supabase } from './config/supabase';

const testBasicConnection = async () => {
  try {
    console.log('🔍 Testing basic Supabase connection...');
    
    const { error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Basic connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
};

const testRealtimeSubscription = async () => {
  try {
    console.log('🔍 Testing realtime subscription...');
    
    let subscriptionSuccess = false;
    const channel = supabase
      .channel('test-channel')
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
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription successful');
          subscriptionSuccess = true;
          
          // Clean up after 2 seconds
          setTimeout(() => {
            supabase.removeChannel(channel);
            console.log('🧹 Test channel cleaned up');
          }, 2000);
        }
      });

    // Wait for subscription result
    await new Promise(resolve => setTimeout(resolve, 3000));
    return subscriptionSuccess;
  } catch (error) {
    console.error('❌ Realtime test error:', error);
    return false;
  }
};

const runPhase1Tests = async () => {
  console.log('🚀 Starting Phase 1: Supabase Realtime Tests');
  console.log('==========================================');
  
  const basicConnection = await testBasicConnection();
  const realtimeSubscription = await testRealtimeSubscription();
  
  console.log('\n📋 Test Results:');
  console.log(`  Basic Connection: ${basicConnection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Realtime Subscription: ${realtimeSubscription ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallSuccess = basicConnection && realtimeSubscription;
  console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ PHASE 1 READY' : '❌ NEEDS FIXES'}`);
  
  if (overallSuccess) {
    console.log('\n🚀 Phase 1 Complete! Ready to proceed to Phase 2.');
  } else {
    console.log('\n🔧 Please fix the issues above before proceeding.');
  }
  
  return overallSuccess;
};

export { runPhase1Tests, testBasicConnection, testRealtimeSubscription };
