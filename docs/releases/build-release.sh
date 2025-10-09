#!/bin/bash

# Whispr Mobile App - Play Store Release Build Script
# This script creates a signed release APK for Google Play Store

echo "🚀 Starting Whispr Mobile App Release Build Process..."

# Set variables
APP_NAME="Whispr"
VERSION_NAME="1.1.0"
VERSION_CODE="6"
BUILD_DATE=$(date +%Y-%m-%d)
RELEASE_DIR="release-builds"

# Create release directory
echo "📁 Creating release directory..."
mkdir -p $RELEASE_DIR

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean

# Generate release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Release APK built successfully!"
    
    # Copy APK to release directory
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    RELEASE_APK_NAME="${APP_NAME}-v${VERSION_NAME}-${BUILD_DATE}.apk"
    
    if [ -f "$APK_PATH" ]; then
        cp "$APK_PATH" "../$RELEASE_DIR/$RELEASE_APK_NAME"
        echo "📦 APK copied to: $RELEASE_DIR/$RELEASE_APK_NAME"
        
        # Generate checksums
        echo "🔐 Generating checksums..."
        cd "../$RELEASE_DIR"
        sha256sum "$RELEASE_APK_NAME" > "$RELEASE_APK_NAME.sha256"
        md5sum "$RELEASE_APK_NAME" > "$RELEASE_APK_NAME.md5"
        
        echo ""
        echo "🎉 Release build completed successfully!"
        echo "📱 APK: $RELEASE_APK_NAME"
        echo "📊 Size: $(du -h $RELEASE_APK_NAME | cut -f1)"
        echo "🔐 SHA256: $(cat $RELEASE_APK_NAME.sha256)"
        echo ""
        echo "📋 Next steps for Play Store upload:"
        echo "1. Test the APK on a physical device"
        echo "2. Upload to Google Play Console"
        echo "3. Fill in store listing details"
        echo "4. Submit for review"
        
    else
        echo "❌ APK file not found at expected location: $APK_PATH"
        exit 1
    fi
else
    echo "❌ Release build failed!"
    exit 1
fi

cd ..








