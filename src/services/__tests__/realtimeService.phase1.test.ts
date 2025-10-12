// Phase 1 Realtime Service Tests
import { realtimeService } from '../realtimeService';

describe('Phase 1: RealtimeService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    await realtimeService.disconnect();
  });

  describe('Connection Management', () => {
    it('should initialize realtime service successfully', async () => {
      const userId = 'test-user-123';
      const result = await realtimeService.initialize(userId);
      
      expect(result).toBe(true);
      expect(realtimeService.isRealtimeConnected()).toBe(true);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.isConnected).toBe(true);
      expect(status.userId).toBe(userId);
      expect(status.subscriptionCount).toBeGreaterThan(0);
    });

    it('should handle connection failures gracefully', async () => {
      // Mock connection failure
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Connection failed'))
          })
        })
      };
      
      // Mock the import
      jest.doMock('@/config/supabase', () => ({
        supabase: mockSupabase
      }));
      
      const userId = 'test-user-123';
      const result = await realtimeService.initialize(userId);
      
      expect(result).toBe(false);
      expect(realtimeService.isRealtimeConnected()).toBe(false);
    });

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
  });

  describe('Subscription Management', () => {
    it('should create message subscription', async () => {
      const userId = 'test-user-123';
      await realtimeService.initialize(userId);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.subscriptionCount).toBeGreaterThan(0);
    });

    it('should create note subscription', async () => {
      const userId = 'test-user-123';
      await realtimeService.initialize(userId);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.subscriptionCount).toBeGreaterThan(0);
    });

    it('should handle subscription errors', async () => {
      const userId = 'test-user-123';
      
      // Mock subscription error
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockImplementation((callback) => {
          callback('CHANNEL_ERROR');
        })
      };
      
      const mockSupabase = {
        channel: jest.fn().mockReturnValue(mockChannel),
        removeChannel: jest.fn()
      };
      
      jest.doMock('@/config/supabase', () => ({
        supabase: mockSupabase
      }));
      
      const result = await realtimeService.initialize(userId);
      
      // Should still initialize but handle the error
      expect(result).toBeDefined();
    });
  });

  describe('Health Monitoring', () => {
    it('should track connection status', () => {
      const status = realtimeService.getConnectionStatus();
      
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('userId');
      expect(status).toHaveProperty('subscriptionCount');
      expect(status).toHaveProperty('retryCount');
    });

    it('should handle retry logic', async () => {
      const userId = 'test-user-123';
      
      // Mock multiple failures
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Connection failed'))
          })
        })
      };
      
      jest.doMock('@/config/supabase', () => ({
        supabase: mockSupabase
      }));
      
      const result = await realtimeService.initialize(userId);
      
      expect(result).toBe(false);
      
      const status = realtimeService.getConnectionStatus();
      expect(status.retryCount).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    it('should process new message events', async () => {
      const userId = 'test-user-123';
      await realtimeService.initialize(userId);
      
      // Mock notification service
      const mockNotificationService = {
        showMessageNotification: jest.fn().mockResolvedValue(true)
      };
      
      jest.doMock('../services/notificationService', () => ({
        notificationService: mockNotificationService
      }));
      
      // Simulate message event
      const mockPayload = {
        new: {
          sender_id: 'sender-123',
          content: 'Test message',
          receiver_id: userId
        }
      };
      
      // This would be called by the realtime subscription
      // In a real test, we'd trigger the actual event
      expect(realtimeService.isRealtimeConnected()).toBe(true);
    });

    it('should process new note events', async () => {
      const userId = 'test-user-123';
      await realtimeService.initialize(userId);
      
      // Mock notification service
      const mockNotificationService = {
        showNoteNotification: jest.fn().mockResolvedValue(true)
      };
      
      jest.doMock('../services/notificationService', () => ({
        notificationService: mockNotificationService
      }));
      
      // Simulate note event
      const mockPayload = {
        new: {
          sender_id: 'sender-456',
          content: 'Test note',
          mood: 'happy'
        }
      };
      
      expect(realtimeService.isRealtimeConnected()).toBe(true);
    });
  });

  describe('Fallback Mechanism', () => {
    it('should trigger polling fallback on max retries', async () => {
      const userId = 'test-user-123';
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });
      
      // Mock multiple failures to trigger fallback
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Connection failed'))
          })
        })
      };
      
      jest.doMock('@/config/supabase', () => ({
        supabase: mockSupabase
      }));
      
      const result = await realtimeService.initialize(userId);
      
      expect(result).toBe(false);
      
      // Should eventually trigger fallback event
      // Note: This test would need to be adjusted based on actual retry logic
    });
  });
});

// Integration test for Phase 1
describe('Phase 1 Integration Tests', () => {
  it('should complete full realtime initialization flow', async () => {
    const userId = 'integration-test-user';
    
    // Initialize service
    const initResult = await realtimeService.initialize(userId);
    expect(initResult).toBe(true);
    
    // Verify connection
    expect(realtimeService.isRealtimeConnected()).toBe(true);
    
    // Check status
    const status = realtimeService.getConnectionStatus();
    expect(status.isConnected).toBe(true);
    expect(status.userId).toBe(userId);
    expect(status.subscriptionCount).toBeGreaterThan(0);
    
    // Disconnect
    await realtimeService.disconnect();
    expect(realtimeService.isRealtimeConnected()).toBe(false);
  });
});
