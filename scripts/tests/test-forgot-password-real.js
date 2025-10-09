// Test forgot password with real user email
// First run test-with-real-user.sql to get a real email address

const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function testForgotPasswordWithRealUser(email) {
  console.log('🔍 Testing forgot password for REAL user:', email);
  
  try {
    // First, check if user exists in auth.users
    console.log('\n1️⃣ Checking if user exists in auth.users...');
    const userCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/auth.users?email=eq.${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (userCheckResponse.ok) {
      const users = await userCheckResponse.json();
      console.log('👤 Users found in auth.users:', users.length);
      if (users.length > 0) {
        console.log('✅ User exists:', users[0].email);
      } else {
        console.log('❌ User NOT found in auth.users - this is the problem!');
        return { success: false, error: 'User not found in auth.users' };
      }
    } else {
      console.log('⚠️ Could not check auth.users (might be restricted)');
    }

    // Now test password reset
    console.log('\n2️⃣ Sending password reset request...');
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
    
    if (Object.keys(result).length === 0) {
      console.log('⚠️ Empty response - this usually means:');
      console.log('   - User does not exist in auth.users');
      console.log('   - Email is not confirmed');
      console.log('   - Rate limiting is active');
      console.log('   - SMTP is not configured');
    } else {
      console.log('🎉 Password reset email should be sent!');
    }
    
    return { success: true, result };
  } catch (error) {
    console.error('💥 Network error:', error);
    return { success: false, error: error.message };
  }
}

async function checkUserProfiles() {
  console.log('\n3️⃣ Checking user_profiles for test emails...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=email,username&limit=5`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const profiles = await response.json();
      console.log('📋 Sample user_profiles emails:');
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.email} (${profile.username})`);
      });
      
      if (profiles.length > 0) {
        console.log(`\n💡 Try testing with: ${profiles[0].email}`);
        return profiles[0].email;
      }
    } else {
      console.log('❌ Could not fetch user_profiles');
    }
  } catch (error) {
    console.error('💥 Error checking user_profiles:', error);
  }
  
  return null;
}

// Main test function
async function runRealUserTest() {
  console.log('🚀 Testing Forgot Password with Real Users\n');
  
  // First, get a real email from user_profiles
  const testEmail = await checkUserProfiles();
  
  if (testEmail) {
    console.log('\n' + '='.repeat(60));
    await testForgotPasswordWithRealUser(testEmail);
  } else {
    console.log('❌ No test email found. Please run the SQL script first.');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Run: test-with-real-user.sql in Supabase SQL Editor');
  console.log('2. If no users in auth.users, run: fix-auth-users-import-conflict-v2.sql');
  console.log('3. Check Supabase Dashboard → Authentication → Settings');
  console.log('4. Disable "Auto Confirm Users"');
  console.log('5. Check email templates are configured');
}

// Run the test
runRealUserTest().catch(console.error);


