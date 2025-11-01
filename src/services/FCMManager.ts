import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';

// ⚠️ TEMPORARY: Suppress modular API deprecation warnings until migration to v22 modular API is complete
// TODO: Migrate to modular API when React Native Firebase v22 stable is released
// See: https://rnfirebase.io/migrating-to-v22
if (typeof globalThis !== 'undefined') {
  (globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

// Constants
const APP_VERSION_KEY = '@whispr_app_version';
const FCM_INITIALIZED_KEY = '@whispr_fcm_initialized';
const TOKEN_REFRESH_LISTENER_KEY = '@whispr_token_refresh_listener';

// Get app version from package.json (fallback to build.gradle version)
// For production, this should match android/app/build.gradle versionName
const APP_VERSION = '1.7.7'; // TODO: Automate this to read from build.gradle

interface TokenRefreshListener {
  unsubscribe: () => void;
}

export interface FCMInitializationResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Centralized FCM Manager - Singleton Pattern
 * Handles FCM token lifecycle, app update detection, and token synchronization
 */
export class FCMManager {
  private static instance: FCMManager;
  private fcmToken: string | null = null;
  private currentUserId: string | null = null;
  private initialized = false;
  private tokenRefreshListener: TokenRefreshListener | null = null;
  private initializationPromise: Promise<FCMInitializationResult> | null = null;
  private pendingTokenSave: { token: string; userId: string } | null = null;
  private authStateListener: { unsubscribe: () => void } | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): FCMManager {
    if (!FCMManager.instance) {
      FCMManager.instance = new FCMManager();
    }
    return FCMManager.instance;
  }

  /**
   * Initialize FCM for authenticated user
   * Handles app update detection and token validation
   * Returns immediately if already initialized to prevent blocking
   */
  async initialize(userId: string, forceRefresh = false): Promise<FCMInitializationResult> {
    // If already initialized for this user, return success immediately
    if (this.initialized && this.currentUserId === userId && !forceRefresh) {
      console.log('🔥 FCMManager: Already initialized for user, skipping');
      return {
        success: true,
        token: this.fcmToken || undefined,
      };
    }

    // Prevent concurrent initializations
    if (this.initializationPromise) {
      console.log('🔥 FCM initialization already in progress, waiting...');
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(userId, forceRefresh);
    
    try {
      const result = await this.initializationPromise;
      return result;
    } catch (error: any) {
      console.error('❌ FCMManager: Initialization error caught:', error);
      // Return failure but don't throw to prevent blocking
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    } finally {
      this.initializationPromise = null;
    }
  }

  private async performInitialization(
    userId: string,
    forceRefresh: boolean
  ): Promise<FCMInitializationResult> {
    try {
      console.log('🔥 FCMManager: Starting initialization for user:', userId);
      this.currentUserId = userId;

      // Check if this is an app update
      const isAppUpdate = await this.detectAppUpdate();

      // If app was updated or force refresh, refresh token
      if (isAppUpdate || forceRefresh) {
        console.log('🔥 FCMManager: App update detected or force refresh requested');
        await this.refreshToken(userId);
        await AsyncStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      } else {
        // Otherwise, ensure token is valid
        await this.ensureValidToken(userId);
      }

      // Set up persistent token refresh listener
      this.setupTokenRefreshListener(userId);

      // Set up auth state listener to save pending tokens when session is ready
      this.setupAuthStateListener();

      this.initialized = true;
      await AsyncStorage.setItem(FCM_INITIALIZED_KEY, 'true');

      console.log('✅ FCMManager: Initialization successful');
      return {
        success: true,
        token: this.fcmToken || undefined,
      };
    } catch (error: any) {
      console.error('❌ FCMManager: Initialization failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Detect if app was updated by comparing stored version with current version
   */
  private async detectAppUpdate(): Promise<boolean> {
    try {
      const storedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);
      
      if (!storedVersion) {
        console.log('🔥 FCMManager: No stored version found - first launch');
        return true; // First launch counts as "update"
      }

      const isUpdate = storedVersion !== APP_VERSION;
      
      if (isUpdate) {
        console.log('🔥 FCMManager: App update detected', {
          stored: storedVersion,
          current: APP_VERSION,
        });
      }

      return isUpdate;
    } catch (error) {
      console.error('🔥 FCMManager: Error detecting app update:', error);
      // On error, assume it's an update to be safe
      return true;
    }
  }

  /**
   * Refresh FCM token and sync with database
   */
  private async refreshToken(userId: string): Promise<void> {
    try {
      console.log('🔥 FCMManager: Refreshing FCM token...');
      
      // Request permission first
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        throw new Error('FCM permission not granted');
      }

      // Get fresh token
      const newToken = await this.getTokenWithRetry();
      this.fcmToken = newToken;

      console.log('🔥 FCMManager: New token obtained:', newToken.substring(0, 20) + '...');

      // Save to database with retry
      await this.saveTokenToDatabaseWithRetry(userId, newToken);

      console.log('✅ FCMManager: Token refreshed and saved');
    } catch (error: any) {
      console.error('❌ FCMManager: Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Ensure token is valid by comparing with database
   */
  private async ensureValidToken(userId: string): Promise<void> {
    try {
      console.log('🔥 FCMManager: Validating token...');

      // ✅ Add overall timeout for token validation (8 seconds max)
      const validationPromise = (async () => {
        // Get current token from Firebase
        const currentToken = await this.getTokenWithRetry();
        
        if (!currentToken) {
          console.log('🔥 FCMManager: No token available, refreshing...');
          await this.refreshToken(userId);
          return;
        }

        // Get token from database (has its own 3s timeout)
        const dbToken = await this.getTokenFromDatabase(userId);

        // If tokens don't match or DB has no token, refresh
        if (!dbToken || dbToken !== currentToken) {
          console.log('🔥 FCMManager: Token mismatch detected, refreshing...', {
            dbToken: dbToken ? dbToken.substring(0, 20) + '...' : 'none',
            currentToken: currentToken.substring(0, 20) + '...',
          });
          await this.refreshToken(userId);
        } else {
          console.log('✅ FCMManager: Token validated and in sync');
          this.fcmToken = currentToken;
        }
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token validation timeout')), 8000)
      );

      await Promise.race([validationPromise, timeoutPromise]);
    } catch (error: any) {
      console.warn('⚠️ FCMManager: Token validation failed or timed out:', error.message);
      // ✅ CRITICAL FIX: Don't block on validation errors - just use current token or skip
      // This prevents sign-in from hanging
      try {
        const currentToken = await this.getTokenWithRetry();
        if (currentToken) {
          this.fcmToken = currentToken;
          console.log('✅ FCMManager: Using current token despite validation error');
        }
      } catch (tokenError) {
        console.warn('⚠️ FCMManager: Could not get current token, continuing without FCM');
      }
    }
  }

  /**
   * Set up persistent token refresh listener
   */
  private setupTokenRefreshListener(userId: string): void {
    // Remove existing listener if any
    if (this.tokenRefreshListener) {
      try {
        this.tokenRefreshListener.unsubscribe();
      } catch (error) {
        console.warn('🔥 FCMManager: Error removing old listener:', error);
      }
    }

    console.log('🔥 FCMManager: Setting up token refresh listener...');

    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔁 FCMManager: Token refresh triggered:', new Date().toISOString());
      console.log('🔥 FCMManager: New token:', newToken.substring(0, 20) + '...');
      
      this.fcmToken = newToken;
      
      // Save to database with retry
      if (this.currentUserId) {
        await this.saveTokenToDatabaseWithRetry(this.currentUserId, newToken);
      } else {
        console.warn('🔥 FCMManager: No current user ID for token refresh');
      }
    });

    this.tokenRefreshListener = { unsubscribe };
    console.log('✅ FCMManager: Token refresh listener set up');
  }

  /**
   * Get FCM token with retry logic
   */
  private async getTokenWithRetry(maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = await messaging().getToken();
        if (token) {
          return token;
        }
        throw new Error('Token is null');
      } catch (error: any) {
        lastError = error;
        console.warn(`🔥 FCMManager: Token retrieval attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to get FCM token after retries');
  }

  /**
   * Save token to database with retry logic and timeout protection
   */
  private async saveTokenToDatabaseWithRetry(
    userId: string,
    token: string,
    maxRetries = 3
  ): Promise<void> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const platform = Platform.OS;
        console.log(`🔥 FCMManager: Saving token to database (attempt ${attempt}/${maxRetries})...`);

        // CRITICAL: Wait for and verify authenticated session to ensure RLS compliance
        // RLS policy requires user_id = auth.uid()
        // Retry up to 5 times with increasing delays to wait for session to be ready
        let authUser = null;
        let sessionReady = false;
        
        for (let sessionAttempt = 1; sessionAttempt <= 5; sessionAttempt++) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session?.user) {
            authUser = session.user;
            sessionReady = true;
            break;
          }
          
          if (sessionAttempt < 5) {
            // Wait progressively longer: 200ms, 400ms, 800ms, 1600ms
            const delay = Math.pow(2, sessionAttempt) * 100;
            console.log(`🔥 FCMManager: Session not ready, waiting ${delay}ms before retry (attempt ${sessionAttempt}/5)...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        // ✅ CRITICAL FIX: Handle anonymous users gracefully (they don't have Supabase auth)
        // Anonymous users are created via FlexibleDatabaseService without Supabase auth
        // For these users, we queue the token save for when they sign up with email/password
        if (!sessionReady || !authUser) {
          // Check if this is an anonymous user (no email means anonymous/mood-based login)
          // Anonymous users can't save FCM tokens due to RLS, so we skip and log a warning
          console.warn('⚠️ FCMManager: No Supabase session available - user may be anonymous (mood-based login without email/password auth)');
          console.warn('⚠️ FCMManager: FCM token will be saved when user signs up with email/password');
          
          // Queue the token save for later (when user authenticates properly)
          this.pendingTokenSave = { token, userId };
          
          // Don't throw error - allow app to continue (anonymous users can still use app without FCM)
          return;
        }

        // Use auth.uid() instead of passed userId to ensure RLS policy compliance
        const sessionUserId = authUser.id;
        
        if (sessionUserId !== userId) {
          console.warn(`⚠️ FCMManager: User ID mismatch - using session user ${sessionUserId} instead of provided ${userId}`);
        }

        console.log(`🔥 FCMManager: Using session user ID: ${sessionUserId} for token save`);

        // Add timeout protection (5 seconds per attempt)
        const savePromise = supabase
          .from('user_fcm_tokens')
          .upsert({
            user_id: sessionUserId, // Use session user ID to ensure RLS compliance
            fcm_token: token,
            platform,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'fcm_token' });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout')), 5000)
        );

        const { error } = await Promise.race([savePromise, timeoutPromise]) as any;

        if (error) throw error;

        console.log('✅ FCMManager: Token saved to database successfully');
        return;
      } catch (error: any) {
        lastError = error;
        console.warn(`🔥 FCMManager: Database save attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // If session issue, wait a bit longer before retry
        if (error.message.includes('Session') || error.message.includes('authenticated')) {
          const delay = Math.pow(2, attempt) * 1000; // Longer delay for session issues
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If session wasn't ready, queue the token save for later
    if (lastError?.message?.includes('session') || lastError?.message?.includes('Auth session')) {
      console.log('🔥 FCMManager: Queueing token save for when session is ready');
      this.pendingTokenSave = { token, userId };
      // Will be saved when session is restored via auth state listener
      return; // Don't log as error since we'll retry
    }

    // Don't throw - log and continue to prevent blocking app launch
    console.error('❌ FCMManager: Failed to save token to database after retries, continuing anyway:', lastError?.message);
    // Don't throw - allow app to continue
  }

  /**
   * Set up auth state listener to save pending tokens when session is restored
   */
  private setupAuthStateListener(): void {
    // Only set up once
    if (this.authStateListener) {
      return;
    }

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔥 FCMManager: Auth state changed: ${event}, user: ${session?.user?.id || 'none'}`);
        
        // When session is restored or user signs in, save pending token if any
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user && this.pendingTokenSave) {
          console.log('🔥 FCMManager: Session available, attempting to save pending token');
          const { token, userId } = this.pendingTokenSave;
          
          // Verify it's the same user
          if (session.user.id === userId) {
            try {
              await this.saveTokenToDatabaseWithRetry(userId, token);
              // Clear pending save on success
              this.pendingTokenSave = null;
              console.log('✅ FCMManager: Pending token saved successfully');
            } catch (error: any) {
              console.warn('⚠️ FCMManager: Failed to save pending token:', error?.message);
              // Keep pendingTokenSave so we can retry again if it's still a session issue
              if (!error?.message?.includes('session') && !error?.message?.includes('Auth session')) {
                // If it's not a session issue anymore, clear the pending save
                this.pendingTokenSave = null;
              }
            }
          }
        }
      });

      this.authStateListener = subscription;
      console.log('✅ FCMManager: Auth state listener set up for pending token saves');
    } catch (error) {
      console.warn('⚠️ FCMManager: Failed to set up auth state listener:', error);
    }
  }

  /**
   * Get token from database with timeout protection
   */
  private async getTokenFromDatabase(userId: string): Promise<string | null> {
    try {
      // ✅ Add timeout protection to prevent hanging (3 seconds max)
      const queryPromise = supabase
        .from('user_fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        if (error.code === 'PGRST116') {
          // No token found - this is okay
          return null;
        }
        throw error;
      }

      return data?.fcm_token || null;
    } catch (error: any) {
      console.error('🔥 FCMManager: Error getting token from database:', error);
      return null;
    }
  }

  /**
   * Ensure token is valid (called on app state changes)
   */
  async ensureValidTokenForUser(userId: string): Promise<void> {
    try {
      // Only validate if already initialized for this user
      if (!this.initialized || this.currentUserId !== userId) {
        console.log('🔥 FCMManager: Not initialized for user, initializing...');
        await this.initialize(userId);
        return;
      }

      await this.ensureValidToken(userId);
    } catch (error: any) {
      console.error('❌ FCMManager: Error ensuring valid token for user:', error);
    }
  }

  /**
   * Get current FCM token
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Check if FCM is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Cleanup on logout
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🔥 FCMManager: Cleaning up...');

      // Remove token refresh listener
      if (this.tokenRefreshListener) {
        try {
          this.tokenRefreshListener.unsubscribe();
        } catch (error) {
          console.warn('🔥 FCMManager: Error removing token refresh listener:', error);
        }
        this.tokenRefreshListener = null;
      }

      // Remove auth state listener
      if (this.authStateListener) {
        try {
          this.authStateListener.unsubscribe();
        } catch (error) {
          console.warn('🔥 FCMManager: Error removing auth state listener:', error);
        }
        this.authStateListener = null;
      }

      // Clear state
      this.fcmToken = null;
      this.currentUserId = null;
      this.initialized = false;
      this.initializationPromise = null;
      this.pendingTokenSave = null;

      await AsyncStorage.removeItem(FCM_INITIALIZED_KEY);

      console.log('✅ FCMManager: Cleanup complete');
    } catch (error) {
      console.error('❌ FCMManager: Error during cleanup:', error);
    }
  }

  /**
   * Force refresh token (for manual triggers)
   */
  async forceRefreshToken(userId: string): Promise<void> {
    console.log('🔥 FCMManager: Force refresh requested');
    this.initialized = false; // Reset to allow re-initialization
    await this.initialize(userId, true);
  }
}

export const fcmManager = FCMManager.getInstance();

