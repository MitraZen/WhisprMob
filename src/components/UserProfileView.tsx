import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { theme, spacing, borderRadius, getMoodConfig } from '@/utils/theme';
import { BuddiesService } from '@/services/buddiesService';
import { InterestToken } from '@/types/profile.types';
import { DEFAULT_INTEREST_TOKENS } from '@/config/profile.config';
import { supabase } from '@/config/supabase';
import { getGenderDisplay } from '@/utils/profile.utils';

interface UserProfileViewProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  buddyName?: string;
}

interface ProfileData {
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
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  visible,
  onClose,
  userId,
  buddyName,
}) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestTokens, setInterestTokens] = useState<InterestToken[]>([]);

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
          displayName: profile.display_name || 'Unknown User',
          username: profile.username || 'unknown',
          bio: profile.bio || 'No bio available',
          age: (() => {
            const dob = profile.date_of_birth ? new Date(profile.date_of_birth) : null;
            const numericAge = typeof profile.age === 'number' ? profile.age : parseInt(profile.age, 10);
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
          location: profile.location || 'Not specified',
          gender: getGenderDisplay(profile.gender), // ✅ Format gender properly
          mood: profile.mood || 'neutral',
          joinDate: new Date(profile.created_at),
          isOnline: profile.is_online || false,
          lastSeen: profile.last_seen ? new Date(profile.last_seen) : null,
        });
        
        // Load interest tokens from profile
        try {
          if (profile.interests) {
            const savedInterests = typeof profile.interests === 'string' 
              ? JSON.parse(profile.interests) 
              : profile.interests;
            
            if (Array.isArray(savedInterests) && savedInterests.length > 0) {
              // Merge with defaults to ensure all tokens are available
              const savedTokensMap = new Map(savedInterests.map((t: InterestToken) => [t.id, t]));
              const mergedTokens = DEFAULT_INTEREST_TOKENS.map(defaultToken => {
                const savedToken = savedTokensMap.get(defaultToken.id);
                if (savedToken) {
                  return {
                    ...defaultToken,
                    selected: savedToken.selected,
                    category: savedToken.category || defaultToken.category,
                  };
                }
                return defaultToken;
              });
              setInterestTokens(mergedTokens.filter(t => t.selected));
            } else {
              setInterestTokens([]);
            }
          } else {
            setInterestTokens([]);
          }
        } catch (err) {
          console.error('Error loading interest tokens:', err);
          setInterestTokens([]);
        }
      } else {
        // Show a fallback profile instead of error
        setProfileData({
          displayName: buddyName || 'Unknown User',
          username: 'unknown',
          bio: 'No bio available',
          age: 'Not specified',
          location: 'Not specified',
          gender: 'Not specified',
          mood: 'neutral',
          joinDate: new Date(),
          isOnline: false,
          lastSeen: null,
        });
        setError(null); // Clear error to show fallback profile
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load profile');
      
      // Show fallback profile even on error
      setProfileData({
        displayName: buddyName || 'Unknown User',
        username: 'unknown',
        bio: 'No bio available',
        age: 'Not specified',
        location: 'Not specified',
        gender: 'Not specified',
        mood: 'neutral',
        joinDate: new Date(),
        isOnline: false,
        lastSeen: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {buddyName ? `${buddyName}'s Profile` : 'User Profile'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

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

              {/* Interests */}
              {interestTokens.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Interests ({interestTokens.length})</Text>
                  
                  {/* Group interest tokens by category */}
                  {(() => {
                    const groupedTokens = interestTokens.reduce((acc, token) => {
                      const category = token.category || 'Other';
                      if (!acc[category]) {
                        acc[category] = [];
                      }
                      acc[category].push(token);
                      return acc;
                    }, {} as Record<string, InterestToken[]>);

                    const getCategoryEmoji = (category: string): string => {
                      const categoryEmojis: Record<string, string> = {
                        'Lifestyle & Vibes': '🎯',
                        'Music & Audio': '🎵',
                        'Social & Modern Interests': '🌍',
                        'Nature & Outdoors': '🍀',
                        'Food & Drinks': '🍽️',
                        'Games & Hobbies': '🎮',
                        'Travel & Culture': '🚗',
                        'Mind & Growth': '📚',
                        'Cute & Aesthetic Interests': '🎁',
                        'Fitness & Health': '💪',
                        'Tech & Innovation': '💻',
                      };
                      return categoryEmojis[category] || '📌';
                    };

                    return (
                      <>
                        {Object.entries(groupedTokens).map(([category, tokens]) => (
                          <View key={category} style={styles.interestCategorySection}>
                            <View style={styles.interestCategoryHeader}>
                              <Text style={styles.interestCategoryEmoji}>{getCategoryEmoji(category)}</Text>
                              <Text style={styles.interestCategoryTitle}>{category}</Text>
                            </View>
                            <View style={styles.interestTokensGrid}>
                              {tokens.map((token) => (
                                <View
                                  key={token.id}
                                  style={styles.interestTokenChip}
                                >
                                  <Text style={styles.interestTokenEmoji}>{token.emoji}</Text>
                                  <Text style={styles.interestTokenLabel}>{token.label}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        ))}
                      </>
                    );
                  })()}
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
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
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '90%',
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileContent: {
    padding: spacing.lg,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
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
    color: theme.colors.onSurfaceVariant,
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
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
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
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  moodEmoji: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  moodText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    flex: 1,
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
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    flex: 1,
    textAlign: 'right',
  },
  interestCategorySection: {
    marginBottom: 20,
  },
  interestCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  interestCategoryEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  interestCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  interestTokensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
  },
  interestTokenEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  interestTokenLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
});

export default UserProfileView;