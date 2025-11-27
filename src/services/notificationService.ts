import { Platform, Alert, DeviceEventEmitter, Linking } from 'react-native';
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '@/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ TEMPORARY: Suppress modular API deprecation warnings until migration to v22 modular API is complete
// TODO: Migrate to modular API when React Native Firebase v22 stable is released
// See: https://rnfirebase.io/migrating-to-v22
if (typeof globalThis !== 'undefined') {
  (globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

export interface NotificationService {
  showMessageNotification: (arg1: any, arg2?: string, arg3?: string, arg4?: number, arg5?: string) => Promise<string>;
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
  private static readonly APP_NOTIFICATIONS_ENABLED_KEY = 'appNotificationsEnabled';
  
  constructor() {
    // ✅ Only set up local notifications, not FCM
    this.configurePushNotifications();
    // ❌ REMOVED: FCM initialization - now handled by FCMManager only
    // Don't call initializePermissions here - permissions requested on demand
  }

  /**
   * Check if app-level notifications are enabled
   * Returns true by default (if not set, assume enabled)
   */
  private async isAppNotificationEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(NotificationServiceClass.APP_NOTIFICATIONS_ENABLED_KEY);
      // Default to true if not set (backward compatibility)
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error checking app notification state:', error);
      // Default to true on error
      return true;
    }
  }

  /**
   * Set app-level notification enabled state
   */
  static async setAppNotificationEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(NotificationServiceClass.APP_NOTIFICATIONS_ENABLED_KEY, enabled.toString());
      console.log(`🔔 App-level notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error setting app notification state:', error);
    }
  }

  /**
   * Get app-level notification enabled state
   */
  static async getAppNotificationEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(NotificationServiceClass.APP_NOTIFICATIONS_ENABLED_KEY);
      // Default to true if not set (backward compatibility)
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error getting app notification state:', error);
      // Default to true on error
      return true;
    }
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
  
  // Replace your existing showMessageNotification implementation with this drop-in method
  async showMessageNotification(
    arg1: any,
    arg2?: string,
    arg3?: string,
    arg4?: number,
    arg5?: string
  ): Promise<string> {
    try {
      // --- Normalize parameters (support object-style or legacy positional)
      let providedTitle: string | null = null;
      let message: string = '';
      let buddyName: string = 'New Message';
      let messageCount: number | undefined = undefined;
      let buddyId: string | undefined = undefined;

      if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
        // object style: showMessageNotification({ title, message, buddyName, messageCount, buddyId })
        providedTitle = arg1.title ?? null;
        message = String(arg1.message ?? '');
        buddyName = arg1.buddyName ?? arg1.name ?? arg1.displayName ?? buddyName;
        messageCount = typeof arg1.messageCount === 'number' ? arg1.messageCount : undefined;
        buddyId = arg1.buddyId ?? arg1.id ?? undefined;
      } else {
        // legacy positional: showMessageNotification(title, message, buddyName, messageCount?, buddyId?)
        providedTitle = typeof arg1 === 'string' ? arg1 : null;
        message = String(arg2 ?? '');
        buddyName = (typeof arg3 === 'string' && arg3.length > 0) ? arg3 : buddyName;
        messageCount = typeof arg4 === 'number' ? arg4 : undefined;
        buddyId = typeof arg5 === 'string' ? arg5 : undefined;
      }

      // Ensure safe strings
      providedTitle = providedTitle === undefined ? null : providedTitle;
      message = message ?? '';
      buddyName = buddyName ?? 'New Message';

      // Check app-level notifications state
      const appNotificationsEnabled = await this.isAppNotificationEnabled();
      if (!appNotificationsEnabled) {
        console.log('🔕 [NOTIFICATION] App-level notifications are disabled - skipping notification');
        return 'App-level notifications disabled';
      }

      const { AppState } = require('react-native');
      const currentAppState = AppState.currentState;

      // Smart title selection (explicit title wins unless it's generic fallback)
      const finalTitle =
        (typeof providedTitle === 'string' && providedTitle.trim().length > 0 && providedTitle !== 'New Message')
          ? providedTitle
          : (typeof buddyName === 'string' && buddyName.trim().length > 0)
          ? buddyName
          : 'New Message';

      // Prepare message body
      const displayMessage = (messageCount && messageCount > 1)
        ? (message ?? '').split('\n').slice(0, 3).join('\n')
        : message ?? 'You have a new message';

      // Duplicate prevention: content-based key (same user + same short content)
      const contentKey = `${finalTitle}-${displayMessage.substring(0, 30)}`;

      if (messageCount && messageCount > 1) {
        // Batched notification - allow (we update existing notifications)
        console.log('🔔 [NOTIFICATION] Batched notification - will UPDATE existing notification');
      } else {
        if (this.recentNotifications.has(contentKey)) {
          console.log('🔔 [NOTIFICATION] Exact duplicate prevented:', contentKey);
          return 'Duplicate notification prevented';
        }
        // Track for small window
        this.recentNotifications.add(contentKey);
        setTimeout(() => this.recentNotifications.delete(contentKey), 3000);
      }

      // Suppress if user actively in chat
      if (this.isChatActive) {
        console.log('🔔 [NOTIFICATION] Notification suppressed - chat active');
        return 'Notification suppressed - chat active';
      }

      const perm = await this.checkNotificationPermission();
      console.log('🔔 Notification permission status:', perm);

      if (!perm) {
        console.warn('🔔 [NOTIFICATION] Permission not granted - requesting');
        const permissionGranted = await this.requestNotificationPermission();
        if (!permissionGranted) {
          console.warn('🔔 [NOTIFICATION] Permission still not granted');
          return 'Notification permission not granted';
        }
      }

      // Compute stable notification id from buddyId or buddyName
      const idSource = buddyId ?? finalTitle ?? 'whispr';
      const getNotificationId = (t: string) => {
        let h = 0;
        for (let i = 0; i < t.length; i++) {
          h = ((h << 5) - h) + t.charCodeAt(i);
          h = h & h;
        }
        return Math.abs(h) || 1;
      };
      const notificationId = getNotificationId(idSource);

      // Build display title (include message count)
      const displayTitle = messageCount && messageCount > 1
        ? `${finalTitle} (${messageCount} messages)`
        : finalTitle;

      // Minimal debug log
      console.log('🔔 [NOTIFICATION] ===== showMessageNotification CALLED =====');
      console.log('🔔 [NOTIFICATION] AppState:', currentAppState, 'IsBackground?', currentAppState !== 'active');
      console.log('🔔 [NOTIFICATION] Params:', { displayTitle, displayMessage: displayMessage.substring(0, 100), buddyName, buddyId, messageCount });

      // ✅ CRITICAL FIX: When showing batch notification in background, it should replace FCM notification
      // Both use the same tag (buddyId/buddyName) and same notification ID computation
      // On Android, showing a notification with the same tag should replace the previous one
      // The FCM notification is shown by OS automatically, but our batch notification with same tag/ID should replace it
      if (currentAppState !== 'active') {
        console.log('🔔 [NOTIFICATION] App in background - showing batch notification:', { 
          notificationId, 
          tag: buddyId ?? buddyName,
          note: 'Should replace FCM notification if same tag/ID'
        });
      }

      // Fire the local notification
      try {
        PushNotification.localNotification({
          id: notificationId,
          channelId: 'whispr-messages',
          title: displayTitle,
          message: displayMessage,
          tag: buddyId ?? buddyName,
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
            buddyName,
            buddyId,
            messageCount: messageCount ?? 1,
            isBatched: Boolean(messageCount && messageCount > 1),
          },
          ...(Platform.OS === 'android' && {
            visibility: 'public',
            autoCancel: true,
            color: '#007AFF',
          }),
        });

        console.log('🔔 [NOTIFICATION] ✅ PushNotification.localNotification call completed!');
        console.log('🔔 [NOTIFICATION] Notification sent successfully!', { notificationId, tag: buddyId ?? buddyName });
        return 'Message notification sent successfully';
      } catch (notificationError) {
        console.error('🔔 [NOTIFICATION] ❌ Error in PushNotification.localNotification:', notificationError);
        throw notificationError;
      }
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
      // Check if app-level notifications are enabled
      const appNotificationsEnabled = await this.isAppNotificationEnabled();
      if (!appNotificationsEnabled) {
        console.log('🔕 [NOTIFICATION] App-level notifications are disabled - skipping notification');
        return 'App-level notifications disabled';
      }

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
      // Check if app-level notifications are enabled
      const appNotificationsEnabled = await this.isAppNotificationEnabled();
      if (!appNotificationsEnabled) {
        console.log('🔕 [NOTIFICATION] App-level notifications are disabled - skipping test notification');
        return 'App-level notifications disabled';
      }

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
      const statusMessage = token 
        ? 'Notifications are enabled. You will receive push notifications from Whispr.' 
        : 'Notifications may not be fully enabled. Please check your device settings to allow Whispr to send you notifications.';
      Alert.alert(
        'Allow Whispr to Send you Notifications?',
        statusMessage,
        [
          { text: 'OK', style: 'default' },
          ...(token ? [] : [{ 
            text: 'Open Settings', 
            onPress: () => {
              // On Android, this will open app settings where user can enable notifications
              if (Platform.OS === 'android') {
                Linking.openSettings();
              }
            }
          }])
        ]
      );
      return 'Test notification sent successfully';
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Test Notification Error', `Failed to send test notification: ${error}`);
      throw error;
    }
  }
}

export const notificationService = new NotificationServiceClass();

// Export static methods for app-level notification control
export const setAppNotificationEnabled = NotificationServiceClass.setAppNotificationEnabled;
export const getAppNotificationEnabled = NotificationServiceClass.getAppNotificationEnabled;