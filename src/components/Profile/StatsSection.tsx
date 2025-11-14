/**
 * Stats Section Component
 * Display user statistics (messages, buddies, notes)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { UserStats } from '@/types/profile.types';

interface StatsSectionProps {
  userStats: UserStats;
  theme: any;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  userStats,
  theme,
}) => {
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="stats-chart-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>Your Statistics</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statCardContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>💬</Text>
            </View>
            <Text style={styles.statNumber}>{userStats.messagesSent}</Text>
            <Text style={styles.statLabel}>Messages</Text>
            <View style={styles.statTrend}>
              <Icon name="trending-up" size={12} color={theme.colors.success} />
              <Text style={styles.statTrendText}>+12%</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>👥</Text>
            </View>
            <Text style={styles.statNumber}>{userStats.buddiesCount}</Text>
            <Text style={styles.statLabel}>Buddies</Text>
            <View style={styles.statTrend}>
              <Icon name="trending-up" size={12} color={theme.colors.success} />
              <Text style={styles.statTrendText}>+3</Text>
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardContent}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📝</Text>
            </View>
            <Text style={styles.statNumber}>{userStats.notesShared}</Text>
            <Text style={styles.statLabel}>Notes</Text>
            <View style={styles.statTrend}>
              <Icon name="trending-up" size={12} color={theme.colors.success} />
              <Text style={styles.statTrendText}>+5</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Keep connecting and sharing to grow your stats! 📈
        </Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  statCardContent: {
    alignItems: 'center',
    padding: spacing.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...theme.shadows.sm,
  },
  statIcon: {
    fontSize: 20,
  },
  statNumber: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTrendText: {
    ...theme.typography.bodySmall,
    color: theme.colors.success,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

