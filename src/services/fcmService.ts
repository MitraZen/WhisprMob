import { supabase } from '@/config/supabase';

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
   * Send FCM notification to a specific user
   */
  static async sendNotificationToUser(
    userId: string, 
    title: string, 
    body: string, 
    data?: { [key: string]: string }
  ): Promise<boolean> {
    try {
      console.log('🔥 Sending FCM notification to user:', userId);
      
      // Get user's FCM token (handle multiple tokens by getting the latest one)
      const { data: userFcmTokens, error: profileError } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (profileError) {
        console.error('🔥 Error fetching user FCM token:', profileError);
        return false;
      }
      
      if (!userFcmTokens || userFcmTokens.length === 0) {
        console.log('🔥 User has no FCM token yet - they need to log in first');
        return false;
      }
      
      const userFcmToken = userFcmTokens[0];
      if (!userFcmToken?.fcm_token) {
        console.warn('🔥 No FCM token found for user:', userId);
        return false;
      }
      
      // Send notification via Supabase Edge Function
      const { data: result, error } = await supabase.functions.invoke('send-fcm-notification', {
        body: {
          to: userFcmToken.fcm_token,
          notification: {
            title,
            body
          },
          data: data || {}
        }
      });
      
      if (error) {
        console.error('🔥 Error sending FCM notification:', error);
        console.log('🔥 FCM Edge Function not configured - using local notifications only');
        return false; // Return false so local notifications can be used as fallback
      }
      
      console.log('🔥 FCM notification sent successfully:', result);
      return true;
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
}

export const fcmService = FCMService;
