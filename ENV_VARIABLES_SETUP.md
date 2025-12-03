# Environment Variables Setup for Google Sign-In

## 📋 Overview

Google Sign-In now uses environment variables to manage different client IDs for development and production builds.

## 📁 Files Created

1. **`.env`** - Default environment (used by default, matches development)
2. **`.env.development`** - For development/debug builds
3. **`.env.production`** - For production/release builds
4. **`src/types/env.d.ts`** - TypeScript type definitions

## 🔧 Configuration

### Development (Current Setup)

Your `.env.development` file contains:
```
GOOGLE_SIGNIN_ANDROID_CLIENT_ID=731643345736-qgu5v9gpb1632lap1s05q4rt7mbpv1p5.apps.googleusercontent.com
```

This is your **development OAuth client ID** (with debug SHA-1 fingerprint).

### Production (To Be Configured)

Your `.env.production` file needs your **production OAuth client ID**:
```
GOOGLE_SIGNIN_ANDROID_CLIENT_ID=YOUR_PRODUCTION_CLIENT_ID.apps.googleusercontent.com
```

## 🚀 How It Works

1. **Development builds** use `.env.development` (or `.env` as fallback)
2. **Production builds** should use `.env.production`
3. The app automatically loads the correct client ID based on the environment

## 📝 Setting Up Production Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a **new Android OAuth client ID** for production:
   - Application type: **Android**
   - Package name: `com.whisprmobiletemp`
   - SHA-1: `5D:60:C6:15:2C:4D:0A:19:82:B2:09:44:30:5D:4E:BB:13:BB:EA:25` (your release SHA-1)
3. Copy the Client ID
4. Update `.env.production`:
   ```
   GOOGLE_SIGNIN_ANDROID_CLIENT_ID=YOUR_PRODUCTION_CLIENT_ID.apps.googleusercontent.com
   ```

## 🔄 Switching Between Environments

### For Development
- The app automatically uses `.env` (which matches `.env.development`)
- No action needed

### For Production Builds
- Update your build script to use `.env.production`
- Or manually copy `.env.production` to `.env` before building

## ⚠️ Important Notes

1. **`.env` files are in `.gitignore`** - They won't be committed to git (good for security)
2. **Never commit OAuth client IDs** to version control
3. **Keep both client IDs** - One for debug, one for release
4. **Restart Metro bundler** after changing `.env` files

## 🐛 Troubleshooting

### TypeScript Error: "Cannot find module '@env'"

If you see this error:
1. Make sure `src/types/env.d.ts` exists
2. Restart your TypeScript server
3. Clear Metro cache: `npx react-native start --reset-cache`

### Environment Variable Not Loading

1. Check that `.env` file exists in project root
2. Verify `babel.config.js` has `react-native-dotenv` plugin configured
3. Restart Metro bundler: `npx react-native start --reset-cache`
4. Rebuild the app: `npx react-native run-android`

## 📚 Related Files

- `src/config/googleSignIn.ts` - Uses environment variables
- `babel.config.js` - Configures react-native-dotenv plugin
- `src/types/env.d.ts` - TypeScript definitions



