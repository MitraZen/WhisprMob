import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { FCMDiagnosticService, FCMSystemHealth, FCMDiagnosticResult } from '@/services/fcmDiagnosticService';
import { fcmService } from '@/services/fcmService';

interface FCMDiagnosticProps {
  userId?: string;
  onClose?: () => void;
}

export const FCMDiagnostic: React.FC<FCMDiagnosticProps> = ({ userId, onClose }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState<FCMSystemHealth | null>(null);
  const [userTest, setUserTest] = useState<FCMDiagnosticResult | null>(null);
  const [diagnosticReport, setDiagnosticReport] = useState<string>('');

  const styles = createStyles(theme);

  useEffect(() => {
    if (userId) {
      testUserDelivery();
    }
    runSystemDiagnostics();
  }, [userId]);

  const runSystemDiagnostics = async () => {
    setLoading(true);
    try {
      const health = await FCMDiagnosticService.runFullDiagnostics();
      setSystemHealth(health);
    } catch (error) {
      console.error('Error running system diagnostics:', error);
      Alert.alert('Error', 'Failed to run system diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const testUserDelivery = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await FCMDiagnosticService.testUserDelivery(userId);
      setUserTest(result);
    } catch (error) {
      console.error('Error testing user delivery:', error);
      Alert.alert('Error', 'Failed to test user delivery');
    } finally {
      setLoading(false);
    }
  };

  const cleanupTokens = async () => {
    setLoading(true);
    try {
      const cleanup = await FCMDiagnosticService.cleanupAndReport();
      Alert.alert(
        'Cleanup Complete',
        `Cleaned ${cleanup.cleanedTokens} invalid tokens. ${cleanup.remainingTokens} tokens remaining.`
      );
      runSystemDiagnostics(); // Refresh stats
    } catch (error) {
      console.error('Error cleaning up tokens:', error);
      Alert.alert('Error', 'Failed to cleanup tokens');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const report = await FCMDiagnosticService.generateDiagnosticReport();
      setDiagnosticReport(report);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate diagnostic report');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await fcmService.testNotification(userId);
      Alert.alert(
        'Test Notification',
        result.success ? 'Test notification sent successfully!' : `Failed: ${result.error}`
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return theme.colors.success;
      case 'degraded': return theme.colors.warning;
      case 'critical': return theme.colors.error;
      default: return theme.colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔥 FCM Diagnostic Center</Text>

        {/* System Health */}
        {systemHealth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {getStatusIcon(systemHealth.systemStatus)} System Health: {systemHealth.systemStatus.toUpperCase()}
            </Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{systemHealth.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{systemHealth.usersWithTokens}</Text>
                <Text style={styles.statLabel}>With Tokens</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{systemHealth.validTokens}</Text>
                <Text style={styles.statLabel}>Valid Tokens</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{systemHealth.invalidTokens}</Text>
                <Text style={styles.statLabel}>Invalid Tokens</Text>
              </View>
            </View>

            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>Recommendations:</Text>
              {systemHealth.recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendation}>• {rec}</Text>
              ))}
            </View>
          </View>
        )}

        {/* User Test */}
        {userTest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 User Delivery Test</Text>
            
            <View style={styles.userTestContainer}>
              <Text style={styles.userTestItem}>
                <Text style={styles.userTestLabel}>User ID: </Text>
                <Text style={styles.userTestValue}>{userTest.userId}</Text>
              </Text>
              
              <Text style={styles.userTestItem}>
                <Text style={styles.userTestLabel}>Has Token: </Text>
                <Text style={[styles.userTestValue, { color: userTest.hasToken ? theme.colors.success : theme.colors.error }]}>
                  {userTest.hasToken ? 'Yes' : 'No'}
                </Text>
              </Text>
              
              <Text style={styles.userTestItem}>
                <Text style={styles.userTestLabel}>Token Valid: </Text>
                <Text style={[styles.userTestValue, { color: userTest.tokenValid ? theme.colors.success : theme.colors.error }]}>
                  {userTest.tokenValid ? 'Yes' : 'No'}
                </Text>
              </Text>
              
              {userTest.platform && (
                <Text style={styles.userTestItem}>
                  <Text style={styles.userTestLabel}>Platform: </Text>
                  <Text style={styles.userTestValue}>{userTest.platform}</Text>
                </Text>
              )}
              
              {userTest.lastUsed && (
                <Text style={styles.userTestItem}>
                  <Text style={styles.userTestLabel}>Last Used: </Text>
                  <Text style={styles.userTestValue}>{new Date(userTest.lastUsed).toLocaleString()}</Text>
                </Text>
              )}
              
              {userTest.testResult && (
                <Text style={styles.userTestItem}>
                  <Text style={styles.userTestLabel}>Test Result: </Text>
                  <Text style={[styles.userTestValue, { color: userTest.testResult.success ? theme.colors.success : theme.colors.error }]}>
                    {userTest.testResult.success ? 'Success' : `Failed: ${userTest.testResult.error}`}
                  </Text>
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Diagnostic Report */}
        {diagnosticReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Diagnostic Report</Text>
            <ScrollView style={styles.reportContainer} nestedScrollEnabled>
              <Text style={styles.reportText}>{diagnosticReport}</Text>
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={runSystemDiagnostics}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>🔄 Refresh Diagnostics</Text>
          </TouchableOpacity>

          {userId && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={testUserDelivery}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>👤 Test User Delivery</Text>
            </TouchableOpacity>
          )}

          {userId && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={sendTestNotification}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>📱 Send Test Notification</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.warningButton]}
            onPress={cleanupTokens}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>🧹 Cleanup Invalid Tokens</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.infoButton]}
            onPress={generateReport}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>📊 Generate Report</Text>
          </TouchableOpacity>

          {onClose && (
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.actionButtonText}>❌ Close</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Running diagnostics...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    width: '48%',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  recommendationsContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  recommendation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  userTestContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
  },
  userTestItem: {
    marginBottom: 8,
  },
  userTestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  userTestValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  reportContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  reportText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actionsContainer: {
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  warningButton: {
    backgroundColor: theme.colors.warning,
  },
  infoButton: {
    backgroundColor: theme.colors.info,
  },
  closeButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

