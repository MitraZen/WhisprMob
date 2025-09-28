import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Animated, Platform } from 'react-native';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { notificationService } from '@/services/notificationService';
import PermissionService, { PermissionStatus } from '../services/permissionService';
import PermissionInitializer from '../services/permissionInitializer';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate, user, onLogout }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [permissions, setPermissions] = useState<PermissionStatus>({
    notifications: false,
    storage: false,
    camera: false,
    location: false,
    contacts: false,
    phone: false,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const styles = createStyles(theme);

  // Initialize animations and load permissions
  React.useEffect(() => {
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
      const status = await PermissionService.getAllPermissionStatus();
      setPermissions(status);
    } catch (error) {
      console.error('Error loading permission status:', error);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handlePermissionRequest = async (permissionType: keyof PermissionStatus) => {
    try {
      const granted = await PermissionService.requestPermissionWithDialog(permissionType as keyof PermissionStatus);
      if (granted) {
        // Reload permission status to get the updated state
        await loadPermissionStatus();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  const handleNotificationSettings = () => {
    Alert.alert(
      'Notification Settings',
      'Manage your notification preferences',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable All', onPress: () => setNotificationsEnabled(true) },
        { text: 'Disable All', onPress: () => setNotificationsEnabled(false) },
        { text: 'Test Notification', onPress: handleTestNotification },
        { text: 'Request Permissions', onPress: handleRequestPermissions },
        { text: 'Customize', onPress: () => {
          // TODO: Open detailed notification settings
          Alert.alert('Customize', 'Detailed notification settings coming soon!');
        }},
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.testNotification();
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleRequestPermissions = async () => {
    try {
      Alert.alert(
        'Request Permissions',
        'This will show the permission request dialog as it appears on app startup.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Permissions',
            onPress: async () => {
              // Reset permission state to allow re-requesting
              PermissionInitializer.resetPermissionState();
              await PermissionInitializer.initializePermissions(user.id);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: onLogout
        },
      ]
    );
  };


  const handleExportData = () => {
    Alert.alert('Export Data', 'Your data export will be sent to your email address.');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Privacy policy will open in your browser.');
  };

  const handleTermsOfService = () => {
    Alert.alert('Terms of Service', 'Terms of service will open in your browser.');
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Contact support at support@whispr.com');
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    onPress, 
    rightComponent, 
    isDestructive = false,
    icon = '⚙️'
  }: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    isDestructive?: boolean;
    icon?: string;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, isDestructive && styles.destructiveItem]} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingLeft}>
          <Text style={styles.settingIcon}>{icon}</Text>
          <View style={styles.settingTextContainer}>
            <Text style={[
              styles.settingTitle,
              isDestructive && styles.destructiveText
            ]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.settingSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        {rightComponent}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Modern Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('notes')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonIcon}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your account and preferences</Text>
          </View>
        </View>
      </Animated.View>

      {/* Account Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('account')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>⚙️</Text>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.account ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.account && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Edit Profile"
              subtitle="Update your personal information"
              icon="👤"
              onPress={() => onNavigate('profile')}
              rightComponent={<Text style={styles.chevron}>›</Text>}
            />
            <SettingItem
              title="Export Data"
              subtitle="Download your data"
              icon="📤"
              onPress={handleExportData}
              rightComponent={<Text style={styles.chevron}>›</Text>}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Notifications Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('notifications')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>🔔</Text>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.notifications ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.notifications && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Push Notifications"
              subtitle="Receive notifications for new messages"
              icon="📱"
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                  thumbColor={notificationsEnabled ? theme.colors.primary : '#f3f4f6'}
                />
              }
            />
            <SettingItem
              title="Notification Settings"
              subtitle="Customize notification preferences"
              icon="⚙️"
              onPress={handleNotificationSettings}
            />
            <SettingItem
              title="Message Notifications"
              subtitle="Get notified about new messages"
              icon="💬"
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                  thumbColor={notificationsEnabled ? theme.colors.primary : '#f3f4f6'}
                />
              }
            />
            <SettingItem
              title="Note Notifications"
              subtitle="Get notified about new Whispr notes"
              icon="📝"
              rightComponent={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                  thumbColor={notificationsEnabled ? theme.colors.primary : '#f3f4f6'}
                />
              }
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Permissions Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('permissions')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>🔐</Text>
            <Text style={styles.sectionTitle}>Permissions</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.permissions ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.permissions && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Notifications"
              subtitle={permissions.notifications ? "✅ Granted" : "❌ Not granted"}
              icon="🔔"
              onPress={() => handlePermissionRequest('notifications')}
            />
            <SettingItem
              title="Storage"
              subtitle={permissions.storage ? "✅ Granted" : "❌ Not granted"}
              icon="💾"
              onPress={() => handlePermissionRequest('storage')}
            />
            <SettingItem
              title="Camera"
              subtitle={permissions.camera ? "✅ Granted" : "❌ Not granted"}
              icon="📷"
              onPress={() => handlePermissionRequest('camera')}
            />
            <SettingItem
              title="Location"
              subtitle={permissions.location ? "✅ Granted" : "❌ Not granted"}
              icon="📍"
              onPress={() => handlePermissionRequest('location')}
            />
            <SettingItem
              title="Contacts"
              subtitle={permissions.contacts ? "✅ Granted" : "❌ Not granted"}
              icon="👥"
              onPress={() => handlePermissionRequest('contacts')}
            />
            <SettingItem
              title="Phone"
              subtitle={permissions.phone ? "✅ Granted" : "❌ Not granted"}
              icon="📞"
              onPress={() => handlePermissionRequest('phone')}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Privacy & Security Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('privacy')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>🔒</Text>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.privacy ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.privacy && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Location Services"
              subtitle="Allow location-based features"
              icon="📍"
              rightComponent={
                <Switch
                  value={locationEnabled}
                  onValueChange={setLocationEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                  thumbColor={locationEnabled ? theme.colors.primary : '#f3f4f6'}
                />
              }
            />
            <SettingItem
              title="Biometric Authentication"
              subtitle="Use fingerprint or face ID"
              icon="👆"
              rightComponent={
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                  thumbColor={biometricEnabled ? theme.colors.primary : '#f3f4f6'}
                />
              }
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Appearance Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('appearance')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>🎨</Text>
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.appearance ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.appearance && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Dark Mode"
              subtitle="Use dark theme"
              icon="🌙"
              rightComponent={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                  thumbColor={isDark ? theme.colors.primary : '#f3f4f6'}
                />
              }
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Support Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('support')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>📖</Text>
            <Text style={styles.sectionTitle}>Support</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.support ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.support && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Help & Support"
              subtitle="Get help and contact support"
              icon="❓"
              onPress={handleSupport}
              rightComponent={<Text style={styles.chevron}>›</Text>}
            />
            <SettingItem
              title="Privacy Policy"
              subtitle="Read our privacy policy"
              icon="📄"
              onPress={handlePrivacyPolicy}
              rightComponent={<Text style={styles.chevron}>›</Text>}
            />
            <SettingItem
              title="Terms of Service"
              subtitle="Read our terms of service"
              icon="📋"
              onPress={handleTermsOfService}
              rightComponent={<Text style={styles.chevron}>›</Text>}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* App Info Section */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection('appInfo')}
        >
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionIcon}>ℹ️</Text>
            <Text style={styles.sectionTitle}>App Information</Text>
          </View>
          <Text style={styles.sectionChevron}>
            {expandedSections.appInfo ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        {expandedSections.appInfo && (
          <Animated.View style={styles.sectionContent}>
            <SettingItem
              title="Version"
              subtitle="1.0.0"
              icon="📱"
          />
            <SettingItem
              title="Build"
              subtitle="2024.01.21"
              icon="🔧"
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Logout Section */}
      <Animated.View 
        style={[
          styles.logoutSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <SettingItem
          title="Logout"
          subtitle="Sign out of your account"
          icon="🚪"
          isDestructive={true}
          onPress={handleLogout}
          rightComponent={<Text style={styles.chevron}>›</Text>}
        />
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ by the Whispr team
        </Text>
        <Text style={styles.footerSubtext}>
          © 2024 Whispr. All rights reserved.
        </Text>
      </View>
      
      {/* Bottom Navigation Menu */}
      <NavigationMenu currentScreen="settings" onNavigate={onNavigate} />
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  header: {
    backgroundColor: '#7c3aed',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra padding for camera hole
    paddingBottom: spacing.md, // Reduced from lg to md
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  backButtonIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
  },
  activeNavButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activeNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sectionChevron: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  sectionContent: {
    padding: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  destructiveItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 16,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  destructiveText: {
    color: '#ef4444',
  },
  chevron: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  logoutSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    ...theme.shadows.sm,
    padding: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: spacing.xs,
    fontWeight: '400',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '300',
  },
});

export default SettingsScreen;
