// Manual FCM Token Generation Script
// This script helps generate FCM tokens manually for testing

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; 
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkFCMTokens() {
  try {
    console.log('🔍 Checking existing FCM tokens...');
    
    const { data: tokens, error } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token, user_id, created_at, platform')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ No FCM tokens found in database.');
      console.log('📱 To generate FCM tokens:');
      console.log('   1. Open your app');
      console.log('   2. Go to Profile screen');
      console.log('   3. Tap "🔔 Enable Notifications"');
      console.log('   4. Allow notification permissions');
      console.log('   5. Run this script again');
    } else {
      console.log(`✅ Found ${tokens.length} FCM token(s):`);
      tokens.forEach((token, index) => {
        console.log(`\nToken ${index + 1}:`);
        console.log(`  - FCM Token: ${token.fcm_token.substring(0, 30)}...`);
        console.log(`  - User ID: ${token.user_id}`);
        console.log(`  - Platform: ${token.platform}`);
        console.log(`  - Created: ${new Date(token.created_at).toLocaleString()}`);
      });
      
      console.log('\n🧪 You can now test the Edge Function using these tokens!');
    }
    
  } catch (error) {
    console.error('❌ Error checking FCM tokens:', error);
  }
}

async function testEdgeFunctionWithToken() {
  try {
    console.log('🔥 Testing Edge Function with existing token...');
    
    // Get the most recent token
    const { data: tokens, error: tokenError } = await supabase
      .from('user_fcm_tokens')
      .select('fcm_token, user_id')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (tokenError) {
      throw new Error('Failed to fetch FCM tokens: ' + tokenError.message);
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('❌ No FCM tokens found. Please generate tokens first.');
      return;
    }
    
    const testToken = tokens[0].fcm_token;
    const userId = tokens[0].user_id;
    
    console.log('🔥 Using FCM token:', testToken.substring(0, 20) + '...');
    
    const { data, error } = await supabase.functions.invoke('send-fcm-notification', {
      body: {
        to: testToken,
        notification: {
          title: '🔥 Terminal Test Notification',
          body: 'This notification was sent from the terminal via Edge Function!'
        },
        data: {
          type: 'terminal_test',
          timestamp: new Date().toISOString(),
          source: 'terminal_script',
          userId: userId
        }
      }
    });

    if (error) {
      console.error('❌ Edge Function Error:', error);
      return;
    }
    
    console.log('✅ Edge Function Success:', data);
    console.log('📱 Check your device for the notification!');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 FCM Token Management Script');
  console.log('=============================\n');
  
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      await checkFCMTokens();
      break;
    case 'test':
      await testEdgeFunctionWithToken();
      break;
    default:
      console.log('Usage:');
      console.log('  node check-fcm-tokens.js check  - Check existing FCM tokens');
      console.log('  node check-fcm-tokens.js test   - Test Edge Function with existing token');
      console.log('\nFirst, update the SUPABASE_URL and SUPABASE_ANON_KEY in this script.');
  }
}

main();

