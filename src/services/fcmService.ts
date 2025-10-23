import { supabase } from '@/config/supabase';
import { FCMReliabilityService, FCMDeliveryResult } from './fcmReliabilityService';

export interface FCMMessage {
  to: string; // FCM token
  notification: {
    title: string;
    body: string;
  };
  data?: {
    [key: string]: string;
  };
}

export class FCMService {
  /**
   * Send FCM notification to a specific user (Enhanced with reliability)
   */
  static async sendNotificationToUser(
    userId: string, 
    title: string, 
    body: string, 
    data?: { [key: string]: string }
  ): Promise<boolean> {
    try {
      console.log('🔥 Sending FCM notification to user:', userId);
      
      const result = await FCMReliabilityService.sendReliableNotification(
        userId, 
        title, 
        body, 
        data
      );
      
      if (result.success) {
        console.log('🔥 FCM notification sent successfully');
        return true;
      } else {
        console.log('🔥 FCM notification failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('🔥 Error in sendNotificationToUser:', error);
      return false;
    }
  }
  
  /**
   * Send notification to multiple users
   */
  static async sendNotificationToUsers(
    userIds: string[], 
    title: string, 
    body: string, 
    data?: { [key: string]: string }
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const userId of userIds) {
      const result = await this.sendNotificationToUser(userId, title, body, data);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
    console.log(`🔥 Batch notification results: ${success} success, ${failed} failed`);
    return { success, failed };
  }
  
  /**
   * Send notification to all users with FCM tokens
   */
  static async sendNotificationToAllUsers(
    title: string, 
    body: string, 
    data?: { [key: string]: string }
  ): Promise<{ success: number; failed: number }> {
    try {
      console.log('🔥 Sending FCM notification to all users');
      
      // Get all users with FCM tokens
      const { data: users, error } = await supabase
        .from('user_fcm_tokens')
        .select('user_id, fcm_token');
      
      if (error) {
        console.error('🔥 Error fetching users with FCM tokens:', error);
        return { success: 0, failed: 0 };
      }
      
      if (!users || users.length === 0) {
        console.warn('🔥 No users with FCM tokens found');
        return { success: 0, failed: 0 };
      }
      
      const userIds = users.map(user => user.user_id);
      return await this.sendNotificationToUsers(userIds, title, body, data);
    } catch (error) {
      console.error('🔥 Error in sendNotificationToAllUsers:', error);
      return { success: 0, failed: 0 };
    }
  }
  
  /**
   * Send message notification to buddy
   */
  static async sendMessageNotification(
    senderId: string,
    receiverId: string,
    message: string,
    buddyName: string
  ): Promise<boolean> {
    try {
      console.log('🔥 Sending message notification:', { senderId, receiverId, buddyName });
      
      const title = 'New Message';
      const body = `${buddyName}: ${message}`;
      const data = {
        type: 'message',
        senderId,
        buddyName,
        message
      };
      
      return await this.sendNotificationToUser(receiverId, title, body, data);
    } catch (error) {
      console.error('🔥 Error sending message notification:', error);
      return false;
    }
  }
  
  /**
   * Send note notification
   */
  static async sendNoteNotification(
    senderId: string,
    receiverId: string,
    noteTitle: string,
    noteContent: string
  ): Promise<boolean> {
    try {
      console.log('🔥 Sending note notification:', { senderId, receiverId, noteTitle });
      
      const title = 'New Whispr Note';
      const body = `${noteTitle}: ${noteContent}`;
      const data = {
        type: 'note',
        senderId,
        noteTitle,
        noteContent
      };
      
      return await this.sendNotificationToUser(receiverId, title, body, data);
    } catch (error) {
      console.error('🔥 Error sending note notification:', error);
      return false;
    }
  }

  /**
   * Test FCM notification delivery for a user
   */
  static async testNotification(userId: string): Promise<FCMDeliveryResult> {
    return FCMReliabilityService.testNotification(userId);
  }

  /**
   * Get FCM delivery statistics
   */
  static async getDeliveryStats(userId?: string) {
    return FCMReliabilityService.getDeliveryStats(userId);
  }

  /**
   * Clean up invalid FCM tokens
   */
  static async cleanupInvalidTokens(): Promise<void> {
    return FCMReliabilityService.cleanupInvalidTokens();
  }
}

export const fcmService = FCMService;