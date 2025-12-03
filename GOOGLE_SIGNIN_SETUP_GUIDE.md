# Google Sign-In Setup Guide

This guide will help you configure Google Sign-In for the Whispr mobile app using Google Identity Services.

## 📋 Prerequisites

1. Google Cloud Console account
2. Supabase project with Google OAuth provider enabled
3. React Native development environment set up

---

## 🔧 Step 1: Configure Google Cloud Console

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen (if not already done):
   - User Type: **External** (for public apps)
   - App name: **Whispr**
   - User support email: Your email
   - Developer contact: Your email
   - Save and continue through scopes and test users

### 1.2 Create OAuth Client IDs

Create **two** OAuth client IDs:

#### Android Client ID:
- Application type: **Android**
- Name: `Whispr Android`
- Package name: `com.whisprmobiletemp` (or your app's package name)
- SHA-1 certificate fingerprint: Get from your keystore (see below)

#### iOS Client ID (if needed):
- Application type: **iOS**
- Name: `Whispr iOS`
- Bundle ID: Your iOS bundle ID

### 1.3 Get SHA-1 Certificate Fingerprint

For **debug keystore** (development):
```bash
# Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For **release keystore** (production):
```bash
keytool -list -v -keystore android/app/your-release-key.keystore -alias your-key-alias
```

Copy the **SHA1** value and add it to your Android OAuth client ID.

---

## 🔧 Step 2: Configure Supabase

### 2.1 Enable Google Provider

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click to enable it
4. Enter your Google OAuth credentials:
   - **Client ID (for OAuth)**: Your Android OAuth client ID from Step 1.2
   - **Client Secret**: Leave empty (not needed for mobile apps using ID tokens)
   - **Authorized Client IDs**: Add your Android and iOS client IDs

### 2.2 Configure Redirect URLs

In Supabase Dashboard → **Authentication** → **URL Configuration**:
- Add redirect URLs if needed (usually not required for mobile apps using ID tokens)

---

## 🔧 Step 3: Configure Android App

### 3.1 Update `android/app/build.gradle`

Add Google Sign-In dependency (should be auto-added by npm install, but verify):

```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
}
```

### 3.2 Update `android/app/src/main/AndroidManifest.xml`

Add internet permission (if not already present):

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 3.3 Configure Google Sign-In in Your App

Create or update `src/config/googleSignIn.ts`:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_ANDROID_OAUTH_CLIENT_ID.apps.googleusercontent.com', // From Google Cloud Console
  offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
});

export default GoogleSignin;
```

**Important**: Replace `YOUR_ANDROID_OAUTH_CLIENT_ID` with your actual Android OAuth client ID from Google Cloud Console.

---

## 🔧 Step 4: Initialize Google Sign-In

### 4.1 Update App Entry Point

In your main app file (e.g., `index.js` or `App.tsx`), initialize Google Sign-In:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_SIGNIN_CONFIG } from '@/config/googleSignIn';

// Initialize on app start
GoogleSignin.configure(GOOGLE_SIGNIN_CONFIG);
```

### 4.2 Create Configuration File

Create `src/config/googleSignIn.ts`:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// Get your OAuth client IDs from Google Cloud Console
const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
const IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com'; // Optional

export const GOOGLE_SIGNIN_CONFIG = {
  webClientId: ANDROID_CLIENT_ID, // Required for Android
  iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined, // Optional for iOS
  offlineAccess: true,
  forceCodeForRefreshToken: true,
};

// Initialize Google Sign-In
GoogleSignin.configure(GOOGLE_SIGNIN_CONFIG);

export default GoogleSignin;
```

---

## 🔧 Step 5: Update Supabase Configuration

### 5.1 Enable Google Provider in Supabase

Make sure Google is enabled in your Supabase project:
1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your OAuth client IDs to **Authorized Client IDs**

### 5.2 Test the Integration

1. Run your app: `cd`
2. Navigate to signup screen
3. Tap "Continue with Google"
4. You should see Google sign-in flow
5. After successful sign-in, user should be authenticated

---

## 🐛 Troubleshooting

### Error: "DEVELOPER_ERROR" or "10:"

**Cause**: SHA-1 certificate fingerprint mismatch

**Solution**:
1. Get your current SHA-1: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
2. Update the SHA-1 in Google Cloud Console → OAuth client ID
3. Wait a few minutes for changes to propagate
4. Rebuild and test

### Error: "SIGN_IN_REQUIRED"

**Cause**: User cancelled sign-in or no account selected

**Solution**: This is expected behavior. User can retry.

### Error: "PLAY_SERVICES_NOT_AVAILABLE"

**Cause**: Google Play Services not installed or outdated

**Solution**: 
- Install/update Google Play Services on the device
- Use an emulator with Google Play Services

### Error: "Network request failed" during Supabase authentication

**Cause**: Supabase not configured for Google OAuth or wrong client ID

**Solution**:
1. Verify Google provider is enabled in Supabase
2. Check that your OAuth client ID matches in both Google Cloud Console and Supabase
3. Verify network connectivity

---

## 📝 Important Notes

1. **Client ID Types**: 
   - Use **Android** OAuth client ID for Android apps
   - Use **iOS** OAuth client ID for iOS apps
   - Do NOT use Web client ID for mobile apps

2. **SHA-1 Fingerprint**:
   - Debug and release keystores have different SHA-1 fingerprints
   - Add both to Google Cloud Console if you test with both

3. **Supabase Configuration**:
   - Supabase uses the ID token from Google Sign-In
   - No client secret needed for mobile apps
   - Make sure Google provider is enabled in Supabase Dashboard

4. **Testing**:
   - Test on a real device or emulator with Google Play Services
   - Debug keystore SHA-1 is different from release keystore SHA-1

---

## ✅ Verification Checklist

- [ ] Google Cloud Console project created
- [ ] OAuth consent screen configured
- [ ] Android OAuth client ID created
- [ ] SHA-1 fingerprint added to Android OAuth client ID
- [ ] Google provider enabled in Supabase
- [ ] OAuth client IDs added to Supabase authorized clients
- [ ] `@react-native-google-signin/google-signin` package installed
- [ ] Google Sign-In configured in app
- [ ] App tested on device/emulator with Google Play Services

---

## 🔗 Useful Links

- [Google Sign-In for React Native Documentation](https://github.com/react-native-google-signin/google-signin)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

## 🚀 Next Steps

After completing this setup:

1. Test Google Sign-In on a real device
2. Test with release keystore (add release SHA-1 to Google Cloud Console)
3. Configure iOS Google Sign-In if needed
4. Add error handling and user feedback
5. Consider adding Google Sign-In to the sign-in screen as well



