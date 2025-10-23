// Manual FCM Token Generation Script
// Run this to manually generate FCM tokens for testing

import { notificationService } from '@/services/notificationService';
import { supabase } from '@/config/supabase';

const generateFCMTokens = async () => {
  try {
    console.log('🔔 Starting FCM token generation...');
    
    // Initialize notification service
    console.log('🔔 Initializing notification service...');
    await notificationService.initialize();
    
    // Wait for token to be saved
    console.log('🔔 Waiting for token to be saved...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if token was saved
    console.log('🔔 Checking saved tokens...');
    const { data: tokens, error } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token, user_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ No FCM tokens found. Please ensure notifications are enabled in device settings.');
    } else {
      console.log('✅ FCM tokens found:');
      tokens.forEach((token, index) => {
        console.log(`Token ${index + 1}:`);
        console.log(`  - FCM Token: ${token.fcm_token.substring(0, 30)}...`);
        console.log(`  - User ID: ${token.user_id}`);
        console.log(`  - Created: ${new Date(token.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating FCM tokens:', error);
  }
};

// Export for use in React Native
export { generateFCMTokens };

// Run if this file is executed directly
if (typeof window === 'undefined') {
  generateFCMTokens();
}

