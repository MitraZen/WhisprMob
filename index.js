import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import App from './App';

// Initialize Google Sign-In
try {
  const { initializeGoogleSignIn } = require('@/config/googleSignIn');
  initializeGoogleSignIn();
} catch (error) {
  console.warn('⚠️ Google Sign-In not configured yet. Please follow GOOGLE_SIGNIN_SETUP_GUIDE.md');
}

// ⚠️ TEMPORARY: Suppress modular API deprecation warnings until migration to v22 modular API is complete
// TODO: Migrate to modular API when React Native Firebase v22 stable is released
// See: https://rnfirebase.io/migrating-to-v22
if (typeof globalThis !== 'undefined') {
  globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

// ✅ CRITICAL: Configure PushNotification and create channels BEFORE background handler
// This ensures channels exist when background messages arrive
if (Platform.OS === 'android') {
  // Create notification channels for Android
  PushNotification.createChannel(
    {
      channelId: 'whispr-messages',
      channelName: 'Whispr Messages',
      channelDescription: 'Notifications for incoming messages',
      playSound: true,
      soundName: 'default',
      importance: 4, // IMPORTANCE_HIGH
      vibrate: true,
    },
    (created) => console.log(`🔔 Channel 'whispr-messages' created: ${created}`)
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
    (created) => console.log(`🔔 Channel 'whispr-notes' created: ${created}`)
  );
}

// ✅ Configure PushNotification for background context
// This is minimal configuration - full configuration happens in notificationService
PushNotification.configure({
  // Background notifications don't need onRegister/onNotification callbacks
  // Those are handled by notificationService when app is active
  onRegister: () => {},
  onNotification: () => {},
  popInitialNotification: false, // Don't auto-pop - let the app handle it
  requestPermissions: false, // Don't request here - app handles permissions
});

// ✅ CRITICAL: Set background handler AFTER channel creation
// This must be called before AppRegistry.registerComponent
// Background messages can arrive when app is closed/killed
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 Background FCM message received:', {
    messageId: remoteMessage.messageId,
    type: remoteMessage.data?.type,
    hasNotification: !!remoteMessage.notification,
  });
  
  try {
    // ==== HYBRID APPROACH: Handle wake signals with notification fallback ====
    // With hybrid FCM messages (data + notification):
    // 1. OS auto-displays notification on lock screen (fallback if app doesn't wake)
    // 2. If app wakes: Background handler triggers batch system
    // 3. Batch system displays grouped notification (replaces OS notification)
    
    // ✅ Handle note notifications - fetch notes to update cache
    // ✅ NOTES FIX: Fetch notes in background like messages, but notes don't use batch system
    if (remoteMessage.data?.type === 'note') {
      console.log('📝 FCM Note notification received in background');
      console.log('📱 OS notification already displayed (fallback for lock screen)');
      
      // ✅ CRITICAL FIX: Fetch notes to update cache and ensure app has latest data
      // This ensures notes appear in app when user opens it, even if app was killed
      // Notes don't use batch system, but we still need to fetch them
      setTimeout(() => {
        try {
          // Use require for React Native compatibility in background handlers
          const { notificationManager } = require('@/services/notificationManager');
          console.log('📝 Triggering note fetch from background FCM...');
          // Poll for new notes - this updates cache and ensures app has latest data
          // Note: This is separate from message polling, so it won't affect message flow
          notificationManager.pollForNewMessages().catch((error) => {
            console.error('❌ Error fetching notes from background FCM:', error);
          });
        } catch (error) {
          console.error('❌ Error requiring notificationManager for notes:', error);
        }
      }, 0);
      
      // Return immediately - don't wait for async operations
      // The note fetch will happen in the background
      // OS notification is already displayed (good for lock screen fallback)
      return;
    }
    
    // Handle wake/ping messages - fetch messages and let batch system display notifications
    if (remoteMessage.data?.type === 'ping' || remoteMessage.data?.type === 'wake') {
      console.log('📡 FCM Wake signal received in background - fetching messages and triggering batch system');
      console.log('📱 OS notification already displayed (fallback for lock screen) - batch system will replace it');
      
      // ✅ CRITICAL FIX: Mark that FCM notification was shown for this buddy
      // This prevents the batch system from showing a duplicate notification
      try {
        const { phase3NotificationLogicService } = require('@/services/phase3NotificationLogicService');
        const buddyId = remoteMessage.data?.buddyId || remoteMessage.data?.senderId;
        const buddyName = remoteMessage.data?.buddyName;
        phase3NotificationLogicService.markFcmNotificationShown(buddyId, buddyName);
        console.log('✅ Marked FCM notification shown for buddy:', { buddyId, buddyName });
      } catch (error) {
        console.error('❌ Error marking FCM notification shown:', error);
      }
      
      // ✅ CRITICAL FIX: Actually fetch messages when woken up
      // Use setTimeout to avoid blocking the background handler
      // Note: The OS shows the FCM notification automatically from the notification payload
      // The batch system will check if FCM was shown and skip showing duplicate notification
      setTimeout(() => {
        try {
          // Use require for React Native compatibility in background handlers
          const { notificationManager } = require('@/services/notificationManager');
          console.log('📡 Triggering message fetch from background wake signal...');
          // Poll for new messages - this will trigger the batching system
          // Batch system will check if FCM was shown and skip duplicate notification
          notificationManager.pollForNewMessages().catch((error) => {
            console.error('❌ Error fetching messages from background wake signal:', error);
          });
        } catch (error) {
          console.error('❌ Error requiring notificationManager in background handler:', error);
        }
      }, 0);
      
      // Return immediately - don't wait for async operations
      // The message fetch will happen in the background
      // Note: OS notification is already displayed (good for lock screen fallback)
      // Batch system will check if FCM was shown and skip duplicate notification
      return;
    }
    
    // ✅ Only display notification if it's NOT a wake signal
    // For legacy messages or non-wake types, display notification
    // (This handles edge cases where old FCM messages might still have full data)
    const hasNotificationPayload = !!remoteMessage.notification;
    const notificationTitle = remoteMessage.notification?.title || 
                             remoteMessage.data?.title || 
                             remoteMessage.data?.buddyName || 
                             'New Message';
    const notificationBody = remoteMessage.notification?.body || 
                            remoteMessage.data?.body || 
                            remoteMessage.data?.message || 
                            'You have a new message';
    
    console.log('📱 Displaying background notification (legacy/non-wake):', {
      title: notificationTitle,
      body: notificationBody,
      buddyName: remoteMessage.data?.buddyName,
      hasNotificationPayload,
    });
    
    // ✅ CRITICAL FIX: Mark that FCM notification was shown for this buddy
    // This prevents the batch system from showing a duplicate notification
    try {
      const { phase3NotificationLogicService } = require('@/services/phase3NotificationLogicService');
      const buddyId = remoteMessage.data?.buddyId || remoteMessage.data?.senderId;
      const buddyName = remoteMessage.data?.buddyName;
      phase3NotificationLogicService.markFcmNotificationShown(buddyId, buddyName);
      console.log('✅ Marked FCM notification shown for buddy (legacy):', { buddyId, buddyName });
    } catch (error) {
      console.error('❌ Error marking FCM notification shown (legacy):', error);
    }
    
    // Extract data from FCM message (buddyName, buddyId, etc.)
    const userInfo = {
      ...remoteMessage.data,
      // Preserve buddyId and buddyName for navigation
      buddyId: remoteMessage.data?.buddyId,
      buddyName: remoteMessage.data?.buddyName,
      messageId: remoteMessage.messageId,
      fromBackground: true, // Flag to indicate this came from background
    };
    
    // Generate notification ID based on buddy name for batching
    // Same buddy = same ID = notification gets updated instead of creating new ones
    const buddyName = remoteMessage.data?.buddyName || 'whispr';
    const getNotificationId = (name) => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash) || 1;
    };
    const notificationId = getNotificationId(buddyName);
    
    // Display the notification
    PushNotification.localNotification({
      id: notificationId,
      channelId: 'whispr-messages',
      title: notificationTitle,
      message: notificationBody,
      tag: buddyName, // Android uses this for grouping
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      priority: 'high',
      importance: 'high',
      userInfo: userInfo,
      // Android-specific options
      ...(Platform.OS === 'android' && {
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        color: '#007AFF', // Customize with your brand color
        visibility: 'public', // Show on lock screen
        autoCancel: true, // Auto-dismiss when tapped
      }),
    });
    
    console.log('✅ Background notification displayed successfully:', {
      id: notificationId,
      title: notificationTitle,
      buddyName: buddyName,
    });
  } catch (error) {
    console.error('❌ Error handling background FCM message:', error);
    // Don't throw - we don't want to crash the background handler
    // Try to show a basic notification as fallback
    try {
      PushNotification.localNotification({
        channelId: 'whispr-messages',
        title: 'New Message',
        message: 'You have a new message in Whispr',
        priority: 'high',
        importance: 'high',
      });
      console.log('✅ Fallback notification displayed');
    } catch (fallbackError) {
      console.error('❌ Even fallback notification failed:', fallbackError);
    }
  }
  
  // Return void (background handler requirement)
  return Promise.resolve();
});

/**
 * ✅ FCM NOTIFICATION NAVIGATION HANDLER
 * ⚠️ IMPORTANT: This ONLY handles FCM push notifications (from Firebase)
 * Local notifications (PushNotification.configure) are handled separately in notificationService.ts
 * 
 * Simplified approach: Navigate based on notification type
 * - type: 'note' → Navigate to Notes screen
 * - type: 'ping' | 'wake' | 'message' → Navigate to Buddies screen
 */
const handleFCMNotificationNavigation = (remoteMessage) => {
  try {
    const notificationType = remoteMessage.data?.type;
    console.log('🔔 [FCM] Processing FCM notification navigation:', {
      type: notificationType,
      messageId: remoteMessage.messageId,
    });

    // ⚠️ CRITICAL: Only handle FCM notifications here
    // Local notifications are handled by PushNotification.configure in notificationService.ts
    
    if (!notificationType) {
      console.log('🔔 [FCM] No notification type found, defaulting to notes');
      // Emit navigation event for AppNavigator
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('fcmNotificationNavigation', { screen: 'notes', source: 'fcm' });
      return;
    }

    // Determine target screen based on notification type
    let targetScreen = 'notes'; // Default
    
    if (notificationType === 'note') {
      targetScreen = 'notes';
      console.log('🔔 [FCM] Note notification → Navigating to Notes screen');
    } else if (notificationType === 'ping' || notificationType === 'wake' || notificationType === 'message') {
      targetScreen = 'buddies';
      console.log('🔔 [FCM] Message/Chat notification → Navigating to Buddies screen');
    } else {
      // Unknown type, default to notes
      console.log('🔔 [FCM] Unknown notification type, defaulting to Notes screen');
      targetScreen = 'notes';
    }

    // Emit navigation event for AppNavigator
    // Use separate event name to distinguish from local notifications
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('fcmNotificationNavigation', { 
      screen: targetScreen, 
      source: 'fcm',
      notificationType: notificationType,
      data: remoteMessage.data
    });
    
    console.log('🔔 [FCM] Navigation event emitted:', { screen: targetScreen, type: notificationType });
  } catch (error) {
    console.error('❌ [FCM] Error handling FCM notification navigation:', error);
    // Fallback: emit navigation to notes screen
    try {
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('fcmNotificationNavigation', { screen: 'notes', source: 'fcm' });
    } catch (fallbackError) {
      console.error('❌ [FCM] Fallback navigation also failed:', fallbackError);
    }
  }
};

// ✅ Handle FCM notification opened app (when app is in background/killed state)
// ⚠️ FCM-SPECIFIC: Only handles Firebase Cloud Messaging notifications
messaging().onNotificationOpenedApp(remoteMessage => {
  console.log('🔔 [FCM] FCM notification opened app from background/killed state:', {
    messageId: remoteMessage.messageId,
    type: remoteMessage.data?.type,
    buddyName: remoteMessage.data?.buddyName,
  });
  
  // ⚠️ CRITICAL: This is FCM-specific navigation
  // Local notifications are handled by PushNotification.configure in notificationService.ts
  handleFCMNotificationNavigation(remoteMessage);
});

// ✅ Check if app was opened from FCM notification (killed state)
// ⚠️ FCM-SPECIFIC: Only handles Firebase Cloud Messaging notifications
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('🔔 [FCM] App opened from killed state by FCM notification:', {
        messageId: remoteMessage.messageId,
        type: remoteMessage.data?.type,
        buddyName: remoteMessage.data?.buddyName,
      });
      
      // ⚠️ CRITICAL: This is FCM-specific navigation
      // Local notifications are handled by PushNotification.configure in notificationService.ts
      handleFCMNotificationNavigation(remoteMessage);
    }
  })
  .catch(error => {
    console.error('❌ [FCM] Error getting initial notification:', error);
  });

// Register app
AppRegistry.registerComponent('WhisprMobileTemp', () => App);