import { supabase } from '@/config/supabase';
import { FCMReliabilityService, FCMDeliveryResult } from './fcmReliabilityService';

export interface FCMDiagnosticResult {
  userId: string;
  hasToken: boolean;
  tokenValid: boolean;
  deviceCount: number;
  devices: Array<{
    deviceId: string;
    platform: string;
    lastUsed: string;
    isValid: boolean;
  }>;
  lastUsed?: string;
  platform?: string;
  testResult?: FCMDeliveryResult;
  errorCount: number;
}

export interface FCMSystemHealth {
  totalUsers: number;
  usersWithTokens: number;
  totalDevices: number;
  validTokens: number;
  invalidTokens: number;
  recentActivity: number;
  duplicateTokenIssues: number;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
  deviceBreakdown: { [platform: string]: number };
}

export class FCMDiagnosticService {
  /**
   * ✅ ENHANCED: Run comprehensive FCM diagnostics with device awareness
   */
  static async runFullDiagnostics(): Promise<FCMSystemHealth> {
    console.log('🔍 Starting FCM system diagnostics...');
    
    try {
      // Get delivery stats with device breakdown
      const stats = await FCMReliabilityService.getDeliveryStats();
      
      // Get detailed user information
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('user_id, device_id, fcm_token, platform, updated_at, created_at')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('🔍 Error fetching user data:', error);
        return this.createErrorHealth('Failed to fetch user data');
      }

      // ✅ NEW: Detect duplicate token issues (users with 4+ devices)
      const userDeviceCounts = new Map<string, number>();
      tokens?.forEach(token => {
        const count = userDeviceCounts.get(token.user_id) || 0;
        userDeviceCounts.set(token.user_id, count + 1);
      });

      const duplicateTokenIssues = Array.from(userDeviceCounts.values())
        .filter(count => count > 3).length;

      // Analyze system health
      const health = this.analyzeSystemHealth(stats, tokens || [], duplicateTokenIssues);
      
      console.log('🔍 FCM diagnostics completed:', health);
      return health;
    } catch (error) {
      console.error('🔍 Error in runFullDiagnostics:', error);
      return this.createErrorHealth('Diagnostic system error');
    }
  }

  /**
   * ✅ ENHANCED: Test FCM delivery with device information
   */
  static async testUserDelivery(userId: string): Promise<FCMDiagnosticResult> {
    console.log('🔍 Testing FCM delivery for user:', userId);
    
    try {
      // Get all user's FCM tokens (all devices)
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, device_id, platform, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('🔍 Error fetching user tokens:', error);
        return {
          userId,
          hasToken: false,
          tokenValid: false,
          deviceCount: 0,
          devices: [],
          errorCount: 1
        };
      }

      const hasToken = tokens && tokens.length > 0;
      const devices = tokens?.map(token => {
        const lastUsed = new Date(token.updated_at);
        const now = new Date();
        const daysSinceLastUsed = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        const isValid = daysSinceLastUsed <= 7;

        return {
          deviceId: token.device_id,
          platform: token.platform,
          lastUsed: token.updated_at,
          isValid
        };
      }) || [];

      // Get most recent token
      const mostRecent = tokens?.[0];
      const tokenValid = mostRecent ? devices[0].isValid : false;

      // Test actual delivery (uses most recent device)
      let testResult: FCMDeliveryResult | undefined;
      if (hasToken && tokenValid) {
        testResult = await FCMReliabilityService.testNotification(userId);
      }

      const result: FCMDiagnosticResult = {
        userId,
        hasToken,
        tokenValid,
        deviceCount: devices.length,
        devices,
        lastUsed: mostRecent?.updated_at,
        platform: mostRecent?.platform,
        testResult,
        errorCount: testResult?.success ? 0 : 1
      };

      // ✅ NEW: Warn if user has many devices
      if (devices.length > 3) {
        console.warn(`⚠️ User ${userId} has ${devices.length} devices - potential duplicate tokens`);
      }

      console.log('🔍 User delivery test completed:', result);
      return result;
    } catch (error) {
      console.error('🔍 Error in testUserDelivery:', error);
      return {
        userId,
        hasToken: false,
        tokenValid: false,
        deviceCount: 0,
        devices: [],
        errorCount: 1
      };
    }
  }

  /**
   * ✅ NEW: Find and fix users with duplicate tokens
   */
  static async findAndFixDuplicateTokens(): Promise<{
    usersWithDuplicates: number;
    tokensRemoved: number;
    errors: string[];
  }> {
    console.log('🔍 Finding users with duplicate FCM tokens...');
    
    try {
      // Get all tokens grouped by user
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('id, user_id, device_id, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('🔍 Error fetching tokens:', error);
        return { usersWithDuplicates: 0, tokensRemoved: 0, errors: [error.message] };
      }

      // Group by user
      const userTokens = new Map<string, typeof tokens>();
      tokens?.forEach(token => {
        const userTokenList = userTokens.get(token.user_id) || [];
        userTokenList.push(token);
        userTokens.set(token.user_id, userTokenList);
      });

      let usersWithDuplicates = 0;
      let tokensRemoved = 0;
      const errors: string[] = [];

      // Process each user with duplicates
      for (const [userId, userTokenList] of userTokens.entries()) {
        if (userTokenList.length > 3) {
          usersWithDuplicates++;
          console.log(`🔍 User ${userId} has ${userTokenList.length} tokens, keeping 3 most recent`);

          // Keep 3 most recent, delete the rest
          const tokensToDelete = userTokenList.slice(3);
          
          for (const token of tokensToDelete) {
            try {
              const { error: deleteError } = await supabase
                .from('user_fcm_tokens')
                .delete()
                .eq('id', token.id);

              if (deleteError) {
                errors.push(`Failed to delete token ${token.id}: ${deleteError.message}`);
              } else {
                tokensRemoved++;
              }
            } catch (err) {
              errors.push(`Error deleting token: ${err}`);
            }
          }
        }
      }

      console.log(`🔍 Duplicate token cleanup: ${usersWithDuplicates} users, ${tokensRemoved} tokens removed`);

      return {
        usersWithDuplicates,
        tokensRemoved,
        errors
      };
    } catch (error) {
      console.error('🔍 Error in findAndFixDuplicateTokens:', error);
      return {
        usersWithDuplicates: 0,
        tokensRemoved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
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
      const { data: beforeTokens } = await supabase
        .from('user_fcm_tokens')
        .select('id');

      await FCMReliabilityService.cleanupInvalidTokens();

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
   * ✅ ENHANCED: Analyze system health with device awareness
   */
  private static analyzeSystemHealth(
    stats: any, 
    tokens: any[], 
    duplicateTokenIssues: number
  ): FCMSystemHealth {
    // Get unique users
    const uniqueUsers = new Set(tokens.map(t => t.user_id));
    const totalUsers = uniqueUsers.size;
    const usersWithTokens = stats.totalTokens;
    const totalDevices = stats.totalDevices;
    const validTokens = stats.validTokens;
    const invalidTokens = stats.invalidTokens;
    const recentActivity = stats.recentActivity;
    const deviceBreakdown = stats.deviceBreakdown;

    let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const recommendations: string[] = [];

    const tokenValidityRatio = totalUsers > 0 ? validTokens / totalUsers : 0;
    const activityRatio = totalUsers > 0 ? recentActivity / totalUsers : 0;

    // ✅ NEW: Check for duplicate token issues
    if (duplicateTokenIssues > 0) {
      systemStatus = 'degraded';
      recommendations.push(`Warning: ${duplicateTokenIssues} users have 4+ devices (possible duplicate tokens)`);
      recommendations.push('Action: Run findAndFixDuplicateTokens() to clean up');
    }

    if (tokenValidityRatio < 0.5) {
      systemStatus = 'critical';
      recommendations.push('Critical: Less than 50% of users have valid FCM tokens');
      recommendations.push('Action: Run token cleanup and encourage users to re-login');
    } else if (tokenValidityRatio < 0.8) {
      if (systemStatus === 'healthy') systemStatus = 'degraded';
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
      recommendations.push(`${totalDevices} active devices across ${totalUsers} users`);
    }

    return {
      totalUsers,
      usersWithTokens,
      totalDevices,
      validTokens,
      invalidTokens,
      recentActivity,
      duplicateTokenIssues,
      systemStatus,
      recommendations,
      deviceBreakdown
    };
  }

  private static createErrorHealth(error: string): FCMSystemHealth {
    return {
      totalUsers: 0,
      usersWithTokens: 0,
      totalDevices: 0,
      validTokens: 0,
      invalidTokens: 0,
      recentActivity: 0,
      duplicateTokenIssues: 0,
      systemStatus: 'critical',
      recommendations: [`Error: ${error}`],
      deviceBreakdown: {}
    };
  }

  /**
   * ✅ ENHANCED: Generate comprehensive diagnostic report
   */
  static async generateDiagnosticReport(): Promise<string> {
    console.log('🔍 Generating comprehensive FCM diagnostic report...');
    
    try {
      const health = await this.runFullDiagnostics();
      const cleanup = await this.cleanupAndReport();
      const duplicates = await this.findAndFixDuplicateTokens();
      
      const report = `
# 🔥 FCM Diagnostic Report
Generated: ${new Date().toISOString()}

## System Health: ${health.systemStatus.toUpperCase()}

### Statistics:
- Total Users: ${health.totalUsers}
- Total Devices: ${health.totalDevices}
- Users with Tokens: ${health.usersWithTokens}
- Valid Tokens: ${health.validTokens}
- Invalid Tokens: ${health.invalidTokens}
- Recent Activity (24h): ${health.recentActivity}
- Users with Duplicate Tokens (4+): ${health.duplicateTokenIssues}

### Device Breakdown:
${Object.entries(health.deviceBreakdown)
  .map(([platform, count]) => `- ${platform}: ${count} devices`)
  .join('\n')}

### Token Cleanup:
- Tokens Cleaned: ${cleanup.cleanedTokens}
- Tokens Remaining: ${cleanup.remainingTokens}
- Cleanup Errors: ${cleanup.errors.length}

### Duplicate Token Resolution:
- Users with Duplicates: ${duplicates.usersWithDuplicates}
- Tokens Removed: ${duplicates.tokensRemoved}
- Errors: ${duplicates.errors.length}

### Recommendations:
${health.recommendations.map(rec => `- ${rec}`).join('\n')}

### Next Steps:
1. Ensure FCMManager uses device_id in upsert operations
2. Run findAndFixDuplicateTokens() weekly
3. Monitor notification delivery rates per device
4. Set up automated token cleanup (7-day expiry)
5. Verify users aren't receiving duplicate notifications
`;

      console.log('🔍 Diagnostic report generated');
      return report;
    } catch (error) {
      console.error('🔍 Error generating diagnostic report:', error);
      return `Error generating report: ${error}`;
    }
  }

  /**
   * ✅ NEW: Quick fix for immediate duplicate removal
   */
  static async quickFixDuplicates(): Promise<void> {
    console.log('🔍 Running quick duplicate fix...');
    
    const result = await this.findAndFixDuplicateTokens();
    
    console.log('✅ Quick fix complete:', result);
    
    if (result.errors.length > 0) {
      console.error('❌ Errors during fix:', result.errors);
    }
  }
}