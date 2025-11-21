/**
 * Privacy Modal Component
 * Modal for managing privacy settings
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { PrivacySettings } from '@/types/profile.types';
import {
  PRIVACY_VISIBILITY_OPTIONS,
  MESSAGE_ALLOWANCE_OPTIONS,
} from '@/config/profile.config';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  privacySettings: PrivacySettings;
  onSettingsChange: (settings: Partial<PrivacySettings>) => void;
  theme: any;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  visible,
  onClose,
  privacySettings,
  onSettingsChange,
  theme,
}) => {
  const styles = createStyles(theme);

  const handleToggle = (key: keyof typeof privacySettings, value: boolean) => {
    onSettingsChange({ [key]: value });
  };

  const handleVisibilityChange = (value: string) => {
    onSettingsChange({ profileVisibility: value as any });
  };

  const handleMessageAllowanceChange = (value: string) => {
    onSettingsChange({ allowMessages: value as any });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Privacy Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {/* Profile Visibility */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Visibility</Text>
              <Text style={styles.sectionDescription}>
                Control who can see your profile information
              </Text>

              <View style={styles.options}>
                {PRIVACY_VISIBILITY_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      privacySettings.profileVisibility === option.value &&
                        styles.optionSelected,
                    ]}
                    onPress={() => handleVisibilityChange(option.value)}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionLabel,
                          privacySettings.profileVisibility === option.value &&
                            styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {option.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        privacySettings.profileVisibility === option.value &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {privacySettings.profileVisibility === option.value && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Allowance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message Allowance</Text>
              <Text style={styles.sectionDescription}>
                Control who can send you messages
              </Text>

              <View style={styles.options}>
                {MESSAGE_ALLOWANCE_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      privacySettings.allowMessages === option.value &&
                        styles.optionSelected,
                    ]}
                    onPress={() => handleMessageAllowanceChange(option.value)}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionLabel,
                          privacySettings.allowMessages === option.value &&
                            styles.optionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {option.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        privacySettings.allowMessages === option.value &&
                          styles.radioButtonSelected,
                      ]}
                    >
                      {privacySettings.allowMessages === option.value && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Toggle Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other Settings</Text>

              <View style={styles.toggleOptions}>
                <View style={styles.toggleOption}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleLabel}>Show Online Status</Text>
                    <Text style={styles.toggleDescription}>
                      Let others see when you're online
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.showOnlineStatus}
                    onValueChange={value =>
                      handleToggle('showOnlineStatus', value)
                    }
                    trackColor={{
                      false: theme.colors.surfaceVariant,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>

                <View style={styles.toggleOption}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleLabel}>
                      Allow Friend Requests
                    </Text>
                    <Text style={styles.toggleDescription}>
                      Let others send you friend requests
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.allowFriendRequests}
                    onValueChange={value =>
                      handleToggle('allowFriendRequests', value)
                    }
                    trackColor={{
                      false: theme.colors.surfaceVariant,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>

                <View style={styles.toggleOption}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleLabel}>Show Activity Feed</Text>
                    <Text style={styles.toggleDescription}>
                      Display your recent activity
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.showActivityFeed}
                    onValueChange={value =>
                      handleToggle('showActivityFeed', value)
                    }
                    trackColor={{
                      false: theme.colors.surfaceVariant,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>

                <View style={styles.toggleOption}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleLabel}>Share Location</Text>
                    <Text style={styles.toggleDescription}>
                      Show your location to others
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.shareLocation}
                    onValueChange={value =>
                      handleToggle('shareLocation', value)
                    }
                    trackColor={{
                      false: theme.colors.surfaceVariant,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>

                <View style={styles.toggleOption}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleLabel}>Show Mood Status</Text>
                    <Text style={styles.toggleDescription}>
                      Display your current mood
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.showMoodStatus}
                    onValueChange={value =>
                      handleToggle('showMoodStatus', value)
                    }
                    trackColor={{
                      false: theme.colors.surfaceVariant,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>

                <View style={styles.toggleOption}>
                  <View style={styles.toggleContent}>
                    <Text style={styles.toggleLabel}>Show Last Seen</Text>
                    <Text style={styles.toggleDescription}>
                      Display when you were last active
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.showLastSeen}
                    onValueChange={value => handleToggle('showLastSeen', value)}
                    trackColor={{
                      false: theme.colors.surfaceVariant,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.surface}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                onClose();
              }}
            >
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      height: Dimensions.get('window').height * 0.85,
      maxHeight: '90%',
      flexDirection: 'column',
      ...theme.shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: 'bold',
    },
    closeButton: {
      padding: spacing.xs,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    sectionDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.md,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceVariant,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    optionContent: {
      flex: 1,
    },
    optionLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    optionLabelSelected: {
      color: theme.colors.primary,
    },
    optionDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonSelected: {
      borderColor: theme.colors.primary,
    },
    radioButtonInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
    },
    toggleOptions: {
      gap: spacing.md,
    },
    toggleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.surfaceVariant,
    },
    toggleContent: {
      flex: 1,
      marginRight: spacing.md,
    },
    toggleLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    toggleDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    saveButtonText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
    },
  });
