/**
 * Profile Options Component
 * List of profile action options (Edit Profile, Change Mood, etc.)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
interface ProfileOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  color: string;
}

interface ProfileOptionsProps {
  options: ProfileOption[];
  theme: any;
}

export const ProfileOptions: React.FC<ProfileOptionsProps> = ({
  options = [],
  theme,
}) => {
  const styles = createStyles(theme);
  const safeOptions = options || [];

  return (
    <View style={styles.container}>
      {safeOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={styles.optionItem}
          onPress={option.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
            <Icon name={option.icon} size={24} color={option.color} />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      ))}
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  optionSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
});

