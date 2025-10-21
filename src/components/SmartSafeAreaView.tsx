import React from 'react';
import { View, StyleSheet } from 'react-native';
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
}

export const SmartSafeAreaView: React.FC<SmartSafeAreaViewProps> = ({ 
  children, 
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = 'transparent',
  debugBorderColor,
  debugBorderWidth,
  showDebugBorder = true,
  componentType
}) => {
  const shouldShowDebugBorder = __DEV__ && showDebugBorder;
  
  // Get debug configuration
  const debugConfig = getDebugConfig(componentType);
  const finalBorderColor = debugBorderColor || debugConfig.borderColor;
  const finalBorderWidth = debugBorderWidth || debugConfig.borderWidth;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
      {children}
      {shouldShowDebugBorder && (
        <View 
          style={[
            styles.debugBorder, 
            { 
              borderColor: finalBorderColor,
              borderWidth: finalBorderWidth 
            }
          ]} 
          pointerEvents="none" 
        />
      )}
    </SafeAreaView>
  );
};

// Additional utility component for screens that need specific safe area handling
export const ScreenSafeAreaView: React.FC<SmartSafeAreaViewProps> = (props) => {
  return (
    <SmartSafeAreaView 
      {...props}
      edges={['top', 'bottom']} // Only top and bottom for screens
      backgroundColor={props.backgroundColor || 'transparent'}
      componentType="screen"
    />
  );
};

// Modal-specific safe area view
export const ModalSafeAreaView: React.FC<SmartSafeAreaViewProps> = (props) => {
  return (
    <SmartSafeAreaView 
      {...props}
      edges={['top']} // Only top for modals
      backgroundColor={props.backgroundColor || 'transparent'}
      componentType="modal"
    />
  );
};

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
