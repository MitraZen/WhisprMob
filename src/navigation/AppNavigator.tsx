import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler, Alert, DeviceEventEmitter } from 'react-native';
import { theme, spacing } from '@/utils/theme';
import { SignInScreen, SignUpScreen } from '@/screens/AuthScreens';
import ProfileCompletionScreen from '@/screens/ProfileCompletionScreen';
import WhisprNotesScreen from '@/screens/WhisprNotesScreen';
import BuddiesScreen from '@/screens/BuddiesScreen';
import { BuddyRequestsScreen } from '@/screens/BuddyRequestsScreen';
import ChatScreen from '@/screens/ChatScreen';
import { UnifiedChatScreen } from '@/screens/UnifiedChatScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import SettingsHubScreen from '@/screens/SettingsHubScreen';
import AdminPanel from '@/screens/AdminPanel';
import SentNotesScreen from '@/screens/SentNotesScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import SendNoteScreen from '@/screens/SendNoteScreen';
import LiveWhisprsScreen from '@/screens/LiveWhisprsScreen';
import WebSocketTestScreen from '@/screens/WebSocketTestScreen';
import AchievementsScreen from '@/screens/AchievementsScreen';
import ActivityScreen from '@/screens/ActivityScreen';
import { NearbyScreen } from '@/modules/nearby';
import { useAuth } from '@/store/AuthContext';
import { useAdmin } from '@/store/AdminContext';
import SafeNavigation from '@/utils/safeNavigation';
import WelcomeScreen from '@/screens/WelcomeScreen';
import { PasswordResetScreen } from '@/screens/PasswordResetScreen';
import { VerifyResetCodeScreen } from '@/screens/VerifyResetCodeScreen';
import { SetNewPasswordScreen } from '@/screens/SetNewPasswordScreen';

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

const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [currentParams, setCurrentParams] = useState<any>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['welcome']);
  const { isAuthenticated, isLoading, isProfileComplete, user } = useAuth();
  const { isAdminMode } = useAdmin();
  
  // Store reset flow state
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');

  const navigate = (screen: string, params?: any) => {
    setCurrentParams(params ?? null);
    setCurrentScreen(screen);
    
    // Add to navigation history (avoid duplicates)
    setNavigationHistory(prev => {
      const newHistory = [...prev];
      if (newHistory[newHistory.length - 1] !== screen) {
        newHistory.push(screen);
      }
      return newHistory;
    });
  };

  const goBack = () => {
    setNavigationHistory(prev => {
      if (prev.length > 1) {
        const newHistory = [...prev];
        newHistory.pop(); // Remove current screen
        const previousScreen = newHistory[newHistory.length - 1];
        
        // Ensure we don't go back to auth screens if user is authenticated
        if (isAuthenticated && (previousScreen === 'signin' || previousScreen === 'signup' || previousScreen === 'welcome')) {
          // If authenticated user tries to go back to auth screens, go to notes instead
          setCurrentScreen('notes');
          return ['welcome', 'notes'];
        }
        
        setCurrentScreen(previousScreen);
        return newHistory;
      }
      return prev;
    });
  };

  // Handle Android back button with custom navigation flow
  useEffect(() => {
    const backAction = () => {
      return SafeNavigation.handleBackButton(
        currentScreen,
        navigationHistory,
        isAuthenticated,
        (screen: string) => {
          setCurrentScreen(screen);
          // Update navigation history to reflect the navigation
          // If going back to welcome from signup/signin, reset history
          if ((currentScreen === 'signup' || currentScreen === 'signin') && screen === 'welcome') {
            setNavigationHistory(['welcome']);
          } else {
          setNavigationHistory(prev => {
            const safeHistory = SafeNavigation.getSafeNavigationHistory(prev, isAuthenticated);
            return [...safeHistory, screen];
          });
          }
        },
        SafeNavigation.getFallbackScreen(isAuthenticated, isProfileComplete)
      );
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [navigationHistory, currentScreen, isAuthenticated, isProfileComplete]);

  console.log('AppNavigator - currentScreen:', currentScreen);

  // Ensure unauthenticated users don't stay on signup/signin after app reopens
  // This handles the case where Android restores app state to signup screen
  const hasCheckedInitialScreen = React.useRef(false);
  const previousLoadingState = React.useRef(isLoading);
  
  React.useEffect(() => {
    // Only check once when app finishes loading (isLoading transitions from true to false)
    const justFinishedLoading = previousLoadingState.current && !isLoading;
    previousLoadingState.current = isLoading;
    
    if (justFinishedLoading && !isAuthenticated && !hasCheckedInitialScreen.current) {
      hasCheckedInitialScreen.current = true;
      // If we're on signup/signin when app first loads (not authenticated),
      // it means app restored to signup - reset to welcome
      if (currentScreen === 'signup' || currentScreen === 'signin') {
        const timer = setTimeout(() => {
          setCurrentScreen('welcome');
          setNavigationHistory(['welcome']);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    // Reset the flag if user becomes authenticated (allows check on next app start)
    if (isAuthenticated) {
      hasCheckedInitialScreen.current = false;
    }
  }, [isLoading, isAuthenticated, currentScreen]); // Run when app finishes loading

  // ✅ FCM NOTIFICATION NAVIGATION HANDLER
  // ⚠️ IMPORTANT: This ONLY handles FCM push notifications
  // Local notifications are handled by the 'navigateToChat' event listener below
  useEffect(() => {
    const handleFCMNavigation = (event: any) => {
      try {
        console.log('📱 [FCM NAV] Received FCM notification navigation event:', event);
        const { screen, source, notificationType } = event;
        
        // Verify this is from FCM (not local notification)
        if (source !== 'fcm') {
          console.log('📱 [FCM NAV] Ignoring non-FCM navigation event');
          return;
        }
        
        // Only navigate if user is authenticated
        if (!isAuthenticated) {
          console.log('📱 [FCM NAV] User not authenticated, deferring navigation');
          // Store pending navigation to execute after auth
          const pendingNav = () => {
            if (isAuthenticated) {
              console.log('📱 [FCM NAV] Executing deferred navigation:', screen);
              setCurrentScreen(screen);
            }
          };
          // Try after a delay to allow auth to complete
          setTimeout(pendingNav, 1000);
          return;
        }
        
        console.log('📱 [FCM NAV] Navigating to screen:', screen, 'Type:', notificationType);
        setCurrentScreen(screen);
        
        // Update navigation history
        setNavigationHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[newHistory.length - 1] !== screen) {
            newHistory.push(screen);
          }
          return newHistory;
        });
      } catch (error) {
        console.error('📱 [FCM NAV] Error handling FCM navigation:', error);
      }
    };

    const subscription = DeviceEventEmitter.addListener('fcmNotificationNavigation', handleFCMNavigation);
    
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // When the user becomes authenticated, default to notes screen
  // ⚠️ NOTE: FCM notifications may override this default navigation
  React.useEffect(() => {
    if (isAuthenticated) {
      const authScreens = new Set(['welcome', 'signin', 'signup', 'mood', 'profileCompletion']);
      if (authScreens.has(currentScreen)) {
        // Small delay to allow FCM navigation to take precedence
        const timer = setTimeout(() => {
          // Only default to notes if still on auth screen (FCM navigation may have changed it)
          const authScreensCheck = new Set(['welcome', 'signin', 'signup', 'mood', 'profileCompletion']);
          if (authScreensCheck.has(currentScreen)) {
            setCurrentScreen('notes');
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, currentScreen]);

  // Listen for notification tap events to navigate to chat
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let isHandling = false; // Prevent duplicate handling

    const handleNotificationNavigation = async (event: any) => {
      // Prevent duplicate navigation
      if (isHandling) {
        console.log('📱 [NAV] Navigation already in progress, skipping');
        return;
      }

      try {
        isHandling = true;
        console.log('📱 [NAV] Received navigateToChat event:', event);
        const { buddy, buddyId, buddyName, fromNotification } = event;

        // If buddy object is already provided, navigate immediately
        if (buddy) {
          console.log('📱 [NAV] Navigating to chat with buddy object:', buddy);
          navigate('chat', { buddy, fromNotification: fromNotification || true });
          return;
        }

        // Otherwise, find buddy asynchronously (non-blocking)
        // Navigate immediately with loading state, then update when buddy is found
        console.log('📱 [NAV] Finding buddy (non-blocking):', { buddyId, buddyName });
        
        const findBuddyPromise = (async () => {
          // Wait for session to be ready (progressive delays)
          let sessionReady = false;
          let sessionUserId: string | null = null;
          
          for (let attempt = 1; attempt <= 5; attempt++) {
            const { supabase } = await import('@/config/supabase');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (!sessionError && session?.user) {
              sessionReady = true;
              sessionUserId = session.user.id;
              break;
            }
            if (attempt < 5) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            }
          }

          // Fallback to user from AuthContext if session not ready
          let userId = sessionUserId || user?.id;

          if (!userId) {
            console.warn('📱 [NAV] No authenticated user found (session not ready and no user in context)');
            // Still try cache lookup with buddyId/buddyName as last resort
            if (buddyId || buddyName) {
              console.log('📱 [NAV] Attempting cache lookup without userId as fallback');
              userId = ''; // Will skip user_id filter in queries
            } else {
              return null;
            }
          } else if (!sessionReady) {
            console.log('📱 [NAV] Session not ready after wait, using user from AuthContext:', userId);
          }

          let foundBuddy = null;

          // Priority 1: Direct database lookup by buddyId (fastest)
          if (buddyId && userId) {
            try {
              const { supabase: supabaseClient } = await import('@/config/supabase');
              const query = supabaseClient
                .from('buddies')
                .select('*')
                .eq('id', buddyId);
              
              // Only add user_id filter if we have userId
              if (userId) {
                query.eq('user_id', userId);
              }
              
              const { data: buddyData, error: buddyError } = await query.single();

              if (!buddyError && buddyData) {
                // Transform database buddy to Buddy format
                foundBuddy = {
                  id: buddyData.id,
                  name: buddyData.name || 'Unknown',
                  username: buddyData.username || undefined,
                  initials: buddyData.initials || (buddyData.name?.charAt(0).toUpperCase() || '?'),
                  avatar: buddyData.avatar_url || undefined,
                  lastMessage: buddyData.last_message || undefined,
                  lastMessageTime: buddyData.last_message_time ? new Date(buddyData.last_message_time) : undefined,
                  unreadCount: buddyData.unread_count || 0,
                  isOnline: buddyData.is_online || false,
                  status: (buddyData.status as 'active' | 'away' | 'busy' | 'invisible') || 'active',
                  mood: buddyData.mood || undefined,
                  createdAt: new Date(buddyData.created_at),
                  updatedAt: new Date(buddyData.updated_at),
                  buddyUserId: buddyData.buddy_user_id || buddyData.user_id || buddyData.id,
                };
                console.log('📱 [NAV] Found buddy via direct DB lookup:', foundBuddy);
                return foundBuddy;
              }
            } catch (dbError) {
              console.warn('📱 [NAV] Direct DB lookup failed, falling back to cache:', dbError);
            }
          }

          // Priority 2: Cache lookup by buddyId
          if (!foundBuddy && buddyId && userId) {
            try {
              const { CachedBuddiesService } = await import('@/services/cachedBuddiesService');
              const buddies = await CachedBuddiesService.getBuddies(userId);
              foundBuddy = buddies.find(b => b.id === buddyId);
              if (foundBuddy) {
                console.log('📱 [NAV] Found buddy via cache by ID:', foundBuddy.id, foundBuddy.name);
                return foundBuddy;
              }
            } catch (cacheError) {
              console.warn('📱 [NAV] Cache lookup failed:', cacheError);
            }
          }

          // Priority 3: Cache lookup by buddyName
          if (!foundBuddy && buddyName && userId) {
            try {
              const { CachedBuddiesService } = await import('@/services/cachedBuddiesService');
              const buddies = await CachedBuddiesService.getBuddies(userId);
              foundBuddy = buddies.find(
                b => b.name === buddyName || b.username === buddyName || b.displayName === buddyName
              );
              if (foundBuddy) {
                console.log('📱 [NAV] Found buddy via cache by name:', foundBuddy.id, foundBuddy.name);
                return foundBuddy;
              }
            } catch (cacheError) {
              console.warn('📱 [NAV] Cache lookup by name failed:', cacheError);
            }
          }

          // If we still don't have a buddy but have buddyId/buddyName, log for debugging
          if (!foundBuddy && (buddyId || buddyName)) {
            console.warn('📱 [NAV] Could not find buddy after all attempts:', { buddyId, buddyName, userId });
          }

          return foundBuddy || null;
        })();

        // Navigate immediately with available info (non-blocking)
        // Chat screen can handle loading state while buddy is resolved
        navigate('chat', { 
          buddyId, 
          buddyName, 
          fromNotification: fromNotification || true,
          buddyPromise: findBuddyPromise // Pass promise for async resolution
        });

        // Update navigation when buddy is found (with timeout)
        Promise.race([
          findBuddyPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]).then((foundBuddy: any) => {
          if (foundBuddy) {
            console.log('📱 [NAV] Buddy found, updating navigation:', foundBuddy);
            // Update params if still on chat screen, preserve all async resolution props
            setCurrentParams({ 
              buddy: foundBuddy, 
              fromNotification: fromNotification || true,
              buddyId: buddyId, // Preserve for future reference
              buddyName: buddyName, // Preserve for future reference
              // Don't preserve buddyPromise as it's already resolved
            });
          }
        }).catch((error) => {
          console.warn('📱 [NAV] Buddy lookup failed or timed out:', error);
          // Navigation already happened with buddyId/buddyName, chat screen can handle it
        });

      } catch (error) {
        console.error('📱 [NAV] Error handling notification navigation:', error);
        // Fallback: navigate to buddies if error
        if (event.buddyId || event.buddyName) {
          navigate('chat', { 
            buddyId: event.buddyId, 
            buddyName: event.buddyName, 
            fromNotification: true 
          });
        } else {
          navigate('buddies');
        }
      } finally {
        // Reset after a delay to allow navigation to complete
        setTimeout(() => {
          isHandling = false;
        }, 1000);
      }
    };

    const subscription = DeviceEventEmitter.addListener('navigateToChat', handleNotificationNavigation);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, user]);

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
    console.log('AppNavigator - isProfileComplete:', isProfileComplete);
    return (
      <ProfileCompletionScreen
        onComplete={() => {
          console.log('Profile completed - navigating to notes');
          navigate('notes');
        }}
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
          onBackToWelcome={() => {
            // Navigate to welcome and reset navigation history
            setCurrentScreen('welcome');
            setNavigationHistory(['welcome']);
          }}
          onForgotPassword={() => navigate('passwordReset')}
        />
      );
    case 'signup':
      return (
        <SignUpScreen
          onSignUpSuccess={() => navigate('notes')}
          onBackToWelcome={() => {
            // Navigate to welcome and reset navigation history
            setCurrentScreen('welcome');
            setNavigationHistory(['welcome']);
          }}
        />
      );
    case 'passwordReset':
      return (
        <PasswordResetScreen
          onBackToSignIn={() => navigate('signin')}
          onCodeSent={(email: string) => {
            setResetEmail(email);
            navigate('verifyResetCode');
          }}
        />
      );
    case 'verifyResetCode':
      return (
        <VerifyResetCodeScreen
          email={resetEmail}
          onCodeVerified={(code: string) => {
            setResetCode(code);
            navigate('setNewPassword');
          }}
          onBack={() => navigate('passwordReset')}
          onResendCode={async () => {
            // Resend code logic is handled in VerifyResetCodeScreen
          }}
        />
      );
    case 'setNewPassword':
      return (
        <SetNewPasswordScreen
          email={resetEmail}
          code={resetCode}
          onPasswordUpdated={() => {
            // Reset state and navigate to sign in
            setResetEmail('');
            setResetCode('');
            navigate('signin');
          }}
          onBack={() => navigate('verifyResetCode')}
        />
      );
    case 'mood':
      return <MoodSelectionScreen onNavigate={navigate} />;
    case 'profileCompletion':
      return (
        <ProfileCompletionScreen
          onComplete={() => navigate('notes')}
          user={user}
          onNavigate={navigate}
        />
      );
    case 'notes':
      return <WhisprNotesScreen onNavigate={navigate} user={user} />;
    case 'buddies':
      if (isAuthenticated) return <BuddiesScreen onNavigate={navigate} user={user} refreshTrigger={currentParams?.refreshTrigger} />;
      // Redirect to sign-in instead of welcome to avoid confusion
      navigate('signin');
      return null;
    case 'buddyRequests':
      if (isAuthenticated) return <BuddyRequestsScreen onNavigate={navigate} user={user} />;
      // Redirect to sign-in instead of welcome to avoid confusion
      navigate('signin');
      return null;
    case 'chat':
      if (isAuthenticated) return (
        <UnifiedChatScreen
          onNavigate={navigate}
          user={user}
          buddy={currentParams?.buddy}
          onBack={goBack}
          fromNotification={currentParams?.fromNotification}
          buddyId={currentParams?.buddyId}
          buddyName={currentParams?.buddyName}
          buddyPromise={currentParams?.buddyPromise}
        />
      );
      // Redirect to sign-in instead of welcome
      navigate('signin');
      return null;
    case 'profile':
      if (isAuthenticated) return <ProfileScreen onNavigate={navigate} user={user} />;
      navigate('signin');
      return null;
    case 'settingsHub':
      if (isAuthenticated) return <SettingsHubScreen onNavigate={navigate} user={user} />;
      navigate('signin');
      return null;
    case 'settings':
      if (isAuthenticated) return <SettingsScreen onNavigate={navigate} user={user} />;
      navigate('signin');
      return null;
    case 'sentNotes':
      if (isAuthenticated) return <SentNotesScreen onNavigate={navigate} user={user} onGoBack={goBack} />;
      navigate('signin');
      return null;
    case 'notifications':
      if (isAuthenticated) return <NotificationsScreen onNavigate={navigate} user={user} onGoBack={goBack} />;
      navigate('signin');
      return null;
    case 'sendNote':
      if (isAuthenticated) return <SendNoteScreen onNavigate={navigate} user={user} onGoBack={goBack} />;
      navigate('signin');
      return null;
    case 'nearby':
      if (isAuthenticated) return <NearbyScreen userId={user?.id || ''} onNavigate={navigate} />;
      navigate('signin');
      return null;
    case 'liveWhisprs':
      if (isAuthenticated) return <LiveWhisprsScreen onNavigate={navigate} />;
      navigate('signin');
      return null;
    case 'websocketTest':
      if (isAuthenticated) return <WebSocketTestScreen />;
      navigate('signin');
      return null;
    case 'achievements':
      if (isAuthenticated) return <AchievementsScreen onNavigate={navigate} user={user} />;
      navigate('signin');
      return null;
    case 'activity':
      if (isAuthenticated) return <ActivityScreen />;
      navigate('signin');
      return null;
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