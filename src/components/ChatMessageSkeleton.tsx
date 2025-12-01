import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/store/ThemeContext';

interface ChatMessageSkeletonProps {
  count?: number;
}

export const ChatMessageSkeleton: React.FC<ChatMessageSkeletonProps> = ({ count = 6 }) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.9],
  });

  const styles = createStyles(theme);

  // Create skeleton messages with alternating sent/received pattern
  const skeletonMessages = Array.from({ length: count }, (_, index) => {
    const isSent = index % 3 !== 1; // Pattern: sent, received, sent, sent, received, sent...
    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isSent ? styles.sentMessage : styles.receivedMessage,
        ]}
      >
        <Animated.View
          style={[
            styles.skeletonBubble,
            isSent ? styles.sentBubble : styles.receivedBubble,
          ]}
        >
          {/* Skeleton lines with varying widths */}
          <Animated.View 
            style={[
              styles.skeletonLine, 
              { width: isSent ? '85%' : '70%', opacity: shimmerOpacity }
            ]} 
          />
          {index % 2 === 0 && (
            <Animated.View 
              style={[
                styles.skeletonLine, 
                { width: isSent ? '60%' : '50%', marginTop: 6, opacity: shimmerOpacity }
              ]} 
            />
          )}
          {index % 3 === 0 && (
            <Animated.View 
              style={[
                styles.skeletonLine, 
                { width: isSent ? '45%' : '40%', marginTop: 6, opacity: shimmerOpacity }
              ]} 
            />
          )}
        </Animated.View>
      </View>
    );
  });

  return <View style={styles.container}>{skeletonMessages}</View>;
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createStyles = (theme: any) => {
  // Get base colors with higher opacity for better visibility
  const sentBubbleColor = theme.colors.primary
    ? hexToRgba(theme.colors.primary, 0.35)
    : theme.isDark
    ? 'rgba(139, 92, 246, 0.35)' // Purple with opacity
    : 'rgba(99, 102, 241, 0.35)'; // Indigo with opacity
  
  // For received bubbles, use a more visible color
  const receivedBubbleColor = theme.isDark
    ? 'rgba(51, 65, 85, 0.6)' // Dark slate with opacity for dark theme
    : 'rgba(248, 250, 252, 0.9)'; // Light surface variant for light theme

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    messageContainer: {
      marginVertical: 4,
      paddingHorizontal: 0,
    },
    sentMessage: {
      alignItems: 'flex-end',
    },
    receivedMessage: {
      alignItems: 'flex-start',
    },
    skeletonBubble: {
      maxWidth: '75%',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      minWidth: 60,
      shadowColor: theme.isDark ? '#000' : '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: theme.isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    sentBubble: {
      backgroundColor: sentBubbleColor,
      borderBottomRightRadius: 4,
    },
    receivedBubble: {
      backgroundColor: receivedBubbleColor,
      borderBottomLeftRadius: 4,
      borderWidth: theme.isDark ? 0.5 : 0.5,
      borderColor: theme.isDark 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.05)',
    },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.4)'
        : 'rgba(0, 0, 0, 0.2)',
    },
  });
};

