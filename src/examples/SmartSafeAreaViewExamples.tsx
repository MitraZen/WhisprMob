// SmartSafeAreaView Usage Examples
// This file shows how to use the SmartSafeAreaView component in different scenarios

import React from 'react';
import { View, Text } from 'react-native';
import { 
  SmartSafeAreaView, 
  ScreenSafeAreaView, 
  ModalSafeAreaView 
} from '@/components/SmartSafeAreaView';

// Example 1: Basic usage in a screen
export const ExampleScreen = () => {
  return (
    <ScreenSafeAreaView backgroundColor="#f5f5f5">
      <View style={{ flex: 1, padding: 20 }}>
        <Text>This screen has safe area borders in debug mode</Text>
      </View>
    </ScreenSafeAreaView>
  );
};

// Example 2: Custom debug border styling
export const CustomDebugScreen = () => {
  return (
    <SmartSafeAreaView 
      backgroundColor="#ffffff"
      debugBorderColor="rgba(0, 255, 0, 0.3)" // Green border
      debugBorderWidth={3}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Custom green debug border</Text>
      </View>
    </SmartSafeAreaView>
  );
};

// Example 3: Modal usage
export const ExampleModal = () => {
  return (
    <ModalSafeAreaView backgroundColor="rgba(0,0,0,0.5)">
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Modal with top-only safe area</Text>
      </View>
    </ModalSafeAreaView>
  );
};

// Example 4: Disable debug border for specific component
export const NoDebugScreen = () => {
  return (
    <SmartSafeAreaView 
      backgroundColor="#ffffff"
      showDebugBorder={false} // Disable debug border
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text>No debug border even in development</Text>
      </View>
    </SmartSafeAreaView>
  );
};

// Example 5: Full control over edges
export const CustomEdgesScreen = () => {
  return (
    <SmartSafeAreaView 
      backgroundColor="#ffffff"
      edges={['top', 'left', 'right']} // Only top, left, right
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text>Custom safe area edges</Text>
      </View>
    </SmartSafeAreaView>
  );
};



