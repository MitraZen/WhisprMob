/**
 * Achievements Section Component
 * Display user achievements with accordion functionality
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Animated } from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { Achievement } from '@/types/profile.types';

interface AchievementsSectionProps {
  achievements: Achievement[];
  isExpanded: boolean;
  onToggle: () => void;
  accordionHeight: any;
  theme: any;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  achievements = [],
  isExpanded,
  onToggle,
  accordionHeight,
  theme,
}) => {
  const styles = createStyles(theme);
  const safeAchievements = achievements || [];

  const unlockedAchievements = safeAchievements.filter(a => a.isUnlocked);
  const inProgressAchievements = safeAchievements.filter(a => !a.isUnlocked);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon name="trophy-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Achievements</Text>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            height: accordionHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400], // TODO: Calculate dynamic height
            }),
            opacity: accordionHeight,
          }
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Unlocked</Text>
              <View style={styles.achievementsGrid}>
                {unlockedAchievements.map((achievement) => (
                  <View key={achievement.id} style={styles.achievementCard}>
                    <View style={[styles.iconContainer, { backgroundColor: achievement.color + '20' }]}>
                      <Text style={styles.icon}>{achievement.icon}</Text>
                    </View>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementPoints}>+{achievement.points} pts</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* In Progress Achievements */}
          {inProgressAchievements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>In Progress</Text>
              {inProgressAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.progressCard}>
                  <View style={styles.progressIconContainer}>
                    <Text style={styles.progressIcon}>{achievement.icon}</Text>
                  </View>
                  <View style={styles.progressContent}>
                    <Text style={styles.progressTitle}>{achievement.title}</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${achievement.progressPercentage || (achievement.progress / achievement.requirement) * 100}%`,
                            backgroundColor: achievement.color
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {achievement.progress}/{achievement.requirement}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  content: {
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  achievementCard: {
    width: '30%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  achievementTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  achievementPoints: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSurfaceVariant,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  progressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginRight: spacing.md,
  },
  progressIcon: {
    fontSize: 20,
  },
  progressContent: {
    flex: 1,
  },
  progressTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  progressText: {
    ...theme.typography.labelSmall,
    color: theme.colors.onSurfaceVariant,
  },
});

