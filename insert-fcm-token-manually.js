// Manual FCM Token Insertion Script
// This script manually inserts the FCM token we already have

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; 
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertFCMTokenManually() {
  try {
    console.log('🔥 Manually inserting FCM token...');
    
    // The FCM token from your logs
    const fcmToken = 'e779rrt2Tk64ZPNo2O-uQf:APA91bEbAxQvx9DoJC4dnXx5JTGvm_kH34z0qziPjPPTNV4SkDUVpD7SGapRCaeDbJQCudRxBKTv0wXJ2N1AT6BSnz5X4GYtjVsUzc9DSZgtdNzEvwY_jAI';
    
    // Use a test user ID
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    console.log('🔥 Inserting token:', fcmToken.substring(0, 30) + '...');
    console.log('🔥 For test user:', testUserId);
    
    const { data, error } = await supabase
      .from('user_fcm_tokens')
      .upsert({
        user_id: testUserId,
        fcm_token: fcmToken,
        platform: 'android',
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Error inserting FCM token:', error);
      return;
    }
    
    console.log('✅ FCM token inserted successfully!');
    console.log('📱 You can now test the Edge Function');
    
    // Test the Edge Function immediately
    console.log('\n🔥 Testing Edge Function...');
    
    const { data: testData, error: testError } = await supabase.functions.invoke('send-fcm-notification', {
      body: {
        to: fcmToken,
        notification: {
          title: '🔥 Manual Test Notification',
          body: 'This notification was sent after manually inserting the FCM token!'
        },
        data: {
          type: 'manual_test',
          timestamp: new Date().toISOString(),
          source: 'manual_script',
          userId: testUserId
        }
      }
    });

    if (testError) {
      console.error('❌ Edge Function Test Error:', testError);
      return;
    }
    
    console.log('✅ Edge Function Test Success:', testData);
    console.log('📱 Check your device for the notification!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
insertFCMTokenManually();

