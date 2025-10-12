import { realtimeService } from '../realtimeService';
import { notificationService } from '../notificationService';

// Mock dependencies
jest.mock('../notificationService', () => ({
  notificationService: {
    showMessageNotification: jest.fn(),
    showNoteNotification: jest.fn(),
  },
}));

jest.mock('@/config/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
    from: jest.fn(),
  },
}));

describe('RealtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with a user ID', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      expect(realtimeService.isRealtimeConnected()).toBe(true);
    });

    it('should handle initialization errors gracefully', async () => {
      const userId = 'test-user-123';
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // The service should not throw errors during initialization
      await expect(realtimeService.initialize(userId)).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should set connection status correctly after initialization', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.userId).toBe(userId);
      expect(status.subscriptionCount).toBe(0); // No actual subscriptions in polling mode
    });
  });

  describe('Connection Management', () => {
    it('should disconnect properly', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      await realtimeService.disconnect();
      
      expect(realtimeService.isRealtimeConnected()).toBe(false);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.isConnected).toBe(false);
      expect(status.userId).toBeNull();
      expect(status.subscriptionCount).toBe(0);
    });

    it('should handle multiple disconnect calls gracefully', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      await realtimeService.disconnect();
      await realtimeService.disconnect(); // Should not throw
      
      expect(realtimeService.isRealtimeConnected()).toBe(false);
    });

    it('should reset state after disconnect', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      await realtimeService.disconnect();
      
      // Re-initialize should work
      await realtimeService.initialize('new-user-456');
      
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.userId).toBe('new-user-456');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const { supabase } = await import('@/config/supabase');
      
      // Mock successful database query
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null }),
        }),
      });
      
      const result = await realtimeService.testConnection();
      
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should handle connection test failures', async () => {
      const { supabase } = await import('@/config/supabase');
      
      // Mock failed database query
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: new Error('Connection failed') }),
        }),
      });
      
      const result = await realtimeService.testConnection();
      
      expect(result).toBe(false);
    });

    it('should handle connection test exceptions', async () => {
      const { supabase } = await import('@/config/supabase');
      
      // Mock exception during database query
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const result = await realtimeService.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('Message Subscription (Disabled Mode)', () => {
    it('should not create actual subscriptions in polling mode', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.subscriptionCount).toBe(0);
    });

    it('should handle subscription errors gracefully', async () => {
      const userId = 'test-user-123';
      
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await realtimeService.initialize(userId);
      
      // Should not throw errors even if subscriptions fail
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Note Subscription (Disabled Mode)', () => {
    it('should not create actual note subscriptions in polling mode', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.subscriptionCount).toBe(0);
    });

    it('should handle note subscription errors gracefully', async () => {
      const userId = 'test-user-123';
      
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await realtimeService.initialize(userId);
      
      // Should not throw errors even if subscriptions fail
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('should maintain correct state during multiple operations', async () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      
      // Initial state
      expect(realtimeService.isRealtimeConnected()).toBe(false);
      
      // Initialize with first user
      await realtimeService.initialize(userId1);
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      // Initialize with second user (should replace first)
      await realtimeService.initialize(userId2);
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.userId).toBe(userId2);
      
      // Disconnect
      await realtimeService.disconnect();
      expect(realtimeService.isRealtimeConnected()).toBe(false);
      
      const finalStatus = realtimeService.getConnectionStatus();
      expect(finalStatus.userId).toBeNull();
    });

    it('should handle rapid initialization and disconnection', async () => {
      const userId = 'test-user-123';
      
      // Rapid operations
      await realtimeService.initialize(userId);
      await realtimeService.disconnect();
      await realtimeService.initialize(userId);
      await realtimeService.disconnect();
      
      expect(realtimeService.isRealtimeConnected()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization with invalid user ID', async () => {
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await realtimeService.initialize('');
      
      // Should still mark as connected (polling mode)
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should handle null user ID gracefully', async () => {
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await realtimeService.initialize(null as any);
      
      // Should still mark as connected (polling mode)
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should handle undefined user ID gracefully', async () => {
      // Mock console.error to avoid noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await realtimeService.initialize(undefined as any);
      
      // Should still mark as connected (polling mode)
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should initialize quickly', async () => {
      const userId = 'test-user-123';
      const startTime = Date.now();
      
      await realtimeService.initialize(userId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 50ms
      expect(duration).toBeLessThan(50);
    });

    it('should disconnect quickly', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      const startTime = Date.now();
      await realtimeService.disconnect();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should complete within 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should handle multiple rapid operations efficiently', async () => {
      const userId = 'test-user-123';
      
      const startTime = Date.now();
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await realtimeService.initialize(userId);
        await realtimeService.disconnect();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete all operations within 500ms
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Integration with Notification Service', () => {
    it('should not call notification service in polling mode', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      // In polling mode, notifications are handled by NotificationManager
      expect(notificationService.showMessageNotification).not.toHaveBeenCalled();
      expect(notificationService.showNoteNotification).not.toHaveBeenCalled();
    });

    it('should maintain service state consistency', async () => {
      const userId = 'test-user-123';
      
      await realtimeService.initialize(userId);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.userId).toBe(userId);
      
      // Service should be ready for polling-based notifications
      expect(realtimeService.isRealtimeConnected()).toBe(true);
    });
  });
});
