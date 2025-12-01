# Admin Analytics Module Design

## 🎯 **Overview**

Comprehensive analytics dashboard for admin users showing:
1. **Total number of users**
2. **Total number of users added this week**
3. **Top Trending users** (based on engagement, activity, posts)

---

## 📊 **Analytics Requirements**

### **1. Total Number of Users**
- Count all users in `user_profiles` table
- Include active and inactive users
- Show breakdown by status if available

### **2. Users Added This Week**
- Count users created in the last 7 days
- Show daily breakdown (last 7 days)
- Show growth trend

### **3. Top Trending Users**
**Definition**: Users with highest engagement/activity score

**Scoring Algorithm**:
```
Trending Score = (
  Whispr Notes Created (last 7 days) × 2 +
  Live Whisprs Created (last 7 days) × 1.5 +
  Messages Sent (last 7 days) × 1 +
  Buddies Created (last 7 days) × 1.5 +
  Engagement Received (reactions, replies) × 2
) / Days Active
```

**Metrics to Track**:
- Posts created (notes + whisprs)
- Messages sent
- Buddies created
- Engagement received
- Activity frequency
- Last active time

---

## 🏗️ **Database Functions**

### **1. Get Total Users**

```sql
CREATE OR REPLACE FUNCTION get_total_users()
RETURNS JSONB AS $$
DECLARE
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_inactive_users INTEGER;
  v_result JSONB;
BEGIN
  -- Total users
  SELECT COUNT(*) INTO v_total_users
  FROM user_profiles;
  
  -- Active users (last seen within 7 days)
  SELECT COUNT(*) INTO v_active_users
  FROM user_profiles
  WHERE last_seen > NOW() - INTERVAL '7 days'
     OR (last_seen IS NULL AND created_at > NOW() - INTERVAL '7 days');
  
  -- Inactive users
  v_inactive_users := v_total_users - v_active_users;
  
  v_result := jsonb_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'inactive_users', v_inactive_users,
    'active_percentage', ROUND((v_active_users::NUMERIC / NULLIF(v_total_users, 0)) * 100, 2)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### **2. Get Users Added This Week**

```sql
CREATE OR REPLACE FUNCTION get_users_added_this_week()
RETURNS JSONB AS $$
DECLARE
  v_week_start TIMESTAMP WITH TIME ZONE;
  v_total_this_week INTEGER;
  v_daily_breakdown JSONB;
  v_daily_counts RECORD;
  v_days JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  -- Calculate week start (7 days ago)
  v_week_start := NOW() - INTERVAL '7 days';
  
  -- Total users added this week
  SELECT COUNT(*) INTO v_total_this_week
  FROM user_profiles
  WHERE created_at >= v_week_start;
  
  -- Daily breakdown (last 7 days)
  FOR v_daily_counts IN
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as count
    FROM user_profiles
    WHERE created_at >= v_week_start
    GROUP BY DATE(created_at)
    ORDER BY day DESC
  LOOP
    v_days := v_days || jsonb_build_object(
      'date', v_daily_counts.day,
      'count', v_daily_counts.count
    );
  END LOOP;
  
  -- Calculate growth rate (compare to previous week)
  DECLARE
    v_previous_week_count INTEGER;
    v_growth_rate NUMERIC;
  BEGIN
    SELECT COUNT(*) INTO v_previous_week_count
    FROM user_profiles
    WHERE created_at >= (v_week_start - INTERVAL '7 days')
      AND created_at < v_week_start;
    
    IF v_previous_week_count > 0 THEN
      v_growth_rate := ROUND(
        ((v_total_this_week::NUMERIC - v_previous_week_count::NUMERIC) / v_previous_week_count::NUMERIC) * 100,
        2
      );
    ELSE
      v_growth_rate := v_total_this_week > 0 ? 100.0 : 0.0;
    END IF;
    
    v_result := jsonb_build_object(
      'total_this_week', v_total_this_week,
      'previous_week', v_previous_week_count,
      'growth_rate', v_growth_rate,
      'daily_breakdown', v_days,
      'week_start', v_week_start,
      'week_end', NOW()
    );
  END;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### **3. Get Top Trending Users**

```sql
CREATE OR REPLACE FUNCTION get_top_trending_users(
  p_limit INTEGER DEFAULT 10,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB AS $$
DECLARE
  v_trending_users JSONB := '[]'::JSONB;
  v_user_record RECORD;
  v_result JSONB;
BEGIN
  FOR v_user_record IN
    WITH user_activity AS (
      SELECT 
        up.id,
        up.username,
        up.display_name,
        up.created_at,
        up.last_seen,
        
        -- Whispr Notes created (last N days)
        COALESCE((
          SELECT COUNT(*)
          FROM whispr_notes
          WHERE sender_id = up.id
            AND created_at > NOW() - (p_days || ' days')::INTERVAL
        ), 0) as notes_created,
        
        -- Live Whisprs created (last N days)
        COALESCE((
          SELECT COUNT(*)
          FROM whisprs
          WHERE user_id = up.id
            AND created_at > NOW() - (p_days || ' days')::INTERVAL
        ), 0) as whisprs_created,
        
        -- Messages sent (last N days)
        COALESCE((
          SELECT COUNT(*)
          FROM buddy_messages
          WHERE sender_id = up.id
            AND created_at > NOW() - (p_days || ' days')::INTERVAL
        ), 0) as messages_sent,
        
        -- Buddies created (last N days)
        COALESCE((
          SELECT COUNT(*)
          FROM buddies
          WHERE user_id = up.id
            AND created_at > NOW() - (p_days || ' days')::INTERVAL
        ), 0) as buddies_created,
        
        -- Engagement received (reactions, replies - if tables exist)
        COALESCE((
          SELECT COUNT(*)
          FROM whisprs_reactions
          WHERE whispr_id IN (
            SELECT id FROM whisprs WHERE user_id = up.id
          )
          AND created_at > NOW() - (p_days || ' days')::INTERVAL
        ), 0) as engagement_received,
        
        -- Days active (how many days user was active in last N days)
        GREATEST(1, EXTRACT(EPOCH FROM (NOW() - up.created_at)) / 86400)::INTEGER as days_active
        
      FROM user_profiles up
      WHERE up.created_at > NOW() - (p_days || ' days')::INTERVAL
        OR up.last_seen > NOW() - (p_days || ' days')::INTERVAL
    )
    SELECT 
      id,
      COALESCE(display_name, username, 'Anonymous') as name,
      created_at,
      last_seen,
      notes_created,
      whisprs_created,
      messages_sent,
      buddies_created,
      engagement_received,
      days_active,
      -- Calculate trending score
      (
        (notes_created * 2.0) +
        (whisprs_created * 1.5) +
        (messages_sent * 1.0) +
        (buddies_created * 1.5) +
        (engagement_received * 2.0)
      ) / GREATEST(days_active, 1) as trending_score,
      -- Total activity
      (notes_created + whisprs_created + messages_sent + buddies_created) as total_activity
    FROM user_activity
    WHERE (
      notes_created > 0 OR
      whisprs_created > 0 OR
      messages_sent > 0 OR
      buddies_created > 0 OR
      engagement_received > 0
    )
    ORDER BY trending_score DESC, total_activity DESC
    LIMIT p_limit
  LOOP
    v_trending_users := v_trending_users || jsonb_build_object(
      'user_id', v_user_record.id,
      'name', v_user_record.name,
      'trending_score', ROUND(v_user_record.trending_score::NUMERIC, 2),
      'total_activity', v_user_record.total_activity,
      'notes_created', v_user_record.notes_created,
      'whisprs_created', v_user_record.whisprs_created,
      'messages_sent', v_user_record.messages_sent,
      'buddies_created', v_user_record.buddies_created,
      'engagement_received', v_user_record.engagement_received,
      'days_active', v_user_record.days_active,
      'created_at', v_user_record.created_at,
      'last_seen', v_user_record.last_seen
    );
  END LOOP;
  
  v_result := jsonb_build_object(
    'trending_users', v_trending_users,
    'limit', p_limit,
    'period_days', p_days,
    'generated_at', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### **4. Comprehensive Analytics Function**

```sql
CREATE OR REPLACE FUNCTION get_admin_analytics()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := jsonb_build_object(
    'total_users', get_total_users(),
    'users_this_week', get_users_added_this_week(),
    'trending_users', get_top_trending_users(10, 7),
    'generated_at', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

---

## 💻 **Service Implementation**

### **AdminAnalyticsService.ts**

```typescript
import { supabase } from '@/config/supabase';

export interface TotalUsersStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  active_percentage: number;
}

export interface UsersThisWeekStats {
  total_this_week: number;
  previous_week: number;
  growth_rate: number;
  daily_breakdown: Array<{
    date: string;
    count: number;
  }>;
  week_start: string;
  week_end: string;
}

export interface TrendingUser {
  user_id: string;
  name: string;
  trending_score: number;
  total_activity: number;
  notes_created: number;
  whisprs_created: number;
  messages_sent: number;
  buddies_created: number;
  engagement_received: number;
  days_active: number;
  created_at: string;
  last_seen: string;
}

export interface TrendingUsersStats {
  trending_users: TrendingUser[];
  limit: number;
  period_days: number;
  generated_at: string;
}

export interface AdminAnalytics {
  total_users: TotalUsersStats;
  users_this_week: UsersThisWeekStats;
  trending_users: TrendingUsersStats;
  generated_at: string;
}

class AdminAnalyticsService {
  private static instance: AdminAnalyticsService;

  static getInstance(): AdminAnalyticsService {
    if (!AdminAnalyticsService.instance) {
      AdminAnalyticsService.instance = new AdminAnalyticsService();
    }
    return AdminAnalyticsService.instance;
  }

  /**
   * Get total users statistics
   */
  async getTotalUsers(): Promise<TotalUsersStats> {
    try {
      const { data, error } = await supabase.rpc('get_total_users');

      if (error) {
        console.error('Error getting total users:', error);
        throw error;
      }

      return data as TotalUsersStats;
    } catch (error) {
      console.error('Error in getTotalUsers:', error);
      return {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        active_percentage: 0
      };
    }
  }

  /**
   * Get users added this week
   */
  async getUsersThisWeek(): Promise<UsersThisWeekStats> {
    try {
      const { data, error } = await supabase.rpc('get_users_added_this_week');

      if (error) {
        console.error('Error getting users this week:', error);
        throw error;
      }

      return data as UsersThisWeekStats;
    } catch (error) {
      console.error('Error in getUsersThisWeek:', error);
      return {
        total_this_week: 0,
        previous_week: 0,
        growth_rate: 0,
        daily_breakdown: [],
        week_start: new Date().toISOString(),
        week_end: new Date().toISOString()
      };
    }
  }

  /**
   * Get top trending users
   */
  async getTrendingUsers(limit: number = 10, days: number = 7): Promise<TrendingUsersStats> {
    try {
      const { data, error } = await supabase.rpc('get_top_trending_users', {
        p_limit: limit,
        p_days: days
      });

      if (error) {
        console.error('Error getting trending users:', error);
        throw error;
      }

      return data as TrendingUsersStats;
    } catch (error) {
      console.error('Error in getTrendingUsers:', error);
      return {
        trending_users: [],
        limit,
        period_days: days,
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Get comprehensive analytics (all metrics at once)
   */
  async getAdminAnalytics(): Promise<AdminAnalytics> {
    try {
      const { data, error } = await supabase.rpc('get_admin_analytics');

      if (error) {
        console.error('Error getting admin analytics:', error);
        throw error;
      }

      return data as AdminAnalytics;
    } catch (error) {
      console.error('Error in getAdminAnalytics:', error);
      // Fallback: fetch individually
      const [totalUsers, usersThisWeek, trendingUsers] = await Promise.all([
        this.getTotalUsers(),
        this.getUsersThisWeek(),
        this.getTrendingUsers()
      ]);

      return {
        total_users: totalUsers,
        users_this_week: usersThisWeek,
        trending_users: trendingUsers,
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Format number with commas
   */
  formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  /**
   * Format percentage
   */
  formatPercentage(num: number): string {
    return `${num.toFixed(1)}%`;
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Format date for daily breakdown
   */
  formatDailyDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }
}

export default AdminAnalyticsService.getInstance();
```

---

## 🎨 **UI Component**

### **AdminAnalyticsPanel.tsx**

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
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

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await AdminAnalyticsService.getAdminAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
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
                  width: `${analytics.total_users.active_percentage}%`,
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
              {analytics.users_this_week.daily_breakdown.map((day, index) => (
                <View key={index} style={styles.dailyItem}>
                  <Text style={styles.dailyDate}>
                    {AdminAnalyticsService.formatDailyDate(day.date)}
                  </Text>
                  <View style={styles.dailyBarContainer}>
                    <View
                      style={[
                        styles.dailyBar,
                        {
                          width: `${(day.count / Math.max(...analytics.users_this_week.daily_breakdown.map(d => d.count), 1)) * 100}%`,
                          backgroundColor: theme.colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.dailyCount}>{day.count}</Text>
                </View>
              ))}
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
```

---

## 🔄 **Integration with AdminPanel**

### **Update AdminPanel.tsx**

```typescript
// Add import
import AdminAnalyticsPanel from '@/components/AdminAnalyticsPanel';

// Add state
const [showAnalytics, setShowAnalytics] = useState(false);

// Add button in AdminPanel
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Analytics</Text>
  
  <TouchableOpacity 
    style={[styles.actionButton, styles.analyticsButton]} 
    onPress={() => setShowAnalytics(true)}
  >
    <Text style={styles.actionButtonText}>📊 View Analytics Dashboard</Text>
  </TouchableOpacity>
</View>

// Add modal
<Modal
  visible={showAnalytics}
  animationType="slide"
  presentationStyle="pageSheet"
>
  <AdminAnalyticsPanel onClose={() => setShowAnalytics(false)} />
</Modal>
```

---

## 📊 **Visual Design**

```
┌─────────────────────────────────────┐
│ 📊 Analytics Dashboard        [✕]  │
├─────────────────────────────────────┤
│                                     │
│ ┌─ Total Users ─────────────────┐  │
│ │ 👥 1,234                      │  │
│ │ ✅ 856 Active  ❌ 378 Inactive│  │
│ │ ████████░░ 69.4% Active       │  │
│ └────────────────────────────────┘  │
│                                     │
│ ┌─ Users This Week ─────────────┐  │
│ │ 📈 45 This Week              │  │
│ │ 📉 32 Last Week              │  │
│ │ 📊 +40.6% Growth             │  │
│ │                               │  │
│ │ Daily Breakdown:             │  │
│ │ Mon ████████░░ 12            │  │
│ │ Tue ████████████ 15          │  │
│ │ Wed ██████░░░░ 8             │  │
│ └────────────────────────────────┘  │
│                                     │
│ ┌─ Top Trending Users ──────────┐  │
│ │ [7 Days] [30 Days]           │  │
│ │                               │  │
│ │ #1 John Doe           45.2   │  │
│ │    📝12 💬8 👥5 🔥3  Score   │  │
│ │                               │  │
│ │ #2 Jane Smith         38.7   │  │
│ │    📝10 💬6 👥4 🔥2  Score   │  │
│ └────────────────────────────────┘  │
│                                     │
│ Last updated: Jan 15, 2025         │
└─────────────────────────────────────┘
```

---

## 🚀 **Implementation Steps**

### **Phase 1: Database Functions** (Day 1)
- [ ] Create `get_total_users()` function
- [ ] Create `get_users_added_this_week()` function
- [ ] Create `get_top_trending_users()` function
- [ ] Create `get_admin_analytics()` function
- [ ] Test all functions

### **Phase 2: Service Layer** (Day 2)
- [ ] Create `AdminAnalyticsService.ts`
- [ ] Implement all service methods
- [ ] Add error handling
- [ ] Add formatting utilities

### **Phase 3: UI Components** (Day 3)
- [ ] Create `AdminAnalyticsPanel.tsx`
- [ ] Create `TrendingUserCard` component
- [ ] Add styling and animations
- [ ] Add refresh functionality

### **Phase 4: Integration** (Day 4)
- [ ] Integrate with `AdminPanel.tsx`
- [ ] Add navigation
- [ ] Test end-to-end
- [ ] Add loading states

### **Phase 5: Polish** (Day 5)
- [ ] Add error handling UI
- [ ] Optimize performance
- [ ] Add caching
- [ ] Test with real data

---

## ✅ **Summary**

This analytics module provides:

✅ **Total Users**: Complete user count with active/inactive breakdown  
✅ **Users This Week**: Growth metrics with daily breakdown  
✅ **Top Trending Users**: Engagement-based ranking with detailed stats  
✅ **Real-time Updates**: Refresh to get latest data  
✅ **Beautiful UI**: Modern, card-based design  
✅ **Performance Optimized**: Efficient database queries  

**Ready to implement!** 🚀



