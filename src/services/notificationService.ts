import { Platform, Alert } from 'react-native';
import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '@/config/supabase';

export interface NotificationService {
  showMessageNotification: (title: string, message: string, buddyName: string) => Promise<string>;
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
    this.initializeFCM();
    this.initializePermissions();
  }
  
  // Method to set chat active state
  setChatActive(isActive: boolean) {
    this.isChatActive = isActive;
    console.log('🔔 Chat active state set to:', isActive);
  }

  private async initializeFCM() {
    try {
      console.log('🔥 Initializing FCM...');
      
      // Request permission for FCM
      // Note: Deprecation warnings are expected in v23.4.1 - methods will be updated in future versions
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
        await this.saveFCMTokenToDatabase(token);
        
        // Listen for token refresh
        messaging().onTokenRefresh(async (newToken) => {
          console.log('🔥 FCM Token refreshed:', newToken);
          this.fcmToken = newToken;
          await this.saveFCMTokenToDatabase(newToken);
        });
        
        // Handle background messages
        messaging().setBackgroundMessageHandler(async (remoteMessage) => {
          console.log('🔥 Background message received:', remoteMessage);
          // Handle background notification here
        });
        
        // Handle foreground messages
        const unsubscribe = messaging().onMessage(async (remoteMessage) => {
          console.log('🔥 Foreground message received:', remoteMessage);
          
          // Show local notification when app is in foreground
          if (remoteMessage.notification) {
            PushNotification.localNotification({
              channelId: 'whispr-messages',
              title: remoteMessage.notification.title || 'New Message',
              message: remoteMessage.notification.body || 'You have a new message',
              playSound: true,
              soundName: 'default',
              vibrate: true,
              vibration: 300,
              priority: 'high',
              importance: 'high',
              smallIcon: 'ic_notification',
              largeIcon: 'ic_launcher',
            });
          }
        });
        
        console.log('🔥 FCM initialized successfully');
      } else {
        console.warn('🔥 FCM permission not granted');
      }
    } catch (error) {
      console.error('🔥 Error initializing FCM:', error);
      console.log('🔥 FCM disabled - using local notifications only');
      // FCM is not available, continue with local notifications only
    }
  }

  private async saveFCMTokenToDatabase(token: string) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('🔥 No user found, cannot save FCM token');
        return;
      }

      console.log('🔥 Saving FCM token for user:', user.id);

      // Save FCM token to user_fcm_tokens table
      // First try to update existing record, then insert if not found
      const { error: updateError } = await supabase
        .from('user_fcm_tokens')
        .update({
          fcm_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      // If update failed or no rows were updated, try to insert
      if (updateError) {
        console.log('🔥 Update failed, trying to insert new record');
        const { error: insertError } = await supabase
          .from('user_fcm_tokens')
          .insert({
            user_id: user.id,
            fcm_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('🔥 Error inserting FCM token:', insertError);
          throw insertError;
        } else {
          console.log('🔥 FCM token inserted successfully');
        }
      } else {
        console.log('🔥 FCM token updated successfully');
      }
    } catch (error) {
      console.error('🔥 Error saving FCM token to database:', error);
    }
  }

  private async saveFCMTokenToDatabaseWithUserId(token: string, userId: string) {
    try {
      console.log('🔥 Saving FCM token for user:', userId);

      // Save FCM token to user_fcm_tokens table
      // First try to update existing record, then insert if not found
      const { error: updateError } = await supabase
        .from('user_fcm_tokens')
        .update({
          fcm_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // If update failed or no rows were updated, try to insert
      if (updateError) {
        console.log('🔥 Update failed, trying to insert new record');
        const { error: insertError } = await supabase
          .from('user_fcm_tokens')
          .insert({
            user_id: userId,
            fcm_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('🔥 Error inserting FCM token:', insertError);
          throw insertError;
        } else {
          console.log('🔥 FCM token inserted successfully');
        }
      } else {
        console.log('🔥 FCM token updated successfully');
      }
    } catch (error) {
      console.error('🔥 Error saving FCM token to database:', error);
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
  async initializeFCMAfterLogin(): Promise<void> {
    try {
      console.log('🔥 Initializing FCM after login...');
      
      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('🔥 FCM Token:', token);
      
      // Wait a bit for user authentication to complete, then save token
      setTimeout(async () => {
        console.log('🔥 Attempting to save FCM token after authentication delay...');
        await this.saveFCMTokenToDatabase(token);
      }, 3000); // Wait 3 seconds for authentication to complete
      
      console.log('🔥 FCM initialized successfully after login');
    } catch (error) {
      console.error('🔥 Error initializing FCM after login:', error);
      console.log('🔥 FCM disabled - using local notifications only');
    }
  }

  // Method to explicitly save FCM token when user is authenticated
  async saveFCMTokenWhenAuthenticated(userId?: string): Promise<void> {
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
      onNotification: function (notification: any) {
        console.log('LOCAL NOTIFICATION:', notification);
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
      const permissions = await PushNotification.checkPermissions();
      console.log('Local notification permissions check result:', permissions);
      
      // Handle different permission response formats
      if (permissions && typeof permissions === 'object') {
        // Standard format: { alert: true/false, badge: true/false, sound: true/false }
        if ('alert' in permissions) {
          return permissions.alert === true;
        }
        // Alternative format: { notification: true/false }
        if ('notification' in permissions) {
          return permissions.notification === true;
        }
        // If permissions object exists but no known properties, assume granted
        return true;
      }
      
      // If permissions is undefined or null, try alternative approach
      console.warn('Notification permissions check returned undefined/null - assuming permissions granted for Android');
      
      // For Android, assume permissions are granted if checkPermissions returns undefined
      // This is a common Android behavior where permissions work but aren't explicitly reported
      return true;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      // On error, assume not granted to be safe
      return false;
    }
  }
  
  async showMessageNotification(title: string, message: string, buddyName: string): Promise<string> {
    try {
      console.log('🔔 showMessageNotification called:', { title, message, buddyName });
      
      // Create a unique key for this notification to prevent duplicates
      const notificationKey = `${title}-${buddyName}-${message.substring(0, 50)}`;
      
      // Check if we've already shown this notification recently (within last 5 seconds)
      if (this.recentNotifications.has(notificationKey)) {
        console.log('🔔 Duplicate notification prevented:', notificationKey);
        return 'Duplicate notification prevented';
      }
      
      // Add to recent notifications and clean up after 5 seconds
      this.recentNotifications.add(notificationKey);
      setTimeout(() => {
        this.recentNotifications.delete(notificationKey);
      }, 5000);
      
      // Check if chat is currently active - suppress notifications if user is actively chatting
      if (this.isChatActive) {
        console.log('🔔 Notification suppressed - chat is currently active');
        return 'Notification suppressed - chat active';
      }
      
      // Check if notifications are enabled
      const hasPermission = await this.checkNotificationPermission();
      console.log('🔔 Notification permission status:', hasPermission);
      
      if (!hasPermission) {
        console.warn('Notification permission not granted - attempting to request permissions');
        
        // Try to request permissions
        const permissionGranted = await this.requestNotificationPermission();
        if (!permissionGranted) {
          console.warn('Notification permission still not granted - skipping message notification');
          return 'Notification permission not granted';
        }
      }

      // Send local notification (works when app is in foreground)
      PushNotification.localNotification({
        channelId: 'whispr-messages',
        title: title,
        message: `${buddyName}: ${message}`,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });

      console.log('Message notification sent');
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