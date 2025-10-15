import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';

const AuthStatusDebugger: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 50,
      right: 10,
      backgroundColor: theme.colors.surface,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      zIndex: 1000,
    },
    text: {
      fontSize: 12,
      color: theme.colors.onSurface,
      marginBottom: 2,
    },
    statusText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: isAuthenticated ? '#4CAF50' : '#F44336',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Auth Status:</Text>
      <Text style={styles.statusText}>
        {isLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </Text>
      {user && (
        <>
          <Text style={styles.text}>User ID: {user.id.substring(0, 8)}...</Text>
          <Text style={styles.text}>Mood: {user.mood || 'Not set'}</Text>
        </>
      )}
    </View>
  );
};

export default AuthStatusDebugger;
