import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, spacing, borderRadius } from '@/utils/theme';

interface NavigationMenuProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ currentScreen, onNavigate }) => {
  const menuItems = [
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'buddies', label: 'Buddies', icon: '👥' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              currentScreen === item.id && styles.activeMenuItem,
            ]}
            onPress={() => onNavigate(item.id)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text 
              style={[
                styles.menuLabel,
                currentScreen === item.id && styles.activeMenuLabel
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.glass,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: spacing.sm,
    ...theme.shadows.lg,
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 70,
  },
  menuItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    flex: 1,
    maxWidth: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.sm,
  },
  activeMenuItem: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  menuIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  menuLabel: {
    fontSize: 11,
    color: theme.colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeMenuLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

