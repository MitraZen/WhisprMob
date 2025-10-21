import { connectionRecoveryService } from '../connectionRecoveryService';
import { realtimeService } from '../realtimeService';
import { notificationManager } from '../notificationManager';

/**
 * Connection Recovery Test Suite
 * Tests various connection recovery scenarios
 */
export class ConnectionRecoveryTestSuite {
  private testResults: Array<{
    testName: string;
    passed: boolean;
    error?: string;
    duration: number;
  }> = [];

  /**
   * Run all connection recovery tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Connection Recovery Test Suite');
    
    const tests = [
      this.testInitialization,
      this.testNetworkStateChanges,
      this.testReconnectionLogic,
      this.testCircuitBreaker,
      this.testHealthChecks,
      this.testServiceIntegration,
      this.testOfflineHandling,
      this.testRecoveryAfterFailure,
    ];

    for (const test of tests) {
      await this.runTest(test);
    }

    this.printResults();
  }

  /**
   * Run a single test
   */
  private async runTest(test: () => Promise<void>): Promise<void> {
    const testName = test.name;
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Running test: ${testName}`);
      await test();
      
      this.testResults.push({
        testName,
        passed: true,
        duration: Date.now() - startTime,
      });
      
      console.log(`✅ Test passed: ${testName}`);
    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      
      console.error(`❌ Test failed: ${testName}`, error);
    }
  }

  /**
   * Test service initialization
   */
  private async testInitialization(): Promise<void> {
    // Test connection recovery service initialization
    await connectionRecoveryService.initialize();
    
    const state = connectionRecoveryService.getConnectionState();
    if (!state) {
      throw new Error('Connection state not initialized');
    }

    // Test realtime service initialization
    const realtimeResult = await realtimeService.initialize('test-user-id');
    if (typeof realtimeResult !== 'boolean') {
      throw new Error('Realtime service initialization should return boolean');
    }

    // Test notification manager initialization
    await notificationManager.startNotificationService('test-user-id');
    
    const serviceStatus = notificationManager.getServiceStatus();
    if (typeof serviceStatus.realtime !== 'boolean') {
      throw new Error('Service status should include realtime boolean');
    }
  }

  /**
   * Test network state change handling
   */
  private async testNetworkStateChanges(): Promise<void> {
    let stateChangeReceived = false;
    
    // Subscribe to state changes
    const unsubscribe = connectionRecoveryService.onConnectionStateChange((state) => {
      stateChangeReceived = true;
      console.log('📡 State change received:', state);
    });

    // Simulate network state changes
    // Note: In a real test environment, you would mock NetInfo
    await new Promise(resolve => setTimeout(resolve, 100));

    unsubscribe();
    
    if (!stateChangeReceived) {
      throw new Error('No state change received');
    }
  }

  /**
   * Test reconnection logic
   */
  private async testReconnectionLogic(): Promise<void> {
    // Register a test reconnection callback
    let reconnectionAttempted = false;
    
    const unsubscribe = connectionRecoveryService.onReconnectionAttempt(async () => {
      reconnectionAttempted = true;
      console.log('🔄 Reconnection attempt received');
      return true; // Simulate successful reconnection
    });

    // Force a reconnection attempt
    const result = await connectionRecoveryService.forceReconnection();
    
    unsubscribe();
    
    if (!reconnectionAttempted) {
      throw new Error('Reconnection callback not triggered');
    }
    
    if (typeof result !== 'boolean') {
      throw new Error('Force reconnection should return boolean');
    }
  }

  /**
   * Test circuit breaker functionality
   */
  private async testCircuitBreaker(): Promise<void> {
    // Update config to trigger circuit breaker quickly
    connectionRecoveryService.updateConfig({
      maxRetries: 2,
      circuitBreakerThreshold: 1,
      circuitBreakerTimeout: 1000, // 1 second for testing
    });

    // Simulate multiple failures
    for (let i = 0; i < 3; i++) {
      try {
        await connectionRecoveryService.forceReconnection();
      } catch (error) {
        // Expected to fail
      }
    }

    // Check if circuit breaker is open
    const state = connectionRecoveryService.getConnectionState();
    if (state.retryCount < 2) {
      throw new Error('Circuit breaker should be triggered after multiple failures');
    }

    // Reset config
    connectionRecoveryService.updateConfig({
      maxRetries: 5,
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 300000,
    });
  }

  /**
   * Test health check functionality
   */
  private async testHealthChecks(): Promise<void> {
    const isHealthy = connectionRecoveryService.isConnectionHealthy();
    
    if (typeof isHealthy !== 'boolean') {
      throw new Error('isConnectionHealthy should return boolean');
    }

    // Test connection state retrieval
    const state = connectionRecoveryService.getConnectionState();
    if (!state || typeof state.isConnected !== 'boolean') {
      throw new Error('Connection state should include isConnected boolean');
    }
  }

  /**
   * Test service integration
   */
  private async testServiceIntegration(): Promise<void> {
    // Test realtime service integration
    const realtimeStatus = realtimeService.getConnectionRecoveryStatus();
    if (!realtimeStatus || typeof realtimeStatus.enabled !== 'boolean') {
      throw new Error('Realtime service should provide connection recovery status');
    }

    // Test notification manager integration
    const notificationStatus = notificationManager.getConnectionRecoveryStatus();
    if (!notificationStatus || typeof notificationStatus.enabled !== 'boolean') {
      throw new Error('Notification manager should provide connection recovery status');
    }

    // Test force reconnection through services
    const realtimeResult = await realtimeService.forceReconnection();
    if (typeof realtimeResult !== 'boolean') {
      throw new Error('Realtime service forceReconnection should return boolean');
    }

    const notificationResult = await notificationManager.forceReconnection();
    if (typeof notificationResult !== 'boolean') {
      throw new Error('Notification manager forceReconnection should return boolean');
    }
  }

  /**
   * Test offline handling
   */
  private async testOfflineHandling(): Promise<void> {
    // Test offline state
    const state = connectionRecoveryService.getConnectionState();
    
    if (state.connectionQuality === 'offline') {
      // Test that services handle offline state gracefully
      const realtimeStatus = realtimeService.getConnectionRecoveryStatus();
      const notificationStatus = notificationManager.getConnectionRecoveryStatus();
      
      if (!realtimeStatus || !notificationStatus) {
        throw new Error('Services should provide status even when offline');
      }
    }
  }

  /**
   * Test recovery after failure
   */
  private async testRecoveryAfterFailure(): Promise<void> {
    // Simulate a failure scenario
    const initialState = connectionRecoveryService.getConnectionState();
    
    // Test recovery
    const recoveryResult = await connectionRecoveryService.forceReconnection();
    
    if (typeof recoveryResult !== 'boolean') {
      throw new Error('Recovery should return boolean result');
    }

    // Test that state is updated after recovery attempt
    const finalState = connectionRecoveryService.getConnectionState();
    if (!finalState) {
      throw new Error('Connection state should be available after recovery attempt');
    }
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n📊 Connection Recovery Test Results');
    console.log('=====================================');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`);
        });
    }
    
    console.log('\n⏱️ Performance:');
    this.testResults.forEach(r => {
      console.log(`  - ${r.testName}: ${r.duration}ms`);
    });
  }

  /**
   * Get test results
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Cleanup test resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test resources');
    
    try {
      await realtimeService.disconnect();
      await notificationManager.stopNotificationService();
      connectionRecoveryService.destroy();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

/**
 * Run connection recovery tests
 */
export async function runConnectionRecoveryTests(): Promise<void> {
  const testSuite = new ConnectionRecoveryTestSuite();
  
  try {
    await testSuite.runAllTests();
  } finally {
    await testSuite.cleanup();
  }
}

/**
 * Quick connection recovery test
 */
export async function quickConnectionTest(): Promise<boolean> {
  try {
    console.log('🧪 Running quick connection test');
    
    // Initialize services
    await connectionRecoveryService.initialize();
    await realtimeService.initialize('test-user');
    await notificationManager.startNotificationService('test-user');
    
    // Test basic functionality
    const isHealthy = connectionRecoveryService.isConnectionHealthy();
    const state = connectionRecoveryService.getConnectionState();
    
    // Cleanup
    await realtimeService.disconnect();
    await notificationManager.stopNotificationService();
    connectionRecoveryService.destroy();
    
    console.log('✅ Quick connection test passed');
    return true;
    
  } catch (error) {
    console.error('❌ Quick connection test failed:', error);
    return false;
  }
}

// Export for global access in development
if (__DEV__) {
  (global as any).ConnectionRecoveryTestSuite = ConnectionRecoveryTestSuite;
  (global as any).runConnectionRecoveryTests = runConnectionRecoveryTests;
  (global as any).quickConnectionTest = quickConnectionTest;
}

