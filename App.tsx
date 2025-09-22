import React from 'react';
import { StatusBar } from 'react-native';

import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/store/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;
