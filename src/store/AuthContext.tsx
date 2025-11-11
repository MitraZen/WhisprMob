import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus, Alert, Platform } from 'react-native';
import { AuthState, User } from '@/types';
import { StorageService, generateAnonymousId } from '@/utils/helpers';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';
import { BuddiesService } from '@/services/buddiesService';
import BiometricService from '@/services/biometricService';
import { supabase } from '@/config/supabase';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PermissionService from '@/services/permissionService';

interface AuthContextType extends AuthState {
  login: (mood: string) => Promise<void>;
  logout: () => Promise<void>;
  updateMood: (mood: string) => Promise<void>;
  testDatabaseConnection: () => Promise<boolean>;
  setAuthenticatedUser: (user: User) => Promise<void>;
  isProfileComplete?: boolean;
  markProfileComplete: (complete: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_MOOD'; payload: string };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    case 'UPDATE_MOOD':
      return {
        ...state,
        user: state.user ? { ...state.user, mood: action.payload as any } : null,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [isProfileComplete, setIsProfileComplete] = React.useState<boolean | undefined>(undefined);
  const [hasRequestedPermissions, setHasRequestedPermissions] = React.useState(false);

  /**
   * Request notification permissions on app launch
   * Shows immediately for first-time users
   */
  const requestNotificationPermissionOnLaunch = async () => {
    try {
      // Check if we've ever asked for notification permission
      const hasAskedBefore = await AsyncStorage.getItem('notificationPermissionAsked');
      
      if (hasAskedBefore) {
        console.log('🔔 Notification permission already asked before - skipping prompt');
        
        // Still check if permission is granted and save FCM token if user is authenticated
        const authStatus = await messaging().hasPermission();
        const isAuthorized = 
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
          
        if (isAuthorized && state.user?.id) {
          await saveFCMToken(state.user.id);
        }
        return;
      }

      // First time - check current permission status
      const authStatus = await messaging().hasPermission();
      const isAuthorized = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (isAuthorized) {
        console.log('🔔 Notification permission already granted');
        await AsyncStorage.setItem('notificationPermissionAsked', 'true');
        
        if (state.user?.id) {
          await saveFCMToken(state.user.id);
        }
        return;
      }

      // Request permission using native dialog
      console.log('🔔 Requesting notification permission on app launch...');
      const granted = await PermissionService.requestNotificationPermissions();

      // Mark that we've asked
      await AsyncStorage.setItem('notificationPermissionAsked', 'true');

      if (granted) {
        console.log('✅ Notification permission granted on launch');
        
        // Save FCM token if user is authenticated
        if (state.user?.id) {
          await saveFCMToken(state.user.id);
        }

        // Show battery optimization prompt after a delay (only if permission granted)
        setTimeout(() => {
          showBatteryOptimizationPrompt();
        }, 2000); // 2 second delay
      } else {
        console.log('🚫 Notification permission denied on launch');
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission on launch:', error);
    }
  };

  /**
   * Save FCM token for authenticated user
   */
  const saveFCMToken = async (userId: string) => {
    try {
      const token = await messaging().getToken();
      console.log('🔑 FCM Token:', token);
      
      const { fcmManager } = await import('@/services/FCMManager');
      await fcmManager.initialize(userId);
      console.log('✅ FCM token saved via FCMManager');
    } catch (error) {
      console.warn('⚠️ Failed to save FCM token:', error);
    }
  };

  /**
   * Show battery optimization prompt for better notification delivery
   */
  const showBatteryOptimizationPrompt = async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Check if we've already shown battery optimization prompt
      const hasShownBatteryPrompt = await AsyncStorage.getItem('batteryOptimizationPromptShown');
      
      if (hasShownBatteryPrompt) {
        console.log('🔋 Battery optimization prompt already shown before - skipping');
        return;
      }

      // Check if battery optimization is already disabled
      const isIgnored = await PermissionService.isBatteryOptimizationIgnored?.() ?? false;
      
      if (isIgnored) {
        console.log('🔋 Battery optimization already disabled - skipping prompt');
        await AsyncStorage.setItem('batteryOptimizationPromptShown', 'true');
        return;
      }

      // Show the prompt
      Alert.alert(
        'Optimize Battery Settings',
        'For the best Whispr experience, please disable battery optimization. This ensures you receive notifications promptly and messages are delivered reliably.\n\nWould you like to adjust your battery settings?',
        [
          {
            text: 'Maybe Later',
            style: 'cancel',
            onPress: async () => {
              console.log('User skipped battery optimization');
              // Don't mark as shown so we can ask again later
            }
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                console.log('Opening battery optimization settings...');
                await PermissionService.openBatteryOptimizationSettings?.();
                console.log('✅ Battery optimization settings opened');
                
                // Mark as shown
                await AsyncStorage.setItem('batteryOptimizationPromptShown', 'true');
              } catch (error) {
                console.error('❌ Error opening battery settings:', error);
              }
            }
          }
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('❌ Error showing battery optimization prompt:', error);
    }
  };

  /**
   * Initialize notification services and check permissions
   */
  const initializeNotificationServices = async (userId: string) => {
    try {
      console.log('🚀 AuthContext - Initializing services for user:', userId);
      
      const { notificationManager } = await import('@/services/notificationManager');
      const { CachedBuddiesService } = await import('@/services/cachedBuddiesService');
      
      // Step 1: Warm up cache (instant load + background sync)
      console.log('🔥 Warming up cache and preloading data...');
      await CachedBuddiesService.warmUpCache(userId);
      
      // Step 2: Initialize realtime service
      console.log('📡 Initializing realtime service...');
      const { realtimeService } = await import('@/services/realtimeService');
      await realtimeService.initialize(userId);
      
      // Step 3: Start hybrid notification service (realtime + polling fallback)
      console.log('🔔 Starting notification service...');
      await notificationManager.startNotificationService(userId);
      
      // Step 4: Initialize FCM (non-blocking)
      (async () => {
        try {
          const { fcmManager } = await import('@/services/FCMManager');
          
          const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) => 
            setTimeout(() => resolve({ success: false, error: 'FCM initialization timeout' }), 10000)
          );
          
          const result = await Promise.race([
            fcmManager.initialize(userId),
            timeoutPromise
          ]);
          
          if (result.success) {
            console.log('✅ FCM initialized successfully via FCMManager');
          } else {
            console.warn('⚠️ FCM initialization failed or timed out:', result.error);
          }
        } catch (error) {
          console.error('❌ FCM initialization error:', error);
        }
      })();
      
      console.log('✅ All services initialized');
    } catch (error) {
      console.error('❌ Error initializing services:', error);
    }
  };

  /**
   * Stop notification services
   */
  const stopNotificationServices = async () => {
    try {
      console.log('🛑 Stopping all services');
      
      const { notificationManager } = await import('@/services/notificationManager');
      const { realtimeService } = await import('@/services/realtimeService');
      
      await notificationManager.stopNotificationService();
      await realtimeService.disconnect();
      
      try {
        const { fcmManager } = await import('@/services/FCMManager');
        await fcmManager.cleanup();
        console.log('✅ FCMManager cleaned up');
      } catch (error) {
        console.warn('⚠️ Error cleaning up FCMManager:', error);
      }
      
      console.log('✅ All services stopped');
    } catch (error) {
      console.error('❌ Error stopping services:', error);
    }
  };

  // ============================================================
  // INITIALIZATION ON APP START
  // ============================================================
  
  useEffect(() => {
    const initializeApp = async () => {
      // Clear session flag on app start
      try {
        await AsyncStorage.removeItem('notifPromptedThisSession');
        console.log('🔔 Cleared notifPromptedThisSession flag on app start');
      } catch (error) {
        console.error('Error clearing notifPromptedThisSession:', error);
      }
      
      // Check auth status first
      await checkAuthStatus();
      
      // Request notification permission on launch (only for first-time users)
      if (!hasRequestedPermissions) {
        setHasRequestedPermissions(true);
        
        // Small delay to ensure app is fully loaded
        setTimeout(() => {
          requestNotificationPermissionOnLaunch();
        }, 1000);
      }
    };
    
    initializeApp();
    
    // Set up Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Supabase auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 User signed in via Supabase - initializing FCM (non-blocking)');
        
        (async () => {
          try {
            const { fcmManager } = await import('@/services/FCMManager');
            
            const timeoutPromise = new Promise<{ success: boolean; error?: string }>((resolve) => 
              setTimeout(() => resolve({ success: false, error: 'FCM initialization timeout' }), 10000)
            );
            
            const result = await Promise.race([
              fcmManager.initialize(session.user.id),
              timeoutPromise
            ]);
            
            if (result.success) {
              console.log('✅ FCM initialized successfully (background)');
            } else {
              console.warn('⚠️ FCM initialization failed or timed out (non-blocking):', result.error);
            }
          } catch (error) {
            console.error('❌ Error initializing FCM on sign in (non-blocking):', error);
          }
        })();
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 User signed out via Supabase - cleaning up FCM');
        try {
          const { fcmManager } = await import('@/services/FCMManager');
          await fcmManager.cleanup();
        } catch (error) {
          console.error('❌ Error cleaning up FCM on sign out:', error);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔐 Token refreshed - validating FCM token');
        
        (async () => {
          try {
            const { fcmManager } = await import('@/services/FCMManager');
            await fcmManager.ensureValidTokenForUser(session.user.id);
          } catch (error) {
            console.error('❌ Error validating FCM token on token refresh:', error);
          }
        })();
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // ============================================================
  // APP STATE LISTENER
  // ============================================================
  
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 AppState changed to:', nextAppState);
      
      if (nextAppState === 'active' && state.isAuthenticated && state.user) {
        console.log('☀️ App became active - validating FCM token and optimizing services');
        
        // Update online status when app becomes active
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, true);
        await BuddiesService.syncUserOnlineStatus(state.user.id, true);
        
        // Validate FCM token when app becomes active (non-blocking)
        (async () => {
          try {
            if (!state.user) return;
            const { fcmManager } = await import('@/services/FCMManager');
            console.log('🔄 Validating FCM token for user:', state.user.id);
            await fcmManager.ensureValidTokenForUser(state.user.id);
          } catch (error) {
            console.error('❌ Error validating FCM token on app active:', error);
          }
        })();
        
        // Initialize or optimize notification services
        try {
          const { notificationManager } = await import('@/services/notificationManager');
          const status = notificationManager.getServiceStatus();
          
          if (status.realtime || status.polling) {
            await notificationManager.optimizeForForeground();
          } else {
            await initializeNotificationServices(state.user.id);
          }
        } catch (error) {
          console.error('❌ Error optimizing notification services:', error);
        }
        
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('🌙 App went to background - optimizing for background mode');
        
        // Update online status when app goes to background
        if (state.isAuthenticated && state.user) {
          await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, false);
          await BuddiesService.syncUserOnlineStatus(state.user.id, false);
        }
        
        // Optimize notification services for background
        try {
          const { notificationManager } = await import('@/services/notificationManager');
          const status = notificationManager.getServiceStatus();
          
          if (status.realtime || status.polling) {
            await notificationManager.optimizeForBackground();
          }
        } catch (error) {
          console.error('❌ Error optimizing for background:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [state.isAuthenticated, state.user]);

  // ============================================================
  // AUTH FUNCTIONS
  // ============================================================

  const checkAuthStatus = async () => {
    try {
      console.log('AuthContext - Checking auth status...');
      
      // Check and restore Supabase session
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('⚠️ AuthContext - Error getting Supabase session:', sessionError.message);
        } else if (session?.user) {
          console.log('✅ AuthContext - Supabase session restored:', session.user.id);
        } else {
          console.log('ℹ️ AuthContext - No active Supabase session found');
        }
      } catch (sessionCheckError) {
        console.warn('⚠️ AuthContext - Failed to check Supabase session:', sessionCheckError);
      }
      
      const storedUser = await StorageService.getItem<User>('user');
      console.log('AuthContext - Stored user found:', !!storedUser);
      
      if (storedUser) {
        // Check biometric authentication
        const biometricEnabled = await BiometricService.isBiometricEnabled();
        const biometricAvailable = await BiometricService.isBiometricAvailable();
        
        if (biometricEnabled && biometricAvailable) {
          const shouldAuthenticate = await BiometricService.promptBiometricAuth();
          if (!shouldAuthenticate) {
            console.log('AuthContext - Biometric authentication cancelled');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          try {
            const biometricResult = await BiometricService.authenticateWithBiometric();
            if (!biometricResult.success) {
              console.log('AuthContext - Biometric authentication failed');
              await StorageService.removeItem('user');
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
            console.log('AuthContext - Biometric authentication successful');
          } catch (error) {
            console.error('AuthContext - Biometric authentication error:', error);
            await StorageService.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        }
        
        // Wait for Supabase session to be restored
        let sessionReady = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && session.user.id === storedUser.id) {
            sessionReady = true;
            console.log('✅ AuthContext - Supabase session ready for user:', storedUser.id);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!sessionReady) {
          console.warn('⚠️ AuthContext - Supabase session not restored after wait');
        }
        
        // Verify user still exists in database
        const dbUser = await FlexibleDatabaseService.getUserById(storedUser.id);
        if (dbUser) {
          // Update online status
          await FlexibleDatabaseService.updateUserOnlineStatus(storedUser.id, true);
          await BuddiesService.syncUserOnlineStatus(storedUser.id, true);
          
          dispatch({ type: 'LOGIN_SUCCESS', payload: dbUser });
          
          // Check profile completeness
          const complete = await FlexibleDatabaseService.isProfileComplete(dbUser.id);
          setIsProfileComplete(complete);
          
          // Initialize notification services
          await initializeNotificationServices(dbUser.id);
          
          // Ensure FCM is initialized (non-blocking)
          (async () => {
            try {
              const { fcmManager } = await import('@/services/FCMManager');
              if (!fcmManager.isInitialized() || fcmManager.getCurrentUserId() !== dbUser.id) {
                console.log('🔥 Initializing FCM for authenticated user (non-blocking)');
                fcmManager.initialize(dbUser.id).catch((error) => {
                  console.warn('⚠️ Non-blocking FCM init failed:', error);
                });
              }
            } catch (error) {
              console.warn('⚠️ Error checking FCM status:', error);
            }
          })();
        } else {
          // User no longer exists
          await StorageService.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('AuthContext - No stored user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (mood: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const anonymousId = generateAnonymousId();
      
      const newUser = await FlexibleDatabaseService.createUser({
        anonymousId,
        mood: mood as any,
      });

      if (!newUser) {
        throw new Error('Failed to create user in database');
      }

      await StorageService.setItem('user', newUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
      
      // Initialize notification services after successful login
      await initializeNotificationServices(newUser.id);
      
      console.log('User logged in successfully with ID:', newUser.id);
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const setAuthenticatedUser = async (user: User) => {
    try {
      await StorageService.setItem('user', user);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      
      const complete = await FlexibleDatabaseService.isProfileComplete(user.id);
      setIsProfileComplete(complete);
      
      // Initialize notification services
      await initializeNotificationServices(user.id);
    } catch (error) {
      console.error('setAuthenticatedUser error:', error);
    }
  };

  const logout = async () => {
    try {
      // Stop notification services before logout
      await stopNotificationServices();
      
      if (state.user) {
        try {
          const { fcmManager } = await import('@/services/FCMManager');
          await fcmManager.cleanup();
        } catch (error) {
          console.warn('⚠️ Error cleaning up FCM on logout:', error);
        }
        
        // Update online status
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, false);
        await BuddiesService.syncUserOnlineStatus(state.user.id, false);
      }
      
      await StorageService.removeItem('user');
      dispatch({ type: 'LOGOUT' });
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateMood = async (mood: string) => {
    try {
      if (state.user) {
        const success = await FlexibleDatabaseService.updateUserMood(state.user.id, mood as any);
        
        if (success) {
          const updatedUser = { ...state.user, mood: mood as any };
          await StorageService.setItem('user', updatedUser);
          dispatch({ type: 'UPDATE_MOOD', payload: mood });
        }
      }
    } catch (error) {
      console.error('Update mood error:', error);
    }
  };

  const testDatabaseConnection = async (): Promise<boolean> => {
    try {
      return await FlexibleDatabaseService.testConnection();
    } catch (error) {
      console.error('Database connection test error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateMood,
    testDatabaseConnection,
    setAuthenticatedUser,
    isProfileComplete,
    markProfileComplete: (complete: boolean) => setIsProfileComplete(complete),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };