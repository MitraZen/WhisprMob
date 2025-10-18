import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen';
  transparent?: boolean;
  style?: any;
  contentStyle?: any;
  headerStyle?: any;
  closeButtonStyle?: any;
  overlayStyle?: any;
  // Animation props
  slideFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  // Size variants
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  // Behavior props
  dismissible?: boolean;
  closeOnOverlayPress?: boolean;
}

export const ThemedModal: React.FC<ThemedModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  animationType = 'slide',
  presentationStyle = 'overFullScreen',
  transparent = true,
  style,
  contentStyle,
  headerStyle,
  closeButtonStyle,
  overlayStyle,
  slideFrom = 'bottom',
  size = 'medium',
  dismissible = true,
  closeOnOverlayPress = true,
}) => {
  const { theme } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Animate in
      if (animationType === 'slide') {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    } else {
      // Animate out
      if (animationType === 'slide') {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, animationType]);

  const getSlideTransform = () => {
    const translateY = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: slideFrom === 'bottom' ? [screenHeight, 0] : 
                   slideFrom === 'top' ? [-screenHeight, 0] : [0, 0],
    });

    const translateX = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: slideFrom === 'left' ? [-screenWidth, 0] : 
                   slideFrom === 'right' ? [screenWidth, 0] : [0, 0],
    });

    const scale = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: slideFrom === 'center' ? [0.8, 1] : [1, 1],
    });

    return {
      transform: [
        { translateY },
        { translateX },
        { scale },
      ],
    };
  };

  const getModalSize = () => {
    switch (size) {
      case 'small':
        return {
          width: screenWidth * 0.8,
          maxHeight: screenHeight * 0.4,
        };
      case 'medium':
        return {
          width: screenWidth * 0.9,
          maxHeight: screenHeight * 0.7,
        };
      case 'large':
        return {
          width: screenWidth * 0.95,
          maxHeight: screenHeight * 0.85,
        };
      case 'fullscreen':
        return {
          width: screenWidth,
          height: screenHeight,
        };
      default:
        return {
          width: screenWidth * 0.9,
          maxHeight: screenHeight * 0.7,
        };
    }
  };

  const styles = createStyles(theme);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType="none" // We handle animation ourselves
      presentationStyle={presentationStyle}
      onRequestClose={dismissible ? onClose : undefined}
    >
      <Animated.View 
        style={[
          styles.overlay,
          overlayStyle,
          { opacity: fadeAnim }
        ]}
      >
        {closeOnOverlayPress && (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={dismissible ? onClose : undefined}
          />
        )}
        
        <Animated.View
          style={[
            styles.modalContainer,
            getModalSize(),
            getSlideTransform(),
            style,
          ]}
        >
          <View style={[styles.modalContent, contentStyle]}>
            {/* Header */}
            {(title || showCloseButton) && (
              <View style={[styles.header, headerStyle]}>
                {title && (
                  <Text style={styles.title}>{title}</Text>
                )}
                {showCloseButton && (
                  <TouchableOpacity
                    style={[styles.closeButton, closeButtonStyle]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Icon 
                      name="close" 
                      size={24} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>
              {children}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.xl,
    ...theme.shadows.lg,
    elevation: 8,
    maxWidth: '100%',
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceVariant,
  },
  title: {
    ...theme.typography.titleLarge,
    color: theme.colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  content: {
    padding: spacing.lg,
  },
});

export default ThemedModal;
