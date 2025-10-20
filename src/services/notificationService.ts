import { Platform, Alert } from 'react-native';
import PushNotification from 'react-native-push-notification';

export interface NotificationService {
  showMessageNotification: (title: string, message: string, buddyName: string) => Promise<string>;
  showNoteNotification: (title: string, content: string) => Promise<string>;
  showGeneralNotification: (title: string, content: string) => Promise<string>;
  cancelAllNotifications: () => Promise<string>;
  testNotification: () => Promise<string>;
  setChatActive: (isActive: boolean) => void;
}

class NotificationServiceClass implements NotificationService {
  private recentNotifications = new Set<string>();
  private isChatActive = false;
  
  constructor() {
    this.configurePushNotifications();
    this.initializePermissions();
  }
  
  // Method to set chat active state
  setChatActive(isActive: boolean) {
    this.isChatActive = isActive;
    console.log('🔔 Chat active state set to:', isActive);
  }

  private async initializePermissions() {
    try {
      console.log('Initializing notification permissions...');
      
      // For Android, try multiple permission request approaches
      if (Platform.OS === 'android') {
        // First, try the standard request
        try {
          await PushNotification.requestPermissions();
          console.log('Standard notification permissions requested');
        } catch (error) {
          console.warn('Standard permission request failed:', error);
        }
        
        // Try alternative Android permission approach
        try {
          // Some Android versions need this approach
          const { PermissionsAndroid } = require('react-native');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Whispr Notifications',
              message: 'Whispr needs notification permission to alert you about new messages and notes.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log('Android notification permission result:', granted);
        } catch (androidError) {
          console.warn('Android permission request failed:', androidError);
        }
      } else {
        // iOS approach
        await PushNotification.requestPermissions();
        console.log('iOS notification permissions requested');
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
        console.log('TOKEN:', token);
      },
      
      // Called when a remote or local notification is opened or received
      onNotification: function (notification: any) {
        console.log('NOTIFICATION:', notification);
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
      const permissions = await PushNotification.checkPermissions();
      console.log('Notification permissions check result:', permissions);
      
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
        try {
          await PushNotification.requestPermissions();
          console.log('Notification permissions requested');
        } catch (requestError) {
          console.warn('Failed to request notification permissions:', requestError);
        }
        
        // Check again after requesting
        const newPermission = await this.checkNotificationPermission();
        if (!newPermission) {
          console.warn('Notification permission still not granted - attempting direct send for Android');
          
          // For Android, try sending notification directly (some versions work without explicit permission check)
          if (Platform.OS === 'android') {
            try {
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
              console.log('Android direct notification sent successfully');
              return 'Message notification sent successfully (Android direct)';
            } catch (directError) {
              console.warn('Android direct notification failed:', directError);
            }
          }
          
          console.warn('Notification permission still not granted - skipping message notification');
          return 'Notification permission not granted';
        }
      }

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
        try {
          await PushNotification.requestPermissions();
          console.log('Notification permissions requested');
        } catch (requestError) {
          console.warn('Failed to request notification permissions:', requestError);
        }
        
        // Check again after requesting
        const newPermission = await this.checkNotificationPermission();
        if (!newPermission) {
          console.warn('Notification permission still not granted - attempting direct send for Android');
          
          // For Android, try sending notification directly (some versions work without explicit permission check)
          if (Platform.OS === 'android') {
            try {
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
              console.log('Android direct note notification sent successfully');
              return 'Note notification sent successfully (Android direct)';
            } catch (directError) {
              console.warn('Android direct note notification failed:', directError);
            }
          }
          
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
      PushNotification.localNotification({
        channelId: 'whispr-messages',
        title: 'Whispr Test',
        message: 'This is a test notification from Whispr!',
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
      Alert.alert('Test Notification', 'Test notification sent successfully!');
      return 'Test notification sent successfully';
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Test Notification Error', `Failed to send test notification: ${error}`);
      throw error;
    }
  }
}

export const notificationService = new NotificationServiceClass();
