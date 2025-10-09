// Test password reset with a specific user that we know exists
const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function testWithKnownUser() {
  console.log('🧪 Testing Password Reset with Known User');
  console.log('✅ We know 35 users exist in auth.users');
  
  // Test with the first user from your data
  const testEmail = 'prograktech@gmail.com';
  
  try {
    console.log(`\n🔍 Testing password reset for: ${testEmail}`);
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail.toLowerCase().trim(),
      }),
    });

    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('✅ SUCCESS! Password reset request accepted');
      console.log('📧 Check email inbox for reset link');
      console.log('📋 Response:', result);
      return true;
    } else if (response.status === 500) {
      const error = await response.json();
      console.log('❌ 500 Error - This is likely an email configuration issue');
      console.log('🔧 Error details:', error);
      console.log('\n💡 Possible causes:');
      console.log('   1. Auto Confirm Users is still enabled');
      console.log('   2. Email templates not configured');
      console.log('   3. SMTP settings missing');
      console.log('   4. Site URL not configured');
      return false;
    } else {
      const error = await response.json();
      console.log(`⚠️ Unexpected status ${response.status}:`, error);
      return false;
    }
  } catch (error) {
    console.error('💥 Network error:', error);
    return false;
  }
}

async function checkAuthSettings() {
  console.log('\n🔧 Checking auth settings...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (response.ok) {
      const settings = await response.json();
      console.log('⚙️ Current auth settings:');
      console.log(`   📧 Email enabled: ${settings.external?.email}`);
      console.log(`   🔄 Auto-confirm: ${settings.mailer_autoconfirm}`);
      console.log(`   🚫 Signup disabled: ${settings.disable_signup}`);
      
      if (settings.mailer_autoconfirm === true) {
        console.log('❌ PROBLEM: Auto-confirm is enabled - this prevents emails!');
        console.log('🔧 FIX: Go to Dashboard → Auth → Settings → Disable "Auto Confirm Users"');
      } else {
        console.log('✅ Auto-confirm is disabled - good!');
      }
    }
  } catch (error) {
    console.log('⚠️ Could not check auth settings');
  }
}

// Run tests
async function runTests() {
  await checkAuthSettings();
  console.log('\n' + '='.repeat(60));
  const success = await testWithKnownUser();
  
  if (!success) {
    console.log('\n📋 Next Steps:');
    console.log('1. Check Supabase Dashboard → Authentication → Settings');
    console.log('2. Ensure "Auto Confirm Users" is DISABLED');
    console.log('3. Check Email Templates → Reset Password is enabled');
    console.log('4. Verify Site URL is configured');
    console.log('5. Consider setting up custom SMTP');
  }
}

runTests();


