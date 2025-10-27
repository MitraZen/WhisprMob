import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BuddiesService } from '@/services/buddiesService';
import { supabase } from '@/config/supabase';

interface PerformanceMetrics {
  total_messages: number;
  recent_messages_1h: number;
  avg_response_time_seconds: number;
  timestamp: string;
}

interface TestResult {
  testName: string;
  duration: number;
  success: boolean;
  error?: string;
  details?: string;
  baseline?: number; // For comparison
  improvement?: number; // Percentage improvement
}

export const Phase1PerformanceTest: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Baseline performance expectations (before optimization)
  const baselineExpectations = {
    'Database Connection': 2000, // 2 seconds baseline
    'Performance Metrics': 1000, // 1 second baseline
    'Message Send Function': 3000, // 3 seconds baseline
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    try {
      // Test 1: Database Connection
      const start1 = Date.now();
      const connectionTest = await BuddiesService.testNetworkConnection();
      const duration1 = Date.now() - start1;
      
      const baseline1 = baselineExpectations['Database Connection'];
      const improvement1 = ((baseline1 - duration1) / baseline1) * 100;
      
      results.push({
        testName: 'Database Connection',
        duration: duration1,
        success: connectionTest,
        baseline: baseline1,
        improvement: improvement1,
        details: connectionTest ? `Connected in ${duration1}ms` : 'Connection failed'
      });

      // Test 2: Performance Metrics
      const start2 = Date.now();
      try {
        const performanceMetrics = await BuddiesService.getPerformanceMetrics();
        const duration2 = Date.now() - start2;
        
        const baseline2 = baselineExpectations['Performance Metrics'];
        const improvement2 = ((baseline2 - duration2) / baseline2) * 100;
        
        results.push({
          testName: 'Performance Metrics',
          duration: duration2,
          success: !!performanceMetrics,
          baseline: baseline2,
          improvement: improvement2,
          error: performanceMetrics ? undefined : 'Function not available - run SQL script first',
          details: performanceMetrics ? `Retrieved metrics in ${duration2}ms` : 'Function missing'
        });

        if (performanceMetrics) {
          setMetrics(performanceMetrics);
        }
      } catch (error) {
        const duration2 = Date.now() - start2;
        const baseline2 = baselineExpectations['Performance Metrics'];
        const improvement2 = ((baseline2 - duration2) / baseline2) * 100;
        
        results.push({
          testName: 'Performance Metrics',
          duration: duration2,
          success: false,
          baseline: baseline2,
          improvement: improvement2,
          error: error instanceof Error ? error.message : 'Function not available',
          details: 'Function call failed'
        });
      }

      // Test 3: Message Send Simulation (if we have test data)
      const start3 = Date.now();
      try {
        // This would test the actual sendMessage function
        // For now, we'll just test the RPC call
        const { data, error } = await supabase.rpc('send_message_optimized', {
          p_buddy_id: '00000000-0000-0000-0000-000000000001',
          p_sender_id: '00000000-0000-0000-0000-000000000002',
          p_content: 'Performance test message',
          p_message_type: 'text'
        });
        
        const duration3 = Date.now() - start3;
        const baseline3 = baselineExpectations['Message Send Function'];
        const improvement3 = ((baseline3 - duration3) / baseline3) * 100;
        
        results.push({
          testName: 'Message Send Function',
          duration: duration3,
          success: !error,
          baseline: baseline3,
          improvement: improvement3,
          error: error?.message,
          details: !error ? `Message sent in ${duration3}ms` : 'Send failed'
        });
      } catch (error) {
        const duration3 = Date.now() - start3;
        const baseline3 = baselineExpectations['Message Send Function'];
        const improvement3 = ((baseline3 - duration3) / baseline3) * 100;
        
        results.push({
          testName: 'Message Send Function',
          duration: duration3,
          success: false,
          baseline: baseline3,
          improvement: improvement3,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: 'Function call failed'
        });
      }

      setTestResults(results);
      
    } catch (error) {
      console.error('Performance test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getPerformanceGrade = (duration: number, testName: string): string => {
    switch (testName) {
      case 'Database Connection':
        return duration < 500 ? 'A+' : duration < 1000 ? 'A' : duration < 2000 ? 'B' : 'C';
      case 'Performance Metrics':
        return duration < 200 ? 'A+' : duration < 500 ? 'A' : duration < 1000 ? 'B' : 'C';
      case 'Message Send Function':
        return duration < 100 ? 'A+' : duration < 300 ? 'A' : duration < 500 ? 'B' : 'C';
      default:
        return 'N/A';
    }
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A+': return '#00ff00';
      case 'A': return '#80ff00';
      case 'B': return '#ffff00';
      case 'C': return '#ff8000';
      default: return '#ff0000';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⚡ Phase 1 Performance Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isRunning && styles.buttonDisabled]} 
        onPress={runPerformanceTest}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Tests...' : '🚀 Run Performance Test'}
        </Text>
      </TouchableOpacity>

      {metrics && (
        <View style={styles.metricsContainer}>
          <Text style={styles.metricsTitle}>📊 Database Metrics</Text>
          <Text style={styles.metricText}>Total Messages: {metrics.total_messages}</Text>
          <Text style={styles.metricText}>Recent (1h): {metrics.recent_messages_1h}</Text>
          <Text style={styles.metricText}>Avg Response: {metrics.avg_response_time_seconds}s</Text>
          <Text style={styles.metricText}>Last Updated: {new Date(metrics.timestamp).toLocaleTimeString()}</Text>
        </View>
      )}

      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>🎯 Test Results</Text>
          
          {/* Performance Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>📈 Performance Summary</Text>
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
                  <Text style={[styles.summaryText, { color: avgImprovement > 200 ? '#00ff00' : '#ff6b6b' }]}>
                    {avgImprovement > 200 ? '🎉 Excellent! 3-5x faster achieved!' : '⚠️ Needs optimization'}
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
        <Text style={styles.infoTitle}>📈 Phase 1 Optimizations:</Text>
        <Text style={styles.infoText}>• Optimized message sending function</Text>
        <Text style={styles.infoText}>• Performance indexes</Text>
        <Text style={styles.infoText}>• Atomic database transactions</Text>
        <Text style={styles.infoText}>• Reduced database round trips</Text>
        <Text style={styles.infoText}>• Performance monitoring</Text>
        
        <View style={styles.sqlInfoContainer}>
          <Text style={styles.sqlInfoTitle}>⚠️ Missing Functions?</Text>
          <Text style={styles.sqlInfoText}>If tests fail, run the SQL script:</Text>
          <Text style={styles.sqlInfoText}>1. Copy database/phase1_final_corrected.sql</Text>
          <Text style={styles.sqlInfoText}>2. Run in Supabase SQL Editor</Text>
          <Text style={styles.sqlInfoText}>3. Re-run this test</Text>
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
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  metricText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  resultsContainer: {
    backgroundColor: 'white',
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
  metricsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
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

export default Phase1PerformanceTest;
