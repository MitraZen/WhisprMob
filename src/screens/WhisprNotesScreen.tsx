import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme, spacing, borderRadius, getMoodConfig } from '@/utils/theme';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService, WhisprNote } from '@/services/buddiesService';
import DebugOverlay from '@/components/DebugOverlay';
import { useAdmin } from '@/store/AdminContext';

interface WhisprNotesScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const WhisprNotesScreen: React.FC<WhisprNotesScreenProps> = ({ onNavigate, user }) => {
  const [notes, setNotes] = useState<WhisprNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const { enableAdminMode } = useAdmin();

  // Load notes
  useEffect(() => {
    if (user?.id) loadNotes();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(loadNotes, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const loadNotes = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const buddies = await BuddiesService.getBuddies(user.id);
      const userIsNew = !buddies || buddies.length === 0;
      setIsNewUser(userIsNew);
      let notesData = userIsNew
        ? await BuddiesService.getNewUserNotes(user.id, 5)
        : await BuddiesService.getWhisprNotes(user.id);
      setNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };


  const handleListen = async (noteId: string) => {
    console.log('🎧 Starting to listen to note:', noteId, 'for user:', user.id);
    setActionLoading(prev => new Set(prev).add(noteId));
    try {
      const result = await BuddiesService.listenToNote(noteId, user.id);
      console.log('🎧 Listen result:', result);
      if (result?.success) {
        Alert.alert('Note Listened! 👂', 'You\'ve acknowledged this note.');
        await loadNotes();
      } else {
        console.log('🎧 Listen failed - result:', result);
        Alert.alert('Error', 'Failed to listen to note. Result: ' + JSON.stringify(result));
      }
    } catch (error) {
      console.error('🎧 Error listening to note:', error);
      Alert.alert('Error', 'Failed to listen to note: ' + error.message);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  const handleReject = async (noteId: string) => {
    console.log('❌ Starting to reject note:', noteId, 'for user:', user.id);
    setActionLoading(prev => new Set(prev).add(noteId));
    try {
      const result = await BuddiesService.rejectNote(noteId, user.id);
      console.log('❌ Reject result:', result);
      if (result?.success) {
        Alert.alert('Note Rejected', 'The note has been rejected.');
        await loadNotes();
      } else {
        console.log('❌ Reject failed - result:', result);
        Alert.alert('Error', 'Failed to reject note. Result: ' + JSON.stringify(result));
      }
    } catch (error) {
      console.error('❌ Error rejecting note:', error);
      Alert.alert('Error', 'Failed to reject note: ' + error.message);
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  const formatTimestamp = (ts: Date | string) => {
    const date = ts instanceof Date ? ts : new Date(ts);
    const diff = Date.now() - date.getTime();
    const min = Math.floor(diff / 60000), hr = Math.floor(diff / 3600000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    return date.toLocaleDateString();
  };

  const toggleExpand = (id: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const truncateText = (txt: string, max = 80) =>
    txt.length > max ? txt.substring(0, max) + '...' : txt;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Whispr Notes</Text>
          <Text style={styles.subtitle}>Send anonymous messages to the world</Text>
          {isNewUser && (
            <View style={styles.newUserBanner}>
              <Text style={styles.newUserBannerText}>
                🎉 Welcome! You're seeing a limited set of notes. Listen to discover more!
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Notes List */}
      <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text>Loading notes...</Text>
          </View>
        ) : error ? (
          <View>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity onPress={loadNotes} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💭</Text>
            <Text style={styles.emptyText}>No Whispr notes yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
          </View>
        ) : (
          notes.map(note => {
            const expanded = expandedNotes.has(note.id);
            return (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard]}
                activeOpacity={0.9}
                onPress={() => toggleExpand(note.id)}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.moodIndicator}>
                    <Text style={styles.moodEmoji}>{getMoodConfig(note.mood || 'happy').emoji}</Text>
                    <Text style={styles.moodText}>{getMoodConfig(note.mood || 'happy').description}</Text>
                  </View>
                  <Text style={styles.timestamp}>{formatTimestamp(note.createdAt)}</Text>
                </View>
                <Text style={styles.noteContent}>
                  {expanded ? note.content : truncateText(note.content)}
                </Text>
                {!expanded && note.content.length > 80 && (
                  <Text style={styles.expandHint}>Tap to expand...</Text>
                )}
                <View style={styles.noteActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.listenButton, actionLoading.has(note.id) && styles.actionButtonDisabled]} 
                    onPress={() => handleListen(note.id)}
                    disabled={actionLoading.has(note.id)}
                  >
                    {actionLoading.has(note.id) ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>👂 Listen</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton, actionLoading.has(note.id) && styles.actionButtonDisabled]} 
                    onPress={() => handleReject(note.id)}
                    disabled={actionLoading.has(note.id)}
                  >
                    {actionLoading.has(note.id) ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>❌ Reject</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Demarcation Line */}
      <View style={styles.demarcationContainer}>
        <View style={styles.demarcationLine} />
        <Text style={styles.demarcationText}>Send Your Note</Text>
        <View style={styles.demarcationLine} />
      </View>


      {/* Start Whispr-ing Button */}
      <TouchableOpacity
        style={styles.startWhisperingButtonContainer}
        onPress={() => onNavigate('sendNote')}
        activeOpacity={0.8}
      >
        <View style={styles.startWhisperingButtonGradient}>
          <Icon name="add" size={18} color="#fff" style={styles.startIcon} />
          <Text style={styles.startWhisperingButtonText}>Start Whispr-ing</Text>
          <Icon name="chevron-forward" size={18} color="#fff" style={styles.endIcon} />
        </View>
      </TouchableOpacity>

      <NavigationMenu currentScreen="notes" onNavigate={onNavigate} />
      <DebugOverlay onToggleAdmin={enableAdminMode} />
    </KeyboardAvoidingView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: '#7c3aed',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra padding for camera hole
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.sm,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  newUserBanner: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  newUserBannerText: { color: '#fff', textAlign: 'center' },
  notesContainer: { flex: 1, padding: spacing.md },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...theme.shadows.md,
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  moodIndicator: { flexDirection: 'row', alignItems: 'center' },
  moodEmoji: { fontSize: 16, marginRight: spacing.xs },
  moodText: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurface },
  timestamp: { fontSize: 10, color: '#9ca3af' },
  noteContent: { fontSize: 14, color: theme.colors.onSurface, marginBottom: spacing.sm },
  expandHint: { fontSize: 10, fontStyle: 'italic', color: '#9ca3af' },
  noteActions: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: borderRadius.full },
  listenButton: { backgroundColor: '#10b981' },
  rejectButton: { backgroundColor: '#ef4444' },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: spacing.xl },
  emptyIcon: { fontSize: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  emptySubtext: { fontSize: 14, color: '#9ca3af' },
  demarcationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.background,
  },
  demarcationLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  demarcationText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginHorizontal: spacing.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.xl 
  },
  errorText: { 
    color: '#ef4444', 
    textAlign: 'center', 
    marginBottom: spacing.md 
  },
  retryButton: { 
    backgroundColor: theme.colors.primary, 
    padding: spacing.md, 
    borderRadius: borderRadius.lg, 
    alignItems: 'center' 
  },
  retryButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  actionButtonDisabled: { 
    opacity: 0.6 
  },
  startWhisperingButtonContainer: {
    position: 'absolute',
    bottom: 120, // Moved up from 100 to 120 for better spacing
    alignSelf: 'center', // Center the button
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200, // Set minimum width
    maxWidth: 280, // Set maximum width
  },
  startWhisperingButtonGradient: {
    paddingVertical: 4, // Further reduced from 8 to move content higher
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7B68EE', // Purple background instead of gradient
  },
  startWhisperingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  startIcon: {
    marginRight: 2,
    marginTop: -3, // Increased negative margin to move icon higher
  },
  endIcon: {
    marginLeft: 2,
    marginTop: -3, // Increased negative margin to move icon higher
  },
});

export default WhisprNotesScreen;
