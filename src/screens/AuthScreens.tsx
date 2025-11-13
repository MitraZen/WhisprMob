import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, 
  KeyboardAvoidingView, ScrollView, Platform, BackHandler 
} from 'react-native';
import { theme, spacing, moodConfig } from '@/utils/theme';
import { MoodType } from '@/types';
import { AuthService } from '@/services/authService';
import { useAuth } from '@/store/AuthContext';
import BiometricService from '@/services/biometricService';

interface SignUpScreenProps {
  onSignUpSuccess: (user: any) => void;
  onBackToWelcome: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ onSignUpSuccess, onBackToWelcome }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const { setAuthenticatedUser } = useAuth();

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onBackToWelcome();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBackToWelcome]);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch(`https://axkktejoldizpveydidx.supabase.co/rest/v1/user_profiles?username=ilike.${username}`, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4a2t0ZWpvbGRpenB2ZXlkaWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDE2ODgsImV4cCI6MjA3NDkxNzY4OH0.axo3f_qTDzvk2WYN8Z53B1F4kTeOgP07G2TiOgkQDV4',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsernameAvailable(data.length === 0);
      } else {
        setUsernameAvailable(null);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (text.length >= 3) {
      checkUsernameAvailability(text);
    } else {
      setUsernameAvailable(null);
    }
  };

  const handleSignUp = async () => {
    if (!email || !username || !password || !confirmPassword || !selectedMood) {
      Alert.alert('Error', 'Please fill in all fields and select a mood');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Error', 'Username is already taken. Please choose a different username.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await AuthService.signUp(email, password, selectedMood, username);
      
      if (error) {
        Alert.alert('Sign Up Failed', error);
      } else if (user) {
        await setAuthenticatedUser(user);
        onSignUpSuccess(user);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const moods: MoodType[] = ['happy', 'sad', 'excited', 'anxious', 'calm', 'angry', 'curious', 'lonely', 'grateful', 'hopeful'];

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Whispr and connect with like-minded people</Text>

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
          />

              <View style={styles.usernameContainer}>
                <TextInput
                  style={[
                    styles.input,
                    usernameAvailable === false && styles.inputError,
                    usernameAvailable === true && styles.inputSuccess
                  ]}
                  placeholder="Username"
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isCheckingUsername && (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={styles.usernameIndicator} />
                )}
                {usernameAvailable === true && (
                  <Text style={styles.usernameSuccessText}>✓ Available</Text>
                )}
                {usernameAvailable === false && (
                  <Text style={styles.usernameErrorText}>✗ Username taken</Text>
                )}
              </View>

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.moodLabel}>How are you feeling today?</Text>
          <View style={styles.moodGrid}>
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodButton,
                  selectedMood === mood && styles.moodButtonSelected
                ]}
                onPress={() => setSelectedMood(mood)}
              >
                <Text style={styles.moodEmoji}>
                  {moodConfig[mood] ? moodConfig[mood].emoji : '😊'}
                </Text>
                <Text style={[
                  styles.moodName,
                  selectedMood === mood && styles.moodNameSelected
                ]}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToWelcome}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Back to Welcome</Text>
          </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

interface SignInScreenProps {
  onSignInSuccess: (user: any) => void;
  onBackToWelcome: () => void;
  onForgotPassword?: () => void; // New callback for password reset
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess, onBackToWelcome, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { setAuthenticatedUser } = useAuth();

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      onBackToWelcome();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBackToWelcome]);

  const checkBiometricStatus = async () => {
    try {
      const isAvailable = await BiometricService.isBiometricAvailable();
      const isEnabled = await BiometricService.isBiometricEnabled();
      setBiometricAvailable(isAvailable);
      setBiometricEnabled(isEnabled);
    } catch (error) {
      console.error('Error checking biometric status:', error);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await AuthService.signIn(email, password);
      
      if (error) {
        Alert.alert('Sign In Failed', error);
      } else if (user) {
        await setAuthenticatedUser(user);
        
        // Offer to enable biometric authentication if available and not already enabled
        if (biometricAvailable && !biometricEnabled) {
          const shouldEnable = await BiometricService.promptBiometricSetup();
          if (shouldEnable) {
            try {
              const result = await BiometricService.enableBiometric(user.id, password);
              if (result.success) {
                Alert.alert(
                  'Biometric Authentication Enabled',
                  `${result.biometryType?.name} authentication has been enabled for faster future sign-ins.`,
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error enabling biometric authentication:', error);
            }
          }
        }
        
        onSignInSuccess(user);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    if (!biometricAvailable || !biometricEnabled) {
      Alert.alert('Biometric Not Available', 'Biometric authentication is not available or not enabled.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await BiometricService.authenticateWithBiometric();
      
      if (result.success && result.credentials) {
        const { user, error } = await AuthService.signIn(result.credentials.userId, result.credentials.password);
        
        if (error) {
          Alert.alert('Sign In Failed', error);
        } else if (user) {
          await setAuthenticatedUser(user);
          onSignInSuccess(user);
        }
      } else {
        Alert.alert('Authentication Failed', result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to password reset screen
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      // Fallback: Show alert if navigation not available
      Alert.alert('Password Reset', 'Please use the password reset screen to reset your password.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your Whispr journey</Text>

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
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading || isResettingPassword}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Biometric Sign In Button */}
          {biometricAvailable && biometricEnabled && (
            <TouchableOpacity
              style={[styles.biometricButton, isLoading && styles.buttonDisabled]}
              onPress={handleBiometricSignIn}
              disabled={isLoading || isResettingPassword}
            >
              <Text style={styles.biometricButtonText}>🔐 Use Biometric Authentication</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            disabled={isLoading || isResettingPassword}
          >
            {isResettingPassword ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToWelcome}
            disabled={isLoading || isResettingPassword}
          >
            <Text style={styles.backButtonText}>← Back to Welcome</Text>
          </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg, // Will be overridden by dynamic padding
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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  usernameContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  usernameIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  usernameSuccessText: {
    position: 'absolute',
    right: 12,
    top: 12,
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  usernameErrorText: {
    position: 'absolute',
    right: 12,
    top: 12,
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  moodButton: {
    width: 70,
    height: 70,
    margin: spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f9ff',
  },
  moodEmoji: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  moodName: {
    fontSize: 10,
    color: theme.colors.onSurface,
    fontWeight: '500',
    textAlign: 'center',
  },
  moodNameSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
  biometricButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  biometricButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  forgotPasswordButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
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
});

export default { SignUpScreen, SignInScreen };
