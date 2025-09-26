import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { theme, spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/theme';
import { MoodType } from '@/types';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService, WhisprNote } from '@/services/buddiesService';
import DebugOverlay from '@/components/DebugOverlay';
import { useAdmin } from '@/store/AdminContext';

interface WhisprNotesScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const WhisprNotesScreen: React.FC<WhisprNotesScreenProps> = ({ onNavigate, user }) => {
  const [message, setMessage] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [notes, setNotes] = useState<WhisprNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

  const handleSendNote = async () => {
    if (!message.trim() || !selectedMood || !user?.id) {
      Alert.alert('Error', 'Please enter a message and select a mood.');
      return;
    }
    setIsSending(true);
    const content = message.trim();
    const mood = selectedMood;
    setMessage('');
    setSelectedMood(null);
    try {
      await BuddiesService.sendWhisprNote(user.id, content, mood);
      Alert.alert('Success', 'Your Whispr note has been sent! 🌟');
      await loadNotes();
    } catch {
      setMessage(content);
      setSelectedMood(mood);
      Alert.alert('Error', 'Failed to send note. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleListen = async (noteId: string) => {
    setActionLoading(prev => new Set(prev).add(noteId));
    try {
      const result = await BuddiesService.listenToNote(noteId, user.id);
      if (result?.success) {
        Alert.alert('Note Listened! 👂', 'You\'ve acknowledged this note.');
        await loadNotes();
      }
    } catch {
      Alert.alert('Error', 'Failed to listen to note.');
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
    }
  };

  const handleReject = async (noteId: string) => {
    setActionLoading(prev => new Set(prev).add(noteId));
    try {
      const result = await BuddiesService.rejectNote(noteId, user.id);
      if (result?.success) {
        Alert.alert('Note Rejected', 'The note has been rejected.');
        await loadNotes();
      }
    } catch {
      Alert.alert('Error', 'Failed to reject note.');
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

      {/* Compose Area */}
      <View style={styles.composeContainer}>
        <View style={styles.moodSelector}>
          <Text style={styles.moodLabel}>Select your mood:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(moodConfig).map(([type, config]) => (
              <TouchableOpacity
                key={type}
                style={[styles.moodButton, selectedMood === type && styles.selectedMoodButton]}
                onPress={() => setSelectedMood(type as MoodType)}
              >
                <Text style={styles.moodButtonEmoji}>{config.emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || !selectedMood || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendNote}
            disabled={!message.trim() || !selectedMood || isSending}
          >
            {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Send</Text>}
          </TouchableOpacity>
        </View>
      </View>

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
  composeContainer: {
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  moodSelector: { marginBottom: spacing.md },
  moodLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  moodButton: {
    width: 48, height: 48, borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
  },
  selectedMoodButton: { borderColor: theme.colors.primary, borderWidth: 2 },
  moodButtonEmoji: { fontSize: 20 },
  messageInputContainer: { flexDirection: 'row', alignItems: 'flex-end' },
  messageInput: {
    flex: 1, borderRadius: borderRadius.lg, padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface,
  },
  sendButton: { marginLeft: spacing.sm, backgroundColor: theme.colors.primary, padding: spacing.md, borderRadius: borderRadius.lg },
  sendButtonDisabled: { backgroundColor: '#9ca3af' },
  sendButtonText: { color: '#fff', fontWeight: '600' },
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
});

export default WhisprNotesScreen;
