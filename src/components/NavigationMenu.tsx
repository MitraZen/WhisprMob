import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';
import { useTheme } from '@/store/ThemeContext';

interface NavigationMenuProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({ currentScreen, onNavigate }) => {
  const { theme } = useTheme();
  const menuItems = [
    { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
    { id: 'sentNotes', label: 'Sent', icon: 'send-outline' },
    { id: 'buddies', label: 'Buddies', icon: 'people-outline' },
    { id: 'notifications', label: 'Alerts', icon: 'notifications-outline' },
    { id: 'profile', label: 'Profile', icon: 'person-outline' },
  ];
  
  // Create animated values for each menu item
  const animatedValues = useRef(
    menuItems.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  // Animate active tab lift effect
  useEffect(() => {
    menuItems.forEach(item => {
      const isActive = currentScreen === item.id;
      Animated.timing(animatedValues[item.id], {
        toValue: isActive ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [currentScreen]);

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => {
          const animatedStyle = {
            transform: [
              {
                translateY: animatedValues[item.id].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2], // Subtle lift effect
                }),
              },
              {
                scale: animatedValues[item.id].interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05], // Subtle scale effect
                }),
              },
            ],
            shadowOpacity: animatedValues[item.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15], // Enhanced shadow when active
            }),
            shadowRadius: animatedValues[item.id].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 8], // Enhanced shadow radius when active
            }),
          };

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.menuItemWrapper,
                animatedStyle,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  currentScreen === item.id && styles.activeMenuItem,
                  index === 0 && styles.firstMenuItem,
                  index === menuItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={() => onNavigate(item.id)}
                activeOpacity={0.7}
              >
                <Icon 
                  name={item.icon} 
                  size={24} 
                  color={currentScreen === item.id ? '#7c3aed' : '#6b7280'} 
                  style={styles.menuIcon}
                />
                <Text style={[
                  styles.menuLabel,
                  currentScreen === item.id && styles.activeMenuLabel
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
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
  menuItemWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.xs,
    backgroundColor: 'transparent',
    height: 64, // consistent item height
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    elevation: 0, // Will be animated
  },
  activeMenuItem: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  menuIcon: {
    marginBottom: 4,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 0,
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

