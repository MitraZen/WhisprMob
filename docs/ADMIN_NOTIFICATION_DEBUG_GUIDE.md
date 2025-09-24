# Admin Notification Debug Guide

## Overview

The Whispr mobile app now includes a comprehensive admin notification debugging system to help diagnose and resolve notification issues on Android devices.

## Accessing Admin Mode

### Method 1: Logo Tap (Easiest)
1. Open the Whispr app
2. On the welcome screen, tap the logo (💬) **5 times quickly**
3. Admin mode will be enabled automatically

### Method 2: Direct Access
- Admin mode can also be triggered programmatically through the `useAdmin` hook

## Admin Authentication

Once admin mode is enabled:
1. Enter the admin password: `whispr_admin_2024`
2. Click "Authenticate" to access the admin panel

## Notification Debugging Features

### 1. Debug Information Panel
- **Platform Detection**: Shows current platform (Android/iOS)
- **Notification Module Status**: Verifies if the native notification module is available
- **Realtime Connection Status**: Shows Supabase realtime connection state
- **Polling Status**: Indicates if notification polling is active
- **Last Notification Time**: Shows when the last notification was sent
- **System Settings**: Displays notification permissions and system settings

### 2. Test Controls
- **Test All Notifications**: Runs comprehensive tests for all notification types
- **Start/Stop Debugging**: Enables/disables notification debugging session
- **Clear All Notifications**: Removes all pending notifications from the system

### 3. User Testing
- **Send Test to User**: Send test notifications to specific users
- **Notification Types**: Choose from message, note, or general notifications
- **User ID Input**: Enter specific user IDs for targeted testing

### 4. Test Results History
- **Success/Failure Tracking**: Visual indicators for each test result
- **Detailed Logging**: Timestamps and error details for each test
- **History Management**: Clear test history when needed

## Notification Types Tested

### 1. General Notifications
- Basic system notifications
- Used for app updates, general alerts
- Priority: Low

### 2. Message Notifications
- Buddy message notifications
- Includes sender name and message content
- Priority: High
- Includes vibration pattern

### 3. Note Notifications
- Whispr note notifications
- Anonymous note alerts
- Priority: Default
- Includes vibration pattern

### 4. Realtime Notifications
- Supabase realtime subscription notifications
- Tests real-time message delivery

### 5. Polling Notifications
- Background polling system notifications
- Tests periodic notification checks

## Troubleshooting Common Issues

### Issue: "NotificationModule not available"
**Cause**: Native Android module not properly linked
**Solution**: 
1. Check if the app was built with the latest code
2. Verify Android permissions are granted
3. Rebuild the app if necessary

### Issue: "No notifications appearing"
**Possible Causes**:
1. **Permissions**: Check if notification permissions are granted
2. **Do Not Disturb**: Verify device is not in silent/DND mode
3. **Battery Optimization**: Check if app is excluded from battery optimization
4. **Notification Channels**: Verify notification channels are properly created

### Issue: "Realtime connection failed"
**Cause**: Supabase connection issues
**Solution**:
1. Check internet connection
2. Verify Supabase credentials in `src/config/env.ts`
3. Check Supabase project status

### Issue: "Polling not active"
**Cause**: Background polling service not running
**Solution**:
1. Check if user is authenticated
2. Verify notification manager is initialized
3. Check for JavaScript errors in console

## Android-Specific Debugging

### Notification Channels
The app creates three notification channels:
- **whispr_messages**: High priority, vibration enabled
- **whispr_notes**: Default priority, vibration enabled  
- **whispr_general**: Low priority, no vibration

### Permissions Required
- `android.permission.VIBRATE`
- `android.permission.WAKE_LOCK`
- `android.permission.RECEIVE_BOOT_COMPLETED`

### Testing on Device
1. Install the latest APK build
2. Grant all notification permissions
3. Disable battery optimization for Whispr
4. Test notifications in different app states (foreground, background, killed)

## Admin Panel Features

### Database Controls
- Test database connection
- Refresh system statistics
- Clear all data (use with caution)
- Clear fake/test notes

### User Management
- Select users from buddy list
- Reset user data
- Simulate user activity
- Send test messages

### System Statistics
- Database connection status
- User counts (total, active, online)
- Message statistics
- System health indicators

## Security Notes

- Admin password should be changed in production
- Admin mode should be disabled in production builds
- Consider implementing IP restrictions for admin access
- Log all admin actions for audit purposes

## File Structure

```
src/
├── services/
│   ├── notificationDebugService.ts    # Core debugging service
│   ├── notificationService.ts         # Main notification service
│   ├── notificationManager.ts         # Polling manager
│   └── realtimeService.ts            # Realtime notifications
├── components/
│   └── AdminNotificationPanel.tsx    # Debug UI component
├── store/
│   └── AdminContext.tsx              # Admin state management
└── screens/
    └── AdminPanel.tsx                # Main admin interface
```

## Usage Instructions

1. **Enable Admin Mode**: Tap logo 5 times on welcome screen
2. **Authenticate**: Enter password `whispr_admin_2024`
3. **Open Notification Debug**: Click "Open Notification Debug Panel"
4. **Run Tests**: Use "Test All Notifications" to diagnose issues
5. **Check Results**: Review test results and debug information
6. **Send Test Notifications**: Test specific notification types to users
7. **Monitor**: Use debugging session to monitor notification behavior

## Best Practices

1. **Test Regularly**: Run notification tests after each app update
2. **Monitor Logs**: Check console logs for detailed error information
3. **User Feedback**: Collect user reports of notification issues
4. **Device Testing**: Test on various Android versions and devices
5. **Permission Checks**: Verify users have granted notification permissions

This debugging system provides comprehensive tools to identify and resolve notification issues, ensuring reliable message delivery for all Whispr users.

