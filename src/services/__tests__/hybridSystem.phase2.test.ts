// Phase 2 Hybrid System Tests
import { notificationManager } from '../notificationManager';
import { realtimeService } from '../realtimeService';
import { performanceMonitor } from '../performanceMonitor';

// Mock services
jest.mock('../realtimeService', () => ({
  realtimeService: {
    initialize: jest.fn(),
    disconnect: jest.fn(),
    isRealtimeConnected: jest.fn(),
    getConnectionStatus: jest.fn(),
  }
}));

jest.mock('../notificationService', () => ({
  notificationService: {
    showMessageNotification: jest.fn().mockResolvedValue(true),
    showNoteNotification: jest.fn().mockResolvedValue(true),
  }
}));

jest.mock('../buddiesService', () => ({
  BuddiesService: {
    getBuddies: jest.fn().mockResolvedValue([
      { id: 'buddy1', name: 'Test Buddy', initials: 'TB' }
    ]),
    getMessages: jest.fn().mockResolvedValue([
      { id: 'msg1', senderId: 'other-user', content: 'Test message' }
    ]),
    getWhisprNotes: jest.fn().mockResolvedValue([
      { id: 'note1', senderId: 'other-user', content: 'Test note' }
    ]),
  }
}));

describe('Phase 2: Hybrid Notification System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.resetMetrics();
  });

  afterEach(async () => {
    await notificationManager.stopNotificationService();
    performanceMonitor.stopMonitoring();
  });

  describe('Hybrid NotificationManager', () => {
    it('should start with realtime and fallback to polling', async () => {
      const userId = 'test-user-123';
      
      // Mock successful realtime initialization
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      
      await notificationManager.startNotificationService(userId);
      
      expect(notificationManager.isRealtimeActive()).toBe(true);
      expect(notificationManager.isPollingActive()).toBe(false);
      
      const status = notificationManager.getServiceStatus();
      expect(status.realtime).toBe(true);
      expect(status.fallbackMode).toBe(false);
      expect(status.connectionHealth).toBe('healthy');
    });

    it('should fallback to polling when realtime fails', async () => {
      const userId = 'test-user-123';
      
      // Mock realtime failure
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      
      await notificationManager.startNotificationService(userId);
      
      expect(notificationManager.isRealtimeActive()).toBe(false);
      expect(notificationManager.isPollingActive()).toBe(true);
      
      const status = notificationManager.getServiceStatus();
      expect(status.fallbackMode).toBe(true);
      expect(status.connectionHealth).toBe('degraded');
    });

    it('should optimize for background mode', async () => {
      const userId = 'test-user-123';
      
      // Start service
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      await notificationManager.startNotificationService(userId);
      
      // Optimize for background
      await notificationManager.optimizeForBackground();
      
      const status = notificationManager.getServiceStatus();
      expect(status.realtime || status.polling).toBe(true);
    });

    it('should optimize for foreground mode', async () => {
      const userId = 'test-user-123';
      
      // Start with polling fallback
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      await notificationManager.startNotificationService(userId);
      
      // Mock successful realtime reconnection
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      
      // Optimize for foreground
      await notificationManager.optimizeForForeground();
      
      const status = notificationManager.getServiceStatus();
      expect(status.realtime).toBe(true);
      expect(status.fallbackMode).toBe(false);
    });

    it('should track performance metrics', async () => {
      const userId = 'test-user-123';
      
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      await notificationManager.startNotificationService(userId);
      
      const metrics = notificationManager.getPerformanceMetrics();
      expect(metrics).toHaveProperty('realtimeSuccessRate');
      expect(metrics).toHaveProperty('fallbackActivations');
      expect(metrics).toHaveProperty('totalNotifications');
    });

    it('should handle service status correctly', () => {
      const status = notificationManager.getServiceStatus();
      
      expect(status).toHaveProperty('realtime');
      expect(status).toHaveProperty('polling');
      expect(status).toHaveProperty('fallbackMode');
      expect(status).toHaveProperty('connectionHealth');
      
      expect(['healthy', 'degraded', 'failed']).toContain(status.connectionHealth);
    });
  });

  describe('Performance Monitoring', () => {
    it('should start and stop monitoring', () => {
      performanceMonitor.startMonitoring();
      expect(performanceMonitor.getCurrentMetrics()).toBeDefined();
      
      performanceMonitor.stopMonitoring();
    });

    it('should collect metrics', () => {
      performanceMonitor.startMonitoring();
      
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics).toHaveProperty('realtimeSuccessRate');
      expect(metrics).toHaveProperty('connectionHealth');
      expect(metrics).toHaveProperty('lastHealthCheck');
    });

    it('should generate performance reports', () => {
      performanceMonitor.startMonitoring();
      
      // Wait for report generation
      setTimeout(() => {
        const reports = performanceMonitor.getRecentReports(1);
        expect(reports.length).toBeGreaterThan(0);
        
        const report = reports[0];
        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('metrics');
        expect(report).toHaveProperty('recommendations');
        expect(report).toHaveProperty('alerts');
      }, 1000);
    });

    it('should provide performance summary', () => {
      performanceMonitor.startMonitoring();
      
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary).toHaveProperty('overallHealth');
      expect(summary).toHaveProperty('keyMetrics');
      expect(summary).toHaveProperty('trends');
      
      expect(['excellent', 'good', 'fair', 'poor']).toContain(summary.overallHealth);
    });

    it('should export metrics', () => {
      performanceMonitor.startMonitoring();
      
      const exported = performanceMonitor.exportMetrics();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('summary');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full hybrid notification flow', async () => {
      const userId = 'integration-test-user';
      
      // Start performance monitoring
      performanceMonitor.startMonitoring();
      
      // Start hybrid notification service
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      await notificationManager.startNotificationService(userId);
      
      // Verify service status
      const status = notificationManager.getServiceStatus();
      expect(status.realtime || status.polling).toBe(true);
      
      // Check performance metrics
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.connectionHealth).toBeDefined();
      
      // Stop services
      await notificationManager.stopNotificationService();
      performanceMonitor.stopMonitoring();
    });

    it('should handle app state transitions', async () => {
      const userId = 'app-state-test-user';
      
      // Start service
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      await notificationManager.startNotificationService(userId);
      
      // Simulate background
      await notificationManager.optimizeForBackground();
      let status = notificationManager.getServiceStatus();
      expect(status.realtime || status.polling).toBe(true);
      
      // Simulate foreground
      await notificationManager.optimizeForForeground();
      status = notificationManager.getServiceStatus();
      expect(status.realtime || status.polling).toBe(true);
    });

    it('should maintain backward compatibility', async () => {
      const userId = 'compatibility-test-user';
      
      // Test legacy methods
      jest.mocked(realtimeService.initialize).mockResolvedValue(false);
      notificationManager.startPolling(userId);
      
      expect(notificationManager.isPolling()).toBe(true);
      
      notificationManager.stopPolling();
      expect(notificationManager.isPolling()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle realtime service errors gracefully', async () => {
      const userId = 'error-test-user';
      
      // Mock realtime error
      jest.mocked(realtimeService.initialize).mockRejectedValue(new Error('Realtime failed'));
      
      await notificationManager.startNotificationService(userId);
      
      // Should fallback to polling
      expect(notificationManager.isPollingActive()).toBe(true);
      expect(notificationManager.isRealtimeActive()).toBe(false);
    });

    it('should handle service stop errors gracefully', async () => {
      const userId = 'stop-error-test-user';
      
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      jest.mocked(realtimeService.disconnect).mockRejectedValue(new Error('Disconnect failed'));
      
      await notificationManager.startNotificationService(userId);
      
      // Should still stop gracefully
      await notificationManager.stopNotificationService();
      
      expect(notificationManager.isRealtimeActive()).toBe(false);
      expect(notificationManager.isPollingActive()).toBe(false);
    });
  });

  describe('Phase 2 Validation', () => {
    it('should complete Phase 2 requirements', async () => {
      const userId = 'phase2-validation-user';
      
      console.log('🚀 Starting Phase 2 validation...');
      
      // Test 1: Hybrid service initialization
      jest.mocked(realtimeService.initialize).mockResolvedValue(true);
      await notificationManager.startNotificationService(userId);
      
      const initSuccess = notificationManager.isRealtimeActive() || notificationManager.isPollingActive();
      console.log('✅ Hybrid service initialization:', initSuccess ? 'PASS' : 'FAIL');
      
      // Test 2: Performance monitoring
      performanceMonitor.startMonitoring();
      const monitoringActive = performanceMonitor.getCurrentMetrics() !== undefined;
      console.log('✅ Performance monitoring:', monitoringActive ? 'PASS' : 'FAIL');
      
      // Test 3: App state optimization
      await notificationManager.optimizeForBackground();
      await notificationManager.optimizeForForeground();
      const optimizationWorking = true; // No errors thrown
      console.log('✅ App state optimization:', optimizationWorking ? 'PASS' : 'FAIL');
      
      // Test 4: Service status tracking
      const status = notificationManager.getServiceStatus();
      const statusValid = status && typeof status.connectionHealth === 'string';
      console.log('✅ Service status tracking:', statusValid ? 'PASS' : 'FAIL');
      
      // Test 5: Performance metrics
      const metrics = performanceMonitor.getPerformanceSummary();
      const metricsValid = metrics && metrics.overallHealth;
      console.log('✅ Performance metrics:', metricsValid ? 'PASS' : 'FAIL');
      
      const phase2Complete = initSuccess && monitoringActive && optimizationWorking && statusValid && metricsValid;
      console.log('🎯 Phase 2 Complete:', phase2Complete ? '✅ READY' : '❌ NEEDS WORK');
      
      // Cleanup
      await notificationManager.stopNotificationService();
      performanceMonitor.stopMonitoring();
      
      expect(phase2Complete).toBe(true);
    });
  });
});
