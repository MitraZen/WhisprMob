# Background Notification Issue Analysis Report

## 📋 **Executive Summary**

Notifications are not being generated when the app is in background, even though it was working before. This analysis identifies the root causes and provides recommendations for fixes.

---

## 🔍 **Current State Analysis**

### **1. FCM Message Format** ✅ **Correct**

The Edge Function (`supabase/functions/send-fcm-notification-v1/index.ts`) correctly sends FCM messages with a **notification payload**:

```typescript
notification: {
  title: notification.title,
  body: notification.body
}
```

**Expected Behavior:**
- When app is **killed**: Android **automatically displays** the notification (no JS code runs)
- When app is **background**: Android **automatically displays** the notification, then calls the background handler
- When app is **foreground**: The `onMessage` handler is called, and you must **manually** show the notification

---

### **2. Background Handler in `index.js`** ⚠️ **Issue Identified**

**Current Code:**
```javascript
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 Background FCM message:', remoteMessage);
  
  // Handle ping messages (wake up realtime)
  if (remoteMessage.data?.type === 'ping') {
    console.log('📡 FCM Ping received in background');
    // Ping will trigger realtime reconnection when app opens
    // No need to process here - app will handle on foreground
  }
  
  // Return void (background handler requirement)
  return Promise.resolve();
});
```

**Problem:** 
- The handler only logs and handles "ping" messages
- It **does NOT display notifications** for regular message notifications
- This is actually **correct behavior** for messages with a `notification` payload (Android auto-displays them)
- However, the handler **doesn't handle data-only messages** that need manual notification display

**Impact:** 
- If FCM sends a **notification payload**, Android auto-displays ✅ (this should work)
- If FCM sends a **data-only payload**, no notification is shown ❌ (this breaks)

---

### **3. Recent Changes That May Have Broken It** 🔍

#### **Change 1: Native OS Permission Request**
**File:** `src/store/AuthContext.tsx` (recently updated)

**Before:**
- Custom Alert.alert() dialog
- Used `notificationService.checkNotificationPermission()`

**After:**
- Native OS permission dialog via `messaging().requestPermission()`
- Uses AsyncStorage to track if permission was already requested

**Potential Issue:**
- If user **denied** the native permission, notifications won't work
- The `AsyncStorage.getItem('notifPrompted')` check prevents re-prompting
- No fallback to request permission again

#### **Change 2: FCMManager-Only Initialization**
**File:** `src/store/AuthContext.tsx` (lines 306-332)

**Current Flow:**
- Only `FCMManager.initialize(userId)` is called
- No direct notification handler setup for background messages
- Background handler in `index.js` is set up, but might not be called if JS context isn't running

**Potential Issue:**
- If FCM token isn't saved correctly, Edge Function can't send notifications
- Token refresh might fail silently
- No error handling for FCM initialization failures

---

### **4. Missing Notification Display Logic** ❌ **Critical Issue**

**When App is Background (Not Killed):**
- FCM message arrives with `notification` payload
- Android **should** auto-display it
- Background handler in `index.js` is called but **doesn't verify** if notification was displayed
- If Android doesn't auto-display (e.g., due to battery optimization), **no notification is shown**

**When App is Killed:**
- FCM message arrives with `notification` payload
- Android **should** auto-display it
- No JS code runs (background handler doesn't execute)
- If Android doesn't auto-display, **no notification is shown** and there's no way to detect it

---

## 🔎 **Root Cause Analysis**

### **Primary Suspect: Missing Manual Notification Display in Background Handler**

The background handler assumes Android will automatically display notifications when a `notification` payload is present. However:

1. **Battery Optimization**: Some Android devices (OnePlus, Xiaomi, etc.) kill background processes aggressively, preventing automatic notification display
2. **Notification Channel Issues**: If the notification channel isn't properly configured, Android might not display notifications
3. **Permission Issues**: If notification permission was denied or not properly granted, Android won't display notifications
4. **FCM Token Issues**: If the FCM token isn't saved or is invalid, Edge Function can't send notifications

### **Secondary Suspect: Permission State**

The recent change to native OS permission dialog might have caused:
- Permission denial without proper error handling
- AsyncStorage flag preventing re-prompting
- Token not being saved after permission denial

---

## 📊 **What Should Happen vs What's Happening**

### **Expected Flow (When App is Background):**

```
1. Edge Function sends FCM with notification payload
   ↓
2. Android receives FCM message
   ↓
3. Android automatically displays notification (if permission granted)
   ↓
4. Background handler in index.js is called
   ↓
5. Handler logs message and returns
```

### **Actual Flow (Current Issue):**

```
1. Edge Function sends FCM with notification payload
   ↓
2. Android receives FCM message
   ↓
3. ❌ Android doesn't display notification (battery optimization/permission issue)
   ↓
4. Background handler in index.js is called (maybe)
   ↓
5. Handler only logs, doesn't manually display notification
   ↓
6. ❌ User sees no notification
```

---

## 🎯 **Recommendations**

### **Fix 1: Add Manual Notification Display to Background Handler** ✅ **HIGH PRIORITY**

**File:** `index.js`

**Change:**
- Import notification service in background handler
- When a non-ping FCM message arrives, manually display notification using `PushNotification.localNotification()`
- This ensures notifications are shown even if Android doesn't auto-display them

**Code Suggestion:**
```javascript
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 Background FCM message:', remoteMessage);
  
  // Handle ping messages (wake up realtime)
  if (remoteMessage.data?.type === 'ping') {
    console.log('📡 FCM Ping received in background');
    return Promise.resolve();
  }
  
  // For regular notifications, manually display if Android didn't
  if (remoteMessage.notification) {
    const { default: PushNotification } = require('react-native-push-notification');
    
    PushNotification.localNotification({
      id: Date.now(),
      channelId: 'whispr-messages',
      title: remoteMessage.notification.title || 'New Message',
      message: remoteMessage.notification.body || '',
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      priority: 'high',
      importance: 'high',
      userInfo: remoteMessage.data || {},
    });
  }
  
  return Promise.resolve();
});
```

### **Fix 2: Verify Notification Permission State** ✅ **MEDIUM PRIORITY**

**File:** `src/store/AuthContext.tsx`

**Change:**
- Add permission check before showing notification permission dialog
- If permission was denied, provide a way to re-prompt or show instructions
- Remove or reset AsyncStorage flag if user wants to re-enable notifications

**Code Suggestion:**
```typescript
const checkNotificationPermissions = async () => {
  try {
    // Check current permission state first
    const authStatus = await messaging().hasPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    
    if (enabled) {
      console.log('✅ Notification permission already granted');
      // Get and save token
      const token = await messaging().getToken();
      if (state.user?.id) {
        const { fcmManager } = await import('@/services/FCMManager');
        await fcmManager.initialize(state.user.id);
      }
      return;
    }
    
    // Check if we already prompted
    const prompted = await AsyncStorage.getItem('notifPrompted');
    if (prompted) {
      console.log('⚠️ Notification permission was denied - user needs to enable in settings');
      // Could show a helpful message here
      return;
    }
    
    // Request permission
    const newAuthStatus = await messaging().requestPermission();
    // ... rest of logic
  } catch (error) {
    console.error('❌ Error checking/requesting notification permissions:', error);
  }
};
```

### **Fix 3: Add FCM Token Validation** ✅ **MEDIUM PRIORITY**

**File:** `src/services/FCMManager.ts`

**Change:**
- Verify FCM token is valid after saving
- Check if token is saved to database successfully
- Log errors if token save fails

### **Fix 4: Add Notification Display Fallback** ✅ **LOW PRIORITY**

**File:** `src/services/notificationService.ts`

**Change:**
- In `showMessageNotification()`, if permission check fails, still attempt to show notification
- Some Android devices work even without explicit permission verification
- Better error logging to understand why notifications aren't showing

---

## 🧪 **Testing Recommendations**

1. **Test Permission State:**
   - Check if notification permission is actually granted in Android settings
   - Verify FCM token is saved in database (`user_fcm_tokens` table)
   - Check logs for permission-related errors

2. **Test Battery Optimization:**
   - Verify app is excluded from battery optimization
   - Test with app in background (not killed) vs app killed
   - Check if notifications appear in both scenarios

3. **Test FCM Delivery:**
   - Send a test FCM notification via Edge Function
   - Check Firebase Console for delivery status
   - Verify message is received by device

4. **Test Notification Channel:**
   - Verify `whispr-messages` channel exists and is properly configured
   - Check channel importance level (should be HIGH)
   - Verify channel isn't disabled by user

---

## 📝 **Summary**

**Primary Issue:**
- Background handler doesn't manually display notifications
- Relies entirely on Android's automatic notification display
- Battery optimization/permission issues prevent automatic display

**Secondary Issues:**
- Recent permission dialog change might have caused permission denial
- No verification that notifications are actually being displayed
- Missing error handling for FCM token issues

**Recommended Fixes (Priority Order):**
1. ✅ Add manual notification display to background handler (HIGH)
2. ✅ Improve permission state checking and error handling (MEDIUM)
3. ✅ Add FCM token validation (MEDIUM)
4. ✅ Add notification display fallback (LOW)

---

## 🔗 **Related Files**

- `index.js` - Background FCM handler
- `src/store/AuthContext.tsx` - Permission request logic
- `src/services/notificationService.ts` - Notification display logic
- `src/services/FCMManager.ts` - FCM token management
- `supabase/functions/send-fcm-notification-v1/index.ts` - Edge Function that sends FCM messages

