// SmartSafeAreaView Configuration
// This file allows you to configure debug border settings globally

export const SafeAreaDebugConfig = {
  // Debug border appearance
  borderColor: 'rgba(255, 0, 0, 0.2)', // Red border with transparency
  borderWidth: 2,
  
  // Alternative colors for different environments
  colors: {
    development: 'rgba(255, 0, 0, 0.2)',    // Red
    staging: 'rgba(0, 255, 0, 0.2)',       // Green
    testing: 'rgba(0, 0, 255, 0.2)',       // Blue
  },
  
  // Enable/disable debug borders
  enabled: __DEV__, // Only show in development
  
  // Platform-specific settings
  platform: {
    ios: {
      borderColor: 'rgba(255, 0, 0, 0.2)',
      borderWidth: 2,
    },
    android: {
      borderColor: 'rgba(0, 255, 0, 0.2)',
      borderWidth: 1,
    },
  },
  
  // Component-specific overrides
  overrides: {
    modal: {
      borderColor: 'rgba(255, 165, 0, 0.3)', // Orange for modals
      borderWidth: 3,
    },
    screen: {
      borderColor: 'rgba(255, 0, 0, 0.2)',   // Red for screens
      borderWidth: 2,
    },
  },
};

// Helper function to get debug config for a specific component
export const getDebugConfig = (componentType?: 'modal' | 'screen') => {
  const baseConfig = SafeAreaDebugConfig;
  
  if (componentType && baseConfig.overrides[componentType]) {
    return {
      ...baseConfig,
      ...baseConfig.overrides[componentType],
    };
  }
  
  return baseConfig;
};

// Helper function to check if debug borders should be shown
export const shouldShowDebugBorders = () => {
  return SafeAreaDebugConfig.enabled;
};



