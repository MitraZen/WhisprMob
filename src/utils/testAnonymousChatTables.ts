import { supabase } from '@/config/supabase';

// Simple test to check if anonymous chat tables exist
export const testAnonymousChatTables = async () => {
  try {
    console.log('🧪 Testing anonymous chat tables...');
    
    // Test whispr_chat_rooms table
    const { data: rooms, error: roomsError } = await supabase
      .from('whispr_chat_rooms')
      .select('id')
      .limit(1);
    
    if (roomsError) {
      console.error('❌ whispr_chat_rooms table error:', roomsError);
      return false;
    }
    
    console.log('✅ whispr_chat_rooms table accessible');
    
    // Test whispr_chat_participants table
    const { data: participants, error: participantsError } = await supabase
      .from('whispr_chat_participants')
      .select('id')
      .limit(1);
    
    if (participantsError) {
      console.error('❌ whispr_chat_participants table error:', participantsError);
      return false;
    }
    
    console.log('✅ whispr_chat_participants table accessible');
    
    // Test whispr_chat_messages table
    const { data: messages, error: messagesError } = await supabase
      .from('whispr_chat_messages')
      .select('id')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ whispr_chat_messages table error:', messagesError);
      return false;
    }
    
    console.log('✅ whispr_chat_messages table accessible');
    
    // Test buddy_requests table
    const { data: requests, error: requestsError } = await supabase
      .from('buddy_requests')
      .select('id')
      .limit(1);
    
    if (requestsError) {
      console.error('❌ buddy_requests table error:', requestsError);
      return false;
    }
    
    console.log('✅ buddy_requests table accessible');
    
    console.log('🎉 All anonymous chat tables are accessible!');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing tables:', error);
    return false;
  }
};
