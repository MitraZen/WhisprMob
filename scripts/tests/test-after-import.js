// Quick test after auth.users import
const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function quickTest() {
  console.log('🧪 Quick Password Reset Test');
  
  const testEmail = 'prograktech@gmail.com'; // Real email from your data
  
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    console.log(`📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS! Password reset should work now');
      console.log('📧 Check email:', testEmail);
    } else if (response.status === 500) {
      console.log('❌ Still 500 error - auth.users import not run yet');
    } else {
      const error = await response.json();
      console.log('⚠️ Other error:', error);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

quickTest();


