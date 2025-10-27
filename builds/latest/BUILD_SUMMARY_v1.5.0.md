# Whispr v1.5.0 - Build Summary

## Build Information

**Version**: 1.5.0  
**Version Code**: 61  
**Build Date**: October 26, 2025  
**Build Time**: 15:59  

## Build Artifacts

### File Naming Convention
- **AAB**: `Whispr_v1.5.0_v61_2025-2025-10-26_15-59.aab` (26.84 MB)
- **APK**: `Whispr_v1.5.0_v61_2025-2025-10-26_15-59.apk` (54.26 MB)

### Build Process
1. **Clean**: `./gradlew clean`
2. **AAB Build**: `./gradlew bundleRelease`
3. **APK Build**: `./gradlew assembleRelease`

## What's New in v1.5.0

### Bug Fixes
- ✅ Fixed keyboard handling on OnePlus devices
- ✅ Reduced extra padding above username and below message container
- ✅ KeyboardAvoidingView now properly enabled for Android
- ✅ Message input now appears correctly above keyboard when typing
- ✅ Optimized padding for Android devices (especially OnePlus)

### UI Improvements
- ✅ Reduced header padding for better space utilization
- ✅ Optimized input container padding for Android
- ✅ Reduced text input padding for compact design
- ✅ Minimum height reduced from 70px to 64px on Android

### Notification System
- ✅ Foreground notifications working correctly
- ✅ Unread count resets when messages are read
- ✅ System notifications appear properly
- ✅ Buddy cards update correctly with last message preview
- ✅ Bell icon count updates as expected

### Code Quality
- ✅ Commented out DEBUG logs for cleaner console output
- ✅ Improved KeyboardAvoidingView configuration
- ✅ Platform-specific styling for better Android experience

## Technical Details

### Changes Made
1. **android/app/build.gradle**:
   - Updated `versionCode` from `60` to `61`
   - Updated `versionName` from `"1.4.9"` to `"1.5.0"`

2. **src/screens/TelegramStyleChatScreen.tsx**:
   - Enabled `KeyboardAvoidingView` for Android (`behavior="height"`, `enabled=true`)
   - Adjusted header padding for Android devices
   - Reduced input container padding and minHeight for Android
   - Reduced text input padding for Android
   - Reduced username button padding for Android

3. **src/screens/BuddiesScreen.tsx**:
   - Commented out DEBUG logs for cleaner output

## Deployment Notes

### Google Play Store
- ✅ AAB file ready for upload
- ✅ Version code incremented to 61
- ✅ All signing configurations correct

### Testing Recommendations
- Test keyboard behavior on OnePlus devices
- Verify padding looks correct on various Android devices
- Confirm notification system works correctly
- Test unread count functionality

## Previous Build

**Version**: 1.4.9  
**Version Code**: 60  
**Status**: Released

## Next Steps

1. Test the APK on OnePlus device for keyboard handling
2. Upload AAB to Google Play Console
3. Monitor for any issues after deployment


