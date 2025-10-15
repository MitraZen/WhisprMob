#!/bin/bash
# Production Build Script for Whispr Mobile App v1.3.0
# This script creates both APK and AAB files for Play Store

set -e

echo "🚀 Starting Whispr Mobile App Production Build v1.3.0"
echo "=================================================="

# Get current date and time
BUILD_DATE=$(date +"%Y-%m-%d")
BUILD_TIME=$(date +"%H-%M")
VERSION_NAME="1.3.0"
VERSION_CODE="26"

echo "📅 Build Date: $BUILD_DATE"
echo "⏰ Build Time: $BUILD_TIME"
echo "📱 Version Name: $VERSION_NAME"
echo "🔢 Version Code: $VERSION_CODE"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean
cd ..

# Clean React Native cache
echo "🧹 Cleaning React Native cache..."
npx react-native start --reset-cache --port=8081 &
METRO_PID=$!
sleep 5
kill $METRO_PID 2>/dev/null || true

# Create builds directory if it doesn't exist
mkdir -p builds/latest

# Build APK
echo "📦 Building APK..."
cd android
./gradlew assembleRelease
cd ..

# Copy APK to builds directory
APK_NAME="Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}_${BUILD_TIME}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "builds/latest/$APK_NAME"
echo "✅ APK created: $APK_NAME"

# Build AAB (Android App Bundle)
echo "📦 Building AAB..."
cd android
./gradlew bundleRelease
cd ..

# Copy AAB to builds directory
AAB_NAME="Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}_${BUILD_TIME}.aab"
cp android/app/build/outputs/bundle/release/app-release.aab "builds/latest/$AAB_NAME"
echo "✅ AAB created: $AAB_NAME"

# Create build info file
BUILD_INFO_FILE="builds/latest/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"
cat > "$BUILD_INFO_FILE" << EOF
Whispr Mobile App Build Information
====================================

Version Name: $VERSION_NAME
Version Code: $VERSION_CODE
Build Date: $BUILD_DATE
Build Time: $BUILD_TIME
Build Type: Release

Files Created:
- $APK_NAME
- $AAB_NAME

Release Notes:
Version 1.3.0 - Simplified Tap to Chat feature with 10-minute expiry, 
improved real-time chat updates, enhanced database triggers, and better 
user experience with reduced notification spam

Key Features:
- ✅ Simplified Tap to Chat with 10-minute expiry
- ✅ Real-time chat updates with polling fallback
- ✅ Enhanced database triggers for participant tracking
- ✅ Reduced notification spam
- ✅ Improved user experience
- ✅ Better error handling and debugging

Build completed successfully!
EOF

echo "📄 Build info created: build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"

# Display file sizes
echo ""
echo "📊 Build Summary:"
echo "=================="
echo "APK: $(du -h "builds/latest/$APK_NAME" | cut -f1)"
echo "AAB: $(du -h "builds/latest/$AAB_NAME" | cut -f1)"
echo ""
echo "🎉 Production build completed successfully!"
echo "📁 Files saved to: builds/latest/"
echo ""
echo "🚀 Ready for Play Store upload!"