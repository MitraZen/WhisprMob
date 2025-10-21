# Whispr Mobile App - Production Build Script v1.3.5
# Version: 1.3.5
# Version Code: 45
# Date: $(Get-Date -Format "yyyy-MM-dd_HH-mm-ss")

Write-Host "🚀 Starting Whispr Mobile App Production Build v1.3.5" -ForegroundColor Green
Write-Host "📱 Version Name: 1.3.5" -ForegroundColor Cyan
Write-Host "🔢 Version Code: 45" -ForegroundColor Cyan
Write-Host "📅 Build Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

# Build configuration
$VERSION_NAME = "1.3.5"
$VERSION_CODE = "45"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BUILDS_DIR = "$PSScriptRoot\builds"
$LATEST_DIR = "$BUILDS_DIR\latest"

# File naming convention: Whispr_v1.35_v45_2025-Date_Time
$APK_NAME = "Whispr_v1.35_v45_$BUILD_DATE.apk"
$AAB_NAME = "Whispr_v1.35_v45_$BUILD_DATE.aab"

Write-Host "📁 Build Directory: $BUILDS_DIR" -ForegroundColor Yellow
Write-Host "📦 APK Name: $APK_NAME" -ForegroundColor Yellow
Write-Host "📦 AAB Name: $AAB_NAME" -ForegroundColor Yellow

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Path "$PSScriptRoot\android\app\build", "$PSScriptRoot\android\build" -Recurse -Force -ErrorAction SilentlyContinue

# Create builds directory
New-Item -ItemType Directory -Path $BUILDS_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $LATEST_DIR -Force | Out-Null

# Build Release APK
Write-Host "🔨 Building Release APK..." -ForegroundColor Green
Set-Location android
$apkResult = & ./gradlew assembleRelease 2>&1
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ APK build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ APK build failed!" -ForegroundColor Red
    Write-Host $apkResult -ForegroundColor Red
    exit 1
}

# Build Release AAB
Write-Host "🔨 Building Release AAB..." -ForegroundColor Green
Set-Location android
$aabResult = & ./gradlew bundleRelease 2>&1
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ AAB build successful!" -ForegroundColor Green
} else {
    Write-Host "❌ AAB build failed!" -ForegroundColor Red
    Write-Host $aabResult -ForegroundColor Red
    exit 1
}

# Copy APK to builds directory
$apkSource = "$PSScriptRoot\android\app\build\outputs\apk\release\app-release.apk"
$apkDest = "$BUILDS_DIR\$APK_NAME"
$apkLatestDest = "$LATEST_DIR\$APK_NAME"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest
    Copy-Item $apkSource $apkLatestDest
    Write-Host "📦 APK copied to: $apkDest" -ForegroundColor Green
    Write-Host "📦 APK copied to latest: $apkLatestDest" -ForegroundColor Green
} else {
    Write-Host "❌ APK file not found at: $apkSource" -ForegroundColor Red
}

# Copy AAB to builds directory
$aabSource = "$PSScriptRoot\android\app\build\outputs\bundle\release\app-release.aab"
$aabDest = "$BUILDS_DIR\$AAB_NAME"
$aabLatestDest = "$LATEST_DIR\$AAB_NAME"

if (Test-Path $aabSource) {
    Copy-Item $aabSource $aabDest
    Copy-Item $aabSource $aabLatestDest
    Write-Host "📦 AAB copied to: $aabDest" -ForegroundColor Green
    Write-Host "📦 AAB copied to latest: $aabLatestDest" -ForegroundColor Green
} else {
    Write-Host "❌ AAB file not found at: $aabSource" -ForegroundColor Red
}

# Create Build Info File
$buildInfoContent = @"
Whispr Mobile App - Build Information
=====================================

Version Name: $VERSION_NAME
Version Code: $VERSION_CODE
Build Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Build Type: Release

Files Generated:
- APK: $APK_NAME
- AAB: $AAB_NAME

Key Features in this Build:
- Fixed clear chat functionality
- Quick reactions (tap-to-react) with emoji picker
- Whisper replies (swipe-to-reply) functionality
- Improved buddy options modal design
- Enhanced message reactions and replies
- Cleaned up debug logging
- Optimized performance

Build completed successfully!
"@

$buildInfoFile = "$BUILDS_DIR\build_info_v$VERSION_NAME`_v$VERSION_CODE.txt"
$buildInfoLatestFile = "$LATEST_DIR\build_info_v$VERSION_NAME`_v$VERSION_CODE.txt"

$buildInfoContent | Out-File -FilePath $buildInfoFile -Encoding UTF8
$buildInfoContent | Out-File -FilePath $buildInfoLatestFile -Encoding UTF8

Write-Host "📄 Build info created: $buildInfoFile" -ForegroundColor Green

# Create Play Store Deployment Guide
$deploymentGuideContent = @"
# Whispr Mobile App - Play Store Deployment Guide v$VERSION_NAME

## Build Information
- **Version Name:** $VERSION_NAME
- **Version Code:** $VERSION_CODE
- **Build Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Build Type:** Release

## Files for Upload
- **AAB File:** $AAB_NAME
- **APK File:** $APK_NAME (for testing)

## Release Notes for Play Store

### What's New in Version $VERSION_NAME
- 🗑️ **Fixed Clear Chat Functionality** - Chat clearing now works properly and removes all messages
- 💬 **Quick Reactions** - Tap and hold messages to react with emojis (❤️ 😆 😮 😢 🙏)
- 💭 **Whisper Replies** - Swipe right on messages to reply with subtle "Reply to" labels
- 🎨 **Improved Buddy Options** - Redesigned buddy card long-press options with horizontal layout
- 🧹 **Code Cleanup** - Removed debug logging for cleaner console output
- ⚡ **Performance Optimizations** - Enhanced message loading and caching

### Bug Fixes
- Fixed clear chat not actually clearing messages from database
- Improved message deletion to handle multiple buddy relationships
- Enhanced error handling for chat operations
- Optimized database queries for better performance

## Deployment Steps
1. Go to Google Play Console
2. Select your app
3. Go to "Release" > "Production"
4. Click "Create new release"
5. Upload the AAB file: **$AAB_NAME**
6. Add release notes (see above)
7. Review and publish

## Testing
- Test the APK file first: **$APK_NAME**
- Verify clear chat functionality works
- Test quick reactions and whisper replies
- Check buddy options modal design

---
Build completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

$deploymentGuideFile = "$BUILDS_DIR\PLAYSTORE_DEPLOYMENT_v$VERSION_NAME.md"
$deploymentGuideLatestFile = "$LATEST_DIR\PLAYSTORE_DEPLOYMENT_v$VERSION_NAME.md"

$deploymentGuideContent | Out-File -FilePath $deploymentGuideFile -Encoding UTF8
$deploymentGuideContent | Out-File -FilePath $deploymentGuideLatestFile -Encoding UTF8

Write-Host "📋 Deployment guide created: $deploymentGuideFile" -ForegroundColor Green

# Final Summary
Write-Host "`n🎉 Build Process Completed Successfully!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "📱 Version: $VERSION_NAME ($VERSION_CODE)" -ForegroundColor Cyan
Write-Host "📦 APK: $APK_NAME" -ForegroundColor Cyan
Write-Host "📦 AAB: $AAB_NAME" -ForegroundColor Cyan
Write-Host "📁 Location: $BUILDS_DIR" -ForegroundColor Cyan
Write-Host "📁 Latest: $LATEST_DIR" -ForegroundColor Cyan
Write-Host "`n🚀 Ready for Play Store deployment!" -ForegroundColor Green


