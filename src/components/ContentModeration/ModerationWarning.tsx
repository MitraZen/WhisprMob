/**
 * Moderation Warning Component
 * Displays inline warnings for content moderation violations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ModerationResult } from '@/services/contentModerationService';

interface ModerationWarningProps {
  result: ModerationResult;
  onDismiss?: () => void;
  onEdit?: () => void;
}

export const ModerationWarning: React.FC<ModerationWarningProps> = ({
  result,
  onDismiss,
  onEdit,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Show warning if there's a message OR if there are violations (even for soft violations)
  if (!result.message && result.violations.length === 0) {
    return null;
  }

  const isBlocked = result.severity === 'hard' && result.action === 'block';

  return (
    <View style={[styles.container, isBlocked && styles.blockedContainer]}>
      <View style={styles.content}>
        <Icon
          name={isBlocked ? 'alert-circle' : 'warning'}
          size={20}
          color={isBlocked ? theme.colors.error : theme.colors.warning}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.message, isBlocked && styles.blockedMessage]}>
            {result.message}
          </Text>
          {result.violations.length > 0 && (
            <Text style={styles.details}>
              {result.violations.length} violation{result.violations.length > 1 ? 's' : ''} detected
            </Text>
          )}
        </View>
        {onDismiss && !isBlocked && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Icon name="close" size={18} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
      {isBlocked && result.canEdit && onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.warning + '20',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  blockedContainer: {
    backgroundColor: theme.colors.error + '20',
    borderLeftColor: theme.colors.error,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  blockedMessage: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  details: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  dismissButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  editButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ModerationWarning;

