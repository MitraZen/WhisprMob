// Final diagnosis for persistent 500 error
// This will help identify the exact issue with email templates/SMTP

const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function finalDiagnosis() {
  console.log('🔍 FINAL PASSWORD RESET DIAGNOSIS');
  console.log('================================\n');

  // Test 1: Check auth settings in detail
  console.log('1️⃣ Checking detailed auth settings...');
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
      console.log('📧 Email enabled:', settings.external?.email);
      console.log('🔄 Auto-confirm:', settings.mailer_autoconfirm);
      console.log('🚫 Signup disabled:', settings.disable_signup);
      console.log('📱 External providers:', Object.keys(settings.external || {}));
      
      // Check for any other relevant settings
      console.log('\n🔧 Full settings object:');
      console.log(JSON.stringify(settings, null, 2));
    } else {
      console.log('❌ Could not fetch auth settings');
    }
  } catch (error) {
    console.log('💥 Error fetching auth settings:', error.message);
  }

  // Test 2: Try password reset with different request formats
  console.log('\n2️⃣ Testing different request formats...');
  
  const testCases = [
    {
      name: 'Standard format',
      body: { email: 'prograktech@gmail.com' }
    },
    {
      name: 'With options',
      body: { 
        email: 'prograktech@gmail.com',
        options: {
          redirectTo: 'https://example.com'
        }
      }
    },
    {
      name: 'Different email',
      body: { email: 'testusr3@gmail.com' }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n   Testing: ${testCase.name}`);
      const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.body),
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        const result = await response.json();
        console.log(`   ✅ SUCCESS: ${JSON.stringify(result)}`);
      } else {
        const error = await response.json();
        console.log(`   ❌ Error: ${JSON.stringify(error)}`);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   💥 Network error: ${error.message}`);
    }
  }

  // Test 3: Check if it's a Supabase service issue
  console.log('\n3️⃣ Checking Supabase service health...');
  try {
    const healthResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    
    console.log(`   REST API Status: ${healthResponse.status}`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ Supabase REST API is working');
    } else {
      console.log('   ⚠️ Supabase REST API issue');
    }
  } catch (error) {
    console.log(`   💥 Supabase health check error: ${error.message}`);
  }

  console.log('\n📋 DIAGNOSIS SUMMARY:');
  console.log('=====================================');
  console.log('If ALL password reset requests return 500:');
  console.log('  ❌ Email templates are not configured properly');
  console.log('  ❌ SMTP settings are missing or incorrect');
  console.log('  ❌ There is a server-side Supabase configuration issue');
  console.log('');
  console.log('REQUIRED ACTIONS:');
  console.log('1. Go to Supabase Dashboard → Authentication → Email Templates');
  console.log('2. Enable "Reset Password" template with proper content');
  console.log('3. Consider setting up custom SMTP (Gmail, SendGrid, etc.)');
  console.log('4. Check Supabase project logs for more details');
  console.log('');
  console.log('The 500 error suggests a server-side configuration issue,');
  console.log('not a client-side problem.');
}

finalDiagnosis();


