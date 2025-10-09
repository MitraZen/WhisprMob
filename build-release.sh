#!/bin/bash

# Whispr Mobile App - Play Store Build Script
# This script generates both AAB and APK files for Play Store release

echo "🚀 Starting Whispr Mobile App Play Store Build..."
echo "📱 Version: 1.1.2 (Build 8)"
echo "📅 Date: $(date)"
echo ""

# Set build directory
BUILD_DIR="builds"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create builds directory if it doesn't exist
mkdir -p $BUILD_DIR

echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean
cd ..

echo ""
echo "📦 Building AAB (Android App Bundle) for Play Store..."

# Build AAB file
cd android
./gradlew bundleRelease
cd ..

# Copy AAB to builds directory
AAB_FILE="Whispr_v1.1.2_${TIMESTAMP}.aab"
cp android/app/build/outputs/bundle/release/app-release.aab $BUILD_DIR/$AAB_FILE

echo "✅ AAB file created: $BUILD_DIR/$AAB_FILE"
echo ""

echo "📦 Building APK file..."

# Build APK file
cd android
./gradlew assembleRelease
cd ..

# Copy APK to builds directory
APK_FILE="Whispr_v1.1.2_${TIMESTAMP}.apk"
cp android/app/build/outputs/apk/release/app-release.apk $BUILD_DIR/$APK_FILE

echo "✅ APK file created: $BUILD_DIR/$APK_FILE"
echo ""

# Generate release notes
RELEASE_NOTES_FILE="$BUILD_DIR/ReleaseNotes_v1.1.2.md"
cat > $RELEASE_NOTES_FILE << EOF
# Whispr Mobile App - Release v1.1.2

**Build Date:** $(date)
**Version Code:** 8
**Version Name:** 1.1.2

## 🎉 What's New in This Release

### 🔧 Major Fixes
- **Fixed Authentication Issues**: Resolved messaging and RPC function authentication problems
- **Fixed Back Button Navigation**: Android back button now properly navigates between screens
- **Fixed Sent Notes Persistence**: "Clear All" now permanently deletes notes from database
- **Fixed Notification Display**: Notifications now show actual usernames instead of "someone"

### 🚀 Improvements
- **Enhanced Messaging System**: Improved message delivery and read status functionality
- **Better UI Layout**: Improved button positioning and spacing
- **Robust Error Handling**: Better error messages and debugging information
- **Database Optimization**: Improved RPC functions for better performance

### 🐛 Bug Fixes
- Fixed timestamp formatting errors in chat
- Fixed notification manager authentication issues
- Fixed icon display issues on Android
- Fixed navigation history tracking

## 📱 Files Generated
- **AAB File**: \`$AAB_FILE\` (For Play Store upload)
- **APK File**: \`$APK_FILE\` (For direct installation)

## 🚀 Deployment Instructions

### For Play Store:
1. Upload the AAB file (\`$AAB_FILE\`) to Google Play Console
2. Fill in release notes and screenshots
3. Submit for review

### For Direct Installation:
1. Use the APK file (\`$APK_FILE\`) for direct installation
2. Enable "Install from unknown sources" if needed
3. Install the APK file

## 🔍 Testing Checklist
- [ ] Authentication works properly
- [ ] Messaging functions correctly
- [ ] Back button navigation works
- [ ] Sent notes clearing is persistent
- [ ] Notifications show correct usernames
- [ ] All screens load without errors

---
**Build completed successfully!** 🎉
EOF

echo "📝 Release notes created: $RELEASE_NOTES_FILE"
echo ""

# Display file sizes
echo "📊 Build Summary:"
echo "=================="
echo "AAB File: $BUILD_DIR/$AAB_FILE ($(du -h $BUILD_DIR/$AAB_FILE | cut -f1))"
echo "APK File: $BUILD_DIR/$APK_FILE ($(du -h $BUILD_DIR/$APK_FILE | cut -f1))"
echo "Release Notes: $RELEASE_NOTES_FILE"
echo ""

echo "🎉 Build completed successfully!"
echo "📱 Ready for Play Store upload!"
echo ""
echo "Next steps:"
echo "1. Upload AAB file to Google Play Console"
echo "2. Fill in release information"
echo "3. Submit for review"
echo ""
echo "Files are located in the '$BUILD_DIR' directory."

