import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  BackHandler,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import AdminAnalyticsService, {
  AdminAnalytics,
  TrendingUser
} from '@/services/adminAnalyticsService';

interface AdminAnalyticsPanelProps {
  onClose?: () => void;
}

const AdminAnalyticsPanel: React.FC<AdminAnalyticsPanelProps> = ({ onClose }) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);
  
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30>(7);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (onClose) {
          onClose();
          return true; // Prevent default behavior
        }
        return false; // Allow default behavior
      });

      return () => backHandler.remove();
    }
  }, [onClose]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminAnalyticsService.getAdminAnalytics();
      
      // Check if functions are not set up (all zeros/empty)
      const isNotSetup = 
        data.total_users.total_users === 0 &&
        data.users_this_week.total_this_week === 0 &&
        data.trending_users.trending_users.length === 0;
      
      if (isNotSetup) {
        setError(
          '⚠️ Analytics functions not set up!\n\n' +
          'Please run the SQL functions in Supabase:\n' +
          '1. Open Supabase SQL Editor\n' +
          '2. Run: database/admin-analytics-functions.sql\n' +
          '3. See SETUP_ANALYTICS_FUNCTIONS.md for details'
        );
      }
      
      // If period changed, reload trending users with new period
      if (selectedPeriod !== 7) {
        const trendingUsers = await AdminAnalyticsService.getTrendingUsers(10, selectedPeriod);
        data.trending_users = trendingUsers;
      }
      
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      
      // Check for function not found error
      if (error?.code === 'PGRST202' || error?.message?.includes('Could not find the function')) {
        setError(
          '⚠️ Analytics functions not found!\n\n' +
          'Please run the SQL functions in Supabase:\n' +
          '1. Open Supabase SQL Editor\n' +
          '2. Run: database/admin-analytics-functions.sql\n' +
          '3. Grant execute permissions\n' +
          'See SETUP_ANALYTICS_FUNCTIONS.md for details'
        );
      } else {
        setError('Failed to load analytics. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  if (loading && !analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Analytics Dashboard</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadAnalytics}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Total Users Card */}
      {analytics?.total_users && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="people" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Total Users</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {AdminAnalyticsService.formatNumber(analytics.total_users.total_users)}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                {AdminAnalyticsService.formatNumber(analytics.total_users.active_users)}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.onSurfaceVariant }]}>
                {AdminAnalyticsService.formatNumber(analytics.total_users.inactive_users)}
              </Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(analytics.total_users.active_percentage, 100)}%`,
                  backgroundColor: theme.colors.primary
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {AdminAnalyticsService.formatPercentage(analytics.total_users.active_percentage)} Active
          </Text>
        </View>
      )}

      {/* Users This Week Card */}
      {analytics?.users_this_week && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="trending-up" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Users This Week</Text>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {AdminAnalyticsService.formatNumber(analytics.users_this_week.total_this_week)}
              </Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.onSurfaceVariant }]}>
                {AdminAnalyticsService.formatNumber(analytics.users_this_week.previous_week)}
              </Text>
              <Text style={styles.statLabel}>Last Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      analytics.users_this_week.growth_rate >= 0
                        ? '#10b981'
                        : '#ef4444'
                  }
                ]}
              >
                {analytics.users_this_week.growth_rate >= 0 ? '+' : ''}
                {AdminAnalyticsService.formatPercentage(analytics.users_this_week.growth_rate)}
              </Text>
              <Text style={styles.statLabel}>Growth</Text>
            </View>
          </View>

          {/* Daily Breakdown */}
          {analytics.users_this_week.daily_breakdown.length > 0 && (
            <View style={styles.dailyBreakdown}>
              <Text style={styles.sectionSubtitle}>Daily Breakdown</Text>
              {analytics.users_this_week.daily_breakdown.map((day, index) => {
                const maxCount = Math.max(
                  ...analytics.users_this_week.daily_breakdown.map(d => d.count),
                  1
                );
                return (
                  <View key={index} style={styles.dailyItem}>
                    <Text style={styles.dailyDate}>
                      {AdminAnalyticsService.formatDailyDate(day.date)}
                    </Text>
                    <View style={styles.dailyBarContainer}>
                      <View
                        style={[
                          styles.dailyBar,
                          {
                            width: `${(day.count / maxCount) * 100}%`,
                            backgroundColor: theme.colors.primary
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.dailyCount}>{day.count}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Top Trending Users Card */}
      {analytics?.trending_users && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="flame" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Top Trending Users</Text>
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 7 && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(7)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 7 && styles.periodButtonTextActive
                  ]}
                >
                  7 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 30 && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(30)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 30 && styles.periodButtonTextActive
                  ]}
                >
                  30 Days
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {analytics.trending_users.trending_users.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No trending users found</Text>
            </View>
          ) : (
            analytics.trending_users.trending_users.map((user, index) => (
              <TrendingUserCard
                key={user.user_id}
                user={user}
                rank={index + 1}
                theme={theme}
                isDark={isDark}
              />
            ))
          )}
        </View>
      )}

      {/* Last Updated */}
      {analytics?.generated_at && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: {AdminAnalyticsService.formatDate(analytics.generated_at)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// Trending User Card Component
interface TrendingUserCardProps {
  user: TrendingUser;
  rank: number;
  theme: any;
  isDark: boolean;
}

const TrendingUserCard: React.FC<TrendingUserCardProps> = ({
  user,
  rank,
  theme,
  isDark
}) => {
  const styles = createStyles(theme, isDark);

  return (
    <View style={styles.trendingUserCard}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{rank}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.name || 'Anonymous'}
        </Text>
        <View style={styles.userStats}>
          <View style={styles.userStatItem}>
            <Icon name="document-text" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.userStatText}>{user.notes_created}</Text>
          </View>
          <View style={styles.userStatItem}>
            <Icon name="flash" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.userStatText}>{user.whisprs_created}</Text>
          </View>
          <View style={styles.userStatItem}>
            <Icon name="chatbubble" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.userStatText}>{user.messages_sent}</Text>
          </View>
          <View style={styles.userStatItem}>
            <Icon name="people" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.userStatText}>{user.buddies_created}</Text>
          </View>
        </View>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreValue}>{user.trending_score.toFixed(1)}</Text>
        <Text style={styles.scoreLabel}>Score</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
    },
    closeButton: {
      padding: spacing.xs,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
    },
    errorContainer: {
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      margin: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    errorText: {
      color: '#dc2626',
      fontSize: 14,
      flex: 1,
    },
    retryText: {
      color: '#dc2626',
      fontSize: 14,
      fontWeight: 'bold',
      marginLeft: spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      margin: spacing.lg,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginLeft: spacing.sm,
      flex: 1,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: spacing.md,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    sectionSubtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    dailyBreakdown: {
      marginTop: spacing.md,
    },
    dailyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    dailyDate: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      width: 80,
    },
    dailyBarContainer: {
      flex: 1,
      height: 20,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 10,
      marginHorizontal: spacing.sm,
      overflow: 'hidden',
    },
    dailyBar: {
      height: '100%',
      borderRadius: 10,
    },
    dailyCount: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurface,
      width: 30,
      textAlign: 'right',
    },
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: borderRadius.sm,
      padding: 2,
    },
    periodButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    periodButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    trendingUserCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    rankText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.onPrimary,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: spacing.xs,
    },
    userStats: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    userStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    userStatText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    scoreContainer: {
      alignItems: 'flex-end',
    },
    scoreValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    scoreLabel: {
      fontSize: 10,
      color: theme.colors.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    emptyState: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    footer: {
      padding: spacing.lg,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default AdminAnalyticsPanel;

