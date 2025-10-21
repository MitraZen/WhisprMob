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
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { moodConfig, spacing, borderRadius } from '@/utils/themes';
import { BuddiesService } from '@/services/buddiesService';
import { MoodType } from '@/types';
import AIService, { AIEnhancementResult } from '@/services/aiService';

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
  
  // AI Enhancement states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIEnhancementResult | null>(null);
  const [enhancementType, setEnhancementType] = useState<'improve' | 'shorten' | 'expand' | 'make_mysterious' | 'generate_from_prompt'>('improve');

  // AI Enhancement functions
  const handleAIEnhancement = async () => {
    if (!noteContent.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to enhance.');
      return;
    }

    if (!selectedMood) {
      Alert.alert('No Mood Selected', 'Please select a mood for AI enhancement.');
      return;
    }

    setAiLoading(true);
    setShowAIModal(true);
    setAiResult(null);

    try {
      let result: AIEnhancementResult;
      
      if (enhancementType === 'generate_from_prompt') {
        // Use the new generateFromPrompt method for creative generation
        result = await AIService.generateFromPrompt(noteContent, selectedMood);
      } else {
        // Use the existing enhanceText method for other enhancement types
        result = await AIService.enhanceText({
          mood: selectedMood,
          originalText: noteContent,
          enhancementType: enhancementType
        });
      }

      setAiResult(result);
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      Alert.alert('AI Error', 'Failed to enhance your message. Please try again.');
      setShowAIModal(false);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIEnhancement = (enhancedText: string) => {
    setNoteContent(enhancedText);
    setShowAIModal(false);
    setAiResult(null);
  };

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
            
            {/* AI Enhancement Button */}
            <TouchableOpacity
              style={[
                styles.aiEnhanceButton,
                !noteContent.trim() && styles.aiEnhanceButtonDisabled
              ]}
              onPress={handleAIEnhancement}
              disabled={aiLoading || !noteContent.trim()}
            >
              <Icon name="sparkles" size={16} color={theme.colors.primary} />
              <Text style={styles.aiEnhanceButtonText}>
                {aiLoading ? 'Enhancing...' : !noteContent.trim() ? '✨ Type a message to enhance' : '✨ Enhance with AI'}
              </Text>
              {aiLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
            </TouchableOpacity>
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

      {/* AI Enhancement Modal */}
      <Modal
        visible={showAIModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon name="sparkles" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>AI Enhancement</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAIModal(false)}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {aiLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.modalLoadingText}>AI is enhancing your message...</Text>
              </View>
            ) : aiResult ? (
              <ScrollView style={styles.modalContent}>
                {/* Enhancement Type Selector */}
                <View style={styles.enhancementTypeSection}>
                  <Text style={styles.modalSectionTitle}>Enhancement Type</Text>
                  {enhancementType === 'generate_from_prompt' && (
                    <Text style={styles.modalSubtitle}>
                      ✨ Write prompts like "write a motivational quote" or "I am happy, enhance that" and let AI surprise you!
                    </Text>
                  )}
                  {enhancementType === 'generate_from_prompt' && (
                    <View style={styles.examplePromptsContainer}>
                      <Text style={styles.examplePromptsTitle}>💡 Example Prompts:</Text>
                      <Text style={styles.examplePrompt}>• "write a motivational quote"</Text>
                      <Text style={styles.examplePrompt}>• "I am happy, enhance that"</Text>
                      <Text style={styles.examplePrompt}>• "create a love poem"</Text>
                      <Text style={styles.examplePrompt}>• "I feel grateful today"</Text>
                      <Text style={styles.examplePrompt}>• "write something mysterious"</Text>
                    </View>
                  )}
                  <View style={styles.enhancementTypeButtons}>
                    {[
                      { key: 'improve', label: 'Improve', icon: 'trending-up' },
                      { key: 'shorten', label: 'Shorten', icon: 'contract' },
                      { key: 'expand', label: 'Expand', icon: 'expand' },
                      { key: 'make_mysterious', label: 'Mysterious', icon: 'eye-off' },
                      { key: 'generate_from_prompt', label: 'Surprise Me!', icon: 'sparkles' }
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.enhancementTypeButton,
                          enhancementType === type.key && styles.enhancementTypeButtonSelected
                        ]}
                        onPress={() => setEnhancementType(type.key as any)}
                      >
                        <Icon 
                          name={type.icon} 
                          size={16} 
                          color={enhancementType === type.key ? theme.colors.onPrimary : theme.colors.onSurface} 
                        />
                        <Text style={[
                          styles.enhancementTypeButtonText,
                          enhancementType === type.key && styles.enhancementTypeButtonTextSelected
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Enhanced Text */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Enhanced Message</Text>
                  <View style={styles.enhancedTextContainer}>
                    <Text style={styles.enhancedText}>{aiResult.enhancedText}</Text>
                    <TouchableOpacity
                      style={styles.applyButton}
                      onPress={() => applyAIEnhancement(aiResult.enhancedText)}
                    >
                      <Icon name="checkmark" size={16} color={theme.colors.onPrimary} />
                      <Text style={styles.applyButtonText}>Use This</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Alternative Suggestions */}
                {aiResult.suggestions.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Alternative Suggestions</Text>
                    {aiResult.suggestions.map((suggestion, index) => (
                      <View key={index} style={styles.suggestionContainer}>
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                        <TouchableOpacity
                          style={styles.suggestionButton}
                          onPress={() => applyAIEnhancement(suggestion)}
                        >
                          <Icon name="checkmark" size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Confidence Score */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>AI Confidence</Text>
                  <View style={styles.confidenceContainer}>
                    <View style={styles.confidenceBar}>
                      <View 
                        style={[
                          styles.confidenceFill, 
                          { width: `${(aiResult.confidence / 10) * 100}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.confidenceText}>{aiResult.confidence}/10</Text>
                  </View>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAIModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // AI Enhancement Styles
  aiEnhanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  aiEnhanceButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  aiEnhanceButtonDisabled: {
    opacity: 0.5,
    borderColor: theme.colors.onSurfaceVariant,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
  modalContent: {
    padding: spacing.lg,
    maxHeight: 400,
  },
  modalLoading: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalLoadingText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.md,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  enhancementTypeSection: {
    marginBottom: spacing.lg,
  },
  examplePromptsContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  examplePromptsTitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  examplePrompt: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  enhancementTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  enhancementTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  enhancementTypeButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  enhancementTypeButtonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurface,
    marginLeft: spacing.xs,
  },
  enhancementTypeButtonTextSelected: {
    color: theme.colors.onPrimary,
  },
  enhancedTextContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  enhancedText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  applyButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onPrimary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  suggestionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.full,
  },
  confidenceText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    fontWeight: 'bold',
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalCancelButton: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
  },
  modalCancelButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
});

export default SendNoteScreen;