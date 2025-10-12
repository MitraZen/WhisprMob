import { notificationService } from './notificationService';
import { BuddiesService } from './buddiesService';

interface NotificationManager {
  startPolling: (userId: string) => void;
  stopPolling: () => void;
  isPolling: () => boolean;
}

class NotificationManagerClass implements NotificationManager {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPollingActive = false;
  private lastMessageIds: { [buddyId: string]: string[] } = {};
  private lastNoteIds: string[] = [];
  private userId: string | null = null;
  private lastNetworkCheck = 0;
  private networkCheckInterval = 60000; // Check network every 1 minute (reduced from 5 minutes)
  private pollingIntervalMs = 30000; // Poll every 30 seconds (reduced from 5 minutes)
  private maxRetries = 3;
  private retryCount = 0;

  startPolling(userId: string) {
    if (this.isPollingActive) {
      this.stopPolling();
    }

    this.userId = userId;
    this.isPollingActive = true;
    
    // Clear previous notification history to avoid duplicates
    this.lastMessageIds = {};
    this.lastNoteIds = [];
    
    // Poll every 5 minutes for new messages and notes (optimized for performance and reduced egress)
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
      await this.checkForNewNotes();
    }, this.pollingIntervalMs);

    console.log('Notification polling started for user:', userId);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPollingActive = false;
    this.userId = null;
    console.log('Notification polling stopped');
  }

  isPolling(): boolean {
    return this.isPollingActive;
  }

  private async checkForNewMessages() {
    if (!this.userId) return;

    try {
      // Test network connectivity only if we haven't checked recently
      const now = Date.now();
      if (now - this.lastNetworkCheck > this.networkCheckInterval) {
        const isConnected = await BuddiesService.testNetworkConnection();
        this.lastNetworkCheck = now;
        if (!isConnected) {
          console.warn('Network connection failed, skipping message check');
          this.retryCount++;
          if (this.retryCount >= this.maxRetries) {
            console.log('Max retries reached, stopping polling temporarily');
            this.stopPolling();
            // Restart polling after 10 minutes
            setTimeout(() => {
              if (this.userId) {
                this.startPolling(this.userId);
                this.retryCount = 0;
              }
            }, 600000); // 10 minutes
          }
          return;
        }
        this.retryCount = 0; // Reset retry count on successful connection
      }

      // Use BuddiesService for message checking (it has the correct methods)
      const buddies = await BuddiesService.getBuddies(this.userId);
      
      // Limit to first 20 buddies to reduce database load (increased from 5)
      const limitedBuddies = buddies.slice(0, 20);
      
      for (const buddy of limitedBuddies) {
        try {
          // Get messages for this buddy
          const messages = await BuddiesService.getMessages(buddy.id, this.userId);
          const lastKnownIds = this.lastMessageIds[buddy.id] || [];
          
          // Find new messages (not in our last known list)
          const newMessages = messages.filter(message => 
            !lastKnownIds.includes(message.id) && 
            message.senderId !== this.userId
          );

          // Send notifications for new messages
          for (const message of newMessages) {
            try {
              await notificationService.showMessageNotification(
                'New Message',
                message.content || 'New message received',
                buddy.name || buddy.initials || 'Buddy'
              );
              console.log('Background notification sent for new message from:', buddy.name, 'Content:', message.content);
            } catch (error) {
              console.warn('Failed to send message notification:', error);
            }
          }

          // Update the known message IDs (keep last 50 to avoid memory issues)
          const currentIds = messages.map(m => m.id).slice(0, 50);
          this.lastMessageIds[buddy.id] = currentIds;
        } catch (buddyError) {
          console.warn(`Failed to check messages for buddy ${buddy.name}:`, buddyError);
        }
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  private async checkForNewNotes() {
    if (!this.userId) return;

    try {
      // Skip network check if we already checked recently (shared with messages)
      // Network check is already handled in checkForNewMessages()

      // Use BuddiesService for notes checking (it has the correct methods)
      const notes = await BuddiesService.getWhisprNotes(this.userId);
      
      // Limit to recent notes only (last 10) to reduce processing
      const recentNotes = notes.slice(0, 10);
      
      // Find new notes (not in our last known list)
      const newNotes = recentNotes.filter(note => 
        !this.lastNoteIds.includes(note.id) && 
        note.senderId !== this.userId
      );

      // Send notifications for new notes
      for (const note of newNotes) {
        try {
          await notificationService.showNoteNotification(
            'New Whispr Note',
            note.content || 'New note received'
          );
          console.log('Background notification sent for new Whispr note, Content:', note.content);
        } catch (error) {
          console.warn('Failed to send note notification:', error);
        }
      }

      // Update the known note IDs (keep last 10 to avoid memory issues)
      this.lastNoteIds = recentNotes.map(n => n.id).slice(0, 10);
    } catch (error) {
      console.error('Error checking for new notes:', error);
    }
  }

  // Method to manually trigger notification check (useful for testing)
  async triggerNotificationCheck() {
    if (this.userId) {
      await this.checkForNewMessages();
      await this.checkForNewNotes();
    }
  }
}

export const notificationManager = new NotificationManagerClass();









