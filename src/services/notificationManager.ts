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
  private lastMessageCounts: { [buddyId: string]: number } = {};
  private lastNoteCount = 0;
  private userId: string | null = null;

  startPolling(userId: string) {
    if (this.isPollingActive) {
      this.stopPolling();
    }

    this.userId = userId;
    this.isPollingActive = true;
    
    // Poll every 5 seconds for new messages and notes
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages();
      await this.checkForNewNotes();
    }, 5000);

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
      // Get all buddies
      const buddies = await BuddiesService.getBuddies(this.userId);
      
      for (const buddy of buddies) {
        // Get messages for this buddy
        const messages = await BuddiesService.getMessages(buddy.id);
        const currentCount = messages.length;
        const lastCount = this.lastMessageCounts[buddy.id] || 0;

        // If there are new messages and they're not from the current user
        if (currentCount > lastCount && messages.length > 0) {
          const latestMessage = messages[0]; // First message is newest due to inverted FlatList
          
          // Only notify for messages from others
          if (latestMessage.sender_id !== this.userId) {
            try {
              await notificationService.showMessageNotification(
                'New Message',
                latestMessage.content,
                buddy.name || buddy.initials || 'Buddy'
              );
              console.log('Notification sent for new message from:', buddy.name);
            } catch (error) {
              console.warn('Failed to send message notification:', error);
            }
          }
        }

        // Update the count
        this.lastMessageCounts[buddy.id] = currentCount;
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  private async checkForNewNotes() {
    if (!this.userId) return;

    try {
      // Get Whispr notes
      const notes = await BuddiesService.getWhisprNotes(this.userId);
      const currentCount = notes.length;

      // If there are new notes
      if (currentCount > this.lastNoteCount && notes.length > 0) {
        const latestNote = notes[0]; // First note is newest
        
        // Only notify for notes from others
        if (latestNote.sender_id !== this.userId) {
          try {
            await notificationService.showNoteNotification(
              'New Whispr Note',
              latestNote.content
            );
            console.log('Notification sent for new Whispr note');
          } catch (error) {
            console.warn('Failed to send note notification:', error);
          }
        }
      }

      // Update the count
      this.lastNoteCount = currentCount;
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






