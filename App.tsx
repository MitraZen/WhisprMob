import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';

import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/store/AuthContext';
import { AdminProvider } from '@/store/AdminContext';
import { ThemeProvider, useTheme } from '@/store/ThemeContext';
import { WalkthroughProvider } from '@/store/WalkthroughContext';
import { GlobalAlertProvider } from '@/services/globalAlertManager';
import { notificationService } from '@/services/notificationService';
import { DirectWakeupService } from '@/services/directWakeupService';
import { supabase } from '@/config/supabase';
// Using SafeAreaView from react-native-safe-area-context at the app root

const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  
  // Phase 1: Handle FCM ping messages (Proposed Design)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('🔥 FCM message received in foreground:', remoteMessage);
      
      // Check if this is a ping message
      if (remoteMessage.data?.type === 'ping') {
        console.log('🔥 FCM ping received - handling wake-up...');
        await notificationService.handleFCMPing();
      }
    });

    return unsubscribe;
  }, []);

  // Phase 3: Handle direct wake-up signals (Proposed Design)
  useEffect(() => {
    console.log('🔄 Setting up direct wake-up signal handler...');
    
    // Set up app state listener for wake-up detection
    DirectWakeupService.setupAppStateListener();
    
    // Listen for wake-up signals from Supabase Realtime
    const channel = supabase.channel('wakeup-signals');
    
    channel.on('broadcast', { event: 'wakeup' }, (payload) => {
      console.log('🔄 Direct wake-up signal received:', payload);
      
      // Handle the wake-up signal
      if (payload.payload?.source === 'direct_wakeup') {
        console.log('🔄 Processing direct wake-up signal...');
        notificationService.handleFCMPing();
      }
    });
    
    channel.subscribe();
    
    return () => {
      console.log('🔄 Cleaning up wake-up signal handler...');
      channel.unsubscribe();
    };
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.primary} 
      />
      <AppNavigator />
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AdminProvider>
          <AuthProvider>
            <WalkthroughProvider>
              <GlobalAlertProvider>
                <AppContent />
              </GlobalAlertProvider>
            </WalkthroughProvider>
          </AuthProvider>
        </AdminProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
