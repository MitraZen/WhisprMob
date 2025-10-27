import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';

export interface ConnectionState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isRealtimeConnected: boolean;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  retryCount: number;
  isRetrying: boolean;
}

export interface ConnectionRecoveryConfig {
  maxRetries: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  exponentialBackoffMultiplier: number;
  healthCheckInterval: number;
  connectionTimeout: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export type ConnectionStateChangeCallback = (state: ConnectionState) => void;
export type ReconnectionCallback = () => Promise<boolean>;

class ConnectionRecoveryService {
  private connectionState: ConnectionState = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
    isRealtimeConnected: false,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    connectionQuality: 'offline',
    retryCount: 0,
    isRetrying: false,
  };

  private config: ConnectionRecoveryConfig = {
    maxRetries: 8, // Increased for better resilience
    baseRetryDelay: 500, // Faster initial retry
    maxRetryDelay: 30000,
    exponentialBackoffMultiplier: 1.5, // Smoother backoff
    healthCheckInterval: 5000, // More frequent health checks
    connectionTimeout: 3000, // Faster timeout
    circuitBreakerThreshold: 5, // More tolerant
    circuitBreakerTimeout: 30000, // Shorter circuit breaker timeout
  };

  private stateChangeCallbacks: ConnectionStateChangeCallback[] = [];
  private reconnectionCallbacks: ReconnectionCallback[] = [];
  private netInfoUnsubscribe: (() => void) | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private circuitBreakerOpen = false;
  private circuitBreakerOpenedAt: number | null = null;
  private consecutiveFailures = 0;
  private isInitialized = false;

  /**
   * Initialize the connection recovery service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 Connection recovery service already initialized');
      return;
    }

    console.log('🚀 Initializing connection recovery service');
    
    // Start monitoring network connectivity
    this.startNetworkMonitoring();
    
    // Start health checks
    this.startHealthChecks();
    
    this.isInitialized = true;
    console.log('✅ Connection recovery service initialized');
  }

  /**
   * Start monitoring network connectivity
   */
  private startNetworkMonitoring(): void {
    console.log('📡 Starting network connectivity monitoring');
    
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkStateChange(state);
    });

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      this.handleNetworkStateChange(state);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    const wasConnected = this.connectionState.isConnected;
    const isNowConnected = state.isConnected ?? false;
    
    console.log('📡 Network state changed:', {
      isConnected: isNowConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
      wasConnected,
    });

    // Update connection state
    this.connectionState = {
      ...this.connectionState,
      isConnected: isNowConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      connectionQuality: this.calculateConnectionQuality(state),
    };

    // Handle connection/disconnection events
    if (!wasConnected && isNowConnected) {
      this.handleConnectionRestored();
    } else if (wasConnected && !isNowConnected) {
      this.handleConnectionLost();
    }

    // Notify callbacks
    this.notifyStateChange();
  }

  /**
   * Calculate connection quality based on network state
   */
  private calculateConnectionQuality(state: NetInfoState): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!state.isConnected) {
      return 'offline';
    }

    if (!state.isInternetReachable) {
      return 'poor';
    }

    switch (state.type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        return 'good';
      case 'ethernet':
        return 'excellent';
      default:
        return 'poor';
    }
  }

  /**
   * Handle connection restoration
   */
  private handleConnectionRestored(): void {
    console.log('🟢 Connection restored - attempting reconnection');
    
    this.connectionState.lastConnectedAt = Date.now();
    this.connectionState.retryCount = 0;
    this.connectionState.isRetrying = false;
    this.consecutiveFailures = 0;
    
    // Reset circuit breaker if it was open
    if (this.circuitBreakerOpen) {
      console.log('🔄 Resetting circuit breaker after connection restoration');
      this.circuitBreakerOpen = false;
      this.circuitBreakerOpenedAt = null;
    }

    // Attempt reconnection
    this.attemptReconnection();
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLost(): void {
    console.log('🔴 Connection lost');
    
    this.connectionState.lastDisconnectedAt = Date.now();
    this.connectionState.isRealtimeConnected = false;
    this.connectionState.isRetrying = false;
    
    // Clear any pending retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Notify about connection loss
    this.notifyStateChange();
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.connectionState.isRetrying || this.circuitBreakerOpen) {
      console.log('⏸️ Reconnection already in progress or circuit breaker open');
      return;
    }

    if (this.connectionState.retryCount >= this.config.maxRetries) {
      console.log('🔒 Max retries reached - opening circuit breaker');
      this.openCircuitBreaker();
      return;
    }

    if (!this.connectionState.isConnected) {
      console.log('📡 No network connection - skipping reconnection attempt');
      return;
    }

    console.log(`🔄 Attempting reconnection (attempt ${this.connectionState.retryCount + 1}/${this.config.maxRetries})`);
    
    this.connectionState.isRetrying = true;
    this.connectionState.retryCount++;
    this.notifyStateChange();

    try {
      // Call all registered reconnection callbacks
      const results = await Promise.allSettled(
        this.reconnectionCallbacks.map(callback => callback())
      );

      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;

      if (successCount > 0) {
        console.log(`✅ Reconnection successful (${successCount}/${this.reconnectionCallbacks.length} services)`);
        this.handleReconnectionSuccess();
      } else {
        console.log('❌ All reconnection attempts failed');
        this.handleReconnectionFailure();
      }
    } catch (error) {
      console.error('❌ Reconnection attempt failed:', error);
      this.handleReconnectionFailure();
    }
  }

  /**
   * Handle successful reconnection
   */
  private handleReconnectionSuccess(): void {
    this.connectionState.isRealtimeConnected = true;
    this.connectionState.isRetrying = false;
    this.connectionState.retryCount = 0;
    this.consecutiveFailures = 0;
    
    console.log('✅ Reconnection successful');
    this.notifyStateChange();
  }

  /**
   * Handle reconnection failure
   */
  private handleReconnectionFailure(): void {
    this.connectionState.isRetrying = false;
    this.consecutiveFailures++;
    
    console.log(`❌ Reconnection failed (${this.consecutiveFailures} consecutive failures)`);
    
    // Schedule next retry with exponential backoff
    const delay = this.calculateRetryDelay();
    console.log(`⏰ Scheduling next retry in ${delay}ms`);
    
    this.retryTimeout = setTimeout(() => {
      this.attemptReconnection();
    }, delay);
    
    this.notifyStateChange();
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(): number {
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(this.config.exponentialBackoffMultiplier, this.connectionState.retryCount - 1),
      this.config.maxRetryDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  /**
   * Open circuit breaker to prevent excessive retries
   */
  private openCircuitBreaker(): void {
    console.log('🔒 Opening circuit breaker');
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenedAt = Date.now();
    this.connectionState.isRetrying = false;
    
    // Schedule circuit breaker reset
    setTimeout(() => {
      this.resetCircuitBreaker();
    }, this.config.circuitBreakerTimeout);
    
    this.notifyStateChange();
  }

  /**
   * Reset circuit breaker
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      console.log('🔄 Resetting circuit breaker');
      this.circuitBreakerOpen = false;
      this.circuitBreakerOpenedAt = null;
      this.connectionState.retryCount = 0;
      this.consecutiveFailures = 0;
      
      // Attempt reconnection if connected
      if (this.connectionState.isConnected) {
        this.attemptReconnection();
      }
      
      this.notifyStateChange();
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log('💚 Health checks started');
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.connectionState.isConnected || this.connectionState.isRetrying) {
      return;
    }

    try {
      // Simple health check - ping a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.connectionTimeout);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('💚 Health check passed');
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      console.error('💔 Health check failed:', error);
      this.handleHealthCheckFailure();
    }
  }

  /**
   * Handle health check failure
   */
  private handleHealthCheckFailure(): void {
    console.log('💔 Health check failed - connection may be degraded');
    
    // Update connection quality
    if (this.connectionState.connectionQuality === 'excellent') {
      this.connectionState.connectionQuality = 'good';
    } else if (this.connectionState.connectionQuality === 'good') {
      this.connectionState.connectionQuality = 'poor';
    }
    
    this.notifyStateChange();
  }

  /**
   * Register a callback for connection state changes
   */
  onConnectionStateChange(callback: ConnectionStateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register a callback for reconnection attempts
   */
  onReconnectionAttempt(callback: ReconnectionCallback): () => void {
    this.reconnectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.reconnectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.reconnectionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all state change callbacks
   */
  private notifyStateChange(): void {
    const state = { ...this.connectionState };
    
    // Notify callbacks
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('❌ Error in connection state callback:', error);
      }
    });

    // Emit React Native event
    DeviceEventEmitter.emit('connectionStateChanged', state);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connection is healthy
   */
  isConnectionHealthy(): boolean {
    return this.connectionState.isConnected && 
           this.connectionState.isInternetReachable === true &&
           !this.circuitBreakerOpen &&
           this.connectionState.connectionQuality !== 'offline';
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnection(): Promise<boolean> {
    if (!this.connectionState.isConnected) {
      console.log('📡 No network connection - cannot force reconnection');
      return false;
    }

    console.log('🔄 Forcing reconnection attempt');
    
    // Reset retry count and circuit breaker
    this.connectionState.retryCount = 0;
    this.circuitBreakerOpen = false;
    this.circuitBreakerOpenedAt = null;
    
    // Clear any pending retry
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Attempt reconnection
    await this.attemptReconnection();
    
    return this.connectionState.isRealtimeConnected;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConnectionRecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Connection recovery config updated:', newConfig);
  }

  /**
   * Cleanup and destroy the service
   */
  destroy(): void {
    console.log('🧹 Destroying connection recovery service');
    
    // Stop network monitoring
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Clear retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    // Clear callbacks
    this.stateChangeCallbacks = [];
    this.reconnectionCallbacks = [];
    
    this.isInitialized = false;
    console.log('✅ Connection recovery service destroyed');
  }
}

// Export singleton instance
export const connectionRecoveryService = new ConnectionRecoveryService();

// Export types
export type { ConnectionState, ConnectionRecoveryConfig, ConnectionStateChangeCallback, ReconnectionCallback };

