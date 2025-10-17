import React from 'react';
import { StatusBar } from 'react-native';

import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/store/AuthContext';
import { AdminProvider } from '@/store/AdminContext';
import { ThemeProvider, useTheme } from '@/store/ThemeContext';
import { WalkthroughProvider } from '@/store/WalkthroughContext';
import { GlobalAlertProvider } from '@/services/globalAlertManager';

const AppContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.colors.primary} 
      />
      <AppNavigator />
    </>
  );
};

const App: React.FC = () => {
  return (
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
  );
};

export default App;
