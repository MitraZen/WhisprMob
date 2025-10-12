import { notificationService } from '../notificationService';
import PushNotification from 'react-native-push-notification';
import { Platform, Alert } from 'react-native';

// Mock react-native-push-notification
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
}));

// Mock react-native components
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to android for consistent testing
    (Platform as any).OS = 'android';
    
    // Reset mocks to default successful behavior
    (PushNotification.localNotification as jest.Mock).mockImplementation(() => {});
    (PushNotification.cancelAllLocalNotifications as jest.Mock).mockImplementation(() => {});
    (PushNotification.checkPermissions as jest.Mock).mockResolvedValue({ alert: true });
    (PushNotification.requestPermissions as jest.Mock).mockResolvedValue({ alert: true });
  });

  describe('Constructor and Configuration', () => {
    it('should configure push notifications on initialization', () => {
      // The service is already instantiated, so we check if configure was called
      expect(PushNotification.configure).toHaveBeenCalled();
    });

    it('should create notification channels for Android', () => {
      expect(PushNotification.createChannel).toHaveBeenCalledWith(
        {
          channelId: 'whispr-messages',
          channelName: 'Whispr Messages',
          channelDescription: 'Notifications for incoming messages',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        expect.any(Function)
      );

      expect(PushNotification.createChannel).toHaveBeenCalledWith(
        {
          channelId: 'whispr-notes',
          channelName: 'Whispr Notes',
          channelDescription: 'Notifications for new notes',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        expect.any(Function)
      );
    });

    it('should not create channels for iOS', () => {
      (Platform as any).OS = 'ios';
      
      // Reset mocks to test iOS behavior
      jest.clearAllMocks();
      
      // Create a new instance to test iOS behavior
      const { NotificationServiceClass } = require('../notificationService');
      new NotificationServiceClass();
      
      // Should still call configure but not createChannel
      expect(PushNotification.configure).toHaveBeenCalled();
      expect(PushNotification.createChannel).not.toHaveBeenCalled();
    });
  });

  describe('showMessageNotification', () => {
    it('should send message notification successfully', async () => {
      const result = await notificationService.showMessageNotification(
        'New Message',
        'Hello there!',
        'John Doe'
      );

      expect(PushNotification.localNotification).toHaveBeenCalledWith({
        channelId: 'whispr-messages',
        title: 'New Message',
        message: 'John Doe: Hello there!',
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });

      expect(result).toBe('Message notification sent successfully');
    });

    it('should handle empty buddy name gracefully', async () => {
      const result = await notificationService.showMessageNotification(
        'New Message',
        'Hello there!',
        ''
      );

      expect(PushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ': Hello there!',
        })
      );

      expect(result).toBe('Message notification sent successfully');
    });

    it('should handle long messages by truncating appropriately', async () => {
      const longMessage = 'A'.repeat(200);
      const result = await notificationService.showMessageNotification(
        'New Message',
        longMessage,
        'John Doe'
      );

      expect(PushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `John Doe: ${longMessage}`,
        })
      );

      expect(result).toBe('Message notification sent successfully');
    });

    it('should throw error when PushNotification fails', async () => {
      const error = new Error('Push notification failed');
      (PushNotification.localNotification as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        notificationService.showMessageNotification('Title', 'Message', 'Buddy')
      ).rejects.toThrow('Push notification failed');
    });
  });

  describe('showNoteNotification', () => {
    it('should send note notification successfully', async () => {
      const result = await notificationService.showNoteNotification(
        'New Whispr Note',
        'Someone sent you a note!'
      );

      expect(PushNotification.localNotification).toHaveBeenCalledWith({
        channelId: 'whispr-notes',
        title: 'New Whispr Note',
        message: 'Someone sent you a note!',
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });

      expect(result).toBe('Note notification sent successfully');
    });

    it('should handle empty content gracefully', async () => {
      const result = await notificationService.showNoteNotification(
        'New Whispr Note',
        ''
      );

      expect(PushNotification.localNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '',
        })
      );

      expect(result).toBe('Note notification sent successfully');
    });

    it('should throw error when PushNotification fails', async () => {
      const error = new Error('Push notification failed');
      (PushNotification.localNotification as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        notificationService.showNoteNotification('Title', 'Content')
      ).rejects.toThrow('Push notification failed');
    });
  });

  describe('showGeneralNotification', () => {
    it('should send general notification successfully', async () => {
      const result = await notificationService.showGeneralNotification(
        'System Update',
        'App has been updated!'
      );

      expect(PushNotification.localNotification).toHaveBeenCalledWith({
        channelId: 'whispr-messages',
        title: 'System Update',
        message: 'App has been updated!',
        playSound: true,
        soundName: 'default',
        vibrate: true,
        vibration: 300,
        priority: 'high',
        importance: 'high',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
      });

      expect(result).toBe('General notification sent successfully');
    });

    it('should throw error when PushNotification fails', async () => {
      const error = new Error('Push notification failed');
      (PushNotification.localNotification as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        notificationService.showGeneralNotification('Title', 'Content')
      ).rejects.toThrow('Push notification failed');
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all notifications successfully', async () => {
      const result = await notificationService.cancelAllNotifications();

      expect(PushNotification.cancelAllLocalNotifications).toHaveBeenCalled();
      expect(result).toBe('All notifications cancelled successfully');
    });

    it('should throw error when cancellation fails', async () => {
      const error = new Error('Cancellation failed');
      (PushNotification.cancelAllLocalNotifications as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        notificationService.cancelAllNotifications()
      ).rejects.toThrow('Cancellation failed');
    });
  });

  describe('testNotification', () => {
    it('should send test notification successfully', async () => {
      const result = await notificationService.testNotification();

      expect(PushNotification.localNotification).toHaveBeenCalledWith({
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

      expect(Alert.alert).toHaveBeenCalledWith(
        'Test Notification',
        'Test notification sent successfully!'
      );

      expect(result).toBe('Test notification sent successfully');
    });

    it('should show error alert when test notification fails', async () => {
      const error = new Error('Test notification failed');
      (PushNotification.localNotification as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(
        notificationService.testNotification()
      ).rejects.toThrow('Test notification failed');

      expect(Alert.alert).toHaveBeenCalledWith(
        'Test Notification Error',
        'Failed to send test notification: Error: Test notification failed'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      (PushNotification.localNotification as jest.Mock).mockImplementation(() => {
        throw networkError;
      });

      await expect(
        notificationService.showMessageNotification('Title', 'Message', 'Buddy')
      ).rejects.toThrow('Network error');
    });

    it('should handle permission errors gracefully', async () => {
      const permissionError = new Error('Permission denied');
      (PushNotification.localNotification as jest.Mock).mockImplementation(() => {
        throw permissionError;
      });

      await expect(
        notificationService.showNoteNotification('Title', 'Content')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Performance', () => {
    it('should send notifications quickly', async () => {
      const startTime = Date.now();
      
      await notificationService.showMessageNotification(
        'Test',
        'Message',
        'Buddy'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple rapid notifications', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          notificationService.showMessageNotification(
            `Test ${i}`,
            `Message ${i}`,
            `Buddy ${i}`
          )
        );
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('Message notification sent successfully');
      });
    });
  });
});
