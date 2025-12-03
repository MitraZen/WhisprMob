import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme, spacing } from '@/utils/theme';

interface SignUpOptionsScreenProps {
  onContinueWithEmail: () => void;
  onContinueWithGoogle: () => void;
  onBackToWelcome: () => void;
  isLoading?: boolean;
}

export const SignUpOptionsScreen: React.FC<SignUpOptionsScreenProps> = ({
  onContinueWithEmail,
  onContinueWithGoogle,
  onBackToWelcome,
  isLoading = false,
}) => {
  // Handle Android back button
  React.useEffect(() => {
    const backAction = () => {
      onBackToWelcome();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBackToWelcome]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to sign up
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {/* Continue with Email */}
          <TouchableOpacity
            style={[styles.optionButton, styles.emailButton, isLoading && styles.buttonDisabled]}
            onPress={onContinueWithEmail}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Icon name="mail-outline" size={24} color="#6366f1" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Continue with Email</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#6366f1" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue with Google */}
          <TouchableOpacity
            style={[styles.optionButton, styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={onContinueWithGoogle}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#4285F4" style={styles.buttonIcon} />
              ) : (
                <View style={styles.googleIconContainer}>
                  <Icon name="logo-google" size={24} color="#4285F4" />
                </View>
              )}
              <Text style={[styles.buttonText, styles.googleButtonText]}>
                Continue with Google
              </Text>
            </View>
            {!isLoading && <Icon name="chevron-forward" size={20} color="#4285F4" />}
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToWelcome}
          disabled={isLoading}
        >
          <Icon name="arrow-back" size={20} color={theme.colors.primary} />
          <Text style={styles.backButtonText}>Back to Welcome</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  optionButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailButton: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f9ff',
  },
  googleButton: {
    borderColor: '#4285F4',
    backgroundColor: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonIcon: {
    marginRight: spacing.md,
  },
  googleIconContainer: {
    marginRight: spacing.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    flex: 1,
  },
  googleButtonText: {
    color: '#4285F4',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.5,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});

export default SignUpOptionsScreen;



