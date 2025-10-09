// Test Supabase Auth Signup
// Run this in your browser console or Node.js to test the auth endpoint

const SUPABASE_URL = 'https://axkktejoldizpveydidx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4';

async function testAuthSignup() {
  try {
    console.log('Testing Supabase Auth Signup...');
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ Auth signup successful!');
      console.log('User created:', data.user ? 'YES' : 'NO');
      console.log('Session created:', data.session ? 'YES' : 'NO');
    } else {
      console.log('❌ Auth signup failed');
      console.log('Error:', data);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testAuthSignup();


