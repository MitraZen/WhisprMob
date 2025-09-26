import { Alert, Linking } from 'react-native';
import PermissionService, { PermissionStatus } from './permissionService';

class AutoPermissionManager {
  private static instance: AutoPermissionManager;
  private userId: string | null = null;
  private hasInitializedForUser: boolean = false;

  private constructor() {}

  public static getInstance(): AutoPermissionManager {
    if (!AutoPermissionManager.instance) {
      AutoPermissionManager.instance = new AutoPermissionManager();
    }
    return AutoPermissionManager.instance;
  }

  /**
   * Initializes the permission manager for a specific user.
   * Should be called once the user is authenticated.
   * @param userId The ID of the authenticated user.
   */
  public async initialize(userId: string): Promise<void> {
    if (this.userId === userId && this.hasInitializedForUser) {
      console.log('AutoPermissionManager - Already initialized for this user.');
      return;
    }

    this.userId = userId;
    this.hasInitializedForUser = false; // Reset for new user or re-initialization

    console.log('AutoPermissionManager - Initializing for user:', userId);
    await this.checkAndRequestCriticalPermissions();
    this.hasInitializedForUser = true;
  }

  /**
   * Checks current permission status and requests critical ones if missing.
   */
  public async checkAndRequestCriticalPermissions(): Promise<PermissionStatus> {
    if (!this.userId) {
      console.warn('AutoPermissionManager - No user ID set. Skipping permission check.');
      return await PermissionService.getAllPermissionStatus();
    }

    console.log('AutoPermissionManager - Checking and requesting critical permissions...');
    let currentStatus = await PermissionService.getAllPermissionStatus();
    console.log('AutoPermissionManager - Current status:', currentStatus);

    const criticalPermissions: Array<keyof PermissionStatus> = ['notifications']; // Define critical permissions

    const missingCritical = criticalPermissions.filter(
      (permission) => !currentStatus[permission]
    );

    if (missingCritical.length > 0) {
      console.log('AutoPermissionManager - Missing critical permissions:', missingCritical);
      await this.showPermissionRationaleAndRequest(missingCritical);
      // Re-check status after request
      currentStatus = await PermissionService.getAllPermissionStatus();
      console.log('AutoPermissionManager - Status after request:', currentStatus);
    } else {
      console.log('AutoPermissionManager - All critical permissions are granted.');
    }
    return currentStatus;
  }

  /**
   * Shows a rationale dialog and then requests permissions.
   * @param permissions The list of missing critical permissions.
   */
  private async showPermissionRationaleAndRequest(permissions: Array<keyof PermissionStatus>): Promise<void> {
    const permissionNames = permissions.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
    const message = `Whispr needs ${permissionNames} permissions to function properly. Please grant them in the next step.`;

    return new Promise((resolve) => {
      Alert.alert(
        'Permissions Required',
        message,
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => {
              console.log('AutoPermissionManager - User declined permission rationale.');
              resolve();
            },
          },
          {
            text: 'Grant Permissions',
            onPress: async () => {
              console.log('AutoPermissionManager - User accepted permission rationale. Requesting permissions...');
              for (const permissionType of permissions) {
                const granted = await PermissionService.requestPermissionWithDialog(permissionType);
                if (!granted) {
                  console.log(`AutoPermissionManager - ${permissionType} not granted.`);
                  // Optionally, guide user to settings if permission is permanently denied
                  this.showSettingsPrompt(permissionType);
                }
              }
              resolve();
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Prompts the user to go to app settings to enable a permission.
   * @param permissionType The type of permission.
   */
  private showSettingsPrompt(permissionType: keyof PermissionStatus): void {
    Alert.alert(
      'Permission Denied Permanently',
      `It looks like ${permissionType} permission was permanently denied. Please enable it manually from app settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  /**
   * Checks and updates the permission status, useful for SettingsScreen.
   */
  public async checkAndUpdatePermissions(): Promise<PermissionStatus> {
    console.log('AutoPermissionManager - Checking and updating all permissions...');
    const status = await PermissionService.getAllPermissionStatus();
    console.log('AutoPermissionManager - Current permission status:', status);
    return status;
  }
}

export default AutoPermissionManager.getInstance();
