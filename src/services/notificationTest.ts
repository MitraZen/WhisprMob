// Test notification functionality
import { notificationService } from './notificationService';

// Test function to verify notifications work
export const testNotification = async () => {
  try {
    console.log('🧪 Testing notification system...');
    
    // Test message notification
    const result = await notificationService.showMessageNotification(
      'Test Message',
      'This is a test message to verify notifications are working',
      'Test Buddy'
    );
    
    console.log('🧪 Test notification result:', result);
    return result;
  } catch (error) {
    console.error('🧪 Test notification failed:', error);
    throw error;
  }
};

// Test function to verify realtime payload handling
export const testRealtimePayload = async (payload: any) => {
  try {
    console.log('🧪 Testing realtime payload handling:', payload);
    
    if (payload && payload.new) {
      const buddyInfo = { name: 'Test Buddy' };
      
      await notificationService.showMessageNotification(
        'New Message',
        payload.new.content || 'Test content',
        buddyInfo.name
      );
      
      console.log('🧪 Realtime payload test successful');
    } else {
      console.warn('🧪 Invalid payload structure:', payload);
    }
  } catch (error) {
    console.error('🧪 Realtime payload test failed:', error);
  }
};
