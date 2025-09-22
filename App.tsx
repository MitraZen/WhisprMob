import React from 'react';
import { StatusBar } from 'react-native';

import AppNavigator from '@/navigation/AppNavigator';
import { AuthProvider } from '@/store/AuthContext';
import { AdminProvider } from '@/store/AdminContext';

const App: React.FC = () => {
  return (
    <AdminProvider>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <AppNavigator />
      </AuthProvider>
    </AdminProvider>
  );
};

export default App;
