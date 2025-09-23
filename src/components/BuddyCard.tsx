import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { Buddy } from '@/services/buddiesService';

interface BuddyCardProps {
  buddy: Buddy;
  onPress: () => void;
  onPinToggle: () => void;
  onClearChat: () => void;
  formatLastSeen: (lastMessageTime?: Date) => string;
}

export const BuddyCard: React.FC<BuddyCardProps> = ({
  buddy,
  onPress,
  onPinToggle,
  onClearChat,
  formatLastSeen,
}) => {
  return (
    <TouchableOpacity
      style={styles.buddyCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.buddyContent}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {buddy.initials || buddy.name?.charAt(0) || '?'}
            </Text>
          </View>
          {buddy.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{buddy.unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.buddyInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.buddyName}>{buddy.name}</Text>
            {buddy.isPinned && <Text style={styles.pinIcon}>📌</Text>}
            <View style={styles.statusRow}>
              <View style={[
                styles.statusIndicator,
                buddy.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
              ]} />
              <Text style={styles.lastSeen}>
                {buddy.isOnline ? 'Online' : formatLastSeen(buddy.lastMessageTime)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.lastMessage} numberOfLines={1}>
            {buddy.lastMessage || 'No messages yet'}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, buddy.isPinned && styles.pinnedButton]}
            onPress={onPinToggle}
          >
            <Text style={styles.actionButtonIcon}>
              {buddy.isPinned ? '📌' : '📍'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClearChat}
          >
            <Text style={styles.actionButtonIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buddyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buddyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: '#fff',
    ...theme.shadows.sm,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  buddyInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  buddyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    flex: 1,
  },
  pinIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  lastSeen: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 13,
    color: theme.colors.onSurface,
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  pinnedButton: {
    backgroundColor: theme.colors.primary,
    opacity: 1,
  },
  actionButtonIcon: {
    fontSize: 14,
  },
});

export default BuddyCard;
