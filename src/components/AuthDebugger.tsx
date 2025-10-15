import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SUPABASE_CONFIG } from '@/config/env';
import { AuthService } from '@/services/authService';

export const AuthDebugger = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runAuthTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    addResult('🔍 Starting Authentication Debug Tests...');
    
    try {
      // Test 1: Basic Supabase Connection
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
        const errorText = await response1.text();
        addResult(`Error details: ${errorText}`);
      }
    } catch (error) {
      addResult(`❌ Test 1 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 2: Auth Settings Endpoint
      addResult('Test 2: Testing auth settings endpoint...');
      const response2 = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/settings`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        },
      });
      
      if (response2.ok) {
        addResult('✅ Test 2 PASSED: Auth settings accessible');
        const settings = await response2.json();
        addResult(`Auth settings: ${JSON.stringify(settings, null, 2)}`);
      } else {
        addResult(`❌ Test 2 FAILED: HTTP ${response2.status} - ${response2.statusText}`);
        const errorText = await response2.text();
        addResult(`Error details: ${errorText}`);
      }
    } catch (error) {
      addResult(`❌ Test 2 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 3: User Profiles Table Access
      addResult('Test 3: Testing user_profiles table access...');
      const response3 = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/user_profiles?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response3.ok) {
        addResult('✅ Test 3 PASSED: user_profiles table accessible');
      } else {
        addResult(`❌ Test 3 FAILED: HTTP ${response3.status} - ${response3.statusText}`);
        const errorText = await response3.text();
        addResult(`Error details: ${errorText}`);
      }
    } catch (error) {
      addResult(`❌ Test 3 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 4: Test Sign In with Invalid Credentials (Expected to Fail)
      addResult('Test 4: Testing sign in with invalid credentials (should fail gracefully)...');
      const testResult = await AuthService.signIn('test@example.com', 'invalidpassword');
      
      if (testResult.error) {
        addResult('✅ Test 4 PASSED: Sign in correctly rejected invalid credentials');
        addResult(`Error message: ${testResult.error}`);
      } else {
        addResult('❌ Test 4 FAILED: Sign in should have failed with invalid credentials');
      }
    } catch (error) {
      addResult(`❌ Test 4 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test 5: Test Auth Connection Method
      addResult('Test 5: Testing AuthService.testAuthConnection...');
      const connectionTest = await AuthService.testAuthConnection();
      
      if (connectionTest) {
        addResult('✅ Test 5 PASSED: AuthService connection test successful');
      } else {
        addResult('❌ Test 5 FAILED: AuthService connection test failed');
      }
    } catch (error) {
      addResult(`❌ Test 5 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    addResult('🔍 Authentication debug tests completed!');
    setIsTesting(false);
  };

  const testSignInFlow = async () => {
    setIsTesting(true);
    addResult('🔐 Testing Sign In Flow...');
    
    // Prompt for test credentials
    Alert.prompt(
      'Test Sign In',
      'Enter test email and password (separated by comma):',
      async (input) => {
        if (!input) return;
        
        const [email, password] = input.split(',').map(s => s.trim());
        
        if (!email || !password) {
          addResult('❌ Invalid input format. Use: email,password');
          setIsTesting(false);
          return;
        }
        
        try {
          addResult(`Testing sign in with: ${email}`);
          const result = await AuthService.signIn(email, password);
          
          if (result.user) {
            addResult('✅ Sign in successful!');
            addResult(`User ID: ${result.user.id}`);
            addResult(`Email: ${result.user.email}`);
            addResult(`Username: ${result.user.username}`);
          } else {
            addResult(`❌ Sign in failed: ${result.error}`);
          }
        } catch (error) {
          addResult(`❌ Sign in error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        setIsTesting(false);
      },
      'plain-text',
      'test@example.com,password123'
    );
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Debugger</Text>
      <Text style={styles.subtitle}>Supabase URL: {SUPABASE_CONFIG.url}</Text>
      <Text style={styles.subtitle}>Anon Key: {SUPABASE_CONFIG.anonKey.substring(0, 20)}...</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isTesting && styles.buttonDisabled]} 
          onPress={runAuthTests}
          disabled={isTesting}
        >
          <Text style={styles.buttonText}>
            {isTesting ? 'Testing...' : 'Run Auth Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, isTesting && styles.buttonDisabled]} 
          onPress={testSignInFlow}
          disabled={isTesting}
        >
          <Text style={styles.buttonText}>Test Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={clearResults}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
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
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.3,
    margin: 2,
  },
  testButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.3,
    margin: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.3,
    margin: 2,
  },
  clearButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
  },
  resultText: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 3,
    lineHeight: 14,
  },
});

export default AuthDebugger;

