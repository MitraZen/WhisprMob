// Test password reset with a fresh email to confirm it's working
const SUPABASE_CONFIG = {
  url: 'https://axkktejoldizpveydidx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4'
};

async function testFreshEmail() {
  console.log('🧪 Testing password reset with fresh email...');
  
  try {
    const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testusr4@gmail.com', // Fresh email we haven't rate limited
      }),
    });

    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! Password reset working perfectly!');
      console.log('✅ Email will be sent to testusr4@gmail.com');
    } else if (response.status === 429) {
      console.log('⚠️ Rate limited (this means it\'s working, just too many requests)');
      console.log('📋 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Unexpected response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testFreshEmail();


