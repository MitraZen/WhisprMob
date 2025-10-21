import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/store/AuthContext';
import { AdminProvider } from '@/store/AdminContext';
import { ThemeProvider, useTheme } from '@/store/ThemeContext';
import { WalkthroughProvider } from '@/store/WalkthroughContext';
import { GlobalAlertProvider } from '@/services/globalAlertManager';
// Using SafeAreaView from react-native-safe-area-context at the app root

const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  
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
