import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Animated,
  Platform,
  Modal,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import {
  notificationService,
  setAppNotificationEnabled as setAppNotificationState,
  getAppNotificationEnabled,
} from '@/services/notificationService';
import PermissionService from '../services/permissionService';
import PermissionInitializer from '../services/permissionInitializer';
import { AdminService } from '@/services/adminService'; // Import admin service
import BiometricService from '@/services/biometricService';
import { ThemedAlertLegacy } from '@/components/ThemedAlert';
// Test components removed for production build

interface SettingsOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
  color: string;
  rightComponent?: React.ReactNode;
}

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigate,
  user,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [isAdmin, setIsAdmin] = useState(false); // Add admin state
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [appNotificationEnabled, setAppNotificationEnabled] = useState(true);
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const permissionCheckTriggered = useRef(false);
  // Test states removed for production build

  // Debug code removed for production build

  const styles = createStyles(theme);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      permissionCheckTriggered.current
    ) {
      // User returned from settings, check if permissions changed
      console.log(
        'App became active after opening settings - checking permissions',
      );

      // Wait a bit for permissions to be updated
      setTimeout(async () => {
        const previousPermissions =
          await PermissionService.getAllPermissionStatus();
        await loadPermissionStatus();
        await loadAppNotificationState();

        const currentPermissions =
          await PermissionService.getAllPermissionStatus();

        // Check if any permissions changed
        const permissionsChanged =
          previousPermissions.notifications !==
            currentPermissions.notifications ||
          previousPermissions.location !== currentPermissions.location ||
          previousPermissions.camera !== currentPermissions.camera ||
          previousPermissions.storage !== currentPermissions.storage;

        if (permissionsChanged) {
          ThemedAlertLegacy.alert(
            'Success',
            'Permissions updated successfully',
          );
        }

        // Reset the flag
        permissionCheckTriggered.current = false;
      }, 500);
    }

    appState.current = nextAppState;
    setAppStateVisible(nextAppState);
  };

  useEffect(() => {
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Load actual permission status
    loadPermissionStatus();

    // Check if user is admin
    checkAdminStatus();

    // Check biometric authentication status
    checkBiometricStatus();

    // Load app notification state
    loadAppNotificationState();

    // Set up AppState listener to detect when user returns from settings
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  const loadAppNotificationState = async () => {
    try {
      // Load app-level notification state from AsyncStorage
      const appNotificationsEnabled = await getAppNotificationEnabled();
      setAppNotificationEnabled(appNotificationsEnabled);

      // Also check system-level permissions
      const currentPermissions =
        await PermissionService.getAllPermissionStatus();
      // If system permissions are denied, disable the toggle
      if (!currentPermissions.notifications && appNotificationsEnabled) {
        // System permission denied but app-level is enabled - disable app-level
        await setAppNotificationState(false);
        setAppNotificationEnabled(false);
      }
    } catch (error) {
      console.error('Error loading app notification state:', error);
      // Default to enabled on error
      setAppNotificationEnabled(true);
    }
  };

  const loadPermissionStatus = async () => {
    try {
      const currentPermissions =
        await PermissionService.getAllPermissionStatus();
      // Update location toggle based on actual permission status
      setLocationEnabled(currentPermissions.location);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const checkAdminStatus = async () => {
    try {
      if (user?.id) {
        const adminStatus = await AdminService.isUserAdmin(user.id);
        setIsAdmin(adminStatus);
        console.log('SettingsScreen: User admin status:', adminStatus);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
      setIsAdmin(false);
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const isEnabled = await BiometricService.isBiometricEnabled();
      setBiometricEnabled(isEnabled);
    } catch (error) {
      console.error('Error checking biometric status:', error);
    }
  };

  const handleAppNotificationToggle = async (value: boolean) => {
    setAppNotificationEnabled(value);
    try {
      if (value) {
        // Enable notifications - request permission first
        const granted =
          await PermissionService.requestNotificationPermissions();
        if (!granted) {
          setAppNotificationEnabled(false);
          Alert.alert(
            'Permission Required',
            'Please allow notification permissions to enable notifications.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }

        // Save app-level notification state
        await setAppNotificationState(true);
        console.log('✅ App-level notifications enabled');
      } else {
        // Disable notifications - save state to AsyncStorage
        await setAppNotificationState(false);
        console.log('🔕 App-level notifications disabled');
      }
    } catch (error) {
      console.error('Error toggling app notifications:', error);
      setAppNotificationEnabled(!value);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleOpenDeviceSettings = () => {
    Linking.openSettings().catch(error => {
      console.error('Error opening settings:', error);
      Alert.alert('Error', 'Unable to open device settings');
    });
  };

  const handleLocationToggle = async (value: boolean) => {
    setLocationEnabled(value);
    try {
      if (value) {
        const granted = await PermissionService.requestLocationPermissions();
        if (!granted) {
          // If permission was denied, revert the toggle
          setLocationEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      Alert.alert('Error', 'Failed to update location settings');
      // Revert the toggle on error
      setLocationEnabled(!value);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    try {
      if (value) {
        // Enable biometric authentication
        const isAvailable = await BiometricService.isBiometricAvailable();
        if (!isAvailable) {
          Alert.alert(
            'Biometric Not Available',
            'Biometric authentication is not available on this device. Please check your device settings.',
            [{ text: 'OK' }],
          );
          return;
        }

        const biometryType = await BiometricService.getBiometricType();
        if (!biometryType) {
          Alert.alert(
            'Biometric Not Available',
            'No biometric authentication method found on this device.',
            [{ text: 'OK' }],
          );
          return;
        }

        // Prompt user to enable biometric authentication
        const shouldEnable = await BiometricService.promptBiometricSetup();
        if (!shouldEnable) {
          return;
        }

        // For now, we'll need the user's password to enable biometric auth
        // In a real implementation, you might want to prompt for password here
        Alert.alert(
          'Enable Biometric Authentication',
          `To enable ${biometryType.name} authentication, you'll need to sign in again. This will securely store your credentials for future biometric access.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to sign in screen or prompt for password
                Alert.alert(
                  'Password Required',
                  'Please enter your password to enable biometric authentication.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Enter Password',
                      onPress: () => {
                        // This would typically open a password input modal
                        // For now, we'll show a placeholder
                        Alert.alert(
                          'Info',
                          'Password input would be implemented here. For now, biometric authentication is ready to be enabled.',
                        );
                      },
                    },
                  ],
                );
              },
            },
          ],
        );
      } else {
        // Disable biometric authentication
        const result = await BiometricService.disableBiometric();
        if (result.success) {
          setBiometricEnabled(false);
          Alert.alert(
            'Biometric Disabled',
            'Biometric authentication has been disabled successfully.',
            [{ text: 'OK' }],
          );
        } else {
          Alert.alert(
            'Error',
            result.error || 'Failed to disable biometric authentication.',
            [{ text: 'OK' }],
          );
        }
      }
    } catch (error) {
      console.error('Error toggling biometric authentication:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while updating biometric settings.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleRequestPermissions = async () => {
    try {
      // Show dialog with instructions
      Alert.alert(
        'Manage Permissions',
        'This will open the App permissions page for Whispr where you can enable or disable individual permissions.\n\nAfter updating permissions, return to the app.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'App permissions',
            onPress: () => {
              console.log('🔧 User clicked "App permissions" button');
              // Set flag to check permissions when app becomes active
              permissionCheckTriggered.current = true;
              
              // Open app info page which shows Permissions prominently
              if (Platform.OS === 'android') {
                console.log('🔧 Calling PermissionService.openAppPermissionsSettings()...');
                try {
                  PermissionService.openAppPermissionsSettings();
                  console.log('🔧 PermissionService.openAppPermissionsSettings() called');
                } catch (error) {
                  console.error('❌ Error in openAppPermissionsSettings:', error);
                  // Direct fallback - try Linking.openSettings directly
                  console.log('🔄 Trying Linking.openSettings() directly...');
                  Linking.openSettings()
                    .then(() => console.log('✅ Linking.openSettings() succeeded'))
                    .catch((err) => {
                      console.error('❌ Linking.openSettings() failed:', err);
                      Alert.alert('Error', 'Unable to open device settings');
                    });
                }
              } else {
                // iOS - open general settings
                Linking.openSettings().catch((error) => {
                  console.error('Error opening settings:', error);
                  Alert.alert('Error', 'Unable to open device settings');
                });
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error opening permission settings:', error);
      Alert.alert('Error', 'Failed to open permission settings');
    }
  };

  const handleExportData = () => {
    ThemedAlertLegacy.alert(
      'Export Data',
      'Your data export will be sent to your email address.',
    );
  };

  // Base settings options (available to all users)
  const baseSettingsOptions: SettingsOption[] = [
    {
      id: 'notifications',
      title: 'Notification Settings',
      subtitle: 'Allow Whispr to send you notifications',
      icon: 'notifications-outline',
      onPress: () => setShowNotificationDialog(true),
      color: theme.colors.primary,
    },
    {
      id: 'theme',
      title: 'Theme Preferences',
      subtitle: isDark ? 'Dark mode enabled' : 'Light mode enabled',
      icon: 'color-palette-outline',
      onPress: toggleTheme,
      rightComponent: (
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '40',
          }}
          thumbColor={
            isDark ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
          }
        />
      ),
      color: theme.colors.success,
    },
    {
      id: 'permissions',
      title: 'Permission Management',
      subtitle: 'Camera, location, storage permissions',
      icon: 'shield-checkmark-outline',
      onPress: handleRequestPermissions,
      color: theme.colors.error,
    },
    {
      id: 'location',
      title: 'Location Services',
      subtitle: 'Enable location-based features (Coming Soon)',
      icon: 'location-outline',
      onPress: () => handleLocationToggle(!locationEnabled),
      rightComponent: (
        <Switch
          value={locationEnabled}
          onValueChange={handleLocationToggle}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '40',
          }}
          thumbColor={
            locationEnabled
              ? theme.colors.onPrimary
              : theme.colors.onSurfaceVariant
          }
        />
      ),
      color: theme.colors.info,
    },
    {
      id: 'biometric',
      title: 'Biometric Security',
      subtitle: 'Use fingerprint or face recognition',
      icon: 'finger-print-outline',
      onPress: () => handleBiometricToggle(!biometricEnabled),
      rightComponent: (
        <Switch
          value={biometricEnabled}
          onValueChange={handleBiometricToggle}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary + '40',
          }}
          thumbColor={
            biometricEnabled
              ? theme.colors.onPrimary
              : theme.colors.onSurfaceVariant
          }
        />
      ),
      color: theme.colors.warning,
    },
    {
      id: 'export',
      title: 'Data Export',
      subtitle: 'Download your data and messages',
      icon: 'download-outline',
      onPress: handleExportData,
      color: theme.colors.success,
    },
    // Test options removed for production build
  ];

  // Admin-only debug options
  const adminDebugOptions = [
    {
      id: 'authDebugger',
      title: 'Auth Debugger',
      subtitle: 'Debug authentication and network issues',
      icon: 'bug-outline',
      onPress: () => onNavigate('authDebugger'),
      color: theme.colors.warning,
    },
    {
      id: 'debug-websocket',
      title: '🔌 WebSocket Test Suite',
      subtitle: 'Test WebSocket connectivity and real-time functionality',
      icon: 'bug-outline',
      onPress: () => onNavigate('websocketTest'),
      color: theme.colors.error,
    },
  ];

  // Combine settings options based on admin status
  const settingsOptions = isAdmin
    ? [...baseSettingsOptions, ...adminDebugOptions]
    : baseSettingsOptions;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate('settingsHub')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Debug button removed for production build */}
        <Animated.View
          style={[
            styles.optionsContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {settingsOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                index === settingsOptions.length - 1 && styles.lastOptionCard,
              ]}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${option.color}15` },
                  ]}
                >
                  <Icon name={option.icon} size={24} color={option.color} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                {(option as SettingsOption).rightComponent ? (
                  (option as SettingsOption).rightComponent
                ) : (
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[styles.footer, { transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.footerText}>Whispr v1.1.4 • Made with ❤️</Text>
        </Animated.View>
      </ScrollView>

      <NavigationMenu currentScreen="settings" onNavigate={onNavigate} />

      {/* Notification Settings Dialog */}
      <Modal
        visible={showNotificationDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotificationDialog(false)}
        onShow={() => {
          // Refresh notification state when dialog opens
          loadAppNotificationState();
        }}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationDialog(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              {/* App-level Notifications Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Icon
                    name="notifications-outline"
                    size={24}
                    color={theme.colors.primary}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Notifications</Text>
                    <Text style={styles.settingDescription}>
                      Enable or disable notifications for Whispr
                    </Text>
                  </View>
                </View>
                <Switch
                  value={appNotificationEnabled}
                  onValueChange={handleAppNotificationToggle}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primary + '40',
                  }}
                  thumbColor={
                    appNotificationEnabled
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Device Settings Toggle */}
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Icon
                    name="settings-outline"
                    size={24}
                    color={theme.colors.primary}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>
                      Notification Settings
                    </Text>
                    <Text style={styles.settingDescription}>
                      Open device settings to configure notification preferences
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleOpenDeviceSettings}
                  style={styles.settingsButton}
                >
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Test modals removed for production build */}
    </Animated.View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Space for navigation menu
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: spacing.lg,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
    },
    headerTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onSurface,
      fontWeight: 'bold',
    },
    headerSpacer: {
      width: 40, // Same width as back button for centering
    },
    optionsContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    lastOptionCard: {
      marginBottom: 0,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    optionText: {
      flex: 1,
    },
    optionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    optionSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    footerText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    closeButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.xl,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      ...theme.shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: 'bold',
    },
    modalCloseButton: {
      padding: spacing.xs,
      borderRadius: borderRadius.full,
    },
    modalBody: {
      padding: spacing.lg,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.md,
    },
    settingIcon: {
      marginRight: spacing.md,
    },
    settingTextContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    settingDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: spacing.md,
    },
    settingsButton: {
      padding: spacing.sm,
    },
  });

export default SettingsScreen;
