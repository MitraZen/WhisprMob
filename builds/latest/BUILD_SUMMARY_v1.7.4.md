# Build Summary - v1.7.4 (Version Code 85)

## Build Information
- **Version Name**: 1.7.4
- **Version Code**: 85
- **Build Date**: 2025-10-28 01:59
- **Build Type**: Release (AAB & APK)

## File Sizes
- **AAB File**: 26.87 MB (`Whispr_v1.7.4_v85_2025-2025-10-28_01-59.aab`)
- **APK File**: 54.28 MB (`Whispr_v1.7.4_v85_2025-2025-10-28_01-59.apk`)

## Key Changes in This Version

### 🔔 Enhanced Notification & Battery Optimization Prompts
- **Notification Permission Request**: Added user-friendly prompts to request notification permissions after reinstall/update/re-login
- **Battery Optimization Guidance**: Implemented prompts to guide users to disable battery optimization for better app experience
- **Smart Flow**: Notification prompts followed by battery optimization prompts for improved user engagement

### 🔧 Android Implementation
- **PermissionManager.kt**: Added `openBatteryOptimizationSettings()` method to open Android battery optimization settings
- **PermissionModule.kt**: Added React Native bridge method to access battery optimization settings
- **AuthContext.tsx**: Integrated battery optimization prompts after notification permissions

### 🎨 UI Enhancements
- **Wave Animation**: Increased visibility of wave animation on Whispr notes screen
  - Base opacity: 0.4
  - Animated opacity range: 0.6-1.0
  - Enhanced floating movement: -30px

### 🐛 Bug Fixes
- **Android Keyboard Handling**: Fixed keyboard overlap issues on Android devices
- **Padding Issues**: Resolved extra top padding on Android screens
- **SmartSafeAreaView**: Improved edge handling for better device compatibility

## Previous Build Details
- **Previous Version**: 1.7.3 (Code 84)
- **Previous Build Date**: 2025-10-28 01:52

## Build Process
- ✅ Clean build completed successfully
- ✅ AAB and APK files generated
- ✅ All dependencies resolved
- ✅ Build time: ~1m 41s

## Notes
- All notification and battery optimization features are now integrated
- Wave animation visibility improvements applied
- Android-specific keyboard and padding fixes implemented

