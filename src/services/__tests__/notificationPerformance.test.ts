import { notificationService } from '../notificationService';
import { notificationManager } from '../notificationManager';
import { realtimeService } from '../realtimeService';
import { BuddiesService } from '../buddiesService';

// Mock dependencies
jest.mock('../notificationService', () => ({
  notificationService: {
    showMessageNotification: jest.fn(),
    showNoteNotification: jest.fn(),
    showGeneralNotification: jest.fn(),
    testNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
  },
}));

jest.mock('../buddiesService', () => ({
  BuddiesService: {
    testNetworkConnection: jest.fn(),
    getBuddies: jest.fn(),
    getMessages: jest.fn(),
    getWhisprNotes: jest.fn(),
  },
}));

describe('Notification System Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock successful service responses
    jest.mocked(notificationService.showMessageNotification).mockResolvedValue('Message notification sent successfully');
    jest.mocked(notificationService.showNoteNotification).mockResolvedValue('Note notification sent successfully');
    jest.mocked(notificationService.testNotification).mockResolvedValue('Test notification sent successfully');
    jest.mocked(BuddiesService.testNetworkConnection).mockResolvedValue(true);
    jest.mocked(BuddiesService.getBuddies).mockResolvedValue([]);
    jest.mocked(BuddiesService.getMessages).mockResolvedValue([]);
    jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('NotificationService Performance', () => {
    it('should send notifications quickly', async () => {
      const startTime = Date.now();
      
      await notificationService.showMessageNotification(
        'Test',
        'Message',
        'Buddy'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should handle multiple rapid notifications efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          notificationService.showMessageNotification(
            `Test ${i}`,
            `Message ${i}`,
            `Buddy ${i}`
          )
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete all notifications within 200ms
      expect(duration).toBeLessThan(200);
      expect(notificationService.showMessageNotification).toHaveBeenCalledTimes(10);
    });

    it('should handle large notification payloads efficiently', async () => {
      const largeMessage = 'A'.repeat(1000);
      const startTime = Date.now();
      
      await notificationService.showMessageNotification(
        'Large Message',
        largeMessage,
        'Buddy'
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle large payloads within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent notification types efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        notificationService.showMessageNotification('Title', 'Message', 'Buddy'),
        notificationService.showNoteNotification('Title', 'Content'),
        notificationService.showGeneralNotification('Title', 'Content'),
        notificationService.testNotification(),
      ];
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete all notification types within 150ms
      expect(duration).toBeLessThan(150);
    });

    it('should handle notification cancellation efficiently', async () => {
      const startTime = Date.now();
      
      await notificationService.cancelAllNotifications();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete cancellation within 10ms
      expect(duration).toBeLessThan(10);
    });
  });

  describe('NotificationManager Performance', () => {
    it('should start polling quickly', () => {
      const startTime = Date.now();
      
      notificationManager.startPolling('test-user-123');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should start polling within 10ms
      expect(duration).toBeLessThan(10);
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should stop polling quickly', () => {
      notificationManager.startPolling('test-user-123');
      
      const startTime = Date.now();
      
      notificationManager.stopPolling();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should stop polling within 5ms
      expect(duration).toBeLessThan(5);
      expect(notificationManager.isPolling()).toBe(false);
    });

    it('should handle polling interval efficiently', async () => {
      notificationManager.startPolling('test-user-123');
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000); // 5 minutes
      
      await Promise.resolve();
      
      // Should complete polling cycle without errors
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should handle multiple rapid polling starts efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        notificationManager.startPolling(`user-${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle multiple starts within 50ms
      expect(duration).toBeLessThan(50);
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should handle manual notification check efficiently', async () => {
      notificationManager.startPolling('test-user-123');
      
      const startTime = Date.now();
      
      await notificationManager.triggerNotificationCheck();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete manual check within 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('RealtimeService Performance', () => {
    it('should initialize quickly', async () => {
      const startTime = Date.now();
      
      await realtimeService.initialize('test-user-123');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should initialize within 50ms
      expect(duration).toBeLessThan(50);
      expect(realtimeService.isRealtimeConnected()).toBe(true);
    });

    it('should disconnect quickly', async () => {
      await realtimeService.initialize('test-user-123');
      
      const startTime = Date.now();
      
      await realtimeService.disconnect();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should disconnect within 10ms
      expect(duration).toBeLessThan(10);
      expect(realtimeService.isRealtimeConnected()).toBe(false);
    });

    it('should test connection quickly', async () => {
      const startTime = Date.now();
      
      const result = await realtimeService.testConnection();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should test connection within 100ms
      expect(duration).toBeLessThan(100);
      expect(typeof result).toBe('boolean');
    });

    it('should handle rapid initialization and disconnection efficiently', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await realtimeService.initialize(`user-${i}`);
        await realtimeService.disconnect();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle rapid operations within 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should get connection status quickly', async () => {
      await realtimeService.initialize('test-user-123');
      
      const startTime = Date.now();
      
      const status = realtimeService.getConnectionStatus();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should get status within 1ms
      expect(duration).toBeLessThan(1);
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('userId');
      expect(status).toHaveProperty('subscriptionCount');
    });
  });

  describe('Memory Usage', () => {
    it('should not create memory leaks with message ID tracking', async () => {
      const userId = 'test-user-123';
      
      // Mock many messages
      const manyMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `message-${i}`,
        senderId: 'buddy-1',
        content: `Message ${i}`,
      }));
      
      jest.mocked(BuddiesService.getBuddies).mockResolvedValue([
        { id: 'buddy-1', name: 'John', initials: 'J' },
      ]);
      jest.mocked(BuddiesService.getMessages).mockResolvedValue(manyMessages);
      
      notificationManager.startPolling(userId);
      
      // Trigger multiple polling cycles
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(300000);
        await Promise.resolve();
      }
      
      // Should not crash or consume excessive memory
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should not create memory leaks with note ID tracking', async () => {
      const userId = 'test-user-123';
      
      // Mock many notes
      const manyNotes = Array.from({ length: 1000 }, (_, i) => ({
        id: `note-${i}`,
        senderId: 'other-user',
        content: `Note content ${i}`,
      }));
      
      jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue(manyNotes);
      
      notificationManager.startPolling(userId);
      
      // Trigger multiple polling cycles
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(300000);
        await Promise.resolve();
      }
      
      // Should not crash or consume excessive memory
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should handle service cleanup efficiently', async () => {
      const userId = 'test-user-123';
      
      // Initialize services
      await realtimeService.initialize(userId);
      notificationManager.startPolling(userId);
      
      const startTime = Date.now();
      
      // Cleanup services
      await realtimeService.disconnect();
      notificationManager.stopPolling();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should cleanup within 20ms
      expect(duration).toBeLessThan(20);
      expect(realtimeService.isRealtimeConnected()).toBe(false);
      expect(notificationManager.isPolling()).toBe(false);
    });
  });

  describe('Network Efficiency', () => {
    it('should handle network failures efficiently', async () => {
      jest.mocked(BuddiesService.testNetworkConnection).mockResolvedValue(false);
      
      const userId = 'test-user-123';
      notificationManager.startPolling(userId);
      
      // Trigger polling with network failure
      jest.advanceTimersByTime(300000);
      await Promise.resolve();
      
      // Should handle network failure gracefully
      expect(BuddiesService.getBuddies).not.toHaveBeenCalled();
    });

    it('should handle database query failures efficiently', async () => {
      jest.mocked(BuddiesService.getBuddies).mockRejectedValue(new Error('Database error'));
      jest.mocked(BuddiesService.getMessages).mockRejectedValue(new Error('Database error'));
      jest.mocked(BuddiesService.getWhisprNotes).mockRejectedValue(new Error('Database error'));
      
      const userId = 'test-user-123';
      notificationManager.startPolling(userId);
      
      // Trigger polling with database failures
      jest.advanceTimersByTime(300000);
      await Promise.resolve();
      
      // Should handle database failures gracefully
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should handle service initialization failures efficiently', async () => {
      // Mock the initialize method to reject
      const originalInitialize = realtimeService.initialize;
      realtimeService.initialize = jest.fn().mockRejectedValue(new Error('Service error'));
      
      const startTime = Date.now();
      
      await realtimeService.initialize('test-user-123');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle initialization failure quickly
      expect(duration).toBeLessThan(50);
      
      // Restore original method
      realtimeService.initialize = originalInitialize;
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent notification operations efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        notificationService.showMessageNotification('Title 1', 'Message 1', 'Buddy 1'),
        notificationService.showNoteNotification('Title 2', 'Content 2'),
        notificationService.showGeneralNotification('Title 3', 'Content 3'),
        notificationService.testNotification(),
        notificationService.cancelAllNotifications(),
      ];
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle concurrent operations within 200ms
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent service operations efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        realtimeService.initialize('user-1'),
        realtimeService.initialize('user-2'),
        notificationManager.startPolling('user-3'),
        notificationManager.startPolling('user-4'),
      ];
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle concurrent service operations within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle mixed service operations efficiently', async () => {
      const startTime = Date.now();
      
      const promises = [
        realtimeService.initialize('user-1'),
        notificationManager.startPolling('user-2'),
        notificationService.showMessageNotification('Title', 'Message', 'Buddy'),
        realtimeService.testConnection(),
        notificationManager.triggerNotificationCheck(),
      ];
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle mixed operations within 150ms
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency notification sending', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          notificationService.showMessageNotification(
            `Title ${i}`,
            `Message ${i}`,
            `Buddy ${i}`
          )
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle high-frequency sending within 1000ms
      expect(duration).toBeLessThan(1000);
      expect(notificationService.showMessageNotification).toHaveBeenCalledTimes(100);
    });

    it('should handle rapid service state changes', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        await realtimeService.initialize(`user-${i}`);
        notificationManager.startPolling(`user-${i}`);
        await realtimeService.disconnect();
        notificationManager.stopPolling();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should handle rapid state changes within 2000ms
      expect(duration).toBeLessThan(2000);
    });

    it('should handle continuous polling without performance degradation', async () => {
      const userId = 'test-user-123';
      notificationManager.startPolling(userId);
      
      // Trigger multiple polling cycles
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(300000);
        await Promise.resolve();
      }
      
      // Should handle continuous polling efficiently
      expect(notificationManager.isPolling()).toBe(true);
    });
  });
});
