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
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              currentScreen === item.id && styles.activeMenuItem
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: spacing.sm,
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  menuItem: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 60,
  },
  activeMenuItem: {
    backgroundColor: theme.colors.primary + '20', // 20% opacity
  },
  menuIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  menuLabel: {
    fontSize: 12,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  activeMenuLabel: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});

