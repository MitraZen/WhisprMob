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
        
        // Check if it's a "function not found" error
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          console.error(
            '⚠️ Analytics functions not found in database!\n' +
            'Please run the SQL functions from: database/admin-analytics-functions.sql\n' +
            'See SETUP_ANALYTICS_FUNCTIONS.md for instructions.'
          );
          
          // Return empty data structure so UI doesn't crash
          return {
            total_users: {
              total_users: 0,
              active_users: 0,
              inactive_users: 0,
              active_percentage: 0
            },
            users_this_week: {
              total_this_week: 0,
              previous_week: 0,
              growth_rate: 0,
              daily_breakdown: [],
              week_start: new Date().toISOString(),
              week_end: new Date().toISOString()
            },
            trending_users: {
              trending_users: [],
              limit: 10,
              period_days: 7,
              generated_at: new Date().toISOString()
            },
            generated_at: new Date().toISOString()
          };
        }
        
        // For other errors, try fallback: fetch individually
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

      return data as AdminAnalytics;
    } catch (error: any) {
      console.error('Error in getAdminAnalytics:', error);
      
      // Check if it's a "function not found" error
      if (error?.code === 'PGRST202' || error?.message?.includes('Could not find the function')) {
        console.error(
          '⚠️ Analytics functions not found in database!\n' +
          'Please run the SQL functions from: database/admin-analytics-functions.sql\n' +
          'See SETUP_ANALYTICS_FUNCTIONS.md for instructions.'
        );
      }
      
      // Fallback: fetch individually
      try {
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
      } catch (fallbackError) {
        // If even fallback fails, return empty structure
        return {
          total_users: {
            total_users: 0,
            active_users: 0,
            inactive_users: 0,
            active_percentage: 0
          },
          users_this_week: {
            total_this_week: 0,
            previous_week: 0,
            growth_rate: 0,
            daily_breakdown: [],
            week_start: new Date().toISOString(),
            week_end: new Date().toISOString()
          },
          trending_users: {
            trending_users: [],
            limit: 10,
            period_days: 7,
            generated_at: new Date().toISOString()
          },
          generated_at: new Date().toISOString()
        };
      }
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

