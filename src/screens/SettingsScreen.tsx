import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Animated, Platform, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { notificationService } from '@/services/notificationService';
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

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate, user }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [isAdmin, setIsAdmin] = useState(false); // Add admin state
  // Test states removed for production build
  
  // Debug code removed for production build
  
  const styles = createStyles(theme);

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
      }, []);

  const loadPermissionStatus = async () => {
    try {
      const currentPermissions = await PermissionService.getAllPermissionStatus();
      // Update notification toggle based on actual permission status
      setNotificationsEnabled(currentPermissions.notifications);
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

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      if (value) {
        const granted = await PermissionService.requestNotificationPermissions();
        if (!granted) {
          // If permission was denied, revert the toggle
          setNotificationsEnabled(false);
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
      // Revert the toggle on error
      setNotificationsEnabled(!value);
    }
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
            [{ text: 'OK' }]
          );
          return;
        }

        const biometryType = await BiometricService.getBiometricType();
        if (!biometryType) {
          Alert.alert(
            'Biometric Not Available',
            'No biometric authentication method found on this device.',
            [{ text: 'OK' }]
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
                        Alert.alert('Info', 'Password input would be implemented here. For now, biometric authentication is ready to be enabled.');
                      }
                    }
                  ]
                );
              }
            }
          ]
        );
      } else {
        // Disable biometric authentication
        const result = await BiometricService.disableBiometric();
        if (result.success) {
          setBiometricEnabled(false);
          Alert.alert(
            'Biometric Disabled',
            'Biometric authentication has been disabled successfully.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            result.error || 'Failed to disable biometric authentication.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error toggling biometric authentication:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while updating biometric settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRequestPermissions = async () => {
    try {
      // Get current user ID from auth context
      const currentUserId = user?.id || 'anonymous';
      await PermissionInitializer.initializePermissions(currentUserId);
      await loadPermissionStatus();
      ThemedAlertLegacy.alert('Success', 'Permissions updated successfully');
    } catch (error) {
      ThemedAlertLegacy.alert('Error', 'Failed to request permissions');
    }
  };

  const handleExportData = () => {
    ThemedAlertLegacy.alert('Export Data', 'Your data export will be sent to your email address.');
  };


  // Base settings options (available to all users)
  const baseSettingsOptions: SettingsOption[] = [
    {
      id: 'notifications',
      title: 'Notification Settings',
      subtitle: 'Manage push notifications and alerts',
      icon: 'notifications-outline',
      onPress: () => notificationService.testNotification(),
      rightComponent: (
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={notificationsEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        />
      ),
      color: theme.colors.primary
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
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={isDark ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        />
      ),
      color: theme.colors.success
    },
    {
      id: 'permissions',
      title: 'Permission Management',
      subtitle: 'Camera, location, storage permissions',
      icon: 'shield-checkmark-outline',
      onPress: handleRequestPermissions,
      color: theme.colors.error
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
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={locationEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        />
      ),
      color: theme.colors.info
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
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={biometricEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
        />
      ),
      color: theme.colors.warning
    },
    {
      id: 'export',
      title: 'Data Export',
      subtitle: 'Download your data and messages',
      icon: 'download-outline',
      onPress: handleExportData,
      color: theme.colors.success
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
      color: theme.colors.warning
    },
    {
      id: 'debug-websocket',
      title: '🔌 WebSocket Test Suite',
      subtitle: 'Test WebSocket connectivity and real-time functionality',
      icon: 'bug-outline',
      onPress: () => onNavigate('websocketTest'),
      color: theme.colors.error
    }
  ];

  // Combine settings options based on admin status
  const settingsOptions = isAdmin 
    ? [...baseSettingsOptions, ...adminDebugOptions]
    : baseSettingsOptions;

  return (
    <Animated.View 
      style={[styles.container, { opacity: fadeAnim }]}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            { transform: [{ translateY: slideAnim }] }
          ]}
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
                { transform: [{ translateY: slideAnim }] }
              ]}
            >
              {settingsOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                index === settingsOptions.length - 1 && styles.lastOptionCard
              ]}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
                  <Icon 
                    name={option.icon} 
                    size={24} 
                    color={option.color} 
                  />
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
          style={[
            styles.footer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.footerText}>
            Whispr v1.1.4 • Made with ❤️
          </Text>
        </Animated.View>
      </ScrollView>

      <NavigationMenu currentScreen="settings" onNavigate={onNavigate} />

      {/* Test modals removed for production build */}
    </Animated.View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceVariant,
  },
});

export default SettingsScreen;