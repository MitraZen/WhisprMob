import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔥 Edge Function called with method:", req.method);

    const body = await req.json();
    console.log("🔥 Request body:", JSON.stringify(body, null, 2));

    const { to, notification, data, checkOnlineStatus, forceSend } = body;

    if (!to || !notification) {
      console.error("❌ Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, notification" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Firebase configuration
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const serviceAccountKey = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");

    console.log("🔥 Firebase Project ID exists:", !!projectId);
    console.log("🔥 Service Account Key exists:", !!serviceAccountKey);
    console.log("🔥 Project ID:", projectId);

    if (!projectId || !serviceAccountKey) {
      console.error("❌ Missing Firebase configuration");
      return new Response(
        JSON.stringify({
          error: "Firebase configuration missing",
          details: "Need FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY environment variables",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse service account key
    let serviceAccount;
    try {
      console.log("🔥 Raw Service Account Key (truncated):", serviceAccountKey.substring(0, 100) + "...");
      serviceAccount = JSON.parse(serviceAccountKey);
      console.log("🔥 Service Account parsed successfully");
      console.log("🔥 Service Account client_email:", serviceAccount.client_email);
    } catch (error) {
      console.error("❌ Failed to parse Service Account Key:", error);
      return new Response(
        JSON.stringify({
          error: "Invalid Service Account Key format",
          details: error.message,
          rawKey: typeof serviceAccountKey === "string" ? serviceAccountKey.substring(0, 200) : null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- safer online-check with last_seen threshold (60 seconds)
    if (checkOnlineStatus && data?.userId) {
      console.log("🔍 Checking online status for user:", data.userId);
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseServiceKey) {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?id=eq.${data.userId}&select=is_online,last_seen`,
            {
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                apikey: supabaseServiceKey,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const userData = await response.json();
            const userProfile = userData?.[0] ?? {};
            const isOnlineFlag = !!userProfile?.is_online;
            const lastSeenStr = userProfile?.last_seen ?? null;

            // Parse lastSeen and compute recency
            let lastSeenAgeSec = Infinity;
            if (lastSeenStr) {
              const lastSeenTs = Date.parse(lastSeenStr);
              if (!Number.isNaN(lastSeenTs)) {
                lastSeenAgeSec = Math.floor((Date.now() - lastSeenTs) / 1000);
              }
            }

            console.log("🔍 Online check raw:", { isOnlineFlag, lastSeenStr, lastSeenAgeSec });

            // Only consider "online" if flag is true AND lastSeen is very recent (<= 60s).
            const RECENT_SECONDS = 60;
            const isActuallyOnline = isOnlineFlag && lastSeenAgeSec <= RECENT_SECONDS;

            if (isActuallyOnline && !forceSend) {
              console.log("🟢 User considered online (recent). Skipping FCM send.");
              return new Response(
                JSON.stringify({
                  success: true,
                  message: "User recently online - FCM notification skipped",
                  reason: "user_recently_online",
                  onlineStatus: {
                    isOnlineFlag,
                    lastSeenStr,
                    lastSeenAgeSec,
                    checkedAt: new Date().toISOString(),
                  },
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else {
              console.log("🔴 User not recently online — proceeding with FCM send.");
            }
          } else {
            console.warn("⚠️ Failed to fetch user profile; proceeding with FCM. status:", response.status);
          }
        } else {
          console.warn("⚠️ Missing Supabase credentials; proceeding with FCM.");
        }
      } catch (err) {
        console.warn("⚠️ Error checking online status; proceeding with FCM:", err);
      }
    }

    // ==== FCM WAKE-UP STRATEGY: Data-only message to wake app, batch system handles all display
    // FCM should only wake the app - batch system will handle all notification display
    // This prevents duplicate notifications (FCM + batch system)
    // Data-only messages wake app via content-available, but don't auto-display notification
    
    // Minimal data payload - just enough to wake app
    // Batch system will fetch messages via realtime and display grouped notifications
    const payloadData = sanitizeData({
      type: "wake", // Signal that this is a wake-up, batch system handles display
      userId: data?.userId ?? data?.receiverId ?? "",
      buddyId: data?.buddyId ?? "",
      // Don't include message content - batch system will fetch and display
      priority: "high",
      content_available: "true",
    });

    // Data-only FCM message - wakes app but doesn't auto-display notification
    // Batch system will handle all notification display when app processes realtime messages
    const fcmMessage = {
      message: {
        token: to,
        // NO notification block - data-only message wakes app via content-available
        // This prevents OS from auto-displaying notification
        // Batch system will display grouped notifications when app processes realtime
        data: payloadData,
        android: {
          priority: "HIGH", // High priority ensures wake-up even in Doze mode
          ttl: "120s", // Give device time to deliver while idle
          direct_boot_ok: true, // Works even in Direct Boot mode
          // NO notification block - data-only message wakes app via content-available
          // Batch system will display notifications when app processes realtime
        },
        apns: {
          headers: {
            // High priority for background wake-up
            "apns-priority": "10",
            // Background push type for data-only messages
            "apns-push-type": "background",
          },
          payload: {
            aps: {
              // content-available wakes app without showing notification
              "content-available": 1,
              // NO alert - batch system handles notification display
            },
          },
        },
      },
    };

    console.log("🔥 Sending FCM v1 message:", JSON.stringify(fcmMessage, null, 2));

    // Get access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    console.log("🔥 Access token generated successfully");

    // Send to FCM v1 API
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const fcmResponse = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fcmMessage),
    });

    let fcmResult;
    try {
      fcmResult = await fcmResponse.json();
    } catch (err) {
      console.error("❌ Failed to parse FCM response JSON:", err);
      fcmResult = null;
    }

    console.log("🔥 FCM v1 response status:", fcmResponse.status);
    console.log("🔥 FCM v1 response:", fcmResult);

    if (!fcmResponse.ok) {
      console.error("❌ FCM v1 error:", fcmResult);
      return new Response(
        JSON.stringify({
          error: "FCM v1 request failed",
          details: fcmResult,
          status: fcmResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ FCM v1 notification sent successfully");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully via FCM v1",
        fcmResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Edge Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error?.message ?? String(error),
        stack: error?.stack ?? null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Function to get Firebase access token using JWT
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const header = { alg: "RS256", typ: "JWT" };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await signWithPrivateKey(signatureInput, serviceAccount.private_key);
  const jwt = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
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
  // btoa exists in Deno runtime
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Sign with private key using Web Crypto API (Deno supports subtle)
async function signWithPrivateKey(input: string, privateKeyPem: string): Promise<string> {
  try {
    const privateKeyData = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");

    // Decode base64 to byte array
    const keyBytes = Uint8Array.from(atob(privateKeyData), (c) => c.charCodeAt(0));

    // Import the PKCS#8 key
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBytes.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, data);
    const signatureArray = new Uint8Array(signature);
    // Convert signature bytes to binary string for base64 encoding
    let binary = "";
    for (let i = 0; i < signatureArray.byteLength; i++) {
      binary += String.fromCharCode(signatureArray[i]);
    }
    return base64UrlEncode(binary);
  } catch (error) {
    throw new Error(`JWT signing failed: ${error?.message ?? String(error)}`);
  }
}

function sanitizeData(source: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string") {
      result[key] = value;
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      result[key] = String(value);
      return;
    }
    try {
      result[key] = JSON.stringify(value);
    } catch {
      result[key] = String(value);
    }
  });
  return result;
}
