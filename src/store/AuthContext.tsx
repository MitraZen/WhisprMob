import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from 'react';
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
import analyticsService from '@/services/analyticsService';

const NOTIFICATION_PERMISSION_ASKED_KEY = 'notificationPermissionAsked';
const NOTIFICATION_PERMANENTLY_DENIED_KEY = 'notificationPermanentlyDenied';
const BATTERY_REMINDER_LAST_SHOWN_KEY = 'batteryOptimizationReminderLastShown';
const BATTERY_PROMPT_SESSION_KEY = 'batteryPromptedThisSession';
const LEGACY_BATTERY_PROMPT_KEY = 'batteryOptimizationPromptShown';
const DISABLE_PERMISSION_REMINDERS_KEY = 'disablePermissionReminders'; // Used for battery optimization reminders
const BATTERY_REMINDER_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

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
        user: state.user
          ? { ...state.user, mood: action.payload as any }
          : null,
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
  const [isProfileComplete, setIsProfileComplete] = React.useState<
    boolean | undefined
  >(undefined);
  const [hasRequestedPermissions, setHasRequestedPermissions] =
    React.useState(false);

  const isNotificationAuthorized = async (): Promise<boolean> => {
    try {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.warn(
        '⚠️ Failed to read Firebase messaging permission status:',
        error,
      );
      try {
        return await PermissionService.checkNotificationPermissions();
      } catch (nativeError) {
        console.warn(
          '⚠️ Native notification permission check failed:',
          nativeError,
        );
        return false;
      }
    }
  };

  /**
   * Calculate days since last shown for battery reminder
   */
  const getDaysSinceLastBatteryReminder = async (): Promise<number | null> => {
    try {
      const lastShownValue = await AsyncStorage.getItem(
        BATTERY_REMINDER_LAST_SHOWN_KEY,
      );
      if (!lastShownValue) {
        return null;
      }
      const lastShown = Number(lastShownValue);
      if (Number.isNaN(lastShown)) {
        return null;
      }
      const daysSince = Math.floor(
        (Date.now() - lastShown) / (24 * 60 * 60 * 1000),
      );
      return daysSince;
    } catch (error) {
      console.error(
        'Error calculating days since last battery reminder:',
        error,
      );
      return null;
    }
  };

  /**
   * Request notification permissions on app launch
   * Shows immediately for first-time users
   * Uses user-specific key to ensure each new user gets the popup
   * @param userId Optional user ID - if not provided, uses state.user?.id
   */
  const requestNotificationPermissionOnLaunch = async (userId?: string) => {
    try {
      console.log('🔔 requestNotificationPermissionOnLaunch: Starting...');

      // Use provided userId or fall back to state.user?.id
      const currentUserId = userId || state.user?.id;

      // Only show notification popup if user is authenticated
      if (!currentUserId) {
        console.log(
          '🔔 requestNotificationPermissionOnLaunch: No authenticated user, skipping notification request',
        );
        return;
      }

      // Use user-specific key to ensure each new user gets the popup
      const userSpecificKey = `${NOTIFICATION_PERMISSION_ASKED_KEY}_${currentUserId}`;
      const hasAskedBefore = await AsyncStorage.getItem(userSpecificKey);
      console.log(
        '🔔 requestNotificationPermissionOnLaunch: hasAskedBefore for user',
        currentUserId,
        '=',
        hasAskedBefore,
      );

      if (hasAskedBefore) {
        // User was already asked - just check if permission is granted and save token if needed
        console.log(
          '🔔 requestNotificationPermissionOnLaunch: User was asked before, checking current permission status...',
        );
        const isAuthorized = await isNotificationAuthorized();
        if (isAuthorized && currentUserId) {
          console.log('✅ Notifications already enabled - saving FCM token');
          await saveFCMToken(currentUserId);
          showBatteryOptimizationPrompt({ delayMs: 1500 }).catch(error =>
            console.error(
              '❌ Error scheduling battery optimization reminder:',
              error,
            ),
          );
        } else {
          console.log(
            '🔕 Notifications not enabled - user can enable manually in Settings',
          );
        }
        return;
      }

      // First time for this user - check current permission status
      console.log(
        '🔔 requestNotificationPermissionOnLaunch: First-time user, checking if already authorized...',
      );
      const isAuthorized = await isNotificationAuthorized();
      console.log(
        '🔔 requestNotificationPermissionOnLaunch: isAuthorized =',
        isAuthorized,
      );

      if (isAuthorized) {
        console.log('🔔 Notification permission already granted');
        await AsyncStorage.setItem(userSpecificKey, 'true');

        if (currentUserId) {
          await saveFCMToken(currentUserId);
        }

        showBatteryOptimizationPrompt({ delayMs: 1500 }).catch(error =>
          console.error(
            '❌ Error scheduling battery optimization reminder:',
            error,
          ),
        );
        return;
      }

      // Request permission using native dialog
      console.log(
        '🔔 Requesting notification permission on app launch for new user...',
      );
      const result =
        await PermissionService.requestNotificationPermissionsDetailed();
      console.log(
        '🔔 requestNotificationPermissionOnLaunch: Permission request result =',
        result,
      );

      // Mark that we've asked for this specific user (always set regardless of result)
      await AsyncStorage.setItem(userSpecificKey, 'true');

      // Track permanent denial separately
      if (result.permanentlyDenied) {
        const permanentlyDeniedKey = `${NOTIFICATION_PERMANENTLY_DENIED_KEY}_${currentUserId}`;
        await AsyncStorage.setItem(permanentlyDeniedKey, 'true');
        console.log('🔕 Notification permission permanently denied on launch');
      }

      // Track analytics
      if (result.granted) {
        console.log('✅ Notification permission granted on launch');
        analyticsService.track('notification_permission_granted', {
          source: 'launch_prompt',
        });

        // Save FCM token if user is authenticated
        if (currentUserId) {
          await saveFCMToken(currentUserId);
        }

        // Show battery optimization prompt after a delay (only if permission granted)
        showBatteryOptimizationPrompt({ delayMs: 2000 }).catch(error =>
          console.error(
            '❌ Error scheduling battery optimization reminder:',
            error,
          ),
        );
      } else {
        console.log('🚫 Notification permission denied on launch');
        analyticsService.track('notification_permission_denied', {
          source: 'launch_prompt',
          permanently_denied: result.permanentlyDenied,
        });
      }
    } catch (error) {
      console.error(
        '❌ Error requesting notification permission on launch:',
        error,
      );
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
  const showBatteryOptimizationPrompt = async (
    options: { delayMs?: number } = {},
  ) => {
    const { delayMs = 0 } = options;

    if (delayMs > 0) {
      setTimeout(() => {
        showBatteryOptimizationPrompt({ delayMs: 0 }).catch(error =>
          console.error(
            '❌ Delayed battery optimization prompt failed:',
            error,
          ),
        );
      }, delayMs);
      return;
    }

    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Check if user has disabled permission reminders
      const remindersDisabled = await AsyncStorage.getItem(
        DISABLE_PERMISSION_REMINDERS_KEY,
      );
      if (remindersDisabled === 'true') {
        console.log(
          '🔕 User has disabled permission reminders - skipping battery optimization prompt',
        );
        return;
      }

      // Migrate legacy flag (one-time prompt) to timestamp-based reminder
      const legacyFlag = await AsyncStorage.getItem(LEGACY_BATTERY_PROMPT_KEY);
      if (legacyFlag === 'true') {
        const existingTimestamp = await AsyncStorage.getItem(
          BATTERY_REMINDER_LAST_SHOWN_KEY,
        );
        if (!existingTimestamp) {
          await AsyncStorage.setItem(
            BATTERY_REMINDER_LAST_SHOWN_KEY,
            String(Date.now()),
          );
        }
        await AsyncStorage.removeItem(LEGACY_BATTERY_PROMPT_KEY);
      }

      const notificationsEnabled = await isNotificationAuthorized();
      if (!notificationsEnabled) {
        console.log(
          '🔋 Skipping battery optimization prompt because notifications are disabled',
        );
        return;
      }

      const sessionPrompted = await AsyncStorage.getItem(
        BATTERY_PROMPT_SESSION_KEY,
      );
      if (sessionPrompted === 'true') {
        console.log(
          '🔋 Battery optimization prompt already shown this session - skipping',
        );
        return;
      }

      const lastShownValue = await AsyncStorage.getItem(
        BATTERY_REMINDER_LAST_SHOWN_KEY,
      );
      if (lastShownValue) {
        const lastShown = Number(lastShownValue);
        if (
          !Number.isNaN(lastShown) &&
          Date.now() - lastShown < BATTERY_REMINDER_COOLDOWN_MS
        ) {
          console.log(
            '🔋 Battery optimization prompt within cooldown window - skipping',
          );
          return;
        }
      }

      const isIgnored =
        await PermissionService.isBatteryOptimizationIgnored?.();
      if (isIgnored) {
        console.log(
          '🔋 Battery optimization already disabled - skipping prompt',
        );
        return;
      }

      // Calculate days since last before updating timestamp
      const daysSinceLast = await getDaysSinceLastBatteryReminder();

      await AsyncStorage.setItem(BATTERY_PROMPT_SESSION_KEY, 'true');
      await AsyncStorage.setItem(
        BATTERY_REMINDER_LAST_SHOWN_KEY,
        String(Date.now()),
      );

      // Track prompt shown with days since last
      analyticsService.track('battery_optimization_prompt_shown', {
        days_since_last: daysSinceLast,
      });

      // Open native Android battery optimization dialog
      // This shows the native OS dialog (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
      // No custom fallback - we trust the native OS experience
      try {
        console.log('🔋 Opening native Android battery optimization dialog...');
        await PermissionService.openBatteryOptimizationSettings?.();
        console.log('✅ Native battery optimization dialog opened');
        analyticsService.track('battery_optimization_native_dialog_opened');
      } catch (error) {
        console.warn(
          '⚠️ Native battery optimization dialog not available:',
          error,
        );
        // Silently fail - user can enable manually in Settings if needed
        analyticsService.track('battery_optimization_dialog_failed');
      }
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

      const { notificationManager } = await import(
        '@/services/notificationManager'
      );
      const { CachedBuddiesService } = await import(
        '@/services/cachedBuddiesService'
      );

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

          const timeoutPromise = new Promise<{
            success: boolean;
            error?: string;
          }>(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: false,
                  error: 'FCM initialization timeout',
                }),
              10000,
            ),
          );

          const result = await Promise.race([
            fcmManager.initialize(userId),
            timeoutPromise,
          ]);

          if (result.success) {
            console.log('✅ FCM initialized successfully via FCMManager');
          } else {
            console.warn(
              '⚠️ FCM initialization failed or timed out:',
              result.error,
            );
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

      const { notificationManager } = await import(
        '@/services/notificationManager'
      );
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
    console.log('🚀 AuthContext: useEffect for initialization running...');
    const initializeApp = async () => {
      console.log('🚀 AuthContext: initializeApp() called');
      // Clear session flag on app start
      try {
        await AsyncStorage.removeItem(BATTERY_PROMPT_SESSION_KEY);
        console.log('🔔 Cleared battery prompt session flag on app start');
      } catch (error) {
        console.error('Error clearing battery prompt session flag:', error);
      }

      // Check auth status first
      console.log('🚀 AuthContext: Checking auth status...');
      const authenticatedUserId = await checkAuthStatus();
      console.log(
        '🚀 AuthContext: Auth status check completed, userId:',
        authenticatedUserId,
      );

      // Request notification permission on launch (only for first-time users)
      console.log(
        '🚀 AuthContext: hasRequestedPermissions =',
        hasRequestedPermissions,
      );
      if (!hasRequestedPermissions) {
        console.log(
          '🚀 AuthContext: Setting hasRequestedPermissions to true and scheduling notification check...',
        );
        setHasRequestedPermissions(true);

        // Small delay to ensure app is fully loaded
        // Pass userId directly to avoid React state timing issues
        setTimeout(() => {
          console.log(
            '🚀 AuthContext: Calling requestNotificationPermissionOnLaunch() with userId:',
            authenticatedUserId,
          );
          requestNotificationPermissionOnLaunch(
            authenticatedUserId || undefined,
          );
        }, 1000);
      } else {
        console.log(
          '🚀 AuthContext: hasRequestedPermissions is already true, skipping notification check',
        );
      }
    };

    initializeApp();

    // Set up Supabase auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Supabase auth state changed:', event, session?.user?.id);

      if (event === 'SIGNED_IN' && session?.user) {
        console.log(
          '🔐 User signed in via Supabase - initializing FCM (non-blocking)',
        );

        (async () => {
          try {
            const { fcmManager } = await import('@/services/FCMManager');

            const timeoutPromise = new Promise<{
              success: boolean;
              error?: string;
            }>(resolve =>
              setTimeout(
                () =>
                  resolve({
                    success: false,
                    error: 'FCM initialization timeout',
                  }),
                10000,
              ),
            );

            const result = await Promise.race([
              fcmManager.initialize(session.user.id),
              timeoutPromise,
            ]);

            if (result.success) {
              console.log('✅ FCM initialized successfully (background)');
            } else {
              console.warn(
                '⚠️ FCM initialization failed or timed out (non-blocking):',
                result.error,
              );
            }
          } catch (error) {
            console.error(
              '❌ Error initializing FCM on sign in (non-blocking):',
              error,
            );
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
            console.error(
              '❌ Error validating FCM token on token refresh:',
              error,
            );
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
        console.log(
          '☀️ App became active - validating FCM token and optimizing services',
        );

        // Update online status when app becomes active
        await FlexibleDatabaseService.updateUserOnlineStatus(
          state.user.id,
          true,
        );
        await BuddiesService.syncUserOnlineStatus(state.user.id, true);

        // Validate FCM token when app becomes active (non-blocking)
        (async () => {
          try {
            if (!state.user) return;
            const { fcmManager } = await import('@/services/FCMManager');
            console.log('🔄 Validating FCM token for user:', state.user.id);
            await fcmManager.ensureValidTokenForUser(state.user.id);
          } catch (error) {
            console.error(
              '❌ Error validating FCM token on app active:',
              error,
            );
          }
        })();

        // Initialize or optimize notification services
        try {
          const { notificationManager } = await import(
            '@/services/notificationManager'
          );
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
        console.log(
          '🌙 App went to background - optimizing for background mode',
        );

        // Update online status when app goes to background
        if (state.isAuthenticated && state.user) {
          await FlexibleDatabaseService.updateUserOnlineStatus(
            state.user.id,
            false,
          );
          await BuddiesService.syncUserOnlineStatus(state.user.id, false);
        }

        // Optimize notification services for background
        try {
          const { notificationManager } = await import(
            '@/services/notificationManager'
          );
          const status = notificationManager.getServiceStatus();

          if (status.realtime || status.polling) {
            await notificationManager.optimizeForBackground();
          }
        } catch (error) {
          console.error('❌ Error optimizing for background:', error);
        }
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, [state.isAuthenticated, state.user]);

  // ============================================================
  // AUTH FUNCTIONS
  // ============================================================

  const checkAuthStatus = async (): Promise<string | null> => {
    try {
      console.log('AuthContext - Checking auth status...');

      // Check and restore Supabase session
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn(
            '⚠️ AuthContext - Error getting Supabase session:',
            sessionError.message,
          );
        } else if (session?.user) {
          console.log(
            '✅ AuthContext - Supabase session restored:',
            session.user.id,
          );
        } else {
          console.log('ℹ️ AuthContext - No active Supabase session found');
        }
      } catch (sessionCheckError) {
        console.warn(
          '⚠️ AuthContext - Failed to check Supabase session:',
          sessionCheckError,
        );
      }

      const storedUser = await StorageService.getItem<User>('user');
      console.log('AuthContext - Stored user found:', !!storedUser);

      if (storedUser) {
        // Check biometric authentication
        const biometricEnabled = await BiometricService.isBiometricEnabled();
        const biometricAvailable =
          await BiometricService.isBiometricAvailable();

        if (biometricEnabled && biometricAvailable) {
          try {
            const biometricResult =
              await BiometricService.authenticateWithBiometric();
            if (!biometricResult.success) {
              if (
                biometricResult.error === 'Authentication cancelled by user'
              ) {
                console.log(
                  'AuthContext - Biometric authentication cancelled by user',
                );
                dispatch({ type: 'SET_LOADING', payload: false });
                return null;
              }

              console.log('AuthContext - Biometric authentication failed');
              await StorageService.removeItem('user');
              dispatch({ type: 'SET_LOADING', payload: false });
              return null;
            }
            console.log('AuthContext - Biometric authentication successful');
          } catch (error) {
            console.error(
              'AuthContext - Biometric authentication error:',
              error,
            );
            await StorageService.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
            return null;
          }
        }

        // Wait for Supabase session to be restored
        let sessionReady = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user && session.user.id === storedUser.id) {
            sessionReady = true;
            console.log(
              '✅ AuthContext - Supabase session ready for user:',
              storedUser.id,
            );
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!sessionReady) {
          console.warn(
            '⚠️ AuthContext - Supabase session not restored after wait',
          );
        }

        // Verify user still exists in database
        const dbUser = await FlexibleDatabaseService.getUserById(storedUser.id);
        if (dbUser) {
          // Update online status
          await FlexibleDatabaseService.updateUserOnlineStatus(
            storedUser.id,
            true,
          );
          await BuddiesService.syncUserOnlineStatus(storedUser.id, true);

          dispatch({ type: 'LOGIN_SUCCESS', payload: dbUser });

          // Check profile completeness
          const complete = await FlexibleDatabaseService.isProfileComplete(
            dbUser.id,
          );
          setIsProfileComplete(complete);

          // Initialize notification services
          await initializeNotificationServices(dbUser.id);

          // Ensure FCM is initialized (non-blocking)
          (async () => {
            try {
              const { fcmManager } = await import('@/services/FCMManager');
              if (
                !fcmManager.isInitialized() ||
                fcmManager.getCurrentUserId() !== dbUser.id
              ) {
                console.log(
                  '🔥 Initializing FCM for authenticated user (non-blocking)',
                );
                fcmManager.initialize(dbUser.id).catch(error => {
                  console.warn('⚠️ Non-blocking FCM init failed:', error);
                });
              }
            } catch (error) {
              console.warn('⚠️ Error checking FCM status:', error);
            }
          })();

          // Return userId for notification permission check
          return dbUser.id;
        } else {
          // User no longer exists
          await StorageService.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
          return null;
        }
      } else {
        console.log('AuthContext - No stored user');
        dispatch({ type: 'SET_LOADING', payload: false });
        return null;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      return null;
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

      // Request notification permission based on profile completion status
      if (complete) {
        // Profile is complete - request notification permission after a delay
        // This handles existing users who sign in (not new users going through onboarding)
        console.log(
          '🔔 setAuthenticatedUser: Profile complete - requesting notification permission after delay',
        );
        setTimeout(() => {
          requestNotificationPermissionOnLaunch(user.id);
        }, 2000);
      } else {
        // Profile not complete - notification permission will be requested after profile completion
        // This avoids conflicts with location permission popup during profile setup
        console.log(
          '🔔 setAuthenticatedUser: Profile incomplete - notification permission will be requested after profile completion',
        );
      }
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
        await FlexibleDatabaseService.updateUserOnlineStatus(
          state.user.id,
          false,
        );
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
        const success = await FlexibleDatabaseService.updateUserMood(
          state.user.id,
          mood as any,
        );

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
