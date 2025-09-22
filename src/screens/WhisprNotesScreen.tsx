import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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
        ? { ...note, likes: note.likes + 1 }
        : note
    ));
  };

  const handleReply = (noteId: string) => {
    // Navigate to chat or show reply interface
    Alert.alert('Reply', 'Reply functionality coming soon!');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Whispr Notes</Text>
        <Text style={styles.subtitle}>Send anonymous messages to the world</Text>
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={[styles.navButton, styles.activeNavButton]}
            onPress={() => onNavigate('notes')}
          >
            <Text style={styles.activeNavButtonText}>📝 Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('buddies')}
          >
            <Text style={styles.navButtonText}>👥 Buddies</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.navButtonText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('settings')}
          >
            <Text style={styles.navButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
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
            <Text style={styles.emptyText}>No Whispr notes yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
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
                {notes.map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <View style={styles.moodIndicator}>
                        <Text style={styles.moodEmoji}>
                          {getMoodConfig(note.mood).emoji}
                        </Text>
                        <Text style={styles.moodText}>
                          {getMoodConfig(note.mood).description}
                        </Text>
                      </View>
                      <Text style={styles.timestamp}>{formatTimestamp(note.createdAt)}</Text>
                    </View>
                    
                    <Text style={styles.noteContent}>{note.content}</Text>
                    
                    <View style={styles.noteActions}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleListen(note.id)}
                      >
                        <Text style={styles.actionButtonText}>👂 Listen</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleReject(note.id)}
                      >
                        <Text style={styles.actionButtonText}>❌ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
          </>
        )}
      </ScrollView>

      <View style={styles.composeContainer}>
        <View style={styles.moodSelector}>
          <Text style={styles.moodLabel}>Select your mood:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(moodConfig).map(([moodType, config]) => (
              <TouchableOpacity
                key={moodType}
                style={[
                  styles.moodButton,
                  selectedMood === moodType && styles.selectedMoodButton,
                ]}
                onPress={() => setSelectedMood(moodType as MoodType)}
                disabled={isSending}
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
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || !selectedMood || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendNote}
            disabled={!message.trim() || !selectedMood || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="notes" onNavigate={onNavigate} />
      
      {/* Debug Overlay */}
      <DebugOverlay onToggleAdmin={enableAdminMode} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  moodEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  moodText: {
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noteContent: {
    fontSize: 16,
    color: theme.colors.onSurface,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  composeContainer: {
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  moodSelector: {
    marginBottom: spacing.md,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  moodButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMoodButton: {
    backgroundColor: '#dbeafe',
    borderColor: theme.colors.primary,
  },
  moodButtonEmoji: {
    fontSize: 20,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: theme.colors.onSurface,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  newUserBanner: {
    backgroundColor: '#e0f2fe',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
      newUserBannerText: {
        fontSize: 14,
        color: '#0369a1',
        textAlign: 'center',
        lineHeight: 20,
      },
    });

export default WhisprNotesScreen;
