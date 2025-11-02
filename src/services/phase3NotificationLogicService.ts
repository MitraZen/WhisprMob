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

  constructor() {
    console.log('🧠 Phase 3: Initializing notification logic service');
    this.isAppInBackground = AppState.currentState !== 'active';
    console.log('🧠 Phase 3: Initial app state:', this.isAppInBackground ? 'background' : 'foreground');
    
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
      
      // ✅ Call synchronously without await to prevent blocking
      // NOTE: Batch already has the new message added (line 99-104), so messageCount will be correct
      this.showBatchNotificationSync(buddyName);
      
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
   */
  private flushAllBatchesSync(): void {
    console.log('🧠 Phase 3: Flushing all batches SYNC:', this.batches.size);

    if (this.batches.size === 0) {
      console.log('🧠 Phase 3: No batches to flush');
      return;
    }

    for (const [buddyName, batch] of this.batches.entries()) {
      console.log('🧠 Phase 3: Flushing batch SYNC for:', buddyName);
      
      if (batch.timerId) {
        clearTimeout(batch.timerId);
        batch.timerId = null;
      }

      if (batch.messages.length > 0) {
        this.showBatchNotificationSync(buddyName);
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