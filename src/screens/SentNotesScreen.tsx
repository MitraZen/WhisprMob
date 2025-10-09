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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../store/AuthContext';
import { BuddiesService } from '../services/buddiesService';

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
      style={styles.noteItem}
      onPress={() => handleNotePress(item)}
    >
      <View style={styles.noteHeader}>
        <View style={styles.noteInfo}>
          <Text style={styles.noteContent} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={styles.noteMood}>Mood: {item.mood}</Text>
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
          <Icon name="people" size={16} color="#666" />
          <Text style={styles.statText}>{item.recipient_count} recipients</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.statText}>{item.listened_count} listened</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="close-circle" size={16} color="#F44336" />
          <Text style={styles.statText}>{item.rejected_count} rejected</Text>
        </View>
      </View>
      
      <Text style={styles.noteDate}>
        Sent: {formatDate(item.created_at)}
      </Text>
    </TouchableOpacity>
  );

  const renderRecipientItem = ({ item }: { item: NoteRecipient }) => (
    <View style={styles.recipientItem}>
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onGoBack ? onGoBack() : onNavigate('notes')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Sent Notes</Text>
          <Text style={styles.headerSubtitle}>
            {sentNotes.length} note{sentNotes.length !== 1 ? 's' : ''} sent
          </Text>
        </View>
        {sentNotes.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedNote ? (
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedNote(null)}
            >
              <Icon name="arrow-back" size={24} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Recipients</Text>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 2,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
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
