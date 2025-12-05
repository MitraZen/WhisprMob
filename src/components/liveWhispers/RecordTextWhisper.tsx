import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MOOD_BUTTON_SIZE = (SCREEN_WIDTH - spacing.lg * 4) / 3;

const RecordTextWhisper: React.FC<RecordTextWhisperProps> = ({
  onWhisprCreated,
  onClose,
}) => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const moodGridSlide = useRef(new Animated.Value(50)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;
  const backgroundPulse = useRef(new Animated.Value(1)).current;
  const moodAnimations = useRef<Map<string, Animated.Value>>(new Map());
  const rippleAnimations = useRef<Map<string, Animated.Value>>(new Map());
  
  // Get selected mood data from MOODS array (not from service)
  const selectedMoodData = selectedMood ? MOODS.find(m => m.id === selectedMood) : null;
  const selectedMoodConfig = selectedMood ? VisualFeedbackService.getMoodConfig(selectedMood) : null;
  const moodColors = selectedMood ? VisualFeedbackService.getMoodColors(selectedMood) : null;
  
  // Initialize mood animations
  useEffect(() => {
    MOODS.forEach(mood => {
      if (!moodAnimations.current.has(mood.id)) {
        moodAnimations.current.set(mood.id, new Animated.Value(1));
        rippleAnimations.current.set(mood.id, new Animated.Value(0));
      }
    });
  }, []);

  useEffect(() => {
    // Staggered entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger the elements
    Animated.stagger(150, [
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(moodGridSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(buttonSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Background pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulse, {
          toValue: 1.05,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulse, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Pulse background when mood is selected
  useEffect(() => {
    if (selectedMood && moodColors) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundPulse, {
            toValue: 1.02,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(backgroundPulse, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [selectedMood]);

  const handleMoodSelect = (moodId: string) => {
    if (selectedMood === moodId) {
      // Deselect with subtle animation
      setSelectedMood(null);
      const moodAnim = moodAnimations.current.get(moodId);
      if (moodAnim) {
        Animated.spring(moodAnim, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }).start();
      }
      return;
    }
    
    // Deselect previous mood
    if (selectedMood) {
      const prevMoodAnim = moodAnimations.current.get(selectedMood);
      if (prevMoodAnim) {
        Animated.spring(prevMoodAnim, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }).start();
      }
    }

    setSelectedMood(moodId);
    
    // Enhanced selection animation
    const moodAnim = moodAnimations.current.get(moodId);
    const rippleAnim = rippleAnimations.current.get(moodId);
    
    if (moodAnim && rippleAnim) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(moodAnim, {
            toValue: 1.2,
            tension: 200,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(moodAnim, {
          toValue: 1.05,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start(() => {
        rippleAnim.setValue(0);
      });
    }
    
    const moodConfig = VisualFeedbackService.getMoodConfig(moodId);
    VisualFeedbackService.playVibrationPattern(moodId, {
      onStart: () => console.log('🎭 Mood selected:', moodConfig.description),
    });
  };

  const handleCreateWhisper = async () => {
    if (!selectedMood) {
      Alert.alert('Select a Mood', 'Please choose a mood to create your whispr.');
      return;
    }

    if (!isAuthenticated || !user) {
      Alert.alert(
        'Authentication Required',
        'Please log in to create a whispr.',
        [{ text: 'OK', onPress: () => onClose?.() }]
      );
      return;
    }

    setIsCreating(true);

    try {
      console.log('📝 Creating whispr with mood:', selectedMood);
      
      const moodConfig = VisualFeedbackService.getMoodConfig(selectedMood);
      const defaultContent = `${moodConfig.emoji} ${moodConfig.description}`;
      
      const whisprId = await TextWhisperService.createTextWhispr({
        content: defaultContent,
        mood: selectedMood,
        is_anonymous: false,
        radius_meters: 1000,
        userId: user.id,
      });

      console.log('✅ Whispr created successfully:', whisprId);

      // Enhanced success animation
      Animated.parallel([
        Animated.sequence([
          Animated.spring(successScale, {
            toValue: 1.3,
            tension: 80,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.spring(successScale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      await VisualFeedbackService.playVibrationPattern(selectedMood, {
        onStart: () => console.log('🎉 Whispr created! Playing success feedback'),
        onEnd: () => {
          setTimeout(() => {
            onWhisprCreated?.(whisprId);
            onClose?.();
          }, 1000);
        },
      });

    } catch (error) {
      console.error('❌ Error creating whispr:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create whispr. Please try again.'
      );
      setIsCreating(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    backgroundGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xl * 1.5,
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      fontSize: 36,
      fontWeight: '800',
      color: theme.colors.onBackground,
      letterSpacing: -1,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 17,
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.sm,
      lineHeight: 24,
      fontWeight: '500',
    },
    closeButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant + '80',
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moodSection: {
      marginBottom: spacing.xl * 1.5,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.onBackground,
      marginBottom: spacing.md,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    moodDescription: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: spacing.xs,
      fontStyle: 'italic',
      fontWeight: '400',
    },
    moodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.md,
    },
    moodButton: {
      width: MOOD_BUTTON_SIZE,
      height: MOOD_BUTTON_SIZE,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      overflow: 'hidden',
      position: 'relative',
    },
    moodButtonSelected: {
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    moodButtonUnselected: {
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.surface,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    moodEmoji: {
      fontSize: 40,
      marginBottom: spacing.xs,
    },
    moodName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    ripple: {
      position: 'absolute',
      width: MOOD_BUTTON_SIZE * 2.5,
      height: MOOD_BUTTON_SIZE * 2.5,
      borderRadius: MOOD_BUTTON_SIZE * 1.25,
    },
    createButton: {
      paddingVertical: spacing.lg + spacing.xs,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      marginTop: spacing.md,
      opacity: selectedMood ? 1 : 0.6,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 12,
      overflow: 'hidden',
    },
    createButtonGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createButtonText: {
      fontSize: 20,
      fontWeight: '700',
      color: selectedMood && moodColors ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
      letterSpacing: 0.5,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginLeft: spacing.sm,
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onPrimary,
    },
    successOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    successContent: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    successEmoji: {
      fontSize: 80,
      marginBottom: spacing.md,
    },
    successText: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: spacing.sm,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    successSubtext: {
      fontSize: 16,
      color: '#FFFFFF',
      opacity: 0.9,
      marginTop: spacing.xs,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      {/* Animated Background Gradient */}
      {selectedMood && moodColors && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: backgroundPulse.interpolate({
                inputRange: [1, 1.05],
                outputRange: [0.15, 0.25],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[moodColors.primary + '30', moodColors.secondary + '20']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ translateY: headerSlide }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.title}>✨ Create Whispr</Text>
            <Text style={styles.subtitle}>
              {selectedMoodData 
                ? `Share your ${selectedMoodData.name.toLowerCase()} vibe` 
                : 'Express your current mood'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </Animated.View>

        {/* Mood Selection */}
        <Animated.View
          style={[
            styles.moodSection,
            {
              transform: [{ translateY: moodGridSlide }],
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.sectionTitle}>
            {selectedMoodData 
              ? `${selectedMoodConfig?.emoji} ${selectedMoodData.name}` 
              : 'How are you feeling?'}
          </Text>
          {selectedMoodData && selectedMoodConfig && (
            <Text style={styles.moodDescription}>{selectedMoodConfig.description}</Text>
          )}
          <View style={[styles.moodGrid, { marginTop: selectedMood ? spacing.xl : spacing.lg }]}>
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.id;
              const moodAnim = moodAnimations.current.get(mood.id) || new Animated.Value(1);
              const rippleAnim = rippleAnimations.current.get(mood.id) || new Animated.Value(0);
              const moodColorsForButton = VisualFeedbackService.getMoodColors(mood.id);
              
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodButton,
                    isSelected
                      ? { 
                          ...styles.moodButtonSelected, 
                          borderColor: moodColorsForButton.primary,
                          backgroundColor: moodColorsForButton.primary + '25',
                        }
                      : styles.moodButtonUnselected,
                  ]}
                  onPress={() => handleMoodSelect(mood.id)}
                  activeOpacity={0.7}
                >
                  {/* Enhanced ripple effect */}
                  {isSelected && (
                    <Animated.View
                      style={[
                        styles.ripple,
                        {
                          backgroundColor: moodColorsForButton.primary + '30',
                          transform: [
                            { scale: rippleAnim },
                            { translateX: -MOOD_BUTTON_SIZE * 0.75 },
                            { translateY: -MOOD_BUTTON_SIZE * 0.75 },
                          ],
                          opacity: rippleAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0.7, 0.4, 0],
                          }),
                        },
                      ]}
                    />
                  )}
                  
                  {/* Mood content */}
                  <Animated.View
                    style={{
                      transform: [{ scale: moodAnim }],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text
                      style={[
                        styles.moodName,
                        isSelected && { 
                          color: moodColorsForButton.primary,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {mood.name}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Create Button */}
        <Animated.View
          style={{
            transform: [{ translateY: buttonSlide }],
            opacity: fadeAnim,
          }}
        >
          {selectedMood && moodColors ? (
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateWhisper}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[moodColors.primary, moodColors.secondary]}
                style={styles.createButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {isCreating ? (
                <View style={styles.loadingContainer}>
                  <Icon name="hourglass" size={22} color={theme.colors.onPrimary} />
                  <Text style={styles.loadingText}>Creating...</Text>
                </View>
              ) : (
                <Text style={styles.createButtonText}>
                  Create {selectedMoodData?.name} Whispr
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.outline }]}
              disabled
            >
              <Text style={styles.createButtonText}>Select a Mood First</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      {/* Success Overlay */}
      {isCreating && selectedMoodData && selectedMoodConfig && (
        <Animated.View
          style={[
            styles.successOverlay,
            {
              opacity: successOpacity,
              backgroundColor: moodColors ? `rgba(0, 0, 0, 0.9)` : 'rgba(0, 0, 0, 0.88)',
            },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.successContent,
              {
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <Text style={styles.successEmoji}>{selectedMoodConfig.emoji}</Text>
            <Text style={styles.successText}>Whispr Created! ✨</Text>
            <Text style={styles.successSubtext}>Sharing your {selectedMoodData.name.toLowerCase()} vibe</Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
};

export default RecordTextWhisper;
