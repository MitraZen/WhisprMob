import React from 'react';
import { Alert, AlertButton, AlertOptions, Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/store/ThemeContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { spacing, borderRadius } from '@/utils/themes';

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  onClose: () => void;
  icon?: string;
  iconColor?: string;
}

export const ThemedAlert: React.FC<ThemedAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
  icon = 'information-circle',
  iconColor = '#3b82f6'
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Icon name={icon} size={32} color={iconColor} />
          </View>
          
          {/* Title */}
          <Text style={styles.title}>{title}</Text>
          
          {/* Message */}
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
          
          {/* Buttons */}
          <View style={buttons.length >= 3 ? styles.buttonContainerVertical : styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  buttons.length >= 3 ? styles.buttonVertical : styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && styles.destructiveButton,
                  buttons.length === 1 && styles.singleButton
                ]}
                onPress={() => {
                  if (button.onPress) {
                    button.onPress();
                  }
                  onClose();
                }}
              >
                <Text 
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                    button.style === 'destructive' && styles.destructiveButtonText
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={false}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Legacy object-based API for backward compatibility
export const ThemedAlertLegacy = {
  alert: (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    // For now, we'll use the default Alert but with better styling
    // In the future, this can be replaced with a custom modal component
    return Alert.alert(title, message, buttons, options);
  }
};

// Custom hook for themed alerts
export const useThemedAlert = () => {
  const { theme } = useTheme();

  const showAlert = (
    title: string, 
    message?: string, 
    buttons?: AlertButton[], 
    options?: AlertOptions
  ) => {
    return Alert.alert(title, message, buttons, options);
  };

  return { showAlert };
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  alertContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    minWidth: 280,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: theme.colors.shadow || '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  message: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  buttonContainerVertical: {
    flexDirection: 'column',
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonVertical: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  singleButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    ...theme.typography.labelLarge,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: theme.colors.onSurfaceVariant,
  },
  destructiveButtonText: {
    color: theme.colors.onError,
  },
});

export default ThemedAlert;