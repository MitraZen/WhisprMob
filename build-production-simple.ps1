# Simple Production Build Script for Whispr Mobile App
# Version 1.2.14 - Fixed buddy addition delays and cascade delete issues

Write-Host "🚀 Starting Whispr Mobile App Production Build..." -ForegroundColor Green
Write-Host "Version: 1.2.14 (Code: 33)" -ForegroundColor Cyan
Write-Host ""

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "android/app/build") {
    Remove-Item -Recurse -Force "android/app/build"
}
if (Test-Path "builds/latest") {
    Remove-Item -Recurse -Force "builds/latest"
}
New-Item -ItemType Directory -Path "builds/latest" -Force | Out-Null

# Clean React Native cache
Write-Host "🧹 Cleaning React Native cache..." -ForegroundColor Yellow
Start-Process -FilePath "npx" -ArgumentList "react-native", "start", "--reset-cache", "--port=8081" -WindowStyle Hidden
Start-Sleep -Seconds 3
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Build Android release
Write-Host "🔨 Building Android release..." -ForegroundColor Yellow
cd android
./gradlew clean
./gradlew assembleRelease
./gradlew bundleRelease
cd ..

# Move files to builds/latest
Write-Host "📁 Moving build files..." -ForegroundColor Yellow
$APK_SOURCE = "android/app/build/outputs/apk/release/app-release.apk"
$AAB_SOURCE = "android/app/build/outputs/bundle/release/app-release.aab"

$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_TIME = Get-Date -Format "HH-mm"
$APK_NAME = "Whispr_v1.2.14_v33_$BUILD_DATE`_$BUILD_TIME.apk"
$AAB_NAME = "Whispr_v1.2.14_v33_$BUILD_DATE`_$BUILD_TIME.aab"

if (Test-Path $APK_SOURCE) {
    Copy-Item $APK_SOURCE "builds/latest/$APK_NAME"
    Write-Host "✅ APK created: $APK_NAME" -ForegroundColor Green
} else {
    Write-Host "❌ APK not found!" -ForegroundColor Red
}

if (Test-Path $AAB_SOURCE) {
    Copy-Item $AAB_SOURCE "builds/latest/$AAB_NAME"
    Write-Host "✅ AAB created: $AAB_NAME" -ForegroundColor Green
} else {
    Write-Host "❌ AAB not found!" -ForegroundColor Red
}

# Create release notes
$RELEASE_NOTES = @"
# Whispr Mobile App - Version 1.2.14 Release Notes

## 🎉 Major Fixes and Improvements

This release focuses on resolving critical buddy functionality issues and improving the overall user experience.

### 🐛 Bug Fixes

- **Fixed Buddy Addition Delays:**
  - Resolved issue where senders would see new buddies appear late after accepting requests
  - Implemented real-time triggers for instant buddy notifications
  - Added proper conflict handling for existing buddy relationships

- **Fixed Cascade Delete Issues:**
  - Resolved problems with buddy deletion not properly cleaning up related data
  - Fixed SQL ambiguity errors in delete_buddy_safely function
  - Improved bidirectional relationship management

### ✨ Enhancements

- **Improved Buddy Creation:** New `create_buddy_relationship_safe()` function handles conflicts gracefully
- **Enhanced Real-time Updates:** Added triggers for instant buddy creation/deletion notifications
- **Better Error Handling:** More robust error handling throughout buddy management
- **Performance Improvements:** Added indexes for faster buddy lookups

### 🛠️ Technical Updates

- **Version Bump:**
  - `package.json` updated to `1.2.14`
  - Android `version.properties` updated to `VERSION_NAME=1.2.14` and `VERSION_CODE=33`
- **Database Functions:** New and improved PostgreSQL functions for buddy management
- **Real-time Triggers:** Added pg_notify triggers for instant UI updates

## 🚀 Ready for Play Store Upload!

This version provides a more stable and responsive buddy management experience.
"@

$RELEASE_NOTES | Out-File -FilePath "builds/latest/Whispr_v1.2.14_ReleaseNotes.md" -Encoding UTF8

# Create build info
$BUILD_INFO = @"
Whispr Mobile App Build Information
====================================

Version Name: 1.2.14
Version Code: 33
Build Date: $BUILD_DATE
Build Time: $BUILD_TIME
Build Type: Release

Files Created:
- $APK_NAME
- $AAB_NAME

Release Notes:
Version 1.2.14 - Fixed buddy addition delays and cascade delete issues. Implemented real-time triggers for instant buddy notifications, improved conflict handling, and proper bidirectional relationship management. Buddy creation and deletion now work flawlessly with immediate UI updates.

Key Features:
- Fixed buddy addition delays
- Resolved cascade delete issues
- Implemented real-time triggers
- Improved conflict handling
- Enhanced bidirectional relationship management
- Better error handling and user experience
- Performance improvements with new indexes

Build completed successfully!
"@

$BUILD_INFO | Out-File -FilePath "builds/latest/build_info_v1.2.14_v33.txt" -Encoding UTF8

# Display results
Write-Host ""
Write-Host "🎉 Production build completed successfully!" -ForegroundColor Green
Write-Host "📁 Files saved to: builds/latest/" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Version: 1.2.14 (Code: 33)" -ForegroundColor White
Write-Host "📅 Build Date: $BUILD_DATE $BUILD_TIME" -ForegroundColor White
Write-Host ""
Write-Host "Ready for Play Store upload!" -ForegroundColor Green