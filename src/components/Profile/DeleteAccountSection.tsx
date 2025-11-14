/**
 * Delete Account Section Component
 * Section for account deletion with confirmation
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
interface DeleteAccountSectionProps {
  onDelete: () => Promise<void>;
  isLoading?: boolean;
  theme: any;
}

export const DeleteAccountSection: React.FC<DeleteAccountSectionProps> = ({
  onDelete,
  isLoading = false,
  theme,
}) => {
  const styles = createStyles(theme);
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);

  const handleDeletePress = () => {
    setShowDeleteDropdown(true);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data, messages, and connections.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowDeleteDropdown(false),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete();
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setShowDeleteDropdown(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeletePress}
        activeOpacity={0.7}
      >
        <View style={styles.deleteButtonContent}>
          <View style={[styles.deleteIconContainer, { backgroundColor: '#ef444415' }]}>
            <Icon name="trash-outline" size={24} color="#ef4444" />
          </View>
          <View style={styles.deleteTextContainer}>
            <Text style={styles.deleteText}>Delete Account</Text>
            <Text style={styles.deleteSubtext}>Permanently delete your account</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableOpacity>

      {/* Delete Account Confirmation Dropdown */}
      {showDeleteDropdown && (
        <View style={styles.deleteDropdown}>
          <View style={styles.deleteDropdownContent}>
            <View style={styles.deleteWarningHeader}>
              <Icon name="warning" size={24} color="#ef4444" />
              <Text style={styles.deleteWarningTitle}>Confirm Account Deletion</Text>
            </View>
            <Text style={styles.deleteWarningText}>
              This action cannot be undone. All your data, messages, and connections will be permanently deleted.
            </Text>
            <View style={styles.deleteDropdownActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteDropdown(false)}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDeleteAccount}
                disabled={isLoading}
              >
                <Text style={styles.deleteConfirmButtonText}>
                  {isLoading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#ef444420',
    shadowColor: '#ef4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  deleteTextContainer: {
    flex: 1,
  },
  deleteText: {
    ...theme.typography.titleMedium,
    color: '#ef4444',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  deleteSubtext: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  deleteDropdown: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#ef444420',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteDropdownContent: {
    padding: spacing.lg,
  },
  deleteWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  deleteWarningTitle: {
    ...theme.typography.titleMedium,
    color: '#ef4444',
    fontWeight: '600',
  },
  deleteWarningText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  deleteDropdownActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    ...theme.typography.labelLarge,
    color: '#ffffff',
    fontWeight: '600',
  },
});

