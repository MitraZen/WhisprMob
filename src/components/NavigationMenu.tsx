import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';

interface NavigationMenuProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ currentScreen, onNavigate }) => {
  const { theme } = useTheme();
  const menuItems = [
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'buddies', label: 'Buddies', icon: '👥' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];
  
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              currentScreen === item.id && styles.activeMenuItem,
              index === 0 && styles.firstMenuItem,
              index === menuItems.length - 1 && styles.lastMenuItem,
            ]}
            onPress={() => onNavigate(item.id)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={[
              styles.menuLabel,
              currentScreen === item.id && styles.activeMenuLabel
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Extra padding for home indicator
    paddingTop: spacing.sm,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: theme.colors.text === '#ffffff' ? 0.3 : 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    flex: 1,
    marginHorizontal: spacing.xs,
    backgroundColor: 'transparent',
    minHeight: 60,
    justifyContent: 'center',
  },
  activeMenuItem: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  menuIcon: {
    fontSize: 22,
    marginBottom: spacing.xs,
    opacity: 0.8,
  },
  menuLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  activeMenuLabel: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  firstMenuItem: {
    marginLeft: 0,
  },
  lastMenuItem: {
    marginRight: 0,
  },
});

