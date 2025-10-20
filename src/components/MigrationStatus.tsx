import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { MIGRATION_STATUS, USE_TELEGRAM_STYLE_CHAT } from '@/config/migrationConfig';

export const MigrationStatus: React.FC = () => {
  const theme = useTheme();

  const getStatusIcon = (status: boolean) => {
    return status ? 'checkmark-circle' : 'ellipse-outline';
  };

  const getStatusColor = (status: boolean) => {
    return status ? '#4CAF50' : '#FFC107';
  };

  const migrationSteps = [
    { key: 'DATABASE_SCHEMA', label: 'Database Schema', status: MIGRATION_STATUS.DATABASE_SCHEMA },
    { key: 'CHAT_SCREEN', label: 'Chat Screen', status: MIGRATION_STATUS.CHAT_SCREEN },
    { key: 'BUDDIES_SCREEN', label: 'Buddies Screen', status: MIGRATION_STATUS.BUDDIES_SCREEN },
    { key: 'REAL_TIME', label: 'Real-time Updates', status: MIGRATION_STATUS.REAL_TIME },
    { key: 'CACHING', label: 'Caching System', status: MIGRATION_STATUS.CACHING },
    { key: 'CLEANUP', label: 'Legacy Cleanup', status: MIGRATION_STATUS.CLEANUP },
  ];

  const completedSteps = migrationSteps.filter(step => step.status).length;
  const totalSteps = migrationSteps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="rocket-outline" size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Migration Status</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: theme.colors.primary 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {completedSteps}/{totalSteps} steps completed ({Math.round(progressPercentage)}%)
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {migrationSteps.map((step) => (
          <View key={step.key} style={styles.stepRow}>
            <Icon 
              name={getStatusIcon(step.status)} 
              size={20} 
              color={getStatusColor(step.status)} 
            />
            <Text style={[
              styles.stepLabel,
              { color: step.status ? '#4CAF50' : '#666' }
            ]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Current System: {USE_TELEGRAM_STYLE_CHAT ? 'Telegram-Style' : 'Legacy'}
        </Text>
        <Text style={styles.footerSubtext}>
          {USE_TELEGRAM_STYLE_CHAT 
            ? '✅ Using simplified chat architecture' 
            : '⚠️ Using complex legacy system'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
