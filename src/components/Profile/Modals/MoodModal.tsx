/**
 * Mood Modal Component
 * Modal for selecting and changing user mood
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/themes';
import { Toast, useToast } from '@/components/Toast';
interface MoodModalProps {
  visible: boolean;
  onClose: () => void;
  currentMood: string;
  onMoodSelect: (mood: string) => Promise<void>;
  theme: any;
}

export const MoodModal: React.FC<MoodModalProps> = ({
  visible,
  onClose,
  currentMood,
  onMoodSelect,
  theme,
}) => {
  const styles = createStyles(theme);
  const { toast, showToast, hideToast } = useToast();

  // TODO: Get available moods from moodConfig
  const moods = Object.keys(moodConfig);

  const handleMoodSelect = async (mood: string) => {
    try {
      await onMoodSelect(mood);
      const config = getMoodConfig(mood);
      showToast(
        `You're now feeling ${config.description.toLowerCase()}!`,
        'success',
        3000
      );
      // Close modal after a short delay to show the toast
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error updating mood:', error);
      showToast('Failed to update mood. Please try again.', 'error', 3000);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Change Mood</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.description}>How are you feeling today?</Text>

              {/* Mood Options */}
              <View style={styles.moodsContainer}>
                {moods.map((mood) => {
                  const config = getMoodConfig(mood);
                  const isSelected = mood === currentMood;
                  
                  return (
                    <TouchableOpacity
                      key={mood}
                      style={[
                        styles.moodOption,
                        isSelected && styles.moodOptionSelected,
                        { borderColor: isSelected ? config.color : theme.colors.border }
                      ]}
                      onPress={() => handleMoodSelect(mood)}
                    >
                      <Text style={styles.moodEmoji}>{config.emoji}</Text>
                      <View style={styles.moodTextContainer}>
                        <Text style={[
                          styles.moodLabel,
                          isSelected && { color: config.color }
                        ]}>
                          {config.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Icon name="checkmark-circle" size={24} color={config.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        action={toast.action}
        onHide={hideToast}
      />
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.xl,
      width: '100%',
      maxWidth: 400,
      height: Dimensions.get('window').height * 0.75,
      maxHeight: '90%',
      overflow: 'hidden',
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
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    description: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.lg,
    },
    moodsContainer: {
      gap: spacing.md,
    },
    moodOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      backgroundColor: theme.colors.surfaceVariant,
    },
    moodOptionSelected: {
      backgroundColor: theme.colors.primary + '10',
    },
    moodEmoji: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    moodTextContainer: {
      flex: 1,
      marginRight: spacing.sm,
    },
    moodLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
  });
