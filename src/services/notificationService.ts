import { Platform, Alert, DeviceEventEmitter } from 'react-native';
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '@/config/supabase';

// ⚠️ TEMPORARY: Suppress modular API deprecation warnings until migration to v22 modular API is complete
// TODO: Migrate to modular API when React Native Firebase v22 stable is released
// See: https://rnfirebase.io/migrating-to-v22
if (typeof globalThis !== 'undefined') {
  (globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

export interface NotificationService {
  showMessageNotification: (title: string, message: string, buddyName: string, messageCount?: number, buddyId?: string) => Promise<string>;
  showNoteNotification: (title: string, content: string) => Promise<string>;
  showGeneralNotification: (title: string, content: string) => Promise<string>;
  cancelAllNotifications: () => Promise<string>;
  testNotification: () => Promise<string>;
  setChatActive: (isActive: boolean) => void;
  getFCMToken: () => Promise<string | null>;
  requestNotificationPermission: () => Promise<boolean>;
  checkNotificationPermission: () => Promise<boolean>;
  configurePushNotifications: () => void; // ✅ Expose for external initialization
  handleFCMPing: () => Promise<void>;
}

class NotificationServiceClass implements NotificationService {
  private recentNotifications = new Set<string>();
  private isChatActive = false;
  private fcmToken: string | null = null;
  private fcmHandlersSetup = false;
  
  constructor() {
    // ✅ Only set up local notifications, not FCM
    this.configurePushNotifications();
    // ❌ REMOVED: FCM initialization - now handled by FCMManager only
    // Don't call initializePermissions here - permissions requested on demand
  }
  
  setChatActive(isActive: boolean) {
    this.isChatActive = isActive;
    console.log('🔔 Chat active state set to:', isActive);
  }

  // ❌ REMOVED: saveFCMTokenToDatabase methods - handled by FCMManager
  // These methods are now only in FCMManager to avoid duplication

  async getFCMToken(): Promise<string | null> {
    try {
      if (!this.fcmToken) {
        this.fcmToken = await messaging().getToken();
      }
      return this.fcmToken;
    } catch (error) {
      console.error('🔥 Error getting FCM token:', error);
      return null;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      // ✅ Get token but don't save - FCMManager handles token management
      if (enabled && !this.fcmToken) {
        this.fcmToken = await messaging().getToken();
        console.log('🔥 FCM token obtained (will be saved by FCMManager)');
      }
      
      return enabled;
    } catch (error) {
      console.error('🔥 Error requesting notification permission:', error);
      console.log('🔥 FCM not available - using local notifications only');
      try {
        await PushNotification.requestPermissions();
        return true;
      } catch (localError) {
        console.error('Local notification permission also failed:', localError);
        return false;
      }
    }
  }

  // ❌ DEPRECATED: This method is no longer used - FCMManager handles all FCM initialization
  // Keeping for backward compatibility but it does nothing
  async initializeFCMAfterLogin(userId?: string): Promise<void> {
    console.warn('⚠️ initializeFCMAfterLogin called but is deprecated - FCMManager handles FCM initialization');
    console.warn('⚠️ This method does nothing and will be removed in a future version');
    // Do nothing - FCMManager handles everything
  }

  // ❌ DEPRECATED: This method is no longer used - FCMManager handles token clearing
  async clearFCMTokenOnLogout(userId?: string): Promise<void> {
    console.warn('⚠️ clearFCMTokenOnLogout called but is deprecated - FCMManager handles token cleanup');
    console.warn('⚠️ This method does nothing and will be removed in a future version');
    // Do nothing - FCMManager handles everything
  }

  // ❌ DEPRECATED: This method is no longer used - FCMManager handles token saving
  async saveFCMTokenWhenAuthenticated(userId?: string): Promise<void> {
    console.warn('⚠️ saveFCMTokenWhenAuthenticated called but is deprecated - FCMManager handles token management');
    console.warn('⚠️ This method does nothing and will be removed in a future version');
    // Do nothing - FCMManager handles everything
  }
  
  // ✅ Make public for external initialization
  configurePushNotifications(): void {
    PushNotification.configure({
      onRegister: function (token: any) {
        console.log('LOCAL TOKEN:', token);
      },
      
      onNotification: (notification: any) => {
        console.log('🔔 [EVENT] onNotification callback triggered:', notification);
        console.log('🔔 [EVENT] Notification userInteraction:', notification.userInteraction);
        
        if (notification.userInteraction || notification.userInteraction === true) {
          console.log('🔔 [EVENT] Notification was tapped by user');
          setTimeout(() => {
            this.handleNotificationTap(notification);
          }, 100);
        }
        
        if (notification.finish !== 1) {
          console.log('🔔 [EVENT] Notification will be displayed to user');
        }
      },
      
      popInitialNotification: true,
      requestPermissions: true,
    });
    
    // Create notification channels for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'whispr-messages',
          channelName: 'Whispr Messages',
          channelDescription: 'Notifications for incoming messages',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
      
      PushNotification.createChannel(
        {
          channelId: 'whispr-notes',
          channelName: 'Whispr Notes',
          channelDescription: 'Notifications for new notes',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }
  }

  async checkNotificationPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      const fcmEnabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (fcmEnabled) {
        console.log('FCM permission granted');
        return true;
      }
      
      const permissions = true; // Assume local permissions
      console.log('Local notification permissions check result:', permissions);
      
      return permissions;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }
  
  /**
   * ✅ KEPT: Set up FCM message handlers
   * This is called by notificationManager after FCMManager initializes
   * Only handles foreground messages, not token management
   */
  setupFCMHandlers(): void {
    if (this.fcmHandlersSetup) {
      console.log('🔥 FCM handlers already set up, skipping');
      return;
    }

    console.log('🔥 Setting up FCM message handlers...');
    
    // ❌ REMOVED: setBackgroundMessageHandler
    // This must be in index.js before app initialization
    // See the separate index.js fix
    
    // ✅ KEPT: Foreground message handler (for ping messages)
    messaging().onMessage(async (remoteMessage) => {
      console.log('🔥 FCM message received in foreground:', remoteMessage);
      
      if (remoteMessage.data?.type === 'ping') {
        console.log('🔥 FCM ping received - handling wake-up...');
        await this.handleFCMPing();
        return;
      }
      
      console.log('🔕 Skipping foreground notification - hybrid system handles it');
    });
    
    this.fcmHandlersSetup = true;
    console.log('✅ FCM message handlers set up successfully');
  }

  /**
   * ✅ KEPT: Handle FCM ping notification
   */
  async handleFCMPing(): Promise<void> {
    try {
      console.log('🔥 Handling FCM ping - reconnecting to realtime...');
      
      const { realtimeService } = await import('@/services/realtimeService');
      await realtimeService.forceReconnection();
      
      console.log('✅ FCM ping handled successfully');
    } catch (error) {
      console.error('❌ Error handling FCM ping:', error);
    }
  }

  /**
   * ✅ KEPT: Handle notification tap
   */
  private handleNotificationTap(notification: any): void {
    (async () => {
      try {
        console.log('🔔 [TAP] Handling notification tap:', notification);
        
        const userInfo = notification.userInfo || notification.data;
        const buddyName = userInfo?.buddyName;
        const buddyId = userInfo?.buddyId;
        
        if (!buddyName && !buddyId) {
          console.warn('🔔 [TAP] No buddyName or buddyId in notification');
          return;
        }

        console.log('🔔 [TAP] Navigating to chat for:', { buddyName, buddyId });

        // ✅ Emit navigation event immediately
        console.log('🔔 [TAP] Emitting navigation event');
        DeviceEventEmitter.emit('navigateToChat', { 
          buddyId, 
          buddyName, 
          fromNotification: true // ✅ Flag for seamless loading integration
        });
      } catch (error) {
        console.error('❌ [TAP] Error handling notification tap:', error);
      }
    })();
  }
  
  async showMessageNotification(title: string, message: string, buddyName: string, messageCount?: number, buddyId?: string): Promise<string> {
    try {
      console.log('🔔 [NOTIFICATION] showMessageNotification called:', { title, message, buddyName, messageCount, buddyId });
      
      // ✅ FIXED: Use consistent notification key based on buddyName
      // This ensures all notifications from the same user use the same key/id
      // preventing duplicates when first message shows and then batch timer fires
      const notificationKey = `batch-${buddyName}`;
      
      if (messageCount && messageCount > 1) {
        console.log('🔔 [NOTIFICATION] Batched notification - will update existing');
      } else {
        // For single messages, check if we already showed a notification for this user
        // This prevents duplicate when batch timer fires after immediate notification
        if (this.recentNotifications.has(notificationKey)) {
          console.log('🔔 [NOTIFICATION] Duplicate notification prevented (same user notification already shown):', notificationKey);
          return 'Duplicate notification prevented';
        }
        this.recentNotifications.add(notificationKey);
        setTimeout(() => {
          this.recentNotifications.delete(notificationKey);
        }, 5000);
      }
      
      console.log('🔔 [NOTIFICATION] Chat active state:', this.isChatActive);
      if (this.isChatActive) {
        console.log('🔔 [NOTIFICATION] Notification suppressed - chat is active');
        return 'Notification suppressed - chat active';
      }
      
      const hasPermission = await this.checkNotificationPermission();
      console.log('🔔 Notification permission status:', hasPermission);
      
      if (!hasPermission) {
        console.warn('🔔 [NOTIFICATION] Permission not granted - requesting');
        const permissionGranted = await this.requestNotificationPermission();
        if (!permissionGranted) {
          console.warn('🔔 [NOTIFICATION] Permission still not granted');
          return 'Notification permission not granted';
        }
      }

      console.log('🔔 [NOTIFICATION] Showing local notification now...');
      
      const displayTitle = messageCount && messageCount > 1 
        ? `${buddyName} (${messageCount} messages)`
        : buddyName;
      
      const displayMessage = message;
      
      const getNotificationId = (name: string): number => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          const char = name.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash) || 1;
      };
      
      // ✅ FIXED: Always use consistent notification ID based on buddyName
      // This allows notifications from the same user to update/replace each other
      // even for single messages, preventing duplicate notifications
      const notificationId = getNotificationId(buddyName);
      
      PushNotification.localNotification({
        id: notificationId,
        channelId: 'whispr-messages',
        title: displayTitle,
        message: displayMessage,
        tag: buddyName,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        userInfo: { 
          id: notificationId,
          buddyName: buddyName,
          buddyId: buddyId, // ✅ Include buddyId for faster lookup
          messageCount: messageCount || 1,
          isBatched: messageCount && messageCount > 1
        },
      });

      console.log('🔔 [NOTIFICATION] Notification sent successfully!', { notificationId, tag: buddyName });
      return 'Message notification sent successfully';
    } catch (error) {
      console.error('Error sending message notification:', error);
      throw error;
    }
  }

  async showNoteNotification(title: string, content: string): Promise<string> {
    try {
      const hasPermission = await this.checkNotificationPermission();
      if (!hasPermission) {
        console.warn('Notification permission not granted - requesting');
        const permissionGranted = await this.requestNotificationPermission();
        if (!permissionGranted) {
          console.warn('Permission still not granted');
          return 'Notification permission not granted';
        }
      }

      PushNotification.localNotification({
        channelId: 'whispr-notes',
        title: title,
        message: content,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });

      console.log('Note notification sent');
      return 'Note notification sent successfully';
    } catch (error) {
      console.error('Error sending note notification:', error);
      throw error;
    }
  }
  
  async showGeneralNotification(title: string, content: string): Promise<string> {
    try {
      PushNotification.localNotification({
        channelId: 'whispr-messages',
        title: title,
        message: content,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });
      
      console.log('General notification sent');
      return 'General notification sent successfully';
    } catch (error) {
      console.error('Error sending general notification:', error);
      throw error;
    }
  }
  
  async cancelAllNotifications(): Promise<string> {
    try {
      PushNotification.cancelAllLocalNotifications();
      console.log('All notifications cancelled');
      return 'All notifications cancelled successfully';
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      throw error;
    }
  }
  
  async testNotification(): Promise<string> {
    try {
      let token = null;
      try {
        token = await this.getFCMToken();
        console.log('🔥 Test notification - FCM Token:', token);
      } catch (fcmError) {
        console.log('🔥 FCM not available for test:', fcmError);
      }
      
      PushNotification.localNotification({
        channelId: 'whispr-messages',
        title: 'Whispr Test',
        message: `FCM Token: ${token ? 'Available' : 'Not Available (Local Only)'}`,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });
      
      console.log('Test notification sent');
      Alert.alert('Test Notification', `Test notification sent! FCM Token: ${token ? 'Available' : 'Not Available (Local Only)'}`);
      return 'Test notification sent successfully';
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Test Notification Error', `Failed to send test notification: ${error}`);
      throw error;
    }
  }
}

export const notificationService = new NotificationServiceClass();