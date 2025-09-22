import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { theme, spacing, moodConfig } from '@/utils/theme';
import { MoodType } from '@/types';
import { AuthService } from '@/services/authService';
import { useAuth } from '@/store/AuthContext';

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

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch(`https://bkfonnecvqlppivnrgxe.supabase.co/rest/v1/user_profiles?username=eq.@${username}`, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZm9ubmVjdnFscHBpdm5yZ3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDE0MTUsImV4cCI6MjA3MzAxNzQxNX0.t0f-n4JT9Lb6LBCxSIf6umH4pxVvgFuA62-0IVGejwg',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZm9ubmVjdnFscHBpdm5yZ3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDE0MTUsImV4cCI6MjA3MzAxNzQxNX0.t0f-n4JT9Lb6LBCxSIf6umH4pxVvgFuA62-0IVGejwg',
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
    <View style={styles.container}>
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
    </View>
  );
};

interface SignInScreenProps {
  onSignInSuccess: (user: any) => void;
  onBackToWelcome: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSignInSuccess, onBackToWelcome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthenticatedUser } = useAuth();

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
        onSignInSuccess(user);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
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

export default { SignUpScreen, SignInScreen };
