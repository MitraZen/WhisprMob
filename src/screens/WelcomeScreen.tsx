import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

import { theme, spacing } from '@/utils/theme';

const { width, height } = Dimensions.get('window');

const WelcomeScreen: React.FC = () => {

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>💬</Text>
            <Text style={styles.appName}>Whispr</Text>
            <Text style={styles.tagline}>Send anonymous messages to the world{'\n'}and discover meaningful connections</Text>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={styles.featureText}>Anonymous</Text>
              <Text style={styles.featureSubtext}>Share without revealing identity</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>💭</Text>
              <Text style={styles.featureText}>Mood-Based</Text>
              <Text style={styles.featureSubtext}>Connect through emotions</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🛡️</Text>
              <Text style={styles.featureText}>Safe & Secure</Text>
              <Text style={styles.featureSubtext}>Protected conversations</Text>
            </View>
          </View>


          <Text style={styles.disclaimer}>
            Connect with others who share your current mood. 
            Your identity remains completely anonymous.
          </Text>
        </View>
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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    alignItems: 'center',
  },
  feature: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: 25,
    width: '100%',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  featureSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.lg,
  },
});

export default WelcomeScreen;


