import { 
  NativeModules, 
  Platform, 
  Alert, 
  Linking,
  PermissionsAndroid 
} from 'react-native';
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

export type PermissionType = keyof PermissionStatus;

export interface NotificationPermissionResult {
  granted: boolean;
  permanentlyDenied: boolean;
}

interface PermissionConfig {
  title: string;
  message: string;
  androidPermission?: string;
}

class PermissionService {
  private readonly APP_PACKAGE_NAME = 'com.whisprmobiletemp'; // Make configurable if needed
  
  private readonly permissionConfigs: Record<PermissionType, PermissionConfig> = {
    notifications: {
      title: 'Notification Permission',
      message: 'Whispr needs notification permission to send you important updates and messages.',
      androidPermission: 'android.permission.POST_NOTIFICATIONS',
    },
    storage: {
      title: 'Storage Permission',
      message: 'Whispr needs storage permission to save your data and media files.',
    },
    camera: {
      title: 'Camera Permission',
      message: 'Whispr needs camera permission to take photos and share them.',
    },
    location: {
      title: 'Location Permission',
      message: 'Whispr needs location permission to help you find nearby users.',
    },
    contacts: {
      title: 'Contact Permission',
      message: 'Whispr needs contact permission to help you connect with friends.',
    },
    phone: {
      title: 'Phone Permission',
      message: 'Whispr needs phone permission to verify your account.',
    },
  };

  /**
   * Check if the native permission module is available
   */
  private isPermissionModuleAvailable(): boolean {
    if (!PermissionModule) {
      console.warn('PermissionModule not available - ensure native module is properly linked');
      return false;
    }
    return true;
  }

  /**
   * Get default permission status (all false)
   */
  private getDefaultPermissionStatus(): PermissionStatus {
    return {
      notifications: false,
      storage: false,
      camera: false,
      location: false,
      contacts: false,
      phone: false,
    };
  }

  /**
   * Check all permission statuses
   */
  async getAllPermissionStatus(): Promise<PermissionStatus> {
    if (!this.isPermissionModuleAvailable()) {
      return this.getDefaultPermissionStatus();
    }

    try {
      const status = await PermissionModule.getAllPermissionStatus();
      return status;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return this.getDefaultPermissionStatus();
    }
  }

  /**
   * Generic permission checker
   */
  private async checkPermission(
    methodName: string,
    permissionType: PermissionType
  ): Promise<boolean> {
    if (!this.isPermissionModuleAvailable()) {
      return false;
    }

    try {
      return await PermissionModule[methodName]();
    } catch (error) {
      console.error(`Error checking ${permissionType} permissions:`, error);
      return false;
    }
  }

  /**
   * Check notification permissions
   */
  async checkNotificationPermissions(): Promise<boolean> {
    return this.checkPermission('checkNotificationPermissions', 'notifications');
  }

  /**
   * Check storage permissions
   */
  async checkStoragePermissions(): Promise<boolean> {
    return this.checkPermission('checkStoragePermissions', 'storage');
  }

  /**
   * Check camera permissions
   */
  async checkCameraPermissions(): Promise<boolean> {
    return this.checkPermission('checkCameraPermissions', 'camera');
  }

  /**
   * Check location permissions
   */
  async checkLocationPermissions(): Promise<boolean> {
    return this.checkPermission('checkLocationPermissions', 'location');
  }

  /**
   * Check contact permissions
   */
  async checkContactPermissions(): Promise<boolean> {
    return this.checkPermission('checkContactPermissions', 'contacts');
  }

  /**
   * Check phone permissions
   */
  async checkPhonePermissions(): Promise<boolean> {
    return this.checkPermission('checkPhonePermissions', 'phone');
  }

  /**
   * Request notification permissions with proper Android 13+ handling
   * Returns detailed result including permanent denial status
   */
  async requestNotificationPermissionsDetailed(): Promise<NotificationPermissionResult> {
    try {
      if (Platform.OS === 'android') {
        const androidVersion = Platform.Version as number;
        
        if (androidVersion >= 33) {
          // Android 13+ requires POST_NOTIFICATIONS permission
          console.log('Android 13+ detected - requesting POST_NOTIFICATIONS');
          
          try {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
              {
                title: this.permissionConfigs.notifications.title,
                message: this.permissionConfigs.notifications.message,
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
              }
            );

            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              console.log('Notification permission granted');
              return { granted: true, permanentlyDenied: false };
            } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
              console.log('Notification permission permanently denied');
              this.showPermissionDeniedDialog('notifications');
              return { granted: false, permanentlyDenied: true };
            } else {
              console.log('Notification permission denied');
              return { granted: false, permanentlyDenied: false };
            }
          } catch (error) {
            console.error('Error requesting notification permission:', error);
            return { granted: false, permanentlyDenied: false };
          }
        } else {
          // Android < 13 - permissions handled by manifest
          console.log('Android < 13 - checking notification status');
          const isGranted = await this.checkNotificationPermissions();
          return { granted: isGranted, permanentlyDenied: false };
        }
      } else {
        // iOS - request permissions through push notification
        console.log('iOS - requesting notification permissions');
        try {
          const permissions = await PushNotification.requestPermissions();
          console.log('iOS notification permissions result:', permissions);
          const isGranted = permissions?.alert || false;
          return { granted: isGranted, permanentlyDenied: false };
        } catch (error) {
          console.error('Error requesting iOS notification permissions:', error);
          const isGranted = await this.checkNotificationPermissions();
          return { granted: isGranted, permanentlyDenied: false };
        }
      }
    } catch (error) {
      console.error('Error in requestNotificationPermissions:', error);
      return { granted: false, permanentlyDenied: false };
    }
  }

  /**
   * Request notification permissions with proper Android 13+ handling
   * @deprecated Use requestNotificationPermissionsDetailed() for detailed results
   */
  async requestNotificationPermissions(): Promise<boolean> {
    const result = await this.requestNotificationPermissionsDetailed();
    return result.granted;
  }

  /**
   * Generic permission requester using native module
   */
  private async requestPermissionViaModule(
    methodName: string,
    permissionType: PermissionType
  ): Promise<boolean> {
    if (!this.isPermissionModuleAvailable()) {
      Alert.alert('Error', 'Permission module not available');
      return false;
    }

    try {
      const granted = await PermissionModule[methodName]();
      
      if (!granted) {
        // Check if we should show rationale
        const shouldShow = await this.shouldShowRequestRationale(permissionType);
        if (!shouldShow) {
          // Permission permanently denied
          this.showPermissionDeniedDialog(permissionType);
        }
      }
      
      return granted;
    } catch (error) {
      console.error(`Error requesting ${permissionType} permissions:`, error);
      Alert.alert('Error', `Failed to request ${permissionType} permissions`);
      return false;
    }
  }

  /**
   * Request storage permissions
   */
  async requestStoragePermissions(): Promise<boolean> {
    return this.requestPermissionViaModule('requestStoragePermissions', 'storage');
  }

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    return this.requestPermissionViaModule('requestCameraPermissions', 'camera');
  }

  /**
   * Request location permissions
   */
  async requestLocationPermissions(): Promise<boolean> {
    return this.requestPermissionViaModule('requestLocationPermissions', 'location');
  }

  /**
   * Request contact permissions
   */
  async requestContactPermissions(): Promise<boolean> {
    return this.requestPermissionViaModule('requestContactPermissions', 'contacts');
  }

  /**
   * Request phone permissions
   */
  async requestPhonePermissions(): Promise<boolean> {
    return this.requestPermissionViaModule('requestPhonePermissions', 'phone');
  }

  /**
   * Check if we should show request rationale for a permission
   */
  async shouldShowRequestRationale(permissionType: PermissionType): Promise<boolean> {
    if (!this.isPermissionModuleAvailable()) {
      return false;
    }

    try {
      return await PermissionModule.shouldShowRequestRationale(permissionType);
    } catch (error) {
      console.error('Error checking request rationale:', error);
      return false;
    }
  }

  /**
   * Show dialog when permission is permanently denied
   */
  private showPermissionDeniedDialog(permissionType: PermissionType): void {
    const config = this.permissionConfigs[permissionType];
    
    Alert.alert(
      'Permission Required',
      `${config.message}\n\nThis permission has been denied. Please enable it in settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => this.openAppPermissionsSettings(),
        },
      ]
    );
  }

  /**
   * Request a specific permission with user-friendly dialog
   */
  async requestPermissionWithDialog(permissionType: PermissionType): Promise<boolean> {
    const config = this.permissionConfigs[permissionType];

    return new Promise((resolve) => {
      Alert.alert(
        'Permission Required',
        config.message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Grant Permission',
            onPress: async () => {
              try {
                let granted = false;

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
                  Alert.alert(
                    'Success',
                    `${config.title.replace(' Permission', '')} permission granted!`
                  );
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
   * Open app permissions settings page
   */
  openAppPermissionsSettings(): void {
    console.log('Opening app permissions settings...');

    if (Platform.OS === 'android') {
      // Try native method first (if implemented)
      if (
        this.isPermissionModuleAvailable() &&
        typeof PermissionModule.openAppPermissionsSettings === 'function'
      ) {
        console.log('Using native openAppPermissionsSettings method');
        try {
          PermissionModule.openAppPermissionsSettings();
          return;
        } catch (error) {
          console.error('Native method failed:', error);
        }
      }

      // Fallback: Use Linking.openSettings()
      console.log('Using Linking.openSettings() fallback');
      Linking.openSettings()
        .then(() => console.log('Successfully opened settings'))
        .catch((error) => {
          console.error('Failed to open settings:', error);
          this.showManualSettingsInstructions();
        });
    } else {
      // iOS
      Linking.openSettings().catch((error) => {
        console.error('Error opening iOS settings:', error);
        Alert.alert('Error', 'Unable to open device settings');
      });
    }
  }

  /**
   * Show manual instructions for accessing settings
   */
  private showManualSettingsInstructions(): void {
    Alert.alert(
      'Unable to Open Settings',
      'Please manually navigate to:\n\nSettings → Apps → Whispr → Permissions',
      [{ text: 'OK' }]
    );
  }

  /**
   * Request multiple permissions at once
   */
  async requestMultiplePermissions(
    permissions: PermissionType[]
  ): Promise<Record<PermissionType, boolean>> {
    const results: Partial<Record<PermissionType, boolean>> = {};

    for (const permission of permissions) {
      try {
        switch (permission) {
          case 'notifications':
            results[permission] = await this.requestNotificationPermissions();
            break;
          case 'storage':
            results[permission] = await this.requestStoragePermissions();
            break;
          case 'camera':
            results[permission] = await this.requestCameraPermissions();
            break;
          case 'location':
            results[permission] = await this.requestLocationPermissions();
            break;
          case 'contacts':
            results[permission] = await this.requestContactPermissions();
            break;
          case 'phone':
            results[permission] = await this.requestPhonePermissions();
            break;
        }
      } catch (error) {
        console.error(`Error requesting ${permission}:`, error);
        results[permission] = false;
      }
    }

    return results as Record<PermissionType, boolean>;
  }

  /**
   * Check if all required permissions are granted
   */
  async areAllPermissionsGranted(permissions: PermissionType[]): Promise<boolean> {
    const status = await this.getAllPermissionStatus();
    return permissions.every((permission) => status[permission]);
  }

  /**
   * Developer utility: Log ADB command for granting permissions
   * (Only for development/debugging)
   */
  logADBCommand(permissionType: PermissionType): void {
    if (__DEV__) {
      const config = this.permissionConfigs[permissionType];
      if (config.androidPermission) {
        console.log(
          `\n🔧 ADB Command:\nadb shell pm grant ${this.APP_PACKAGE_NAME} ${config.androidPermission}\n`
        );
      }
    }
  }

  /**
   * Open battery optimization settings
   */
  async openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS !== 'android') {
      console.log('Battery optimization is Android-only');
      return;
    }

    if (!this.isPermissionModuleAvailable()) {
      Alert.alert('Error', 'Permission module not available');
      return;
    }

    try {
      await PermissionModule.openBatteryOptimizationSettings();
    } catch (error) {
      console.error('Error opening battery optimization settings:', error);
      // Fallback to general settings
      Linking.openSettings().catch((err) => {
        console.error('Failed to open settings:', err);
      });
    }
  }

  /**
   * Check if battery optimization is ignored for this app (Android only)
   */
  async isBatteryOptimizationIgnored(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // Not applicable on iOS
    }

    if (!this.isPermissionModuleAvailable()) {
      return false;
    }

    try {
      return await PermissionModule.isBatteryOptimizationIgnored();
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      return false;
    }
  }
}

export default new PermissionService();