import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme, spacing } from '@/utils/theme';
import AuthService from '@/services/authService';

interface PasswordResetScreenProps {
  onBackToSignIn: () => void;
  onResetSuccess?: () => void;
  onCodeSent?: (email: string) => void; // New callback for code-based flow
}

export const PasswordResetScreen: React.FC<PasswordResetScreenProps> = ({ 
  onBackToSignIn, 
  onResetSuccess,
  onCodeSent,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetCode = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await AuthService.generateResetCode(email);
      
      if (success) {
        setEmailSent(true);
        // Navigate to code entry screen
        if (onCodeSent) {
          onCodeSent(email);
        } else {
          Alert.alert(
            'Reset Code Sent! 📧',
            `We've sent a 6-digit reset code to ${email}. Please check your email and enter the code.`,
            [
              { 
                text: 'OK', 
                onPress: () => {
                  if (onCodeSent) {
                    onCodeSent(email);
                  }
                }
              }
            ]
          );
        }
      } else {
        Alert.alert('Reset Failed', error || 'Failed to send reset code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setEmailSent(false);
    setEmail('');
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Check Your Email 📧</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit reset code to {email}
          </Text>
          
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Next Steps:</Text>
            <Text style={styles.instruction}>1. Check your email inbox</Text>
            <Text style={styles.instruction}>2. Enter the 6-digit code</Text>
            <Text style={styles.instruction}>3. Set your new password</Text>
            <Text style={styles.instruction}>4. Sign in with your new password</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={onBackToSignIn}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleTryAgain}
          >
            <Text style={styles.secondaryButtonText}>Send to Different Email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a 6-digit code to reset your password
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSendResetCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToSignIn}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
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
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  instruction: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.8,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
});

export default PasswordResetScreen;


