/**
 * Profile Header Component
 * Main profile information display with avatar, name, stats, and quick actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius, getMoodConfig } from '@/utils/themes';
import { ProfileData } from '@/types/profile.types';
import { getInitials } from '@/utils/profile.utils';

interface ProfileHeaderProps {
  profileData: ProfileData;
  onMoodPress: () => void;
  onPrivacyPress?: () => void;
  privacySettings?: {
    profileVisibility: 'public' | 'friends' | 'private';
  };
  theme: any;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profileData,
  onMoodPress,
  onPrivacyPress,
  privacySettings,
  theme,
}) => {
  const styles = createStyles(theme);
  const moodConfig = getMoodConfig(profileData.mood);
  const initials = getInitials(profileData.displayName);
  
  // Create gradient from mood color
  // Use the mood color as both start and end for a solid gradient
  // If gradient property exists, use it; otherwise create from color
  const gradientColors: string[] = Array.isArray((moodConfig as any).gradient) 
    ? (moodConfig as any).gradient 
    : [
        moodConfig.color || '#f59e0b',
        moodConfig.color || '#f59e0b', // Same color for solid appearance
      ];

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    const total = 5;
    if (profileData.bio && profileData.bio !== 'No bio yet') completed++;
    if (profileData.location && profileData.location !== 'Not specified') completed++;
    if (profileData.gender && profileData.gender !== 'Not specified') completed++;
    if (profileData.dateOfBirth) completed++;
    if (profileData.displayName && profileData.displayName !== 'Anonymous User') completed++;
    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletion();

  // Get privacy status text and color
  const getPrivacyStatusText = () => {
    if (!privacySettings) return 'Public Profile';
    switch (privacySettings.profileVisibility) {
      case 'private': return 'Private Profile';
      case 'friends': return 'Friends Only';
      default: return 'Public Profile';
    }
  };

  const getPrivacyStatusColor = () => {
    if (!privacySettings) return theme.colors.success;
    switch (privacySettings.profileVisibility) {
      case 'private': return theme.colors.error;
      case 'friends': return theme.colors.warning;
      default: return theme.colors.success;
    }
  };

  return (
    <View style={styles.profileSection}>
      <View style={styles.profileContent}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={gradientColors}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {profileData.displayName.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          {/* Online Status Indicator */}
          <View style={styles.onlineIndicator} />
        </View>

        {/* Display Name */}
        <Text style={styles.displayName}>{profileData.displayName}</Text>

        {/* Username */}
        <Text style={styles.username}>@{profileData.username}</Text>

        {/* Mood Badge */}
        <TouchableOpacity
          style={[styles.moodBadge, { backgroundColor: moodConfig.color + '20' }]}
          onPress={onMoodPress}
          activeOpacity={0.8}
        >
          <View style={styles.moodBadgeContent}>
            <Text style={styles.moodEmoji}>{moodConfig.emoji}</Text>
            <Text style={[styles.moodText, { color: moodConfig.color }]}>
              {moodConfig.description}
            </Text>
            <Icon name="chevron-down" size={16} color={theme.colors.onSurface} />
          </View>
        </TouchableOpacity>

        {/* Profile Completion Indicator */}
        <View style={styles.completionContainer}>
          <View style={styles.completionHeader}>
            <Icon name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={styles.completionText}>Profile Complete</Text>
          </View>
          <View style={styles.completionBar}>
            <View style={[styles.completionProgress, { width: `${completionPercentage}%` }]} />
          </View>
          <Text style={styles.completionPercentage}>{completionPercentage}%</Text>
        </View>

        {/* Privacy Status Indicator */}
        {onPrivacyPress && (
          <TouchableOpacity
            style={styles.privacyStatusContainer}
            onPress={onPrivacyPress}
            activeOpacity={0.7}
          >
            <View style={styles.privacyStatusHeader}>
              <Icon name="shield-outline" size={16} color={getPrivacyStatusColor()} />
              <Text style={[styles.privacyStatusText, { color: getPrivacyStatusColor() }]}>
                {getPrivacyStatusText()}
              </Text>
              <Icon name="chevron-forward" size={14} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={styles.privacyStatusDescription}>
              Tap to manage your privacy settings
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  profileContent: {
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  displayName: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  username: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.success,
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  moodBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
    ...theme.shadows.sm,
  },
  moodBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  moodText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  completionContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.sm,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completionText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  completionBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  completionProgress: {
    height: '100%',
    backgroundColor: theme.colors.success,
    borderRadius: borderRadius.full,
  },
  completionPercentage: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  privacyStatusContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
  },
  privacyStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  privacyStatusText: {
    ...theme.typography.titleSmall,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  privacyStatusDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.lg,
  },
});

