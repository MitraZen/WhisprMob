# FCM Edge Function Setup Guide

## Issue
The Supabase Edge Function `send-fcm-notification` is returning a non-2xx status code, which means the FCM server key is not configured.

## Solution

### Step 1: Get Your FCM Server Key

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Go to **Cloud Messaging** tab
5. Copy the **Server Key** (it looks like: `AAAA...`)

### Step 2: Set Environment Variable in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Add a new environment variable:
   - **Name**: `FCM_SERVER_KEY`
   - **Value**: Your Firebase Server Key (the one you copied)

### Step 3: Deploy the Edge Function

Run this command in your project directory:

```bash
supabase functions deploy send-fcm-notification
```

### Step 4: Test the Function

You can test the function directly in Supabase:

1. Go to **Edge Functions** in your Supabase dashboard
2. Click on `send-fcm-notification`
3. Use this test payload:

```json
{
  "to": "YOUR_FCM_TOKEN_HERE",
  "notification": {
    "title": "Test Notification",
    "body": "This is a test message"
  },
  "data": {
    "type": "test"
  }
}
```

## Alternative: Use Local Notifications Only

If you want to skip FCM setup for now, you can modify the FCM service to fall back to local notifications:

```typescript
// In fcmService.ts, modify the error handling to return true instead of false
// This will make the app think FCM worked, but it will only use local notifications
```

## Expected Result

After setting up the FCM server key, you should see:
- ✅ FCM notifications working in production
- ✅ Push notifications when app is closed/background
- ✅ No more "Edge Function returned a non-2xx status code" errors

## Troubleshooting

If you still get errors:
1. Check that the FCM server key is correct
2. Verify the Edge Function is deployed
3. Check Supabase logs for detailed error messages
4. Ensure your Firebase project has Cloud Messaging enabled

