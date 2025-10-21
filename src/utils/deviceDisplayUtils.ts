// Device-specific display handling utilities
// This utility helps handle different device behaviors for full-screen display

import { Platform, Dimensions } from 'react-native';

interface DeviceInfo {
  manufacturer: string;
  model: string;
  isOnePlus: boolean;
  isSamsung: boolean;
  hasNotch: boolean;
  safeAreaBehavior: 'aggressive' | 'permissive' | 'standard';
}

/**
 * Detects device-specific display behavior
 */
export const getDeviceDisplayInfo = (): DeviceInfo => {
  const { width, height } = Dimensions.get('window');
  
  // Get device info (this is a simplified detection)
  const isOnePlus = Platform.OS === 'android' && 
    (Platform.constants?.Brand?.toLowerCase().includes('oneplus') || 
     Platform.constants?.Model?.toLowerCase().includes('oneplus'));
  
  const isSamsung = Platform.OS === 'android' && 
    (Platform.constants?.Brand?.toLowerCase().includes('samsung') || 
     Platform.constants?.Model?.toLowerCase().includes('samsung'));
  
  // Detect notch/cutout (simplified)
  const hasNotch = Platform.OS === 'android' && 
    (Platform.constants?.uiMode === 'notch' || 
     Platform.constants?.isTablet === false);
  
  // Determine safe area behavior
  let safeAreaBehavior: 'aggressive' | 'permissive' | 'standard' = 'standard';
  
  if (isSamsung) {
    safeAreaBehavior = 'aggressive'; // Samsung enforces safe areas strictly
  } else if (isOnePlus) {
    safeAreaBehavior = 'permissive'; // OnePlus allows more freedom
  }
  
  return {
    manufacturer: Platform.constants?.Brand || 'unknown',
    model: Platform.constants?.Model || 'unknown',
    isOnePlus,
    isSamsung,
    hasNotch,
    safeAreaBehavior,
  };
};

/**
 * Gets appropriate safe area padding based on device behavior
 */
export const getSafeAreaPadding = (deviceInfo: DeviceInfo) => {
  switch (deviceInfo.safeAreaBehavior) {
    case 'aggressive':
      return {
        paddingTop: Platform.OS === 'ios' ? 44 : 24, // Samsung - enforce both top and bottom
        paddingBottom: Platform.OS === 'ios' ? 34 : 0,
      };
    case 'permissive':
      return {
        paddingTop: Platform.OS === 'ios' ? 44 : 24, // OnePlus - only top to prevent hiding
        paddingBottom: 0,
      };
    case 'standard':
    default:
      return {
        paddingTop: Platform.OS === 'ios' ? 44 : 24, // Standard behavior
        paddingBottom: Platform.OS === 'ios' ? 34 : 0,
      };
  }
};

/**
 * Gets appropriate keyboard behavior based on device
 */
export const getKeyboardBehavior = (deviceInfo: DeviceInfo): 'padding' | 'height' | 'position' => {
  if (deviceInfo.isOnePlus) {
    return 'height'; // OnePlus works better with height adjustment
  } else if (deviceInfo.isSamsung) {
    return 'padding'; // Samsung works better with padding
  }
  return Platform.OS === 'ios' ? 'padding' : 'height';
};

/**
 * Gets appropriate keyboard vertical offset
 */
export const getKeyboardVerticalOffset = (deviceInfo: DeviceInfo): number => {
  if (deviceInfo.isOnePlus) {
    return 0; // OnePlus handles this automatically
  } else if (deviceInfo.isSamsung) {
    return Platform.OS === 'ios' ? 90 : 0; // Samsung needs offset
  }
  return Platform.OS === 'ios' ? 90 : 0;
};

/**
 * Creates device-specific styles for chat screens
 */
export const createDeviceSpecificStyles = (deviceInfo: DeviceInfo) => {
  const baseStyles = {
    header: {
      zIndex: 1000,
      elevation: 1,
    },
    inputContainer: {
      zIndex: 1000,
      elevation: 1,
    },
  };
  
  if (deviceInfo.isOnePlus) {
    // OnePlus-specific adjustments
    return {
      ...baseStyles,
      header: {
        ...baseStyles.header,
        paddingTop: 8, // Reduce top padding for OnePlus
        paddingBottom: 8,
      },
      inputContainer: {
        ...baseStyles.inputContainer,
        paddingBottom: 8, // Reduce bottom padding for OnePlus
      },
    };
  }
  
  if (deviceInfo.isSamsung) {
    // Samsung-specific adjustments
    return {
      ...baseStyles,
      header: {
        ...baseStyles.header,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 12,
      },
      inputContainer: {
        ...baseStyles.inputContainer,
        paddingBottom: Platform.OS === 'ios' ? 12 : 12,
      },
    };
  }
  
  return baseStyles;
};

/**
 * Hook to get device-specific display configuration
 */
export const useDeviceDisplayConfig = () => {
  const deviceInfo = getDeviceDisplayInfo();
  
  return {
    deviceInfo,
    safeAreaPadding: getSafeAreaPadding(deviceInfo),
    keyboardBehavior: getKeyboardBehavior(deviceInfo),
    keyboardVerticalOffset: getKeyboardVerticalOffset(deviceInfo),
    deviceStyles: createDeviceSpecificStyles(deviceInfo),
  };
};
