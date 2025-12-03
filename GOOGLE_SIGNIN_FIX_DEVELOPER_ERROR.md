# Fix Google Sign-In DEVELOPER_ERROR

## 🔍 Problem
You're seeing this error:
```
Error: DEVELOPER_ERROR: Follow troubleshooting instructions at https://react-native-google-signin.github.io/docs/troubleshooting
```

## ✅ Solution: Add SHA-1 Fingerprint to Google Cloud Console

### Step 1: Get Your SHA-1 Fingerprint

Your **Debug SHA-1** (for development):
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

Your **Release SHA-1** (for production):
```
5D:60:C6:15:2C:4D:0A:19:82:B2:09:44:30:5D:4E:BB:13:BB:EA:25
```

### Step 2: Add SHA-1 to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with OAuth client ID: `731643345736-qgu5v9gpb1632lap1s05q4rt7mbpv1p5`)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **Android OAuth client ID** (the one ending in `...qgu5v9gpb1632lap1s05q4rt7mbpv1p5`)
5. Click on it to edit
6. In the **SHA-1 certificate fingerprints** section, click **+ ADD SHA-1**
7. Paste your **Debug SHA-1**:
   ```
   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
   ```
8. Click **SAVE**

### Step 3: Verify Package Name

Make sure your OAuth client ID has the correct package name:
- **Package name:** `com.whisprmobiletemp`

### Step 4: Wait and Test

1. **Wait 5-10 minutes** for Google's servers to update
2. **Completely close and restart your app** (not just reload)
3. Try Google Sign-In again

---

## 🔍 Additional Checks

### Verify OAuth Client ID Type

Make sure you're using an **Android** OAuth client ID, not a Web client ID:
- ✅ **Android** OAuth client ID: `731643345736-qgu5v9gpb1632lap1s05q4rt7mbpv1p5.apps.googleusercontent.com`
- ❌ **Web** OAuth client ID: Will not work for mobile apps

### Verify Package Name Match

Your app's package name is: `com.whisprmobiletemp`

Make sure your OAuth client ID in Google Cloud Console has:
- **Application type:** Android
- **Package name:** `com.whisprmobiletemp`
- **SHA-1:** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

---

## 🚨 Common Mistakes

1. **Using Web OAuth client ID instead of Android**
   - ❌ Wrong: Web application type
   - ✅ Correct: Android application type

2. **Wrong SHA-1 format**
   - ❌ Wrong: `5E8F16062EA3CD2C4A0D547876BAA6F38CABF625` (no colons)
   - ✅ Correct: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (with colons)

3. **Package name mismatch**
   - ❌ Wrong: Different package name in OAuth client
   - ✅ Correct: `com.whisprmobiletemp` matches exactly

4. **Not waiting for propagation**
   - Changes can take 5-10 minutes to propagate
   - Make sure to completely restart the app (not just reload)

---

## 📝 Quick Checklist

- [ ] SHA-1 fingerprint added to Google Cloud Console
- [ ] OAuth client ID is **Android** type (not Web)
- [ ] Package name matches: `com.whisprmobiletemp`
- [ ] Waited 5-10 minutes after adding SHA-1
- [ ] Completely closed and restarted the app
- [ ] Tried Google Sign-In again

---

## 🔗 Useful Links

- [Google Sign-In Troubleshooting](https://react-native-google-signin.github.io/docs/troubleshooting)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)

---

## 💡 Still Not Working?

If you've completed all steps and it's still not working:

1. **Double-check the OAuth client ID** in `src/config/googleSignIn.ts` matches the one in Google Cloud Console
2. **Verify the SHA-1** was saved correctly (check for typos)
3. **Check Google Cloud Console** for any error messages
4. **Try creating a new OAuth client ID** if the current one seems corrupted
5. **Check app logs** for more detailed error messages



