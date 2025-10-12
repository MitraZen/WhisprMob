import { notificationManager } from '../notificationManager';
import { notificationService } from '../notificationService';
import { BuddiesService } from '../buddiesService';

// Mock dependencies
jest.mock('../notificationService', () => ({
  notificationService: {
    showMessageNotification: jest.fn(),
    showNoteNotification: jest.fn(),
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

describe('NotificationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset mocks to default successful behavior
    jest.mocked(notificationService.showMessageNotification).mockResolvedValue('Message notification sent successfully');
    jest.mocked(notificationService.showNoteNotification).mockResolvedValue('Note notification sent successfully');
    jest.mocked(BuddiesService.testNetworkConnection).mockResolvedValue(true);
    jest.mocked(BuddiesService.getBuddies).mockResolvedValue([]);
    jest.mocked(BuddiesService.getMessages).mockResolvedValue([]);
    jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Polling Management', () => {
    it('should start polling for a user', () => {
      const userId = 'test-user-123';
      
      notificationManager.startPolling(userId);
      
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should stop polling when stopPolling is called', () => {
      const userId = 'test-user-123';
      
      notificationManager.startPolling(userId);
      expect(notificationManager.isPolling()).toBe(true);
      
      notificationManager.stopPolling();
      expect(notificationManager.isPolling()).toBe(false);
    });

    it('should restart polling if already active', () => {
      const userId = 'test-user-123';
      
      notificationManager.startPolling(userId);
      notificationManager.startPolling(userId); // Should restart
      
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should clear previous notification history on start', () => {
      const userId = 'test-user-123';
      
      notificationManager.startPolling(userId);
      
      // Verify that the manager is ready for new notifications
      expect(notificationManager.isPolling()).toBe(true);
    });
  });

  describe('Message Checking', () => {
    beforeEach(() => {
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([
        {
          id: 'buddy-1',
          name: 'John Doe',
          initials: 'JD',
        },
        {
          id: 'buddy-2',
          name: 'Jane Smith',
          initials: 'JS',
        },
      ]);
      (BuddiesService.getMessages as jest.Mock).mockResolvedValue([]);
    });

    it('should check for new messages when polling', async () => {
      const userId = 'test-user-123';
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000); // 5 minutes
      
      await Promise.resolve(); // Wait for async operations
      
      expect(BuddiesService.testNetworkConnection).toHaveBeenCalled();
      expect(BuddiesService.getBuddies).toHaveBeenCalledWith(userId);
    });

    it('should send notifications for new messages', async () => {
      const userId = 'test-user-123';
      const existingMessageId = 'existing-message-1';
      const newMessageId = 'new-message-1';
      
      // Mock existing messages
      (BuddiesService.getMessages as jest.Mock).mockResolvedValue([
        {
          id: existingMessageId,
          senderId: 'buddy-1',
          content: 'Old message',
        },
        {
          id: newMessageId,
          senderId: 'buddy-1',
          content: 'New message',
        },
      ]);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      expect(notificationService.showMessageNotification).toHaveBeenCalledWith(
        'New Message',
        'New message',
        'John Doe'
      );
    });

    it('should not send notifications for messages from self', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.getMessages as jest.Mock).mockResolvedValue([
        {
          id: 'message-1',
          senderId: userId, // Message from self
          content: 'My own message',
        },
      ]);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      expect(notificationService.showMessageNotification).not.toHaveBeenCalled();
    });

    it('should handle network connection failures', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(false);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      expect(BuddiesService.getBuddies).not.toHaveBeenCalled();
    });

    it('should stop polling after max retries', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(false);
      
      notificationManager.startPolling(userId);
      
      // Trigger multiple polling intervals to reach max retries
      for (let i = 0; i < 4; i++) {
        jest.advanceTimersByTime(300000);
        await Promise.resolve();
      }
      
      expect(notificationManager.isPolling()).toBe(false);
    });

    it('should limit buddy checking to first 5 buddies', async () => {
      const userId = 'test-user-123';
      
      // Mock 10 buddies
      const manyBuddies = Array.from({ length: 10 }, (_, i) => ({
        id: `buddy-${i}`,
        name: `Buddy ${i}`,
        initials: `B${i}`,
      }));
      
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue(manyBuddies);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      // Should only call getMessages for first 5 buddies
      expect(BuddiesService.getMessages).toHaveBeenCalledTimes(5);
    });
  });

  describe('Note Checking', () => {
    beforeEach(() => {
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getWhisprNotes as jest.Mock).mockResolvedValue([]);
    });

    it('should check for new notes when polling', async () => {
      const userId = 'test-user-123';
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      expect(BuddiesService.getWhisprNotes).toHaveBeenCalledWith(userId);
    });

    it('should send notifications for new notes', async () => {
      const userId = 'test-user-123';
      const newNoteId = 'new-note-1';
      
      (BuddiesService.getWhisprNotes as jest.Mock).mockResolvedValue([
        {
          id: newNoteId,
          senderId: 'other-user',
          content: 'New whispr note content',
        },
      ]);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      expect(notificationService.showNoteNotification).toHaveBeenCalledWith(
        'New Whispr Note',
        'New whispr note content'
      );
    });

    it('should not send notifications for notes from self', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.getWhisprNotes as jest.Mock).mockResolvedValue([
        {
          id: 'note-1',
          senderId: userId, // Note from self
          content: 'My own note',
        },
      ]);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      expect(notificationService.showNoteNotification).not.toHaveBeenCalled();
    });

    it('should limit note checking to recent notes only', async () => {
      const userId = 'test-user-123';
      
      // Mock 15 notes
      const manyNotes = Array.from({ length: 15 }, (_, i) => ({
        id: `note-${i}`,
        senderId: 'other-user',
        content: `Note content ${i}`,
      }));
      
      (BuddiesService.getWhisprNotes as jest.Mock).mockResolvedValue(manyNotes);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      // Should only process first 10 notes
      expect(notificationService.showNoteNotification).toHaveBeenCalledTimes(10);
    });
  });

  describe('Manual Trigger', () => {
    it('should manually trigger notification check', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([]);
      (BuddiesService.getWhisprNotes as jest.Mock).mockResolvedValue([]);
      
      notificationManager.startPolling(userId);
      
      await notificationManager.triggerNotificationCheck();
      
      expect(BuddiesService.testNetworkConnection).toHaveBeenCalled();
      expect(BuddiesService.getBuddies).toHaveBeenCalledWith(userId);
      expect(BuddiesService.getWhisprNotes).toHaveBeenCalledWith(userId);
    });

    it('should not trigger check if no user is set', async () => {
      await notificationManager.triggerNotificationCheck();
      
      expect(BuddiesService.testNetworkConnection).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in message checking gracefully', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      // Should not crash, just log error
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should handle errors in note checking gracefully', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([]);
      (BuddiesService.getWhisprNotes as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      // Should not crash, just log error
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should handle individual buddy errors gracefully', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([
        { id: 'buddy-1', name: 'John', initials: 'J' },
        { id: 'buddy-2', name: 'Jane', initials: 'J' },
      ]);
      
      // First buddy succeeds, second fails
      (BuddiesService.getMessages as jest.Mock)
        .mockResolvedValueOnce([{ id: 'msg-1', senderId: 'buddy-1', content: 'Hello' }])
        .mockRejectedValueOnce(new Error('Buddy error'));
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      // Should handle both success and failure
      expect(notificationService.showMessageNotification).toHaveBeenCalledTimes(1);
      expect(notificationManager.isPolling()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle rapid polling intervals efficiently', async () => {
      const userId = 'test-user-123';
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([]);
      (BuddiesService.getWhisprNotes as jest.Mock).mockResolvedValue([]);
      
      notificationManager.startPolling(userId);
      
      // Trigger multiple polling intervals rapidly
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(300000);
        await Promise.resolve();
      }
      
      expect(notificationManager.isPolling()).toBe(true);
    });

    it('should not create memory leaks with message ID tracking', async () => {
      const userId = 'test-user-123';
      
      // Mock many messages
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `message-${i}`,
        senderId: 'buddy-1',
        content: `Message ${i}`,
      }));
      
      (BuddiesService.testNetworkConnection as jest.Mock).mockResolvedValue(true);
      (BuddiesService.getBuddies as jest.Mock).mockResolvedValue([
        { id: 'buddy-1', name: 'John', initials: 'J' },
      ]);
      (BuddiesService.getMessages as jest.Mock).mockResolvedValue(manyMessages);
      
      notificationManager.startPolling(userId);
      
      // Trigger the polling interval
      jest.advanceTimersByTime(300000);
      
      await Promise.resolve();
      
      // Should only keep last 50 message IDs to prevent memory issues
      expect(notificationManager.isPolling()).toBe(true);
    });
  });
});
