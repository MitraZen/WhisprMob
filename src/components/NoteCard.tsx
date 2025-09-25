import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '@/utils/theme';

interface NoteCardProps {
  id: string;
  text: string;
  tag?: string;
  timeAgo?: string;
  onListen: () => void;
  onReject: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  id,
  text,
  tag = '🌸 Positive Vibe',
  timeAgo = '1m ago',
  onListen,
  onReject,
}) => {
  return (
    <View style={styles.noteCard}>
      {/* Header */}
      <View style={styles.noteHeader}>
        <Text style={styles.noteTag}>{tag}</Text>
        <Text style={styles.noteTime}>{timeAgo}</Text>
      </View>

      {/* Message */}
      <Text style={styles.noteText}>
        {text || 'just wanted to share some good news...'}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.listenBtn} onPress={onListen}>
          <Text style={styles.listenText}>▶ Listen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Text style={styles.rejectText}>✖ Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  noteTag: {
    backgroundColor: '#FDE68A',
    color: '#111827',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
  },
  noteTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noteText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listenBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  listenText: {
    color: '#fff',
    fontWeight: '600',
  },
  rejectText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default NoteCard;
