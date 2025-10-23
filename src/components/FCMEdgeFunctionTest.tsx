// Simple FCM Edge Function Test for React Native
// Add this to any screen component or create a test button

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/config/supabase';

const FCMEdgeFunctionTest = () => {
  
  const testEdgeFunction = async () => {
    try {
      console.log('🔥 Testing FCM Edge Function...');
      
      // Get a real FCM token from your database
      const { data: tokens, error: tokenError } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, user_id')
        .limit(1);
      
      if (tokenError) {
        console.error('🔥 Error fetching FCM tokens:', tokenError);
        Alert.alert('Error', 'Failed to fetch FCM tokens: ' + tokenError.message);
        return;
      }
      
      if (!tokens || tokens.length === 0) {
        Alert.alert('No Tokens', 'No FCM tokens found. Please ensure notifications are enabled.');
        return;
      }
      
      const testToken = tokens[0].fcm_token;
      console.log('🔥 Using FCM token:', testToken.substring(0, 20) + '...');
      
      // Test the Edge Function
      const { data, error } = await supabase.functions.invoke('send-fcm-notification-v1', {
        body: {
          to: testToken,
          notification: {
            title: '🔥 FCM Edge Function Test',
            body: 'This notification was sent via your deployed Edge Function!'
          },
          data: {
            type: 'test',
            timestamp: new Date().toISOString(),
            source: 'edge_function_test'
          }
        }
      });

      if (error) {
        console.error('🔥 Edge Function Error:', error);
        Alert.alert('Test Failed', 'Edge Function Error: ' + JSON.stringify(error));
      } else {
        console.log('🔥 Edge Function Success:', data);
        Alert.alert('Test Success!', 'Notification sent successfully! Check your device for the notification.');
      }
      
    } catch (error) {
      console.error('🔥 Test Error:', error);
      Alert.alert('Test Error', 'Unexpected error: ' + error.message);
    }
  };

  const testMultipleNotifications = async () => {
    try {
      console.log('🔥 Testing Multiple Notifications...');
      
      const { data: tokens } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token, user_id')
        .limit(1);
      
      if (!tokens || tokens.length === 0) {
        Alert.alert('No Tokens', 'No FCM tokens found.');
        return;
      }
      
      const testToken = tokens[0].fcm_token;
      
      // Send 3 different types of notifications
      const notifications = [
        {
          title: '📱 Message Notification',
          body: 'You received a new message!',
          data: { type: 'message', sender: 'Test User' }
        },
        {
          title: '📝 Note Notification', 
          body: 'You received a new Whispr note!',
          data: { type: 'note', sender: 'Test User' }
        },
        {
          title: '🔔 System Notification',
          body: 'This is a system notification test',
          data: { type: 'system', action: 'test' }
        }
      ];
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < notifications.length; i++) {
        const notification = notifications[i];
        
        const { error } = await supabase.functions.invoke('send-fcm-notification-v1', {
          body: {
            to: testToken,
            notification,
            data: {
              ...notification.data,
              test_id: `test_${i + 1}`,
              timestamp: new Date().toISOString()
            }
          }
        });
        
        if (error) {
          console.error(`🔥 Notification ${i + 1} failed:`, error);
          errorCount++;
        } else {
          console.log(`✅ Notification ${i + 1} sent successfully`);
          successCount++;
        }
        
        // Wait 1 second between notifications
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      Alert.alert(
        'Multiple Test Complete', 
        `Sent ${successCount} notifications successfully, ${errorCount} failed. Check your device!`
      );
      
    } catch (error) {
      console.error('🔥 Multiple Test Error:', error);
      Alert.alert('Test Error', 'Unexpected error: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FCM Edge Function Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testEdgeFunction}>
        <Text style={styles.buttonText}>Test Single Notification</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testMultipleNotifications}>
        <Text style={styles.buttonText}>Test Multiple Notifications</Text>
      </TouchableOpacity>
      
      <Text style={styles.instructions}>
        Make sure your device has notifications enabled and the app is running.
        You should receive notifications on your device when you tap these buttons.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: 200,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    paddingHorizontal: 20,
  },
});

export default FCMEdgeFunctionTest;
