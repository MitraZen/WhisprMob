# Google Sign-In DEVELOPER_ERROR Troubleshooting Checklist

## 🔍 Current Error
```
Error: DEVELOPER_ERROR: Follow troubleshooting instructions
```

## ✅ Step-by-Step Verification

### 1. Verify SHA-1 Fingerprint is Added

**Your Debug SHA-1 (for development):**
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**Action Required:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth client ID: `731643345736-qgu5v9gpb1632lap1s05q4rt7mbpv1p5`
4. Click to edit it
5. In **SHA-1 certificate fingerprint** section:
   - Check if you see: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - If NOT present, add it (see below for how to add multiple SHA-1s)

**How to Add Multiple SHA-1 Fingerprints:**
- In the SHA-1 field, you can add multiple fingerprints on **separate lines**
- Or use **comma-separated** format
- Make sure both are present:
  - Debug: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
  - Release: `5D:60:C6:15:2C:4D:0A:19:82:B2:09:44:30:5D:4E:BB:13:BB:EA:25`

### 2. Verify OAuth Client ID Type

**Check in Google Cloud Console:**
- ✅ **Application type:** Must be **Android** (NOT Web)
- ✅ **Package name:** Must be exactly `com.whisprmobiletemp`
- ✅ **Client ID:** `731643345736-qgu5v9gpb1632lap1s05q4rt7mbpv1p5.apps.googleusercontent.com`

### 3. Verify Environment Variable

**Check your `.env` file contains:**
```
GOOGLE_SIGNIN_ANDROID_CLIENT_ID=731643345736-qgu5v9gpb1632lap1s05q4rt7mbpv1p5.apps.googleusercontent.com
```

**Verify it's loading:**
- Check Metro bundler console for: `✅ Google Sign-In configured successfully`
- If you see: `⚠️ Google Sign-In client ID not configured` → The env variable isn't loading

### 4. Wait for Propagation

**Important:** After adding SHA-1 to Google Cloud Console:
- ⏰ **Wait 5-10 minutes** for changes to propagate
- 🔄 **Completely close and restart the app** (not just reload)
- ❌ Don't just reload - fully kill and restart the app

### 5. Verify Package Name Match

**In Google Cloud Console OAuth client:**
- Package name: `com.whisprmobiletemp` (must match exactly, case-sensitive)

**In your app (`android/app/build.gradle`):**
- `applicationId = "com.whisprmobiletemp"` (should match)

## 🔧 Quick Fix Steps

1. **Double-check SHA-1 is added:**
   - Go to Google Cloud Console → Credentials
   - Open your Android OAuth client ID
   - Verify SHA-1: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` is present

2. **If SHA-1 is missing:**
   - Add it to the SHA-1 field (on a new line if multiple)
   - Click **Save**
   - Wait 5-10 minutes

3. **Verify OAuth client type:**
   - Make sure it's **Android** type, not Web
   - Package name must be `com.whisprmobiletemp`

4. **Restart everything:**
   ```bash
   # Kill the app completely
   adb shell am force-stop com.whisprmobiletemp
   
   # Restart Metro with cache clear
   npx react-native start --reset-cache
   
   # In another terminal, rebuild
   npx react-native run-android
   ```

5. **Test again:**
   - Open the app
   - Go to signup
   - Try "Continue with Google"

## 🐛 Common Issues

### Issue 1: SHA-1 Not Added
**Symptom:** DEVELOPER_ERROR persists
**Solution:** Add debug SHA-1 to Google Cloud Console

### Issue 2: Wrong OAuth Client Type
**Symptom:** DEVELOPER_ERROR
**Solution:** Make sure it's **Android** type, not Web

### Issue 3: Package Name Mismatch
**Symptom:** DEVELOPER_ERROR
**Solution:** Verify package name is exactly `com.whisprmobiletemp` (case-sensitive)

### Issue 4: Changes Not Propagated
**Symptom:** SHA-1 added but still getting error
**Solution:** Wait 5-10 minutes, then completely restart app (not just reload)

### Issue 5: Using Wrong Client ID
**Symptom:** Error persists
**Solution:** Verify `.env` file has the correct client ID matching Google Cloud Console

## 📝 Verification Commands

**Check if SHA-1 is correct:**
```bash
cd android
.\gradlew signingReport
```
Look for: `SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

**Check environment variable:**
```bash
# In Metro bundler, you should see:
✅ Google Sign-In configured successfully
```

**Check app logs:**
```bash
adb logcat | grep -i "google\|developer_error"
```

## ✅ Success Indicators

You'll know it's working when:
- ✅ No DEVELOPER_ERROR
- ✅ Google Sign-In dialog appears
- ✅ You can select a Google account
- ✅ Authentication completes successfully

## 🔗 Useful Links

- [Google Sign-In Troubleshooting](https://react-native-google-signin.github.io/docs/troubleshooting)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)



