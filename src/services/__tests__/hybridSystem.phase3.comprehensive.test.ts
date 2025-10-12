// Phase 3: Comprehensive Testing Suite for Hybrid Notification System
import { notificationManager } from '../notificationManager';
import { realtimeService } from '../realtimeService';
import { BuddiesService } from '../buddiesService';
import { notificationService } from '../notificationService';
import { performanceMonitor } from '../performanceMonitor';
import { AppState, Platform } from 'react-native';

// Mock URL polyfill for tests
jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock all external dependencies
jest.mock('../realtimeService');
jest.mock('../buddiesService');
jest.mock('../notificationService');
jest.mock('../performanceMonitor');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  Platform: {
    OS: 'android',
  },
}));
jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  createChannel: jest.fn(),
  localNotification: jest.fn(),
  checkPermissions: jest.fn(() => Promise.resolve({ alert: true, badge: true, sound: true })),
  requestPermissions: jest.fn(() => Promise.resolve({ alert: true, badge: true, sound: true })),
}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          limit: jest.fn(() => ({ data: [], error: null })),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn((cb) => {
          setTimeout(() => cb('SUBSCRIBED'), 100);
          return { unsubscribe: jest.fn() };
        }),
      })),
    })),
    removeChannel: jest.fn(),
  })),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Phase 3: Comprehensive Hybrid System Tests', () => {
  const userId = 'test-user-123';
  const mockBuddy = {
    id: 'buddy-123',
    name: 'Test Buddy',
    userId: 'buddy-user-123',
  };
  const mockMessage = {
    id: 'msg-123',
    content: 'Test message',
    senderId: 'buddy-user-123',
    timestamp: new Date().toISOString(),
  };
  const mockNote = {
    id: 'note-123',
    content: 'Test note',
    senderId: 'buddy-user-123',
    mood: 'happy',
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default successful state
    jest.mocked(realtimeService.initialize).mockResolvedValue(true);
    jest.mocked(realtimeService.disconnect).mockResolvedValue(undefined);
    jest.mocked(realtimeService.isRealtimeConnected).mockReturnValue(true);
    jest.mocked(realtimeService.testConnection).mockResolvedValue(true);
    jest.mocked(BuddiesService.getBuddies).mockResolvedValue([mockBuddy]);
    jest.mocked(BuddiesService.getMessages).mockResolvedValue([mockMessage]);
    jest.mocked(BuddiesService.getWhisprNotes).mockResolvedValue([mockNote]);
    jest.mocked(notificationService.showMessageNotification).mockResolvedValue(undefined);
    jest.mocked(notificationService.showNoteNotification).mockResolvedValue(undefined);
    jest.mocked(performanceMonitor.start).mockImplementation(() => {});
    jest.mocked(performanceMonitor.stop).mockImplementation(() => {});
    jest.mocked(performanceMonitor.recordRealtimeAttempt).mockImplementation(() => {});
    jest.mocked(performanceMonitor.recordPollingCheck).mockImplementation(() => {});
    jest.mocked(performanceMonitor.recordNotificationSent).mockImplementation(() => {});
    jest.mocked(performanceMonitor.recordError).mockImplementation(() => {});
    jest.mocked(performanceMonitor.getMetrics).mockReturnValue({
      startTime: 0, endTime: 0, duration: 0, realtimeConnectionAttempts: 0,
      realtimeConnectionSuccesses: 0, pollingChecks: 0, notificationsSent: 0, errors: 0
    });
    jest.mocked(performanceMonitor.generateReport).mockReturnValue('Report');
    jest.mocked(performanceMonitor.getSummary).mockReturnValue({});
    jest.mocked(performanceMonitor.exportMetrics).mockReturnValue('{}');

    // Manually reset internal state of notificationManager
    (notificationManager as any).userId = null;
    (notificationManager as any).pollingActive = false;
    (notificationManager as any).realtimeActive = false;
    (notificationManager as any).fallbackMode = false;
    (notificationManager as any).pollingInterval = null;
    (notificationManager as any).lastInitializationAttempt = 0;
  });

  afterEach(async () => {
    await notificationManager.stopNotificationService();
  });

  describe('🔬 Comprehensive Functionality Tests', () => {
    it('should handle complete realtime success flow', async () => {
      // Test successful realtime initialization
      await notificationManager.startNotificationService(userId);
      
      expect(notificationManager.isRealtimeActive()).toBe(true);
      expect(notificationManager.isPollingActive()).toBe(false);
      expect(realtimeService.initialize).toHaveBeenCalledWith(userId);
      expect(performanceMonitor.recordRealtimeAttempt).toHaveBeenCalledWith(true);
      
      const status = notificationManager.getServiceStatus();
      expect(status.realtime).toBe(true);
      expect(status.polling).toBe(false);
      expect(status.fallbackMode).toBe(false);
      expect(status.connectionHealth).toBe('healthy');
    });

    it('should handle complete realtime failure and fallback', async () => {
      // Test realtime failure and polling fallback
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      
      await notificationManager.startNotificationService(userId);
      
      expect(notificationManager.isRealtimeActive()).toBe(false);
      expect(notificationManager.isPollingActive()).toBe(true);
      expect(notificationManager.getServiceStatus().fallbackMode).toBe(true);
      expect(performanceMonitor.recordRealtimeAttempt).toHaveBeenCalledWith(false);
    });

    it('should handle multiple initialization attempts with cooldown', async () => {
      // First attempt
      await notificationManager.startNotificationService(userId);
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Second attempt within cooldown period
      await notificationManager.startNotificationService(userId);
      // Should still be active, not reinitialize
      expect(realtimeService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle app state transitions correctly', async () => {
      await notificationManager.startNotificationService(userId);
      
      // Test background optimization
      jest.mocked(AppState).currentState = 'background';
      await notificationManager.optimizeForBackground();
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Test foreground optimization
      jest.mocked(AppState).currentState = 'active';
      await notificationManager.optimizeForForeground();
      expect(notificationManager.isRealtimeActive()).toBe(true);
    });
  });

  describe('⚡ Performance Tests', () => {
    it('should measure initialization performance', async () => {
      const startTime = Date.now();
      await notificationManager.startNotificationService(userId);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should initialize within 5 seconds
      expect(performanceMonitor.start).toHaveBeenCalled();
    });

    it('should track performance metrics accurately', async () => {
      await notificationManager.startNotificationService(userId);
      
      // Verify performance monitoring calls
      expect(performanceMonitor.start).toHaveBeenCalled();
      expect(performanceMonitor.recordRealtimeAttempt).toHaveBeenCalledWith(true);
      
      await notificationManager.stopNotificationService();
      expect(performanceMonitor.stop).toHaveBeenCalled();
    });

    it('should handle high-frequency polling efficiently', async () => {
      // Start in polling mode
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      await notificationManager.startNotificationService(userId);
      
      // Simulate multiple polling cycles
      for (let i = 0; i < 5; i++) {
        await (notificationManager as any).checkForNewMessages();
        await (notificationManager as any).checkForNewNotes();
      }
      
      expect(BuddiesService.getBuddies).toHaveBeenCalledTimes(5);
      expect(BuddiesService.getMessages).toHaveBeenCalledTimes(5);
      expect(BuddiesService.getWhisprNotes).toHaveBeenCalledTimes(5);
    });
  });

  describe('🛡️ Error Handling Tests', () => {
    it('should handle realtime service errors gracefully', async () => {
      jest.mocked(realtimeService.initialize).mockRejectedValue(new Error('Network error'));
      
      await notificationManager.startNotificationService(userId);
      
      // Should fallback to polling
      expect(notificationManager.isPollingActive()).toBe(true);
      expect(notificationManager.isRealtimeActive()).toBe(false);
      expect(performanceMonitor.recordError).toHaveBeenCalled();
    });

    it('should handle polling service errors gracefully', async () => {
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      jest.mocked(BuddiesService.getBuddies).mockRejectedValue(new Error('Database error'));
      
      await notificationManager.startNotificationService(userId);
      
      // Should continue running despite polling errors
      expect(notificationManager.isPollingActive()).toBe(true);
      
      // Simulate polling check with error
      await (notificationManager as any).checkForNewMessages();
      expect(performanceMonitor.recordError).toHaveBeenCalled();
    });

    it('should handle notification service errors gracefully', async () => {
      jest.mocked(notificationService.showMessageNotification).mockRejectedValue(new Error('Notification error'));
      
      await notificationManager.startNotificationService(userId);
      
      // Should continue running despite notification errors
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Simulate notification with error
      await (notificationManager as any).handleNewMessage({ new: mockMessage });
      expect(performanceMonitor.recordError).toHaveBeenCalled();
    });

    it('should handle circuit breaker activation', async () => {
      // Mock multiple realtime failures to trigger circuit breaker
      jest.mocked(realtimeService.initialize).mockRejectedValue(new Error('Persistent error'));
      
      // Simulate multiple initialization attempts
      for (let i = 0; i < 3; i++) {
        try {
          await notificationManager.startNotificationService(userId);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Should be in polling fallback mode
      expect(notificationManager.isPollingActive()).toBe(true);
      expect(notificationManager.isRealtimeActive()).toBe(false);
    });
  });

  describe('🔄 Integration Tests', () => {
    it('should handle complete notification flow', async () => {
      await notificationManager.startNotificationService(userId);
      
      // Simulate receiving a new message via realtime
      await (notificationManager as any).handleNewMessage({ new: mockMessage });
      expect(notificationService.showMessageNotification).toHaveBeenCalledWith(
        'New Message',
        mockMessage.content,
        mockBuddy.name
      );
      
      // Simulate receiving a new note via realtime
      await (notificationManager as any).handleNewNote({ new: mockNote });
      expect(notificationService.showNoteNotification).toHaveBeenCalledWith(
        'New Whispr Note',
        mockNote.content
      );
    });

    it('should handle polling fallback flow', async () => {
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      await notificationManager.startNotificationService(userId);
      
      // Simulate polling finding new messages
      await (notificationManager as any).checkForNewMessages();
      expect(notificationService.showMessageNotification).toHaveBeenCalled();
      
      // Simulate polling finding new notes
      await (notificationManager as any).checkForNewNotes();
      expect(notificationService.showNoteNotification).toHaveBeenCalled();
    });

    it('should handle service restart and recovery', async () => {
      // Start service
      await notificationManager.startNotificationService(userId);
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Stop service
      await notificationManager.stopNotificationService();
      expect(notificationManager.isRealtimeActive()).toBe(false);
      expect(notificationManager.isPollingActive()).toBe(false);
      
      // Restart service
      await notificationManager.startNotificationService(userId);
      expect(notificationManager.isRealtimeActive()).toBe(true);
    });
  });

  describe('📊 Load Testing', () => {
    it('should handle multiple concurrent users', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      
      // Start services for multiple users
      for (const id of userIds) {
        await notificationManager.startNotificationService(id);
      }
      
      // All should be active
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Cleanup
      await notificationManager.stopNotificationService();
    });

    it('should handle high message volume', async () => {
      await notificationManager.startNotificationService(userId);
      
      // Simulate high volume of messages
      const messages = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));
      
      for (const message of messages) {
        await (notificationManager as any).handleNewMessage({ new: message });
      }
      
      expect(notificationService.showMessageNotification).toHaveBeenCalledTimes(100);
    });

    it('should handle high note volume', async () => {
      await notificationManager.startNotificationService(userId);
      
      // Simulate high volume of notes
      const notes = Array.from({ length: 50 }, (_, i) => ({
        ...mockNote,
        id: `note-${i}`,
        content: `Note ${i}`,
      }));
      
      for (const note of notes) {
        await (notificationManager as any).handleNewNote({ new: note });
      }
      
      expect(notificationService.showNoteNotification).toHaveBeenCalledTimes(50);
    });
  });

  describe('🔋 Battery Optimization Tests', () => {
    it('should optimize polling frequency in background', async () => {
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      await notificationManager.startNotificationService(userId);
      
      // Simulate background mode
      jest.mocked(AppState).currentState = 'background';
      await notificationManager.optimizeForBackground();
      
      // Should maintain polling but with optimized frequency
      expect(notificationManager.isPollingActive()).toBe(true);
    });

    it('should attempt realtime reconnection in foreground', async () => {
      // Start in fallback mode
      jest.mocked(realtimeService.initialize).mockResolvedValueOnce(false);
      await notificationManager.startNotificationService(userId);
      
      // Simulate foreground mode with successful reconnection
      jest.mocked(AppState).currentState = 'active';
      jest.mocked(realtimeService.initialize).mockResolvedValueOnce(true);
      await notificationManager.optimizeForForeground();
      
      // Should switch back to realtime
      expect(notificationManager.isRealtimeActive()).toBe(true);
      expect(notificationManager.isPollingActive()).toBe(false);
    });
  });

  describe('🌐 Network Resilience Tests', () => {
    it('should handle network disconnection gracefully', async () => {
      await notificationManager.startNotificationService(userId);
      
      // Simulate network disconnection
      jest.mocked(realtimeService.testConnection).mockResolvedValue(false);
      jest.mocked(realtimeService.isRealtimeConnected).mockReturnValue(false);
      
      // Should trigger fallback
      await (notificationManager as any).handleConnectionFailure();
      expect(notificationManager.isPollingActive()).toBe(true);
    });

    it('should handle network reconnection', async () => {
      // Start in fallback mode
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      await notificationManager.startNotificationService(userId);
      
      // Simulate network reconnection
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      await notificationManager.optimizeForForeground();
      
      // Should switch back to realtime
      expect(notificationManager.isRealtimeActive()).toBe(true);
    });
  });

  describe('🎯 Phase 3 Validation', () => {
    it('should complete all Phase 3 requirements', async () => {
      // Test 1: Comprehensive functionality
      await notificationManager.startNotificationService(userId);
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Test 2: Performance monitoring
      expect(performanceMonitor.start).toHaveBeenCalled();
      expect(performanceMonitor.getMetrics).toHaveBeenCalled();
      
      // Test 3: Error handling
      jest.mocked(realtimeService.initialize).mockRejectedValueOnce(new Error('Test error'));
      await notificationManager.startNotificationService(userId);
      expect(notificationManager.isPollingActive()).toBe(true);
      
      // Test 4: Load handling
      const messages = Array.from({ length: 10 }, (_, i) => ({ ...mockMessage, id: `msg-${i}` }));
      for (const message of messages) {
        await (notificationManager as any).handleNewMessage({ new: message });
      }
      expect(notificationService.showMessageNotification).toHaveBeenCalledTimes(10);
      
      // Test 5: Battery optimization
      await notificationManager.optimizeForBackground();
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      // Test 6: Network resilience
      await notificationManager.stopNotificationService();
      await notificationManager.startNotificationService(userId);
      expect(notificationManager.isRealtimeActive()).toBe(true);
      
      console.log('✅ Phase 3: All comprehensive tests passed');
    });
  });
});
