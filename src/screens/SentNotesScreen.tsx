import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../store/AuthContext';
import { BuddiesService } from '../services/buddiesService';
import { theme, spacing, borderRadius } from '@/utils/theme';

interface SentNotesScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
  onGoBack?: () => void;
}

interface SentNote {
  id: string;
  content: string;
  mood: string;
  status: string;
  propagation_count: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  listened_count: number;
  rejected_count: number;
}

interface NoteRecipient {
  user_id: string;
  username: string;
  status: string;
  received_at: string;
  responded_at: string;
}

const SentNotesScreen: React.FC<SentNotesScreenProps> = ({ onNavigate, user, onGoBack }) => {
  const [sentNotes, setSentNotes] = useState<SentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SentNote | null>(null);
  const [recipients, setRecipients] = useState<NoteRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    loadSentNotes();
  }, []);

  const loadSentNotes = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const notes = await BuddiesService.getSentNotes(user.id);
      setSentNotes(notes);
    } catch (error) {
      console.error('Error loading sent notes:', error);
      Alert.alert('Error', 'Failed to load sent notes');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipients = async (noteId: string) => {
    try {
      setLoadingRecipients(true);
      const recipientsData = await BuddiesService.getNoteRecipients(noteId);
      setRecipients(recipientsData);
    } catch (error) {
      console.error('Error loading recipients:', error);
      Alert.alert('Error', 'Failed to load recipients');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSentNotes();
    setRefreshing(false);
  };

  const handleNotePress = (note: SentNote) => {
    setSelectedNote(note);
    loadRecipients(note.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'listened': return '#2196F3';
      case 'rejected': return '#F44336';
      case 'expired': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return 'radio-button-on';
      case 'listened': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'expired': return 'time';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Sent Notes',
      'Are you sure you want to clear all your sent notes? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all sent notes from database
              await BuddiesService.clearSentNotes(user.id);
              
              // Clear local state
              setSentNotes([]);
              setSelectedNote(null);
              setRecipients([]);
              
              // Show success message
              Alert.alert('Success', 'All sent notes have been permanently cleared.');
            } catch (error) {
              console.error('Error clearing sent notes:', error);
              Alert.alert('Error', 'Failed to clear sent notes. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderNoteItem = ({ item }: { item: SentNote }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => handleNotePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.noteHeader}>
        <View style={styles.noteInfo}>
          <Text style={styles.noteContent} numberOfLines={2}>
            {item.content}
          </Text>
          <View style={styles.noteMeta}>
            <Text style={styles.noteMood}>Mood: {item.mood}</Text>
            <Text style={styles.noteDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <Icon
            name={getStatusIcon(item.status)}
            size={20}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.noteStats}>
        <View style={styles.statItem}>
          <Icon name="send" size={16} color="#6b7280" />
          <Text style={styles.statText}>{item.recipient_count} delivered</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="play" size={16} color="#10b981" />
          <Text style={styles.statText}>{item.listened_count} listened</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="close" size={16} color="#ef4444" />
          <Text style={styles.statText}>{item.rejected_count} rejected</Text>
        </View>
      </View>
      
      <View style={styles.noteFooter}>
        <Text style={styles.tapHint}>Tap to view recipients</Text>
        <Icon name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );

  const renderRecipientItem = ({ item }: { item: NoteRecipient }) => (
    <View style={styles.recipientCard}>
      <View style={styles.recipientHeader}>
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{item.username}</Text>
          <Text style={styles.recipientDate}>
            Received: {formatDate(item.received_at)}
          </Text>
          {item.responded_at && (
            <Text style={styles.recipientDate}>
              Responded: {formatDate(item.responded_at)}
            </Text>
          )}
        </View>
        <View style={styles.recipientStatus}>
          <Icon
            name={getStatusIcon(item.status)}
            size={20}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.recipientStatusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        onPress={() => {
          Clipboard.setString(item.user_id);
          Alert.alert('Copied', 'User ID copied to clipboard');
        }}
        style={styles.userIdContainer}
        activeOpacity={0.7}
      >
        <Text style={styles.recipientUserId}>ID: {item.user_id}</Text>
        <Icon name="copy-outline" size={14} color="#7c3aed" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sent notes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onGoBack ? onGoBack() : onNavigate('notes')}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sent Notes</Text>
        {sentNotes.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Icon name="trash-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>

      {selectedNote ? (
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedNote(null)}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Recipients</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.noteDetail}>
            <Text style={styles.noteDetailContent}>{selectedNote.content}</Text>
            <Text style={styles.noteDetailMood}>Mood: {selectedNote.mood}</Text>
            <Text style={styles.noteDetailDate}>
              Sent: {formatDate(selectedNote.created_at)}
            </Text>
          </View>

          {loadingRecipients ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading recipients...</Text>
            </View>
          ) : (
            <FlatList
              data={recipients}
              keyExtractor={(item) => item.user_id}
              renderItem={renderRecipientItem}
              style={styles.recipientsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={sentNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          style={styles.notesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No sent notes yet</Text>
            <Text style={styles.emptySubtext}>
              Create a note to see it here
            </Text>
          </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  clearButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  noteInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  noteContent: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteMood: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  noteDate: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  statusContainer: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  noteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: spacing.xs,
  },
  tapHint: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  noteDetail: {
    backgroundColor: theme.colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  noteDetailContent: {
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  noteDetailMood: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  noteDetailDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  recipientCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  recipientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  recipientInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  recipientDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  recipientStatus: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  recipientStatusText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#7c3aed15',
  },
  recipientUserId: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  notesList: {
    flex: 1,
    padding: 16,
  },
  noteItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noteInfo: {
    flex: 1,
    marginRight: 12,
  },
  noteContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  noteMood: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  noteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  noteDetail: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteDetailContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  noteDetailMood: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  noteDetailDate: {
    fontSize: 12,
    color: '#999',
  },
  recipientsList: {
    flex: 1,
    padding: 16,
  },
  recipientItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recipientUserId: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },
  copyIcon: {
    marginLeft: 6,
  },
  recipientDate: {
    fontSize: 12,
    color: '#666',
  },
  recipientStatus: {
    alignItems: 'center',
  },
  recipientStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default SentNotesScreen;
