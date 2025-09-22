import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { theme, spacing, borderRadius, getMoodConfig } from '@/utils/theme';
import { BuddiesService } from '@/services/buddiesService';

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
          username: profile.username || profile.anonymous_id || '@anonymous',
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
        });
      } else {
        // Show a fallback profile instead of error
        setProfileData({
          displayName: buddyName || 'Anonymous User',
          username: '@anonymous',
          bio: 'Profile not available',
          age: 'Not specified',
          location: 'Not specified',
          gender: 'Not specified',
          mood: 'happy',
          joinDate: new Date(),
          isOnline: false,
          lastSeen: null,
        });
        setError(null); // Clear error to show fallback profile
      }
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    width: '95%',
    height: '85%',
    maxWidth: 500,
    minHeight: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
});
