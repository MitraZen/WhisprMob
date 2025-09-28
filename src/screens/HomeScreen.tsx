import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/store/ThemeContext';
import { moodConfig, spacing, borderRadius } from '@/utils/themes';
import { MoodType } from '@/types';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateMood } = useAuth();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  
  const styles = createStyles(theme);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - in real app, this would fetch new data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMoodChange = () => {
    navigation.navigate('MoodSelection' as never);
  };

  const handleFindConnections = () => {
    navigation.navigate('Connections' as never);
  };

  const handleViewMessages = () => {
    navigation.navigate('Messages' as never);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentMoodConfig = moodConfig[user.mood] || { emoji: '😊', color: '#fbbf24', description: 'Unknown mood' };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Mood Section */}
        <View style={styles.moodSection}>
          <Text style={styles.sectionTitle}>Your Current Mood</Text>
          <View style={styles.currentMoodCard}>
            <Text style={styles.moodEmoji}>{currentMoodConfig.emoji}</Text>
            <Text style={styles.moodName}>
              {user.mood.charAt(0).toUpperCase() + user.mood.slice(1)}
            </Text>
            <Text style={styles.moodDescription}>
              {currentMoodConfig.description}
            </Text>
            <TouchableOpacity style={styles.changeMoodButton} onPress={handleMoodChange}>
              <Text style={styles.changeMoodButtonText}>Change Mood</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={handleFindConnections}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>🔍</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Find Connections</Text>
              <Text style={styles.actionDescription}>
                Connect with others who share your mood
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleViewMessages}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionEmoji}>💬</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Messages</Text>
              <Text style={styles.actionDescription}>
                Check your anonymous conversations
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Anonymous Journey</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
          </View>
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>🔒 Your Privacy</Text>
          <Text style={styles.privacyText}>
            Your identity remains completely anonymous. All messages are encrypted 
            and your personal information is never stored or shared.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  moodSection: {
    marginBottom: spacing.xl,
  },
  currentMoodCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  moodEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  moodName: {
    ...theme.typography.displaySmall,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  moodDescription: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  changeMoodButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...theme.shadows.sm,
  },
  changeMoodButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onPrimary,
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  actionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  actionArrow: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  statsSection: {
    marginBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  privacySection: {
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
  },
  privacyText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
});

export default HomeScreen;


