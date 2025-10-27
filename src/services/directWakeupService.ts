import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/config/supabase';

export interface WakeupResult {
  success: boolean;
  method: 'websocket' | 'fcm' | 'polling';
  timestamp: string;
  error?: string;
}

export class DirectWakeupService {
  private static readonly WAKEUP_TIMEOUT = 5000; // 5 seconds
  private static readonly POLLING_INTERVAL = 2000; // 2 seconds
  private static isWakeupInProgress = false;

  /**
   * Direct wake-up mechanism for online users (Phase 3: Proposed Design)
   * Attempts multiple wake-up methods in order of preference
   */
  static async wakeUpUser(userId: string): Promise<WakeupResult> {
    if (this.isWakeupInProgress) {
      console.log('🔄 Wake-up already in progress, skipping...');
      return {
        success: false,
        method: 'websocket',
        timestamp: new Date().toISOString(),
        error: 'Wake-up already in progress'
      };
    }

    this.isWakeupInProgress = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Phase 3: Attempting direct wake-up for user:', userId);

      // Method 1: WebSocket Direct Wake-up (Preferred)
      const websocketResult = await this.attemptWebSocketWakeup(userId);
      if (websocketResult.success) {
        console.log('✅ WebSocket wake-up successful');
        return websocketResult;
      }

      // Method 2: FCM Wake-up (Fallback)
      const fcmResult = await this.attemptFCMWakeup(userId);
      if (fcmResult.success) {
        console.log('✅ FCM wake-up successful');
        return fcmResult;
      }

      // Method 3: Polling Wake-up (Last Resort)
      const pollingResult = await this.attemptPollingWakeup(userId);
      if (pollingResult.success) {
        console.log('✅ Polling wake-up successful');
        return pollingResult;
      }

      console.log('❌ All wake-up methods failed');
      return {
        success: false,
        method: 'websocket',
        timestamp: new Date().toISOString(),
        error: 'All wake-up methods failed'
      };

    } finally {
      this.isWakeupInProgress = false;
      const duration = Date.now() - startTime;
      console.log(`🔄 Wake-up attempt completed in ${duration}ms`);
    }
  }

  /**
   * Method 1: WebSocket Direct Wake-up
   * Sends a direct message through Supabase Realtime to wake up the app
   */
  private static async attemptWebSocketWakeup(userId: string): Promise<WakeupResult> {
    try {
      console.log('🔄 Attempting WebSocket direct wake-up...');

      // Send a wake-up signal through Supabase Realtime
      const { error } = await supabase
        .channel(`wakeup-${userId}`)
        .send({
          type: 'wakeup',
          payload: {
            userId,
            timestamp: new Date().toISOString(),
            source: 'direct_wakeup'
          }
        });

      if (error) {
        console.log('⚠️ WebSocket wake-up failed:', error);
        return {
          success: false,
          method: 'websocket',
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }

      console.log('✅ WebSocket wake-up signal sent');
      return {
        success: true,
        method: 'websocket',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ WebSocket wake-up error:', error);
      return {
        success: false,
        method: 'websocket',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Method 2: FCM Wake-up
   * Sends a lightweight FCM notification to wake up the app
   */
  private static async attemptFCMWakeup(userId: string): Promise<WakeupResult> {
    try {
      console.log('🔄 Attempting FCM wake-up...');

      // Import FCM service dynamically to avoid circular dependencies
      const { fcmService } = await import('@/services/fcmService');
      
      const success = await fcmService.sendLightweightPing(userId);
      
      if (success) {
        console.log('✅ FCM wake-up sent');
        return {
          success: true,
          method: 'fcm',
          timestamp: new Date().toISOString()
        };
      } else {
        console.log('⚠️ FCM wake-up failed');
        return {
          success: false,
          method: 'fcm',
          timestamp: new Date().toISOString(),
          error: 'FCM wake-up failed'
        };
      }

    } catch (error) {
      console.error('❌ FCM wake-up error:', error);
      return {
        success: false,
        method: 'fcm',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Method 3: Polling Wake-up
   * Triggers a polling mechanism to check for new messages
   */
  private static async attemptPollingWakeup(userId: string): Promise<WakeupResult> {
    try {
      console.log('🔄 Attempting polling wake-up...');

      // Import notification manager dynamically
      const { notificationManager } = await import('@/services/notificationManager');
      
      // Trigger immediate polling
      await notificationManager.pollForNewMessages();
      
      console.log('✅ Polling wake-up triggered');
      return {
        success: true,
        method: 'polling',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Polling wake-up error:', error);
      return {
        success: false,
        method: 'polling',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if app is in foreground
   */
  static isAppInForeground(): boolean {
    return AppState.currentState === 'active';
  }

  /**
   * Get current app state
   */
  static getCurrentAppState(): AppStateStatus {
    return AppState.currentState;
  }

  /**
   * Listen for app state changes and trigger wake-up if needed
   */
  static setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        console.log('🔄 App became active - checking for pending wake-ups...');
        // App became active, check if there are any pending messages
        this.checkForPendingMessages();
      }
    });
  }

  /**
   * Check for pending messages when app becomes active
   */
  private static async checkForPendingMessages(): Promise<void> {
    try {
      // Import services dynamically
      const { notificationManager } = await import('@/services/notificationManager');
      const { realtimeService } = await import('@/services/realtimeService');
      
      // Check for new messages
      await notificationManager.pollForNewMessages();
      
      // Ensure realtime connection is active
      if (!realtimeService.isConnectedToRealtime()) {
        console.log('🔄 Reconnecting to realtime after app wake-up...');
        await realtimeService.forceReconnection();
      }
      
    } catch (error) {
      console.error('❌ Error checking for pending messages:', error);
    }
  }
}
