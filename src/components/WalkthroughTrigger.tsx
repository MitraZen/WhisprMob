import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { useWalkthrough } from '@/store/WalkthroughContext';

interface WalkthroughTriggerProps {
  walkthroughId: string;
  children?: React.ReactNode;
  style?: any;
  text?: string;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
}

export const WalkthroughTrigger: React.FC<WalkthroughTriggerProps> = ({
  walkthroughId,
  children,
  style,
  text = 'Tour',
  icon = 'help-circle',
  size = 'medium',
}) => {
  const { theme } = useTheme();
  const { showWalkthrough } = useWalkthrough();

  const handlePress = async () => {
    await showWalkthrough(walkthroughId);
  };

  const sizeStyles = {
    small: {
      padding: 8,
      fontSize: 12,
      iconSize: 16,
    },
    medium: {
      padding: 12,
      fontSize: 14,
      iconSize: 20,
    },
    large: {
      padding: 16,
      fontSize: 16,
      iconSize: 24,
    },
  };

  const currentSize = sizeStyles[size];

  if (children) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.surfaceVariant,
          padding: currentSize.padding,
        },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Icon
        name={icon}
        size={currentSize.iconSize}
        color={theme.colors.primary}
      />
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.primary,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles for custom children
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  text: {
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default WalkthroughTrigger;
