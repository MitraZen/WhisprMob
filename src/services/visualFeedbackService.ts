import { Vibration } from 'react-native';
import { Animated } from 'react-native';

export interface MoodConfig {
  emoji: string;
  color: string;
  description: string;
  vibrationPattern: number[];
  animationDuration: number;
  animationType: 'pulse' | 'bounce' | 'fade' | 'shake' | 'glow' | 'wave';
}

export interface VisualFeedbackOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

class VisualFeedbackService {
  private static instance: VisualFeedbackService;
  private isPlaying = false;

  static getInstance(): VisualFeedbackService {
    if (!VisualFeedbackService.instance) {
      VisualFeedbackService.instance = new VisualFeedbackService();
    }
    return VisualFeedbackService.instance;
  }

  /**
   * Get mood configuration
   */
  getMoodConfig(mood: string): MoodConfig {
    // ✅ MINIMAL HAPTIC: All moods use a simple, short vibration (50ms)
    const minimalVibrationPattern = [50]; // Single short tap
    
    const moodMap: Record<string, MoodConfig> = {
      chill: {
        emoji: '😌',
        color: '#4A90E2',
        description: 'Relaxed and peaceful',
        vibrationPattern: minimalVibrationPattern,
        animationDuration: 3000,
        animationType: 'fade'
      },
      excited: {
        emoji: '🤩',
        color: '#FF6B6B',
        description: 'Energetic and enthusiastic',
        vibrationPattern: minimalVibrationPattern,
        animationDuration: 2000,
        animationType: 'bounce'
      },
      calm: {
        emoji: '🧘',
        color: '#51CF66',
        description: 'Serene and tranquil',
        vibrationPattern: minimalVibrationPattern,
        animationDuration: 4000,
        animationType: 'pulse'
      },
      deep_thought: {
        emoji: '🤔',
        color: '#9775FA',
        description: 'Contemplative and reflective',
        vibrationPattern: minimalVibrationPattern,
        animationDuration: 5000,
        animationType: 'glow'
      },
      melancholy: {
        emoji: '😔',
        color: '#868E96',
        description: 'Thoughtful and wistful',
        vibrationPattern: minimalVibrationPattern,
        animationDuration: 3500,
        animationType: 'wave'
      },
      playful: {
        emoji: '😄',
        color: '#FFD43B',
        description: 'Fun and lighthearted',
        vibrationPattern: minimalVibrationPattern,
        animationDuration: 2500,
        animationType: 'shake'
      }
    };

    return moodMap[mood] || {
      emoji: '💭',
      color: '#868E96',
      description: 'Unknown mood',
      vibrationPattern: minimalVibrationPattern,
      animationDuration: 2000,
      animationType: 'pulse'
    };
  }

  /**
   * Play minimal vibration pattern for a mood
   * ✅ MINIMAL HAPTIC: Just a quick 50ms tap
   */
  async playVibrationPattern(mood: string, options: VisualFeedbackOptions = {}): Promise<void> {
    const { onStart, onEnd, onError } = options;

    try {
      if (this.isPlaying) {
        // Skip if already playing (prevents multiple vibrations)
        return;
      }

      this.isPlaying = true;
      onStart?.();

      const moodConfig = this.getMoodConfig(mood);
      // ✅ MINIMAL: Just a quick tap, no logging needed
      
      // Play minimal vibration (50ms single tap)
      Vibration.vibrate(moodConfig.vibrationPattern);

      // Wait for vibration to complete (50ms)
      await new Promise(resolve => setTimeout(resolve, 50));

      onEnd?.();

    } catch (error) {
      console.error('❌ Error playing vibration pattern:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Create mood-based animation
   */
  createMoodAnimation(mood: string, animatedValue: Animated.Value): Animated.CompositeAnimation {
    const moodConfig = this.getMoodConfig(mood);

    switch (moodConfig.animationType) {
      case 'pulse':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1.2,
              duration: moodConfig.animationDuration / 4,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: moodConfig.animationDuration / 4,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.8,
              duration: moodConfig.animationDuration / 4,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: moodConfig.animationDuration / 4,
              useNativeDriver: true,
            }),
          ])
        );

      case 'bounce':
        return Animated.loop(
          Animated.sequence([
            Animated.spring(animatedValue, {
              toValue: 1.3,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
            Animated.spring(animatedValue, {
              toValue: 1,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
          ])
        );

      case 'fade':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 0.3,
              duration: moodConfig.animationDuration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: moodConfig.animationDuration / 2,
              useNativeDriver: true,
            }),
          ])
        );

      case 'shake':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: -10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 10,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.delay(200),
          ])
        );

      case 'glow':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1.5,
              duration: moodConfig.animationDuration / 3,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.7,
              duration: moodConfig.animationDuration / 3,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: moodConfig.animationDuration / 3,
              useNativeDriver: true,
            }),
          ])
        );

      case 'wave':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 1.1,
              duration: moodConfig.animationDuration / 6,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.9,
              duration: moodConfig.animationDuration / 6,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1.1,
              duration: moodConfig.animationDuration / 6,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.9,
              duration: moodConfig.animationDuration / 6,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1.1,
              duration: moodConfig.animationDuration / 6,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: moodConfig.animationDuration / 6,
              useNativeDriver: true,
            }),
          ])
        );

      default:
        return Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        });
    }
  }

  /**
   * Generate visual waveform for text content
   */
  generateTextWaveform(content: string, mood: string): number[] {
    const moodConfig = this.getMoodConfig(mood);
    const sampleRate = 60; // 60 samples per second
    const duration = Math.max(2000, content.length * 50); // Minimum 2s, scale with content length
    const samples = Math.floor((duration / 1000) * sampleRate);
    const waveform: number[] = [];

    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;
      let amplitude = 0;

      // Base amplitude from content length
      const contentAmplitude = Math.min(0.8, content.length / 280);

      switch (mood) {
        case 'chill':
          amplitude = Math.sin(time * 2) * 0.3 + Math.sin(time * 4) * 0.2 + contentAmplitude * 0.3;
          break;
        case 'excited':
          amplitude = Math.sin(time * 8) * 0.5 + Math.sin(time * 16) * 0.3 + contentAmplitude * 0.4;
          break;
        case 'calm':
          amplitude = Math.sin(time * 1) * 0.4 + Math.sin(time * 2) * 0.2 + contentAmplitude * 0.3;
          break;
        case 'deep_thought':
          amplitude = Math.sin(time * 0.5) * 0.6 + Math.sin(time * 1) * 0.3 + contentAmplitude * 0.4;
          break;
        case 'melancholy':
          amplitude = Math.sin(time * 1.5) * 0.4 + Math.sin(time * 3) * 0.2 + contentAmplitude * 0.3;
          break;
        case 'playful':
          amplitude = Math.sin(time * 6) * 0.3 + Math.sin(time * 12) * 0.4 + contentAmplitude * 0.5;
          break;
        default:
          amplitude = Math.sin(time * 2) * 0.3 + contentAmplitude * 0.3;
      }

      waveform.push(Math.max(0, Math.min(1, amplitude + 0.5)));
    }

    return waveform;
  }

  /**
   * Get mood-based color palette
   */
  getMoodColors(mood: string): {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  } {
    const colorMap: Record<string, any> = {
      chill: {
        primary: '#4A90E2',
        secondary: '#7BB3F0',
        background: '#F0F7FF',
        text: '#2C5282',
        accent: '#63B3ED'
      },
      excited: {
        primary: '#FF6B6B',
        secondary: '#FF8E8E',
        background: '#FFF0F0',
        text: '#C53030',
        accent: '#FC8181'
      },
      calm: {
        primary: '#51CF66',
        secondary: '#7DD87D',
        background: '#F0FFF4',
        text: '#2F855A',
        accent: '#68D391'
      },
      deep_thought: {
        primary: '#9775FA',
        secondary: '#B794F6',
        background: '#FAF5FF',
        text: '#553C9A',
        accent: '#A78BFA'
      },
      melancholy: {
        primary: '#868E96',
        secondary: '#A0A9B1',
        background: '#F8F9FA',
        text: '#495057',
        accent: '#9CA3AF'
      },
      playful: {
        primary: '#FFD43B',
        secondary: '#FFE066',
        background: '#FFFBEB',
        text: '#B7791F',
        accent: '#F6E05E'
      }
    };

    return colorMap[mood] || {
      primary: '#868E96',
      secondary: '#A0A9B1',
      background: '#F8F9FA',
      text: '#495057',
      accent: '#9CA3AF'
    };
  }

  /**
   * Stop current vibration
   */
  stopVibration(): void {
    if (this.isPlaying) {
      Vibration.cancel();
      this.isPlaying = false;
      console.log('🛑 Vibration stopped');
    }
  }

  /**
   * Check if vibration is currently playing
   */
  isVibrationPlaying(): boolean {
    return this.isPlaying;
  }
}

export default VisualFeedbackService.getInstance();
