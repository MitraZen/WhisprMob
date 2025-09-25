// MINIMAL BULLETPROOF THEME - ABSOLUTE MINIMUM
// This is the most minimal possible theme to eliminate any undefined access

// SPACING - DIRECT VALUES ONLY
export const spacingXs = 4;
export const spacingSm = 8;
export const spacingMd = 16;
export const spacingLg = 24;
export const spacingXl = 32;
export const spacingXxl = 48;
export const spacingXxxl = 64;

// BORDER RADIUS - DIRECT VALUES ONLY
export const borderRadiusSm = 4;
export const borderRadiusMd = 8;
export const borderRadiusLg = 12;
export const borderRadiusXl = 16;
export const borderRadiusFull = 9999;

// COLORS - DIRECT VALUES ONLY
export const colorPrimary = '#2563eb';
export const colorSecondary = '#7c3aed';
export const colorSurface = '#ffffff';
export const colorBackground = '#f8fafc';
export const colorError = '#dc2626';
export const colorOnSurface = '#1f2937';
export const colorOnBackground = '#1f2937';
export const colorText = '#1f2937';
export const colorTextSecondary = '#6b7280';
export const colorBorder = '#e5e7eb';
export const colorAccent = '#06b6d4';
export const colorSuccess = '#10b981';
export const colorWarning = '#f59e0b';

// BACKWARD COMPATIBILITY - MINIMAL OBJECTS
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const theme = {
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    surface: '#ffffff',
    surfaceVariant: '#f1f5f9',
    background: '#f8fafc',
    error: '#dc2626',
    onSurface: '#1f2937',
    onSurfaceVariant: '#64748b',
    onBackground: '#1f2937',
    onPrimary: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
  },
  typography: {
    displaySmall: {
      fontSize: 36,
      fontWeight: '400',
      lineHeight: 44,
    },
    headlineSmall: {
      fontSize: 24,
      fontWeight: '400',
      lineHeight: 32,
    },
    headlineMedium: {
      fontSize: 28,
      fontWeight: '400',
      lineHeight: 36,
    },
    titleLarge: {
      fontSize: 22,
      fontWeight: '400',
      lineHeight: 28,
    },
    titleMedium: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    labelLarge: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 16,
    },
  },
};

export const moodConfig = {
  happy: { emoji: '😊', color: '#fbbf24', description: 'Feeling joyful and positive' },
  sad: { emoji: '😢', color: '#3b82f6', description: 'Feeling down or melancholic' },
  excited: { emoji: '🤩', color: '#f59e0b', description: 'Full of energy and enthusiasm' },
  anxious: { emoji: '😰', color: '#ef4444', description: 'Feeling worried or nervous' },
  calm: { emoji: '😌', color: '#10b981', description: 'Peaceful and relaxed' },
  angry: { emoji: '😠', color: '#dc2626', description: 'Feeling frustrated or mad' },
  curious: { emoji: '🤔', color: '#8b5cf6', description: 'Wanting to learn and explore' },
  lonely: { emoji: '😔', color: '#6b7280', description: 'Feeling isolated or alone' },
  grateful: { emoji: '🙏', color: '#059669', description: 'Feeling thankful and appreciative' },
  hopeful: { emoji: '✨', color: '#06b6d4', description: 'Optimistic about the future' },
};

export const getMoodConfig = (mood: string) => {
  return moodConfig[mood as keyof typeof moodConfig] || moodConfig.happy;
};