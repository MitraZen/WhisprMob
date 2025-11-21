import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme, spacing } from '@/utils/theme';

const { height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const bubbleY = React.useRef(new Animated.Value(0)).current;
  const bubbleOpacity = React.useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = React.useState(false);

  // --- Entry + Logo Pulse Animations ---
  React.useEffect(() => {
    const startAnimations = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    const timeoutId = setTimeout(startAnimations, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // --- Whisper Send Bubble + Fade-Out Transition ---
  const handleNavigate = (screen: string) => {
    if (isAnimating) return;
    setIsAnimating(true);

    bubbleY.setValue(0);
    bubbleOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleY, {
        toValue: -120,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
        onNavigate(screen);
      });
    }, 500);
  };

  return (
    <View style={styles.container}>
      {/* Soft Pastel Background */}
      <LinearGradient colors={['#FDFBFB', '#EBEDEE']} style={styles.gradient} />

      {/* Whisper Bubble */}
      <Animated.View
        style={[
          styles.bubble,
          {
            opacity: bubbleOpacity,
            transform: [{ translateY: bubbleY }],
          },
        ]}
      >
        <Text style={styles.bubbleText}>💭</Text>
      </Animated.View>

      {/* Animated Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text style={styles.logo}>💬</Text>
            </Animated.View>
            <Text style={styles.appName}>Whispr</Text>
            <Text style={styles.tagline}>"Where whisprs find hearts."</Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <View style={styles.featureBlock}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text
                style={styles.featureTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Anonymous
              </Text>
            </View>

            <View style={styles.featureBlock}>
              <Text style={styles.featureIcon}>💭</Text>
              <Text
                style={styles.featureTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Mood-Based
              </Text>
            </View>

            <View style={styles.featureBlock}>
              <Text style={styles.featureIcon}>🛡️</Text>
              <Text
                style={styles.featureTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                Safe & Secure
              </Text>
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleNavigate('signup')}
            activeOpacity={0.8}
            disabled={isAnimating}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleNavigate('signin')}
            activeOpacity={0.7}
            disabled={isAnimating}
          >
            <Text style={styles.secondaryButtonText}>
              Already have an account?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Join thousands of users sharing anonymous messages
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBFB',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: 'absolute',
    bottom: height * 0.25,
    alignSelf: 'center',
    zIndex: 10,
  },
  bubbleText: {
    fontSize: 26,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.08,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#7B5CF4', // 💜 Whispr brand color
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#4B3F8A',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    fontWeight: 'bold',
    marginTop: 6,
  },
  featuresSection: {
    flex: 1.2,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  featureBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EEFF', // soft lavender tone
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: 14,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: '#DAD0FF', // lavender border
    shadowColor: 'rgba(123, 92, 244, 0.25)', // brand glow
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 80,
  },
  featureIcon: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  featureTitle: {
    fontSize: 12,
    color: '#3B2E6F', // improved contrast text color
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  primaryButton: {
    backgroundColor: '#7B5CF4',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#7B5CF4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#7B5CF4',
    textDecorationLine: 'underline',
  },
  footerSection: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default WelcomeScreen;
