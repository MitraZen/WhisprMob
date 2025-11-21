/**
 * Conversation Modal Component
 * Modal for changing conversation state/mode
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ConversationState } from '@/types/profile.types';
import { CONVERSATION_STATES } from '@/config/profile.config';
import { Toast, useToast } from '@/components/Toast';

interface ConversationModalProps {
  visible: boolean;
  onClose: () => void;
  conversationState: ConversationState;
  onStateChange: (state: Partial<ConversationState>) => Promise<void>;
  theme: any;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  visible,
  onClose,
  conversationState,
  onStateChange,
  theme,
}) => {
  const styles = createStyles(theme);
  const { toast, showToast, hideToast } = useToast();

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'high':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'high':
        return 'Highly Available';
      case 'medium':
        return 'Moderately Available';
      case 'low':
        return 'Limited Availability';
      default:
        return 'Unknown';
    }
  };

  const handleStateSelect = async (mode: string) => {
    const selectedState = CONVERSATION_STATES.find(s => s.id === mode);
    if (selectedState) {
      try {
        await onStateChange({
          conversationMode: mode as any,
          availability: selectedState.availability,
        });
        showToast(
          `You're now in "${selectedState.label}" mode!`,
          'success',
          3000,
        );
        // Close modal after a short delay to show the toast
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (error) {
        console.error('Error updating conversation state:', error);
      }
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
              <Text style={styles.title}>Conversation State</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.description}>
                How would you like to interact today?
              </Text>

              {/* State Options */}
              <View style={styles.statesContainer}>
                {CONVERSATION_STATES.map(state => {
                  const isSelected =
                    state.id === conversationState.conversationMode;

                  return (
                    <TouchableOpacity
                      key={state.id}
                      style={[
                        styles.stateOption,
                        isSelected && styles.stateOptionSelected,
                        {
                          borderColor: isSelected
                            ? state.color
                            : theme.colors.border,
                        },
                      ]}
                      onPress={() => handleStateSelect(state.id)}
                    >
                      <Text style={styles.stateEmoji}>{state.emoji}</Text>
                      <View style={styles.stateInfo}>
                        <Text
                          style={[
                            styles.stateLabel,
                            isSelected && { color: state.color },
                          ]}
                        >
                          {state.label}
                        </Text>
                        <Text style={styles.stateDescription}>
                          {state.description}
                        </Text>
                        <View style={styles.availabilityContainer}>
                          <View
                            style={[
                              styles.availabilityDot,
                              {
                                backgroundColor: getAvailabilityColor(
                                  state.availability,
                                ),
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.availabilityText,
                              {
                                color: getAvailabilityColor(state.availability),
                              },
                            ]}
                          >
                            {getAvailabilityText(state.availability)}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Icon
                          name="checkmark-circle"
                          size={24}
                          color={state.color}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.saveButton} onPress={onClose}>
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
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
      maxHeight: '80%',
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
      padding: spacing.lg,
    },
    description: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.lg,
    },
    statesContainer: {
      gap: spacing.md,
    },
    stateOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      backgroundColor: theme.colors.surfaceVariant,
    },
    stateOptionSelected: {
      backgroundColor: theme.colors.primary + '10',
    },
    stateEmoji: {
      fontSize: 32,
      marginRight: spacing.md,
    },
    stateInfo: {
      flex: 1,
    },
    stateLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    stateDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.sm,
    },
    availabilityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    availabilityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.xs,
    },
    availabilityText: {
      ...theme.typography.bodySmall,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
    },
    saveButtonText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
    },
  });
