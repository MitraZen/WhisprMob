/**
 * Reply Count Sync Service
 * Handles automatic syncing of reply counts without cron jobs
 * Uses lazy sync, background sync, and event-driven sync
 */

import { supabase } from '@/config/supabase';

export class ReplyCountSyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isSyncing = false;
  private static lastSyncTime: Date | null = null;
  private static SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (reduced frequency)
  private static syncDebounceMs = 30 * 1000; // 30 seconds debounce

  /**
   * Sync a single note's reply count
   */
  static async syncNoteCount(noteId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('sync_note_reply_count', {
        p_note_id: noteId,
      });

      if (error) {
        console.warn('⚠️ Failed to sync note reply count:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('⚠️ Error syncing note reply count:', err);
      return false;
    }
  }

  /**
   * Sync multiple notes' reply counts
   */
  static async syncNotesCounts(noteIds: string[]): Promise<number> {
    if (noteIds.length === 0) return 0;

    try {
      const { data, error } = await supabase.rpc('sync_notes_reply_counts', {
        p_note_ids: noteIds,
      });

      if (error) {
        console.warn('⚠️ Failed to sync notes reply counts:', error);
        return 0;
      }

      return data || 0;
    } catch (err) {
      console.warn('⚠️ Error syncing notes reply counts:', err);
      return 0;
    }
  }

  /**
   * Start background sync (runs periodically)
   * Call this when app becomes active or user opens notes screen
   * Optimized: Only syncs notes with reply_count = 0 (likely candidates)
   */
  static startBackgroundSync(noteIds: string[] = []): void {
    // Clear existing interval
    this.stopBackgroundSync();

    // Don't sync immediately - let lazy sync handle it
    // Background sync is just a safety net

    // Set up periodic sync (less frequent to reduce load)
    this.syncInterval = setInterval(() => {
      if (this.isSyncing) {
        return; // Skip if already syncing
      }

      // Only sync if we have note IDs and it's been a while since last sync
      if (noteIds.length > 0) {
        const timeSinceLastSync = this.lastSyncTime
          ? Date.now() - this.lastSyncTime.getTime()
          : Infinity;

        // Sync if it's been more than the interval
        if (timeSinceLastSync >= this.SYNC_INTERVAL_MS) {
          this.isSyncing = true;
          // Run in background without blocking
          setImmediate(() => {
            this.syncNotesCounts(noteIds)
              .then((synced) => {
                this.lastSyncTime = new Date();
                // Silent completion - no logging
              })
              .catch(() => {
                // Silent fail
              })
              .finally(() => {
                this.isSyncing = false;
              });
          });
        }
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop background sync
   */
  static stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      // Silent stop - no logging needed
    }
  }

  /**
   * Sync counts for notes currently visible in the app
   * Call this when notes are loaded or refreshed
   * Optimized: Only syncs notes that likely need it (reply_count = 0)
   */
  static async syncVisibleNotes(noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;

    // Run asynchronously without blocking
    setImmediate(async () => {
      try {
        await this.syncNotesCounts(noteIds);
      } catch (err) {
        // Silent fail
      }
    });
  }

  /**
   * Force sync all notes (use sparingly, for maintenance)
   */
  static async forceSyncAll(): Promise<number> {
    try {
      // Get all note IDs
      const { data: notes, error } = await supabase
        .from('whispr_notes')
        .select('id')
        .limit(1000); // Limit to prevent timeout

      if (error) throw error;
      if (!notes || notes.length === 0) return 0;

      const noteIds = notes.map((n) => n.id);
      return await this.syncNotesCounts(noteIds);
    } catch (err) {
      console.error('❌ Error in force sync:', err);
      return 0;
    }
  }
}

