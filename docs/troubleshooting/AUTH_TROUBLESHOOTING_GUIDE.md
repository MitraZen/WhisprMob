# Supabase Auth Signup Troubleshooting Guide

## Issue: "User creation failed" Error

The error occurs in `authService.ts` line 105 when `authData.user` is null after signup.

## Possible Causes & Solutions

### 1. Email Confirmation Required ⭐ **MOST LIKELY**

**Problem**: New Supabase project has email confirmation enabled by default.

**Solution**: Disable email confirmation in Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Settings**
3. Under **User Signups**, disable **"Enable email confirmations"**
4. Save changes

### 2. Auth Settings Configuration

**Check these settings in Supabase Dashboard > Authentication > Settings:**

- ✅ **Enable email signup**: Should be ON
- ❌ **Enable email confirmations**: Should be OFF (for testing)
- ✅ **Enable phone signup**: Optional
- ✅ **Enable anonymous signup**: Optional

### 3. API Key Issues

**Verify your API keys are correct:**
1. Go to **Settings > API**
2. Copy the **anon public** key
3. Update `src/config/env.ts` with the correct key

### 4. Test Auth Endpoint

Run the test script to verify auth endpoint:

```bash
# Test the auth signup endpoint
node test-auth-signup.js
```

Or test manually with curl:
```bash
curl -X POST 'https://axkktejoldizpveydidx.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

### 5. Check Auth Response

The auth signup should return:
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    ...
  },
  "session": null  // null if email confirmation required
}
```

If `user` is null, check the error message in the response.

## Quick Fix Steps

1. **Disable email confirmation** in Supabase Dashboard
2. **Test auth endpoint** with the provided script
3. **Rebuild and test** the app
4. **Check console logs** for detailed error messages

## Alternative: Use Service Role Key

If you need to bypass auth restrictions for testing:

1. Get your **service role key** from Supabase Dashboard > Settings > API
2. Update `src/config/env.ts`:
   ```typescript
   serviceRoleKey: 'your-actual-service-role-key'
   ```
3. Use service role for admin operations (not recommended for production)

## Debug Steps

1. Check browser console for detailed error messages
2. Test auth endpoint directly
3. Verify Supabase project settings
4. Check API key validity
5. Test with a simple email/password combination


