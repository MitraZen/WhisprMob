import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme, spacing } from '@/utils/theme';
import { SignInScreen, SignUpScreen } from '@/screens/AuthScreens';
import ProfileCompletionScreen from '@/screens/ProfileCompletionScreen';
import WhisprNotesScreen from '@/screens/WhisprNotesScreen';
import BuddiesScreen from '@/screens/BuddiesScreen';
import ChatScreen from '@/screens/ChatScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import AdminPanel from '@/screens/AdminPanel';
import { useAuth } from '@/store/AuthContext';
import { useAdmin } from '@/store/AdminContext';

// Simple screens without Paper components
const WelcomeScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const { enableAdminMode } = useAdmin();
  const [adminTapCount, setAdminTapCount] = useState(0);

  const handleLogoPress = () => {
    setAdminTapCount(prev => prev + 1);
    if (adminTapCount >= 4) { // 5 taps to enable admin
      enableAdminMode();
      setAdminTapCount(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <TouchableOpacity onPress={handleLogoPress}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoEmoji}>💬</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.appName}>Whispr</Text>
            <Text style={styles.tagline}>Send anonymous messages to the world</Text>
            <Text style={styles.taglineSub}>and discover meaningful connections</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.signUpButton} 
              onPress={() => onNavigate('signup')}
            >
              <Text style={styles.signUpButtonText}>Sign Up</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={() => onNavigate('signin')}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>💬</Text>
              </View>
              <Text style={styles.featureTitle}>Anonymous</Text>
              <Text style={styles.featureSubtext}>Share without revealing identity</Text>
            </View>
            
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>❤️</Text>
              </View>
              <Text style={styles.featureTitle}>Mood-Based</Text>
              <Text style={styles.featureSubtext}>Connect through emotions</Text>
            </View>
            
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>🛡️</Text>
              </View>
              <Text style={styles.featureTitle}>Safe & Secure</Text>
              <Text style={styles.featureSubtext}>Protected conversations</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const MoodSelectionScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const moods = [
    { emoji: '😊', name: 'Happy', value: 'happy' },
    { emoji: '😢', name: 'Sad', value: 'sad' },
    { emoji: '🤩', name: 'Excited', value: 'excited' },
    { emoji: '😰', name: 'Anxious', value: 'anxious' },
    { emoji: '😌', name: 'Calm', value: 'calm' },
    { emoji: '😠', name: 'Angry', value: 'angry' },
    { emoji: '🤔', name: 'Curious', value: 'curious' },
    { emoji: '😔', name: 'Lonely', value: 'lonely' },
    { emoji: '🙏', name: 'Grateful', value: 'grateful' },
    { emoji: '✨', name: 'Hopeful', value: 'hopeful' },
  ];

  const handleMoodSelect = async (mood: string) => {
    try {
      setIsConnecting(true);
      setConnectionStatus('Testing database connection...');
      
      // First test the database connection
      const { testSupabaseConnection } = await import('@/utils/testSupabase');
      const testResult = await testSupabaseConnection();
      
      if (!testResult.success) {
        setConnectionStatus(`Database test failed: ${testResult.error}`);
        return;
      }
      
      setConnectionStatus('Database connected! Creating user...');
      
      // Create user directly using HTTP DatabaseService instead of Supabase client
      const { HttpDatabaseService } = await import('@/services/httpDatabase');
      const { generateAnonymousId } = await import('@/utils/helpers');
      
      const anonymousId = generateAnonymousId();
      const newUser = await HttpDatabaseService.createUser({
        anonymousId,
        mood: mood as any,
      });
      
      if (!newUser) {
        throw new Error('Failed to create user in database');
      }
      
      setConnectionStatus('User created successfully!');
      onNavigate('home');
    } catch (error) {
      console.error('Mood selection error:', error);
      setConnectionStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.whiteContainer}>
        <View style={styles.content}>
          <Text style={styles.screenTitle}>How are you feeling?</Text>
          <Text style={styles.screenSubtitle}>Select your current mood to find like-minded connections</Text>
          
          {connectionStatus ? (
            <View style={styles.connectionStatus}>
              <Text style={styles.connectionStatusText}>{connectionStatus}</Text>
            </View>
          ) : null}
          
          <View style={styles.moodGrid}>
            {moods.map((mood, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.moodButton, isConnecting && styles.moodButtonDisabled]} 
                onPress={() => handleMoodSelect(mood.value)}
                disabled={isConnecting}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodName}>{mood.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => onNavigate('welcome')}
            disabled={isConnecting}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const HomeScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  return (
    <View style={styles.container}>
      <View style={styles.whiteContainer}>
        <View style={styles.content}>
          <Text style={styles.screenTitle}>Welcome to Whispr! 🎉</Text>
          <Text style={styles.screenSubtitle}>
            You're now connected to the anonymous messaging network
          </Text>
          
          <View style={styles.homeFeatureCard}>
            <Text style={styles.cardTitle}>🏠 Home</Text>
            <Text style={styles.cardText}>Your dashboard for anonymous connections</Text>
          </View>
          
          <View style={styles.homeFeatureCard}>
            <Text style={styles.cardTitle}>💬 Messages</Text>
            <Text style={styles.cardText}>Chat with anonymous users sharing your mood</Text>
          </View>
          
          <View style={styles.homeFeatureCard}>
            <Text style={styles.cardTitle}>👥 Connections</Text>
            <Text style={styles.cardText}>Find and connect with like-minded people</Text>
          </View>
          
          <View style={styles.homeFeatureCard}>
            <Text style={styles.cardTitle}>👤 Profile</Text>
            <Text style={styles.cardText}>Manage your anonymous profile and settings</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => onNavigate('welcome')}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [currentParams, setCurrentParams] = useState<any>(null);
  const { isAuthenticated, isLoading, isProfileComplete, user, logout } = useAuth();
  const { isAdminMode } = useAdmin();

  const navigate = (screen: string, params?: any) => {
    setCurrentParams(params ?? null);
    setCurrentScreen(screen);
  };

  console.log('AppNavigator - currentScreen:', currentScreen);

  // When the user becomes authenticated, default to notes screen
  React.useEffect(() => {
    if (isAuthenticated) {
      const authScreens = new Set(['welcome', 'signin', 'signup', 'mood', 'profileCompletion']);
      if (authScreens.has(currentScreen)) {
        setCurrentScreen('notes');
      }
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show admin panel if admin mode is enabled
  if (isAdminMode) {
    return <AdminPanel onClose={() => navigate('welcome')} />;
  }

  if (isAuthenticated && isProfileComplete === false) {
    console.log('AppNavigator - Rendering ProfileCompletionScreen with user:', user);
    return (
      <ProfileCompletionScreen
        onComplete={() => navigate('notes')}
        onSkip={() => navigate('notes')}
        user={user}
        onNavigate={navigate}
      />
    );
  }

  switch (currentScreen) {
    case 'welcome':
      return <WelcomeScreen onNavigate={navigate} />;
    case 'signin':
      return (
        <SignInScreen
          onSignInSuccess={() => navigate('notes')}
          onBackToWelcome={() => navigate('welcome')}
        />
      );
    case 'signup':
      return (
        <SignUpScreen
          onSignUpSuccess={() => navigate('notes')}
          onBackToWelcome={() => navigate('welcome')}
        />
      );
    case 'mood':
      return <MoodSelectionScreen onNavigate={navigate} />;
    case 'profileCompletion':
      return (
        <ProfileCompletionScreen
          onComplete={() => navigate('notes')}
          onSkip={() => navigate('notes')}
          user={user}
          onNavigate={navigate}
        />
      );
    case 'notes':
      return <WhisprNotesScreen onNavigate={navigate} user={user} />;
    case 'buddies':
      if (isAuthenticated) return <BuddiesScreen onNavigate={navigate} user={user} />;
      return <WelcomeScreen onNavigate={navigate} />;
    case 'chat':
      if (isAuthenticated) return (
        <ChatScreen
          onNavigate={navigate}
          user={user}
          buddy={currentParams?.buddy}
        />
      );
      return <WelcomeScreen onNavigate={navigate} />;
    case 'profile':
      if (isAuthenticated) return <ProfileScreen onNavigate={navigate} user={user} />;
      return <WelcomeScreen onNavigate={navigate} />;
    case 'settings':
      if (isAuthenticated) return <SettingsScreen onNavigate={navigate} user={user} onLogout={async () => { await logout(); navigate('welcome'); }} />;
      return <WelcomeScreen onNavigate={navigate} />;
    default:
      return <WelcomeScreen onNavigate={navigate} />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  whiteContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    marginTop: 80,
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 60,
    color: 'white',
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  taglineSub: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  signUpButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    width: '100%',
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
  signUpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  signInButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2563eb',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: 12,
    marginHorizontal: spacing.xs,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  featureSubtext: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  screenSubtitle: {
    fontSize: 16,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  moodButton: {
    width: 80,
    height: 80,
    margin: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  moodName: {
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  moodButtonDisabled: {
    opacity: 0.5,
  },
  connectionStatus: {
    backgroundColor: '#f3f4f6',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
    width: '100%',
  },
  connectionStatusText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  homeFeatureCard: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  cardText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default AppNavigator;