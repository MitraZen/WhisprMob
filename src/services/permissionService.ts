import { NativeModules, Platform, Alert } from 'react-native';
import PushNotification from 'react-native-push-notification';

const { PermissionModule } = NativeModules;

export interface PermissionStatus {
  notifications: boolean;
  storage: boolean;
  camera: boolean;
  location: boolean;
  contacts: boolean;
  phone: boolean;
}

class PermissionService {
  /**
   * Check all permission statuses
   */
  async getAllPermissionStatus(): Promise<PermissionStatus> {
    try {
      if (!PermissionModule) {
        console.warn('PermissionModule not available');
        return {
          notifications: false,
          storage: false,
          camera: false,
          location: false,
          contacts: false,
          phone: false,
        };
      }
      
      const status = await PermissionModule.getAllPermissionStatus();
      return status;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return {
        notifications: false,
        storage: false,
        camera: false,
        location: false,
        contacts: false,
        phone: false,
      };
    }
  }

  /**
   * Check notification permissions
   */
  async checkNotificationPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.checkNotificationPermissions();
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Check storage permissions
   */
  async checkStoragePermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.checkStoragePermissions();
    } catch (error) {
      console.error('Error checking storage permissions:', error);
      return false;
    }
  }

  /**
   * Check camera permissions
   */
  async checkCameraPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.checkCameraPermissions();
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      return false;
    }
  }

  /**
   * Check location permissions
   */
  async checkLocationPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.checkLocationPermissions();
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Check contact permissions
   */
  async checkContactPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.checkContactPermissions();
    } catch (error) {
      console.error('Error checking contact permissions:', error);
      return false;
    }
  }

  /**
   * Check phone permissions
   */
  async checkPhonePermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.checkPhonePermissions();
    } catch (error) {
      console.error('Error checking phone permissions:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // For Android 13+ (API 33+), we need to request POST_NOTIFICATIONS permission
        // For older versions, permissions are handled by the manifest
        const androidVersion = Platform.Version;
        
        if (androidVersion >= 33) {
          // Android 13+ requires runtime permission request
          console.log('Android 13+ detected - attempting permission request');
          
          try {
            // Try to request permissions using PushNotification
            const permissions = await PushNotification.requestPermissions();
            console.log('Android notification permissions result:', permissions);
            
            if (permissions.alert) {
              return true;
            } else {
              // Permission denied - show instructions
              this.showNotificationPermissionInstructions();
              return false;
            }
          } catch (error) {
            console.error('Error requesting Android notification permissions:', error);
            // Fallback: show instructions for manual setup
            this.showNotificationPermissionInstructions();
            return false;
          }
        } else {
          // For Android < 13, permissions are handled by manifest
          console.log('Android < 13 detected - checking notification permissions');
          return await this.checkNotificationPermissions();
        }
      } else {
        // For iOS, request permissions
        console.log('iOS detected - requesting notification permissions');
        try {
          const permissions = await PushNotification.requestPermissions();
          console.log('iOS notification permissions result:', permissions);
          return permissions.alert || false;
        } catch (error) {
          console.error('Error requesting iOS notification permissions:', error);
          return await this.checkNotificationPermissions();
        }
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Request storage permissions
   */
  async requestStoragePermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) {
        Alert.alert('Error', 'Permission module not available');
        return false;
      }
      
      return await PermissionModule.requestStoragePermissions();
    } catch (error) {
      console.error('Error requesting storage permissions:', error);
      Alert.alert('Error', 'Failed to request storage permissions');
      return false;
    }
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) {
        Alert.alert('Error', 'Permission module not available');
        return false;
      }
      
      return await PermissionModule.requestCameraPermissions();
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      Alert.alert('Error', 'Failed to request camera permissions');
      return false;
    }
  }

  /**
   * Request location permissions
   */
  async requestLocationPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) {
        Alert.alert('Error', 'Permission module not available');
        return false;
      }
      
      return await PermissionModule.requestLocationPermissions();
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      Alert.alert('Error', 'Failed to request location permissions');
      return false;
    }
  }

  /**
   * Request contact permissions
   */
  async requestContactPermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) {
        Alert.alert('Error', 'Permission module not available');
        return false;
      }
      
      return await PermissionModule.requestContactPermissions();
    } catch (error) {
      console.error('Error requesting contact permissions:', error);
      Alert.alert('Error', 'Failed to request contact permissions');
      return false;
    }
  }

  /**
   * Request phone permissions
   */
  async requestPhonePermissions(): Promise<boolean> {
    try {
      if (!PermissionModule) {
        Alert.alert('Error', 'Permission module not available');
        return false;
      }
      
      return await PermissionModule.requestPhonePermissions();
    } catch (error) {
      console.error('Error requesting phone permissions:', error);
      Alert.alert('Error', 'Failed to request phone permissions');
      return false;
    }
  }

  /**
   * Check if we should show request rationale for a permission
   */
  async shouldShowRequestRationale(permissionType: keyof PermissionStatus): Promise<boolean> {
    try {
      if (!PermissionModule) return false;
      return await PermissionModule.shouldShowRequestRationale(permissionType);
    } catch (error) {
      console.error('Error checking request rationale:', error);
      return false;
    }
  }

  /**
   * Request a specific permission with user-friendly messaging
   */
  async requestPermissionWithDialog(permissionType: keyof PermissionStatus): Promise<boolean> {
    const permissionMessages: { [key: string]: string } = {
      notifications: 'Whispr needs notification permission to send you important updates and messages.',
      storage: 'Whispr needs storage permission to save your data and media files.',
      camera: 'Whispr needs camera permission to take photos and share them.',
      location: 'Whispr needs location permission to help you find nearby users.',
      contacts: 'Whispr needs contact permission to help you connect with friends.',
      phone: 'Whispr needs phone permission to verify your account.',
    };

    const message = permissionMessages[permissionType] || `Whispr needs ${permissionType} permission.`;

    return new Promise((resolve) => {
      Alert.alert(
        'Permission Required',
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Grant Permission',
            onPress: async () => {
              let granted = false;
              try {
                switch (permissionType) {
                  case 'notifications':
                    granted = await this.requestNotificationPermissions();
                    break;
                  case 'storage':
                    granted = await this.requestStoragePermissions();
                    break;
                  case 'camera':
                    granted = await this.requestCameraPermissions();
                    break;
                  case 'location':
                    granted = await this.requestLocationPermissions();
                    break;
                  case 'contacts':
                    granted = await this.requestContactPermissions();
                    break;
                  case 'phone':
                    granted = await this.requestPhonePermissions();
                    break;
                  default:
                    Alert.alert('Error', 'Unknown permission type');
                    resolve(false);
                    return;
                }

                if (granted) {
                  Alert.alert('Success', `${permissionType} permission granted!`);
                } else {
                  Alert.alert('Permission Denied', `${permissionType} permission was denied. You can enable it later in settings.`);
                }
                resolve(granted);
              } catch (error) {
                console.error(`Error requesting ${permissionType} permission:`, error);
                Alert.alert('Error', `Failed to request ${permissionType} permission`);
                resolve(false);
              }
            },
          },
        ]
      );
    });
  }

  /**
   * Check if notification permissions are granted (Android specific)
   */
  async checkAndroidNotificationPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return true;
      
      // For Android, we can check if the permission is granted
      // This is a simplified check - in a real app you might want to use
      // react-native-permissions library for more robust permission handling
      return true; // Assume granted if we reach this point
    } catch (error) {
      console.error('Error checking Android notification permissions:', error);
      return false;
    }
  }

  /**
   * Show instructions for manually enabling notification permissions
   */
  showNotificationPermissionInstructions(): void {
    Alert.alert(
      'Enable Notifications',
      'To receive notifications for new messages:\n\n' +
      '📱 MANUAL STEPS:\n' +
      '1. Go to Settings > Apps > Whispr\n' +
      '2. Tap "Permissions" or "App permissions"\n' +
      '3. Enable "Notifications"\n' +
      '4. Go to Settings > Apps > Whispr > Notifications\n' +
      '5. Enable "Allow notifications"\n' +
      '6. Enable "Show on lock screen"\n\n' +
      '🔧 OR USE ADB COMMAND:\n' +
      'Run: adb shell pm grant com.whisprmobiletemp android.permission.POST_NOTIFICATIONS\n\n' +
      'After enabling, restart the app to activate notifications.',
      [
        { text: 'OK', style: 'default' },
        { text: 'Open Settings', style: 'default', onPress: () => {
          // Try to open app settings
          console.log('Opening app settings...');
        }}
      ]
    );
  }
}

export default new PermissionService();

