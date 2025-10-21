import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { realtimeService } from './realtimeService';
import { connectionRecoveryService, ConnectionState } from './connectionRecoveryService';

interface NotificationManager {
  startNotificationService: (userId: string) => Promise<void>;
  stopNotificationService: () => Promise<void>;
  isRealtimeActive: () => boolean;
  isPollingActive: () => boolean;
  getServiceStatus: () => {
    realtime: boolean;
    polling: boolean;
    fallbackMode: boolean;
    connectionHealth: 'healthy' | 'degraded' | 'failed';
  };
  optimizeForBackground: () => Promise<void>;
  optimizeForForeground: () => Promise<void>;
  getPerformanceMetrics: () => any;
}

class NotificationManagerClass implements NotificationManager {
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingActive = false;
  private realtimeActive = false;
  private userId: string | null = null;
  private fallbackMode = false;
  private lastMessageIds: { [buddyId: string]: string[] } = {};
  private lastNoteIds: string[] = [];
  private realtimeFailureHandler: ((event: any) => void) | null = null;
  private performanceMetrics = {
    realtimeSuccessRate: 0,
    fallbackActivations: 0,
    averageLatency: 0,
    lastHealthCheck: 0,
    totalNotifications: 0,
    realtimeNotifications: 0,
    pollingNotifications: 0,
  };
  private lastInitializationAttempt = 0;
  private initializationCooldown = 30000; // 30 seconds cooldown between attempts
  private isStopping = false; // Add flag to prevent infinite loops
  private initializationPromise: Promise<void> | null = null; // Prevent multiple simultaneous initializations
  private connectionStateUnsubscribe: (() => void) | null = null;
  private isConnectionRecoveryEnabled = true;

      async startNotificationService(userId: string): Promise<void> {
        // Prevent multiple simultaneous initializations
        if (this.initializationPromise) {
          console.log('🔄 Notification service initialization already in progress, waiting...');
          return this.initializationPromise;
        }

        // If already active for the same user, return early
        if (this.userId === userId && (this.realtimeActive || this.pollingActive)) {
          console.log('✅ Notification service already active for user:', userId);
          return;
        }

        this.userId = userId;
        
        // Initialize connection recovery service if enabled
        if (this.isConnectionRecoveryEnabled) {
          await connectionRecoveryService.initialize();
          this.setupConnectionRecovery();
        }
        
        // Check cooldown to prevent excessive initialization attempts
        const now = Date.now();
        if (now - this.lastInitializationAttempt < this.initializationCooldown) {
          console.log('⏰ Initialization cooldown active - using polling only');
          await this.startPollingFallback(userId);
          return;
        }
        
        this.lastInitializationAttempt = now;
        console.log('🚀 Starting hybrid notification service for user:', userId);
        
        // Create initialization promise to prevent duplicates
        this.initializationPromise = this.performInitialization(userId);
        
        try {
          await this.initializationPromise;
        } finally {
          this.initializationPromise = null;
        }
      }

      private async performInitialization(userId: string): Promise<void> {
        try {
          // Initialize FCM after user login
          console.log('🔥 Initializing FCM for user:', userId);
          await notificationService.initializeFCMAfterLogin();
          
          // Try realtime first (now with WebSocket polyfill)
          const realtimeSuccess = await realtimeService.initialize(userId);
          
          if (realtimeSuccess) {
            this.realtimeActive = true;
            this.fallbackMode = false;
            this.performanceMetrics.realtimeSuccessRate = 100;
            console.log('✅ Realtime service started successfully');
            
            // Setup fallback listener
            this.setupRealtimeFailureListener();
            
            // Start background optimization
            this.startBackgroundOptimization();
          } else {
            throw new Error('Realtime initialization failed');
          }
        } catch (error) {
          console.warn('⚠️ Realtime failed, starting polling fallback:', error);
          await this.startPollingFallback(userId);
        }
      }

  private async startPollingFallback(userId: string): Promise<void> {
    this.fallbackMode = true;
    this.realtimeActive = false;
    this.performanceMetrics.fallbackActivations++;
    this.startPollingInternal(userId);
    console.log('🔄 Polling fallback activated');
  }

  private setupRealtimeFailureListener(): void {
    // Listen for realtime failures
    const handleRealtimeFailure = (event: any) => {
      const { userId } = event.detail;
      if (userId === this.userId && !this.fallbackMode) {
        console.log('🔄 Realtime failed, switching to polling');
        this.startPollingFallback(userId);
      }
    };

    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('realtime-failed', handleRealtimeFailure);
      this.realtimeFailureHandler = handleRealtimeFailure;
    } else {
      // In React Native, we'll use a different approach
      console.log('🔄 Realtime failure listener set up for React Native');
    }
  }

  private startPollingInternal(userId: string): void {
    if (this.pollingActive) {
      this.stopPollingInternal();
    }

    this.userId = userId;
    this.pollingActive = true;
    
    // Clear previous notification history
    this.lastMessageIds = {};
    this.lastNoteIds = [];
    
    // Use shorter interval in fallback mode
    const interval = this.fallbackMode ? 15000 : 30000;
    
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
      await this.checkForNewNotes();
    }, interval);

    console.log(`🔄 Notification polling started (${this.fallbackMode ? 'fallback' : 'primary'} mode, ${interval}ms interval)`);
  }

  private startPollingPublic(userId: string): void {
    console.log('🔄 Public startPolling called - delegating to internal method');
    this.startPollingInternal(userId);
  }

  private stopPollingInternal(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.pollingActive = false;
    console.log('🛑 Notification polling stopped (internal)');
  }

  private stopPollingPublic(): void {
    console.log('🛑 Public stopPolling called - delegating to internal method');
    this.stopPollingInternal();
  }

  /**
   * Setup connection recovery integration
   */
  private setupConnectionRecovery(): void {
    if (!this.isConnectionRecoveryEnabled) {
      return;
    }

    console.log('🔄 Setting up connection recovery integration for notification manager');

    // Register for connection state changes
    this.connectionStateUnsubscribe = connectionRecoveryService.onConnectionStateChange((state: ConnectionState) => {
      this.handleConnectionStateChange(state);
    });

    // Register reconnection callback
    connectionRecoveryService.onReconnectionAttempt(async () => {
      return await this.attemptReconnection();
    });
  }

  /**
   * Handle connection state changes from recovery service
   */
  private handleConnectionStateChange(state: ConnectionState): void {
    console.log('📡 Notification manager - connection state changed:', {
      isConnected: state.isConnected,
      isRealtimeConnected: state.isRealtimeConnected,
      connectionQuality: state.connectionQuality,
      retryCount: state.retryCount,
    });

    // Update our internal state based on connection quality
    if (state.connectionQuality === 'offline') {
      console.log('🔴 Network offline - switching to polling');
      if (this.realtimeActive && this.userId) {
        this.startPollingFallback(this.userId);
      }
    } else if (state.connectionQuality === 'poor' && this.fallbackMode) {
      console.log('⚠️ Poor connection - staying with polling');
      // Stay with polling for poor connections
    } else if (state.connectionQuality === 'good' || state.connectionQuality === 'excellent') {
      console.log('🟢 Good connection - attempting realtime upgrade');
      if (this.fallbackMode && this.userId) {
        this.optimizeForForeground();
      }
    }
  }

  /**
   * Attempt reconnection (called by connection recovery service)
   */
  private async attemptReconnection(): Promise<boolean> {
    if (!this.userId) {
      console.log('❌ Cannot reconnect - no userId');
      return false;
    }

    try {
      console.log('🔄 Notification manager - attempting reconnection');
      
      // Try to initialize realtime service
      const realtimeSuccess = await realtimeService.initialize(this.userId);
      
      if (realtimeSuccess) {
        this.realtimeActive = true;
        this.fallbackMode = false;
        this.stopPollingInternal();
        console.log('✅ Notification manager reconnection successful');
        return true;
      } else {
        console.log('❌ Notification manager reconnection failed - staying with polling');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Notification manager reconnection error:', error);
      return false;
    }
  }

  async stopNotificationService(): Promise<void> {
    console.log('🛑 Stopping hybrid notification service...');
    
    // Stop realtime
    if (this.realtimeActive) {
      await realtimeService.disconnect();
      this.realtimeActive = false;
    }
    
    // Stop polling
    this.stopPollingInternal();
    
    // Clean up event listeners
    if (this.realtimeFailureHandler && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('realtime-failed', this.realtimeFailureHandler);
    }
    
    // Clean up connection recovery integration
    if (this.connectionStateUnsubscribe) {
      this.connectionStateUnsubscribe();
      this.connectionStateUnsubscribe = null;
    }
    
    this.userId = null;
    this.fallbackMode = false;
    
    console.log('✅ Hybrid notification service stopped');
  }

  isRealtimeActive(): boolean {
    return this.realtimeActive;
  }

  isPollingActive(): boolean {
    return this.pollingActive;
  }

  getServiceStatus() {
    const connectionHealth = this.getConnectionHealth();
    
    return {
      realtime: this.realtimeActive,
      polling: this.pollingActive,
      fallbackMode: this.fallbackMode,
      connectionHealth,
    };
  }

  private getConnectionHealth(): 'healthy' | 'degraded' | 'failed' {
    if (this.realtimeActive && !this.fallbackMode) {
      return 'healthy';
    } else if (this.fallbackMode && this.pollingActive) {
      return 'degraded';
    } else {
      return 'failed';
    }
  }

  async optimizeForBackground(): Promise<void> {
    console.log('🌙 Optimizing for background mode...');
    
    if (this.realtimeActive) {
      // Keep realtime but reduce activity
      console.log('📡 Maintaining realtime connection in background');
    } else if (this.pollingActive) {
      // Increase polling interval in background
      this.stopPollingInternal();
      this.startPollingInternal(this.userId!);
      console.log('⏰ Reduced polling frequency for background');
    }
  }

  async optimizeForForeground(): Promise<void> {
    console.log('☀️ Optimizing for foreground mode...');
    
    if (this.fallbackMode && this.pollingActive) {
      // Check cooldown before attempting realtime reconnection
      const now = Date.now();
      if (now - this.lastInitializationAttempt < this.initializationCooldown) {
        console.log('⏰ Realtime reconnection cooldown active - staying with polling');
        return;
      }
      
      // Try to reconnect to realtime
      try {
        this.lastInitializationAttempt = now;
        const realtimeSuccess = await realtimeService.initialize(this.userId!);
        if (realtimeSuccess) {
          this.realtimeActive = true;
          this.fallbackMode = false;
          this.stopPollingInternal();
          console.log('✅ Reconnected to realtime in foreground');
        }
      } catch (error) {
        console.log('⚠️ Failed to reconnect to realtime, staying with polling');
      }
    }
  }

  private startBackgroundOptimization(): void {
    // Monitor app state changes
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          this.optimizeForBackground();
        } else {
          this.optimizeForForeground();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  // Keep existing polling methods as fallback
  private async checkForNewMessages(): Promise<void> {
    if (!this.userId) return;

    try {
      const buddies = await BuddiesService.getBuddies(this.userId);
      const limitedBuddies = buddies.slice(0, 20);
      
      for (const buddy of limitedBuddies) {
        try {
          const messages = await BuddiesService.getMessages(buddy.id, this.userId);
          const newMessages = messages.filter(msg => 
            msg.senderId !== this.userId && 
            !this.lastMessageIds[buddy.id]?.includes(msg.id)
          );
          
          if (newMessages.length > 0) {
            console.log(`📨 Polling: Found ${newMessages.length} new messages for ${buddy.name}`);
            for (const message of newMessages) {
              await notificationService.showMessageNotification(
                'New Message',
                message.content,
                buddy.name
              );
              this.performanceMetrics.pollingNotifications++;
              this.performanceMetrics.totalNotifications++;
            }
            
            // Update last message IDs
            this.lastMessageIds[buddy.id] = messages
              .filter(msg => msg.senderId !== this.userId)
              .slice(-50)
              .map(msg => msg.id);
          }
        } catch (error) {
          console.error(`Error checking messages for buddy ${buddy.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  private async checkForNewNotes(): Promise<void> {
    if (!this.userId) return;

    try {
      const notes = await BuddiesService.getWhisprNotes(this.userId);
      const newNotes = notes.filter(note => 
        note.senderId !== this.userId && 
        !this.lastNoteIds.includes(note.id)
      );
      
      if (newNotes.length > 0) {
        console.log(`📝 Polling: Found ${newNotes.length} new notes`);
        
        // Dispatch event to notify UI components
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          const event = new CustomEvent('notes-updated', {
            detail: { 
              type: 'notes-updated',
              newNotesCount: newNotes.length,
              userId: this.userId 
            }
          });
          window.dispatchEvent(event);
        }
        
        for (const note of newNotes.slice(0, 10)) {
          await notificationService.showNoteNotification(
            'New Whispr Note',
            note.content
          );
          this.performanceMetrics.pollingNotifications++;
          this.performanceMetrics.totalNotifications++;
        }
        
        // Update last note IDs
        this.lastNoteIds = notes
          .filter(note => note.senderId !== this.userId)
          .slice(-50)
          .map(note => note.id);
      }
    } catch (error) {
      console.error('Error checking for new notes:', error);
    }
  }

  // Performance monitoring methods
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  updatePerformanceMetrics(metric: string, value: number) {
    this.performanceMetrics[metric as keyof typeof this.performanceMetrics] = value;
  }

  // Track notification from realtime
  trackRealtimeNotification() {
    this.performanceMetrics.realtimeNotifications++;
    this.performanceMetrics.totalNotifications++;
  }

  /**
   * Enable or disable connection recovery
   */
  setConnectionRecoveryEnabled(enabled: boolean): void {
    this.isConnectionRecoveryEnabled = enabled;
    console.log(`🔄 Connection recovery ${enabled ? 'enabled' : 'disabled'} for notification manager`);
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnection(): Promise<boolean> {
    if (!this.isConnectionRecoveryEnabled) {
      console.log('❌ Connection recovery is disabled');
      return false;
    }

    return await connectionRecoveryService.forceReconnection();
  }

  /**
   * Get connection recovery status
   */
  getConnectionRecoveryStatus(): any {
    if (!this.isConnectionRecoveryEnabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      connectionState: connectionRecoveryService.getConnectionState(),
      isHealthy: connectionRecoveryService.isConnectionHealthy(),
      serviceStatus: this.getServiceStatus(),
    };
  }

  // Legacy methods for backward compatibility
  startPolling(userId: string) {
    console.log('🔄 Legacy startPolling called - starting polling directly');
    this.startPollingInternal(userId);
  }

  stopPolling() {
    console.log('🛑 Legacy stopPolling called - stopping polling directly');
    this.stopPollingInternal();
  }

  isPolling(): boolean {
    return this.pollingActive;
  }

  async triggerNotificationCheck() {
    if (!this.userId) {
      console.warn('Cannot trigger notification check: userId is null.');
      return;
    }
    console.log('Manually triggering notification check...');
    await this.checkForNewMessages();
    await this.checkForNewNotes();
  }
}

export const notificationManager = new NotificationManagerClass();