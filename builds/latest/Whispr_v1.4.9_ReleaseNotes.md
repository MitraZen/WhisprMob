# Whispr Mobile App v1.4.9 Release Notes

## 📱 Version Information
- **Version Name**: 1.4.9
- **Version Code**: 60
- **Build Date**: October 26, 2025
- **Build Time**: 00:05 UTC

## 🚀 Key Features & Improvements

### 🔧 **Critical Bug Fixes**
- **Fixed TypeScript Linting Errors**: Resolved `PushNotification.checkPermissions()` method error that was causing build failures
- **Improved Notification System**: Enhanced hybrid notification routing to prevent duplicate notifications
- **Enhanced Message Deduplication**: Better handling of message processing to avoid duplicate notifications

### 📱 **UI/UX Improvements**
- **OnePlus Device Compatibility**: Fixed keyboard handling issues on OnePlus devices
  - Message compose area now properly visible when keyboard is open
  - Send button remains accessible during typing
  - Reduced extra padding below message compose area
- **Message Truncation**: Long messages in chat cards now properly truncate with ellipsis
- **Better Text Input**: Improved text alignment and scrolling for long messages

### 🔔 **Notification Enhancements**
- **Hybrid Notification System**: Intelligent routing between immediate and batched notifications
- **Background Notification Support**: Proper FCM handling when app is minimized
- **Buddy Name Resolution**: Fixed display of actual usernames instead of generic "Buddy" placeholder
- **History Replay Prevention**: Eliminated duplicate notifications when app becomes active

### 🛠️ **Technical Improvements**
- **React Native Compatibility**: Fixed EventEmitter dependency issues
- **Database Schema Alignment**: Corrected column name references (`display_name` vs `name`)
- **Performance Optimizations**: Improved caching mechanisms for user profiles
- **Error Handling**: Enhanced error handling and logging throughout the app

## 📦 **Build Artifacts**
- **AAB File**: `Whispr_v1.4.9_v60_2025-2025-10-26_00-05.aab` (26.87 MB)
- **APK File**: `Whispr_v1.4.9_v60_2025-2025-10-26_00-05.apk` (54.28 MB)

## 🎯 **Target Platforms**
- **Android**: API Level 24+ (Android 7.0+)
- **Architecture Support**: ARM64, ARMv7, x86, x86_64
- **Play Store Ready**: Optimized for Google Play Store deployment

## 🔄 **Migration Notes**
- **Backward Compatible**: No breaking changes from previous versions
- **Database Updates**: Automatic schema updates handled seamlessly
- **Cache Management**: Improved cache invalidation and management

## 🐛 **Known Issues**
- None reported in this release

## 📋 **Testing**
- ✅ Build compilation successful
- ✅ Linting errors resolved
- ✅ AAB and APK generation successful
- ✅ File size optimization maintained
- ✅ Play Store compatibility verified

## 🚀 **Deployment Status**
- **Status**: Ready for Play Store deployment
- **Build Quality**: Production-ready
- **Performance**: Optimized for release

---

**Build Information**
- **Build Script**: `build-v1.4.9.ps1`
- **Gradle Version**: 8.14.3
- **React Native Version**: 0.81
- **Node.js**: Compatible with current LTS versions

**Next Steps**
1. Upload AAB file to Google Play Console
2. Complete Play Store review process
3. Monitor user feedback and performance metrics
4. Prepare for next iteration based on user reports


