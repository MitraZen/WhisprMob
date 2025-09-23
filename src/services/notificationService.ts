import { NativeModules, Platform, Alert } from 'react-native';

const { NotificationModule } = NativeModules;

export interface NotificationService {
  showMessageNotification: (title: string, message: string, buddyName: string) => Promise<string>;
  showNoteNotification: (title: string, content: string) => Promise<string>;
  showGeneralNotification: (title: string, content: string) => Promise<string>;
  cancelAllNotifications: () => Promise<string>;
  testNotification: () => Promise<string>;
}

class NotificationServiceClass implements NotificationService {
  
  async showMessageNotification(title: string, message: string, buddyName: string): Promise<string> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      console.warn('NotificationModule not available');
      return 'NotificationModule not available';
    }
    
    try {
      const result = await NotificationModule.showMessageNotification(title, message, buddyName);
      console.log('Message notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending message notification:', error);
      throw error;
    }
  }
  
  async showNoteNotification(title: string, content: string): Promise<string> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      console.warn('NotificationModule not available');
      return 'NotificationModule not available';
    }
    
    try {
      const result = await NotificationModule.showNoteNotification(title, content);
      console.log('Note notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending note notification:', error);
      throw error;
    }
  }
  
  async showGeneralNotification(title: string, content: string): Promise<string> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      console.warn('NotificationModule not available');
      return 'NotificationModule not available';
    }
    
    try {
      const result = await NotificationModule.showGeneralNotification(title, content);
      console.log('General notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending general notification:', error);
      throw error;
    }
  }
  
  async cancelAllNotifications(): Promise<string> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      console.warn('NotificationModule not available');
      return 'NotificationModule not available';
    }
    
    try {
      const result = await NotificationModule.cancelAllNotifications();
      console.log('All notifications cancelled:', result);
      return result;
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      throw error;
    }
  }
  
  async testNotification(): Promise<string> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      console.warn('NotificationModule not available');
      Alert.alert('Test Notification', 'NotificationModule not available on this platform');
      return 'NotificationModule not available';
    }
    
    try {
      const result = await NotificationModule.testNotification();
      console.log('Test notification sent:', result);
      Alert.alert('Test Notification', 'Test notification sent successfully!');
      return result;
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Test Notification Error', `Failed to send test notification: ${error}`);
      throw error;
    }
  }
}

export const notificationService = new NotificationServiceClass();
