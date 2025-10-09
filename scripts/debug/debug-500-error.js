// Deep debugging for the 500 error
const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function debugPasswordReset() {
  console.log('🔍 Deep Debugging Password Reset 500 Error\n');
  
  // Test 1: Check if auth endpoint is working at all
  console.log('1️⃣ Testing basic auth endpoint...');
  try {
    const healthResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    console.log(`   Auth endpoint status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const settings = await healthResponse.json();
      console.log('   ✅ Auth endpoint is working');
      console.log(`   📧 Email enabled: ${settings.external?.email}`);
      console.log(`   🔄 Auto-confirm: ${settings.mailer_autoconfirm}`);
    } else {
      console.log('   ❌ Auth endpoint issue');
    }
  } catch (error) {
    console.log('   💥 Auth endpoint error:', error.message);
  }

  // Test 2: Try password reset with different emails
  console.log('\n2️⃣ Testing password reset with different emails...');
  
  const testEmails = [
    'prograktech@gmail.com',
    'testusr3@gmail.com', 
    'test@example.com',
    'nonexistent@test.com'
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
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.status !== 200) {
        const error = await response.json();
        console.log(`   Error: ${JSON.stringify(error)}`);
      } else {
        const result = await response.json();
        console.log(`   Success: ${JSON.stringify(result)}`);
      }
      
      // Wait 1 second between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   Network error: ${error.message}`);
    }
  }

  // Test 3: Check if it's a rate limiting issue
  console.log('\n3️⃣ Testing for rate limiting...');
  try {
    const response1 = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'rate-test@example.com' }),
    });
    
    console.log(`   First request: ${response1.status}`);
    
    // Immediate second request
    const response2 = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'rate-test2@example.com' }),
    });
    
    console.log(`   Second request: ${response2.status}`);
    
    if (response2.status === 429) {
      console.log('   ⚠️ Rate limiting detected');
    }
  } catch (error) {
    console.log(`   Rate limit test error: ${error.message}`);
  }

  // Test 4: Try with minimal request
  console.log('\n4️⃣ Testing with minimal request...');
  try {
    const minimalResponse = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'minimal-test@example.com' }),
    });
    
    console.log(`   Minimal request status: ${minimalResponse.status}`);
    if (minimalResponse.status !== 200) {
      const error = await minimalResponse.json();
      console.log(`   Minimal error: ${JSON.stringify(error)}`);
    }
  } catch (error) {
    console.log(`   Minimal test error: ${error.message}`);
  }

  console.log('\n📋 Diagnosis Summary:');
  console.log('If ALL requests return 500:');
  console.log('  - Email templates are not configured');
  console.log('  - SMTP settings are missing');
  console.log('  - Site URL is not configured');
  console.log('  - There\'s a server-side configuration issue');
  console.log('\nIf some work and some don\'t:');
  console.log('  - User-specific issues (email format, user state)');
  console.log('  - Rate limiting');
  console.log('\nNext steps: Check Supabase Dashboard logs for more details');
}

debugPasswordReset();


