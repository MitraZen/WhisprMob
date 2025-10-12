// Quick validation test for Supabase Realtime
const validateSupabaseRealtime = async () => {
  try {
    console.log('🔍 Validating Supabase Realtime connection...');
    
    // Test basic Supabase connection
    const { supabase } = await import('@/config/supabase');
    
    // Test 1: Basic connection
    const { error: connectionError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
      
    if (connectionError) {
      console.error('❌ Basic connection failed:', connectionError);
      return false;
    }
    
    console.log('✅ Basic Supabase connection successful');
    
    // Test 2: Check if realtime is available
    try {
      const channel = supabase
        .channel('validation-test')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        }, (payload) => {
          console.log('✅ Realtime test successful:', payload);
        })
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime is available and working');
            // Clean up test channel
            setTimeout(() => {
              supabase.removeChannel(channel);
            }, 2000);
          }
        });
        
      return true;
    } catch (realtimeError) {
      console.error('❌ Realtime test failed:', realtimeError);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
};

// Export for testing
export { validateSupabaseRealtime };
