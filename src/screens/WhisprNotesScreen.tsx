import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
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
  const { enableAdminMode } = useAdmin();

  // Load notes from database
  useEffect(() => {
    if (user?.id) {
      loadNotes();
    }
  }, [user?.id]);

  // Auto-refresh notes every 15 seconds
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      loadNotes();
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadNotes = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading Whispr notes for user:', user.id);
      
      // Check if user is new (has no buddies) and load fewer notes
      const buddies = await BuddiesService.getBuddies(user.id);
      const userIsNew = !buddies || buddies.length === 0;
      setIsNewUser(userIsNew);
      
      let notesData;
      if (userIsNew) {
        console.log('New user detected, loading limited notes');
        notesData = await BuddiesService.getNewUserNotes(user.id, 5);
      } else {
        console.log('Existing user, loading full notes');
        notesData = await BuddiesService.getWhisprNotes(user.id);
      }
      
      console.log(`Loaded ${notesData.length} notes successfully (${userIsNew ? 'new user' : 'existing user'})`);
      setNotes(notesData);
    } catch (err) {
      console.error('Error loading notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };


  const handleListen = async (noteId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      const result = await BuddiesService.listenToNote(noteId, user.id);
      
      if (result?.success) {
        Alert.alert(
          'Note Listened! 👂', 
          'You\'ve connected with this person! Check your Buddies tab to start chatting.',
          [
            { text: 'OK', onPress: () => onNavigate('buddies') }
          ]
        );
        
        // Reload notes to update the status
        await loadNotes();
      } else {
        Alert.alert('Error', 'Failed to listen to note. Please try again.');
      }
    } catch (error) {
      console.error('Error listening to note:', error);
      Alert.alert('Error', 'Failed to listen to note. Please try again.');
    }
  };

  const handleReject = async (noteId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    try {
      console.log('Rejecting note:', noteId, 'for user:', user.id);
      const result = await BuddiesService.rejectNote(noteId, user.id);
      console.log('Reject result:', result ? 'Success' : 'Failed');
      
      if (result?.success) {
        Alert.alert('Note Rejected', 'The note has been rejected.');
        
        // Reload notes to update the status
        await loadNotes();
      } else {
        Alert.alert('Error', 'Failed to reject note. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting note:', error);
      Alert.alert('Error', 'Failed to reject note. Please try again.');
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const handleLike = (noteId: string) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, likes: (note as any).likes ? (note as any).likes + 1 : 1 }
        : note
    ));
  };

  const handleReply = (noteId: string) => {
    // Navigate to chat or show reply interface
    Alert.alert('Reply', 'Reply functionality coming soon!');
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const getMoodGradient = (mood: string) => {
    const gradients = {
      happy: ['#FFE066', '#FFB84D'],
      sad: ['#B3D9FF', '#87CEEB'],
      excited: ['#FF6B6B', '#FF8E8E'],
      calm: ['#A8E6CF', '#88D8A3'],
      angry: ['#FFB3BA', '#FF9999'],
      hopeful: ['#DDA0DD', '#E6E6FA'],
      anxious: ['#F0E68C', '#F5DEB3'],
      grateful: ['#98FB98', '#90EE90'],
      lonely: ['#D3D3D3', '#C0C0C0'],
      peaceful: ['#E0F6FF', '#B0E0E6'],
    };
    return gradients[mood as keyof typeof gradients] || ['#F0F0F0', '#E0E0E0'];
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Whispr Notes</Text>
            <Text style={styles.subtitle}>Send anonymous messages to the world</Text>
          </View>
          
          {isNewUser && (
            <View style={styles.newUserBanner}>
              <Text style={styles.newUserBannerText}>
                🎉 Welcome! You're seeing a limited set of notes. Listen to notes to discover more!
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading notes...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadNotes}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Text style={styles.emptyIcon}>💭</Text>
              <View style={styles.floatingBubbles}>
                <Text style={styles.bubble1}>✨</Text>
                <Text style={styles.bubble2}>🌟</Text>
                <Text style={styles.bubble3}>💫</Text>
              </View>
            </View>
            <Text style={styles.emptyText}>No Whispr notes yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share your thoughts with the world!</Text>
            <TouchableOpacity style={styles.createFirstNoteButton}>
              <Text style={styles.createFirstNoteText}>Create your first note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {isNewUser && (
              <View style={styles.newUserBanner}>
                <Text style={styles.newUserBannerText}>
                  🎉 Welcome! You're seeing a curated selection of notes. 
                  Listen to notes to make connections and see more!
                </Text>
              </View>
            )}
                {notes.map((note) => {
                  const isExpanded = expandedNotes.has(note.id);
                  const gradient = getMoodGradient(note.mood);
                  
                  return (
                    <TouchableOpacity 
                      key={note.id} 
                      style={[styles.noteCard, { backgroundColor: gradient[0] }]}
                      onPress={() => toggleNoteExpansion(note.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.noteCardInner}>
                        <View style={styles.noteHeader}>
                          <View style={styles.moodIndicator}>
                            <View style={[styles.noteMoodPill, { backgroundColor: gradient[1] }]}>
                              <Text style={styles.moodEmoji}>
                                {getMoodConfig(note.mood).emoji}
                              </Text>
                              <Text style={styles.moodText}>
                                {getMoodConfig(note.mood).description}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.timestamp}>{formatTimestamp(note.createdAt)}</Text>
                        </View>
                        
                        <Text style={styles.noteContent}>
                          {isExpanded ? note.content : truncateText(note.content)}
                        </Text>
                        
                        {!isExpanded && note.content.length > 80 && (
                          <Text style={styles.expandHint}>Tap to expand...</Text>
                        )}
                        
                        <View style={styles.noteActions}>
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.listenButton]}
                            onPress={() => handleListen(note.id)}
                          >
                            <Text style={styles.actionButtonText}>👂 Listen</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleReject(note.id)}
                          >
                            <Text style={styles.actionButtonText}>❌ Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
          </>
        )}
      </ScrollView>

      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => onNavigate('compose')}
        activeOpacity={0.8}
      >
        <View style={styles.fabContent}>
          <Text style={styles.fabIcon}>✨</Text>
          <Text style={styles.fabText}>Start Whispr-ing</Text>
          <Text style={styles.fabArrow}>→</Text>
        </View>
      </TouchableOpacity>
      
      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="notes" onNavigate={onNavigate} />
      
      {/* Debug Overlay */}
      <DebugOverlay onToggleAdmin={enableAdminMode} />
    </KeyboardAvoidingView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    ...theme.shadows.md,
  },
  headerGradient: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...theme.shadows.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    ...theme.typography.displaySmall,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  newUserBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  newUserBannerText: {
    ...theme.typography.bodyMedium,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  notesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  noteCard: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
    ...theme.shadows.md,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noteCardInner: {
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.xl,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteMoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    ...theme.shadows.sm,
  },
  moodEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  moodText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timestamp: {
    fontSize: 10,
    color: '#9ca3af',
  },
  noteContent: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 20,
    marginBottom: spacing.sm,
    fontWeight: '400',
  },
  expandHint: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    ...theme.shadows.sm,
  },
  listenButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  emptyIcon: {
    fontSize: 80,
    textAlign: 'center',
  },
  floatingBubbles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubble1: {
    position: 'absolute',
    top: 10,
    right: 20,
    fontSize: 20,
    opacity: 0.7,
  },
  bubble2: {
    position: 'absolute',
    top: 30,
    left: 10,
    fontSize: 16,
    opacity: 0.5,
  },
  bubble3: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    fontSize: 18,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 20,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  createFirstNoteButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    ...theme.shadows.md,
  },
  createFirstNoteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Floating Action Button
  fabButton: {
    position: 'absolute',
    bottom: 100, // Above navigation menu
    left: '50%',
    marginLeft: -100, // Half of button width to center
    width: 200,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5', // Blue-purple gradient start color
    ...theme.shadows.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  fabIcon: {
    fontSize: 20,
    color: '#fff',
    marginRight: spacing.sm,
  },
  fabText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  fabArrow: {
    fontSize: 18,
    color: '#fff',
    marginLeft: spacing.sm,
  },
});

export default WhisprNotesScreen;
