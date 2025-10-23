import { supabase } from '@/config/supabase';
import { FCMReliabilityService, FCMDeliveryResult } from './fcmReliabilityService';
import { fcmService } from './fcmService';

export interface FCMDiagnosticResult {
  userId: string;
  hasToken: boolean;
  tokenValid: boolean;
  lastUsed?: string;
  platform?: string;
  testResult?: FCMDeliveryResult;
  errorCount: number;
}

export interface FCMSystemHealth {
  totalUsers: number;
  usersWithTokens: number;
  validTokens: number;
  invalidTokens: number;
  recentActivity: number;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

export class FCMDiagnosticService {
  /**
   * Run comprehensive FCM diagnostics for all users
   */
  static async runFullDiagnostics(): Promise<FCMSystemHealth> {
    console.log('🔍 Starting FCM system diagnostics...');
    
    try {
      // Get delivery stats
      const stats = await FCMReliabilityService.getDeliveryStats();
      
      // Get detailed user information
      const { data: users, error } = await supabase
        .from('user_fcm_tokens')
        .select('user_id, fcm_token, platform, updated_at, created_at')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('🔍 Error fetching user data:', error);
        return this.createErrorHealth('Failed to fetch user data');
      }

      // Analyze system health
      const health = this.analyzeSystemHealth(stats, users || []);
      
      console.log('🔍 FCM diagnostics completed:', health);
      return health;
    } catch (error) {
      console.error('🔍 Error in runFullDiagnostics:', error);
      return this.createErrorHealth('Diagnostic system error');
    }
  }

  /**
   * Test FCM delivery for a specific user
   */
  static async testUserDelivery(userId: string): Promise<FCMDiagnosticResult> {
    console.log('🔍 Testing FCM delivery for user:', userId);
    
    try {
      // Get user's FCM token info
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, platform, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('🔍 Error fetching user token:', error);
        return {
          userId,
          hasToken: false,
          tokenValid: false,
          errorCount: 1
        };
      }

      const hasToken = tokens && tokens.length > 0;
      const tokenInfo = hasToken ? tokens[0] : null;
      
      let tokenValid = false;
      if (tokenInfo) {
        const lastUsed = new Date(tokenInfo.updated_at);
        const now = new Date();
        const daysSinceLastUsed = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        tokenValid = daysSinceLastUsed <= 7; // 7 days validity
      }

      // Test actual delivery
      let testResult: FCMDeliveryResult | undefined;
      if (hasToken && tokenValid) {
        testResult = await FCMReliabilityService.testNotification(userId);
      }

      const result: FCMDiagnosticResult = {
        userId,
        hasToken: hasToken,
        tokenValid,
        lastUsed: tokenInfo?.updated_at,
        platform: tokenInfo?.platform,
        testResult,
        errorCount: testResult?.success ? 0 : 1
      };

      console.log('🔍 User delivery test completed:', result);
      return result;
    } catch (error) {
      console.error('🔍 Error in testUserDelivery:', error);
      return {
        userId,
        hasToken: false,
        tokenValid: false,
        errorCount: 1
      };
    }
  }

  /**
   * Clean up invalid tokens and get cleanup report
   */
  static async cleanupAndReport(): Promise<{
    cleanedTokens: number;
    remainingTokens: number;
    errors: string[];
  }> {
    console.log('🔍 Starting FCM token cleanup...');
    
    try {
      // Get tokens before cleanup
      const { data: beforeTokens } = await supabase
        .from('user_fcm_tokens')
        .select('id');

      // Run cleanup
      await FCMReliabilityService.cleanupInvalidTokens();

      // Get tokens after cleanup
      const { data: afterTokens } = await supabase
        .from('user_fcm_tokens')
        .select('id');

      const cleanedTokens = (beforeTokens?.length || 0) - (afterTokens?.length || 0);
      const remainingTokens = afterTokens?.length || 0;

      console.log(`🔍 Cleanup completed: ${cleanedTokens} tokens removed, ${remainingTokens} remaining`);

      return {
        cleanedTokens,
        remainingTokens,
        errors: []
      };
    } catch (error) {
      console.error('🔍 Error in cleanupAndReport:', error);
      return {
        cleanedTokens: 0,
        remainingTokens: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get FCM notification history for debugging
   */
  static async getNotificationHistory(userId?: string, limit: number = 50): Promise<{
    notifications: Array<{
      id: string;
      userId: string;
      title: string;
      body: string;
      sentAt: string;
      success: boolean;
      error?: string;
    }>;
    totalCount: number;
  }> {
    try {
      // This would require a notifications_log table to track sent notifications
      // For now, return empty result with note about implementation needed
      console.log('🔍 Notification history tracking not yet implemented');
      
      return {
        notifications: [],
        totalCount: 0
      };
    } catch (error) {
      console.error('🔍 Error in getNotificationHistory:', error);
      return {
        notifications: [],
        totalCount: 0
      };
    }
  }

  /**
   * Analyze system health based on stats and user data
   */
  private static analyzeSystemHealth(stats: any, users: any[]): FCMSystemHealth {
    const totalUsers = users.length;
    const usersWithTokens = stats.totalTokens;
    const validTokens = stats.validTokens;
    const invalidTokens = stats.invalidTokens;
    const recentActivity = stats.recentActivity;

    // Calculate health status
    let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    const tokenValidityRatio = totalUsers > 0 ? validTokens / totalUsers : 0;
    const activityRatio = totalUsers > 0 ? recentActivity / totalUsers : 0;

    if (tokenValidityRatio < 0.5) {
      systemStatus = 'critical';
      recommendations.push('Critical: Less than 50% of users have valid FCM tokens');
      recommendations.push('Action: Run token cleanup and encourage users to re-login');
    } else if (tokenValidityRatio < 0.8) {
      systemStatus = 'degraded';
      recommendations.push('Warning: Less than 80% of users have valid FCM tokens');
      recommendations.push('Action: Consider running token cleanup');
    }

    if (activityRatio < 0.1) {
      if (systemStatus === 'healthy') systemStatus = 'degraded';
      recommendations.push('Warning: Low recent FCM activity');
      recommendations.push('Action: Check if notifications are being sent properly');
    }

    if (invalidTokens > validTokens) {
      if (systemStatus === 'healthy') systemStatus = 'degraded';
      recommendations.push('Warning: More invalid tokens than valid ones');
      recommendations.push('Action: Run cleanup to remove invalid tokens');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is healthy - no action needed');
    }

    return {
      totalUsers,
      usersWithTokens,
      validTokens,
      invalidTokens,
      recentActivity,
      systemStatus,
      recommendations
    };
  }

  /**
   * Create error health report
   */
  private static createErrorHealth(error: string): FCMSystemHealth {
    return {
      totalUsers: 0,
      usersWithTokens: 0,
      validTokens: 0,
      invalidTokens: 0,
      recentActivity: 0,
      systemStatus: 'critical',
      recommendations: [`Error: ${error}`]
    };
  }

  /**
   * Generate diagnostic report for debugging
   */
  static async generateDiagnosticReport(): Promise<string> {
    console.log('🔍 Generating comprehensive FCM diagnostic report...');
    
    try {
      const health = await this.runFullDiagnostics();
      const cleanup = await this.cleanupAndReport();
      
      const report = `
# 🔥 FCM Diagnostic Report
Generated: ${new Date().toISOString()}

## System Health: ${health.systemStatus.toUpperCase()}

### Statistics:
- Total Users: ${health.totalUsers}
- Users with Tokens: ${health.usersWithTokens}
- Valid Tokens: ${health.validTokens}
- Invalid Tokens: ${health.invalidTokens}
- Recent Activity (24h): ${health.recentActivity}

### Token Cleanup:
- Tokens Cleaned: ${cleanup.cleanedTokens}
- Tokens Remaining: ${cleanup.remainingTokens}
- Cleanup Errors: ${cleanup.errors.length}

### Recommendations:
${health.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Steps:
1. Monitor FCM delivery rates
2. Set up automated token cleanup
3. Implement notification tracking
4. Consider FCM token refresh strategy
`;

      console.log('🔍 Diagnostic report generated');
      return report;
    } catch (error) {
      console.error('🔍 Error generating diagnostic report:', error);
      return `Error generating report: ${error}`;
    }
  }
}

