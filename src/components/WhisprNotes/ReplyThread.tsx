/**
 * Reply Thread Component
 * Displays a collapsible thread of replies for a note
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ReplyItem } from './ReplyItem';
import { BuddiesService } from '@/services/buddiesService';

interface ReplyThreadProps {
  noteId: string;
  replyCount: number;
  currentUserId?: string;
  onReply: (parentReplyId?: string | null) => void;
  onReplyDeleted?: () => void;
}

export const ReplyThread: React.FC<ReplyThreadProps> = ({
  noteId,
  replyCount,
  currentUserId,
  onReply,
  onReplyDeleted,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isExpanded && replies.length === 0) {
      loadReplies();
    }
  }, [isExpanded]);

  // Debug logging removed for performance

  const loadReplies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const repliesData = await BuddiesService.getNoteReplies(noteId, true);
      setReplies(repliesData);
    } catch (err) {
      console.error('Error loading replies:', err);
      setError('Failed to load replies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (replyId: string) => {
    try {
      await BuddiesService.deleteReply(replyId);
      // Reload replies
      await loadReplies();
      onReplyDeleted?.();
    } catch (err) {
      console.error('Error deleting reply:', err);
    }
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Show thread container if there are replies OR if user has expanded it
  // The Reply button is in note actions, so we show thread UI when there are replies or when expanded
  if (replyCount === 0 && !isExpanded) {
    return null;
  }
  
  // If expanded but no replies yet, show empty state
  if (isExpanded && replyCount === 0 && replies.length === 0 && !isLoading) {
    // Load replies to check if any exist
    loadReplies();
  }

  return (
    <View style={styles.container}>
      {/* Thread Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={theme.colors.primary}
          />
          <Text style={styles.headerText}>
            💬 {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </Text>
        </View>
        {!isExpanded && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onReply(null);
            }}
            style={styles.replyButton}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Thread Content */}
      {isExpanded && (
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading replies...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : replies.length === 0 ? (
            <View>
              <Text style={styles.emptyText}>No replies yet. Be the first to reply!</Text>
              <TouchableOpacity
                style={styles.addReplyButton}
                onPress={() => onReply(null)}
              >
                <Icon name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.addReplyText}>Add a reply</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  currentUserId={currentUserId}
                  onReply={(parentReplyId) => onReply(parentReplyId)}
                  onDelete={handleDelete}
                />
              ))}
              {/* Reply Button at bottom */}
              <TouchableOpacity
                style={styles.addReplyButton}
                onPress={() => onReply(null)}
              >
                <Icon name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.addReplyText}>Add a reply</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  replyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
  },
  replyButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
    padding: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    padding: spacing.md,
    fontStyle: 'italic',
  },
  addReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  addReplyText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  simpleReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  simpleReplyButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default ReplyThread;

