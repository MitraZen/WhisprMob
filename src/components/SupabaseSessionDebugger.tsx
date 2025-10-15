import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';

const SupabaseSessionDebugger: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const theme = useTheme();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSupabaseSession();
  }, []);

  const checkSupabaseSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      setSessionInfo({
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at,
        error: error?.message,
      });
    } catch (error) {
      setSessionInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      setSessionInfo({
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        expiresAt: session?.expires_at,
        error: error?.message,
      });
    } catch (error) {
      setSessionInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 100,
      right: 10,
      backgroundColor: theme.colors.surface,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      zIndex: 1000,
      maxWidth: 300,
    },
    text: {
      fontSize: 12,
      color: theme.colors.onSurface,
      marginBottom: 2,
    },
    statusText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: sessionInfo?.hasSession ? '#4CAF50' : '#F44336',
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 5,
      borderRadius: 4,
      marginTop: 5,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontSize: 10,
      textAlign: 'center',
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Checking Supabase session...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Supabase Session:</Text>
      <Text style={styles.statusText}>
        {sessionInfo?.hasSession ? 'Active' : 'Inactive'}
      </Text>
      
      {sessionInfo?.userId && (
        <Text style={styles.text}>Session User: {sessionInfo.userId.substring(0, 8)}...</Text>
      )}
      
      {sessionInfo?.userEmail && (
        <Text style={styles.text}>Email: {sessionInfo.userEmail}</Text>
      )}
      
      {sessionInfo?.error && (
        <Text style={[styles.text, { color: '#F44336' }]}>Error: {sessionInfo.error}</Text>
      )}
      
      <TouchableOpacity style={styles.button} onPress={refreshSession}>
        <Text style={styles.buttonText}>Refresh Session</Text>
      </TouchableOpacity>
      
      <Text style={styles.text}>App Auth: {isAuthenticated ? 'Yes' : 'No'}</Text>
      {user && (
        <Text style={styles.text}>App User: {user.id.substring(0, 8)}...</Text>
      )}
    </View>
  );
};

export default SupabaseSessionDebugger;
