/**
 * Reply Item Component
 * Displays a single reply with nested replies support
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { WhisprNoteReply } from '@/types/whisprNoteReply.types';

interface ReplyItemProps {
  reply: WhisprNoteReply;
  currentUserId?: string;
  onReply: (parentReplyId: string) => void;
  onDelete?: (replyId: string) => void;
  level?: number; // Nesting level (0 = root, 1 = nested)
}

export const ReplyItem: React.FC<ReplyItemProps> = ({
  reply,
  currentUserId,
  onReply,
  onDelete,
  level = 0,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, level);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete this reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(reply.id),
        },
      ]
    );
  };

  const isOwnReply = currentUserId && reply.user_id === currentUserId;

  return (
    <View style={styles.container}>
      {/* Reply Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorIcon}>👤</Text>
          <Text style={styles.authorName}>
            {reply.is_anonymous ? 'Anonymous' : 'User'}
          </Text>
        </View>
        <Text style={styles.timestamp}>{formatTimeAgo(reply.created_at)}</Text>
      </View>

      {/* Reply Content */}
      <Text style={styles.content}>{reply.content}</Text>

      {/* Reply Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onReply(reply.id)}
        >
          <Icon name="chatbubble-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        {isOwnReply && onDelete && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDelete}
          >
            <Icon name="trash-outline" size={16} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nested Replies */}
      {reply.nestedReplies && reply.nestedReplies.length > 0 && (
        <View style={styles.nestedReplies}>
          {reply.nestedReplies.map((nestedReply) => (
            <ReplyItem
              key={nestedReply.id}
              reply={nestedReply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any, level: number) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    marginLeft: level > 0 ? spacing.lg : 0,
    paddingLeft: level > 0 ? spacing.md : 0,
    borderLeftWidth: level > 0 ? 2 : 0,
    borderLeftColor: level > 0 ? theme.colors.border : 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorIcon: {
    fontSize: 16,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  content: {
    fontSize: 15,
    color: theme.colors.onSurface,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  nestedReplies: {
    marginTop: spacing.md,
    paddingLeft: spacing.md,
  },
});

export default ReplyItem;

