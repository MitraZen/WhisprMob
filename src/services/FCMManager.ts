import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { supabase } from '@/config/supabase';

// ⚠️ TEMPORARY: Suppress modular API deprecation warnings
if (typeof globalThis !== 'undefined') {
  (globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
}

// Constants
const APP_VERSION_KEY = '@whispr_app_version';
const FCM_INITIALIZED_KEY = '@whispr_fcm_initialized';
const DEVICE_ID_KEY = '@whispr_device_id';

const APP_VERSION = '1.7.7';

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
 * ✅ FIXED: Now properly handles device identification to prevent duplicate tokens
 */
export class FCMManager {
  private static instance: FCMManager;
  private fcmToken: string | null = null;
  private currentUserId: string | null = null;
  private deviceId: string | null = null;
  private initialized = false;
  private tokenRefreshListener: TokenRefreshListener | null = null;
  private initializationPromise: Promise<FCMInitializationResult> | null = null;
  private pendingTokenSave: { token: string; userId: string } | null = null;
  private authStateListener: { unsubscribe: () => void } | null = null;

  private constructor() {}

  static getInstance(): FCMManager {
    if (!FCMManager.instance) {
      FCMManager.instance = new FCMManager();
    }
    return FCMManager.instance;
  }

  /**
   * ✅ NEW: Get or generate stable device ID
   */
  private async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    try {
      // First, try to get stored device ID
      let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      
      if (!storedDeviceId) {
        // Generate new device ID using hardware identifiers
        const uniqueId = await DeviceInfo.getUniqueId();
        const installId = await DeviceInfo.getInstanceId(); // More stable than uniqueId on Android
        
        // Combine for stable device ID
        storedDeviceId = `${Platform.OS}-${uniqueId}-${installId}`;
        
        // Store for future use
        await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
        console.log('🔥 FCMManager: Generated new device ID:', storedDeviceId.substring(0, 30) + '...');
      } else {
        console.log('🔥 FCMManager: Using stored device ID:', storedDeviceId.substring(0, 30) + '...');
      }

      this.deviceId = storedDeviceId;
      return storedDeviceId;
    } catch (error) {
      console.error('❌ FCMManager: Error getting device ID:', error);
      // Fallback to simple device ID
      const fallbackId = `${Platform.OS}-${Date.now()}-${Math.random()}`;
      this.deviceId = fallbackId;
      return fallbackId;
    }
  }

  /**
   * Initialize FCM for authenticated user
   */
  async initialize(userId: string, forceRefresh = false): Promise<FCMInitializationResult> {
    if (this.initialized && this.currentUserId === userId && !forceRefresh) {
      console.log('🔥 FCMManager: Already initialized for user, skipping');
      return {
        success: true,
        token: this.fcmToken || undefined,
      };
    }

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

      // ✅ CRITICAL: Get device ID first
      await this.getDeviceId();

      const isAppUpdate = await this.detectAppUpdate();

      if (isAppUpdate || forceRefresh) {
        console.log('🔥 FCMManager: App update detected or force refresh requested');
        await this.refreshToken(userId);
        await AsyncStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      } else {
        await this.ensureValidToken(userId);
      }

      this.setupTokenRefreshListener(userId);
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

  private async detectAppUpdate(): Promise<boolean> {
    try {
      const storedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);
      
      if (!storedVersion) {
        console.log('🔥 FCMManager: No stored version found - first launch');
        return true;
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
      return true;
    }
  }

  private async refreshToken(userId: string): Promise<void> {
    try {
      console.log('🔥 FCMManager: Refreshing FCM token...');
      
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        throw new Error('FCM permission not granted');
      }

      const newToken = await this.getTokenWithRetry();
      this.fcmToken = newToken;

      console.log('🔥 FCMManager: New token obtained:', newToken.substring(0, 20) + '...');

      await this.saveTokenToDatabaseWithRetry(userId, newToken);

      console.log('✅ FCMManager: Token refreshed and saved');
    } catch (error: any) {
      console.error('❌ FCMManager: Error refreshing token:', error);
      throw error;
    }
  }

  private async ensureValidToken(userId: string): Promise<void> {
    try {
      console.log('🔥 FCMManager: Validating token...');

      const validationPromise = (async () => {
        const currentToken = await this.getTokenWithRetry();
        
        if (!currentToken) {
          console.log('🔥 FCMManager: No token available, refreshing...');
          await this.refreshToken(userId);
          return;
        }

        const dbToken = await this.getTokenFromDatabase(userId);

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

  private setupTokenRefreshListener(userId: string): void {
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
      
      if (this.currentUserId) {
        await this.saveTokenToDatabaseWithRetry(this.currentUserId, newToken);
      } else {
        console.warn('🔥 FCMManager: No current user ID for token refresh');
      }
    });

    this.tokenRefreshListener = { unsubscribe };
    console.log('✅ FCMManager: Token refresh listener set up');
  }

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
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to get FCM token after retries');
  }

  /**
   * ✅ FIXED: Save token with device ID to prevent duplicates
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
        const deviceId = await this.getDeviceId();
        const deviceName = await DeviceInfo.getDeviceName();
        
        console.log(`🔥 FCMManager: Saving token to database (attempt ${attempt}/${maxRetries})...`);

        // Wait for authenticated session
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
            const delay = Math.pow(2, sessionAttempt) * 100;
            console.log(`🔥 FCMManager: Session not ready, waiting ${delay}ms before retry (attempt ${sessionAttempt}/5)...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        if (!sessionReady || !authUser) {
          console.warn('⚠️ FCMManager: No Supabase session available - user may be anonymous');
          console.warn('⚠️ FCMManager: FCM token will be saved when user signs up with email/password');
          
          this.pendingTokenSave = { token, userId };
          return;
        }

        const sessionUserId = authUser.id;
        
        if (sessionUserId !== userId) {
          console.warn(`⚠️ FCMManager: User ID mismatch - using session user ${sessionUserId} instead of provided ${userId}`);
        }

        console.log(`🔥 FCMManager: Saving token for device: ${deviceId.substring(0, 30)}...`);

        // ✅ CRITICAL FIX: Upsert with device_id to prevent duplicates
        const savePromise = supabase
          .from('user_fcm_tokens')
          .upsert({
            user_id: sessionUserId,
            fcm_token: token,
            device_id: deviceId,
            device_name: deviceName,
            platform,
            updated_at: new Date().toISOString(),
          }, { 
            onConflict: 'user_id,device_id' // ✅ This prevents duplicates per device
          });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout')), 5000)
        );

        const { error } = await Promise.race([savePromise, timeoutPromise]) as any;

        if (error) throw error;

        console.log('✅ FCMManager: Token saved to database successfully');
        
        // ✅ BONUS: Clean up old tokens for this user (keep last 3 devices)
        await this.cleanupOldTokens(sessionUserId);
        
        return;
      } catch (error: any) {
        lastError = error;
        console.warn(`🔥 FCMManager: Database save attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (error.message.includes('Session') || error.message.includes('authenticated')) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError?.message?.includes('session') || lastError?.message?.includes('Auth session')) {
      console.log('🔥 FCMManager: Queueing token save for when session is ready');
      this.pendingTokenSave = { token, userId };
      return;
    }

    console.error('❌ FCMManager: Failed to save token to database after retries, continuing anyway:', lastError?.message);
  }

  /**
   * ✅ NEW: Clean up old tokens (keep last 3 devices)
   */
  private async cleanupOldTokens(userId: string): Promise<void> {
    try {
      // Get all tokens for this user, ordered by last update
      const { data: tokens, error } = await supabase
        .from('user_fcm_tokens')
        .select('id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error || !tokens || tokens.length <= 3) {
        return; // Keep up to 3 devices
      }

      // Delete tokens beyond the 3 most recent
      const tokensToDelete = tokens.slice(3).map(t => t.id);
      
      if (tokensToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_fcm_tokens')
          .delete()
          .in('id', tokensToDelete);

        if (!deleteError) {
          console.log(`🧹 FCMManager: Cleaned up ${tokensToDelete.length} old token(s)`);
        }
      }
    } catch (error) {
      console.warn('⚠️ FCMManager: Error cleaning up old tokens:', error);
      // Non-critical, continue
    }
  }

  private setupAuthStateListener(): void {
    if (this.authStateListener) {
      return;
    }

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔥 FCMManager: Auth state changed: ${event}, user: ${session?.user?.id || 'none'}`);
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user && this.pendingTokenSave) {
          console.log('🔥 FCMManager: Session available, attempting to save pending token');
          const { token, userId } = this.pendingTokenSave;
          
          if (session.user.id === userId) {
            try {
              await this.saveTokenToDatabaseWithRetry(userId, token);
              this.pendingTokenSave = null;
              console.log('✅ FCMManager: Pending token saved successfully');
            } catch (error: any) {
              console.warn('⚠️ FCMManager: Failed to save pending token:', error?.message);
              if (!error?.message?.includes('session') && !error?.message?.includes('Auth session')) {
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

  private async getTokenFromDatabase(userId: string): Promise<string | null> {
    try {
      const deviceId = await this.getDeviceId();
      
      // ✅ FIXED: Query by both user_id AND device_id
      const queryPromise = supabase
        .from('user_fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        if (error.code === 'PGRST116') {
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

  async ensureValidTokenForUser(userId: string): Promise<void> {
    try {
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

  getToken(): string | null {
    return this.fcmToken;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  async cleanup(): Promise<void> {
    try {
      console.log('🔥 FCMManager: Cleaning up...');

      if (this.tokenRefreshListener) {
        try {
          this.tokenRefreshListener.unsubscribe();
        } catch (error) {
          console.warn('🔥 FCMManager: Error removing token refresh listener:', error);
        }
        this.tokenRefreshListener = null;
      }

      if (this.authStateListener) {
        try {
          this.authStateListener.unsubscribe();
        } catch (error) {
          console.warn('🔥 FCMManager: Error removing auth state listener:', error);
        }
        this.authStateListener = null;
      }

      this.fcmToken = null;
      this.currentUserId = null;
      this.deviceId = null;
      this.initialized = false;
      this.initializationPromise = null;
      this.pendingTokenSave = null;

      await AsyncStorage.removeItem(FCM_INITIALIZED_KEY);

      console.log('✅ FCMManager: Cleanup complete');
    } catch (error) {
      console.error('❌ FCMManager: Error during cleanup:', error);
    }
  }

  async forceRefreshToken(userId: string): Promise<void> {
    console.log('🔥 FCMManager: Force refresh requested');
    this.initialized = false;
    await this.initialize(userId, true);
  }
}

export const fcmManager = FCMManager.getInstance();