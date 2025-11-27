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
  lastNotificationTime: number;
  lastShownMessageCount: number; // Track how many messages were shown in last notification
}

class Phase3NotificationLogicService {
  private static instance: Phase3NotificationLogicService | null = null;
  
  static setInstance(instance: Phase3NotificationLogicService): void {
    Phase3NotificationLogicService.instance = instance;
  }
  
  private batches: Map<string, UserBatch> = new Map();
  private batchDelay = 2000; // 2 seconds delay for batching in foreground
  private isAppInBackground = false;
  private appStateSubscription: any = null;
  
  // ✅ Track FCM notifications shown by buddy to prevent duplicate batch notifications
  // Map: buddyId (or buddyName as fallback) -> timestamp when FCM notification was shown
  private fcmNotificationsShown = new Map<string, number>();
  private fcmNotificationCleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🧠 Phase 3: Initializing notification logic service');
    this.isAppInBackground = AppState.currentState !== 'active';
    console.log('🧠 Phase 3: Initial app state:', this.isAppInBackground ? 'background' : 'foreground');
    
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // ✅ Start auto-cleanup for old FCM notification tracking entries
    this.startFcmNotificationCleanup();
  }
  
  /**
   * ✅ Mark that an FCM notification was shown for a buddy
   * This is called from the background handler when FCM message is received
   * Public method so it can be called from index.js background handler
   */
  markFcmNotificationShown(buddyId?: string, buddyName?: string): void {
    // Use buddyId if available, otherwise fallback to buddyName
    const key = buddyId || buddyName || 'unknown';
    const timestamp = Date.now();
    
    this.fcmNotificationsShown.set(key, timestamp);
    console.log('🔔 Phase 3: Marked FCM notification shown for:', {
      key,
      timestamp: new Date(timestamp).toISOString(),
      buddyId,
      buddyName,
    });
  }
  
  /**
   * ✅ Check if FCM notification was shown recently for this buddy
   * Returns true if FCM was shown within the last 5 seconds
   */
  private wasFcmNotificationShownRecently(buddyId?: string, buddyName?: string): boolean {
    const key = buddyId || buddyName || 'unknown';
    const fcmShownTime = this.fcmNotificationsShown.get(key);
    
    if (!fcmShownTime) {
      return false; // No FCM notification tracked for this buddy
    }
    
    const timeSinceFcm = Date.now() - fcmShownTime;
    const RECENT_THRESHOLD_MS = 5000; // 5 seconds
    
    const wasRecent = timeSinceFcm < RECENT_THRESHOLD_MS;
    
    if (wasRecent) {
      console.log('🔔 Phase 3: FCM notification was shown recently for:', {
        key,
        timeSinceFcm: `${Math.round(timeSinceFcm / 1000)}s ago`,
        threshold: `${RECENT_THRESHOLD_MS / 1000}s`,
      });
    }
    
    return wasRecent;
  }
  
  /**
   * ✅ Auto-cleanup old FCM notification tracking entries
   * Removes entries older than 10 seconds to prevent memory leaks
   */
  private startFcmNotificationCleanup(): void {
    // Cleanup every 10 seconds
    this.fcmNotificationCleanupInterval = setInterval(() => {
      const now = Date.now();
      const MAX_AGE_MS = 10000; // 10 seconds
      let cleanedCount = 0;
      
      for (const [key, timestamp] of this.fcmNotificationsShown.entries()) {
        if (now - timestamp > MAX_AGE_MS) {
          this.fcmNotificationsShown.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Phase 3: Cleaned up ${cleanedCount} old FCM notification tracking entries`);
      }
    }, 10000); // Run cleanup every 10 seconds
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasInBackground = this.isAppInBackground;
    this.isAppInBackground = nextAppState !== 'active';

    console.log('🧠 Phase 3: App state changed:', {
      nextState: nextAppState,
      wasInBackground,
      nowInBackground: this.isAppInBackground,
    });

    if (!wasInBackground && this.isAppInBackground) {
      console.log('🧠 Phase 3: App went to background - flushing all pending batches NOW');
      this.flushAllBatchesSync();
    }
  };

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
   * ✅ CRITICAL FIX: Synchronous notification in background
   * NO async/await, NO timers - direct synchronous call to notification service
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

    // Get or create batch
    let batch = this.batches.get(buddyName);

    if (!batch) {
      batch = {
        buddyName,
        buddyId,
        messages: [],
        timerId: null,
        lastNotificationTime: 0,
        lastShownMessageCount: 0,
      };
      this.batches.set(buddyName, batch);
      console.log('🧠 Phase 3: Created NEW batch for user:', buddyName);
    } else {
      console.log('🧠 Phase 3: Using EXISTING batch for user:', buddyName, {
        existingMessageCount: batch.messages.length,
        hasActiveTimer: batch.timerId !== null,
        lastNotificationTime: batch.lastNotificationTime ? new Date(batch.lastNotificationTime).toISOString() : 'never'
      });
    }

    // Add message to batch
    batch.messages.push({
      messageId,
      content,
      timestamp: Date.now(),
      buddyId,
    });

    console.log(`🧠 Phase 3: User ${buddyName} now has ${batch.messages.length} messages in batch`);

    // Clear existing timer (this allows messages to accumulate)
    if (batch.timerId) {
      console.log('🧠 Phase 3: Clearing existing timer to allow more messages to accumulate');
      clearTimeout(batch.timerId);
      batch.timerId = null;
    }

    // ✅ CRITICAL: In background, call notification service SYNCHRONOUSLY
    if (this.isAppInBackground) {
      console.log('🧠 Phase 3: 🚨 APP IN BACKGROUND - showing notification SYNCHRONOUSLY');
      console.log('🧠 Phase 3: Current batch size BEFORE notification:', batch.messages.length);
      
      // ✅ CRITICAL FIX: Small delay to ensure FCM notification is shown first, then our batch notification replaces it
      // The FCM notification is shown by OS automatically, and our batch notification with same tag/ID should replace it
      // Using a small delay ensures the FCM notification is processed first
      setTimeout(() => {
        // ✅ Call synchronously without await to prevent blocking
        // NOTE: Batch already has the new message added (line 99-104), so messageCount will be correct
        this.showBatchNotificationSync(buddyName);
      }, 200); // 200ms delay to let FCM notification appear first, then replace it
      
    } else {
      console.log('🧠 Phase 3: App in FOREGROUND - using timer to batch messages');
      console.log('🧠 Phase 3: Current batch size:', batch.messages.length);
      console.log('🧠 Phase 3: Setting timer for', this.batchDelay, 'ms - messages will accumulate until timer fires');
      
      batch.timerId = setTimeout(() => {
        console.log('🧠 Phase 3: Timer fired for:', buddyName);
        const batchAtTimerFire = this.batches.get(buddyName);
        if (batchAtTimerFire) {
          console.log('🧠 Phase 3: Batch size at timer fire:', batchAtTimerFire.messages.length);
        }
        this.showBatchNotificationSync(buddyName);
      }, this.batchDelay);
    }
  }

  /**
   * ✅ CRITICAL FIX: Synchronous notification display
   * Calls notification service without async/await to work in background
   */
  private showBatchNotificationSync(buddyName: string): void {
    console.log('🧠 Phase 3: ===== Processing batch notification SYNC =====');
    console.log('🧠 Phase 3: Buddy:', buddyName);
    
    const batch = this.batches.get(buddyName);

    if (!batch || batch.messages.length === 0) {
      console.warn('🧠 Phase 3: No messages in batch for user:', buddyName);
      return;
    }

    // ✅ CRITICAL FIX: Check if FCM notification was already shown for this buddy
    // If FCM was shown recently (within 5 seconds), skip batch notification to prevent duplicates
    if (this.wasFcmNotificationShownRecently(batch.buddyId, buddyName)) {
      console.log('🔕 Phase 3: Skipping batch notification - FCM notification already shown recently for:', {
        buddyName,
        buddyId: batch.buddyId,
        messageCount: batch.messages.length,
        reason: 'FCM notification already displayed',
      });
      
      // Still update the batch tracking to prevent showing duplicate later
      batch.lastNotificationTime = Date.now();
      batch.lastShownMessageCount = batch.messages.length;
      
      return; // Skip showing batch notification
    }

    try {
      const messageCount = batch.messages.length;
      
      console.log('🧠 Phase 3: Batch details:', {
        buddyName,
        messageCount,
        isBackground: this.isAppInBackground,
        messageIds: batch.messages.map(m => m.messageId.substring(0, 8)),
        messages: batch.messages.map(m => m.content.substring(0, 30) + '...'),
      });
      
      console.log('🔔 Phase 3: About to call notificationService.showMessageNotification with messageCount:', messageCount);

      // Build display message
      let displayMessage: string;
      
      if (messageCount === 1) {
        displayMessage = batch.messages[0].content;
      } else {
        const messagesToShow = batch.messages.slice(-3);
        displayMessage = messagesToShow.map(m => m.content).join('\n');
        
        if (messageCount > 3) {
          displayMessage = `... and ${messageCount - 3} more\n\n${displayMessage}`;
        }
      }

      // ✅ CRITICAL: Double-check messageCount before calling notification service
      // This ensures we're passing the correct count even if batch was modified
      const actualBatchSize = batch.messages.length;
      if (messageCount !== actualBatchSize) {
        console.warn('⚠️ Phase 3: messageCount mismatch!', {
          calculated: messageCount,
          actualBatchSize,
          'using': actualBatchSize
        });
      }
      const finalMessageCount = actualBatchSize; // Use actual batch size for safety
      
      // ✅ CRITICAL: Call notification service without await
      // Fire-and-forget to prevent async blocking in background
      console.log('🔔 Phase 3: Calling notificationService.showMessageNotification with:', {
        title: buddyName,
        message: displayMessage.substring(0, 50),
        buddyName,
        messageCount: finalMessageCount,
        buddyId: batch.buddyId,
        batchSizeAtCallTime: batch.messages.length
      });
      
      notificationService.showMessageNotification(
        buddyName,
        displayMessage,
        buddyName,
        finalMessageCount, // ✅ Use actual batch size
        batch.buddyId
      ).then(() => {
        console.log('✅ Phase 3: Notification shown successfully with messageCount:', finalMessageCount);
      }).catch((error) => {
        console.error('❌ Phase 3: Error showing notification:', error);
      });

      batch.lastNotificationTime = Date.now();
      batch.lastShownMessageCount = messageCount; // Track how many messages were shown

      // ✅ CRITICAL FIX: Keep batch for BOTH foreground and background
      // This allows messages to continue accumulating even after showing a notification
      // Batch is only cleared when user opens the chat (via clearBatchForUser)
      console.log('🧠 Phase 3: Keeping batch after showing notification (messages can continue accumulating)');
      console.log('🧠 Phase 3: Batch will be cleared when user opens chat or manually cleared');
      
      // Don't clear the batch - keep it for future message accumulation
      // The batch is only cleared explicitly via clearBatchForUser when user opens the chat
      
    } catch (error) {
      console.error('❌ Phase 3: Error in sync notification:', error);
    }
  }

  /**
   * ✅ Synchronous flush for background transition
   * Only shows notifications if there are new messages that haven't been shown yet
   */
  private flushAllBatchesSync(): void {
    console.log('🧠 Phase 3: Flushing all batches SYNC:', this.batches.size);

    if (this.batches.size === 0) {
      console.log('🧠 Phase 3: No batches to flush');
      return;
    }

    for (const [buddyName, batch] of this.batches.entries()) {
      console.log('🧠 Phase 3: Flushing batch SYNC for:', buddyName, {
        messageCount: batch.messages.length,
        lastShownCount: batch.lastShownMessageCount,
        hasNewMessages: batch.messages.length > batch.lastShownMessageCount
      });
      
      if (batch.timerId) {
        clearTimeout(batch.timerId);
        batch.timerId = null;
      }

      // ✅ CRITICAL FIX: Only show notification if there are new messages that haven't been shown
      // This prevents duplicate notifications when app transitions between background/foreground
      const hasNewMessages = batch.messages.length > batch.lastShownMessageCount;
      
      if (batch.messages.length > 0 && hasNewMessages) {
        console.log('🧠 Phase 3: Batch has new messages - showing notification');
        this.showBatchNotificationSync(buddyName);
      } else if (batch.messages.length > 0) {
        console.log('🧠 Phase 3: Batch has no new messages - skipping notification (already shown)');
      }
    }

    console.log('✅ Phase 3: All batches flushed SYNC');
  }

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

  clearAllBatches(): void {
    console.log('🧠 Phase 3: Clearing all batches');

    for (const [buddyName, batch] of this.batches.entries()) {
      if (batch.timerId) {
        clearTimeout(batch.timerId);
      }
    }

    this.batches.clear();
  }

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

  cleanup(): void {
    console.log('🧠 Phase 3: Cleanup started');
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // ✅ Cleanup FCM notification tracking cleanup interval
    if (this.fcmNotificationCleanupInterval) {
      clearInterval(this.fcmNotificationCleanupInterval);
      this.fcmNotificationCleanupInterval = null;
    }
    
    this.fcmNotificationsShown.clear();
    this.clearAllBatches();
    
    console.log('✅ Phase 3: Cleanup completed');
  }

  static getInstance(): Phase3NotificationLogicService {
    if (!Phase3NotificationLogicService.instance) {
      Phase3NotificationLogicService.instance = new Phase3NotificationLogicService();
    }
    return Phase3NotificationLogicService.instance;
  }
}

export { Phase3NotificationLogicService };
const instance = new Phase3NotificationLogicService();
Phase3NotificationLogicService.setInstance(instance);
export const phase3NotificationLogicService = instance;