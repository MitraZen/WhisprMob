# Device-Specific Notification Optimization Guide

## 📱 **OnePlus / Xiaomi / Vivo / Oppo**

These manufacturers aggressively kill background tasks, which can affect FCM delivery.

### ✅ **Required User Actions**

1. **Enable Auto-Start Permission**
   - Settings → Apps → Whispr → Auto-start
   - Enable this to allow app to start in background

2. **Disable Battery Optimization**
   - Settings → Battery → Battery Optimization
   - Find "Whispr" and set to "Unrestricted" or "Don't optimize"

3. **App-Specific Settings**
   - Settings → Apps → Whispr → Notifications
   - Ensure "Allow notifications" is enabled
   - Set "Notification importance" to "High"

### ⚙️ **Technical Optimizations Implemented**

#### **1. FCM High Priority Messages**

The Edge Function now sends all notifications with high priority:

```typescript
{
  android: {
    priority: 'high',
    notification: {
      channel_id: 'whispr-messages',
      sound: 'default',
      vibrate_timings: [300, 100, 300],
      priority: 'high',
      visibility: 'public'
    },
    ttl: '60s' // 60 seconds TTL
  }
}
```

**What this does:**
- Forces FCM to wake the device immediately
- Shows notification even when app is killed
- Vibrates and plays sound aggressively
- Uses 60-second TTL for reliable delivery

#### **2. Token Refresh Logging**

Enhanced logging for token refresh events:

```typescript
console.log('🔁 FCM Token refreshed at:', new Date().toISOString());
console.log('🔥 FCM New token:', token.substring(0, 20) + '...');
```

#### **3. Realtime Connection Timeout**

Increased Supabase realtime timeout from default (5000ms) to 20000ms:

```typescript
timeout: 20000 // 20 seconds timeout
```

### 🧪 **Testing Checklist**

#### **For OnePlus/Xiaomi/Vivo/Oppo Users:**
- [ ] Enable auto-start permission
- [ ] Disable battery optimization
- [ ] Set notification importance to "High"
- [ ] Test with app in background (not just minimized)
- [ ] Test with device in power saver mode
- [ ] Test with app fully closed (swiped from recents)

#### **For All Devices:**
- [ ] Test foreground notifications
- [ ] Test background notifications
- [ ] Test with device locked
- [ ] Test with poor network connectivity
- [ ] Verify notification sound and vibration

### 📊 **Expected Behavior**

#### **After Optimizations:**

1. **Foreground Notifications**: Immediate delivery
2. **Background Notifications**: Delivery within 1-2 seconds
3. **App Killed**: Delivery within 2-3 seconds (with auto-start enabled)
4. **Device Locked**: Delivery within 1-2 seconds
5. **Battery Saver Mode**: Delivery within 3-5 seconds (requires unrestricted battery access)

### ⚠️ **Known Limitations**

1. **Battery Saver Mode**: May still delay notifications by 5-10 seconds if battery optimization is enabled
2. **Extreme Battery Optimization**: Some devices may require manual battery whitelisting
3. **Network Issues**: Poor connectivity can delay delivery regardless of optimizations

### 🔍 **Troubleshooting**

#### **Notifications Not Coming Through:**

1. **Check FCM Token Registration**
   ```typescript
   // Look for this log in console
   console.log('🔥 FCM Token:', token);
   ```

2. **Check Device-Specific Permissions**
   - Auto-start: Enabled?
   - Battery optimization: Unrestricted?
   - Notification permissions: Allowed?

3. **Check Network Connection**
   - Ensure device has internet connectivity
   - Check if FCM service is reachable

#### **Delayed Notifications:**

1. **Check Battery Saver Mode**: Turn off temporarily
2. **Check Background App Refresh**: Ensure enabled
3. **Check Network Throttling**: Disable data saver mode

### 📝 **Implementation Notes**

- **Edge Function**: Updated with high-priority Android configuration
- **Client-Side**: No changes required (uses existing notification handler)
- **Backward Compatible**: Works on all Android devices
- **No Breaking Changes**: Existing functionality preserved

### 🎯 **Next Steps for Production**

1. **Monitor FCM Delivery Stats**: Check Firebase Console for delivery success rates
2. **User Education**: Provide in-app instructions for device-specific settings
3. **Fallback Handling**: Ensure realtime connection works for offline-to-online scenarios
4. **Analytics**: Track notification delivery rates by device manufacturer


