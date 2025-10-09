# Whispr Mobile App - Play Store Build Script (PowerShell)
# This script generates both AAB and APK files for Play Store release

Write-Host "🚀 Starting Whispr Mobile App Play Store Build..." -ForegroundColor Green
Write-Host "📱 Version: 1.1.2 (Build 8)" -ForegroundColor Cyan
Write-Host "📅 Date: $(Get-Date)" -ForegroundColor Cyan
Write-Host ""

# Set build directory
$BUILD_DIR = "builds"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Create builds directory if it doesn't exist
if (!(Test-Path $BUILD_DIR)) {
    New-Item -ItemType Directory -Path $BUILD_DIR
}

Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
Set-Location android
& .\gradlew clean
Set-Location ..

Write-Host ""
Write-Host "📦 Building AAB (Android App Bundle) for Play Store..." -ForegroundColor Yellow

# Build AAB file
Set-Location android
& .\gradlew bundleRelease
Set-Location ..

# Copy AAB to builds directory
$AAB_FILE = "Whispr_v1.1.2_$TIMESTAMP.aab"
Copy-Item "android\app\build\outputs\bundle\release\app-release.aab" "$BUILD_DIR\$AAB_FILE"

Write-Host "✅ AAB file created: $BUILD_DIR\$AAB_FILE" -ForegroundColor Green
Write-Host ""

Write-Host "📦 Building APK file..." -ForegroundColor Yellow

# Build APK file
Set-Location android
& .\gradlew assembleRelease
Set-Location ..

# Copy APK to builds directory
$APK_FILE = "Whispr_v1.1.2_$TIMESTAMP.apk"
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" "$BUILD_DIR\$APK_FILE"

Write-Host "✅ APK file created: $BUILD_DIR\$APK_FILE" -ForegroundColor Green
Write-Host ""

# Generate release notes
$RELEASE_NOTES_FILE = "$BUILD_DIR\ReleaseNotes_v1.1.2.md"
$RELEASE_NOTES = @"
# Whispr Mobile App - Release v1.1.2

**Build Date:** $(Get-Date)
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
- **AAB File**: ``$AAB_FILE`` (For Play Store upload)
- **APK File**: ``$APK_FILE`` (For direct installation)

## 🚀 Deployment Instructions

### For Play Store:
1. Upload the AAB file (``$AAB_FILE``) to Google Play Console
2. Fill in release notes and screenshots
3. Submit for review

### For Direct Installation:
1. Use the APK file (``$APK_FILE``) for direct installation
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
"@

$RELEASE_NOTES | Out-File -FilePath $RELEASE_NOTES_FILE -Encoding UTF8

Write-Host "📝 Release notes created: $RELEASE_NOTES_FILE" -ForegroundColor Green
Write-Host ""

# Display file sizes
Write-Host "📊 Build Summary:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
$AAB_SIZE = (Get-Item "$BUILD_DIR\$AAB_FILE").Length / 1MB
$APK_SIZE = (Get-Item "$BUILD_DIR\$APK_FILE").Length / 1MB
Write-Host "AAB File: $BUILD_DIR\$AAB_FILE ($([math]::Round($AAB_SIZE, 2)) MB)" -ForegroundColor White
Write-Host "APK File: $BUILD_DIR\$APK_FILE ($([math]::Round($APK_SIZE, 2)) MB)" -ForegroundColor White
Write-Host "Release Notes: $RELEASE_NOTES_FILE" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Build completed successfully!" -ForegroundColor Green
Write-Host "📱 Ready for Play Store upload!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload AAB file to Google Play Console" -ForegroundColor White
Write-Host "2. Fill in release information" -ForegroundColor White
Write-Host "3. Submit for review" -ForegroundColor White
Write-Host ""
Write-Host "Files are located in the '$BUILD_DIR' directory." -ForegroundColor Cyan

