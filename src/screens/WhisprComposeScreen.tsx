import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { theme, spacing, borderRadius, moodConfig, getMoodConfig } from '@/utils/theme';
import { MoodType } from '@/types';
import { NavigationMenu } from '@/components/NavigationMenu';
import { BuddiesService } from '@/services/buddiesService';
import DebugOverlay from '@/components/DebugOverlay';
import { useAdmin } from '@/store/AdminContext';
import { notificationService } from '@/services/notificationService';

interface WhisprComposeScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const WhisprComposeScreen: React.FC<WhisprComposeScreenProps> = ({ onNavigate, user }) => {
  const [message, setMessage] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { enableAdminMode } = useAdmin();

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
    
    try {
      console.log('Sending Whispr note:', { message, mood: selectedMood, userId: user.id });
      
      const noteId = await BuddiesService.sendWhisprNote(user.id, message.trim(), selectedMood);
      
      console.log('Note sent successfully:', noteId);
      
      Alert.alert(
        'Note Sent! ✨',
        'Your Whispr note has been sent to the world. Someone might listen to it soon!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setMessage('');
              setSelectedMood(null);
              // Navigate back to notes
              onNavigate('notes');
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
      setIsSending(false);
    }
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

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('notes')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Compose Whispr</Text>
            <Text style={styles.subtitle}>Share your thoughts with the world</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mood Selector */}
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

        {/* Message Input */}
        <View style={styles.messageInputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="What's on your mind? Share your thoughts with the world..."
              placeholderTextColor="#9ca3af"
              value={message}
              onChangeText={setMessage}
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

        {/* Send Button */}
        <View style={styles.sendButtonContainer}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || !selectedMood || isSending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendNote}
            disabled={!message.trim() || !selectedMood || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.sendButtonIcon}>✈️</Text>
                <Text style={styles.sendButtonText}>Send to the World</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
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
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  moodSelector: {
    marginBottom: spacing.lg,
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  moodScrollView: {
    flexDirection: 'row',
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
  },
  moodPillEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  moodPillText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  selectedMoodPillText: {
    color: '#fff',
  },
  messageInputContainer: {
    marginBottom: spacing.xl,
  },
  inputWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageInput: {
    fontSize: 16,
    color: theme.colors.onSurface,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectedMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  moodBadgeEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  moodBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  sendButtonContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    minWidth: 200,
    ...theme.shadows.lg,
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  sendButtonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  sendButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default WhisprComposeScreen;
