import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
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
  const [showFloatingSend, setShowFloatingSend] = useState(false);
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

  const handleSendNote = async () => {
    if (!message.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to send.');
      return;
    }

    if (!selectedMood) {
      Alert.alert('No Mood Selected', 'Please select a mood for your message.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setIsSending(true);
    const messageContent = message.trim();
    const mood = selectedMood;
    
    // Clear form immediately for better UX
    setMessage('');
    setSelectedMood(null);

    try {
      console.log('Sending Whispr note:', { content: messageContent, mood, userId: user.id });
      const noteId = await BuddiesService.sendWhisprNote(user.id, messageContent, mood);
      console.log('Note sent successfully:', noteId);
      
      Alert.alert('Success', 'Your Whispr note has been sent! 🌟');
      
      // Reload notes to show the new one
      await loadNotes();
      
    } catch (error) {
      console.error('Error sending note:', error);
      Alert.alert('Error', 'Failed to send note. Please try again.');
      // Restore form data if sending failed
      setMessage(messageContent);
      setSelectedMood(mood);
    } finally {
      setIsSending(false);
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

  const truncateText = (text: string, maxLength: number = 100) => {
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
                        
                        {!isExpanded && note.content.length > 100 && (
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

      <View style={styles.composeContainer}>
        <View style={styles.moodSelector}>
          <Text style={styles.moodLabel}>Select your mood:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScrollView}>
            {Object.entries(moodConfig).map(([moodType, config]) => (
              <TouchableOpacity
                key={moodType}
                style={[
                  styles.moodPill,
                  selectedMood === moodType && styles.selectedMoodPill,
                ]}
                onPress={() => setSelectedMood(moodType as MoodType)}
                disabled={isSending}
              >
                <Text style={styles.moodPillEmoji}>{config.emoji}</Text>
                <Text style={[
                  styles.moodPillText,
                  selectedMood === moodType && styles.selectedMoodPillText
                ]}>
                  {config.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.messageInputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#9ca3af"
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                setShowFloatingSend(text.trim().length > 0 && selectedMood !== null);
              }}
              multiline
              maxLength={500}
              editable={!isSending}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.characterCount}>
                {message.length}/500
              </Text>
              {selectedMood && (
                <View style={styles.selectedMoodBadge}>
                  <Text style={styles.moodBadgeEmoji}>
                    {getMoodConfig(selectedMood).emoji}
                  </Text>
                  <Text style={styles.moodBadgeText}>
                    {getMoodConfig(selectedMood).description}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* Floating Send Button */}
        {showFloatingSend && (
          <TouchableOpacity
            style={styles.floatingSendButton}
            onPress={handleSendNote}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.floatingSendIcon}>✈️</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...theme.shadows.lg,
  },
  headerGradient: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...theme.shadows.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    ...theme.typography.displaySmall,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  newUserBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
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
    borderRadius: borderRadius.xxxl,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.sm,
    ...theme.shadows.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  noteCardInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.xxxl,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteMoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...theme.shadows.sm,
  },
  moodEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  moodText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noteContent: {
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 24,
    marginBottom: spacing.md,
    fontWeight: '400',
  },
  expandHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  composeContainer: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.lg,
  },
  moodSelector: {
    marginBottom: spacing.lg,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  moodScrollView: {
    paddingHorizontal: spacing.xs,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadows.sm,
  },
  selectedMoodPill: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  moodPillEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  moodPillText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  selectedMoodPillText: {
    color: '#fff',
    fontWeight: '700',
  },
  messageInputContainer: {
    marginBottom: spacing.md,
  },
  inputWrapper: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...theme.shadows.sm,
  },
  messageInput: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
    maxHeight: 120,
    minHeight: 50,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  selectedMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...theme.shadows.sm,
  },
  moodBadgeEmoji: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  moodBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  floatingSendButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingSendIcon: {
    fontSize: 24,
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
    });

export default WhisprNotesScreen;
