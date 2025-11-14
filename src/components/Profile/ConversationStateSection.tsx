/**
 * Conversation State Section Component
 * Display current conversation state/mood
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ConversationState } from '@/types/profile.types';
import { CONVERSATION_STATES } from '@/config/profile.config';

interface ConversationStateSectionProps {
  conversationState: ConversationState;
  onPress: () => void;
  theme: any;
}

export const ConversationStateSection: React.FC<ConversationStateSectionProps> = ({
  conversationState,
  onPress,
  theme,
}) => {
  const styles = createStyles(theme);
  const currentState = CONVERSATION_STATES.find(
    state => state.id === conversationState.conversationMode
  ) || CONVERSATION_STATES[0];

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="chatbubbles-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Conversation Mode</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Icon name="create-outline" size={16} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.currentStateContainer}>
          <View style={[
            styles.stateEmojiContainer,
            { backgroundColor: currentState.color + '20' }
          ]}>
            <Text style={styles.stateEmoji}>{currentState.emoji}</Text>
          </View>
          <View style={styles.stateInfoContainer}>
            <Text style={styles.stateLabel}>{currentState.label}</Text>
            <Text style={styles.stateDescription}>{currentState.description}</Text>
            <View style={styles.availabilityContainer}>
              <View style={[
                styles.availabilityIndicator,
                { backgroundColor: getAvailabilityColor(conversationState.availability) }
              ]} />
              <Text style={[
                styles.availabilityText,
                { color: getAvailabilityColor(conversationState.availability) }
              ]}>
                {getAvailabilityText(conversationState.availability)}
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.changeStateButton}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Icon name="swap-horizontal-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.changeStateText}>Change Mode</Text>
        </TouchableOpacity>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  editButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  currentStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stateEmojiContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stateEmoji: {
    fontSize: 28,
  },
  stateInfoContainer: {
    flex: 1,
  },
  stateLabel: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  stateDescription: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  availabilityText: {
    ...theme.typography.bodySmall,
    fontWeight: '500',
  },
  changeStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  changeStateText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
});

