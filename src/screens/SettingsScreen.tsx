import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Animated, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { notificationService } from '@/services/notificationService';
import PermissionService from '../services/permissionService';
import PermissionInitializer from '../services/permissionInitializer';

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
    setBiometricEnabled(value);
    // Add biometric logic here if needed
  };

  const handleRequestPermissions = async () => {
    try {
      // Get current user ID from auth context
      const currentUserId = user?.id || 'anonymous';
      await PermissionInitializer.initializePermissions(currentUserId);
      await loadPermissionStatus();
      Alert.alert('Success', 'Permissions updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const handleExportData = () => {
    Alert.alert('Export Data', 'Your data export will be sent to your email address.');
  };

  const settingsOptions = [
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
          trackColor={{ false: '#e5e7eb', true: '#7c3aed' }}
          thumbColor={notificationsEnabled ? '#fff' : '#f3f4f6'}
        />
      ),
      color: '#7c3aed'
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
          trackColor={{ false: '#e5e7eb', true: '#7c3aed' }}
          thumbColor={isDark ? '#fff' : '#f3f4f6'}
        />
      ),
      color: '#059669'
    },
    {
      id: 'permissions',
      title: 'Permission Management',
      subtitle: 'Camera, location, storage permissions',
      icon: 'shield-checkmark-outline',
      onPress: handleRequestPermissions,
      color: '#dc2626'
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
          trackColor={{ false: '#e5e7eb', true: '#7c3aed' }}
          thumbColor={locationEnabled ? '#fff' : '#f3f4f6'}
        />
      ),
      color: '#0891b2'
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
          trackColor={{ false: '#e5e7eb', true: '#7c3aed' }}
          thumbColor={biometricEnabled ? '#fff' : '#f3f4f6'}
        />
      ),
      color: '#7c2d12'
    },
    {
      id: 'export',
      title: 'Data Export',
      subtitle: 'Download your data and messages',
      icon: 'download-outline',
      onPress: handleExportData,
      color: '#16a34a'
    }
  ];

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

        {/* Settings Options */}
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
                {option.rightComponent ? (
                  option.rightComponent
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
});

export default SettingsScreen;