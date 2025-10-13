// Test realtime subscription manually
import { supabase } from '@/config/supabase';

export const testRealtimeSubscription = async (userId: string) => {
  console.log('🧪 Testing realtime subscription manually...');
  
  try {
    // Test 1: Check if supabase client is available
    console.log('🧪 Supabase client available:', !!supabase);
    
    // Test 2: Test basic connection
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    console.log('🧪 Basic connection test:', { data, error });
    
    // Test 3: Create a test subscription
    const testChannel = supabase
      .channel(`test-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🧪 TEST SUBSCRIPTION TRIGGERED:', payload);
        }
      )
      .subscribe((status) => {
        console.log('🧪 Test subscription status:', status);
      });
    
    console.log('🧪 Test subscription created');
    
    // Test 4: Check if we can see any existing messages
    const { data: messages, error: messagesError } = await supabase
      .from('buddy_messages')
      .select('*')
      .eq('receiver_id', userId)
      .limit(5);
    
    console.log('🧪 Existing messages for user:', { messages, messagesError });
    console.log('🧪 Messages error details:', messagesError);
    
    // Test 4.5: Check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%message%');
    
    console.log('🧪 Tables with "message" in name:', { tables, tablesError });
    
    // Test 4.6: Check what columns exist in buddy_messages table
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'buddy_messages');
    
    console.log('🧪 Columns in buddy_messages table:', { columns, columnsError });
    
    // Test 5: Check subscription status after a delay
    setTimeout(() => {
      console.log('🧪 Test subscription status after delay:', testChannel.state);
      supabase.removeChannel(testChannel);
    }, 5000);
    
    return { success: true, message: 'Test subscription created' };
    
  } catch (error) {
    console.error('🧪 Test subscription failed:', error);
    return { success: false, error: error.message };
  }
};

// Test notification service directly
export const testNotificationDirectly = async () => {
  console.log('🧪 Testing notification service directly...');
  
  try {
    const { notificationService } = await import('@/services/notificationService');
    
    const result = await notificationService.showMessageNotification(
      'Test Notification',
      'This is a direct test of the notification system',
      'Test Buddy'
    );
    
    console.log('🧪 Direct notification test result:', result);
    return result;
  } catch (error) {
    console.error('🧪 Direct notification test failed:', error);
    throw error;
  }
};
