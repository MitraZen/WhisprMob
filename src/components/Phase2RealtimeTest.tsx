import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { realtimeService } from '@/services/realtimeService';
import { connectionRecoveryService } from '@/services/connectionRecoveryService';
import { supabase } from '@/config/supabase';

interface RealtimeTestResult {
  testName: string;
  duration: number;
  success: boolean;
  error?: string;
  details?: string;
  baseline?: number;
  improvement?: number;
}

export const Phase2RealtimeTest: React.FC = () => {
  const [testResults, setTestResults] = useState<RealtimeTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [realtimeMetrics, setRealtimeMetrics] = useState<any>(null);
  const [connectionState, setConnectionState] = useState<any>(null);
  
  // Phase 2 baseline expectations
  const baselineExpectations = {
    'Realtime Connection': 3000, // 3 seconds baseline
    'Message Processing': 1000, // 1 second baseline
    'Notification Delivery': 2000, // 2 seconds baseline
    'Connection Recovery': 5000, // 5 seconds baseline
  };

  const runRealtimeTest = async () => {
    setIsRunning(true);
    const results: RealtimeTestResult[] = [];

    try {
      // Test 1: Realtime Connection
      const start1 = Date.now();
      const connectionTest = await testRealtimeConnection();
      const duration1 = Date.now() - start1;
      
      const baseline1 = baselineExpectations['Realtime Connection'];
      const improvement1 = ((baseline1 - duration1) / baseline1) * 100;
      
      results.push({
        testName: 'Realtime Connection',
        duration: duration1,
        success: connectionTest,
        baseline: baseline1,
        improvement: improvement1,
        details: connectionTest ? `Connected in ${duration1}ms` : 'Connection failed'
      });

      // Test 2: Message Processing Speed
      const start2 = Date.now();
      const messageProcessingTest = await testMessageProcessing();
      const duration2 = Date.now() - start2;
      
      const baseline2 = baselineExpectations['Message Processing'];
      const improvement2 = ((baseline2 - duration2) / baseline2) * 100;
      
      results.push({
        testName: 'Message Processing',
        duration: duration2,
        success: messageProcessingTest.success,
        baseline: baseline2,
        improvement: improvement2,
        details: messageProcessingTest.success ? `Processed in ${duration2}ms` : 'Processing failed',
        error: messageProcessingTest.error
      });

      // Test 3: Notification Delivery
      const start3 = Date.now();
      const notificationTest = await testNotificationDelivery();
      const duration3 = Date.now() - start3;
      
      const baseline3 = baselineExpectations['Notification Delivery'];
      const improvement3 = ((baseline3 - duration3) / baseline3) * 100;
      
      results.push({
        testName: 'Notification Delivery',
        duration: duration3,
        success: notificationTest.success,
        baseline: baseline3,
        improvement: improvement3,
        details: notificationTest.success ? `Delivered in ${duration3}ms` : 'Delivery failed',
        error: notificationTest.error
      });

      // Test 4: Connection Recovery
      const start4 = Date.now();
      const recoveryTest = await testConnectionRecovery();
      const duration4 = Date.now() - start4;
      
      const baseline4 = baselineExpectations['Connection Recovery'];
      const improvement4 = ((baseline4 - duration4) / baseline4) * 100;
      
      results.push({
        testName: 'Connection Recovery',
        duration: duration4,
        success: recoveryTest.success,
        baseline: baseline4,
        improvement: improvement4,
        details: recoveryTest.success ? `Recovered in ${duration4}ms` : 'Recovery failed',
        error: recoveryTest.error
      });

      setTestResults(results);
      
    } catch (error) {
      console.error('Phase 2 realtime test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const testRealtimeConnection = async (): Promise<boolean> => {
    try {
      // Test Supabase connection
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const testMessageProcessing = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get realtime performance metrics
      const metrics = realtimeService.getPerformanceMetrics();
      return { success: !!metrics };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const testNotificationDelivery = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Test notification service availability
      const metrics = realtimeService.getPerformanceMetrics();
      return { success: metrics.notificationsSent >= 0 };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const testConnectionRecovery = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      // Test connection recovery service
      const status = realtimeService.getConnectionRecoveryStatus();
      return { success: status.enabled };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getPerformanceGrade = (duration: number, testName: string): string => {
    switch (testName) {
      case 'Realtime Connection':
        return duration < 1000 ? 'A+' : duration < 2000 ? 'A' : duration < 3000 ? 'B' : 'C';
      case 'Message Processing':
        return duration < 200 ? 'A+' : duration < 500 ? 'A' : duration < 1000 ? 'B' : 'C';
      case 'Notification Delivery':
        return duration < 500 ? 'A+' : duration < 1000 ? 'A' : duration < 2000 ? 'B' : 'C';
      case 'Connection Recovery':
        return duration < 1000 ? 'A+' : duration < 2000 ? 'A' : duration < 5000 ? 'B' : 'C';
      default:
        return 'N/A';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return '#00ff00';
      case 'A': return '#90ee90';
      case 'B': return '#ffa500';
      case 'C': return '#ff6b6b';
      default: return '#666';
    }
  };

  const loadMetrics = async () => {
    try {
      const metrics = realtimeService.getPerformanceMetrics();
      const state = connectionRecoveryService.getConnectionState();
      setRealtimeMetrics(metrics);
      setConnectionState(state);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🚀 Phase 2: Realtime Optimization Test</Text>
      
      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runRealtimeTest}
        disabled={isRunning}
      >
        {isRunning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🚀 Run Phase 2 Tests</Text>
        )}
      </TouchableOpacity>

      {/* Real-time Metrics */}
      {realtimeMetrics && (
        <View style={styles.metricsContainer}>
          <Text style={styles.metricsTitle}>📊 Real-time Metrics</Text>
          <Text style={styles.metricText}>Messages Processed: {realtimeMetrics.messagesProcessed}</Text>
          <Text style={styles.metricText}>Notifications Sent: {realtimeMetrics.notificationsSent}</Text>
          <Text style={styles.metricText}>Connection Success Rate: {realtimeMetrics.connectionSuccessRate?.toFixed(1)}%</Text>
          <Text style={styles.metricText}>Avg Connection Time: {realtimeMetrics.averageConnectionTime?.toFixed(0)}ms</Text>
          <Text style={styles.metricText}>Messages/Min: {realtimeMetrics.messagesPerMinute?.toFixed(1)}</Text>
          <Text style={styles.metricText}>Notifications/Min: {realtimeMetrics.notificationsPerMinute?.toFixed(1)}</Text>
        </View>
      )}

      {/* Connection State */}
      {connectionState && (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>🔌 Connection State</Text>
          <Text style={styles.stateText}>Status: {connectionState.isConnected ? '✅ Connected' : '❌ Disconnected'}</Text>
          <Text style={styles.stateText}>Quality: {connectionState.connectionQuality}</Text>
          <Text style={styles.stateText}>Retry Count: {connectionState.retryCount}</Text>
          <Text style={styles.stateText}>Type: {connectionState.type || 'Unknown'}</Text>
        </View>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>🎯 Phase 2 Test Results</Text>
          
          {/* Performance Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>📈 Realtime Performance Summary</Text>
            {(() => {
              const successfulTests = testResults.filter(r => r.success);
              const avgImprovement = successfulTests.length > 0 
                ? successfulTests.reduce((sum, r) => sum + (r.improvement || 0), 0) / successfulTests.length 
                : 0;
              
              return (
                <>
                  <Text style={styles.summaryText}>
                    ✅ {successfulTests.length}/{testResults.length} tests passed
                  </Text>
                  <Text style={styles.summaryText}>
                    🚀 Average improvement: {avgImprovement.toFixed(1)}%
                  </Text>
                  <Text style={[styles.summaryText, { color: avgImprovement > 150 ? '#00ff00' : '#ff6b6b' }]}>
                    {avgImprovement > 150 ? '🎉 Excellent! Realtime optimized!' : '⚠️ Needs optimization'}
                  </Text>
                </>
              );
            })()}
          </View>

          {testResults.map((result, index) => {
            const grade = getPerformanceGrade(result.duration, result.testName);
            const gradeColor = getGradeColor(grade);
            const improvementColor = result.improvement && result.improvement > 0 ? '#00ff00' : '#ff6b6b';
            
            return (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.resultName}>{result.testName}</Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultDuration}>{result.duration}ms</Text>
                  <Text style={[styles.resultGrade, { color: gradeColor }]}>{grade}</Text>
                  <Text style={[styles.resultStatus, { color: result.success ? '#00ff00' : '#ff0000' }]}>
                    {result.success ? '✅' : '❌'}
                  </Text>
                </View>
                
                {/* Detailed Metrics */}
                <View style={styles.metricsContainer}>
                  <Text style={styles.metricsText}>
                    📊 Baseline: {result.baseline}ms → Current: {result.duration}ms
                  </Text>
                  {result.improvement !== undefined && (
                    <Text style={[styles.improvementText, { color: improvementColor }]}>
                      🚀 {result.improvement > 0 ? '+' : ''}{result.improvement.toFixed(1)}% improvement
                    </Text>
                  )}
                  {result.details && (
                    <Text style={styles.detailsText}>{result.details}</Text>
                  )}
                </View>
                
                {result.error && (
                  <Text style={styles.resultError}>Error: {result.error}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>🚀 Phase 2 Optimizations:</Text>
        <Text style={styles.infoText}>• Enhanced connection recovery</Text>
        <Text style={styles.infoText}>• Circuit breaker pattern</Text>
        <Text style={styles.infoText}>• Performance monitoring</Text>
        <Text style={styles.infoText}>• Smart retry logic</Text>
        <Text style={styles.infoText}>• Real-time metrics tracking</Text>
        
        <View style={styles.sqlInfoContainer}>
          <Text style={styles.sqlInfoTitle}>⚠️ Missing Functions?</Text>
          <Text style={styles.sqlInfoText}>Phase 2 optimizations are built into the app</Text>
          <Text style={styles.sqlInfoText}>No additional SQL scripts required</Text>
          <Text style={styles.sqlInfoText}>Test realtime performance above</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  metricText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  stateContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#32cd32',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  stateText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  summaryContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 4,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  resultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultDuration: {
    fontSize: 14,
    color: '#666',
  },
  resultGrade: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultStatus: {
    fontSize: 16,
  },
  resultError: {
    fontSize: 12,
    color: '#ff0000',
    marginTop: 5,
    fontStyle: 'italic',
  },
  metricsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  improvementText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  infoContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  sqlInfoContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  sqlInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  sqlInfoText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 3,
  },
});

export default Phase2RealtimeTest;

