import React, { useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDebugConfig } from '@/config/SafeAreaDebugConfig';

// Optional dependencies with graceful fallbacks
let RNAndroidWindowSoftInputMode: any = null;
let DeviceInfo: any = null;

try {
  RNAndroidWindowSoftInputMode = require('react-native-set-soft-input-mode');
} catch (e) {
  // optional dependency, ignore if not installed
}

try {
  DeviceInfo = require('react-native-device-info');
} catch (e) {
  // optional dependency, ignore if not installed
}

interface SmartSafeAreaViewProps {
  children: React.ReactNode;
  style?: any;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  debugBorderColor?: string;
  debugBorderWidth?: number;
  showDebugBorder?: boolean;
  componentType?: 'modal' | 'screen';
  enableKeyboardAvoid?: boolean;
  keyboardOffset?: number;
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
  enableKeyboardAvoid = true,
  keyboardOffset = 0
}) => {
  const insets = useSafeAreaInsets();
  const debugConfig = getDebugConfig(componentType);
  const shouldShowDebugBorder = __DEV__ && showDebugBorder;

  const isAndroid = Platform.OS === 'android';
  const isOnePlus = isAndroid && DeviceInfo?.getBrand()?.toLowerCase() === 'oneplus';

  useEffect(() => {
    // 🔧 Ensure adjustResize is active for OnePlus/Oppo devices
    if (isAndroid && RNAndroidWindowSoftInputMode) {
      try {
        RNAndroidWindowSoftInputMode.setAdjustResize();
      } catch (e) {
        console.warn('Soft input mode adjustment failed:', e);
      }
    }
  }, []);

  // 🧩 Normalize top/bottom padding for buggy Android OEMs
  const normalizedInsets = {
    top: isAndroid ? Math.min(insets.top, 24) : insets.top, // limit excessive top inset
    bottom: isOnePlus ? 8 : Math.max(insets.bottom || 10, 12), // remove bottom padding on OnePlus, ensure minimum 12px for others
  };

  const safeAreaStyle = [
    styles.container,
    {
      backgroundColor,
      paddingTop: normalizedInsets.top,
      paddingBottom: normalizedInsets.bottom,
    },
    style,
  ];

  const content = (
    <SafeAreaView style={safeAreaStyle} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      {children}
      {shouldShowDebugBorder && (
        <View
          style={[
            styles.debugBorder,
            {
              borderColor: debugBorderColor || debugConfig.borderColor,
              borderWidth: debugBorderWidth || debugConfig.borderWidth,
            },
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : 0}
        enabled={Platform.OS === 'ios' ? true : !isOnePlus} // Disable for OnePlus
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  debugBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
