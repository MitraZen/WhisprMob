// Verify SMTP setup and test password reset
const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function verifySmtpSetup() {
  console.log('🔍 VERIFYING SMTP SETUP');
  console.log('======================\n');

  // Test 1: Check current auth settings
  console.log('1️⃣ Checking auth configuration...');
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
      console.log('✅ Auth settings retrieved');
      console.log(`   📧 Email enabled: ${settings.external?.email}`);
      console.log(`   🔄 Auto-confirm: ${settings.mailer_autoconfirm}`);
      console.log(`   🚫 Signup disabled: ${settings.disable_signup}`);
      
      // Check if there are any SMTP-related settings visible
      if (settings.smtp_host || settings.mailer_host) {
        console.log('✅ SMTP configuration detected');
        console.log(`   📮 SMTP Host: ${settings.smtp_host || settings.mailer_host || 'Not visible'}`);
      } else {
        console.log('⚠️ No SMTP configuration visible in API response');
        console.log('   (This is normal - SMTP settings are usually private)');
      }
    } else {
      console.log('❌ Could not fetch auth settings');
    }
  } catch (error) {
    console.log(`💥 Error fetching auth settings: ${error.message}`);
  }

  // Test 2: Test password reset with a known user
  console.log('\n2️⃣ Testing password reset...');
  const testEmail = 'prograktech@gmail.com';
  
  try {
    console.log(`   📧 Testing with: ${testEmail}`);
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
      }),
    });

    console.log(`   📊 Response Status: ${response.status}`);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('   ✅ SUCCESS! Password reset request accepted');
      console.log('   📧 Email should be sent (check inbox/spam)');
      console.log(`   📋 Response: ${JSON.stringify(result)}`);
      return true;
    } else if (response.status === 500) {
      const error = await response.json();
      console.log('   ❌ 500 Error - SMTP likely not configured');
      console.log(`   🔧 Error: ${JSON.stringify(error)}`);
      return false;
    } else {
      const error = await response.json();
      console.log(`   ⚠️ Unexpected status ${response.status}`);
      console.log(`   📋 Response: ${JSON.stringify(error)}`);
      return false;
    }
  } catch (error) {
    console.log(`   💥 Network error: ${error.message}`);
    return false;
  }
}

async function testWithDifferentEmails() {
  console.log('\n3️⃣ Testing with different email formats...');
  
  const testEmails = [
    'testusr3@gmail.com',
    'testusr2@gmail.com',
    'nonexistent@example.com'
  ];

  for (const email of testEmails) {
    try {
      console.log(`\n   Testing: ${email}`);
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ Success');
      } else {
        const error = await response.json();
        console.log(`   ❌ Error: ${error.error_code || error.code}`);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
}

async function main() {
  const success = await verifySmtpSetup();
  
  if (!success) {
    await testWithDifferentEmails();
  }
  
  console.log('\n📋 SMTP VERIFICATION SUMMARY:');
  console.log('=============================');
  
  if (success) {
    console.log('✅ SMTP appears to be configured correctly');
    console.log('✅ Password reset is working');
    console.log('📧 Check email inbox for reset link');
    console.log('');
    console.log('🎉 FORGOT PASSWORD FUNCTIONALITY IS COMPLETE!');
  } else {
    console.log('❌ SMTP is not configured or not working');
    console.log('');
    console.log('🔧 REQUIRED ACTIONS:');
    console.log('1. Go to Supabase Dashboard → Authentication → Settings');
    console.log('2. Configure SMTP Settings with Gmail/SendGrid/Mailgun');
    console.log('3. Test the configuration');
    console.log('4. Run this script again to verify');
    console.log('');
    console.log('📖 See SMTP_SETUP_GUIDE.md for detailed instructions');
  }
}

main();


