# Whispr Mobile App Production Build Script v1.3.10
# This script builds both APK and AAB files for Play Store deployment

# Build configuration
$VERSION_NAME = "1.3.10"
$VERSION_CODE = "50"
$APP_NAME = "Whispr"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_TIME = Get-Date -Format "HH-mm"
$BUILD_TIMESTAMP = "${BUILD_DATE}_${BUILD_TIME}"

# File naming convention: Whispr_v1.3.10_v50_2025-Date_Time
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

# Display file sizes
$apkSize = (Get-Item $apkDest).Length / 1MB
$aabSize = (Get-Item $aabDest).Length / 1MB

Write-Host "Build Summary:" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host "APK: $APK_NAME" -ForegroundColor Green
Write-Host "AAB: $AAB_NAME" -ForegroundColor Green
Write-Host "APK Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
Write-Host "AAB Size: $([math]::Round($aabSize, 2)) MB" -ForegroundColor Green
Write-Host "Location: $BUILDS_DIR/" -ForegroundColor Cyan
Write-Host "Latest: $LATEST_DIR/" -ForegroundColor Cyan

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Ready for Play Store deployment" -ForegroundColor Green
