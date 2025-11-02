import { AppState } from 'react-native';
import { notificationService } from './notificationService';

/**
 * Comprehensive diagnostic to test background notification behavior
 * Add this to your message handler to see exactly what's happening
 */
export function diagnoseBackgroundNotifications(
  buddyName: string,
  buddyId: string,
  content: string
): void {
  const timestamp = new Date().toISOString();
  
  console.log('🔍 ===== BACKGROUND NOTIFICATION DIAGNOSTIC =====');
  console.log('🔍 Timestamp:', timestamp);
  console.log('🔍 AppState.currentState:', AppState.currentState);
  console.log('🔍 Is Background?', AppState.currentState !== 'active');
  console.log('🔍 Buddy:', buddyName);
  console.log('🔍 Message:', content.substring(0, 50));
  
  // Test 1: Can we execute JavaScript?
  console.log('🔍 TEST 1: JavaScript execution - ✅ WORKING (you see this log)');
  
  // Test 2: Can we call setTimeout?
  const timerTestStart = Date.now();
  setTimeout(() => {
    const timerDelay = Date.now() - timerTestStart;
    console.log(`🔍 TEST 2: setTimeout fired after ${timerDelay}ms`);
    if (timerDelay > 1500) {
      console.warn('⚠️ Timer was delayed significantly - JavaScript may be throttled');
    }
  }, 1000);
  
  // Test 3: Can we call notification service directly? (DISABLED - causes duplicate notifications)
  console.log('🔍 TEST 3: Testing notification service (call DISABLED to prevent duplicates)...');
  
  // ❌ DISABLED: Don't actually call notification service - it causes duplicate notifications
  // The Phase 3 service will handle notifications correctly
  // Just verify the service exists
  console.log('🔍 TEST 3: Notification service exists?', !!notificationService);
  console.log('🔍 TEST 3: showMessageNotification exists?', typeof notificationService.showMessageNotification);
  console.log('✅ TEST 3: Notification service available (actual notification handled by Phase 3)');
  
  // Test 4: Check notification service state
  console.log('🔍 TEST 4: Notification service state:');
  console.log('🔍 - Service exists?', !!notificationService);
  console.log('🔍 - showMessageNotification exists?', typeof notificationService.showMessageNotification);
  
  // Test 5: Try alternative direct notification method
  console.log('🔍 TEST 5: Testing PushNotification directly...');
  try {
    const PushNotification = require('react-native-push-notification');
    
    PushNotification.localNotification({
      channelId: 'whispr-messages',
      title: `[DIAGNOSTIC] ${buddyName}`,
      message: `[TEST] ${content}`,
      playSound: true,
      soundName: 'default',
      priority: 'high',
      importance: 'high',
    });
    
    console.log('✅ TEST 5: Direct PushNotification call completed');
  } catch (error) {
    console.error('❌ TEST 5: Direct PushNotification failed:', error);
  }
  
  console.log('🔍 ===== DIAGNOSTIC COMPLETE =====');
}

/**
 * Test background notifications with a simple button
 * Call this when user taps a test button in your app
 */
export async function testBackgroundNotificationManually(): Promise<void> {
  console.log('🧪 Manual background notification test started');
  
  const isBackground = AppState.currentState !== 'active';
  console.log('🧪 Current state:', AppState.currentState);
  console.log('🧪 Is background?', isBackground);
  
  if (!isBackground) {
    console.warn('⚠️ App is in foreground - press home button first, then trigger test remotely');
    return;
  }
  
  // Run diagnostic
  diagnoseBackgroundNotifications(
    'TestUser',
    'test-buddy-id',
    'This is a manual background test'
  );
}

/**
 * Add this to your message handler right before calling Phase 3
 */
export function instrumentMessageHandler(
  buddyName: string,
  buddyId: string,
  messageId: string,
  content: string
): void {
  const isBackground = AppState.currentState !== 'active';
  
  console.log('📊 Message Handler Instrumentation:');
  console.log('📊 - Is Background?', isBackground);
  console.log('📊 - Buddy:', buddyName);
  console.log('📊 - Message ID:', messageId.substring(0, 8));
  console.log('📊 - Content length:', content.length);
  console.log('📊 - Timestamp:', new Date().toISOString());
  
  if (isBackground) {
    console.log('📊 🚨 BACKGROUND MESSAGE - running diagnostic...');
    diagnoseBackgroundNotifications(buddyName, buddyId, content);
  }
}