// Environment configuration for Supabase
// Replace these with your actual Supabase project credentials
// You can find these in your Supabase project dashboard under Settings > API

export const SUPABASE_CONFIG = {
  // Your Supabase project URL
  url: 'https://bkfonnecvqlppivnrgxe.supabase.co',
  
  // Your Supabase anonymous key
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZm9ubmVjdnFscHBpdm5yZ3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDE0MTUsImV4cCI6MjA3MzAxNzQxNX0.t0f-n4JT9Lb6LBCxSIf6umH4pxWvgFuA62-0IVGejwg',
  
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
