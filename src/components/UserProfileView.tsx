import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme, spacing, borderRadius, getMoodConfig } from '@/utils/theme';
import { BuddiesService } from '@/services/buddiesService';
import UserProfileDataService from '@/services/userProfileDataService';
import { ThemedModal } from '@/components/themed';

interface UserProfileViewProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  buddyName?: string;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ 
  visible, 
  onClose, 
  userId, 
  buddyName 
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (visible && userId) {
      loadUserProfile();
    }
  }, [visible, userId]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const profile = await BuddiesService.getUserProfile(userId);
      
      if (profile) {
        setProfileData({
          displayName: profile.username || profile.name || 'Anonymous User',
          username: profile.username || profile.anonymous_id || 'anonymous',
          bio: profile.bio || 'No bio available',
          age: profile.age || profile.date_of_birth ? 
            (new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()).toString() : 
            'Not specified',
          location: profile.location || profile.country || 'Not specified',
          gender: profile.gender || 'Not specified',
          mood: profile.mood || 'happy',
          joinDate: new Date(profile.created_at),
          isOnline: profile.is_online || false,
          lastSeen: profile.last_seen ? new Date(profile.last_seen) : null,
          // Conversation mode data
          conversationMode: profile.conversation_mode || 'open',
          conversationAvailability: profile.conversation_availability || 'high',
        });
      } else {
        // Show a fallback profile instead of error
        setProfileData({
          displayName: buddyName || 'Anonymous User',
          username: 'anonymous',
          bio: 'Profile not available',
          age: 'Not specified',
          location: 'Not specified',
          gender: 'Not specified',
          mood: 'happy',
          joinDate: new Date(),
          isOnline: false,
          lastSeen: null,
          // Default conversation mode
          conversationMode: 'open',
          conversationAvailability: 'high',
        });
        setError(null); // Clear error to show fallback profile
      }

      // Load real achievements and activity data
      const profileDataService = UserProfileDataService.getInstance();
      
      // Get real achievements
      const realAchievements = await profileDataService.getRealAchievements(userId);
      setAchievements(realAchievements.map(achievement => ({
        id: achievement.id,
        title: achievement.achievement_name,
        description: achievement.achievement_description,
        icon: achievement.icon,
        color: '#f59e0b',
        isUnlocked: true,
        points: achievement.points,
        unlockedAt: achievement.unlocked_at
      })));
      
      // Get real activity
      const realActivity = await profileDataService.getRealActivity(userId);
      setRecentActivity(realActivity.map(activity => ({
        id: activity.id,
        type: activity.activity_type,
        title: activity.activity_description,
        description: `Activity on ${new Date(activity.timestamp).toLocaleDateString()}`,
        icon: activity.icon,
        color: activity.color,
        timestamp: new Date(activity.timestamp),
        action: activity.activity_type
      })));
      
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatJoinDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Conversation mode helper functions
  const getConversationModeConfig = (mode: string) => {
    const conversationStates = [
      {
        id: 'open',
        emoji: '💬',
        label: 'Open to Chat',
        description: 'Ready for any conversation',
        color: '#10b981',
        availability: 'high'
      },
      {
        id: 'reflective',
        emoji: '🤔',
        label: 'Reflective',
        description: 'Prefer deep, thoughtful conversations',
        color: '#6366f1',
        availability: 'medium'
      },
      {
        id: 'playful',
        emoji: '😄',
        label: 'Playful',
        description: 'Fun and light-hearted mood',
        color: '#f59e0b',
        availability: 'high'
      },
      {
        id: 'busy',
        emoji: '⏰',
        label: 'Busy',
        description: 'Limited availability',
        color: '#ef4444',
        availability: 'low'
      },
      {
        id: 'listening',
        emoji: '👂',
        label: 'Listening',
        description: 'Available to listen and support',
        color: '#8b5cf6',
        availability: 'medium'
      },
      {
        id: 'creative',
        emoji: '✨',
        label: 'Creative',
        description: 'Inspired and sharing ideas',
        color: '#ec4899',
        availability: 'high'
      }
    ];
    
    return conversationStates.find(state => state.id === mode) || conversationStates[0];
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'high': return 'Highly Available';
      case 'medium': return 'Moderately Available';
      case 'low': return 'Limited Availability';
      default: return 'Unknown';
    }
  };

  if (!visible) return null;

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      title={buddyName ? `${buddyName}'s Profile` : 'User Profile'}
      size="large"
      slideFrom="bottom"
      animationType="slide"
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : profileData ? (
        <ScrollView style={styles.profileContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {profileData.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profileData.displayName}</Text>
              <Text style={styles.username}>{profileData.username}</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  profileData.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
                ]} />
                <Text style={styles.statusText}>
                  {profileData.isOnline ? 'Online' : 
                   profileData.lastSeen ? `Last seen ${formatLastSeen(profileData.lastSeen)}` : 
                   'Offline'}
                </Text>
              </View>
            </View>
          </View>

          {/* Mood */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Mood</Text>
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>
                {getMoodConfig(profileData.mood).emoji}
              </Text>
              <Text style={styles.moodText}>
                {getMoodConfig(profileData.mood).description}
              </Text>
            </View>
          </View>

          {/* Conversation Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversation Mode</Text>
            <View style={styles.conversationModeContainer}>
              <View style={styles.conversationModeHeader}>
                <View style={[
                  styles.conversationModeEmojiContainer,
                  { backgroundColor: getConversationModeConfig(profileData.conversationMode).color + '20' }
                ]}>
                  <Text style={styles.conversationModeEmoji}>
                    {getConversationModeConfig(profileData.conversationMode).emoji}
                  </Text>
                </View>
                <View style={styles.conversationModeInfo}>
                  <Text style={styles.conversationModeLabel}>
                    {getConversationModeConfig(profileData.conversationMode).label}
                  </Text>
                  <Text style={styles.conversationModeDescription}>
                    {getConversationModeConfig(profileData.conversationMode).description}
                  </Text>
                </View>
              </View>
              <View style={styles.availabilityContainer}>
                <View style={[
                  styles.availabilityIndicator,
                  { backgroundColor: getAvailabilityColor(profileData.conversationAvailability) }
                ]} />
                <Text style={[
                  styles.availabilityText,
                  { color: getAvailabilityColor(profileData.conversationAvailability) }
                ]}>
                  {getAvailabilityText(profileData.conversationAvailability)}
                </Text>
              </View>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profileData.bio}</Text>
          </View>

<<<<<<< HEAD
              {/* Bio */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{profileData.bio}</Text>
              </View>

              {/* Profile Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile Details</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{profileData.age}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{profileData.location}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>{profileData.gender}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Joined</Text>
                  <Text style={styles.detailValue}>{formatJoinDate(profileData.joinDate)}</Text>
                </View>
              </View>

              {/* Recent Achievements */}
              {achievements.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Achievements</Text>
                  <View style={styles.achievementsGrid}>
                    {achievements.slice(0, 4).map((achievement) => (
                      <View key={achievement.id} style={styles.achievementCard}>
                        <View style={styles.achievementIconContainer}>
                          <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                        </View>
                        <View style={styles.achievementContent}>
                          <Text style={styles.achievementTitle}>{achievement.title}</Text>
                          <Text style={styles.achievementDescription}>{achievement.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <View style={styles.activityList}>
                    {recentActivity.slice(0, 5).map((activity) => (
                      <View key={activity.id} style={styles.activityItem}>
                        <View style={styles.activityIconContainer}>
                          <Text style={styles.activityIcon}>{activity.icon}</Text>
                        </View>
                        <View style={styles.activityContent}>
                          <Text style={styles.activityTitle}>{activity.title}</Text>
                          <Text style={styles.activityDescription}>{activity.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
=======
          {/* Profile Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>{profileData.age}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{profileData.location}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender</Text>
              <Text style={styles.detailValue}>{profileData.gender}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Joined</Text>
              <Text style={styles.detailValue}>{formatJoinDate(profileData.joinDate)}</Text>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </ThemedModal>
>>>>>>> defe00e347c1aa12c62d7cfee89f3bd52bb87184
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.glass,
    borderRadius: borderRadius.xl,
    width: '95%',
    height: '85%',
    maxWidth: 500,
    minHeight: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  closeButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileContent: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  username: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  onlineIndicator: {
    backgroundColor: theme.colors.success,
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  moodText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
<<<<<<< HEAD
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flex: 1,
    minWidth: '45%',
    marginBottom: spacing.sm,
  },
  achievementIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: '#f59e0b15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  achievementIcon: {
    fontSize: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 12,
=======
  // Conversation Mode Styles
  conversationModeContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  conversationModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  conversationModeEmojiContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  conversationModeEmoji: {
    fontSize: 20,
  },
  conversationModeInfo: {
    flex: 1,
  },
  conversationModeLabel: {
    fontSize: 16,
>>>>>>> defe00e347c1aa12c62d7cfee89f3bd52bb87184
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
<<<<<<< HEAD
  achievementDescription: {
    fontSize: 10,
    color: '#64748b',
  },
  activityList: {
    gap: spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: '#e2e8f015',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityIcon: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 10,
    color: '#64748b',
=======
  conversationModeDescription: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '500',
>>>>>>> defe00e347c1aa12c62d7cfee89f3bd52bb87184
  },
});
