import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus, Alert, Platform } from 'react-native';
import { AuthState, User } from '@/types';
import { StorageService, generateAnonymousId } from '@/utils/helpers';
import { FlexibleDatabaseService } from '@/services/flexibleDatabase';
import { BuddiesService } from '@/services/buddiesService';
import { notificationService } from '@/services/notificationService';
import BiometricService from '@/services/biometricService';

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
          'Whispr needs notification permission to alert you about new messages and notes. Would you like to enable notifications?',
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
                  await notificationService.testNotification();
                  console.log('Notification permission request completed');
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // AppState listener for hybrid notification services - Phase 2
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 AppState changed to:', nextAppState);
      
      if (nextAppState === 'active' && state.isAuthenticated && state.user) {
        console.log('☀️ App became active - optimizing hybrid notification services');
        
        // Update online status when app becomes active
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, true);
        await BuddiesService.syncUserOnlineStatus(state.user.id, true);
        
        // Initialize or optimize notification services
        try {
          const { notificationManager } = await import('@/services/notificationManager');
          const status = notificationManager.getServiceStatus();
          
          if (status.realtime || status.polling) {
            // Service already running, optimize for foreground
            await notificationManager.optimizeForForeground();
          } else {
            // Service not running, initialize
            await initializeNotificationServicesSafely(state.user.id);
          }
        } catch (error) {
          console.error('❌ Error optimizing notification services for foreground:', error);
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
            // Service running, optimize for background
            await notificationManager.optimizeForBackground();
          }
        } catch (error) {
          console.error('❌ Error optimizing notification services for background:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [state.isAuthenticated, state.user]);

  // Safe notification service initialization - Phase 2 Hybrid System
  const initializeNotificationServicesSafely = async (userId: string) => {
    try {
      console.log('🚀 AuthContext - Initializing hybrid notification services for user:', userId);
      
      // Import services dynamically to avoid circular dependencies
      const { notificationManager } = await import('@/services/notificationManager');
      
      // Start hybrid notification service (realtime + polling fallback)
      await notificationManager.startNotificationService(userId);
      
      console.log('✅ AuthContext - Hybrid notification services initialized successfully');
    } catch (error) {
      console.error('❌ AuthContext - Error initializing hybrid notification services:', error);
      // Don't throw - let the app continue without notifications
    }
  };

  // Safe notification service cleanup - Phase 2 Hybrid System
  const stopNotificationServicesSafely = async () => {
    try {
      console.log('🛑 AuthContext - Stopping hybrid notification services');
      
      // Import services dynamically
      const { notificationManager } = await import('@/services/notificationManager');
      
      // Stop hybrid notification service
      await notificationManager.stopNotificationService();
      
      console.log('✅ AuthContext - Hybrid notification services stopped successfully');
    } catch (error) {
      console.error('❌ AuthContext - Error stopping hybrid notification services:', error);
    }
  };

  const checkAuthStatus = async () => {
    try {
      console.log('AuthContext - Checking auth status...');
      
      // First check local storage
      const storedUser = await StorageService.getItem<User>('user');
      console.log('AuthContext - Stored user found:', !!storedUser);
      
      if (storedUser) {
        // Check if biometric authentication is enabled and available
        const biometricEnabled = await BiometricService.isBiometricEnabled();
        const biometricAvailable = await BiometricService.isBiometricAvailable();
        
        if (biometricEnabled && biometricAvailable) {
          // Prompt for biometric authentication
          const shouldAuthenticate = await BiometricService.promptBiometricAuth();
          if (!shouldAuthenticate) {
            console.log('AuthContext - Biometric authentication cancelled by user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          
          try {
            const biometricResult = await BiometricService.authenticateWithBiometric();
            if (!biometricResult.success) {
              console.log('AuthContext - Biometric authentication failed:', biometricResult.error);
              // Clear stored user and require manual login
              await StorageService.removeItem('user');
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
            console.log('AuthContext - Biometric authentication successful');
          } catch (error) {
            console.error('AuthContext - Biometric authentication error:', error);
            // Clear stored user and require manual login
            await StorageService.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        }
        
        // Verify user still exists in database
        const dbUser = await FlexibleDatabaseService.getUserById(storedUser.id);
        if (dbUser) {
          // Update user's online status
          await FlexibleDatabaseService.updateUserOnlineStatus(storedUser.id, true);
          // Sync online status to buddies table
          await BuddiesService.syncUserOnlineStatus(storedUser.id, true);
          dispatch({ type: 'LOGIN_SUCCESS', payload: dbUser });
          // Check profile completeness
          const complete = await FlexibleDatabaseService.isProfileComplete(dbUser.id);
          setIsProfileComplete(complete);
          
          // Initialize notification services for existing user
          await initializeNotificationServicesSafely(dbUser.id);
          
          // Check notification permissions and prompt if needed
          await checkNotificationPermissions();
        } else {
          // User no longer exists in database, clear local storage
          await StorageService.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('AuthContext - No stored user, setting loading to false');
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
      
             // Create user in Supabase database
             const newUser = await FlexibleDatabaseService.createUser({
               anonymousId,
               mood: mood as any,
             });

      if (!newUser) {
        throw new Error('Failed to create user in database');
      }

      // Store user locally
      await StorageService.setItem('user', newUser);
      dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
      
      // Initialize notification services after successful login
      await initializeNotificationServicesSafely(newUser.id);
      
      // Check notification permissions and prompt if needed
      await checkNotificationPermissions();
      
      console.log('User logged in successfully with ID:', newUser.id);
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  // Allow email/password auth flow to set the authenticated user
  const setAuthenticatedUser = async (user: User) => {
    try {
      await StorageService.setItem('user', user);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      const complete = await FlexibleDatabaseService.isProfileComplete(user.id);
      setIsProfileComplete(complete);
      
      // Initialize notification services after setting authenticated user
      await initializeNotificationServicesSafely(user.id);
      
      // Check notification permissions and prompt if needed
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
        // Update user's online status to false
        await FlexibleDatabaseService.updateUserOnlineStatus(state.user.id, false);
        // Sync online status to buddies table
        await BuddiesService.syncUserOnlineStatus(state.user.id, false);
      }
      
      // Clear local storage
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
               // Update mood in database
               const success = await FlexibleDatabaseService.updateUserMood(state.user.id, mood as any);
               
               if (success) {
                 // Update local user data
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

// Export AuthContext for testing purposes
export { AuthContext };


