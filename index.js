import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// ⚠️ TEMPORARY: Suppress modular API deprecation warnings until migration to v22 modular API is complete
// TODO: Migrate to modular API when React Native Firebase v22 stable is released
// See: https://rnfirebase.io/migrating-to-v22
if (typeof globalThis !== 'undefined') {
  globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

// ✅ CRITICAL: Set background handler BEFORE app initialization
// This must be called before AppRegistry.registerComponent
// Background messages can arrive when app is closed/killed
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🔥 Background FCM message:', remoteMessage);
  
  // Handle ping messages (wake up realtime)
  if (remoteMessage.data?.type === 'ping') {
    console.log('📡 FCM Ping received in background');
    // Ping will trigger realtime reconnection when app opens
    // No need to process here - app will handle on foreground
  }
  
  // Return void (background handler requirement)
  return Promise.resolve();
});

// Register app
AppRegistry.registerComponent('WhisprMobileTemp', () => App);


