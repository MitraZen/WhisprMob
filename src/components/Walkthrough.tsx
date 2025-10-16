import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetElement?: string; // For highlighting specific elements
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform
}

interface WalkthroughProps {
  visible: boolean;
  steps: WalkthroughStep[];
  onComplete: () => void;
  onSkip: () => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

export const Walkthrough: React.FC<WalkthroughProps> = ({
  visible,
  steps,
  onComplete,
  onSkip,
  currentStep = 0,
  onStepChange,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Cancel any running animations
    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (visible) {
      animationRef.current = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250, // Reduced duration
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250, // Reduced duration
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120, // Increased tension for snappier animation
          friction: 10, // Increased friction for less bouncy animation
          useNativeDriver: true,
        }),
      ]);
      animationRef.current.start();
    } else {
      // Reset values immediately without animation
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.8);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (stepChangeTimeoutRef.current) {
        clearTimeout(stepChangeTimeoutRef.current);
      }
    };
  }, [visible]);

  // Debounce step changes to prevent rapid clicking
  const stepChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    if (stepChangeTimeoutRef.current) {
      clearTimeout(stepChangeTimeoutRef.current);
    }

    stepChangeTimeoutRef.current = setTimeout(() => {
      if (currentStep < steps.length - 1) {
        const nextStep = currentStep + 1;
        onStepChange?.(nextStep);
      } else {
        onComplete();
      }
    }, 100); // Small delay to prevent rapid clicking
  };

  const handlePrevious = () => {
    if (stepChangeTimeoutRef.current) {
      clearTimeout(stepChangeTimeoutRef.current);
    }

    stepChangeTimeoutRef.current = setTimeout(() => {
      if (currentStep > 0) {
        const prevStep = currentStep - 1;
        onStepChange?.(prevStep);
      }
    }, 100); // Small delay to prevent rapid clicking
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!visible || !steps[currentStep]) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {currentStep + 1} of {steps.length}
              </Text>
            </View>

            {/* Step Content */}
            <View style={styles.content}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
                <Icon
                  name={currentStepData.icon}
                  size={40}
                  color="#fff"
                />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {currentStepData.title}
              </Text>

              {/* Description */}
              <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                {currentStepData.description}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons - Fixed at bottom */}
          <View style={styles.buttonContainer}>
            {/* Navigation Buttons - Centered */}
            <View style={styles.navigationButtons}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.previousButton]}
                  onPress={handlePrevious}
                >
                  <Icon name="chevron-back" size={20} color={theme.colors.primary} />
                  <Text style={[styles.navButtonText, { color: theme.colors.primary }]}>
                    Previous
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.navButton, styles.nextButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleNext}
              >
                <Text style={[styles.navButtonText, { color: '#fff' }]}>
                  {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                </Text>
                {currentStep < steps.length - 1 && (
                  <Icon name="chevron-forward" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Skip Button - Below navigation */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={[styles.skipButtonText, { color: theme.colors.onSurfaceVariant }]}>
                Skip Tour
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40, // Add vertical padding to ensure content fits
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.8, // Limit height to 80% of screen
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Add padding to prevent content from being hidden behind buttons
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 20, // Reduced from 32 to make more space for buttons
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center', // Center all buttons
    marginTop: 20, // Add margin to separate from scrollable content
    paddingTop: 16, // Add padding for visual separation
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center', // Center the skip button text
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the navigation buttons
    marginBottom: 16, // Add margin below navigation buttons
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginLeft: 8,
  },
  previousButton: {
    backgroundColor: '#F5F5F5',
  },
  nextButton: {
    minWidth: 100,
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 4,
  },
});

export default Walkthrough;
