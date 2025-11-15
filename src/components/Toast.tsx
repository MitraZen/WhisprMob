import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  action,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    } else {
      hideToast();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          backgroundColor: '#10b981',
          iconColor: '#fff',
        };
      case 'error':
        return {
          icon: 'close-circle',
          backgroundColor: '#ef4444',
          iconColor: '#fff',
        };
      case 'warning':
        return {
          icon: 'warning',
          backgroundColor: '#f59e0b',
          iconColor: '#fff',
        };
      default:
        return {
          icon: 'information-circle',
          backgroundColor: theme.colors.primary,
          iconColor: '#fff',
        };
    }
  };

  const config = getToastConfig();
  const styles = createStyles(theme, config.backgroundColor);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.toast}>
        <Icon name={config.icon} size={20} color={config.iconColor} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              hideToast();
            }}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Icon name="close" size={18} color={config.iconColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: any, backgroundColor: string) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 9999,
      alignItems: 'center',
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      minHeight: 48,
      maxWidth: '100%',
      ...theme.shadows.md,
    },
    message: {
      flex: 1,
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
      marginLeft: spacing.sm,
      marginRight: spacing.xs,
    },
    actionButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      marginLeft: spacing.xs,
    },
    actionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    closeButton: {
      padding: 4,
      marginLeft: spacing.xs,
    },
  });

// Hook for easy toast usage
export const useToast = () => {
  const [toast, setToast] = React.useState<{
    visible: boolean;
    message: string;
    type?: ToastType;
    duration?: number;
    action?: { label: string; onPress: () => void };
  }>({
    visible: false,
    message: '',
  });

  const showToast = React.useCallback(
    (
      message: string,
      type?: ToastType,
      duration?: number,
      action?: { label: string; onPress: () => void }
    ) => {
      setToast({
        visible: true,
        message,
        type,
        duration,
        action,
      });
    },
    []
  );

  const hideToast = React.useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
};

