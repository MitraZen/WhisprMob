import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { spacing } from '@/utils/theme';

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.menuContainer}>
          {menuItems.map(item => {
            const isActive = currentScreen === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => onNavigate(item.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.menuIcon, isActive && styles.activeIcon]}>{item.icon}</Text>
                <Text style={[styles.menuLabel, isActive && styles.active]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  menuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm, // reduced from spacing.md
    paddingBottom: spacing.md, // add extra bottom padding for safe area
    minHeight: 60, // reduced from 70
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    opacity: 0.8, // increased from 0.7 for better visibility
  },
  activeIcon: {
    opacity: 1,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151', // darker gray for better visibility
    marginTop: 2, // reduced from 4 to bring text closer to icon
  },
  active: {
    color: '#7C3AED', // darker purple for better contrast
    fontWeight: '600',
  },
});
