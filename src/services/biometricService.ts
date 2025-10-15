import * as Keychain from 'react-native-keychain';
import { Platform, Alert } from 'react-native';

export interface BiometricType {
  type: 'TouchID' | 'FaceID' | 'Fingerprint' | 'Face' | 'Iris' | 'None';
  name: string;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometryType?: BiometricType;
  credentials?: {
    userId: string;
    password: string;
  };
}

export class BiometricService {
  private static readonly SERVICE_NAME = 'whispr-biometric';
  private static readonly USERNAME = 'whispr-user';

  /**
   * Check if biometric authentication is available on the device
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null && (biometryType as string) !== 'None';
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get the type of biometric authentication available
   */
  static async getBiometricType(): Promise<BiometricType | null> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      if (!biometryType || (biometryType as string) === 'None') {
        return null;
      }

      return {
        type: biometryType as any,
        name: this.getBiometricDisplayName(biometryType)
      };
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return null;
    }
  }

  /**
   * Get user-friendly display name for biometric type
   */
  private static getBiometricDisplayName(type: string): string {
    switch (type) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Fingerprint':
        return 'Fingerprint';
      case 'Face':
        return 'Face Recognition';
      case 'Iris':
        return 'Iris Scan';
      default:
        return 'Biometric Authentication';
    }
  }

  /**
   * Enable biometric authentication for the current user
   */
  static async enableBiometric(userId: string, password: string): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device'
        };
      }

      const biometryType = await this.getBiometricType();
      if (!biometryType) {
        return {
          success: false,
          error: 'No biometric authentication method found'
        };
      }

      // Store credentials with biometric protection
      await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        this.USERNAME,
        JSON.stringify({ userId, password }),
        {
          accessControl: Platform.OS === 'ios' 
            ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE
            : Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          accessGroup: undefined,
          authenticationPrompt: `Use ${biometryType.name} to secure your Whispr account`,
        }
      );

      console.log(`✅ Biometric authentication enabled with ${biometryType.name}`);
      
      return {
        success: true,
        biometryType
      };
    } catch (error) {
      console.error('Error enabling biometric authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric authentication'
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disableBiometric(): Promise<BiometricResult> {
    try {
      await Keychain.resetInternetCredentials(this.SERVICE_NAME);
      console.log('✅ Biometric authentication disabled');
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable biometric authentication'
      };
    }
  }

  /**
   * Authenticate using biometrics and retrieve stored credentials
   */
  static async authenticateWithBiometric(): Promise<BiometricResult & { credentials?: { userId: string; password: string } }> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device'
        };
      }

      const biometryType = await this.getBiometricType();
      if (!biometryType) {
        return {
          success: false,
          error: 'No biometric authentication method found'
        };
      }

      // Retrieve credentials using biometric authentication
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME, {
        authenticationPrompt: `Use ${biometryType.name} to access your Whispr account`,
      });

      if (!credentials || !credentials.password) {
        return {
          success: false,
          error: 'No stored credentials found. Please sign in again.'
        };
      }

      const parsedCredentials = JSON.parse(credentials.password);
      
      return {
        success: true,
        biometryType,
        credentials: parsedCredentials
      };
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      
      // Handle specific biometric errors
      if (error instanceof Error) {
        if (error.message.includes('UserCancel')) {
          return {
            success: false,
            error: 'Authentication cancelled by user'
          };
        }
        if (error.message.includes('BiometryNotAvailable')) {
          return {
            success: false,
            error: 'Biometric authentication is not available'
          };
        }
        if (error.message.includes('BiometryNotEnrolled')) {
          return {
            success: false,
            error: 'No biometric data enrolled. Please set up biometric authentication in your device settings.'
          };
        }
        if (error.message.includes('BiometryLockout')) {
          return {
            success: false,
            error: 'Biometric authentication is locked. Please use your device passcode.'
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Biometric authentication failed'
      };
    }
  }

  /**
   * Check if biometric authentication is currently enabled
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      return credentials !== false && credentials.password !== null;
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }

  /**
   * Show biometric setup prompt
   */
  static async promptBiometricSetup(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Biometric Security',
        'Would you like to enable biometric authentication for faster and more secure access to your Whispr account?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Enable',
            style: 'default',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Show biometric authentication prompt
   */
  static async promptBiometricAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Biometric Authentication',
        'Use your biometric authentication to access your account',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Authenticate',
            style: 'default',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }
}

export default BiometricService;
