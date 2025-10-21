# Whispr Mobile App - Production Build Script v1.3.6
# This script builds both APK and AAB files for Play Store deployment

# Build configuration
$VERSION_NAME = "1.3.6"
$VERSION_CODE = "46"
$APP_NAME = "Whispr"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_TIME = Get-Date -Format "HH-mm"
$BUILD_TIMESTAMP = "${BUILD_DATE}_${BUILD_TIME}"

# File naming convention: Whispr_v1.3.6_v46_2025-Date_Time
$APK_NAME = "${APP_NAME}_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_TIMESTAMP}.apk"
$AAB_NAME = "${APP_NAME}_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_TIMESTAMP}.aab"

# Directories
$BUILDS_DIR = "builds"
$LATEST_DIR = "builds/latest"

Write-Host "Starting Whispr Mobile App Production Build v${VERSION_NAME}" -ForegroundColor Green
Write-Host "Version Code: ${VERSION_CODE}" -ForegroundColor Cyan
Write-Host "Build Date: ${BUILD_DATE} ${BUILD_TIME}" -ForegroundColor Cyan
Write-Host "APK Name: ${APK_NAME}" -ForegroundColor Yellow
Write-Host "AAB Name: ${AAB_NAME}" -ForegroundColor Yellow

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Blue
Remove-Item -Path "$PSScriptRoot/android/app/build", "$PSScriptRoot/android/build" -Recurse -Force -ErrorAction SilentlyContinue

# Create build directories
Write-Host "Creating build directories..." -ForegroundColor Blue
New-Item -ItemType Directory -Path $BUILDS_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $LATEST_DIR -Force | Out-Null

# Build Release APK
Write-Host "Building Release APK..." -ForegroundColor Blue
Set-Location android
$apkResult = & ./gradlew assembleRelease 2>&1
Set-Location ..

if ($LASTEXITCODE -ne 0) {
    Write-Host "APK build failed!" -ForegroundColor Red
    Write-Host $apkResult -ForegroundColor Red
    exit 1
}

# Build Release AAB
Write-Host "Building Release AAB..." -ForegroundColor Blue
Set-Location android
$aabResult = & ./gradlew bundleRelease 2>&1
Set-Location ..

if ($LASTEXITCODE -ne 0) {
    Write-Host "AAB build failed!" -ForegroundColor Red
    Write-Host $aabResult -ForegroundColor Red
    exit 1
}

# Copy APK to build directory
$apkSource = "android/app/build/outputs/apk/release/app-release.apk"
$apkDest = "$BUILDS_DIR/$APK_NAME"
$apkLatest = "$LATEST_DIR/$APK_NAME"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest -Force
    Copy-Item $apkSource $apkLatest -Force
    Write-Host "APK copied successfully: $APK_NAME" -ForegroundColor Green
} else {
    Write-Host "APK file not found at: $apkSource" -ForegroundColor Red
    exit 1
}

# Copy AAB to build directory
$aabSource = "android/app/build/outputs/bundle/release/app-release.aab"
$aabDest = "$BUILDS_DIR/$AAB_NAME"
$aabLatest = "$LATEST_DIR/$AAB_NAME"

if (Test-Path $aabSource) {
    Copy-Item $aabSource $aabDest -Force
    Copy-Item $aabSource $aabLatest -Force
    Write-Host "AAB copied successfully: $AAB_NAME" -ForegroundColor Green
} else {
    Write-Host "AAB file not found at: $aabSource" -ForegroundColor Red
    exit 1
}

# Create Build Info File
$buildInfoFile = "$BUILDS_DIR/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"
$buildInfoLatest = "$LATEST_DIR/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"

"Whispr Mobile App - Build Information" | Out-File -FilePath $buildInfoFile -Encoding UTF8
"=====================================" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Version Name: $VERSION_NAME" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Version Code: $VERSION_CODE" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Build Date: $BUILD_DATE" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Build Time: $BUILD_TIME" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Build Timestamp: $BUILD_TIMESTAMP" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Files Generated:" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"APK: $APK_NAME" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"AAB: $AAB_NAME" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Build Location:" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"APK: $BUILDS_DIR/$APK_NAME" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"AAB: $BUILDS_DIR/$AAB_NAME" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Latest: $LATEST_DIR/" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Key Changes:" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Fixed FCM token storage and retrieval" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Improved notification reliability in production" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Enhanced buddy list real-time updates" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Fixed database constraint issues" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Optimized performance and stability" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8
"Build completed successfully at: $(Get-Date)" | Out-File -FilePath $buildInfoFile -Append -Encoding UTF8

Copy-Item $buildInfoFile $buildInfoLatest -Force

# Create Play Store Deployment Guide
$deploymentFile = "$BUILDS_DIR/PLAYSTORE_DEPLOYMENT_v${VERSION_NAME}.md"
$deploymentLatest = "$LATEST_DIR/PLAYSTORE_DEPLOYMENT_v${VERSION_NAME}.md"

"# Whispr Mobile App - Play Store Deployment Guide v$VERSION_NAME" | Out-File -FilePath $deploymentFile -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"## Build Information" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Version Name: $VERSION_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Version Code: $VERSION_CODE" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Build Date: $BUILD_DATE $BUILD_TIME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"APK File: $APK_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"AAB File: $AAB_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"## Deployment Steps" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"### 1. Upload to Play Console" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"1. Go to Google Play Console" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"2. Select your Whispr app" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"3. Navigate to Production Create new release" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"4. Upload the AAB file: $AAB_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"### 2. Release Notes" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"What is New:" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Fixed FCM token storage and retrieval" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Improved notification reliability in production" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Enhanced buddy list real-time updates" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Fixed database constraint issues" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Optimized performance and stability" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"### 3. Testing" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Test APK available: $APK_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Install on test devices before production release" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Verify all features work correctly" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"### 4. Release" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Review all information carefully" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Set rollout percentage (recommend 20% initially)" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Monitor for any issues" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Gradually increase rollout percentage" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"## Files Location" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"AAB (Production): $BUILDS_DIR/$AAB_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"APK (Testing): $BUILDS_DIR/$APK_NAME" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Latest Builds: $LATEST_DIR/" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"## Support" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"For any issues or questions, refer to the development team." | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8
"Generated on: $(Get-Date)" | Out-File -FilePath $deploymentFile -Append -Encoding UTF8

Copy-Item $deploymentFile $deploymentLatest -Force

# Display file sizes
$apkSize = (Get-Item $apkDest).Length / 1MB
$aabSize = (Get-Item $aabDest).Length / 1MB

Write-Host "Build Summary:" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host "APK: $APK_NAME" -ForegroundColor Green
Write-Host "AAB: $AAB_NAME" -ForegroundColor Green
Write-Host "Location: $BUILDS_DIR/" -ForegroundColor Cyan
Write-Host "Latest: $LATEST_DIR/" -ForegroundColor Cyan

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Ready for Play Store deployment" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the APK: $APK_NAME" -ForegroundColor White
Write-Host "2. Upload AAB to Play Console: $AAB_NAME" -ForegroundColor White
Write-Host "3. Review deployment guide: PLAYSTORE_DEPLOYMENT_v1.3.6.md" -ForegroundColor White