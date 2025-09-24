import { MoodType } from '@/types';

export const theme = {
  colors: {
    // Whispr website theme colors
    primary: '#2563eb', // Blue from website
    secondary: '#7c3aed', // Purple accent
    surface: '#ffffff',
    background: '#f8fafc', // Light gray background
    error: '#dc2626',
    onSurface: '#1f2937', // Dark gray text
    onBackground: '#1f2937',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    // Additional Whispr brand colors
    accent: '#06b6d4', // Cyan accent
    success: '#10b981', // Green for success states
    warning: '#f59e0b', // Amber for warnings
  },
};

export const moodConfig: Record<MoodType, { emoji: string; color: string; description: string }> = {
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};


