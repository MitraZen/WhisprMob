import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';

import { theme, spacing } from '@/utils/theme';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onNavigate: (screen: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>💬</Text>
              <Text style={styles.appName}>Whispr</Text>
              <Text style={styles.tagline}>
                Connect anonymously through{'\n'}mood-based conversations
              </Text>
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🔒</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Anonymous</Text>
                <Text style={styles.featureDescription}>
                  Share your thoughts without revealing your identity
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💭</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Mood-Based</Text>
                <Text style={styles.featureDescription}>
                  Connect with others who share your current emotional state
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🛡️</Text>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Safe & Secure</Text>
                <Text style={styles.featureDescription}>
                  Protected conversations with built-in safety features
                </Text>
              </View>
            </View>
          </View>

          {/* Action Section */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => onNavigate('signup')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => onNavigate('signin')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Already have an account?</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              Join thousands of users sharing anonymous messages
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  
  // Header Section
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
    color: 'white',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },

  // Features Section
  featuresSection: {
    flex: 1.2,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    fontSize: 28,
    marginRight: spacing.md,
    width: 40,
    textAlign: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },

  // Action Section
  actionSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  primaryButton: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },

  // Footer Section
  footerSection: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default WelcomeScreen;


