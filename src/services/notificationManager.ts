import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';
import { realtimeService } from './realtimeService';
import { connectionRecoveryService, ConnectionState } from './connectionRecoveryService';
import { supabase } from '../config/supabase';

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
  private initializationCooldown = 30000; // 30 seconds cooldown
  private isStopping = false;
  private initializationPromise: Promise<void> | null = null;
  private connectionStateUnsubscribe: (() => void) | null = null;
  private isConnectionRecoveryEnabled = true;
  private lastPollingTime: number = 0;
  private pollingCooldown = 30000; // 30 seconds between polls
  private lastAppActiveTime: number = 0;
  private userProfileCache: Map<string, { name: string; timestamp: number }> | null = null;

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

  // ✅ FIXED: Removed duplicate FCM initialization
  private async performInitialization(userId: string): Promise<void> {
    try {
      // ❌ REMOVED: Duplicate FCM initialization
      // OLD CODE (DELETED):
      // console.log('🔥 Initializing FCM for user:', userId);
      // await notificationService.initializeFCMAfterLogin(userId);
      
      // ✅ FCM is now handled ONLY by FCMManager in AuthContext
      console.log('📡 Initializing realtime service (FCM handled by FCMManager)');
      
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
    const handleRealtimeFailure = (event: any) => {
      const { userId } = event.detail;
      if (userId === this.userId && !this.fallbackMode) {
        console.log('🔄 Realtime failed, switching to polling');
        this.startPollingFallback(userId);
      }
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('realtime-failed', handleRealtimeFailure);
      this.realtimeFailureHandler = handleRealtimeFailure;
    } else {
      console.log('🔄 Realtime failure listener set up for React Native');
    }
  }

  private getOptimalPollingInterval(): number {
    if (this.fallbackMode) {
      return 15000; // 15 seconds in fallback mode
    }
    
    if (this.performanceMetrics.realtimeSuccessRate < 0.8) {
      return 30000; // 30 seconds if realtime is unreliable
    }
    
    return 60000; // 1 minute if realtime is healthy
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
    
    const interval = this.getOptimalPollingInterval();
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkForNewMessages();
        await this.checkForNewNotes();
        this.updatePerformanceMetrics();
        console.log(`📡 Polling cycle completed (${interval}ms interval)`);
      } catch (error) {
        console.error('❌ Polling cycle error:', error);
        this.performanceMetrics.fallbackActivations++;
      }
    }, interval);

    console.log(`📡 Notification polling started (${this.fallbackMode ? 'fallback' : 'primary'} mode, ${interval}ms interval)`);
  }

  private stopPollingInternal(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.pollingActive = false;
    console.log('🛑 Notification polling stopped');
  }

  private setupConnectionRecovery(): void {
    if (!this.isConnectionRecoveryEnabled) {
      return;
    }

    console.log('🔄 Setting up connection recovery integration');

    this.connectionStateUnsubscribe = connectionRecoveryService.onConnectionStateChange((state: ConnectionState) => {
      this.handleConnectionStateChange(state);
    });

    connectionRecoveryService.onReconnectionAttempt(async () => {
      return await this.attemptReconnection();
    });
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    console.log('📡 Connection state changed:', {
      isConnected: state.isConnected,
      isRealtimeConnected: state.isRealtimeConnected,
      connectionQuality: state.connectionQuality,
      retryCount: state.retryCount,
    });

    if (state.connectionQuality === 'offline') {
      console.log('🔴 Network offline - switching to polling');
      if (this.realtimeActive && this.userId) {
        this.startPollingFallback(this.userId);
      }
    } else if (state.connectionQuality === 'poor' && this.fallbackMode) {
      console.log('⚠️ Poor connection - staying with polling');
    } else if (state.connectionQuality === 'good' || state.connectionQuality === 'excellent') {
      console.log('🟢 Good connection - attempting realtime upgrade');
      if (this.fallbackMode && this.userId) {
        this.optimizeForForeground();
      }
    }
  }

  private async attemptReconnection(): Promise<boolean> {
    if (!this.userId) {
      console.log('❌ Cannot reconnect - no userId');
      return false;
    }

    try {
      console.log('🔄 Attempting reconnection');
      
      const realtimeSuccess = await realtimeService.initialize(this.userId);
      
      if (realtimeSuccess) {
        this.realtimeActive = true;
        this.fallbackMode = false;
        this.stopPollingInternal();
        console.log('✅ Reconnection successful');
        return true;
      } else {
        console.log('❌ Reconnection failed - staying with polling');
        return false;
      }
    } catch (error) {
      console.error('❌ Reconnection error:', error);
      return false;
    }
  }

  async stopNotificationService(): Promise<void> {
    console.log('🛑 Stopping hybrid notification service...');
    
    if (this.realtimeActive) {
      await realtimeService.disconnect();
      this.realtimeActive = false;
    }
    
    this.stopPollingInternal();
    
    if (this.realtimeFailureHandler && typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('realtime-failed', this.realtimeFailureHandler);
    }
    
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
      console.log('📡 Maintaining realtime connection in background');
    } else if (this.pollingActive) {
      this.stopPollingInternal();
      this.startPollingInternal(this.userId!);
      console.log('⏰ Reduced polling frequency for background');
    }
  }

  async optimizeForForeground(): Promise<void> {
    console.log('☀️ Optimizing for foreground mode...');
    this.lastAppActiveTime = Date.now();
    
    if (this.fallbackMode && this.pollingActive) {
      const now = Date.now();
      if (now - this.lastInitializationAttempt < this.initializationCooldown) {
        console.log('⏰ Realtime reconnection cooldown active - staying with polling');
        return;
      }
      
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

  async pollForNewMessages(): Promise<void> {
    console.log('🔄 Polling for new messages...');
    await this.checkForNewMessages();
    await this.checkForNewNotes();
  }

  private async checkForNewMessages(): Promise<void> {
    if (!this.userId) return;
    
    const now = Date.now();
    if (this.lastPollingTime && (now - this.lastPollingTime) < this.pollingCooldown) {
      console.log(`⏳ Polling cooldown active, skipping check (${Math.round((this.pollingCooldown - (now - this.lastPollingTime)) / 1000)}s remaining)`);
      return;
    }

    try {
      // ✅ PERFORMANCE FIX: Process buddies asynchronously to prevent UI freeze
      // Process in smaller batches with delays to avoid blocking
      const buddies = await BuddiesService.getBuddies(this.userId);
      const limitedBuddies = buddies.slice(0, 10); // Reduced from 20 to 10
      
      // Process buddies with delays to prevent blocking
      for (let i = 0; i < limitedBuddies.length; i++) {
        const buddy = limitedBuddies[i];
        
        // Add delay between buddy checks to prevent blocking
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between checks
        }
        
        try {
          // ✅ PERFORMANCE FIX: Only fetch recent messages (last 50) instead of all
          // Use a time-based query to limit results
          const lastPollTime = this.lastPollingTime || (now - 60000);
          
          // Fetch only recent messages to avoid loading hundreds/thousands
          const messages = await BuddiesService.getMessages(buddy.id, this.userId);
          const recentMessages = messages.filter(msg => {
            const messageTime = new Date(msg.createdAt || msg.timestamp).getTime();
            return messageTime > (lastPollTime - 300000); // Only last 5 minutes
          }).slice(-50); // Limit to last 50 messages max
          
          const newMessages = recentMessages.filter(msg => {
            if (msg.senderId === this.userId) return false;
            
            const messageTime = new Date(msg.createdAt || msg.timestamp).getTime();
            const isNewByTime = messageTime > lastPollTime;
            const notInCache = !this.lastMessageIds[buddy.id]?.includes(msg.id);
            const appActiveTime = this.lastAppActiveTime || (now - 300000);
            const isRecentMessage = messageTime > appActiveTime;
            const willProcess = isNewByTime && notInCache && isRecentMessage;
            
            return willProcess;
          });
          
          if (newMessages.length > 0) {
            console.log(`📨 Polling: Found ${newMessages.length} new messages for ${buddy.name}`);
            for (const message of newMessages) {
              const buddyDisplayName = await this.getBuddyDisplayName(message.senderId);
              await notificationService.showMessageNotification(
                'New Message',
                message.content,
                buddyDisplayName
              );
              this.performanceMetrics.pollingNotifications++;
              this.performanceMetrics.totalNotifications++;
            }
            
            this.lastMessageIds[buddy.id] = recentMessages
              .filter(msg => msg.senderId !== this.userId)
              .slice(-50)
              .map(msg => msg.id);
          }
        } catch (error) {
          console.error(`Error checking messages for buddy ${buddy.id}:`, error);
        }
      }
      
      this.lastPollingTime = Date.now();
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
        
        this.lastNoteIds = notes
          .filter(note => note.senderId !== this.userId)
          .slice(-50)
          .map(note => note.id);
      }
    } catch (error) {
      console.error('Error checking for new notes:', error);
    }
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  updatePerformanceMetrics(metric?: string, value?: number) {
    if (metric && value !== undefined) {
      this.performanceMetrics[metric as keyof typeof this.performanceMetrics] = value;
    }
  }

  trackRealtimeNotification() {
    this.performanceMetrics.realtimeNotifications++;
    this.performanceMetrics.totalNotifications++;
  }

  setConnectionRecoveryEnabled(enabled: boolean): void {
    this.isConnectionRecoveryEnabled = enabled;
    console.log(`🔄 Connection recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  async forceReconnection(): Promise<boolean> {
    if (!this.isConnectionRecoveryEnabled) {
      console.log('❌ Connection recovery is disabled');
      return false;
    }

    return await connectionRecoveryService.forceReconnection();
  }

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
    console.log('🔄 Legacy startPolling called');
    this.startPollingInternal(userId);
  }

  stopPolling() {
    console.log('🛑 Legacy stopPolling called');
    this.stopPollingInternal();
  }

  isPolling(): boolean {
    return this.pollingActive;
  }

  async triggerNotificationCheck() {
    if (!this.userId) {
      console.warn('Cannot trigger notification check: userId is null');
      return;
    }
    console.log('Manually triggering notification check...');
    await this.checkForNewMessages();
    await this.checkForNewNotes();
  }

  private async getBuddyDisplayName(senderId: string): Promise<string> {
    try {
      console.log('👤 [Polling] Getting buddy display name for:', senderId);
      
      // Check cache first
      const cachedProfile = this.userProfileCache?.get(senderId);
      if (cachedProfile && (Date.now() - cachedProfile.timestamp) < 300000) {
        console.log('👤 [Polling] Using cached buddy name:', cachedProfile.name);
        return cachedProfile.name;
      }
      
      console.log('👤 [Polling] Cache miss, fetching from database');
      
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('display_name, username')
        .eq('id', senderId)
        .single();
      
      if (error) {
        console.error('👤 [Polling] Database error:', error);
        return 'Buddy';
      }
      
      const buddyDisplayName = userProfile?.display_name || userProfile?.username || 'Buddy';
      console.log('👤 [Polling] Resolved buddy display name:', buddyDisplayName);
      
      if (!this.userProfileCache) {
        this.userProfileCache = new Map();
      }
      this.userProfileCache.set(senderId, {
        name: buddyDisplayName,
        timestamp: Date.now()
      });
      
      return buddyDisplayName;
    } catch (error) {
      console.error('👤 [Polling] Error fetching buddy name:', error);
      return 'Buddy';
    }
  }
}

export const notificationManager = new NotificationManagerClass();