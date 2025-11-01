import { supabase } from '@/config/supabase';

export interface FCMDeliveryResult {
  success: boolean;
  error?: string;
  fcmResponse?: any;
  retryCount?: number;
}

export interface FCMTokenInfo {
  token: string;
  userId: string;
  deviceId: string;
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
   * ✅ FIXED: Now sends to most recent device token only
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

      // ✅ CRITICAL FIX: Get most recent valid token (not all tokens)
      const tokenInfo = await this.getMostRecentValidToken(userId);
      if (!tokenInfo) {
        return {
          success: false,
          error: 'No valid FCM token found for user',
          retryCount
        };
      }

      console.log(`🔥 Using token from device: ${tokenInfo.deviceId.substring(0, 30)}...`);

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
        // Update token usage timestamp for this specific device
        await this.updateTokenUsage(tokenInfo.token, tokenInfo.deviceId);
        console.log('🔥 FCM notification sent successfully');
        return { ...result, retryCount };
      } else {
        // Handle FCM errors
        const shouldRetry = await this.handleFCMError(result.error || 'Unknown error', tokenInfo, userId);
        
        if (shouldRetry && retryCount < this.MAX_RETRY_ATTEMPTS) {
          console.log(`🔥 Retrying FCM notification in ${this.RETRY_DELAY_MS}ms...`);
          await this.delay(this.RETRY_DELAY_MS * (retryCount + 1));
          return this.sendReliableNotification(userId, title, body, data, retryCount + 1, checkOnlineStatus);
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
   * ✅ NEW: Get most recent valid token for user (single device)
   * This prevents sending to multiple devices (duplicate notifications)
   */
  private static async getMostRecentValidToken(userId: string): Promise<FCMTokenInfo | null> {
    try {
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, device_id, platform, updated_at, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1); // ✅ CRITICAL: Get only most recent device

      if (error) {
        console.error('🔥 Error fetching FCM tokens:', error);
        return null;
      }

      if (!tokens || tokens.length === 0) {
        console.log('🔥 No FCM tokens found for user:', userId);
        return null;
      }

      const token = tokens[0];
      const tokenInfo: FCMTokenInfo = {
        token: token.fcm_token,
        userId,
        deviceId: token.device_id,
        platform: token.platform,
        lastUsed: token.updated_at,
        isValid: this.isTokenValid(token.updated_at),
        errorCount: 0
      };

      if (!tokenInfo.isValid) {
        console.warn('🔥 Most recent FCM token is expired for user:', userId);
        return null;
      }

      return tokenInfo;
    } catch (error) {
      console.error('🔥 Error in getMostRecentValidToken:', error);
      return null;
    }
  }

  /**
   * ✅ DEPRECATED: Use getMostRecentValidToken instead
   * Keeping for backward compatibility but not recommended
   */
  private static async getValidFCMToken(userId: string): Promise<FCMTokenInfo | null> {
    console.warn('🔥 getValidFCMToken is deprecated - use getMostRecentValidToken');
    return this.getMostRecentValidToken(userId);
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
    const timeoutPromise = new Promise<FCMDeliveryResult>((resolve) => {
      setTimeout(() => resolve({
        success: false,
        error: 'FCM request timeout'
      }), 10000);
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
      
      // Type guard: Check if result is from Supabase function (has error/data structure)
      if ('error' in result || 'data' in result) {
        // This is a FunctionsResponse from Supabase
        const funcResponse = result as any;
        
        if (funcResponse.error) {
          return {
            success: false,
            error: funcResponse.error.message || 'FCM Edge Function error',
            fcmResponse: funcResponse.data
          };
        }

        if (funcResponse.data?.reason === 'user_online') {
          return {
            success: false,
            error: 'user_online',
            fcmResponse: funcResponse.data
          };
        }

        return {
          success: true,
          fcmResponse: funcResponse.data
        };
      }
      
      // If result is already FCMDeliveryResult (from timeout), return it
      return result as FCMDeliveryResult;
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

    if (error.includes('InvalidRegistration') || 
        error.includes('NotRegistered') ||
        error.includes('invalid_token')) {
      console.log('🔥 Invalid FCM token detected, marking as invalid');
      await this.markTokenAsInvalid(tokenInfo.token, tokenInfo.deviceId, userId);
      return false;
    }

    if (error.includes('timeout') || 
        error.includes('network') ||
        error.includes('connection')) {
      console.log('🔥 Network error detected, will retry');
      return true;
    }

    if (error.includes('quota') || error.includes('rate limit')) {
      console.log('🔥 Rate limit detected, will retry with delay');
      return true;
    }

    console.log('🔥 Non-retryable error:', error);
    return false;
  }

  /**
   * ✅ FIXED: Mark FCM token as invalid (remove specific device token)
   */
  private static async markTokenAsInvalid(token: string, deviceId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('fcm_token', token)
        .eq('device_id', deviceId)
        .eq('user_id', userId);

      console.log(`🔥 Invalid FCM token removed from database for device: ${deviceId.substring(0, 30)}...`);
    } catch (error) {
      console.error('🔥 Error removing invalid token:', error);
    }
  }

  /**
   * ✅ FIXED: Update token usage timestamp for specific device
   */
  private static async updateTokenUsage(token: string, deviceId: string): Promise<void> {
    try {
      await supabase
        .from('user_fcm_tokens')
        .update({ updated_at: new Date().toISOString() })
        .eq('fcm_token', token)
        .eq('device_id', deviceId);
    } catch (error) {
      console.error('🔥 Error updating token usage:', error);
    }
  }

  /**
   * Clean up old and invalid FCM tokens
   * ✅ ENHANCED: Now considers device_id in cleanup
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
   * ✅ ENHANCED: Get FCM delivery statistics (now device-aware)
   */
  static async getDeliveryStats(userId?: string): Promise<{
    totalTokens: number;
    totalDevices: number;
    validTokens: number;
    invalidTokens: number;
    recentActivity: number;
    deviceBreakdown: { [platform: string]: number };
  }> {
    try {
      let query = supabase
        .from('user_fcm_tokens')
        .select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: tokens, error } = await query;

      if (error) {
        console.error('🔥 Error fetching delivery stats:', error);
        return { 
          totalTokens: 0, 
          totalDevices: 0,
          validTokens: 0, 
          invalidTokens: 0, 
          recentActivity: 0,
          deviceBreakdown: {}
        };
      }

      const now = new Date();
      const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // ✅ NEW: Track unique devices
      const uniqueDevices = new Set(tokens?.map(t => t.device_id) || []);
      const deviceBreakdown: { [platform: string]: number } = {};

      const stats = {
        totalTokens: tokens?.length || 0,
        totalDevices: uniqueDevices.size,
        validTokens: 0,
        invalidTokens: 0,
        recentActivity: 0,
        deviceBreakdown
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

        // Track device platform breakdown
        const platform = token.platform || 'unknown';
        deviceBreakdown[platform] = (deviceBreakdown[platform] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('🔥 Error in getDeliveryStats:', error);
      return { 
        totalTokens: 0,
        totalDevices: 0, 
        validTokens: 0, 
        invalidTokens: 0, 
        recentActivity: 0,
        deviceBreakdown: {}
      };
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
   * ✅ NEW: Get all devices for a user (for debugging)
   */
  static async getUserDevices(userId: string): Promise<Array<{
    deviceId: string;
    deviceName?: string;
    platform: string;
    lastUsed: string;
    isValid: boolean;
  }>> {
    try {
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('device_id, device_name, platform, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error || !tokens) {
        return [];
      }

      return tokens.map(token => ({
        deviceId: token.device_id,
        deviceName: token.device_name,
        platform: token.platform,
        lastUsed: token.updated_at,
        isValid: this.isTokenValid(token.updated_at)
      }));
    } catch (error) {
      console.error('🔥 Error getting user devices:', error);
      return [];
    }
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}