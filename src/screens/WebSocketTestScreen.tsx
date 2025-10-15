import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { WebSocketTest, testWebSocketConnection, quickWebSocketTest } from '@/utils/websocketTest';
import { supabase } from '@/config/supabase';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  timestamp?: string;
}

const WebSocketTestScreen: React.FC = () => {
  const { theme } = useTheme();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (name: string, status: TestResult['status'], message: string) => {
    setTestResults(prev => [...prev, {
      name,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runBasicConnectionTest = async () => {
    addTestResult('Basic WebSocket Connection', 'running', 'Testing WebSocket connectivity...');
    
    try {
      const result = await quickWebSocketTest();
      addTestResult(
        'Basic WebSocket Connection', 
        result ? 'success' : 'error',
        result ? 'WebSocket connection successful!' : 'WebSocket connection failed'
      );
    } catch (error) {
      addTestResult(
        'Basic WebSocket Connection', 
        'error',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    clearResults();
    
    addTestResult('Comprehensive WebSocket Test', 'running', 'Starting comprehensive tests...');
    
    try {
      const results = await testWebSocketConnection();
      
      addTestResult(
        'Comprehensive WebSocket Test', 
        'success',
        `Tests completed. Overall result: ${results ? 'PASS' : 'FAIL'}`
      );
    } catch (error) {
      addTestResult(
        'Comprehensive WebSocket Test', 
        'error',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    
    setIsRunning(false);
  };

  const testSupabaseRealtime = async () => {
    addTestResult('Supabase Realtime Test', 'running', 'Testing Supabase realtime subscription...');
    
    try {
      const channel = supabase.channel('test-channel');
      
      const subscription = channel
        .on('presence', { event: 'sync' }, () => {
          addTestResult(
            'Supabase Realtime Test', 
            'success',
            'Supabase realtime subscription successful!'
          );
          channel.unsubscribe();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Test channel subscribed');
            channel.track({ user: 'test', online_at: new Date().toISOString() });
          } else if (status === 'CHANNEL_ERROR') {
            addTestResult(
              'Supabase Realtime Test', 
              'error',
              'Supabase realtime subscription failed'
            );
            channel.unsubscribe();
          }
        });

      // Timeout after 10 seconds
      setTimeout(() => {
        channel.unsubscribe();
        if (testResults.find(r => r.name === 'Supabase Realtime Test' && r.status === 'running')) {
          addTestResult(
            'Supabase Realtime Test', 
            'error',
            'Test timed out after 10 seconds'
          );
        }
      }, 10000);

    } catch (error) {
      addTestResult(
        'Supabase Realtime Test', 
        'error',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const testDatabaseRealtime = async () => {
    addTestResult('Database Realtime Test', 'running', 'Testing database realtime changes...');
    
    try {
      const channel = supabase.channel('db-test-channel');
      
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whisprs'
          },
          (payload) => {
            addTestResult(
              'Database Realtime Test', 
              'success',
              `Database realtime working! Event: ${payload.eventType}`
            );
            channel.unsubscribe();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            addTestResult(
              'Database Realtime Test', 
              'success',
              'Database realtime subscription active (no changes detected)'
            );
            // Unsubscribe after 5 seconds if no changes
            setTimeout(() => {
              channel.unsubscribe();
            }, 5000);
          } else if (status === 'CHANNEL_ERROR') {
            addTestResult(
              'Database Realtime Test', 
              'error',
              'Database realtime subscription failed'
            );
            channel.unsubscribe();
          }
        });

    } catch (error) {
      addTestResult(
        'Database Realtime Test', 
        'error',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return theme.colors.success;
      case 'error': return theme.colors.error;
      case 'running': return theme.colors.warning;
      default: return theme.colors.onSurface;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>
          🧪 WebSocket Test Suite
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>
          Test WebSocket connectivity and real-time functionality
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={runBasicConnectionTest}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            🔌 Test Basic Connection
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.secondary }]}
          onPress={testSupabaseRealtime}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onSecondary }]}>
            📡 Test Supabase Realtime
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.tertiary }]}
          onPress={testDatabaseRealtime}
          disabled={isRunning}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onTertiary }]}>
            🗄️ Test Database Realtime
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.fullWidthButton, { backgroundColor: theme.colors.primary }]}
          onPress={runComprehensiveTest}
          disabled={isRunning}
          testID="run-all-tests-button"
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            🚀 Run All Tests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton, { borderColor: theme.colors.outline }]}
          onPress={clearResults}
          testID="clear-results-button"
        >
          <Text style={[styles.buttonText, { color: theme.colors.onSurface }]}>
            🗑️ Clear Results
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={[styles.resultsTitle, { color: theme.colors.onBackground }]}>
          Test Results
        </Text>
        
        {testResults.length === 0 ? (
          <Text style={[styles.noResults, { color: theme.colors.onSurface }]}>
            No tests run yet. Tap a test button above to get started.
          </Text>
        ) : (
          testResults.map((result, index) => (
            <View key={index} style={[styles.resultItem, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.resultIcon]}>{getStatusIcon(result.status)}</Text>
                <Text style={[styles.resultName, { color: theme.colors.onSurface }]}>
                  {result.name}
                </Text>
                <Text style={[styles.resultTime, { color: theme.colors.onSurface }]}>
                  {result.timestamp}
                </Text>
              </View>
              <Text style={[styles.resultMessage, { color: getStatusColor(result.status) }]}>
                {result.message}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  fullWidthButton: {
    marginTop: 8,
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noResults: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 32,
  },
  resultItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  resultMessage: {
    fontSize: 14,
    marginLeft: 24,
  },
});

export default WebSocketTestScreen;
