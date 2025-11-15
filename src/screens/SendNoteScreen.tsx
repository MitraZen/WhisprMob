import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Keyboard,
  SafeAreaView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { moodConfig, spacing, borderRadius } from '@/utils/themes';
import { BuddiesService } from '@/services/buddiesService';
import { MoodType } from '@/types';
import AIService, { AIEnhancementResult } from '@/services/aiService';
import { Toast, useToast } from '@/components/Toast';
import analytics from '@/services/analyticsService';

// Configuration interface
interface SendNoteConfig {
  maxLength?: number;
  minLength?: number;
  showAIEnhancement?: boolean;
  autoNavigateOnSuccess?: boolean;
  customSuccessTitle?: string;
  customSuccessMessage?: string;
  customErrorMessage?: string;
  allowEmptyMood?: boolean;
  enableCharacterWarning?: boolean;
  warningThreshold?: number;
  enableDraftConfirmation?: boolean;
}

interface SendNoteScreenProps {
  onNavigate: (screen: string) => void;
  onGoBack?: () => void;
  user?: any;
  config?: SendNoteConfig;
  onSuccess?: (noteId: string) => void;
  onError?: (error: Error) => void;
  initialContent?: string;
  initialMood?: MoodType;
  onDraftSave?: (content: string, mood: MoodType | null) => void;
}

const DEFAULT_CONFIG: SendNoteConfig = {
  maxLength: 500,
  minLength: 1,
  showAIEnhancement: true,
  autoNavigateOnSuccess: true,
  customSuccessTitle: 'Note Sent! ✨',
  customSuccessMessage: 'Your Whispr note has been sent to the world. Someone might listen to it soon!',
  allowEmptyMood: false,
  enableCharacterWarning: true,
  warningThreshold: 0.75,
  enableDraftConfirmation: true,
};

const SendNoteScreen: React.FC<SendNoteScreenProps> = ({ 
  onNavigate, 
  onGoBack, 
  user,
  config = {},
  onSuccess,
  onError,
  initialContent = '',
  initialMood = null,
  onDraftSave,
}) => {
  const { theme } = useTheme();
  
  // Merge config with defaults
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  // State
  const [noteContent, setNoteContent] = useState(initialContent);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(initialMood);
  const [loading, setLoading] = useState(false);
  
  // AI Enhancement states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIEnhancementResult | null>(null);
  const [enhancementType, setEnhancementType] = useState<'improve' | 'shorten' | 'expand' | 'make_mysterious' | 'generate_from_prompt'>('improve');
  
  // Request cancellation tracking
  const aiRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  
  // Toast hook
  const { toast, showToast, hideToast } = useToast();
  
  // Send button debouncing
  const sendButtonDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSendTimeRef = useRef<number>(0);
  const SEND_DEBOUNCE_MS = 1000; // 1 second debounce
  
  // Success animation
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const successAnimRef = useRef(new Animated.Value(0)).current;
  const successPositionRef = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Computed values
  const isContentValid = useMemo(() => {
    const trimmedContent = noteContent.trim();
    return trimmedContent.length >= (finalConfig.minLength || 1) && 
           trimmedContent.length <= (finalConfig.maxLength || 500);
  }, [noteContent, finalConfig.minLength, finalConfig.maxLength]);

  const isMoodValid = useMemo(() => {
    return finalConfig.allowEmptyMood || selectedMood !== null;
  }, [selectedMood, finalConfig.allowEmptyMood]);

  const canSendNote = useMemo(() => {
    return isContentValid && isMoodValid && !loading && noteContent.trim().length > 0;
  }, [isContentValid, isMoodValid, loading, noteContent]);

  const characterCountColor = useMemo(() => {
    const length = noteContent.length;
    const max = finalConfig.maxLength || 500;
    if (length > max * 0.9) return '#ef4444';
    if (length > max * (finalConfig.warningThreshold || 0.75)) return '#f59e0b';
    return theme.colors.onSurfaceVariant;
  }, [noteContent.length, finalConfig.maxLength, finalConfig.warningThreshold, theme.colors.onSurfaceVariant]);

  const characterWarningText = useMemo(() => {
    const length = noteContent.length;
    const max = finalConfig.maxLength || 500;
    const remaining = max - length;
    
    if (!finalConfig.enableCharacterWarning) return null;
    
    if (length > max * 0.9) {
      return `⚠️ Only ${remaining} characters remaining`;
    }
    if (length > max * (finalConfig.warningThreshold || 0.75)) {
      return `${remaining} characters remaining`;
    }
    return null;
  }, [noteContent.length, finalConfig.maxLength, finalConfig.warningThreshold, finalConfig.enableCharacterWarning]);

  const hasUnsavedChanges = useMemo(() => {
    return noteContent.trim().length > 0 || selectedMood !== null;
  }, [noteContent, selectedMood]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any pending AI requests
      aiRequestIdRef.current += 1;
    };
  }, []);

  // Autosave drafts (debounced)
  useEffect(() => {
    if (!finalConfig.enableDraftConfirmation || !onDraftSave) return;

    const id = setTimeout(() => {
      if (hasUnsavedChanges) {
        onDraftSave(noteContent, selectedMood);
      }
    }, 2000); // 2s after user stops typing

    return () => clearTimeout(id);
  }, [noteContent, selectedMood, finalConfig.enableDraftConfirmation, onDraftSave]);

  // Handlers
  const handleContentChange = useCallback((text: string) => {
    if (text.length <= (finalConfig.maxLength || 500)) {
      setNoteContent(text);
    }
  }, [finalConfig.maxLength]);

  const handleMoodSelect = useCallback((mood: MoodType) => {
    if (!loading && !aiLoading) {
      setSelectedMood(mood);
    }
  }, [loading, aiLoading]);

  const clearForm = useCallback(() => {
    setNoteContent('');
    setSelectedMood(null);
  }, []);

  const saveDraft = useCallback(() => {
    if (onDraftSave && hasUnsavedChanges) {
      onDraftSave(noteContent, selectedMood);
    }
  }, [onDraftSave, noteContent, selectedMood, hasUnsavedChanges]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    
    if (hasUnsavedChanges && finalConfig.enableDraftConfirmation) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. What would you like to do?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
          {
            text: 'Save Draft',
            onPress: () => {
              saveDraft();
              if (onGoBack) {
                onGoBack();
              } else {
                onNavigate('notes');
              }
            }
          },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              clearForm();
              if (onGoBack) {
                onGoBack();
              } else {
                onNavigate('notes');
              }
            }
          }
        ]
      );
    } else {
      if (onGoBack) {
        onGoBack();
      } else {
        onNavigate('notes');
      }
    }
  }, [hasUnsavedChanges, finalConfig.enableDraftConfirmation, saveDraft, clearForm, onGoBack, onNavigate]);

  const handleAIEnhancement = useCallback(async () => {
    if (!noteContent.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to enhance.');
      return;
    }

    if (!selectedMood && !finalConfig.allowEmptyMood) {
      Alert.alert('No Mood Selected', 'Please select a mood for AI enhancement.');
      return;
    }

    // Increment request ID to cancel any previous requests
    const currentRequestId = ++aiRequestIdRef.current;

    Keyboard.dismiss();
    setAiLoading(true);
    setShowAIModal(true);
    setAiResult(null);

    try {
      let result: AIEnhancementResult;
      
      if (enhancementType === 'generate_from_prompt') {
        result = await AIService.generateFromPrompt(noteContent, selectedMood as MoodType);
      } else {
        result = await AIService.enhanceText({
          mood: selectedMood as MoodType,
          originalText: noteContent,
          enhancementType: enhancementType
        });
      }

      // Check if this request is still current and component is mounted
      // This prevents race conditions where a new request started or component unmounted
      if (currentRequestId === aiRequestIdRef.current && isMountedRef.current) {
        setAiResult(result);
      }
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      // Only show error if request is still current and component is mounted
      if (currentRequestId === aiRequestIdRef.current && isMountedRef.current) {
        Alert.alert('AI Error', 'Failed to enhance your message. Please try again.');
        setShowAIModal(false);
      }
    } finally {
      // Only update loading state if request is still current
      if (currentRequestId === aiRequestIdRef.current && isMountedRef.current) {
        setAiLoading(false);
      }
    }
  }, [noteContent, selectedMood, enhancementType, finalConfig.allowEmptyMood]);

  const applyAIEnhancement = useCallback((enhancedText: string) => {
    if (!enhancedText) return;

    if (noteContent.trim().length > 0 && noteContent.trim() !== enhancedText) {
      Alert.alert(
        'Replace your text?',
        'This will replace your current message with the AI suggestion. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              setNoteContent(enhancedText);
              setShowAIModal(false);
              setAiResult(null);
            }
          }
        ]
      );
    } else {
      setNoteContent(enhancedText);
      setShowAIModal(false);
      setAiResult(null);
    }
  }, [noteContent]);

  // Extract actionable error message from backend error
  const extractErrorMessage = useCallback((error: any): string => {
    if (!error) return 'Failed to send your note. Please try again.';
    
    const errorMessage = error.message || String(error);
    
    // Check for rate limit errors
    if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      return 'You\'re sending notes too quickly. Please wait a moment and try again.';
    }
    
    // Check for validation errors
    if (errorMessage.includes('400') || errorMessage.toLowerCase().includes('validation')) {
      const match = errorMessage.match(/message[:\s]+([^,\.]+)/i);
      if (match) {
        return `Validation error: ${match[1]}`;
      }
      return 'Invalid message. Please check your input and try again.';
    }
    
    // Check for authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.toLowerCase().includes('unauthorized')) {
      return 'Authentication error. Please log in again.';
    }
    
    // Check for network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Try to extract meaningful message from error text
    try {
      const jsonMatch = errorMessage.match(/\{.*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.message) return parsed.message;
        if (parsed.error) return parsed.error;
      }
    } catch {
      // Ignore JSON parse errors
    }
    
    // Return default or custom error message
    return finalConfig.customErrorMessage || 'Failed to send your note. Please try again.';
  }, [finalConfig.customErrorMessage]);

  // Trigger success animation
  const triggerSuccessAnimation = useCallback(() => {
    setShowSuccessAnimation(true);
    successAnimRef.setValue(0);
    successPositionRef.setValue({ x: 0, y: 0 });
    
    // Animate paper plane flying up and fading out
    Animated.parallel([
      Animated.sequence([
        Animated.timing(successAnimRef, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(200),
        Animated.timing(successAnimRef, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(successPositionRef, {
        toValue: { x: 0, y: -120 },
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessAnimation(false);
      successPositionRef.setValue({ x: 0, y: 0 });
    });
  }, [successAnimRef, successPositionRef]);

  const handleSendNote = useCallback(async () => {
    // Debounce: prevent double-taps
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_DEBOUNCE_MS) {
      showToast('Please wait a moment before sending again.', 'warning', 2000);
      return;
    }
    
    // Clear any existing debounce timer
    if (sendButtonDebounceRef.current) {
      clearTimeout(sendButtonDebounceRef.current);
    }
    
    lastSendTimeRef.current = now;
    
    Keyboard.dismiss();

    // Validation with toast for non-critical errors
    if (!noteContent.trim()) {
      showToast('Please enter a message to send.', 'warning', 2000);
      return;
    }

    if (!selectedMood && !finalConfig.allowEmptyMood) {
      showToast('Please select a mood for your message.', 'warning', 2000);
      return;
    }

    if (!user?.id) {
      showToast('User not authenticated. Please log in again.', 'error', 3000);
      return;
    }

    if (!isContentValid) {
      showToast(
        `Message must be between ${finalConfig.minLength} and ${finalConfig.maxLength} characters.`,
        'warning',
        3000
      );
      return;
    }

    // Track if AI was used
    const aiUsed = aiResult !== null && noteContent.trim() === aiResult.enhancedText;

    setLoading(true);
    
    try {
      console.log('Sending Whispr note:', { 
        content: noteContent.trim(), 
        mood: selectedMood, 
        userId: user.id 
      });
      
      const noteId = await BuddiesService.sendWhisprNote(
        user.id, 
        noteContent.trim(), 
        selectedMood as MoodType
      );
      
      console.log('Note sent successfully:', noteId);
      
      // Track analytics
      analytics.track('note_sent', {
        noteId,
        mood: selectedMood || 'none',
        length: noteContent.trim().length,
        aiUsed,
        enhancementType: aiUsed ? enhancementType : null,
      });
      
      // Call success callback
      onSuccess?.(noteId);
      
      // Show success animation
      triggerSuccessAnimation();
      
      // Show toast instead of alert
      showToast(
        finalConfig.customSuccessMessage || 'Your Whispr note has been sent to the world! ✨',
        'success',
        3000
      );
      
      // Clear form and navigate after a short delay
      setTimeout(() => {
        clearForm();
        if (finalConfig.autoNavigateOnSuccess) {
          if (onGoBack) {
            onGoBack();
          } else {
            onNavigate('notes');
          }
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error sending note:', error);
      
      // Call error callback
      onError?.(error as Error);
      
      // Extract and show actionable error message
      const errorMessage = extractErrorMessage(error);
      showToast(errorMessage, 'error', 4000);
    } finally {
      setLoading(false);
    }
  }, [
    noteContent,
    selectedMood,
    user,
    isContentValid,
    finalConfig,
    onSuccess,
    onError,
    clearForm,
    onGoBack,
    onNavigate,
    showToast,
    extractErrorMessage,
    triggerSuccessAnimation,
    aiResult,
    enhancementType,
  ]);

  const handleEnhancementTypeChange = useCallback((type: typeof enhancementType) => {
    setEnhancementType(type);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowAIModal(false);
    setAiResult(null);
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
            disabled={loading || aiLoading}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Returns to the previous screen"
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
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.scrollContent}>
          
          {/* Note Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              What's on your mind?
            </Text>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={[
                styles.noteInputWrapper,
                !isContentValid && noteContent.length > 0 && styles.noteInputWrapperError
              ]}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Write your anonymous message here..."
                  placeholderTextColor={theme.colors.onSurfaceVariant}
                  multiline
                  value={noteContent}
                  onChangeText={handleContentChange}
                  maxLength={finalConfig.maxLength}
                  contextMenuHidden={true}
                  editable={!loading && !aiLoading}
                  selectTextOnFocus={false}
                  textAlignVertical="top"
                />
              </View>
            </TouchableWithoutFeedback>
            
            <View style={styles.inputFooter}>
              <Text style={[styles.characterCount, { color: characterCountColor }]}>
                {noteContent.length}/{finalConfig.maxLength} characters
              </Text>
              {characterWarningText && (
                <Text style={styles.characterWarning}>
                  {characterWarningText}
                </Text>
              )}
            </View>

            {!isContentValid && noteContent.length > 0 && (
              <Text style={styles.errorText}>
                Message must be between {finalConfig.minLength} and {finalConfig.maxLength} characters
              </Text>
            )}
            
            {/* AI Enhancement Button */}
            {finalConfig.showAIEnhancement && (
              <TouchableOpacity
                style={[
                  styles.aiEnhanceButton,
                  (!noteContent.trim() || (!selectedMood && !finalConfig.allowEmptyMood)) && styles.aiEnhanceButtonDisabled
                ]}
                onPress={handleAIEnhancement}
                disabled={aiLoading || !noteContent.trim() || (!selectedMood && !finalConfig.allowEmptyMood)}
                activeOpacity={0.7}
                accessibilityLabel="Enhance with AI"
                accessibilityRole="button"
                accessibilityHint="Uses AI to improve, shorten, expand, or make your message more mysterious"
              >
                <Icon name="sparkles" size={16} color={theme.colors.primary} />
                <Text style={styles.aiEnhanceButtonText}>
                  {aiLoading 
                    ? 'Enhancing...' 
                    : !noteContent.trim() 
                    ? '✨ Type a message to enhance' 
                    : !selectedMood && !finalConfig.allowEmptyMood
                    ? '✨ Select a mood to enhance'
                    : '✨ Enhance with AI'}
                </Text>
                {aiLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
              </TouchableOpacity>
            )}
          </View>

          {/* Mood Selection Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              How are you feeling?{!finalConfig.allowEmptyMood && ' *'}
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.moodSelector}
            >
              {Object.entries(moodConfig).map(([type, config]) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.moodButton, 
                    selectedMood === type && styles.selectedMoodButton
                  ]}
                  onPress={() => handleMoodSelect(type as MoodType)}
                  disabled={loading || aiLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodButtonEmoji}>{config.emoji}</Text>
                  <Text style={[
                    styles.moodButtonText,
                    selectedMood === type && styles.selectedMoodButtonText
                  ]}>
                    {config.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Send Button */}
          <View style={styles.sendButtonContainer}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                !canSendNote && styles.sendButtonDisabled
              ]}
              onPress={handleSendNote}
              disabled={!canSendNote || loading}
              activeOpacity={0.8}
              accessibilityLabel={!noteContent.trim() 
                ? 'Enter your note' 
                : !selectedMood && !finalConfig.allowEmptyMood
                ? 'Select a mood' 
                : 'Send Note'}
              accessibilityRole="button"
              accessibilityHint="Sends your note to the world"
              accessibilityState={{ disabled: !canSendNote || loading }}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <>
                  <Icon 
                    name="send" 
                    size={20} 
                    color={canSendNote ? theme.colors.onPrimary : theme.colors.onSurfaceVariant} 
                    style={styles.sendIcon} 
                  />
                  <Text style={[
                    styles.sendButtonText,
                    !canSendNote && styles.sendButtonTextDisabled
                  ]}>
                    {!noteContent.trim() 
                      ? 'Enter your note' 
                      : !selectedMood && !finalConfig.allowEmptyMood
                      ? 'Select a mood' 
                      : 'Send Note'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Success Animation - Paper Plane */}
            {showSuccessAnimation && (
              <Animated.View
                style={[
                  styles.successAnimationContainer,
                  {
                    opacity: successAnimRef,
                    transform: successPositionRef.getTranslateTransform(),
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.successAnimationEmoji}>✈️</Text>
              </Animated.View>
            )}
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

          {/* Clear Button */}
          {hasUnsavedChanges && !loading && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearForm}
              activeOpacity={0.7}
            >
              <Text style={styles.clearButtonText}>Clear Form</Text>
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>

      {/* AI Enhancement Modal */}
      <Modal
        visible={showAIModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon name="sparkles" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>AI Enhancement</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={handleModalClose}
                activeOpacity={0.7}
                accessibilityLabel="Close AI Enhancement"
                accessibilityRole="button"
                accessibilityHint="Closes the AI enhancement modal"
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
              <ScrollView 
                style={styles.modalContent} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 40 }}
              >
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
                        onPress={() => handleEnhancementTypeChange(type.key as typeof enhancementType)}
                        activeOpacity={0.7}
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
                      activeOpacity={0.8}
                      accessibilityLabel="Apply AI enhancement"
                      accessibilityRole="button"
                      accessibilityHint="Replaces your current message with the AI enhanced version"
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
                          activeOpacity={0.7}
                          accessibilityLabel={`Apply suggestion ${index + 1}`}
                          accessibilityRole="button"
                          accessibilityHint="Replaces your current message with this AI suggestion"
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
                onPress={handleModalClose}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onHide={hideToast}
        action={toast.action}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
    width: 40,
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
  noteInputWrapper: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteInputWrapperError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  noteInput: {
    padding: spacing.md,
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  characterCount: {
    ...theme.typography.bodySmall,
    fontWeight: '500',
  },
  characterWarning: {
    ...theme.typography.bodySmall,
    color: '#f59e0b',
    fontWeight: '600',
  },
  errorText: {
    ...theme.typography.bodySmall,
    color: '#ef4444',
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
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
  selectedMoodButtonText: {
    color: theme.colors.onPrimary,
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
  sendButtonContainer: {
    position: 'relative',
    marginTop: spacing.lg,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  successAnimationContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 1000,
  },
  successAnimationEmoji: {
    fontSize: 40,
  },
  clearButton: {
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.lg,
  },
  clearButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
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