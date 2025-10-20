import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import EnhancedBuddyProfileService, {
  EnhancedBuddyProfile,
  UserAchievement,
  UserInterest,
  TrustMarker,
} from '@/services/enhancedBuddyProfileService';

interface EnhancedBuddyProfileViewProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  buddyName?: string;
}

const { width } = Dimensions.get('window');

export const EnhancedBuddyProfileView: React.FC<EnhancedBuddyProfileViewProps> = ({
  visible,
  onClose,
  userId,
  buddyName,
}) => {
  const { theme } = useTheme();
  const [profileData, setProfileData] = useState<EnhancedBuddyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'achievements' | 'interests' | 'trust'>('achievements');

  useEffect(() => {
    if (visible && userId) {
      loadEnhancedProfile();
    }
  }, [visible, userId]);

  const loadEnhancedProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profile = await EnhancedBuddyProfileService.getEnhancedBuddyProfile(userId);
      
      if (profile) {
        setProfileData(profile);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Error loading enhanced profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const formatJoinDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  const renderAchievementItem = (achievement: UserAchievement) => (
    <View key={achievement.id} style={[styles.achievementItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.achievementIcon}>
        <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
      </View>
      <View style={styles.achievementContent}>
        <Text style={[styles.achievementName, { color: theme.colors.text }]}>
          {achievement.achievement_name}
        </Text>
        <Text style={[styles.achievementDescription, { color: theme.colors.textSecondary }]}>
          {achievement.achievement_description}
        </Text>
        <Text style={[styles.achievementPoints, { color: theme.colors.primary }]}>
          +{achievement.points} points
        </Text>
      </View>
    </View>
  );

  const renderInterestItem = (interest: UserInterest) => (
    <View key={interest.id} style={[styles.interestItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.interestContent}>
        <View style={styles.interestHeader}>
          <Text style={[styles.interestName, { color: theme.colors.text }]}>
            {interest.interest_name}
          </Text>
          <Text style={styles.interestLevelEmoji}>
            {EnhancedBuddyProfileService.getInterestLevelEmoji(interest.interest_level)}
          </Text>
        </View>
        <Text style={[styles.interestCategory, { color: theme.colors.textSecondary }]}>
          {interest.interest_category.charAt(0).toUpperCase() + interest.interest_category.slice(1)}
        </Text>
        <Text style={[styles.interestLevel, { color: theme.colors.primary }]}>
          {interest.interest_level.charAt(0).toUpperCase() + interest.interest_level.slice(1)}
        </Text>
      </View>
    </View>
  );

  const renderTrustMarker = (marker: TrustMarker) => (
    <View key={marker.id} style={[styles.trustMarkerItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.trustMarkerContent}>
        <View style={styles.trustMarkerHeader}>
          <Text style={[styles.trustMarkerName, { color: theme.colors.text }]}>
            {marker.marker_name}
          </Text>
          <View style={[styles.trustScoreBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.trustScoreText, { color: theme.colors.surface }]}>
              +{marker.trust_score}
            </Text>
          </View>
        </View>
        <Text style={[styles.trustMarkerDescription, { color: theme.colors.textSecondary }]}>
          {marker.marker_description}
        </Text>
        <Text style={[styles.trustMarkerDate, { color: theme.colors.textSecondary }]}>
          Verified {formatLastSeen(new Date(marker.verified_at))}
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    if (!profileData) return null;

    switch (activeTab) {
      case 'achievements':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Achievements ({profileData.achievements.length})
            </Text>
            {profileData.achievements.length > 0 ? (
              profileData.achievements.slice(0, 5).map(renderAchievementItem)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  No achievements yet
                </Text>
              </View>
            )}
          </View>
        );

      case 'interests':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              My Interests ({profileData.interests.length})
            </Text>
            {profileData.interests.length > 0 ? (
              profileData.interests.map(renderInterestItem)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  No interests added yet
                </Text>
              </View>
            )}
          </View>
        );

      case 'trust':
        return (
          <View style={styles.tabContent}>
            <View style={styles.trustSummary}>
              <View style={styles.trustScoreContainer}>
                <Text style={[styles.trustScoreLabel, { color: theme.colors.text }]}>
                  Trust Score
                </Text>
                <Text style={[
                  styles.trustScoreValue,
                  { color: EnhancedBuddyProfileService.getTrustLevelColor(profileData.trustSummary.trust_level) }
                ]}>
                  {profileData.trustSummary.total_trust_score}
                </Text>
                <Text style={[
                  styles.trustLevel,
                  { color: EnhancedBuddyProfileService.getTrustLevelColor(profileData.trustSummary.trust_level) }
                ]}>
                  {profileData.trustSummary.trust_level.charAt(0).toUpperCase() + 
                   profileData.trustSummary.trust_level.slice(1)}
                </Text>
              </View>
              <Text style={[styles.trustDescription, { color: theme.colors.textSecondary }]}>
                {EnhancedBuddyProfileService.getTrustLevelDescription(profileData.trustSummary.trust_level)}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Trust Markers ({profileData.trustMarkers.length})
            </Text>
            {profileData.trustMarkers.length > 0 ? (
              profileData.trustMarkers.map(renderTrustMarker)
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  No trust markers yet
                </Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {profileData?.basicInfo.displayName || buddyName || 'Profile'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading profile...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
              onPress={loadEnhancedProfile}
            >
              <Text style={[styles.retryButtonText, { color: theme.colors.surface }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : profileData ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Basic Info */}
            <View style={[styles.basicInfoSection, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.basicInfoHeader}>
                <View style={styles.avatarContainer}>
                  <Icon name="person-circle" size={60} color={theme.colors.primary} />
                </View>
                <View style={styles.basicInfoContent}>
                  <Text style={[styles.displayName, { color: theme.colors.text }]}>
                    {profileData.basicInfo.displayName}
                  </Text>
                  <Text style={[styles.username, { color: theme.colors.textSecondary }]}>
                    @{profileData.basicInfo.username}
                  </Text>
                  <View style={styles.statusContainer}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: profileData.basicInfo.isOnline ? '#4CAF50' : '#9E9E9E' }
                    ]} />
                    <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                      {profileData.basicInfo.isOnline ? 'Online' : 
                       profileData.basicInfo.lastSeen ? formatLastSeen(profileData.basicInfo.lastSeen) : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.bio, { color: theme.colors.text }]}>
                {profileData.basicInfo.bio}
              </Text>

              <View style={styles.basicInfoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Age</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {profileData.basicInfo.age}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Location</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {profileData.basicInfo.location}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Joined</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {formatJoinDate(profileData.basicInfo.joinDate)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Mood</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {profileData.basicInfo.mood}
                  </Text>
                </View>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'achievements' && { borderBottomColor: theme.colors.primary }
                ]}
                onPress={() => setActiveTab('achievements')}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'achievements' ? theme.colors.primary : theme.colors.textSecondary }
                ]}>
                  Achievements
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'interests' && { borderBottomColor: theme.colors.primary }
                ]}
                onPress={() => setActiveTab('interests')}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'interests' ? theme.colors.primary : theme.colors.textSecondary }
                ]}>
                  Interests
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'trust' && { borderBottomColor: theme.colors.primary }
                ]}
                onPress={() => setActiveTab('trust')}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'trust' ? theme.colors.primary : theme.colors.textSecondary }
                ]}>
                  Trust
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {renderTabContent()}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  basicInfoSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  basicInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  basicInfoContent: {
    flex: 1,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  basicInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  achievementIcon: {
    marginRight: 16,
  },
  achievementEmoji: {
    fontSize: 32,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  achievementPoints: {
    fontSize: 12,
    fontWeight: '500',
  },
  interestItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  interestContent: {
    flex: 1,
  },
  interestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  interestName: {
    fontSize: 16,
    fontWeight: '600',
  },
  interestLevelEmoji: {
    fontSize: 20,
  },
  interestCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  interestLevel: {
    fontSize: 12,
    fontWeight: '500',
  },
  trustSummary: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 20,
  },
  trustScoreContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  trustScoreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  trustScoreValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  trustLevel: {
    fontSize: 16,
    fontWeight: '600',
  },
  trustDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  trustMarkerItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  trustMarkerContent: {
    flex: 1,
  },
  trustMarkerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustMarkerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  trustScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trustScoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trustMarkerDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  trustMarkerDate: {
    fontSize: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default EnhancedBuddyProfileView;

