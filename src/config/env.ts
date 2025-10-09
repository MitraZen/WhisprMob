// Environment configuration for Supabase
// Replace these with your actual Supabase project credentials
// You can find these in your Supabase project dashboard under Settings > API

export const SUPABASE_CONFIG = {
  // Your Supabase project URL
  url: 'https://axkktejoldizpveydidx.supabase.co',
  
  // Your Supabase anonymous key
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4',
  // Optional: Service role key for admin operations
  serviceRoleKey: 'your-service-role-key-here',
};

// Instructions for getting your Supabase credentials:
// 1. Go to your Supabase project dashboard
// 2. Navigate to Settings > API
// 3. Copy the Project URL and replace SUPABASE_CONFIG.url
// 4. Copy the anon public key and replace SUPABASE_CONFIG.anonKey
// 5. Optionally copy the service_role secret key for admin operations

export default SUPABASE_CONFIG;
