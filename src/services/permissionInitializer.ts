import { Platform, Alert } from 'react-native';
import PermissionService from './permissionService';
import { StorageService } from '@/utils/helpers';

interface PermissionStatus {
  notifications: boolean;
  storage: boolean;
  camera: boolean;
  location: boolean;
  contacts: boolean;
  phone: boolean;
}

class PermissionInitializer {
  private static instance: PermissionInitializer;
  private hasRequestedPermissions = false;

  static getInstance(): PermissionInitializer {
    if (!PermissionInitializer.instance) {
      PermissionInitializer.instance = new PermissionInitializer();
    }
    return PermissionInitializer.instance;
  }

  /**
   * Initialize permissions on app startup
   * This should be called after user authentication
   */
  async initializePermissions(userId: string): Promise<void> {
    if (this.hasRequestedPermissions) {
      return;
    }

    try {
      console.log('PermissionInitializer - Starting permission initialization for user:', userId);
      
      // Check if we've already requested permissions for this user
      const permissionKey = `permissions_requested_${userId}`;
      const hasRequested = await StorageService.getItem<boolean>(permissionKey);
      
      if (hasRequested) {
        console.log('PermissionInitializer - Permissions already requested for this user');
        this.hasRequestedPermissions = true;
        return;
      }

      // Get current permission status
      const currentStatus = await PermissionService.getAllPermissionStatus();
      console.log('PermissionInitializer - Current permission status:', currentStatus);

      // Check if critical permissions are missing
      const criticalPermissions = ['notifications'];
      const missingCritical = criticalPermissions.filter(permission => !currentStatus[permission as keyof PermissionStatus]);

      if (missingCritical.length === 0) {
        console.log('PermissionInitializer - All critical permissions already granted');
        await StorageService.setItem(permissionKey, true);
        this.hasRequestedPermissions = true;
        return;
      }

      // Show permission request dialog
      await this.showPermissionRequestDialog(missingCritical);

      // Mark as requested regardless of user choice
      await StorageService.setItem(permissionKey, true);
      this.hasRequestedPermissions = true;

    } catch (error) {
      console.error('PermissionInitializer - Error initializing permissions:', error);
    }
  }

  /**
   * Show permission request dialog for missing critical permissions
   */
  private async showPermissionRequestDialog(missingPermissions: string[]): Promise<void> {
    const permissionNames = {
      notifications: 'Notifications',
      storage: 'Storage',
      camera: 'Camera',
      location: 'Location',
      contacts: 'Contacts',
      phone: 'Phone'
    };

    const permissionList = missingPermissions
      .map(permission => permissionNames[permission as keyof typeof permissionNames])
      .join(', ');

    return new Promise((resolve) => {
      Alert.alert(
        'Permissions Required',
        `Whispr needs ${permissionList} permission${missingPermissions.length > 1 ? 's' : ''} to provide the best experience. This includes:\n\n• Notifications for new messages and notes\n• Storage for saving your data\n• Camera for sharing photos\n• Location for finding nearby users\n\nWould you like to grant these permissions now?`,
        [
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => {
              console.log('PermissionInitializer - User skipped permission request');
              resolve();
            }
          },
          {
            text: 'Grant Permissions',
            onPress: async () => {
              console.log('PermissionInitializer - User agreed to grant permissions');
              await this.requestPermissionsSequentially(missingPermissions);
              resolve();
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Request permissions one by one to avoid overwhelming the user
   */
  private async requestPermissionsSequentially(permissions: string[]): Promise<void> {
    for (const permission of permissions) {
      try {
        console.log(`PermissionInitializer - Requesting ${permission} permission`);
        
        let granted = false;
        switch (permission) {
          case 'notifications':
            granted = await PermissionService.requestNotificationPermissions();
            break;
          case 'storage':
            granted = await PermissionService.requestStoragePermissions();
            break;
          case 'camera':
            granted = await PermissionService.requestCameraPermissions();
            break;
          case 'location':
            granted = await PermissionService.requestLocationPermissions();
            break;
          case 'contacts':
            granted = await PermissionService.requestContactPermissions();
            break;
          case 'phone':
            granted = await PermissionService.requestPhonePermissions();
            break;
        }

        if (granted) {
          console.log(`PermissionInitializer - ${permission} permission granted`);
        } else {
          console.log(`PermissionInitializer - ${permission} permission denied`);
        }

        // Small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`PermissionInitializer - Error requesting ${permission} permission:`, error);
      }
    }
  }

  /**
   * Check if permissions have been requested for the current session
   */
  hasRequestedPermissionsForSession(): boolean {
    return this.hasRequestedPermissions;
  }

  /**
   * Reset permission request state (useful for testing)
   */
  resetPermissionState(): void {
    this.hasRequestedPermissions = false;
  }
}

export default PermissionInitializer.getInstance();

