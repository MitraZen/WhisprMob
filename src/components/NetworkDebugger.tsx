import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SUPABASE_CONFIG } from '@/config/env';

export const NetworkDebugger = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runNetworkTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    addResult('Starting network tests...');
    
    try {
      // Test 1: Basic fetch to Supabase
      addResult('Test 1: Testing basic Supabase connection...');
      const response1 = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response1.ok) {
        addResult('✅ Test 1 PASSED: Basic Supabase connection successful');
      } else {
        addResult(`❌ Test 1 FAILED: HTTP ${response1.status} - ${response1.statusText}`);
      }
    } catch (error) {
      addResult(`❌ Test 1 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 2: Test user_profiles table
      addResult('Test 2: Testing user_profiles table access...');
      const response2 = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response2.ok) {
        addResult('✅ Test 2 PASSED: user_profiles table accessible');
      } else {
        addResult(`❌ Test 2 FAILED: HTTP ${response2.status} - ${response2.statusText}`);
        const errorText = await response2.text();
        addResult(`Error details: ${errorText}`);
      }
    } catch (error) {
      addResult(`❌ Test 2 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 3: Test with different headers
      addResult('Test 3: Testing with minimal headers...');
      const response3 = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
        },
      });
      
      if (response3.ok) {
        addResult('✅ Test 3 PASSED: Minimal headers work');
      } else {
        addResult(`❌ Test 3 FAILED: HTTP ${response3.status} - ${response3.statusText}`);
      }
    } catch (error) {
      addResult(`❌ Test 3 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    addResult('Network tests completed!');
    setIsTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Debugger</Text>
      <Text style={styles.subtitle}>Supabase URL: {SUPABASE_CONFIG.url}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isTesting && styles.buttonDisabled]} 
          onPress={runNetworkTests}
          disabled={isTesting}
        >
          <Text style={styles.buttonText}>
            {isTesting ? 'Testing...' : 'Run Network Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.45,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.45,
  },
  clearButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 5,
    lineHeight: 16,
  },
});

export default NetworkDebugger;



