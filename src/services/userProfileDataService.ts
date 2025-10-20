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

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'message_sent' | 'note_shared' | 'buddy_added' | 'mood_changed' | 'profile_updated';
  activity_description: string;
  icon: string;
  color: string;
  timestamp: string;
  metadata?: any;
}

export interface UserStats {
  messagesSent: number;
  buddiesCount: number;
  notesShared: number;
  lastActiveAt: string;
}

class UserProfileDataService {
  private static instance: UserProfileDataService;

  static getInstance(): UserProfileDataService {
    if (!UserProfileDataService.instance) {
      UserProfileDataService.instance = new UserProfileDataService();
    }
    return UserProfileDataService.instance;
  }

  /**
   * Get real user statistics from database
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      console.log('📊 Fetching real user stats for:', userId);

      // Get messages sent count
      const { data: messagesData, error: messagesError } = await supabase
        .from('buddy_messages')
        .select('id')
        .eq('sender_id', userId);

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
      }

      // Get buddies count
      const { data: buddiesData, error: buddiesError } = await supabase
        .from('buddies')
        .select('id')
        .eq('user_id', userId);

      if (buddiesError) {
        console.error('❌ Error fetching buddies:', buddiesError);
      }

      // Get notes shared count
      const { data: notesData, error: notesError } = await supabase
        .from('whispr_notes')
        .select('id')
        .eq('sender_id', userId);

      if (notesError) {
        console.error('❌ Error fetching notes:', notesError);
      }

      // Get last active time
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('last_seen')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
      }

      const stats: UserStats = {
        messagesSent: messagesData?.length || 0,
        buddiesCount: buddiesData?.length || 0,
        notesShared: notesData?.length || 0,
        lastActiveAt: profileData?.last_seen || new Date().toISOString(),
      };

      console.log('✅ Real user stats fetched:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      return {
        messagesSent: 0,
        buddiesCount: 0,
        notesShared: 0,
        lastActiveAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get real achievements from database
   */
  async getRealAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      console.log('🏆 Fetching real achievements for:', userId);

      const { data: achievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Error fetching achievements:', error);
        return [];
      }

      console.log('✅ Real achievements fetched:', achievements?.length || 0);
      return achievements || [];
    } catch (error) {
      console.error('❌ Error fetching achievements:', error);
      return [];
    }
  }

  /**
   * Get real activity data from database
   */
  async getRealActivity(userId: string): Promise<UserActivity[]> {
    try {
      console.log('📱 Fetching real activity for:', userId);

      const activities: UserActivity[] = [];

      // Get recent messages sent
      const { data: messagesData, error: messagesError } = await supabase
        .from('buddy_messages')
        .select('id, content, created_at')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!messagesError && messagesData) {
        messagesData.forEach((message: any) => {
          activities.push({
            id: `msg_${message.id}`,
            user_id: userId,
            activity_type: 'message_sent',
            activity_description: `Sent a message: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`,
            icon: '💬',
            color: '#3b82f6',
            timestamp: message.created_at,
            metadata: { messageId: message.id }
          });
        });
      }

      // Get recent notes shared
      const { data: notesData, error: notesError } = await supabase
        .from('whispr_notes')
        .select('id, content, created_at')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!notesError && notesData) {
        notesData.forEach((note: any) => {
          activities.push({
            id: `note_${note.id}`,
            user_id: userId,
            activity_type: 'note_shared',
            activity_description: `Shared a note: "${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}"`,
            icon: '📝',
            color: '#7c3aed',
            timestamp: note.created_at,
            metadata: { noteId: note.id }
          });
        });
      }

      // Get recent buddy additions
      const { data: buddiesData, error: buddiesError } = await supabase
        .from('buddies')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!buddiesError && buddiesData) {
        buddiesData.forEach((buddy: any) => {
          activities.push({
            id: `buddy_${buddy.id}`,
            user_id: userId,
            activity_type: 'buddy_added',
            activity_description: `Added ${buddy.name} as a buddy`,
            icon: '👥',
            color: '#10b981',
            timestamp: buddy.created_at,
            metadata: { buddyId: buddy.id }
          });
        });
      }

      // Get recent mood changes
      const { data: moodData, error: moodError } = await supabase
        .from('user_profiles')
        .select('mood, updated_at')
        .eq('id', userId)
        .not('updated_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (!moodError && moodData) {
        moodData.forEach((mood: any, index: number) => {
          if (index > 0) { // Skip the first one as it's the current mood
            activities.push({
              id: `mood_${mood.updated_at}`,
              user_id: userId,
              activity_type: 'mood_changed',
              activity_description: `Changed mood to ${mood.mood}`,
              icon: '😊',
              color: '#f59e0b',
              timestamp: mood.updated_at,
              metadata: { mood: mood.mood }
            });
          }
        });
      }

      // Sort activities by timestamp (most recent first) and limit to 10
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      console.log('✅ Real activity fetched:', sortedActivities.length);
      return sortedActivities;
    } catch (error) {
      console.error('❌ Error fetching activity:', error);
      return [];
    }
  }

  /**
   * Create achievement for user (with duplicate check)
   */
  async createAchievement(userId: string, achievementData: {
    achievement_type: string;
    achievement_name: string;
    achievement_description: string;
    icon: string;
    points: number;
  }): Promise<boolean> {
    try {
      console.log('🏆 Creating achievement for user:', userId, achievementData);

      // First, check if user already has this achievement type
      const { data: existingAchievement, error: checkError } = await supabase
        .from('user_achievements')
        .select('id, achievement_type')
        .eq('user_id', userId)
        .eq('achievement_type', achievementData.achievement_type)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking existing achievement:', checkError);
        return false;
      }

      if (existingAchievement) {
        console.log(`ℹ️ User already has ${achievementData.achievement_type} achievement, skipping creation`);
        return true; // Return true since the achievement already exists
      }

      // Create new achievement only if it doesn't exist
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          ...achievementData,
          unlocked_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error creating achievement:', error);
        return false;
      }

      console.log('✅ Achievement created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating achievement:', error);
      return false;
    }
  }

  /**
   * Check and create achievements based on user stats
   */
  async checkAndCreateAchievements(userId: string, stats: UserStats): Promise<void> {
    try {
      console.log('🔍 Checking achievements for user:', userId, stats);

      // Check for message achievements
      if (stats.messagesSent >= 10 && stats.messagesSent < 50) {
        await this.createAchievement(userId, {
          achievement_type: 'messages_sent',
          achievement_name: 'Chatter',
          achievement_description: 'Sent 10 messages',
          icon: '💬',
          points: 10
        });
      } else if (stats.messagesSent >= 50) {
        await this.createAchievement(userId, {
          achievement_type: 'messages_sent',
          achievement_name: 'Social Butterfly',
          achievement_description: 'Sent 50 messages',
          icon: '🦋',
          points: 50
        });
      }

      // Check for buddy achievements
      if (stats.buddiesCount >= 5 && stats.buddiesCount < 20) {
        await this.createAchievement(userId, {
          achievement_type: 'buddies_count',
          achievement_name: 'Connector',
          achievement_description: 'Made 5 buddy connections',
          icon: '🤝',
          points: 25
        });
      } else if (stats.buddiesCount >= 20) {
        await this.createAchievement(userId, {
          achievement_type: 'buddies_count',
          achievement_name: 'Networker',
          achievement_description: 'Made 20 buddy connections',
          icon: '🌐',
          points: 100
        });
      }

      // Check for notes achievements
      if (stats.notesShared >= 3 && stats.notesShared < 10) {
        await this.createAchievement(userId, {
          achievement_type: 'notes_shared',
          achievement_name: 'Storyteller',
          achievement_description: 'Shared 3 notes',
          icon: '📖',
          points: 15
        });
      } else if (stats.notesShared >= 10) {
        await this.createAchievement(userId, {
          achievement_type: 'notes_shared',
          achievement_name: 'Influencer',
          achievement_description: 'Shared 10 notes',
          icon: '⭐',
          points: 75
        });
      }

      console.log('✅ Achievement check completed');
    } catch (error) {
      console.error('❌ Error checking achievements:', error);
    }
  }
}

export default UserProfileDataService;
