import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { useAuth } from '@/store/AuthContext';
import { spacing, borderRadius } from '@/utils/themes';
import TextWhisperService from '@/services/textWhisperServiceClean';
import VisualFeedbackService from '@/services/visualFeedbackService';

interface RecordTextWhisperProps {
  onWhisprCreated?: (whisprId: string) => void;
  onClose?: () => void;
}

const MOODS = [
  { id: 'chill', emoji: '😌', name: 'Chill', description: 'Relaxed and peaceful' },
  { id: 'excited', emoji: '🤩', name: 'Excited', description: 'Energetic and enthusiastic' },
  { id: 'calm', emoji: '🧘', name: 'Calm', description: 'Serene and tranquil' },
  { id: 'deep_thought', emoji: '🤔', name: 'Deep Thought', description: 'Contemplative and reflective' },
  { id: 'melancholy', emoji: '😔', name: 'Melancholy', description: 'Thoughtful and wistful' },
  { id: 'playful', emoji: '😄', name: 'Playful', description: 'Fun and lighthearted' },
];

const RecordTextWhisper: React.FC<RecordTextWhisperProps> = ({
  onWhisprCreated,
  onClose,
}) => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState('chill');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContentChange = (text: string) => {
    if (text.length <= 280) {
      setContent(text);
    }
  };

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
    
    // Play mood selection feedback
    const moodConfig = VisualFeedbackService.getMoodConfig(moodId);
    VisualFeedbackService.playVibrationPattern(moodId, {
      onStart: () => console.log('🎭 Mood selected:', moodConfig.description),
    });
  };

  const handlePreview = () => {
    if (!content.trim()) {
      Alert.alert('Empty Content', 'Please enter some text before previewing.');
      return;
    }
    setShowPreview(true);
  };

  const handleCreateWhisper = async () => {
    // Check authentication first
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Authentication Required',
        'Please log in to create a whispr.',
        [
          { text: 'OK', onPress: () => onClose?.() }
        ]
      );
      return;
    }

    const validation = TextWhisperService.validateContent(content);
    
    if (!validation.isValid) {
      Alert.alert('Invalid Content', validation.error || 'Please check your input.');
      return;
    }

    setIsCreating(true);

    try {
      console.log('📝 Creating text whispr...');
      console.log('👤 User authenticated:', user.id);
      
      const whisprId = await TextWhisperService.createTextWhispr({
        content: content.trim(),
        mood: selectedMood,
        is_anonymous: isAnonymous,
        radius_meters: 1000,
        userId: user.id, // Pass the user ID
      });

      console.log('✅ Text whispr created successfully:', whisprId);

      // Play success feedback
      const moodConfig = VisualFeedbackService.getMoodConfig(selectedMood);
      await VisualFeedbackService.playVibrationPattern(selectedMood, {
        onStart: () => console.log('🎉 Whispr created! Playing success feedback'),
        onEnd: () => {
          onWhisprCreated?.(whisprId);
          onClose?.();
        },
      });

    } catch (error) {
      console.error('❌ Error creating whispr:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create whispr. Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const selectedMoodConfig = VisualFeedbackService.getMoodConfig(selectedMood);
  const moodColors = VisualFeedbackService.getMoodColors(selectedMood);
  const characterCount = content.length;
  const isValidContent = TextWhisperService.validateContent(content).isValid;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
    },
    closeButton: {
      padding: spacing.sm,
    },
    inputContainer: {
      marginBottom: spacing.xl,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: 16,
      color: theme.colors.onSurface,
      minHeight: 120,
      textAlignVertical: 'top',
      borderWidth: 2,
      borderColor: isValidContent ? moodColors.primary : theme.colors.outline,
    },
    characterCounter: {
      textAlign: 'right',
      marginTop: spacing.sm,
      fontSize: 12,
      color: characterCount > 250 ? theme.colors.error : theme.colors.onSurfaceVariant,
    },
    moodSection: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: spacing.md,
    },
    moodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    moodButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      minWidth: 100,
    },
    moodButtonSelected: {
      backgroundColor: moodColors.primary,
      borderColor: moodColors.primary,
    },
    moodButtonUnselected: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.outline,
    },
    moodEmoji: {
      fontSize: 20,
      marginRight: spacing.xs,
    },
    moodName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurface,
    },
    moodNameSelected: {
      color: theme.colors.onPrimary,
    },
    optionsSection: {
      marginBottom: spacing.xl,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    optionLabel: {
      fontSize: 16,
      color: theme.colors.onBackground,
    },
    toggleSwitch: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: isAnonymous ? moodColors.primary : theme.colors.outline,
      justifyContent: 'center',
      alignItems: isAnonymous ? 'flex-end' : 'flex-start',
      paddingHorizontal: 2,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.surface,
    },
    previewSection: {
      backgroundColor: moodColors.background,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      borderWidth: 2,
      borderColor: moodColors.primary,
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: moodColors.text,
      marginBottom: spacing.sm,
    },
    previewContent: {
      fontSize: 16,
      lineHeight: 24,
      color: moodColors.text,
      marginBottom: spacing.sm,
    },
    previewMood: {
      fontSize: 14,
      color: moodColors.accent,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    previewButton: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    previewButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
    },
    createButton: {
      flex: 2,
      backgroundColor: isValidContent ? moodColors.primary : theme.colors.outline,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      opacity: isValidContent ? 1 : 0.5,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isValidContent ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginLeft: spacing.sm,
      fontSize: 16,
      color: theme.colors.onPrimary,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📜 Whispr</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={theme.colors.onBackground} />
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind? Share your whisper..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={content}
              onChangeText={handleContentChange}
              multiline
              maxLength={280}
              autoFocus
            />
            <Text style={styles.characterCounter}>
              {characterCount}/280 characters
            </Text>
          </View>

          {/* Mood Selection */}
          <View style={styles.moodSection}>
            <Text style={styles.sectionTitle}>Choose Your Mood</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodButton,
                    selectedMood === mood.id
                      ? styles.moodButtonSelected
                      : styles.moodButtonUnselected,
                  ]}
                  onPress={() => handleMoodSelect(mood.id)}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text
                    style={[
                      styles.moodName,
                      selectedMood === mood.id && styles.moodNameSelected,
                    ]}
                  >
                    {mood.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Options */}
          <View style={styles.optionsSection}>
            <View style={styles.optionRow}>
              <Text style={styles.optionLabel}>Send Anonymously</Text>
              <TouchableOpacity
                style={styles.toggleSwitch}
                onPress={() => setIsAnonymous(!isAnonymous)}
              >
                <View style={styles.toggleThumb} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview */}
          {showPreview && (
            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Preview</Text>
              <Text style={styles.previewContent}>{content}</Text>
              <Text style={styles.previewMood}>
                {selectedMoodConfig.emoji} {selectedMoodConfig.description}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={handlePreview}
              disabled={!content.trim()}
            >
              <Text style={styles.previewButtonText}>Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateWhisper}
              disabled={!isValidContent || isCreating}
            >
              {isCreating ? (
                <View style={styles.loadingContainer}>
                  <Icon name="hourglass" size={20} color={theme.colors.onPrimary} />
                  <Text style={styles.loadingText}>Creating...</Text>
                </View>
              ) : (
                <Text style={styles.createButtonText}>Send Whispr</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default RecordTextWhisper;
