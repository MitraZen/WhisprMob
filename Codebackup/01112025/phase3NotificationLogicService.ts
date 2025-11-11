import { AppState, AppStateStatus } from 'react-native';
import { notificationService } from './notificationService';

interface BatchedMessage {
  messageId: string;
  content: string;
  timestamp: number;
  buddyId: string;
}

interface UserBatch {
  buddyName: string;
  buddyId: string;
  messages: BatchedMessage[];
  timerId: NodeJS.Timeout | null;
  lastNotificationTime: number; // Track when last notification was shown
}

class Phase3NotificationLogicService {
  private static instance: Phase3NotificationLogicService | null = null;
  
  // Set instance for initialization (used by module export)
  static setInstance(instance: Phase3NotificationLogicService): void {
    Phase3NotificationLogicService.instance = instance;
  }
  
  private batches: Map<string, UserBatch> = new Map();
  private batchDelay = 2000; // 2 seconds delay for batching in foreground
  private backgroundBatchDelay = 1000; // 1 second delay in background for grouping
  private isAppInBackground = false;
  private appStateSubscription: any = null;

  constructor() {
    console.log('🧠 Phase 3: Initializing notification logic service');
    // Track app state changes
    this.isAppInBackground = AppState.currentState !== 'active';
    console.log('🧠 Phase 3: Initial app state:', this.isAppInBackground ? 'background' : 'foreground');
    
    // Subscribe to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasInBackground = this.isAppInBackground;
    this.isAppInBackground = nextAppState !== 'active';

    console.log('🧠 Phase 3: App state changed:', {
      nextState: nextAppState,
      wasInBackground,
      nowInBackground: this.isAppInBackground,
    });

    // ✅ If app goes to background, flush all pending batches immediately
    if (!wasInBackground && this.isAppInBackground) {
      console.log('🧠 Phase 3: App went to background - flushing all pending batches NOW');
      this.flushAllBatches();
    }
  };

  /**
   * Backward compatibility wrapper for addToBatch (old API)
   */
  async addToBatch(
    title: string,
    content: string,
    buddyName: string,
    priority: 'high' | 'normal' | 'low' = 'normal',
    buddyId?: string
  ): Promise<void> {
    const messageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const actualBuddyId = buddyId || `placeholder_${buddyName}`;
    this.addNotificationToBatch(buddyName, actualBuddyId, messageId, content);
  }

  /**
   * Add notification to batch for a specific user
   * ✅ FIXED: Properly batches in both foreground AND background
   */
  addNotificationToBatch(
    buddyName: string,
    buddyId: string,
    messageId: string,
    content: string
  ): void {
    console.log('🧠 Phase 3: Adding notification to batch for user:', buddyName, {
      messageId: messageId.substring(0, 8),
      isBackground: this.isAppInBackground,
      appState: AppState.currentState,
    });

    // Get or create batch for this user
    let batch = this.batches.get(buddyName);

    if (!batch) {
      // Create new batch for this user
      batch = {
        buddyName,
        buddyId,
        messages: [],
        timerId: null,
        lastNotificationTime: 0,
      };
      this.batches.set(buddyName, batch);
      console.log('🧠 Phase 3: Created new batch for user:', buddyName);
    }

    // Add message to batch
    batch.messages.push({
      messageId,
      content,
      timestamp: Date.now(),
      buddyId,
    });

    console.log(`🧠 Phase 3: User ${buddyName} now has ${batch.messages.length} messages in batch`);

    // Clear existing timer if any
    if (batch.timerId) {
      clearTimeout(batch.timerId);
      batch.timerId = null;
      console.log('🧠 Phase 3: Cleared existing timer');
    }

    // ✅ CRITICAL: Different behavior for background vs foreground
    if (this.isAppInBackground) {
      console.log('🧠 Phase 3: App in BACKGROUND - using immediate batched notification');
      
      // In background: Show notification immediately (with all batched messages)
      // This updates the existing notification for this user with grouped messages
      this.showBatchNotification(buddyName);
      
    } else {
      console.log('🧠 Phase 3: App in FOREGROUND - using timer for batching');
      
      // In foreground: Use timer to batch messages
      batch.timerId = setTimeout(() => {
        console.log('🧠 Phase 3: Timer fired - processing batch for:', buddyName);
        this.showBatchNotification(buddyName);
      }, this.batchDelay);

      console.log('🧠 Phase 3: Timer set for batch notification (2s delay)');
    }
  }

  /**
   * Show batched notification for a user
   * ✅ FIXED: Works in both foreground and background
   * Uses same notification ID per user to update/group notifications
   */
  private async showBatchNotification(buddyName: string): Promise<void> {
    console.log('🧠 Phase 3: Processing batch notification for:', buddyName);
    
    const batch = this.batches.get(buddyName);

    if (!batch || batch.messages.length === 0) {
      console.warn('🧠 Phase 3: No messages in batch for user:', buddyName);
      return;
    }

    try {
      const messageCount = batch.messages.length;
      
      console.log('🔔 Phase 3: Showing notification:', {
        buddyName,
        messageCount,
        isBackground: this.isAppInBackground,
        messages: batch.messages.map(m => m.content.substring(0, 30) + '...'),
      });

      // ✅ CRITICAL: Combine messages for grouped display
      let displayMessage: string;
      
      if (messageCount === 1) {
        // Single message - show as-is
        displayMessage = batch.messages[0].content;
      } else {
        // Multiple messages - show last 3 messages (or all if less than 3)
        const messagesToShow = batch.messages.slice(-3);
        displayMessage = messagesToShow.map(m => m.content).join('\n');
        
        // If there are more than 3 messages, add indicator
        if (messageCount > 3) {
          displayMessage = `... and ${messageCount - 3} more\n\n${displayMessage}`;
        }
      }

      // ✅ Show notification with message count (this groups by buddyName)
      await notificationService.showMessageNotification(
        buddyName, // title (same for all messages from this user)
        displayMessage, // combined messages
        buddyName, // buddyName (used for notification ID generation)
        messageCount, // messageCount (shows badge like "zen3 (5)")
        batch.buddyId // buddyId
      );

      console.log('✅ Phase 3: Notification shown successfully');
      
      // Update last notification time
      batch.lastNotificationTime = Date.now();

      // ✅ CRITICAL: Always keep batch after showing notification
      // This allows messages to accumulate and count to build up
      // The batch is only cleared when user opens the chat (via clearBatchForUser)
      console.log('🧠 Phase 3: Keeping batch for future message accumulation (will clear when user opens chat)');
      
      // Note: Batch will be cleared by clearBatchForUser() when:
      // - User opens the chat screen
      // - User taps the notification
      
    } catch (error) {
      console.error('❌ Phase 3: Error showing notification:', error);
    }
  }

  /**
   * Flush all pending batches immediately
   * Called when app goes to background
   */
  private flushAllBatches(): void {
    console.log('🧠 Phase 3: Flushing all pending batches:', this.batches.size);

    if (this.batches.size === 0) {
      console.log('🧠 Phase 3: No batches to flush');
      return;
    }

    for (const [buddyName, batch] of this.batches.entries()) {
      console.log('🧠 Phase 3: Flushing batch for:', buddyName, `(${batch.messages.length} messages)`);
      
      // Clear timer
      if (batch.timerId) {
        clearTimeout(batch.timerId);
        batch.timerId = null;
      }

      // Show notification immediately
      if (batch.messages.length > 0) {
        this.showBatchNotification(buddyName);
      }
    }

    console.log('✅ Phase 3: All batches flushed');
  }

  /**
   * Clear batch for a specific user
   * Used when user opens the chat
   */
  clearBatchForUser(buddyName: string): void {
    const batch = this.batches.get(buddyName);

    if (batch) {
      console.log('🧠 Phase 3: Clearing batch for user:', buddyName, {
        hadMessages: batch.messages.length,
        hadTimer: batch.timerId !== null,
      });

      if (batch.timerId) {
        clearTimeout(batch.timerId);
      }

      this.batches.delete(buddyName);
    }
  }

  /**
   * Clear all batches
   * Used on logout or cleanup
   */
  clearAllBatches(): void {
    console.log('🧠 Phase 3: Clearing all batches');

    for (const [buddyName, batch] of this.batches.entries()) {
      if (batch.timerId) {
        clearTimeout(batch.timerId);
      }
    }

    this.batches.clear();
  }

  /**
   * Get current batch status for debugging
   */
  getBatchStatus(): { 
    [key: string]: { 
      messageCount: number; 
      hasTimer: boolean;
      isBackground: boolean;
      lastNotificationTime: number;
    } 
  } {
    const status: { 
      [key: string]: { 
        messageCount: number; 
        hasTimer: boolean;
        isBackground: boolean;
        lastNotificationTime: number;
      } 
    } = {};

    for (const [buddyName, batch] of this.batches.entries()) {
      status[buddyName] = {
        messageCount: batch.messages.length,
        hasTimer: batch.timerId !== null,
        isBackground: this.isAppInBackground,
        lastNotificationTime: batch.lastNotificationTime,
      };
    }

    return status;
  }

  /**
   * Cleanup when service is destroyed
   */
  cleanup(): void {
    console.log('🧠 Phase 3: Cleanup started');
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Clear all batches and timers
    this.clearAllBatches();
    
    console.log('✅ Phase 3: Cleanup completed');
  }

  // Static method for backward compatibility with getInstance() pattern
  static getInstance(): Phase3NotificationLogicService {
    if (!Phase3NotificationLogicService.instance) {
      Phase3NotificationLogicService.instance = new Phase3NotificationLogicService();
    }
    return Phase3NotificationLogicService.instance;
  }
}

// Export both the class (for getInstance() pattern) and the instance (for direct use)
export { Phase3NotificationLogicService };
const instance = new Phase3NotificationLogicService();
Phase3NotificationLogicService.setInstance(instance); // Set static instance for getInstance() calls
export const phase3NotificationLogicService = instance;