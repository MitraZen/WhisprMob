import { Platform } from 'react-native';
import { GOOGLE_SIGNIN_WEB_CLIENT_ID, GOOGLE_SIGNIN_IOS_CLIENT_ID } from '@env';

// Dynamic import to avoid errors if package is not properly configured
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error) {
  console.warn('⚠️ Google Sign-In package not available:', error);
}

/**
 * Google Sign-In Configuration
 * 
 * Uses environment variables from .env file
 * 
 * Setup:
 * 1. Development: Use .env.development (for debug builds)
 * 2. Production: Use .env.production (for release builds)
 * 
 * To get your OAuth client IDs:
 * 1. Go to https://console.cloud.google.com/
 * 2. Select your project
 * 3. Navigate to APIs & Services → Credentials
 * 4. Create OAuth client ID:
 *    - For React Native: Application type = Web application
 *    - This Web client ID is used for both Android and iOS
 *    - For Android: Also create Android OAuth client ID and add SHA-1 fingerprint
 *    - For iOS: Also create iOS OAuth client ID with Bundle ID
 * 5. Copy the Web Client ID and add it to .env.development or .env.production as GOOGLE_SIGNIN_WEB_CLIENT_ID
 */

// Get client IDs from environment variables
const WEB_CLIENT_ID = GOOGLE_SIGNIN_WEB_CLIENT_ID || '';
const IOS_CLIENT_ID = GOOGLE_SIGNIN_IOS_CLIENT_ID || '';

// Debug logging to verify environment variable is loaded
console.log('🔍 Google Sign-In Config Check:', {
  hasWebClientId: !!WEB_CLIENT_ID,
  webClientIdLength: WEB_CLIENT_ID.length,
  webClientIdPreview: WEB_CLIENT_ID.substring(0, 30) + '...',
  platform: Platform.OS,
});

export const GOOGLE_SIGNIN_CONFIG = {
  webClientId: WEB_CLIENT_ID, // Required for React Native Google Sign-In - this is your Web OAuth client ID
  iosClientId: Platform.OS === 'ios' ? IOS_CLIENT_ID : undefined, // Optional for iOS
  offlineAccess: true, // If you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs
};

/**
 * Initialize Google Sign-In with the configuration
 * Call this once when your app starts (e.g., in index.js or App.tsx)
 * 
 * Note: We always call configure() even if client ID is not set, to initialize the SDK.
 * The actual sign-in will fail with a clear error if not properly configured.
 */
export const initializeGoogleSignIn = () => {
  try {
    if (!GoogleSignin) {
      console.warn('⚠️ Google Sign-In package not available. Please install and configure it.');
      return;
    }

    // Check if client ID is configured
    const isConfigured = WEB_CLIENT_ID && 
                        !WEB_CLIENT_ID.includes('YOUR_') && 
                        WEB_CLIENT_ID.includes('.apps.googleusercontent.com');
    
    if (!isConfigured) {
      console.warn('⚠️ Google Sign-In client ID not configured. Please update .env file with your OAuth client ID from Google Cloud Console.');
      console.warn('⚠️ Google Sign-In will be initialized but sign-in will fail until configured.');
    }

    // Always call configure() to initialize the SDK
    // Use a minimal valid config if client ID is not set
    const config = isConfigured 
      ? GOOGLE_SIGNIN_CONFIG 
      : { 
          ...GOOGLE_SIGNIN_CONFIG, 
          webClientId: 'placeholder.apps.googleusercontent.com' // Temporary placeholder
        };
    
    // Log the actual config being used (without full client ID for security)
    console.log('🔍 Google Sign-In Config:', {
      webClientIdPreview: config.webClientId.substring(0, 30) + '...',
      webClientIdLength: config.webClientId.length,
      isConfigured,
    });
    
    GoogleSignin.configure(config);
    
    if (isConfigured) {
      console.log('✅ Google Sign-In configured successfully with client ID:', config.webClientId.substring(0, 30) + '...');
    } else {
      console.log('⚠️ Google Sign-In initialized with placeholder config. Please configure your OAuth client ID.');
    }
  } catch (error) {
    console.error('❌ Failed to configure Google Sign-In:', error);
  }
};

export default GoogleSignin;

