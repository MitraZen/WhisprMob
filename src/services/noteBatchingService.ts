import { AppState, AppStateStatus } from 'react-native';
import { notificationService } from './notificationService';

interface BatchedNote {
  noteId: string;
  content: string;
  senderId: string;
  senderName?: string;
  timestamp: number;
}

interface NoteBatch {
  notes: BatchedNote[];
  timerId: NodeJS.Timeout | null;
  lastNotificationTime: number;
}

/**
 * Service to batch Whispr Notes notifications
 * Groups multiple notes into a single notification to reduce notification spam
 */
class NoteBatchingService {
  private static instance: NoteBatchingService | null = null;
  private batch: NoteBatch | null = null;
  private batchDelay = 5000; // 5 seconds delay for batching
  private isAppInBackground = false;
  private appStateSubscription: any = null;
  private readonly NOTIFICATION_ID = 9999; // Stable ID for note notifications

  static getInstance(): NoteBatchingService {
    if (!NoteBatchingService.instance) {
      NoteBatchingService.instance = new NoteBatchingService();
    }
    return NoteBatchingService.instance;
  }

  constructor() {
    console.log('📝 Note Batching: Initializing note batching service');
    this.isAppInBackground = AppState.currentState !== 'active';
    console.log('📝 Note Batching: Initial app state:', this.isAppInBackground ? 'background' : 'foreground');
    
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasInBackground = this.isAppInBackground;
    this.isAppInBackground = nextAppState !== 'active';

    console.log('📝 Note Batching: App state changed:', {
      nextState: nextAppState,
      wasInBackground,
      nowInBackground: this.isAppInBackground,
    });

    // Flush batch when app goes to background
    if (!wasInBackground && this.isAppInBackground) {
      console.log('📝 Note Batching: App went to background - flushing batch NOW');
      this.flushBatch();
    }
  };

  /**
   * Add a note to the batch
   * If batch doesn't exist, create it and set a timer
   * If batch exists, add note and reset timer
   */
  addNoteToBatch(
    noteId: string,
    content: string,
    senderId: string,
    senderName?: string
  ): void {
    console.log('📝 Note Batching: Adding note to batch:', {
      noteId: noteId.substring(0, 8),
      contentLength: content.length,
      senderId,
      isBackground: this.isAppInBackground,
    });

    // Initialize batch if it doesn't exist
    if (!this.batch) {
      this.batch = {
        notes: [],
        timerId: null,
        lastNotificationTime: 0,
      };
      console.log('📝 Note Batching: Created new batch');
    }

    // Add note to batch
    this.batch.notes.push({
      noteId,
      content,
      senderId,
      senderName,
      timestamp: Date.now(),
    });

    console.log(`📝 Note Batching: Batch now has ${this.batch.notes.length} note(s)`);

    // Clear existing timer
    if (this.batch.timerId) {
      clearTimeout(this.batch.timerId);
      this.batch.timerId = null;
      console.log('📝 Note Batching: Cleared existing timer to allow more notes to accumulate');
    }

    // In background, show notification immediately (but still batch if more come quickly)
    if (this.isAppInBackground) {
      console.log('📝 Note Batching: App in background - showing notification after short delay');
      // Small delay to allow batching if multiple notes arrive quickly
      setTimeout(() => {
        this.showBatchNotification();
      }, 1000); // 1 second delay even in background to allow batching
    } else {
      console.log('📝 Note Batching: App in foreground - setting timer for', this.batchDelay, 'ms');
      // In foreground, wait for batch delay
      this.batch.timerId = setTimeout(() => {
        console.log('📝 Note Batching: Timer fired');
        this.showBatchNotification();
      }, this.batchDelay);
    }
  }

  /**
   * Show the batched notification
   */
  private showBatchNotification(): void {
    if (!this.batch || this.batch.notes.length === 0) {
      console.warn('📝 Note Batching: No notes in batch to show');
      return;
    }

    const noteCount = this.batch.notes.length;
    const latestNote = this.batch.notes[this.batch.notes.length - 1];

    console.log('📝 Note Batching: Showing batch notification:', {
      noteCount,
      latestNoteId: latestNote.noteId.substring(0, 8),
    });

    // Build notification title and message
    let title: string;
    let message: string;

    if (noteCount === 1) {
      title = 'New Whispr Note';
      message = latestNote.content.length > 100 
        ? latestNote.content.substring(0, 100) + '...' 
        : latestNote.content;
    } else {
      title = `${noteCount} New Whispr Notes`;
      // Show preview of latest note
      const latestPreview = latestNote.content.length > 80 
        ? latestNote.content.substring(0, 80) + '...' 
        : latestNote.content;
      message = `You have ${noteCount} new notes. Latest: ${latestPreview}`;
    }

    // Show notification with count
    notificationService.showNoteNotification(title, message, noteCount).catch((error) => {
      console.error('📝 Note Batching: Error showing notification:', error);
    });

    // Update last notification time
    this.batch.lastNotificationTime = Date.now();

    // Clear the batch
    this.batch.notes = [];
    if (this.batch.timerId) {
      clearTimeout(this.batch.timerId);
      this.batch.timerId = null;
    }
  }

  /**
   * Flush the current batch immediately
   */
  flushBatch(): void {
    if (this.batch && this.batch.notes.length > 0) {
      console.log('📝 Note Batching: Flushing batch with', this.batch.notes.length, 'note(s)');
      if (this.batch.timerId) {
        clearTimeout(this.batch.timerId);
        this.batch.timerId = null;
      }
      this.showBatchNotification();
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.batch?.timerId) {
      clearTimeout(this.batch.timerId);
    }
    this.batch = null;
  }
}

export const noteBatchingService = NoteBatchingService.getInstance();

