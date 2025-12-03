/**
 * Reply Composer Component
 * Modal for composing replies to Whispr notes
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { MoodType } from '@/types';
import { useContentModeration } from '@/hooks/useContentModeration';
import { ModerationWarning } from '@/components/ContentModeration/ModerationWarning';
import { contentModerationService } from '@/services/contentModerationService';

interface ReplyComposerProps {
  visible: boolean;
  noteId: string;
  parentReplyId?: string | null;
  onClose: () => void;
  onReplyCreated?: () => void;
  noteContent?: string; // For context display
}

export const ReplyComposer: React.FC<ReplyComposerProps> = ({
  visible,
  noteId,
  parentReplyId,
  onClose,
  onReplyCreated,
  noteContent,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Content moderation
  const { moderationResult, checkContent, clearResult } = useContentModeration({
    debounceMs: 500,
  });

  const handleSubmit = async () => {
    if (!content.trim() || content.length > 500) return;

    // Check content moderation before submitting
    const moderationCheck = await contentModerationService.checkContent(content.trim());
    if (!moderationCheck.isAllowed) {
      Alert.alert(
        'Reply Blocked',
        moderationCheck.message || 'This reply violates community guidelines and cannot be sent.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { BuddiesService } = await import('@/services/buddiesService');
      const reply = await BuddiesService.createReply({
        note_id: noteId,
        parent_reply_id: parentReplyId || null,
        content: content.trim(),
        is_anonymous: isAnonymous,
      });
      
      // Clear form
      setContent('');
      setIsAnonymous(true);
      clearResult();
      
      // Call callback to refresh UI
      onReplyCreated?.();
      
      // Small delay to ensure database updates are reflected
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error creating reply:', error);
      Alert.alert('Error', 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setIsAnonymous(true);
    clearResult();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {parentReplyId ? 'Reply to Reply' : 'Reply to Note'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Note Context (if provided) */}
          {noteContent && (
            <View style={styles.noteContext}>
              <Text style={styles.noteContextLabel}>Replying to:</Text>
              <Text style={styles.noteContextText} numberOfLines={2}>
                {noteContent}
              </Text>
            </View>
          )}

          {/* Content Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Write your reply..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                checkContent(text);
              }}
              multiline
              maxLength={500}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {content.length}/500
            </Text>
          </View>

          {/* Content Moderation Warning */}
          {moderationResult && moderationResult.message && (
            <ModerationWarning
              result={moderationResult}
              onDismiss={clearResult}
              onEdit={() => {
                clearResult();
              }}
            />
          )}

          {/* Anonymous Toggle */}
          <View style={styles.anonymousToggle}>
            <Text style={styles.toggleLabel}>Post anonymously</Text>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primary }}
              thumbColor={isAnonymous ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!content.trim() || isSubmitting || (moderationResult && !moderationResult.isAllowed)) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting || (moderationResult && !moderationResult.isAllowed)}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Post Reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  closeButton: {
    padding: spacing.xs,
  },
  noteContext: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  noteContextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  noteContextText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 120,
    maxHeight: 200,
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  anonymousToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  cancelButtonText: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReplyComposer;

