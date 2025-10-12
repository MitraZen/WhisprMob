# Notification Service Test Script

## 🧪 **Testing the Notification Fixes**

### **Test 1: Permission Check**
```javascript
// Test notification permissions
const { notificationService } = require('./src/services/notificationService');

async function testPermissions() {
  try {
    const result = await notificationService.testNotification();
    console.log('Permission test result:', result);
  } catch (error) {
    console.error('Permission test failed:', error);
  }
}

testPermissions();
```

### **Test 2: Message Notification**
```javascript
// Test message notification
async function testMessageNotification() {
  try {
    const result = await notificationService.showMessageNotification(
      'Test Message',
      'Hello from test!',
      'Test Buddy'
    );
    console.log('Message notification result:', result);
  } catch (error) {
    console.error('Message notification test failed:', error);
  }
}

testMessageNotification();
```

### **Test 3: Note Notification**
```javascript
// Test note notification
async function testNoteNotification() {
  try {
    const result = await notificationService.showNoteNotification(
      'Test Note',
      'This is a test whispr note!'
    );
    console.log('Note notification result:', result);
  } catch (error) {
    console.error('Note notification test failed:', error);
  }
}

testNoteNotification();
```

### **Test 4: Notification Manager Polling**
```javascript
// Test notification manager
const { notificationManager } = require('./src/services/notificationManager');

async function testPolling() {
  try {
    // Start polling for a test user
    notificationManager.startPolling('test-user-123');
    console.log('Polling started:', notificationManager.isPolling());
    
    // Wait 35 seconds to see if polling triggers
    setTimeout(() => {
      console.log('Polling still active:', notificationManager.isPolling());
      notificationManager.stopPolling();
      console.log('Polling stopped');
    }, 35000);
  } catch (error) {
    console.error('Polling test failed:', error);
  }
}

testPolling();
```

### **Test 5: Realtime Service**
```javascript
// Test realtime service
const { realtimeService } = require('./src/services/realtimeService');

async function testRealtime() {
  try {
    await realtimeService.initialize('test-user-123');
    console.log('Realtime connected:', realtimeService.isRealtimeConnected());
    
    const status = realtimeService.getConnectionStatus();
    console.log('Realtime status:', status);
    
    await realtimeService.disconnect();
    console.log('Realtime disconnected');
  } catch (error) {
    console.error('Realtime test failed:', error);
  }
}

testRealtime();
```

## 📱 **Manual Testing Steps**

### **Android Testing**
1. **Check Permissions**: Go to Settings > Apps > Whispr > Permissions
2. **Enable Notifications**: Ensure "Notifications" permission is enabled
3. **Test Notification**: Use the test notification button in settings
4. **Check Console**: Look for notification-related logs
5. **Test Background**: Send a message while app is in background

### **iOS Testing**
1. **Check Permissions**: Go to Settings > Whispr > Notifications
2. **Enable Notifications**: Ensure notifications are allowed
3. **Test Notification**: Use the test notification button
4. **Check Console**: Look for notification-related logs

## 🔍 **What to Look For**

### **Console Logs**
- `Notification polling started for user: [userId]`
- `Realtime service initialized successfully`
- `Channel created: true` (Android)
- `Message notification sent` or `Note notification sent`
- `Background notification sent for new message from: [buddyName]`

### **Expected Behavior**
- **Immediate**: Test notifications should appear instantly
- **Real-time**: New messages should trigger notifications immediately
- **Polling**: Background polling should check every 30 seconds
- **Fallback**: If real-time fails, polling should still work

## ⚠️ **Common Issues**

### **Permission Denied**
- **Symptom**: No notifications appear
- **Fix**: Check device notification settings
- **Command**: `adb shell pm grant com.whisprmobiletemp android.permission.POST_NOTIFICATIONS`

### **Realtime Connection Failed**
- **Symptom**: Only polling notifications work
- **Fix**: Check Supabase connection and RLS policies
- **Fallback**: Polling should still work every 30 seconds

### **Polling Not Working**
- **Symptom**: No background notifications
- **Fix**: Check if app is being killed by battery optimization
- **Settings**: Disable battery optimization for Whispr

## 📊 **Performance Monitoring**

### **Battery Usage**
- Monitor if reduced polling intervals affect battery
- Check if real-time subscriptions use more battery
- Consider adjusting intervals if needed

### **Network Usage**
- Monitor database queries from polling
- Check if increased buddy limit affects performance
- Consider implementing smart polling

## 🚀 **Next Steps**

1. **Test the fixes** using the scripts above
2. **Monitor console logs** for any errors
3. **Test on both platforms** (Android and iOS)
4. **Check real-world scenarios** (background, foreground, etc.)
5. **Monitor performance** and adjust if needed

The notification system should now work much better with:
- ✅ 30-second polling intervals (instead of 5 minutes)
- ✅ 20 buddy limit (instead of 5)
- ✅ Permission requests on both platforms
- ✅ Permission checking before sending notifications
- ✅ Realtime service enabled (with polling fallback)
