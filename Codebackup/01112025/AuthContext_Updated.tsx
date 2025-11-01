import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus, Alert, Platform, NativeModules } from 'react-native';
import { AuthState, User } from '@/types';
import { StorageService, generateAnonymousId } from '@/utils/helpers';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';
import { BuddiesService } from '@/services/buddiesService';
import { notificationService } from '@/services/notificationService';
import BiometricService from '@/services/biometricService';
import { supabase } from '@/config/supabase';

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

  // Check and prompt for notification permissions
  const checkNotificationPermissions = async () => {
    try {
      const hasPermission = await notificationService.checkNotificationPermission();
      
      if (!hasPermission) {
        console.log('🔔 Notification permissions not granted - showing prompt');
        
        Alert.alert(
          'Enable Notifications',
          'Whispr needs notification permission to alert you about new messages and notes. You\'ll miss important updates without it.\n\nEnable notifications now?',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                console.log('User declined notification permissions');
              }
            },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  console.log('User accepted notification permissions - requesting...');
                  await notificationService.requestNotificationPermission();
                  console.log('Notification permission request completed');
                  
                  // Show battery optimization prompt after notification permission
                  setTimeout(() => {
                    showBatteryOptimizationPrompt();
                  }, 1000);
                } catch (error) {
                  console.error('Error requesting notification permissions:', error);
                }
              }
            }
          ],
          { cancelable: true }
        );
      } else {
        console.log('🔔 Notification permissions already granted');
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  // Show battery optimization prompt for better experience
  const showBatteryOptimizationPrompt = () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Optimize Battery Settings',
        'For the best Whispr experience, please disable battery optimization. This ensures you receive notifications promptly and messages are delivered reliably.\n\nWould you like to adjust your battery settings?',
        [
          {
            text: 'Maybe Later',
            style: 'cancel',
            onPress: () => {
              console.log('User skipped battery optimization');
            }
          },
          {
            text: 'Open Settings',
            onPress: () => {
              try {
                console.log('Opening battery optimization settings...');
                if (NativeModules.PermissionModule) {
                  NativeModules.PermissionModule.openBatteryOptimizationSettings();
                } else {
                  console.warn('PermissionModule not available');
                }
              } catch (error) {
                console.error('Error opening battery settings:', error);
              }
            }
          }
        ],
        { cancelable: true }
      );
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Set up Supabase auth state change listener for FCM token management
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Supabase auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 User signed in via Supabase - initializing FCM');
        try {
          // ✅ Use FCMManager for all FCM operations
          const { fcmManager } = await import('@/services/FCMManager');
          await fcmManager.initialize(session.user.id);
        } catch (error) {
          console.error('❌ Error initializing FCM on sign in:', error);
        }
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
        // Run asynchronously to prevent blocking
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

  // ✅ NEW: App state listener with FCM token validation
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 AppState changed to:', nextAppState);
      
      if (nextAppState === 'active' && state.isAuthenticated && state.user) {
        console.log('☀️ App became active - validating FCM token and optimizing services');
        
        // Update online status when app becomes active
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, true);
        await BuddiesService.syncUserOnlineStatus(state.user.id, true);
        
        // ✅ Validate FCM token when app becomes active (non-blocking)
        (async () => {
          try {
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
            await initializeNotificationServicesSafely(state.user.id);
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

  // ✅ FIXED: Removed duplicate FCM initialization
  const initializeNotificationServicesSafely = async (userId: string) => {
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
      
      // Step 4: ✅ Initialize FCM using FCMManager ONLY (removed duplicate)
      // Run asynchronously without blocking
      (async () => {
        try {
          const { fcmManager } = await import('@/services/FCMManager');
          
          // Add timeout to prevent hanging (5 seconds max)
          const timeoutPromise = new Promise<{ success: boolean; token?: string; error?: string }>((resolve) => 
            setTimeout(() => resolve({ success: false, error: 'FCM initialization timeout' }), 5000)
          );
          
          const result = await Promise.race([
            fcmManager.initialize(userId),
            timeoutPromise
          ]);
          
          if (result.success) {
            console.log('✅ FCM initialized successfully via FCMManager');
          } else {
            console.warn('⚠️ FCM initialization failed or timed out:', result.error);
            // Don't throw - local notifications still work
          }
        } catch (error) {
          console.error('❌ FCM initialization error:', error);
          // Don't throw - local notifications still work
        }
      })();
      
      console.log('✅ All services initialized (cache + realtime + notifications + FCM queued)');
    } catch (error) {
      console.error('❌ Error initializing services:', error);
      // Don't throw - let the app continue
    }
  };

  // ✅ FIXED: Use FCMManager for cleanup
  const stopNotificationServicesSafely = async () => {
    try {
      console.log('🛑 Stopping all services');
      
      const { notificationManager } = await import('@/services/notificationManager');
      const { realtimeService } = await import('@/services/realtimeService');
      
      // Stop hybrid notification service
      await notificationManager.stopNotificationService();
      
      // Disconnect realtime service
      await realtimeService.disconnect();
      
      // ✅ Cleanup FCMManager
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

  const checkAuthStatus = async () => {
    try {
      console.log('AuthContext - Checking auth status...');
      
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
          await initializeNotificationServicesSafely(dbUser.id);
          
          // Check notification permissions
          await checkNotificationPermissions();
          
          // ✅ Ensure FCM is initialized for already authenticated user (non-blocking)
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
      await initializeNotificationServicesSafely(newUser.id);
      
      // Check notification permissions
      await checkNotificationPermissions();
      
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
      await initializeNotificationServicesSafely(user.id);
      
      // Check notification permissions
      await checkNotificationPermissions();
    } catch (error) {
      console.error('setAuthenticatedUser error:', error);
    }
  };

  const logout = async () => {
    try {
      // Stop notification services before logout
      await stopNotificationServicesSafely();
      
      if (state.user) {
        // ✅ Use FCMManager to clear token
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