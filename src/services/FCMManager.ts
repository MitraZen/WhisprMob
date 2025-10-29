import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/config/supabase';

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

      // Get current token from Firebase
      const currentToken = await this.getTokenWithRetry();
      
      if (!currentToken) {
        console.log('🔥 FCMManager: No token available, refreshing...');
        await this.refreshToken(userId);
        return;
      }

      // Get token from database
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
    } catch (error: any) {
      console.error('❌ FCMManager: Error ensuring valid token:', error);
      // Try to refresh on error
      try {
        await this.refreshToken(userId);
      } catch (refreshError) {
        console.error('❌ FCMManager: Failed to refresh token after validation error:', refreshError);
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

        // Add timeout protection (5 seconds per attempt)
        const savePromise = supabase
          .from('user_fcm_tokens')
          .upsert({
            user_id: userId,
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
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Don't throw - log and continue to prevent blocking app launch
    console.error('❌ FCMManager: Failed to save token to database after retries, continuing anyway:', lastError?.message);
    // Don't throw - allow app to continue
  }

  /**
   * Get token from database
   */
  private async getTokenFromDatabase(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .single();

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
          console.warn('🔥 FCMManager: Error removing listener:', error);
        }
        this.tokenRefreshListener = null;
      }

      // Clear state
      this.fcmToken = null;
      this.currentUserId = null;
      this.initialized = false;
      this.initializationPromise = null;

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

