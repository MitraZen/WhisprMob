# 🔥 Firebase Setup Guide - Fix API Key Error

## 🚨 **Current Issue**
```
NativeFirebaseError: [messaging/unknown] java.lang.IllegalArgumentException: 
Please set a valid API key. A Firebase API key is required to communicate with Firebase server APIs
```

**Root Cause**: The `google-services.json` file contains placeholder values instead of real Firebase project configuration.

## ✅ **Immediate Fix Applied**

I've updated the notification service to gracefully handle FCM errors and fall back to local notifications only. The app will now work without crashing, but you'll only get local notifications (foreground only).

## 🔧 **Complete Firebase Setup (Required for Production)**

### **Step 1: Create Firebase Project**

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Click "Create a project"**
3. **Enter project name**: `whispr-mobile-app` (or your preferred name)
4. **Enable Google Analytics** (optional but recommended)
5. **Click "Create project"**

### **Step 2: Add Android App**

1. **In Firebase Console**, click "Add app" → Android icon
2. **Enter package name**: `com.whisprmobiletemp`
3. **Enter app nickname**: `Whispr Mobile`
4. **Enter SHA-1 fingerprint** (optional for now)
5. **Click "Register app"**

### **Step 3: Download google-services.json**

1. **Download the `google-services.json` file**
2. **Replace the current file** at `android/app/google-services.json`
3. **The new file should contain real values**, not placeholders

### **Step 4: Enable Cloud Messaging**

1. **In Firebase Console**, go to "Cloud Messaging"
2. **Click "Get started"** if not already enabled
3. **Note down the Server Key** (you'll need this for Supabase)

### **Step 5: Update Supabase Environment**

1. **Go to Supabase Dashboard** → Settings → Edge Functions
2. **Add environment variable**: `FCM_SERVER_KEY`
3. **Value**: Your Firebase Server Key from Step 4

### **Step 6: Deploy Edge Function**

```bash
supabase functions deploy send-fcm-notification
```

## 📱 **Testing the Fix**

### **Current State (Local Notifications Only)**
```typescript
// Test notification - should show "FCM Token: Not Available (Local Only)"
await notificationService.testNotification();
```

### **After Firebase Setup (Full FCM)**
```typescript
// Test notification - should show "FCM Token: Available"
await notificationService.testNotification();
```

## 🔍 **Verify Firebase Setup**

### **Check google-services.json**
The file should contain real values like:
```json
{
  "project_info": {
    "project_number": "123456789012",  // Real project number
    "project_id": "your-real-project-id",  // Real project ID
    "storage_bucket": "your-real-project.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:123456789012:android:real-app-id",  // Real app ID
        "android_client_info": {
          "package_name": "com.whisprmobiletemp"
        }
      }
    }
  ]
}
```

### **Check Console Logs**
After Firebase setup, you should see:
```
🔥 FCM Token: [real-token]
🔥 FCM initialized successfully
```

## 🚀 **Expected Results**

### **Before Firebase Setup**
- ✅ App works without crashing
- ✅ Local notifications work (foreground only)
- ❌ No background notifications
- ❌ No notifications when app is closed

### **After Firebase Setup**
- ✅ App works without crashing
- ✅ Local notifications work (foreground)
- ✅ FCM notifications work (background)
- ✅ Notifications work when app is closed
- ✅ Production-ready notifications

## 💡 **Alternative: Use Existing Firebase Project**

If you already have a Firebase project:

1. **Go to Firebase Console** → Your existing project
2. **Add Android app** with package name `com.whisprmobiletemp`
3. **Download new `google-services.json`**
4. **Replace the current file**
5. **Enable Cloud Messaging** if not already enabled

## 🎯 **Priority**

1. **High Priority**: Set up Firebase project and replace `google-services.json`
2. **Medium Priority**: Configure Supabase environment variables
3. **Low Priority**: Deploy Edge Function (can be done later)

The app will work fine with local notifications only, but for production notifications (background/closed app), you need the Firebase setup.

Would you like me to help you with any specific step of the Firebase setup?

