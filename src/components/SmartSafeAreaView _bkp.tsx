import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeAreaDebugConfig, getDebugConfig } from '@/config/SafeAreaDebugConfig';

interface SmartSafeAreaViewProps {
  children: React.ReactNode;
  style?: any;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  debugBorderColor?: string;
  debugBorderWidth?: number;
  showDebugBorder?: boolean;
  componentType?: 'modal' | 'screen';
  enableKeyboardAvoid?: boolean; // 👈 New prop
  keyboardOffset?: number;       // 👈 Optional offset for Android keyboard
}

export const SmartSafeAreaView: React.FC<SmartSafeAreaViewProps> = ({ 
  children, 
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = 'transparent',
  debugBorderColor,
  debugBorderWidth,
  showDebugBorder = true,
  componentType,
  enableKeyboardAvoid = true, // 👈 default enabled
  keyboardOffset = 0
}) => {
  const shouldShowDebugBorder = __DEV__ && showDebugBorder;

  // Get debug configuration
  const debugConfig = getDebugConfig(componentType);
  const finalBorderColor = debugBorderColor || debugConfig.borderColor;
  const finalBorderWidth = debugBorderWidth || debugConfig.borderWidth;

  const content = (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
      {children}
      {shouldShowDebugBorder && (
        <View 
          style={[
            styles.debugBorder, 
            { borderColor: finalBorderColor, borderWidth: finalBorderWidth }
          ]} 
          pointerEvents="none" 
        />
      )}
    </SafeAreaView>
  );

  if (enableKeyboardAvoid) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : keyboardOffset}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

// Screen-specific safe area view
export const ScreenSafeAreaView: React.FC<SmartSafeAreaViewProps> = (props) => (
  <SmartSafeAreaView
    {...props}
    edges={['top', 'bottom']}
    backgroundColor={props.backgroundColor || 'transparent'}
    componentType="screen"
  />
);

// Modal-specific safe area view
export const ModalSafeAreaView: React.FC<SmartSafeAreaViewProps> = (props) => (
  <SmartSafeAreaView
    {...props}
    edges={['top']}
    backgroundColor={props.backgroundColor || 'transparent'}
    componentType="modal"
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});

export default SmartSafeAreaView;
