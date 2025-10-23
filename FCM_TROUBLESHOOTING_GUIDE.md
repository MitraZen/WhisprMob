# 🔥 FCM Notification Troubleshooting Guide

## 🚨 **Common FCM Issues & Solutions**

### **1. Notifications Not Coming on Some Devices**

#### **Root Causes:**
- **Invalid/Expired FCM Tokens**: Tokens become invalid after app uninstall, token refresh, or long inactivity
- **Device Battery Optimization**: Android devices may kill FCM services to save battery
- **Network Issues**: Poor connectivity or firewall blocking FCM servers
- **App State**: App killed by system or user

#### **Solutions:**
```typescript
// 1. Implement token validation and refresh
import { FCMReliabilityService } from '@/services/fcmReliabilityService';

// Check token validity before sending
const isValid = await FCMReliabilityService.getValidFCMToken(userId);
if (!isValid) {
  // Prompt user to re-login or refresh token
  await refreshUserToken(userId);
}

// 2. Add retry logic for failed notifications
const result = await FCMReliabilityService.sendReliableNotification(
  userId, title, body, data
);
if (!result.success && result.retryable) {
  // Retry with exponential backoff
  await retryNotification(userId, title, body, data);
}
```

### **2. Missing Notifications**

#### **Root Causes:**
- **Duplicate Prevention**: App prevents duplicate notifications but may be too aggressive
- **Rate Limiting**: FCM has rate limits that may cause dropped notifications
- **Background Processing**: iOS/Android may limit background processing

#### **Solutions:**
```typescript
// 1. Improve duplicate detection
const notificationKey = `${messageId}-${userId}-${timestamp}`;
if (!this.recentNotifications.has(notificationKey)) {
  this.recentNotifications.add(notificationKey);
  
  // Clean up old keys periodically
  if (this.recentNotifications.size > 1000) {
    this.recentNotifications.clear();
  }
}

// 2. Implement notification queuing
class NotificationQueue {
  private queue: Array<NotificationItem> = [];
  private processing = false;

  async add(notification: NotificationItem) {
    this.queue.push(notification);
    if (!this.processing) {
      await this.processQueue();
    }
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      await this.sendNotification(notification);
      await this.delay(100); // Rate limiting
    }
    this.processing = false;
  }
}
```

### **3. Glitchy Notification Behavior**

#### **Root Causes:**
- **Race Conditions**: Multiple notification attempts happening simultaneously
- **Token Conflicts**: Multiple tokens for same user causing confusion
- **Edge Function Timeouts**: Supabase Edge Function timing out

#### **Solutions:**
```typescript
// 1. Implement proper locking mechanism
class NotificationLock {
  private locks = new Map<string, Promise<void>>();

  async acquireLock(key: string): Promise<() => void> {
    if (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, lockPromise);
    return releaseLock!;
  }
}

// 2. Clean up duplicate tokens
async function cleanupDuplicateTokens(userId: string) {
  const { data: tokens } = await supabase
    .from('user_fcm_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (tokens && tokens.length > 1) {
    // Keep only the most recent token
    const tokensToDelete = tokens.slice(1);
    for (const token of tokensToDelete) {
      await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('id', token.id);
    }
  }
}
```

## 🔧 **Enhanced FCM Implementation**

### **1. Token Management**
```typescript
// Enhanced token refresh handling
messaging().onTokenRefresh(async (newToken) => {
  console.log('🔥 FCM Token refreshed:', newToken);
  
  // Update database with new token
  await FCMReliabilityService.updateTokenUsage(newToken);
  
  // Clean up old tokens for this user
  await cleanupDuplicateTokens(currentUserId);
});
```

### **2. Delivery Tracking**
```typescript
// Track notification delivery success/failure
interface NotificationLog {
  id: string;
  userId: string;
  title: string;
  body: string;
  sentAt: string;
  success: boolean;
  error?: string;
  retryCount: number;
}

// Log all notification attempts
async function logNotificationAttempt(log: NotificationLog) {
  await supabase
    .from('notification_logs')
    .insert(log);
}
```

### **3. Background Processing**
```typescript
// Enhanced background message handling
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('🔥 Background message received:', remoteMessage);
  
  // Process message in background
  try {
    await processBackgroundMessage(remoteMessage);
  } catch (error) {
    console.error('🔥 Background processing error:', error);
    // Log error for debugging
    await logBackgroundError(error, remoteMessage);
  }
});
```

## 📊 **Monitoring & Diagnostics**

### **1. Real-time Monitoring**
```typescript
// Monitor FCM delivery rates
class FCMMonitor {
  private deliveryStats = {
    total: 0,
    success: 0,
    failed: 0,
    retries: 0
  };

  async trackDelivery(success: boolean, retryCount: number = 0) {
    this.deliveryStats.total++;
    if (success) {
      this.deliveryStats.success++;
    } else {
      this.deliveryStats.failed++;
    }
    this.deliveryStats.retries += retryCount;

    // Log stats every 100 notifications
    if (this.deliveryStats.total % 100 === 0) {
      console.log('🔥 FCM Delivery Stats:', this.deliveryStats);
    }
  }
}
```

### **2. Automated Cleanup**
```typescript
// Schedule regular token cleanup
setInterval(async () => {
  console.log('🔥 Running scheduled FCM token cleanup...');
  await FCMReliabilityService.cleanupInvalidTokens();
}, 24 * 60 * 60 * 1000); // Daily cleanup
```

## 🚀 **Best Practices**

### **1. Error Handling**
- Always implement retry logic for network errors
- Handle FCM-specific errors appropriately
- Log all errors for debugging
- Provide fallback mechanisms

### **2. Token Management**
- Validate tokens before sending notifications
- Clean up invalid/expired tokens regularly
- Handle token refresh events properly
- Avoid duplicate tokens per user

### **3. Performance**
- Implement notification queuing for high volume
- Use batch operations when possible
- Monitor delivery rates and adjust accordingly
- Cache frequently used data

### **4. User Experience**
- Show clear error messages to users
- Provide manual refresh options
- Implement offline notification queuing
- Test on various devices and network conditions

## 🔍 **Debugging Tools**

### **1. FCM Diagnostic Component**
```typescript
// Use the FCMDiagnostic component for debugging
import { FCMDiagnostic } from '@/components/FCMDiagnostic';

// In your debug screen
<FCMDiagnostic 
  userId={currentUserId}
  onClose={() => setShowDiagnostic(false)}
/>
```

### **2. Console Logging**
```typescript
// Enable detailed FCM logging
const FCM_DEBUG = __DEV__;

if (FCM_DEBUG) {
  console.log('🔥 FCM Debug Mode Enabled');
  // Log all FCM operations
}
```

### **3. Database Queries**
```sql
-- Check FCM token status
SELECT 
  user_id,
  fcm_token,
  platform,
  updated_at,
  CASE 
    WHEN updated_at > NOW() - INTERVAL '7 days' THEN 'Valid'
    ELSE 'Expired'
  END as status
FROM user_fcm_tokens
ORDER BY updated_at DESC;

-- Check notification delivery rates
SELECT 
  DATE(sent_at) as date,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM notification_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

## 📱 **Device-Specific Issues**

### **Android**
- **Battery Optimization**: Guide users to disable battery optimization for your app
- **Doze Mode**: Test notifications when device is in doze mode
- **Background Restrictions**: Handle background execution limits

### **iOS**
- **Background App Refresh**: Ensure it's enabled for your app
- **Notification Permissions**: Handle permission changes gracefully
- **APNs Certificate**: Ensure APNs certificate is valid and up-to-date

## 🎯 **Quick Fixes**

### **Immediate Actions:**
1. **Run Token Cleanup**: `await FCMReliabilityService.cleanupInvalidTokens()`
2. **Check System Health**: `await FCMDiagnosticService.runFullDiagnostics()`
3. **Test User Delivery**: `await FCMDiagnosticService.testUserDelivery(userId)`
4. **Generate Report**: `await FCMDiagnosticService.generateDiagnosticReport()`

### **Long-term Solutions:**
1. **Implement Token Refresh Strategy**
2. **Add Notification Queuing**
3. **Set up Monitoring Dashboard**
4. **Create Automated Cleanup Jobs**
5. **Implement User Feedback System**

This comprehensive approach should resolve most FCM notification issues and provide a robust, reliable notification system.

