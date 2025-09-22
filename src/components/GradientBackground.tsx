import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '@/utils/theme';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'accent';
  direction?: 'vertical' | 'horizontal' | 'diagonal';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  variant = 'primary',
  direction = 'vertical',
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return [theme.colors.gradientStart, theme.colors.gradientEnd];
      case 'secondary':
        return [theme.colors.gradientSecondary, theme.colors.gradientSecondaryEnd];
      case 'accent':
        return [theme.colors.accent, theme.colors.accentSecondary];
      default:
        return [theme.colors.gradientStart, theme.colors.gradientEnd];
    }
  };

  const getGradientDirection = () => {
    switch (direction) {
      case 'horizontal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
      case 'diagonal':
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
      default:
        return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      {...getGradientDirection()}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});




