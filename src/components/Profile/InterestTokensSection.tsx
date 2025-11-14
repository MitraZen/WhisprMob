/**
 * Interest Tokens Section Component
 * Display user's selected interest tokens
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { InterestToken } from '@/types/profile.types';

interface InterestTokensSectionProps {
  interestTokens: InterestToken[];
  onPress: () => void;
  theme: any;
}

export const InterestTokensSection: React.FC<InterestTokensSectionProps> = ({
  interestTokens = [],
  onPress,
  theme,
}) => {
  const styles = createStyles(theme);
  const safeTokens = interestTokens || [];
  const selectedTokens = safeTokens.filter(token => token.selected);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="pricetag" size={24} color="#8b5cf6" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Interests</Text>
            <Text style={styles.subtitle}>
              {selectedTokens.length} selected
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Icon name="chevron-forward" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {selectedTokens.length > 0 ? (
        <View style={styles.tokensContainer}>
          {selectedTokens.slice(0, 6).map((token) => (
            <View key={token.id} style={styles.token}>
              <Text style={styles.tokenEmoji}>{token.emoji}</Text>
              <Text style={styles.tokenLabel}>{token.label}</Text>
            </View>
          ))}
          {selectedTokens.length > 6 && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={onPress}
            >
              <Text style={styles.moreText}>+{selectedTokens.length - 6} more</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.emptyState}
          onPress={onPress}
        >
          <Icon name="add-circle-outline" size={32} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.emptyStateText}>Add interests</Text>
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  tokensContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  tokenEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  tokenLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  moreButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  moreText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
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

