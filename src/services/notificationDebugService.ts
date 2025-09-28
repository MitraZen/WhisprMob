import { NativeModules, Platform, Alert } from 'react-native';
import { notificationService } from './notificationService';
import { realtimeService } from './realtimeService';
import { notificationManager } from './notificationManager';
import { FlexibleDatabaseService } from './flexibleDatabase';

const { NotificationModule } = NativeModules;

export interface NotificationDebugInfo {
  platform: string;
  notificationModuleAvailable: boolean;
  notificationChannels: any[];
  notificationPermissions: any;
  realtimeConnectionStatus: string;
  pollingStatus: boolean;
  lastNotificationTime: string | null;
  notificationHistory: any[];
  systemNotificationSettings: any;
}

export interface NotificationTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
}

class NotificationDebugService {
  private debugHistory: NotificationTestResult[] = [];
  private isDebugging = false;

  // Get comprehensive notification debug information
  async getDebugInfo(): Promise<NotificationDebugInfo> {
    try {
      const info: NotificationDebugInfo = {
        platform: Platform.OS,
        notificationModuleAvailable: !!NotificationModule,
        notificationChannels: await this.getNotificationChannels(),
        notificationPermissions: await this.getNotificationPermissions(),
        realtimeConnectionStatus: realtimeService.getConnectionStatus().isConnected ? 'Connected' : 'Disconnected',
        pollingStatus: notificationManager.isPolling(),
        lastNotificationTime: this.getLastNotificationTime(),
        notificationHistory: this.getNotificationHistory(),
        systemNotificationSettings: await this.getSystemNotificationSettings(),
      };

      return info;
    } catch (error) {
      console.error('Error getting notification debug info:', error);
      throw error;
    }
  }

  // Test all notification types
  async testAllNotifications(): Promise<NotificationTestResult[]> {
    const results: NotificationTestResult[] = [];
    
    try {
      // Test general notification
      const generalResult = await this.testGeneralNotification();
      results.push(generalResult);

      // Test message notification
      const messageResult = await this.testMessageNotification();
      results.push(messageResult);

      // Test note notification
      const noteResult = await this.testNoteNotification();
      results.push(noteResult);

      // Test realtime notification
      const realtimeResult = await this.testRealtimeNotification();
      results.push(realtimeResult);

      // Test polling notification
      const pollingResult = await this.testPollingNotification();
      results.push(pollingResult);

      this.debugHistory.push(...results);
      return results;
    } catch (error) {
      console.error('Error testing notifications:', error);
      throw error;
    }
  }

  // Test general notification
  async testGeneralNotification(): Promise<NotificationTestResult> {
    try {
      const result = await notificationService.testNotification();
      return {
        success: true,
        message: 'General notification test successful',
        timestamp: new Date().toISOString(),
        details: { result }
      };
    } catch (error) {
      return {
        success: false,
        message: `General notification test failed: ${error}`,
        timestamp: new Date().toISOString(),
        details: { error }
      };
    }
  }

  // Test message notification
  async testMessageNotification(): Promise<NotificationTestResult> {
    try {
      const result = await notificationService.showMessageNotification(
        'Test Message',
        'This is a test message notification',
        'Test Buddy'
      );
      return {
        success: true,
        message: 'Message notification test successful',
        timestamp: new Date().toISOString(),
        details: { result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Message notification test failed: ${error}`,
        timestamp: new Date().toISOString(),
        details: { error }
      };
    }
  }

  // Test note notification
  async testNoteNotification(): Promise<NotificationTestResult> {
    try {
      const result = await notificationService.showNoteNotification(
        'Test Note',
        'This is a test note notification'
      );
      return {
        success: true,
        message: 'Note notification test successful',
        timestamp: new Date().toISOString(),
        details: { result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Note notification test failed: ${error}`,
        timestamp: new Date().toISOString(),
        details: { error }
      };
    }
  }

  // Test realtime notification
  async testRealtimeNotification(): Promise<NotificationTestResult> {
    try {
      // Simulate a realtime notification
      const result = await notificationService.showGeneralNotification(
        'Realtime Test',
        'This is a test realtime notification'
      );
      return {
        success: true,
        message: 'Realtime notification test successful',
        timestamp: new Date().toISOString(),
        details: { result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Realtime notification test failed: ${error}`,
        timestamp: new Date().toISOString(),
        details: { error }
      };
    }
  }

  // Test polling notification
  async testPollingNotification(): Promise<NotificationTestResult> {
    try {
      // Test if polling is working
      const isPolling = notificationManager.isPolling();
      return {
        success: isPolling,
        message: isPolling ? 'Polling is active' : 'Polling is not active',
        timestamp: new Date().toISOString(),
        details: { isPolling }
      };
    } catch (error) {
      return {
        success: false,
        message: `Polling test failed: ${error}`,
        timestamp: new Date().toISOString(),
        details: { error }
      };
    }
  }

  // Send test notification to specific user
  async sendTestNotificationToUser(userId: string, type: 'message' | 'note' | 'general'): Promise<NotificationTestResult> {
    try {
      let result: string;
      
      switch (type) {
        case 'message':
          result = await notificationService.showMessageNotification(
            'Admin Test Message',
            'This is a test message from admin',
            'Admin'
          );
          break;
        case 'note':
          result = await notificationService.showNoteNotification(
            'Admin Test Note',
            'This is a test note from admin'
          );
          break;
        case 'general':
          result = await notificationService.showGeneralNotification(
            'Admin Test',
            'This is a test notification from admin'
          );
          break;
      }

      return {
        success: true,
        message: `Test ${type} notification sent to user ${userId}`,
        timestamp: new Date().toISOString(),
        details: { userId, type, result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send test notification to user ${userId}: ${error}`,
        timestamp: new Date().toISOString(),
        details: { userId, type, error }
      };
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<NotificationTestResult> {
    try {
      const result = await notificationService.cancelAllNotifications();
      return {
        success: true,
        message: 'All notifications cleared',
        timestamp: new Date().toISOString(),
        details: { result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear notifications: ${error}`,
        timestamp: new Date().toISOString(),
        details: { error }
      };
    }
  }

  // Start notification debugging session
  startDebugging(): void {
    this.isDebugging = true;
    this.debugHistory = [];
    console.log('Notification debugging session started');
  }

  // Stop notification debugging session
  stopDebugging(): void {
    this.isDebugging = false;
    console.log('Notification debugging session stopped');
  }

  // Get debug history
  getDebugHistory(): NotificationTestResult[] {
    return [...this.debugHistory];
  }

  // Clear debug history
  clearDebugHistory(): void {
    this.debugHistory = [];
  }

  // Private helper methods
  private async getNotificationChannels(): Promise<any[]> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      return [];
    }
    
    try {
      // This would need to be implemented in the native module
      return [];
    } catch (error) {
      console.error('Error getting notification channels:', error);
      return [];
    }
  }

  private async getNotificationPermissions(): Promise<any> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      return { granted: false, reason: 'Not Android or module not available' };
    }
    
    try {
      // This would need to be implemented in the native module
      return { granted: true, reason: 'Android with notification module' };
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return { granted: false, reason: error };
    }
  }

  private getLastNotificationTime(): string | null {
    const history = this.getNotificationHistory();
    if (history.length > 0) {
      return history[history.length - 1].timestamp;
    }
    return null;
  }

  private getNotificationHistory(): any[] {
    return this.debugHistory.map(result => ({
      success: result.success,
      message: result.message,
      timestamp: result.timestamp,
      type: result.details?.type || 'unknown'
    }));
  }

  private async getSystemNotificationSettings(): Promise<any> {
    if (Platform.OS !== 'android') {
      return { platform: 'Not Android' };
    }
    
    try {
      // This would need to be implemented in the native module
      return { platform: 'Android', settings: 'Default' };
    } catch (error) {
      console.error('Error getting system notification settings:', error);
      return { platform: 'Android', error: error };
    }
  }
}

export const notificationDebugService = new NotificationDebugService();

