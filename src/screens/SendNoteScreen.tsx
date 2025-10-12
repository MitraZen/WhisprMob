import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { moodConfig, spacing, borderRadius } from '@/utils/themes';
import { BuddiesService } from '@/services/buddiesService';
import { MoodType } from '@/types';

interface SendNoteScreenProps {
  onNavigate: (screen: string) => void;
  onGoBack?: () => void;
  user?: any; // ADDED: User prop for authentication context
}

const SendNoteScreen: React.FC<SendNoteScreenProps> = ({ onNavigate, onGoBack, user }) => {
  const { theme } = useTheme();
  const [noteContent, setNoteContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendNote = async () => {
    if (!noteContent.trim()) {
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

    setLoading(true);
    
    try {
      console.log('Sending Whispr note:', { content: noteContent, mood: selectedMood, userId: user.id });
      
      const noteId = await BuddiesService.sendWhisprNote(user.id, noteContent.trim(), selectedMood);
      
      console.log('Note sent successfully:', noteId);
      
      Alert.alert(
        'Note Sent! ✨',
        'Your Whispr note has been sent to the world. Someone might listen to it soon!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setNoteContent('');
              setSelectedMood(null);
              // Navigate back
              if (onGoBack) {
                onGoBack();
              } else {
                onNavigate('notes');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sending note:', error);
      Alert.alert(
        'Error',
        'Failed to send your note. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onGoBack ? onGoBack() : onNavigate('notes')}
        >
          <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send Your Note</Text>
          <Text style={styles.headerSubtitle}>Share your thoughts with the world</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          
          {/* Note Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>What's on your mind?</Text>
            <TouchableWithoutFeedback
              onPress={() => {
                // Prevent any touch events from bubbling up
              }}
            >
              <View>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Write your anonymous message here..."
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  multiline
                  value={noteContent}
                  onChangeText={setNoteContent}
                  maxLength={500}
                  contextMenuHidden={true}
                  onSelectionChange={() => {
                    // Prevent any selection-related navigation issues
                  }}
                  onTouchStart={(event) => {
                    // Handle touch events to prevent back button behavior
                    event.stopPropagation();
                  }}
                  onTouchEnd={(event) => {
                    // Handle touch events to prevent back button behavior
                    event.stopPropagation();
                  }}
                  editable={true}
                  selectTextOnFocus={false}
                />
              </View>
            </TouchableWithoutFeedback>
            <Text style={styles.characterCount}>
              {noteContent.length}/500 characters
            </Text>
          </View>

          {/* Mood Selection Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>How are you feeling?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodSelector}>
              {Object.entries(moodConfig).map(([type, config]) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.moodButton, 
                    selectedMood === type && styles.selectedMoodButton
                  ]}
                  onPress={() => setSelectedMood(type as MoodType)}
                >
                  <Text style={styles.moodButtonEmoji}>{config.emoji}</Text>
                  <Text style={styles.moodButtonText}>{config.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Icon name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                Your note will be anonymous and shared with other users. It will expire after 7 days.
              </Text>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!noteContent.trim() || !selectedMood || loading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendNote}
            disabled={loading || !noteContent.trim() || !selectedMood}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <>
                <Icon 
                  name="send" 
                  size={20} 
                  color={(!noteContent.trim() || !selectedMood) ? theme.colors.onSurfaceVariant : theme.colors.onPrimary} 
                  style={styles.sendIcon} 
                />
                <Text style={[
                  styles.sendButtonText,
                  (!noteContent.trim() || !selectedMood) && styles.sendButtonTextDisabled
                ]}>
                  {!noteContent.trim() ? 'Enter your note' : !selectedMood ? 'Select a mood' : 'Send Note'}
                </Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  noteInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  characterCount: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  moodSelector: {
    marginTop: spacing.sm,
  },
  moodButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedMoodButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  moodButtonEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  moodButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.sm,
    flex: 1,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  sendIcon: {
    marginRight: spacing.sm,
  },
  sendButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  sendButtonTextDisabled: {
    color: theme.colors.onSurfaceVariant,
  },
});

export default SendNoteScreen;