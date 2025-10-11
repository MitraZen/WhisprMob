import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Animated, 
  Platform,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';
import { NavigationMenu } from '@/components/NavigationMenu';
import { useAuth } from '@/store/AuthContext';

interface SettingsHubScreenProps {
  onNavigate: (screen: string) => void;
  user: any;
}

const SettingsHubScreen: React.FC<SettingsHubScreenProps> = ({ onNavigate, user }) => {
  const { theme } = useTheme();
  const { logout } = useAuth();
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
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            onNavigate('welcome');
          }
        }
      ]
    );
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Profile Management',
      subtitle: 'View & edit your profile',
      icon: 'person-outline',
      onPress: () => onNavigate('profile'),
      color: '#7c3aed'
    },
    {
      id: 'settings',
      title: 'App Settings',
      subtitle: 'Notifications, theme, permissions',
      icon: 'settings-outline',
      onPress: () => onNavigate('settings'),
      color: '#059669'
    },
    {
      id: 'logout',
      title: 'Sign Out',
      subtitle: 'Logout from your account',
      icon: 'log-out-outline',
      onPress: handleLogout,
      color: '#dc2626'
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
            onPress={() => onNavigate('notes')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Welcome Section */}
        <Animated.View 
          style={[
            styles.welcomeSection,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0)?.toUpperCase() || user?.anonymousId?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.welcomeText}>
            Hello, {user?.username || user?.anonymousId || 'User'}!
          </Text>
          <Text style={styles.subtitleText}>
            Manage your account and app preferences
          </Text>
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
                <Icon 
                  name="chevron-forward" 
                  size={20} 
                  color={theme.colors.onSurfaceVariant} 
                />
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

      <NavigationMenu currentScreen="settingsHub" onNavigate={onNavigate} />
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
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeText: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitleText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
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

export default SettingsHubScreen;
