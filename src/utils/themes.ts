import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { MoodType } from '@/types';

// Shared theme properties
const sharedThemeProperties = {
  // Modern typography scale
  typography: {
    displayLarge: {
      fontSize: 32,
      fontWeight: '800' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    displayMedium: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.25,
    },
    displaySmall: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      letterSpacing: 0,
    },
    headlineLarge: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: 0,
    },
    headlineMedium: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 26,
      letterSpacing: 0,
    },
    headlineSmall: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0,
    },
    titleLarge: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
      letterSpacing: 0,
    },
    titleMedium: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    titleSmall: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 18,
      letterSpacing: 0.1,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0.25,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
    labelSmall: {
      fontSize: 10,
      fontWeight: '500' as const,
      lineHeight: 14,
      letterSpacing: 0.5,
    },
  },
  
  // Modern spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  // Modern border radius scale
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    full: 9999,
  },
  
  // Modern shadow system
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  
  // Modern animation durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

// Light Theme
export const lightTheme = {
  ...MD3LightTheme,
  ...sharedThemeProperties,
  colors: {
    ...MD3LightTheme.colors,
    // Modern Whispr theme colors
    primary: '#6366f1', // Modern indigo
    secondary: '#8b5cf6', // Modern purple
    tertiary: '#06b6d4', // Modern cyan
    surface: '#ffffff',
    background: '#fafbfc', // Very light gray
    surfaceVariant: '#f8fafc', // Light surface variant
    error: '#ef4444', // Modern red
    warning: '#f59e0b', // Modern amber
    success: '#10b981', // Modern emerald
    info: '#3b82f6', // Modern blue
    
    // Text colors
    text: '#1e293b', // Dark slate
    textSecondary: '#64748b', // Slate gray
    onSurface: '#1e293b', // Dark slate
    onBackground: '#1e293b',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurfaceVariant: '#64748b', // Slate gray
    
    // Modern accent colors
    accent: '#06b6d4', // Cyan accent
    accentSecondary: '#ec4899', // Modern pink
    
    // Status colors
    online: '#10b981', // Emerald
    offline: '#94a3b8', // Slate
    away: '#f59e0b', // Amber
    
    // Border and divider colors
    border: '#e2e8f0', // Light slate
    divider: '#f1f5f9', // Very light slate
    
    // Modern glass effect colors
    glass: 'rgba(255, 255, 255, 0.8)',
    glassDark: 'rgba(0, 0, 0, 0.1)',
    
    // Gradient colors
    gradientStart: '#6366f1',
    gradientEnd: '#8b5cf6',
    gradientSecondary: '#06b6d4',
    gradientSecondaryEnd: '#3b82f6',
  },
};

// Dark Theme
export const darkTheme = {
  ...MD3DarkTheme,
  ...sharedThemeProperties,
  colors: {
    ...MD3DarkTheme.colors,
    // Modern Whispr dark theme colors with high contrast
    primary: '#a5b4fc', // Brighter indigo for better visibility
    secondary: '#c4b5fd', // Brighter purple for better visibility
    tertiary: '#67e8f9', // Brighter cyan for better visibility
    surface: '#1e293b', // Dark slate
    background: '#0f172a', // Very dark slate
    surfaceVariant: '#334155', // Medium dark slate
    error: '#fca5a5', // Brighter red for better visibility
    warning: '#fde047', // Brighter amber for better visibility
    success: '#6ee7b7', // Brighter emerald for better visibility
    info: '#93c5fd', // Brighter blue for better visibility
    
    // High contrast text colors
    text: '#ffffff', // Pure white for maximum contrast
    textSecondary: '#e2e8f0', // Light gray for secondary text
    onSurface: '#ffffff', // Pure white for maximum contrast
    onBackground: '#ffffff', // Pure white for maximum contrast
    onPrimary: '#0f172a', // Dark slate
    onSecondary: '#0f172a', // Dark slate
    onSurfaceVariant: '#e2e8f0', // Light gray
    
    // Modern accent colors with high contrast
    accent: '#67e8f9', // Bright cyan accent
    accentSecondary: '#f9a8d4', // Bright pink accent
    
    // Status colors with high contrast
    online: '#6ee7b7', // Bright emerald
    offline: '#94a3b8', // Medium slate
    away: '#fde047', // Bright amber
    
    // Border and divider colors with better visibility
    border: '#64748b', // Lighter border for better visibility
    divider: '#475569', // Lighter divider for better visibility
    
    // Modern glass effect colors
    glass: 'rgba(30, 41, 59, 0.9)', // Darker glass for better contrast
    glassDark: 'rgba(0, 0, 0, 0.4)', // Darker glass
    
    // Gradient colors with high contrast
    gradientStart: '#a5b4fc',
    gradientEnd: '#c4b5fd',
    gradientSecondary: '#67e8f9',
    gradientSecondaryEnd: '#93c5fd',
  },
};

// Default theme (light)
export const theme = lightTheme;

export const moodConfig: Record<MoodType, { emoji: string; color: string; description: string }> = {
  happy: { emoji: '😊', color: '#f59e0b', description: 'Feeling joyful and positive' },
  sad: { emoji: '😢', color: '#3b82f6', description: 'Feeling down or melancholic' },
  excited: { emoji: '🤩', color: '#ec4899', description: 'Full of energy and enthusiasm' },
  anxious: { emoji: '😰', color: '#ef4444', description: 'Feeling worried or nervous' },
  calm: { emoji: '😌', color: '#10b981', description: 'Peaceful and relaxed' },
  angry: { emoji: '😠', color: '#dc2626', description: 'Feeling frustrated or mad' },
  curious: { emoji: '🤔', color: '#8b5cf6', description: 'Wanting to learn and explore' },
  lonely: { emoji: '😔', color: '#64748b', description: 'Feeling isolated or alone' },
  grateful: { emoji: '🙏', color: '#059669', description: 'Feeling thankful and appreciative' },
  hopeful: { emoji: '✨', color: '#06b6d4', description: 'Optimistic about the future' },
};

// Helper function to safely get mood config
export const getMoodConfig = (mood: string | null | undefined) => {
  if (!mood || !moodConfig[mood as MoodType]) {
    return { emoji: '😊', color: '#f59e0b', description: 'Unknown mood' };
  }
  return moodConfig[mood as MoodType];
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  full: 9999,
};
