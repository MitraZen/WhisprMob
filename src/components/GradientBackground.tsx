import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@/store/ThemeContext';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'default' | 'subtle' | 'vibrant';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ 
  children, 
  style, 
  variant = 'default' 
}) => {
  const { theme, isDark } = useTheme();

  const getGradientColors = () => {
    switch (variant) {
      case 'subtle':
        return isDark 
          ? ['#1e293b', '#334155', '#475569'] 
          : ['#f8fafc', '#f1f5f9', '#e2e8f0'];
      case 'vibrant':
        return isDark 
          ? ['#0f172a', '#1e293b', '#334155'] 
          : ['#f0f9ff', '#e0f2fe', '#bae6fd'];
      default: // 'default'
        return isDark 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#f8fafc', '#e2e8f0', '#cbd5e1'];
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={[styles.container, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default GradientBackground;
