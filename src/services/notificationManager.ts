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
  private networkCheckInterval = 60000; // Check network every 60 seconds

  startPolling(userId: string) {
    if (this.isPollingActive) {
      this.stopPolling();
    }

    this.userId = userId;
    this.isPollingActive = true;
    
    // Clear previous notification history to avoid duplicates
    this.lastMessageIds = {};
    this.lastNoteIds = [];
    
    // Poll every 30 seconds for new messages and notes (optimized for performance)
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
      await this.checkForNewNotes();
    }, 30000);

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
          return;
        }
      }

      // Use BuddiesService for message checking (it has the correct methods)
      const buddies = await BuddiesService.getBuddies(this.userId);
      
      for (const buddy of buddies) {
        try {
          // Get messages for this buddy
          const messages = await BuddiesService.getMessages(buddy.id);
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
      const now = Date.now();
      if (now - this.lastNetworkCheck > this.networkCheckInterval) {
        const isConnected = await BuddiesService.testNetworkConnection();
        this.lastNetworkCheck = now;
        if (!isConnected) {
          console.warn('Network connection failed, skipping notes check');
          return;
        }
      }

      // Use BuddiesService for notes checking (it has the correct methods)
      const notes = await BuddiesService.getWhisprNotes(this.userId);
      
      // Find new notes (not in our last known list)
      const newNotes = notes.filter(note => 
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

      // Update the known note IDs (keep last 50 to avoid memory issues)
      this.lastNoteIds = notes.map(n => n.id).slice(0, 50);
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









