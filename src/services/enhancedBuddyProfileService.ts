import { supabase } from '@/config/supabase';

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  icon: string;
  points: number;
  unlocked_at: string;
  created_at: string;
}

export interface UserInterest {
  id: string;
  user_id: string;
  interest_category: string;
  interest_name: string;
  interest_level: 'casual' | 'moderate' | 'passionate' | 'expert';
  added_at: string;
}

export interface TrustMarker {
  id: string;
  user_id: string;
  marker_type: string;
  marker_name: string;
  marker_description: string;
  trust_score: number;
  verified_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserTrustSummary {
  user_id: string;
  total_trust_score: number;
  active_markers_count: number;
  achievements_count: number;
  interests_count: number;
  last_calculated: string;
  trust_level: 'new' | 'building' | 'trusted' | 'verified' | 'expert';
  created_at: string;
  updated_at: string;
}

export interface EnhancedBuddyProfile {
  basicInfo: {
    displayName: string;
    username: string;
    bio: string;
    age: string;
    location: string;
    gender: string;
    mood: string;
    joinDate: Date;
    isOnline: boolean;
    lastSeen: Date | null;
  };
  achievements: UserAchievement[];
  interests: UserInterest[];
  trustMarkers: TrustMarker[];
  trustSummary: UserTrustSummary;
}

class EnhancedBuddyProfileService {
  private static instance: EnhancedBuddyProfileService;

  static getInstance(): EnhancedBuddyProfileService {
    if (!EnhancedBuddyProfileService.instance) {
      EnhancedBuddyProfileService.instance = new EnhancedBuddyProfileService();
    }
    return EnhancedBuddyProfileService.instance;
  }

  /**
   * Get enhanced buddy profile with achievements, interests, and trust markers
   */
  async getEnhancedBuddyProfile(userId: string): Promise<EnhancedBuddyProfile | null> {
    try {
      console.log('🔍 Fetching enhanced buddy profile for user:', userId);

      // Fetch basic profile info
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        return null;
      }

      // Fetch achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (achievementsError) {
        console.error('❌ Error fetching achievements:', achievementsError);
      }

      // Fetch interests
      const { data: interests, error: interestsError } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (interestsError) {
        console.error('❌ Error fetching interests:', interestsError);
      }

      // Fetch trust markers
      const { data: trustMarkers, error: trustMarkersError } = await supabase
        .from('trust_markers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('verified_at', { ascending: false });

      if (trustMarkersError) {
        console.error('❌ Error fetching trust markers:', trustMarkersError);
      }

      // Fetch trust summary
      const { data: trustSummary, error: trustSummaryError } = await supabase
        .from('user_trust_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (trustSummaryError) {
        console.error('❌ Error fetching trust summary:', trustSummaryError);
      }

      const enhancedProfile: EnhancedBuddyProfile = {
        basicInfo: {
          displayName: profileData.display_name || profileData.username || 'Anonymous User',
          username: profileData.username || profileData.anonymous_id || 'anonymous',
          bio: profileData.bio || 'No bio available',
          age: (() => {
            const dob = profileData.date_of_birth ? new Date(profileData.date_of_birth) : null;
            const numericAge = typeof profileData.age === 'number' ? profileData.age : parseInt(profileData.age, 10);
            if (dob && !isNaN(dob.getTime())) {
              const today = new Date();
              let ageYears = today.getFullYear() - dob.getFullYear();
              const m = today.getMonth() - dob.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                ageYears--;
              }
              return String(ageYears);
            }
            if (!isNaN(numericAge)) {
              return String(numericAge);
            }
            return 'Not specified';
          })(),
          location: profileData.location || profileData.country || 'Not specified',
          gender: profileData.gender || 'Not specified',
          mood: profileData.mood || 'happy',
          joinDate: new Date(profileData.created_at),
          isOnline: profileData.is_online || false,
          lastSeen: profileData.last_seen ? new Date(profileData.last_seen) : null,
        },
        achievements: achievements || [],
        interests: interests || [],
        trustMarkers: trustMarkers || [],
        trustSummary: trustSummary || {
          user_id: userId,
          total_trust_score: 0,
          active_markers_count: 0,
          achievements_count: 0,
          interests_count: 0,
          last_calculated: new Date().toISOString(),
          trust_level: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      console.log('✅ Enhanced buddy profile loaded successfully');
      return enhancedProfile;

    } catch (error) {
      console.error('❌ Error in getEnhancedBuddyProfile:', error);
      return null;
    }
  }

  /**
   * Get recent achievements (last 5)
   */
  async getRecentAchievements(userId: string, limit: number = 5): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent achievements:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getRecentAchievements:', error);
      return [];
    }
  }

  /**
   * Get user interests by category
   */
  async getInterestsByCategory(userId: string): Promise<Record<string, UserInterest[]>> {
    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', userId)
        .order('interest_level', { ascending: false });

      if (error) {
        console.error('❌ Error fetching interests:', error);
        return {};
      }

      // Group interests by category
      const interestsByCategory: Record<string, UserInterest[]> = {};
      (data || []).forEach(interest => {
        if (!interestsByCategory[interest.interest_category]) {
          interestsByCategory[interest.interest_category] = [];
        }
        interestsByCategory[interest.interest_category].push(interest);
      });

      return interestsByCategory;
    } catch (error) {
      console.error('❌ Error in getInterestsByCategory:', error);
      return {};
    }
  }

  /**
   * Get trust markers with scores
   */
  async getTrustMarkers(userId: string): Promise<TrustMarker[]> {
    try {
      const { data, error } = await supabase
        .from('trust_markers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('trust_score', { ascending: false });

      if (error) {
        console.error('❌ Error fetching trust markers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getTrustMarkers:', error);
      return [];
    }
  }

  /**
   * Get trust score and level
   */
  async getTrustScore(userId: string): Promise<UserTrustSummary | null> {
    try {
      const { data, error } = await supabase
        .from('user_trust_summary')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching trust score:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getTrustScore:', error);
      return null;
    }
  }

  /**
   * Add a new interest for the current user
   */
  async addInterest(
    interestCategory: string,
    interestName: string,
    interestLevel: 'casual' | 'moderate' | 'passionate' | 'expert' = 'casual'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_interests')
        .insert({
          interest_category: interestCategory,
          interest_name: interestName,
          interest_level: interestLevel,
        });

      if (error) {
        console.error('❌ Error adding interest:', error);
        return false;
      }

      console.log('✅ Interest added successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in addInterest:', error);
      return false;
    }
  }

  /**
   * Remove an interest
   */
  async removeInterest(interestId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('id', interestId);

      if (error) {
        console.error('❌ Error removing interest:', error);
        return false;
      }

      console.log('✅ Interest removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in removeInterest:', error);
      return false;
    }
  }

  /**
   * Recalculate trust score for a user
   */
  async recalculateTrustScore(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_user_trust_score', {
        p_user_id: userId
      });

      if (error) {
        console.error('❌ Error recalculating trust score:', error);
        return 0;
      }

      console.log('✅ Trust score recalculated:', data);
      return data || 0;
    } catch (error) {
      console.error('❌ Error in recalculateTrustScore:', error);
      return 0;
    }
  }

  /**
   * Get trust level color
   */
  getTrustLevelColor(trustLevel: string): string {
    switch (trustLevel) {
      case 'expert':
        return '#FFD700'; // Gold
      case 'verified':
        return '#4CAF50'; // Green
      case 'trusted':
        return '#2196F3'; // Blue
      case 'building':
        return '#FF9800'; // Orange
      case 'new':
      default:
        return '#9E9E9E'; // Gray
    }
  }

  /**
   * Get trust level description
   */
  getTrustLevelDescription(trustLevel: string): string {
    switch (trustLevel) {
      case 'expert':
        return 'Expert user with maximum trust score';
      case 'verified':
        return 'Verified user with high trust score';
      case 'trusted':
        return 'Trusted user with good reputation';
      case 'building':
        return 'Building trust and reputation';
      case 'new':
      default:
        return 'New user starting their journey';
    }
  }

  /**
   * Get interest level emoji
   */
  getInterestLevelEmoji(level: string): string {
    switch (level) {
      case 'expert':
        return '🎯';
      case 'passionate':
        return '🔥';
      case 'moderate':
        return '👍';
      case 'casual':
      default:
        return '😊';
    }
  }
}

export default EnhancedBuddyProfileService.getInstance();

