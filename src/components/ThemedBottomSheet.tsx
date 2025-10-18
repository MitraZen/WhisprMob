import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanGestureHandler,
  State,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { ThemedModal } from './ThemedModal';

const { height: screenHeight } = Dimensions.get('window');

export interface BottomSheetItem {
  id: string;
  title: string;
  icon?: string;
  iconColor?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface ThemedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items?: BottomSheetItem[];
  children?: React.ReactNode;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  style?: any;
  contentStyle?: any;
  itemStyle?: any;
  // Size variants
  size?: 'small' | 'medium' | 'large' | 'auto';
  // Behavior props
  dismissible?: boolean;
  closeOnOverlayPress?: boolean;
}

export const ThemedBottomSheet: React.FC<ThemedBottomSheetProps> = ({
  visible,
  onClose,
  title,
  items = [],
  children,
  showCancelButton = true,
  cancelButtonText = 'Cancel',
  style,
  contentStyle,
  itemStyle,
  size = 'auto',
  dismissible = true,
  closeOnOverlayPress = true,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getBottomSheetHeight = () => {
    const baseHeight = 60; // Handle height
    const titleHeight = title ? 60 : 0;
    const itemsHeight = items.length * 60;
    const cancelHeight = showCancelButton ? 60 : 0;
    const childrenHeight = children ? 200 : 0; // Estimate for children
    const padding = spacing.lg * 2;

    const totalHeight = baseHeight + titleHeight + itemsHeight + cancelHeight + childrenHeight + padding;
    
    switch (size) {
      case 'small':
        return Math.min(totalHeight, screenHeight * 0.3);
      case 'medium':
        return Math.min(totalHeight, screenHeight * 0.5);
      case 'large':
        return Math.min(totalHeight, screenHeight * 0.7);
      case 'auto':
        return Math.min(totalHeight, screenHeight * 0.8);
      default:
        return Math.min(totalHeight, screenHeight * 0.5);
    }
  };

  const handleItemPress = (item: BottomSheetItem) => {
    if (!item.disabled) {
      item.onPress();
      onClose();
    }
  };

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      slideFrom="bottom"
      animationType="slide"
      size="fullscreen"
      closeOnOverlayPress={closeOnOverlayPress}
      dismissible={dismissible}
      style={styles.bottomSheetContainer}
      contentStyle={contentStyle}
    >
      <View style={[styles.bottomSheet, { height: getBottomSheetHeight() }, style]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          {title && (
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          {/* Items */}
          {items.length > 0 && (
            <View style={styles.itemsContainer}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.item,
                    item.disabled && styles.disabledItem,
                    itemStyle,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={item.disabled ? 1 : 0.7}
                >
                  {item.icon && (
                    <Icon
                      name={item.icon}
                      size={24}
                      color={
                        item.disabled
                          ? theme.colors.onSurfaceVariant
                          : item.iconColor || 
                            (item.destructive ? theme.colors.error : theme.colors.onSurface)
                      }
                      style={styles.itemIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.itemText,
                      item.destructive && styles.destructiveText,
                      item.disabled && styles.disabledText,
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Custom Children */}
          {children && (
            <View style={styles.childrenContainer}>
              {children}
            </View>
          )}

          {/* Cancel Button */}
          {showCancelButton && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{cancelButtonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ThemedModal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  bottomSheetContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...theme.shadows.lg,
    elevation: 8,
    width: '100%',
    maxHeight: screenHeight * 0.8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.onSurfaceVariant,
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  titleContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemsContainer: {
    marginBottom: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  disabledItem: {
    opacity: 0.5,
  },
  itemIcon: {
    marginRight: spacing.md,
  },
  itemText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurface,
    flex: 1,
  },
  destructiveText: {
    color: theme.colors.error,
  },
  disabledText: {
    color: theme.colors.onSurfaceVariant,
  },
  childrenContainer: {
    marginBottom: spacing.md,
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600',
  },
});

export default ThemedBottomSheet;
