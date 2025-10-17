import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ThemedModal } from './ThemedModal';

const { width: screenWidth } = Dimensions.get('window');

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface ThemedAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
  icon?: string;
  iconColor?: string;
  style?: any;
  contentStyle?: any;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
  icon,
  iconColor,
  style,
  contentStyle,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const getButtonStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'destructive':
        return [styles.button, styles.destructiveButton];
      case 'cancel':
        return [styles.button, styles.cancelButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'destructive':
        return [styles.buttonText, styles.destructiveButtonText];
      case 'cancel':
        return [styles.buttonText, styles.cancelButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      size="small"
      slideFrom="center"
      animationType="fade"
      closeOnOverlayPress={false}
      dismissible={false}
      style={[styles.alertContainer, style]}
      contentStyle={contentStyle}
    >
      <View style={styles.alertContent}>
        {/* Icon */}
        {icon && (
          <View style={styles.iconContainer}>
            <Icon 
              name={icon} 
              size={48} 
              color={iconColor || theme.colors.primary} 
            />
          </View>
        )}

        {/* Title */}
        {title && (
          <Text style={styles.title}>{title}</Text>
        )}

        {/* Message */}
        {message && (
          <Text style={styles.message}>{message}</Text>
        )}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                ...getButtonStyle(button.style),
                buttons.length === 1 && styles.singleButton,
                buttons.length === 2 && styles.twoButton,
                buttons.length > 2 && styles.multiButton,
              ]}
              onPress={() => handleButtonPress(button)}
              activeOpacity={0.7}
            >
              <Text style={getButtonTextStyle(button.style)}>
                {button.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ThemedModal>
  );
};

// Static method to show alert (similar to Alert.alert)
export const showThemedAlert = (
  title?: string,
  message?: string,
  buttons?: AlertButton[],
  options?: {
    icon?: string;
    iconColor?: string;
  }
): Promise<string> => {
  return new Promise((resolve) => {
    // This would need to be implemented with a global alert manager
    // For now, we'll provide the component for manual usage
    console.log('showThemedAlert called:', { title, message, buttons, options });
    resolve('OK');
  });
};

const createStyles = (theme: any) => StyleSheet.create({
  alertContainer: {
    width: screenWidth * 0.85,
    maxWidth: 400,
  },
  alertContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  singleButton: {
    flex: 1,
  },
  twoButton: {
    flex: 1,
  },
  multiButton: {
    flex: 1,
  },
  defaultButton: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
    ...theme.shadows.sm,
  },
  buttonText: {
    ...theme.typography.titleMedium,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: theme.colors.onPrimary,
  },
  cancelButtonText: {
    color: theme.colors.onSurfaceVariant,
  },
  destructiveButtonText: {
    color: theme.colors.onError,
  },
});

export default ThemedAlert;
