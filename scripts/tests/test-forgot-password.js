// Test script for forgot password functionality
// Run this with: node test-forgot-password.js

const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function testForgotPassword(email) {
  console.log('🔍 Testing forgot password for:', email);
  console.log('📡 Supabase URL:', SUPABASE_URL);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
      }),
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Password reset request failed:', errorData);
      return { success: false, error: errorData };
    }

    const result = await response.json();
    console.log('✅ Password reset response:', result);
    
    return { success: true, result };
  } catch (error) {
    console.error('💥 Network error:', error);
    return { success: false, error: error.message };
  }
}

async function testAuthSettings() {
  console.log('\n🔧 Testing auth settings...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    console.log('📊 Auth Settings Status:', response.status);

    if (response.ok) {
      const settings = await response.json();
      console.log('⚙️ Auth Settings:', JSON.stringify(settings, null, 2));
      
      // Check important settings
      if (settings.external_email_enabled !== undefined) {
        console.log('📧 Email enabled:', settings.external_email_enabled);
      }
      if (settings.mailer_autoconfirm !== undefined) {
        console.log('🔄 Auto-confirm:', settings.mailer_autoconfirm);
      }
    } else {
      console.error('❌ Failed to get auth settings');
    }
  } catch (error) {
    console.error('💥 Error getting auth settings:', error);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Forgot Password Tests\n');
  
  // Test auth settings first
  await testAuthSettings();
  
  console.log('\n' + '='.repeat(50));
  
  // Test with a real email (replace with your test email)
  const testEmail = 'your-actual-email@example.com'; // Replace with your actual email
  await testForgotPassword(testEmail);
  
  console.log('\n🔄 Testing again after 2 seconds...');
  setTimeout(async () => {
    await testForgotPassword(testEmail);
  }, 2000);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check your Supabase Dashboard → Authentication → Settings');
  console.log('2. Verify email templates are configured');
  console.log('3. Check if SMTP is properly set up');
  console.log('4. Look for emails in spam/junk folder');
  console.log('5. Try with a different email provider');
}

// Run the tests
runTests().catch(console.error);
