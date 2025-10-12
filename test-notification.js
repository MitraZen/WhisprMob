// Simple test to verify notification system
const { notificationService } = require('./src/services/notificationService');

async function testNotification() {
  try {
    console.log('🧪 Testing notification system...');
    
    // Test basic notification
    await notificationService.showMessageNotification(
      'Test Message',
      'This is a test notification',
      'Test Buddy'
    );
    
    console.log('✅ Test notification sent successfully');
  } catch (error) {
    console.error('❌ Test notification failed:', error);
  }
}

testNotification();
