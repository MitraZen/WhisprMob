/**
 * Activity Section Component
 * Display recent user activity with accordion functionality
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Animated } from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { Activity } from '@/types/profile.types';
import { formatActivityTime, getActivityDisplay } from '@/utils/profile.utils';

interface ActivitySectionProps {
  recentActivity: Activity[];
  isExpanded: boolean;
  onToggle: () => void;
  accordionHeight: any;
  onActivityPress?: (activity: Activity) => void;
  onMoodPress?: () => void;
  onEditProfilePress?: () => void;
  theme: any;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  recentActivity = [],
  isExpanded,
  onToggle,
  accordionHeight,
  onActivityPress,
  onMoodPress,
  onEditProfilePress,
  theme,
}) => {
  const styles = createStyles(theme);
  const safeActivity = recentActivity || [];

  const handleActivityPress = (activity: Activity) => {
    if (onActivityPress) {
      onActivityPress(activity);
      return;
    }

    // Default handling if no custom handler provided
    switch (activity.action) {
      case 'message':
        Alert.alert(
          'Message Activity',
          `${activity.title}\n\n${activity.description}\n\nThis would open the conversation.`,
          [{ text: 'OK' }]
        );
        break;
      case 'buddy':
        Alert.alert(
          'Buddy Activity',
          `${activity.title}\n\n${activity.description}\n\nThis would open the buddy's profile.`,
          [{ text: 'OK' }]
        );
        break;
      case 'mood':
        if (onMoodPress) {
          onMoodPress();
        }
        break;
      case 'note':
        Alert.alert(
          'Note Activity',
          `${activity.title}\n\n${activity.description}\n\nThis would show the full note content.`,
          [{ text: 'OK' }]
        );
        break;
      case 'profile':
        if (onEditProfilePress) {
          onEditProfilePress();
        } else {
          Alert.alert(
            'Profile Update',
            `${activity.title}\n\n${activity.description}\n\nThis would open the edit profile screen.`,
            [{ text: 'OK' }]
          );
        }
        break;
      case 'achievement':
        Alert.alert(
          'Achievement Unlocked!',
          `${activity.title}\n\n${activity.description}\n\nThis would show achievement details.`,
          [{ text: 'OK' }]
        );
        break;
      default:
        Alert.alert('Activity', `View details for: ${activity.title}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon name="time" size={24} color="#6366f1" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Recent Activity</Text>
            <Text style={styles.subtitle}>
              {safeActivity.length} activities
            </Text>
          </View>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
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
              outputRange: [0, 300], // TODO: Calculate dynamic height
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
          {safeActivity.length > 0 ? (
            safeActivity.map((activity, index) => {
              const display = getActivityDisplay(activity.type);
              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index === safeActivity.length - 1 && styles.lastActivityItem
                  ]}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityItemContent}>
                    <View style={[
                      styles.activityIconContainer,
                      { backgroundColor: (activity.color || display.color) + '15' }
                    ]}>
                      <Text style={styles.activityIconText}>{activity.icon || display.icon}</Text>
                    </View>
                    <View style={styles.activityTextContainer}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityDescription}>{activity.description}</Text>
                      <Text style={styles.activityTime}>
                        {formatActivityTime(activity.timestamp)}
                      </Text>
                    </View>
                    <Icon
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Icon name="time-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyStateText}>No recent activity</Text>
            </View>
          )}

          <View style={styles.activityFooter}>
            <Text style={styles.activityFooterText}>
              Keep engaging to see more activity! 📱
            </Text>
          </View>
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
  activityItem: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lastActivityItem: {
    marginBottom: 0,
  },
  activityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    ...theme.typography.titleSmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  activityDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  activityTime: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  activityFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  activityFooterText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
});

