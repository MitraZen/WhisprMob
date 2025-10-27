import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔥 Edge Function called with method:', req.method);
    
    const body = await req.json();
    console.log('🔥 Request body:', JSON.stringify(body, null, 2));

    const { to, notification, data, checkOnlineStatus } = body;

    if (!to || !notification) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, notification' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Firebase configuration from environment
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    
    console.log('🔥 Firebase Project ID exists:', !!projectId);
    console.log('🔥 Service Account Key exists:', !!serviceAccountKey);
    console.log('🔥 Project ID:', projectId);
    
    if (!projectId || !serviceAccountKey) {
      console.error('❌ Missing Firebase configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Firebase configuration missing',
          details: 'Need FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse service account key
    let serviceAccount;
    try {
      console.log('🔥 Raw Service Account Key:', serviceAccountKey.substring(0, 100) + '...');
      serviceAccount = JSON.parse(serviceAccountKey);
      console.log('🔥 Service Account parsed successfully');
      console.log('🔥 Service Account client_email:', serviceAccount.client_email);
    } catch (error) {
      console.error('❌ Failed to parse Service Account Key:', error);
      console.error('❌ Service Account Key content:', serviceAccountKey);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Service Account Key format',
          details: error.message,
          rawKey: serviceAccountKey.substring(0, 200)
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate OAuth2 access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    console.log('🔥 Access token generated successfully');

    // Unified online status check - single source of truth
    if (checkOnlineStatus && data?.userId) {
      console.log('🔍 [UNIFIED] Checking online status for user:', data.userId);
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${data.userId}&select=is_online,last_seen`, {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            const userProfile = userData?.[0];
            const isOnline = userProfile?.is_online || false;
            const lastSeen = userProfile?.last_seen || null;
            
            console.log('🔍 [UNIFIED] User online status:', { isOnline, lastSeen });
            
            if (isOnline) {
              console.log('🟢 [UNIFIED] User is online - skipping FCM notification');
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  message: 'User is online - FCM notification skipped',
                  reason: 'user_online',
                  onlineStatus: {
                    isOnline: true,
                    lastSeen: lastSeen,
                    checkedAt: new Date().toISOString()
                  }
                }),
                { 
                  status: 200, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              );
            } else {
              console.log('🔴 [UNIFIED] User is offline - proceeding with FCM notification');
            }
          } else {
            console.warn('⚠️ [UNIFIED] Failed to fetch user profile, proceeding with FCM');
          }
        } else {
          console.warn('⚠️ [UNIFIED] Missing Supabase credentials, proceeding with FCM');
        }
      } catch (error) {
        console.warn('⚠️ [UNIFIED] Error checking online status, proceeding with FCM:', error);
      }
    }

    // Prepare FCM v1 message with high priority for OnePlus/Xiaomi compatibility
    const fcmMessage = {
      message: {
        token: to,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            channel_id: 'whispr-messages',
            sound: 'default',
            vibrate_timings: [300, 100, 300],
            priority: 'high',
            visibility: 'public'
          },
          ttl: '60s' // 60 seconds TTL for reliable delivery
        }
      }
    };

    console.log('🔥 Sending FCM v1 message:', JSON.stringify(fcmMessage, null, 2));

    // Send to FCM v1 API
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const fcmResponse = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    const fcmResult = await fcmResponse.json();
    console.log('🔥 FCM v1 response status:', fcmResponse.status);
    console.log('🔥 FCM v1 response:', fcmResult);

    if (!fcmResponse.ok) {
      console.error('❌ FCM v1 error:', fcmResult);
      return new Response(
        JSON.stringify({ 
          error: 'FCM v1 request failed', 
          details: fcmResult,
          status: fcmResponse.status
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ FCM v1 notification sent successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully via FCM v1',
        fcmResult: fcmResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Function to get Firebase access token using JWT
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT payload
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now,
  };

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Create signature input
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  // Sign with private key using Web Crypto API
  const signature = await signWithPrivateKey(signatureInput, serviceAccount.private_key);
  
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Base64 URL encoding
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Sign with private key using Web Crypto API
async function signWithPrivateKey(input: string, privateKeyPem: string): Promise<string> {
  try {
    // Remove PEM headers and decode base64
    const privateKeyData = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    
    // Convert base64 to ArrayBuffer
    const keyData = Uint8Array.from(atob(privateKeyData), c => c.charCodeAt(0));
    
    // Import the private key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    // Sign the input
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
    
    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature);
    return base64UrlEncode(String.fromCharCode(...signatureArray));
  } catch (error) {
    throw new Error(`JWT signing failed: ${error.message}`);
  }
}