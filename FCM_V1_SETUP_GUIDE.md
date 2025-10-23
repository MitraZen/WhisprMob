# 🔥 FCM v1 Setup Guide

## 📋 **What You Need to Do:**

### 1. **Get Firebase Service Account Key**

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your Whispr project**
3. **Go to Project Settings** (gear icon)
4. **Click "Service Accounts" tab**
5. **Click "Generate new private key"**
6. **Download the JSON file** (e.g., `whisprapp-firebase-adminsdk-xxxxx.json`)

### 2. **Set Supabase Environment Variables**

You need to set two environment variables in Supabase:

#### **FIREBASE_PROJECT_ID**
```bash
supabase secrets set FIREBASE_PROJECT_ID='your-firebase-project-id'
```

#### **FIREBASE_SERVICE_ACCOUNT_KEY**
```bash
supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Note**: The Service Account Key should be the entire JSON content as a single string.

### 3. **Test the FCM v1 Edge Function**

Once you've set the environment variables, test the Edge Function:

```bash
node test-fcm-curl.js
```

## 🔧 **Current Status:**

- ✅ **FCM v1 Edge Function deployed**: `send-fcm-notification-v1`
- ✅ **Proper JWT signing implemented**
- ✅ **OAuth2 token generation**
- ❌ **Need Firebase Service Account configuration**

## 📱 **Expected Results:**

Once configured, the Edge Function will:
1. **Parse the Service Account JSON**
2. **Generate OAuth2 access token**
3. **Send notification via FCM v1 API**
4. **Return success response**

## 🎯 **Next Steps:**

1. **Get your Firebase Service Account JSON**
2. **Set the Supabase secrets**
3. **Test the Edge Function**
4. **Update your app to use the new Edge Function**

---

**The FCM v1 API is more secure and is the recommended approach by Google!** 🚀

