import { Platform, Alert, DeviceEventEmitter } from 'react-native';
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '@/config/supabase';

export interface NotificationService {
  showMessageNotification: (title: string, message: string, buddyName: string, messageCount?: number) => Promise<string>;
  showNoteNotification: (title: string, content: string) => Promise<string>;
  showGeneralNotification: (title: string, content: string) => Promise<string>;
  cancelAllNotifications: () => Promise<string>;
  testNotification: () => Promise<string>;
  setChatActive: (isActive: boolean) => void;
  getFCMToken: () => Promise<string | null>;
  requestNotificationPermission: () => Promise<boolean>;
  initializeFCMAfterLogin: () => Promise<void>;
  saveFCMTokenWhenAuthenticated: (userId?: string) => Promise<void>;
}

class NotificationServiceClass implements NotificationService {
  private recentNotifications = new Set<string>();
  private isChatActive = false;
  private fcmToken: string | null = null;
  
  constructor() {
    this.configurePushNotifications();
    // Don't initialize FCM here - wait for user authentication
    // FCM will be initialized via initializeFCMAfterLogin() after user logs in
    this.initializePermissions();
  }
  
  // Method to set chat active state
  setChatActive(isActive: boolean) {
    this.isChatActive = isActive;
    console.log('🔔 Chat active state set to:', isActive);
  }

  private async saveFCMTokenToDatabase(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ No user found — cannot save FCM token');
        return;
      }

      const platform = Platform.OS;
      console.log(`💾 Saving FCM token for user ${user.id} (${platform})`);

      // Use UPSERT by fcm_token, not user_id
      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          platform,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'fcm_token' });

      if (error) throw error;
      console.log('✅ FCM token saved successfully');
    } catch (error) {
      console.error('🔥 Error saving FCM token:', error);
    }
  }

  private async saveFCMTokenToDatabaseWithUserId(token: string, userId: string) {
    try {
      const platform = Platform.OS;
      console.log(`💾 Saving FCM token for user ${userId} (${platform})`);

      const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert({
          user_id: userId,
          fcm_token: token,
          platform,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'fcm_token' });

      if (error) throw error;
      console.log('✅ FCM token saved successfully');
    } catch (error) {
      console.error('🔥 Error saving FCM token with user ID:', error);
    }
  }

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
      
      if (enabled && !this.fcmToken) {
        const token = await messaging().getToken();
        this.fcmToken = token;
        await this.saveFCMTokenToDatabase(token);
      }
      
      return enabled;
    } catch (error) {
      console.error('🔥 Error requesting notification permission:', error);
      console.log('🔥 FCM not available - using local notifications only');
      // Fallback to local notification permission
      try {
        await PushNotification.requestPermissions();
        return true; // Assume local permissions work
      } catch (localError) {
        console.error('Local notification permission also failed:', localError);
        return false;
      }
    }
  }

  // Method to initialize FCM after user login
  async initializeFCMAfterLogin(userId?: string): Promise<void> {
    try {
      console.log('🔥 Initializing FCM after login...');
      
      // Defensive guard: Verify user session exists
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.warn('🚫 Skipping FCM init — no active user session');
        return;
      }
      
      const authenticatedUserId = userId || session.user.id;
      console.log('✅ Starting FCM setup for authenticated user:', authenticatedUserId);
      
      // Request permission for FCM
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                     authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('🔥 FCM Authorization status:', authStatus);
        
        // Get FCM token
        const token = await messaging().getToken();
        this.fcmToken = token;
        console.log('🔥 FCM Token:', token);
        
        // Save token to database for server-side notifications
        console.log('🔥 Saving FCM token for user:', authenticatedUserId);
        await this.saveFCMTokenToDatabaseWithUserId(token, authenticatedUserId);
        
        // Listen for token refresh
        messaging().onTokenRefresh(async (newToken) => {
          console.log('🔁 FCM Token refreshed at:', new Date().toISOString());
          console.log('🔥 FCM New token:', newToken.substring(0, 20) + '...');
          this.fcmToken = newToken;
          await this.saveFCMTokenToDatabaseWithUserId(newToken, authenticatedUserId);
        });
        
        // Handle background messages
        messaging().setBackgroundMessageHandler(async (remoteMessage) => {
          console.log('🔥 Background message received:', remoteMessage);
          
          // Skip processing - hybrid system handles notifications
          // This prevents duplicate notifications
          console.log('🔥 Skipping background notification processing - hybrid system handles it');
        });
        
            // Handle foreground messages
            messaging().onMessage(async (remoteMessage) => {
              console.log('🔥 Foreground FCM message received:', remoteMessage);
              console.log('🔕 Skipping foreground notification - hybrid system handles it via realtime');
              // Don't show notification here - realtimeService.ts already handles it
              // This prevents duplicate notifications
            });
        
        console.log('🔥 FCM initialized successfully after login');
      } else {
        console.warn('🔥 FCM permission not granted');
      }
    } catch (error) {
      console.error('🔥 Error initializing FCM after login:', error);
      console.log('🔥 FCM disabled - using local notifications only');
    }
  }

  // Method to clean up FCM token when user logs out
  async clearFCMTokenOnLogout(userId?: string): Promise<void> {
    try {
      console.log('🔥 Clearing FCM token on logout for user:', userId);
      
      if (userId) {
        // Remove FCM token from database
        const { error } = await supabase
          .from('user_fcm_tokens')
          .delete()
          .eq('user_id', userId);
        
        if (error) {
          console.error('🔥 Error clearing FCM token from database:', error);
        } else {
          console.log('✅ FCM token cleared from database');
        }
      }
      
      // Clear local FCM token
      this.fcmToken = null;
      console.log('✅ Local FCM token cleared');
    } catch (error) {
      console.error('🔥 Error clearing FCM token on logout:', error);
    }
  }

  // Method to explicitly save FCM token when user is authenticated
  async saveFCMTokenWhenAuthenticated(userId?: string): Promise<void> {
    try {
      // Double-check that user is actually authenticated in Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        // This is expected during app startup before login - don't log as error
        if (authError.message?.includes('Auth session missing')) {
          console.log('🔐 No auth session yet - FCM token will be saved after login');
        } else {
          console.warn('⚠️ Auth error when saving FCM token:', authError);
        }
        return;
      }
      
      if (!user) {
        console.log('🔐 No authenticated user found - FCM token will be saved after login');
        return;
      }
      
      // Verify the userId matches the authenticated user (if provided)
      if (userId && user.id !== userId) {
        console.warn('⚠️ UserId mismatch when saving FCM token:', { provided: userId, authenticated: user.id });
        return;
      }
      
      if (this.fcmToken) {
        console.log('🔥 Saving FCM token now that user is authenticated...');
        if (userId) {
          await this.saveFCMTokenToDatabaseWithUserId(this.fcmToken, userId);
        } else {
          await this.saveFCMTokenToDatabase(this.fcmToken);
        }
      } else {
        console.log('🔥 No FCM token available to save');
      }
    } catch (error) {
      console.error('🔥 Error in saveFCMTokenWhenAuthenticated:', error);
    }
  }
  
  private async initializePermissions() {
    try {
      console.log('Initializing notification permissions...');
      
      // Request FCM permission first
      const fcmPermission = await this.requestNotificationPermission();
      console.log('FCM permission granted:', fcmPermission);
      
      // Also request local notification permissions as fallback
      if (Platform.OS === 'android') {
        try {
          await PushNotification.requestPermissions();
          console.log('Local notification permissions requested');
        } catch (error) {
          console.warn('Local permission request failed:', error);
        }
      }
      
      // Check current permission status
      const hasPermission = await this.checkNotificationPermission();
      console.log('Current notification permission status:', hasPermission);
      
    } catch (error) {
      console.error('Error initializing notification permissions:', error);
    }
  }
  
  private configurePushNotifications() {
    PushNotification.configure({
      // Called when token is generated
      onRegister: function (token: any) {
        console.log('LOCAL TOKEN:', token);
      },
      
      // Called when a remote or local notification is opened or received
      onNotification: (notification: any) => {
        console.log('🔔 [EVENT] onNotification callback triggered:', notification);
        console.log('🔔 [EVENT] Notification userInteraction:', notification.userInteraction);
        console.log('🔔 [EVENT] Notification will be displayed:', !(notification.finish === 1));
        
        // Check if notification was tapped/clicked by user
        // Use setTimeout to ensure this doesn't block the notification callback
        if (notification.userInteraction || notification.userInteraction === true) {
          console.log('🔔 [EVENT] Notification was tapped by user');
          // Delay to prevent blocking the callback
          setTimeout(() => {
            this.handleNotificationTap(notification);
          }, 100);
        }
        
        // If finish is not 1, the notification will be presented to the user
        if (notification.finish !== 1) {
          console.log('🔔 [EVENT] Notification will be displayed to user');
        }
      },
      
      // Should the initial notification be popped automatically
      popInitialNotification: true,
      
      // Request permissions on init for both platforms
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

  private async checkNotificationPermission(): Promise<boolean> {
    try {
      // Check FCM permission first
      const authStatus = await messaging().hasPermission();
      const fcmEnabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (fcmEnabled) {
        console.log('FCM permission granted');
        return true;
      }
      
      // Fallback to local notification permission check
      // Note: react-native-push-notification doesn't have checkPermissions method
      // We'll assume local notifications work if FCM is not available
      const permissions = true; // Assume permissions are granted
      console.log('Local notification permissions check result:', permissions);
      
      // Since we're assuming permissions are granted, return true
      return permissions;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      // On error, assume not granted to be safe
      return false;
    }
  }
  
  /**
   * Handle FCM ping notification (Phase 1: Proposed Design)
   * When app receives a ping, fetch new messages and reconnect to realtime
   */
  async handleFCMPing(): Promise<void> {
    try {
      console.log('🔥 Handling FCM ping - fetching new messages and reconnecting...');
      
      // Import services dynamically to avoid circular dependencies
      const { realtimeService } = await import('@/services/realtimeService');
      
      // Reconnect to Supabase Realtime (this will also fetch new messages)
      await realtimeService.forceReconnection();
      
      console.log('✅ FCM ping handled successfully');
    } catch (error) {
      console.error('❌ Error handling FCM ping:', error);
    }
  }

  /**
   * Handle notification tap - navigate to chat and clear batch
   * Made non-blocking to prevent app freeze
   */
  private handleNotificationTap(notification: any): void {
    // Run asynchronously without blocking
    (async () => {
      try {
        console.log('🔔 [TAP] Handling notification tap:', notification);
        
        const userInfo = notification.userInfo || notification.data;
        const buddyName = userInfo?.buddyName;
        
        if (!buddyName) {
          console.warn('🔔 [TAP] No buddyName in notification, cannot navigate');
          return;
        }

        console.log('🔔 [TAP] Navigating to chat for:', buddyName);

        // Clear notification batch for this user (non-blocking)
        (async () => {
          try {
            const { Phase3NotificationLogicService } = await import('@/services/phase3NotificationLogicService');
            const phase3Service = Phase3NotificationLogicService.getInstance();
            phase3Service.clearUserBatch(buddyName);
            console.log('🧠 [TAP] Cleared notification batch for:', buddyName);
          } catch (batchError) {
            console.warn('⚠️ [TAP] Could not clear notification batch:', batchError);
          }
        })();

        // Find the buddy by name to get their ID (with timeout protection)
        try {
          const findBuddyPromise = (async () => {
            const { CachedBuddiesService } = await import('@/services/cachedBuddiesService');
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              console.warn('🔔 [TAP] No authenticated user, emitting with buddyName only');
              DeviceEventEmitter.emit('navigateToChat', { buddyName });
              return;
            }

            // Get all buddies and find the one matching the name
            const buddies = await CachedBuddiesService.getBuddies(user.id);
            const buddy = buddies.find(b => b.name === buddyName || b.username === buddyName);

            if (buddy) {
              console.log('🔔 [TAP] Found buddy, emitting navigation event:', buddy);
              DeviceEventEmitter.emit('navigateToChat', { buddy });
            } else {
              console.warn('🔔 [TAP] Buddy not found for name:', buddyName);
              DeviceEventEmitter.emit('navigateToChat', { buddyName });
            }
          })();

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
              console.warn('🔔 [TAP] Timeout finding buddy, emitting with name only');
              DeviceEventEmitter.emit('navigateToChat', { buddyName });
              resolve();
            }, 5000);
          });

          await Promise.race([findBuddyPromise, timeoutPromise]);
        } catch (error) {
          console.error('❌ [TAP] Error finding buddy:', error);
          // Emit event with just the name as fallback
          DeviceEventEmitter.emit('navigateToChat', { buddyName });
        }
      } catch (error) {
        console.error('❌ [TAP] Error handling notification tap:', error);
      }
    })();
  }
  
  async showMessageNotification(title: string, message: string, buddyName: string, messageCount?: number): Promise<string> {
    try {
      console.log('🔔 [NOTIFICATION] showMessageNotification called:', { title, message, buddyName, messageCount });
      
      // For multiple messages, create a notification key based on user only (to allow updates)
      const notificationKey = messageCount && messageCount > 1 
        ? `batch-${buddyName}`
        : `${title}-${buddyName}-${message.substring(0, 50)}`;
      
      // Check if we've already shown this notification recently (within last 5 seconds)
      // But allow updates for batched notifications
      if (messageCount && messageCount > 1) {
        // For batched notifications, we want to update them, not skip
        console.log('🔔 [NOTIFICATION] Batched notification - will update existing notification');
      } else if (this.recentNotifications.has(notificationKey)) {
        console.log('🔔 [NOTIFICATION] Duplicate notification prevented:', notificationKey);
        return 'Duplicate notification prevented';
      }
      
      // Add to recent notifications (for single messages only)
      if (!messageCount || messageCount === 1) {
        this.recentNotifications.add(notificationKey);
        setTimeout(() => {
          this.recentNotifications.delete(notificationKey);
        }, 5000);
      }
      
      // Check if chat is currently active - suppress notifications if user is actively chatting
      console.log('🔔 [NOTIFICATION] Chat active state:', this.isChatActive);
      if (this.isChatActive) {
        console.log('🔔 [NOTIFICATION] Notification suppressed - chat is currently active');
        return 'Notification suppressed - chat active';
      }
      
      // Check if notifications are enabled
      const hasPermission = await this.checkNotificationPermission();
      console.log('🔔 Notification permission status:', hasPermission);
      
      if (!hasPermission) {
        console.warn('🔔 [NOTIFICATION] Permission not granted - attempting to request');
        
        // Try to request permissions
        const permissionGranted = await this.requestNotificationPermission();
        if (!permissionGranted) {
          console.warn('🔔 [NOTIFICATION] Permission still not granted - skipping');
          return 'Notification permission not granted';
        }
      }

      console.log('🔔 [NOTIFICATION] Showing local notification now...');
      
      // Format message: if multiple messages, they're already separated by \n
      // Title is the buddy name, message contains all messages
      const displayTitle = messageCount && messageCount > 1 
        ? `${buddyName} (${messageCount} messages)`
        : buddyName;
      
      const displayMessage = messageCount && messageCount > 1
        ? message // Already formatted with line breaks
        : message; // Single message, use as is
      
      // Generate consistent numeric ID from buddy name for batched notifications
      // This ensures same user's notifications replace each other
      const getNotificationId = (name: string): number => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          const char = name.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) || 1; // Ensure positive number, minimum 1
      };
      
      const notificationId = messageCount && messageCount > 1 
        ? getNotificationId(buddyName) // Same ID for same user = replaces previous notification
        : Date.now() % 2147483647; // Unique ID for single messages (max 32-bit int)
      
      PushNotification.localNotification({
        id: notificationId, // Numeric ID required by react-native-push-notification
        channelId: 'whispr-messages',
        title: displayTitle,
        message: displayMessage,
        tag: buddyName, // Use buddyName as tag so notifications from same user replace each other
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
      // Check if notifications are enabled
      const hasPermission = await this.checkNotificationPermission();
      if (!hasPermission) {
        console.warn('Notification permission not granted - attempting to request permissions');
        
        // Try to request permissions
        const permissionGranted = await this.requestNotificationPermission();
        if (!permissionGranted) {
          console.warn('Notification permission still not granted - skipping note notification');
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
      // Test FCM token
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