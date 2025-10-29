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
import { BuddiesService } from '../services/buddiesService';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';

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
  user_id?: string;
  recipient_id?: string;
  username?: string;
  display_name?: string;
  status?: string;
  received_at?: string;
  responded_at?: string;
  created_at?: string;
  updated_at?: string;
  id?: string;
}

const SentNotesScreen: React.FC<SentNotesScreenProps> = ({ onNavigate, user, onGoBack }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
      console.log('📋 Loading recipients for note:', noteId);
      
      // First try the RPC function
      try {
        const recipientsData = await BuddiesService.getNoteRecipients(noteId);
        console.log('📋 Recipients data received from RPC:', recipientsData);
        
        if (recipientsData && Array.isArray(recipientsData)) {
          // Ensure data has required fields - be flexible with field names
          const validRecipients = recipientsData.filter((r: any) => r && (r.user_id || r.recipient_id || r.id));
          console.log('📋 Valid recipients count:', validRecipients.length);
          setRecipients(validRecipients);
          return;
        }
      } catch (rpcError: any) {
        const errorMessage = rpcError?.message || String(rpcError);
        console.warn('⚠️ RPC function failed, trying fallback:', errorMessage);
        
        // Check if it's the known database schema error
        if (errorMessage.includes('column up.user_id does not exist') || errorMessage.includes('42703')) {
          console.warn('⚠️ Database function needs fixing: get_note_recipients references wrong column name');
          // Fallback: try to get basic info from note_recipients table directly
          try {
            const { supabase } = await import('@/config/supabase');
            console.log('📋 Attempting fallback query for note:', noteId);
            
            const { data, error: queryError } = await supabase
              .from('note_recipients')
              .select('recipient_id, status, received_at, responded_at, created_at, updated_at')
              .eq('note_id', noteId)
              .order('received_at', { ascending: false });
            
            if (queryError) {
              console.error('❌ Fallback query error:', queryError);
              setRecipients([]);
              return;
            }
            
            if (!data || data.length === 0) {
              console.log('📋 No recipients found in fallback query');
              setRecipients([]);
              return;
            }
            
            console.log('📋 Using fallback query, found recipients:', data.length);
            
            // Map to expected format with username lookup
            const mappedRecipients = await Promise.all(
              data.map(async (r: any) => {
                try {
                  // Try to get username from user_profiles
                  const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('username, display_name, id')
                    .eq('id', r.recipient_id)
                    .maybeSingle();
                  
                  if (profileError) {
                    console.warn('⚠️ Error fetching profile for recipient:', r.recipient_id, profileError);
                  }
                  
                  return {
                    user_id: r.recipient_id,
                    recipient_id: r.recipient_id,
                    username: profile?.username || profile?.display_name || 'Unknown User',
                    display_name: profile?.display_name,
                    status: r.status || 'delivered',
                    received_at: r.received_at || r.created_at,
                    responded_at: r.responded_at || r.updated_at,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                  };
                } catch (profileFetchError) {
                  console.error('❌ Error fetching profile:', profileFetchError);
                  return {
                    user_id: r.recipient_id,
                    recipient_id: r.recipient_id,
                    username: 'Unknown User',
                    status: r.status || 'delivered',
                    received_at: r.received_at || r.created_at,
                    responded_at: r.responded_at || r.updated_at,
                  };
                }
              })
            );
            
            console.log('📋 Mapped recipients:', mappedRecipients.length);
            setRecipients(mappedRecipients);
            return;
          } catch (fallbackError) {
            console.error('❌ Fallback query failed:', fallbackError);
          }
        }
        
        // Re-throw if not the known error
        throw rpcError;
      }
      
      // If we get here, RPC didn't fail but returned invalid data
      console.warn('📋 RPC returned invalid data, setting empty recipients');
      setRecipients([]);
    } catch (error) {
      console.error('❌ Error loading recipients:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Don't show alert on error - just show empty list
      setRecipients([]);
      
      // Log full error for debugging
      if (!errorMessage.includes('column up.user_id does not exist') && !errorMessage.includes('42703')) {
        console.error('❌ Full error details:', error);
      }
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
      case 'active': return theme.colors.success;
      case 'listened': return theme.colors.info;
      case 'rejected': return theme.colors.error;
      case 'expired': return theme.colors.onSurfaceVariant;
      default: return theme.colors.onSurfaceVariant;
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
          <Icon name="send" size={16} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.statText}>
            {/* Recipient count should be total interactions (listened + rejected) */}
            {Math.max(
              item.recipient_count || 0,
              (item.listened_count || 0) + (item.rejected_count || 0)
            )} delivered
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="play" size={16} color={theme.colors.success} />
          <Text style={styles.statText}>
            {/* Listened count cannot exceed recipient count */}
            {(() => {
              const listened = item.listened_count || 0;
              const total = Math.max(
                item.recipient_count || 0,
                (item.listened_count || 0) + (item.rejected_count || 0)
              );
              return Math.min(listened, total);
            })()} listened
          </Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="close" size={16} color={theme.colors.error} />
          <Text style={styles.statText}>
            {/* Rejected count cannot exceed recipient count */}
            {(() => {
              const rejected = item.rejected_count || 0;
              const total = Math.max(
                item.recipient_count || 0,
                (item.listened_count || 0) + (item.rejected_count || 0)
              );
              return Math.min(rejected, total);
            })()} rejected
          </Text>
        </View>
      </View>
      
      <View style={styles.noteFooter}>
        <Text style={styles.tapHint}>Tap to view recipients</Text>
        <Icon name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableOpacity>
  );

  const renderRecipientItem = ({ item }: { item: NoteRecipient }) => {
    // Handle missing data gracefully
    const username = item.username || item.display_name || 'Unknown User';
    const status = item.status || 'delivered';
    const receivedAt = item.received_at || item.created_at || new Date().toISOString();
    const respondedAt = item.responded_at || item.updated_at;
    
    return (
      <View style={styles.recipientCard}>
        <View style={styles.recipientHeader}>
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{username}</Text>
            <Text style={styles.recipientDate}>
              {status === 'listened' ? 'Listened' : status === 'rejected' ? 'Rejected' : 'Received'}: {formatDate(receivedAt)}
            </Text>
            {respondedAt && respondedAt !== receivedAt && (
              <Text style={styles.recipientDate}>
                Responded: {formatDate(respondedAt)}
              </Text>
            )}
          </View>
          <View style={styles.recipientStatus}>
            <Icon
              name={getStatusIcon(status)}
              size={20}
              color={getStatusColor(status)}
            />
            <Text style={[styles.recipientStatusText, { color: getStatusColor(status) }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading recipients...</Text>
            </View>
          ) : recipients.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={64} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>No recipients yet</Text>
              <Text style={styles.emptySubtext}>
                This note hasn't been listened to or rejected by anyone yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={recipients}
              keyExtractor={(item) => item.user_id || item.id || Math.random().toString()}
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
            <Icon name="document-text-outline" size={64} color={theme.colors.onSurfaceVariant} />
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

const createStyles = (theme: any) => StyleSheet.create({
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
    color: theme.colors.onPrimary,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  notesList: {
    flex: 1,
    padding: 16,
  },
  noteItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipientsList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
});

export default SentNotesScreen;
