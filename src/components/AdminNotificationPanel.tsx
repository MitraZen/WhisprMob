import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useAdmin } from '@/store/AdminContext';
import { theme, spacing, borderRadius } from '@/utils/theme';

// Using imported spacing from theme

// Using imported borderRadius from theme

interface AdminNotificationPanelProps {
  onClose: () => void;
}

const AdminNotificationPanel: React.FC<AdminNotificationPanelProps> = ({ onClose }) => {
  const {
    notificationDebugInfo,
    notificationTestResults,
    isNotificationDebugging,
    isLoading,
    error,
    refreshNotificationDebugInfo,
    testAllNotifications,
    sendTestNotificationToUser,
    clearAllNotifications,
    startNotificationDebugging,
    stopNotificationDebugging,
    clearNotificationDebugHistory,
    clearError,
  } = useAdmin();

  const [testUserId, setTestUserId] = useState('');
  const [selectedNotificationType, setSelectedNotificationType] = useState<'message' | 'note' | 'general'>('general');

  useEffect(() => {
    refreshNotificationDebugInfo();
  }, []);

  const handleTestAllNotifications = async () => {
    await testAllNotifications();
  };

  const handleSendTestToUser = async () => {
    if (!testUserId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }
    await sendTestNotificationToUser(testUserId.trim(), selectedNotificationType);
  };

  const handleClearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearAllNotifications },
      ]
    );
  };

  const toggleDebugging = () => {
    if (isNotificationDebugging) {
      stopNotificationDebugging();
    } else {
      startNotificationDebugging();
    }
  };

  const renderDebugInfo = () => {
    if (!notificationDebugInfo) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Information</Text>
          <Text style={styles.noData}>No debug information available</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Information</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Platform: {notificationDebugInfo.platform}</Text>
          <Text style={styles.infoText}>
            Notification Module: {notificationDebugInfo.notificationModuleAvailable ? 'Available' : 'Not Available'}
          </Text>
          <Text style={styles.infoText}>
            Realtime Status: {notificationDebugInfo.realtimeConnectionStatus}
          </Text>
          <Text style={styles.infoText}>
            Polling Status: {notificationDebugInfo.pollingStatus ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.infoText}>
            Last Notification: {notificationDebugInfo.lastNotificationTime || 'None'}
          </Text>
        </View>
      </View>
    );
  };

  const renderTestResults = () => {
    if (notificationTestResults.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <Text style={styles.noData}>No test results available</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <TouchableOpacity onPress={clearNotificationDebugHistory} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.resultsContainer}>
          {notificationTestResults.map((result, index) => (
            <View key={index} style={[styles.resultItem, result.success ? styles.successResult : styles.errorResult]}>
              <Text style={styles.resultTitle}>
                {result.success ? '✓' : '✗'} {result.message}
              </Text>
              <Text style={styles.resultTime}>
                {new Date(result.timestamp).toLocaleTimeString()}
              </Text>
              {result.details && (
                <Text style={styles.resultDetails}>
                  Details: {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTestControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Test Controls</Text>
      
      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleTestAllNotifications}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Test All Notifications</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isNotificationDebugging ? styles.stopButton : styles.startButton]}
        onPress={toggleDebugging}
      >
        <Text style={styles.buttonText}>
          {isNotificationDebugging ? 'Stop Debugging' : 'Start Debugging'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.warningButton]}
        onPress={handleClearAllNotifications}
      >
        <Text style={styles.buttonText}>Clear All Notifications</Text>
      </TouchableOpacity>
    </View>
  );

  const renderUserTestControls = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Send Test to User</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter User ID"
        value={testUserId}
        onChangeText={setTestUserId}
        placeholderTextColor={theme.colors.textSecondary}
      />

      <View style={styles.typeSelector}>
        {(['message', 'note', 'general'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              selectedNotificationType === type && styles.selectedTypeButton,
            ]}
            onPress={() => setSelectedNotificationType(type)}
          >
            <Text
              style={[
                styles.typeButtonText,
                selectedNotificationType === type && styles.selectedTypeButtonText,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleSendTestToUser}
        disabled={isLoading || !testUserId.trim()}
      >
        <Text style={styles.buttonText}>Send Test Notification</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Debug Panel</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content}>
        {renderDebugInfo()}
        {renderTestControls()}
        {renderUserTestControls()}
        {renderTestResults()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeButtonText: {
    fontSize: 18,
    color: 'white',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  infoContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  noData: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  startButton: {
    backgroundColor: theme.colors.success,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  warningButton: {
    backgroundColor: theme.colors.warning,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  typeButton: {
    flex: 1,
    padding: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  selectedTypeButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  resultsContainer: {
    maxHeight: 200,
  },
  resultItem: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  successResult: {
    backgroundColor: theme.colors.success + '20',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  errorResult: {
    backgroundColor: theme.colors.error + '20',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  resultTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  resultDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearButtonText: {
    color: theme.colors.error,
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '20',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    flex: 1,
  },
  dismissButton: {
    padding: spacing.xs,
  },
  dismissButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AdminNotificationPanel;
