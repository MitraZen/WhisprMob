import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';
import { NavigationMenu } from '@/components/NavigationMenu';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate, user, onLogout }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

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
    isDestructive = false 
  }: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingContent}>
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
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('whispr-notes')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your account and preferences</Text>
          </View>
        </View>
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('notes')}
          >
            <Text style={styles.navButtonText}>📝 Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('buddies')}
          >
            <Text style={styles.navButtonText}>👥 Buddies</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.navButtonText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navButton, styles.activeNavButton]}
            onPress={() => onNavigate('settings')}
          >
            <Text style={styles.activeNavButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => onNavigate('profile')}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
          <SettingItem
            title="Export Data"
            subtitle="Download your data"
            onPress={handleExportData}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
          <SettingItem
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            title="Push Notifications"
            subtitle="Receive notifications for new messages"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                thumbColor={notificationsEnabled ? theme.colors.primary : '#f3f4f6'}
              />
            }
          />
        </View>
      </View>

      {/* Privacy & Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            title="Location Services"
            subtitle="Allow location-based features"
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
            rightComponent={
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                thumbColor={biometricEnabled ? theme.colors.primary : '#f3f4f6'}
              />
            }
          />
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            title="Dark Mode"
            subtitle="Use dark theme"
            rightComponent={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#e5e7eb', true: '#dbeafe' }}
                thumbColor={darkModeEnabled ? theme.colors.primary : '#f3f4f6'}
              />
            }
          />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={handleSupport}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
          <SettingItem
            title="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={handlePrivacyPolicy}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
          <SettingItem
            title="Terms of Service"
            subtitle="Read our terms of service"
            onPress={handleTermsOfService}
            rightComponent={<Text style={styles.chevron}>›</Text>}
          />
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            title="Version"
            subtitle="1.0.0"
          />
          <SettingItem
            title="Build"
            subtitle="2024.01.21"
          />
        </View>
      </View>


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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: spacing.md,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
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
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingContent: {
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
    color: theme.colors.error,
  },
  chevron: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.onBackground,
    marginBottom: spacing.xs,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default SettingsScreen;
