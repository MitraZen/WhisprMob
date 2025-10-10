import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../store/AuthContext';
import { BuddiesService } from '../services/buddiesService';
import { theme, spacing, borderRadius, moodConfig } from '@/utils/theme';
import { MoodType } from '@/types';

interface SendNoteScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
  onGoBack?: () => void;
}

const SendNoteScreen: React.FC<SendNoteScreenProps> = ({ onNavigate, user, onGoBack }) => {
  const [noteContent, setNoteContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Android back button to prevent accidental navigation
  useEffect(() => {
    const backAction = () => {
      // If there's content, show confirmation before going back
      if (noteContent.trim()) {
        Alert.alert(
          'Discard Note?',
          'You have unsaved content. Are you sure you want to go back?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive', 
              onPress: () => onGoBack ? onGoBack() : onNavigate('notes')
            }
          ]
        );
        return true; // Prevent default behavior
      } else {
        // No content, allow normal back navigation
        onGoBack ? onGoBack() : onNavigate('notes');
        return true; // Prevent default behavior
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [noteContent, onGoBack, onNavigate]);

  const handleSendNote = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Error', 'Note content cannot be empty.');
      return;
    }
    if (!selectedMood) {
      Alert.alert('Error', 'Please select a mood.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setLoading(true);
    try {
      // Call the sendWhisprNote service method
      const noteId = await BuddiesService.sendWhisprNote(user.id, noteContent, selectedMood);
      if (noteId) {
        Alert.alert('Success', 'Your note has been sent!', [
          {
            text: 'OK',
            onPress: () => {
              setNoteContent('');
              setSelectedMood(null);
              onNavigate('notes'); // Navigate back to Whispr Notes screen
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to send note.');
      }
    } catch (error: any) {
      console.error('Error sending note:', error);
      Alert.alert('Error', 'Failed to send note: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onGoBack ? onGoBack() : onNavigate('notes')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Send Your Note</Text>
          <Text style={styles.headerSubtitle}>Share your thoughts with the world</Text>
        </View>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
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
                placeholderTextColor="#666"
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

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Icon name="information-circle" size={20} color="#7c3aed" />
            <Text style={styles.infoText}>
              Your note will be anonymous and shared with other users. It will expire after 7 days.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!noteContent.trim() || !selectedMood || loading) && styles.sendButtonDisabled
          ]}
          onPress={handleSendNote}
          disabled={loading || !noteContent.trim() || !selectedMood}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" style={styles.sendIcon} />
              <Text style={styles.sendButtonText}>Send Note</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  moodSelector: {
    marginTop: 8,
  },
  moodButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedMoodButton: {
    borderColor: '#7c3aed',
    backgroundColor: '#f0f4ff',
  },
  moodButtonEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodButtonText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sendIcon: {
    marginRight: 4,
  },
});

export default SendNoteScreen;
