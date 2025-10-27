import { supabase } from '@/config/supabase';
import { Platform } from 'react-native';

export interface FCMDeliveryResult {
  success: boolean;
  error?: string;
  fcmResponse?: any;
  retryCount?: number;
}

export interface FCMTokenInfo {
  token: string;
  userId: string;
  platform: string;
  lastUsed: string;
  isValid: boolean;
  errorCount: number;
}

export class FCMReliabilityService {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly TOKEN_VALIDITY_DAYS = 7;

  /**
   * Enhanced FCM notification sending with reliability features
   */
  static async sendReliableNotification(
    userId: string,
    title: string,
    body: string,
    data?: { [key: string]: string },
    retryCount: number = 0,
    checkOnlineStatus: boolean = false
  ): Promise<FCMDeliveryResult> {
    try {
      console.log(`🔥 [Attempt ${retryCount + 1}] Sending FCM notification to user:`, userId);

      // Get and validate FCM token
      const tokenInfo = await this.getValidFCMToken(userId);
      if (!tokenInfo) {
        return {
          success: false,
          error: 'No valid FCM token found for user',
          retryCount
        };
      }

      // Send notification via Supabase Edge Function with timeout
      const result = await this.sendWithTimeout(
        userId,
        tokenInfo.token,
        title,
        body,
        data,
        checkOnlineStatus
      );

      if (result.success) {
        // Update token usage timestamp
        await this.updateTokenUsage(tokenInfo.token);
        console.log('🔥 FCM notification sent successfully');
        return { ...result, retryCount };
      } else {
        // Handle FCM errors
        const shouldRetry = await this.handleFCMError(result.error, tokenInfo, userId);
        
        if (shouldRetry && retryCount < this.MAX_RETRY_ATTEMPTS) {
          console.log(`🔥 Retrying FCM notification in ${this.RETRY_DELAY_MS}ms...`);
          await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
          return this.sendReliableNotification(userId, title, body, data, retryCount + 1);
        }

        return { ...result, retryCount };
      }
    } catch (error) {
      console.error('🔥 Error in sendReliableNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount
      };
    }
  }

  /**
   * Get valid FCM token for user with validation
   */
  private static async getValidFCMToken(userId: string): Promise<FCMTokenInfo | null> {
    try {
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, platform, updated_at, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5); // Get recent tokens

      if (error) {
        console.error('🔥 Error fetching FCM tokens:', error);
        return null;
      }

      if (!tokens || tokens.length === 0) {
        console.log('🔥 No FCM tokens found for user:', userId);
        return null;
      }

      // Find the most recent valid token
      for (const token of tokens) {
        const tokenInfo: FCMTokenInfo = {
          token: token.fcm_token,
          userId,
          platform: token.platform,
          lastUsed: token.updated_at,
          isValid: this.isTokenValid(token.updated_at),
          errorCount: 0
        };

        if (tokenInfo.isValid) {
          return tokenInfo;
        }
      }

      console.warn('🔥 No valid FCM tokens found for user:', userId);
      return null;
    } catch (error) {
      console.error('🔥 Error in getValidFCMToken:', error);
      return null;
    }
  }

  /**
   * Check if FCM token is still valid based on age
   */
  private static isTokenValid(lastUsed: string): boolean {
    const lastUsedDate = new Date(lastUsed);
    const now = new Date();
    const daysSinceLastUsed = (now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceLastUsed <= this.TOKEN_VALIDITY_DAYS;
  }

  /**
   * Send FCM notification with timeout
   */
  private static async sendWithTimeout(
    userId: string,
    token: string,
    title: string,
    body: string,
    data?: { [key: string]: string },
    checkOnlineStatus: boolean = false
  ): Promise<FCMDeliveryResult> {
    const timeoutPromise = new Promise<FCMDeliveryResult>((_, reject) => {
      setTimeout(() => reject(new Error('FCM request timeout')), 10000); // 10 second timeout
    });

    const sendPromise = supabase.functions.invoke('send-fcm-notification-v1', {
      body: {
        to: token,
        notification: { title, body },
        data: { ...data, userId },
        checkOnlineStatus
      }
    });

    try {
      const result = await Promise.race([sendPromise, timeoutPromise]);
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message || 'FCM Edge Function error',
          fcmResponse: result.data
        };
      }

      // Handle server-side online status check response
      if (result.data?.reason === 'user_online') {
        return {
          success: false,
          error: 'user_online', // Special error code for online users
          fcmResponse: result.data
        };
      }

      return {
        success: true,
        fcmResponse: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle FCM errors and determine if retry is needed
   */
  private static async handleFCMError(
    error: string,
    tokenInfo: FCMTokenInfo,
    userId: string
  ): Promise<boolean> {
    console.log('🔥 Handling FCM error:', error);

    // Check for specific FCM error types
    if (error.includes('InvalidRegistration') || 
        error.includes('NotRegistered') ||
        error.includes('invalid_token')) {
      console.log('🔥 Invalid FCM token detected, marking as invalid');
      await this.markTokenAsInvalid(tokenInfo.token, userId);
      return false; // Don't retry with invalid token
    }

    if (error.includes('timeout') || 
        error.includes('network') ||
        error.includes('connection')) {
      console.log('🔥 Network error detected, will retry');
      return true; // Retry network errors
    }

    if (error.includes('quota') || error.includes('rate limit')) {
      console.log('🔥 Rate limit detected, will retry with delay');
      return true; // Retry rate limit errors
    }

    // For other errors, don't retry
    console.log('🔥 Non-retryable error:', error);
    return false;
  }

  /**
   * Mark FCM token as invalid
   */
  private static async markTokenAsInvalid(token: string, userId: string): Promise<void> {
    try {
      // Delete invalid token
      await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('fcm_token', token)
        .eq('user_id', userId);

      console.log('🔥 Invalid FCM token removed from database');
    } catch (error) {
      console.error('🔥 Error removing invalid token:', error);
    }
  }

  /**
   * Update token usage timestamp
   */
  private static async updateTokenUsage(token: string): Promise<void> {
    try {
      await supabase
        .from('user_fcm_tokens')
        .update({ updated_at: new Date().toISOString() })
        .eq('fcm_token', token);
    } catch (error) {
      console.error('🔥 Error updating token usage:', error);
    }
  }

  /**
   * Clean up old and invalid FCM tokens
   */
  static async cleanupInvalidTokens(): Promise<void> {
    try {
      console.log('🔥 Cleaning up invalid FCM tokens...');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.TOKEN_VALIDITY_DAYS);

      const { error } = await supabase
        .from('user_fcm_tokens')
        .delete()
        .lt('updated_at', cutoffDate.toISOString());

      if (error) {
        console.error('🔥 Error cleaning up tokens:', error);
      } else {
        console.log('🔥 Old FCM tokens cleaned up successfully');
      }
    } catch (error) {
      console.error('🔥 Error in cleanupInvalidTokens:', error);
    }
  }

  /**
   * Get FCM delivery statistics
   */
  static async getDeliveryStats(userId?: string): Promise<{
    totalTokens: number;
    validTokens: number;
    invalidTokens: number;
    recentActivity: number;
  }> {
    try {
      let query = supabase.from('user_fcm_tokens').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: tokens, error } = await query;

      if (error) {
        console.error('🔥 Error fetching delivery stats:', error);
        return { totalTokens: 0, validTokens: 0, invalidTokens: 0, recentActivity: 0 };
      }

      const now = new Date();
      const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const stats = {
        totalTokens: tokens?.length || 0,
        validTokens: 0,
        invalidTokens: 0,
        recentActivity: 0
      };

      tokens?.forEach(token => {
        const lastUsed = new Date(token.updated_at);
        const isValid = this.isTokenValid(token.updated_at);
        
        if (isValid) {
          stats.validTokens++;
        } else {
          stats.invalidTokens++;
        }

        if (lastUsed > recentCutoff) {
          stats.recentActivity++;
        }
      });

      return stats;
    } catch (error) {
      console.error('🔥 Error in getDeliveryStats:', error);
      return { totalTokens: 0, validTokens: 0, invalidTokens: 0, recentActivity: 0 };
    }
  }

  /**
   * Test FCM notification delivery
   */
  static async testNotification(userId: string): Promise<FCMDeliveryResult> {
    return this.sendReliableNotification(
      userId,
      'Test Notification',
      'This is a test notification to verify FCM delivery',
      { test: 'true', timestamp: new Date().toISOString() }
    );
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
