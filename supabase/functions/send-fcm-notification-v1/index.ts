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
    // Log only keys to avoid leaking secrets
    console.log("🔥 Request body keys:", Object.keys(body || {}));

    const { to, notification, data, checkOnlineStatus, forceSend } = body;
    const isNote = data?.type === "note";
    const effectiveForceSend = isNote ? true : !!forceSend;

    if (!to || !notification) {
      console.error("❌ Missing required fields: to or notification");
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, notification" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Firebase configuration
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const serviceAccountKey = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");

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

    // Parse service account (must not log private_key)
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
      if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
        throw new Error("Service account missing client_email or private_key");
      }
    } catch (error) {
      console.error("❌ Failed to parse Service Account Key");
      return new Response(
        JSON.stringify({
          error: "Invalid Service Account Key format",
          details: String(error?.message ?? error),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional online check (best-effort)
    if (checkOnlineStatus && !effectiveForceSend && data?.userId) {
      console.log("🔍 Checking online status for user:", data.userId);
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (supabaseUrl && supabaseServiceKey) {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(data.userId)}&select=is_online,last_seen`,
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

            let lastSeenAgeSec = Infinity;
            if (lastSeenStr) {
              const lastSeenTs = Date.parse(lastSeenStr);
              if (!Number.isNaN(lastSeenTs)) {
                lastSeenAgeSec = Math.floor((Date.now() - lastSeenTs) / 1000);
              }
            }

            console.log("🔍 Online check raw:", { isOnlineFlag, lastSeenStr, lastSeenAgeSec });

            const RECENT_SECONDS = 120; // slightly forgiving threshold
            const isActuallyOnline = isOnlineFlag && lastSeenAgeSec <= RECENT_SECONDS;

            if (isActuallyOnline && !effectiveForceSend) {
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
        console.warn("⚠️ Error checking online status; proceeding with FCM:", String(err));
      }
    }

    // ---------------------------
    // Resolve buddyName (robust)
    // ---------------------------
    const extractBuddyNameFromData = (d: any) => {
      return (
        d?.buddyName ??
        d?.buddy_name ??
        d?.senderName ??
        d?.sender_name ??
        d?.name ??
        d?.displayName ??
        null
      );
    };

    let buddyName = extractBuddyNameFromData(data);

    async function resolveBuddyNameFromSupabase(userId?: string | null) {
      if (!userId) return null;
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !supabaseServiceKey) return null;

        const res = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(userId)}&select=display_name,full_name,username`,
          {
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              apikey: supabaseServiceKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          console.warn("⚠️ Supabase lookup failed status:", res.status);
          return null;
        }

        const rows = await res.json();
        const profile = rows?.[0] ?? null;
        if (!profile) return null;

        return profile.display_name ?? profile.full_name ?? profile.username ?? null;
      } catch (err) {
        console.warn("⚠️ Supabase lookup error:", String(err));
        return null;
      }
    }

    if (!buddyName) {
      const resolveId = data?.buddyId ?? data?.senderId ?? data?.userId ?? null;
      if (resolveId) {
        try {
          buddyName = await resolveBuddyNameFromSupabase(resolveId);
        } catch {
          // ignore - best-effort
        }
      }
    }

    const resolvedBuddyName = buddyName ?? null;

    // Prefer caller-provided titles only when they aren't generic placeholders
    const incomingTitle =
      typeof notification?.title === "string" ? notification.title.trim() : null;
    const isGenericMessageTitle =
      !isNote &&
      incomingTitle !== null &&
      incomingTitle.toLowerCase() === "new message";
    const useIncomingTitle = !!incomingTitle && !isGenericMessageTitle;

    const notificationTitle = useIncomingTitle
      ? incomingTitle!
      : (isNote
          ? "New Whispr Note"
          : (resolvedBuddyName ?? "New Message"));
    const notificationBody = notification?.body ??
      (isNote
        ? (typeof data?.noteContent === "string" 
            ? data.noteContent.substring(0, 100) 
            : (resolvedBuddyName 
                ? `${resolvedBuddyName}: New note` 
                : "You have a new Whispr note"))
        : (typeof data?.message === "string" 
            ? data.message.substring(0, 100) 
            : "You have a new message"));

    // Compute notification ID (same logic as client-side) to ensure replacement
    // For notes, use noteId; for messages, use buddyId/senderId
    const buddyIdForId = isNote 
      ? (data?.noteId ?? data?.senderId ?? "") 
      : (data?.buddyId ?? data?.senderId ?? "");
    const buddyNameForId = String(resolvedBuddyName ?? "");
    const idSource = buddyIdForId || buddyNameForId || (isNote ? "whispr-notes" : "whispr");
    const getNotificationId = (source: string): number => {
      let hash = 0;
      for (let i = 0; i < source.length; i++) {
        hash = ((hash << 5) - hash) + source.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash) || 1;
    };
    const computedNotificationId = getNotificationId(idSource);

    // Data payload (sanitized) - handle both notes and messages
    const payloadData = sanitizeData({
      type: isNote ? "note" : "wake",
      userId: data?.userId ?? data?.receiverId ?? "",
      buddyId: data?.buddyId ?? data?.senderId ?? "",
      messageId: data?.messageId ?? "",
      noteId: data?.noteId ?? "", // ✅ Add noteId for notes
      senderId: data?.senderId ?? "",
      message: data?.message ?? "",
      noteContent: data?.noteContent ?? "", // ✅ Add noteContent for notes
      mood: data?.mood ?? "", // ✅ Add mood for notes
      senderName: data?.senderName ?? "", // ✅ Add senderName for notes
      buddyName: String(resolvedBuddyName ?? ""),
      priority: "high",
      content_available: "true",
      notificationId: String(computedNotificationId), // ✅ Add notification ID to data payload
    });

    // Build FCM v1 message (hybrid)
    const fcmMessage = {
      message: {
        token: to,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: payloadData,
        android: {
          priority: "high",
          ttl: "3600s",
          direct_boot_ok: true,
          collapse_key: isNote 
            ? (payloadData.noteId || "notes") 
            : (payloadData.buddyId || "messages"),
          notification: {
            title: notificationTitle,
            body: notificationBody,
            channel_id: isNote ? "whispr-notes" : "whispr-messages", // ✅ Use different channel for notes
            sound: "default",
            visibility: "PUBLIC",
            tag: isNote 
              ? (payloadData.noteId || payloadData.senderId || "whispr-notes") 
              : (payloadData.buddyId || payloadData.buddyName || "whispr"), // ✅ Add tag for grouping/replacement
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
            "apns-push-type": "alert",
            "apns-collapse-id": isNote 
              ? (payloadData.noteId ?? "notes") 
              : (payloadData.buddyId ?? "messages"),
          },
          payload: {
            aps: {
              alert: {
                title: notificationTitle,
                body: notificationBody,
              },
              "content-available": 1,
              sound: "default",
              badge: 1,
            },
          },
        },
      },
    };

    // Minimal safe debug
    console.log("🔎 Resolved buddyName:", resolvedBuddyName);
    console.log("🔎 Final notification title:", notificationTitle);

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

    let fcmResult: any = null;
    try {
      fcmResult = await fcmResponse.json();
    } catch (err) {
      console.error("❌ Failed to parse FCM response JSON:", String(err));
    }

    console.log("🔥 FCM v1 response status:", fcmResponse.status);
    console.log("🔥 FCM v1 response:", fcmResult);

    if (!fcmResponse.ok) {
      // ✅ Handle invalid/expired FCM tokens gracefully
      // UNREGISTERED (404) means token is invalid - this is expected for some users
      // (e.g., app uninstalled, data cleared, token expired)
      const isUnregisteredToken = fcmResponse.status === 404 && 
        fcmResult?.error?.details?.[0]?.errorCode === "UNREGISTERED";
      
      if (isUnregisteredToken) {
        console.warn("⚠️ FCM token is UNREGISTERED (invalid/expired) - this is expected for some users");
        console.warn("⚠️ Token should be cleaned up from database, but notification attempt completed");
        // Return success - invalid tokens are expected and shouldn't fail the notification flow
        return new Response(
          JSON.stringify({
            success: true,
            message: "Notification attempt completed (token was invalid/expired)",
            warning: "FCM token is UNREGISTERED - should be removed from database",
            fcmResult,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Other FCM errors (not UNREGISTERED) - log as error
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
    console.error("❌ Edge Function error:", String(error));
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error?.message ?? error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// -----------------------------
// Firebase access token helpers
// -----------------------------
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

  const encodedHeader = base64UrlEncodeFromBuffer(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncodeFromBuffer(new TextEncoder().encode(JSON.stringify(payload)));
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

// Binary-safe base64url from ArrayBuffer/Uint8Array
function base64UrlEncodeFromBuffer(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Sign JWT input using PKCS#8 private key (PEM)
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
    return base64UrlEncodeFromBuffer(new Uint8Array(signature));
  } catch (error) {
    throw new Error(`JWT signing failed: ${String(error)}`);
  }
}

// -----------------------------
// sanitizeData (unchanged)
// -----------------------------
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
