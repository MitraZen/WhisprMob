// TextInput Color Utility
// This utility ensures proper text contrast for TextInput components

import { Platform } from 'react-native';

/**
 * Gets the appropriate text color for TextInput components
 * Ensures proper contrast against light backgrounds
 */
export const getTextInputColor = (theme?: any): string => {
  // If theme is provided, use theme colors
  if (theme?.colors?.onSurface) {
    return theme.colors.onSurface;
  }
  
  // Fallback to platform-specific colors that ensure good contrast
  if (Platform.OS === 'ios') {
    return '#000000'; // Black for iOS
  } else {
    return '#212121'; // Dark gray for Android
  }
};

/**
 * Gets placeholder text color for TextInput components
 */
export const getPlaceholderTextColor = (theme?: any): string => {
  // If theme is provided, use theme colors
  if (theme?.colors?.onSurfaceVariant) {
    return theme.colors.onSurfaceVariant;
  }
  
  // Fallback colors
  return '#9ca3af'; // Light gray
};

/**
 * Creates safe TextInput styles that ensure proper contrast
 */
export const createSafeTextInputStyles = (theme?: any) => ({
  color: getTextInputColor(theme),
  placeholderTextColor: getPlaceholderTextColor(theme),
});

/**
 * Gets text color for different contexts
 */
export const getTextColor = {
  primary: (theme?: any) => theme?.colors?.onSurface || '#212121',
  secondary: (theme?: any) => theme?.colors?.onSurfaceVariant || '#6b7280',
  inverse: (theme?: any) => theme?.colors?.onPrimary || '#ffffff',
  input: getTextInputColor,
  placeholder: getPlaceholderTextColor,
};



