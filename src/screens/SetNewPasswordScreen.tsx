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

interface SetNewPasswordScreenProps {
  email: string;
  code: string;
  onPasswordUpdated: () => void;
  onBack: () => void;
}

export const SetNewPasswordScreen: React.FC<SetNewPasswordScreenProps> = ({
  email,
  code,
  onPasswordUpdated,
  onBack,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert('Password Required', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match');
      return;
    }

    setIsLoading(true);
    try {
      const { success, error } = await AuthService.updatePasswordWithCode(email, code, password);
      
      if (success) {
        Alert.alert(
          'Password Updated! ✅',
          'Your password has been successfully updated. You can now sign in with your new password.',
          [
            {
              text: 'OK',
              onPress: onPasswordUpdated,
            },
          ]
        );
      } else {
        Alert.alert('Update Failed', error || 'Failed to update password. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Enter your new password below
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Text style={styles.eyeButtonText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Password must be at least 6 characters long
          </Text>

          <TouchableOpacity
            style={[styles.button, (!password || !confirmPassword || isLoading) && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={!password || !confirmPassword || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Back</Text>
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
  inputContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingRight: 50,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: spacing.xs,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.onSurface,
    opacity: 0.6,
    marginBottom: spacing.lg,
    paddingLeft: spacing.xs,
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
});

export default SetNewPasswordScreen;


