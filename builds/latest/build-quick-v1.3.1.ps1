# Quick Build Script for Whispr Mobile App v1.3.1
# This script generates APK and AAB files quickly

Write-Host "🚀 Quick Build for Whispr Mobile App v1.3.1" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Set version details
$VERSION_NAME = "1.3.1"
$VERSION_CODE = "41"

Write-Host "📋 Version: $VERSION_NAME (Code: $VERSION_CODE)" -ForegroundColor Yellow
Write-Host ""

# Create builds directory
$BUILDS_DIR = "builds"
if (!(Test-Path $BUILDS_DIR)) {
    New-Item -ItemType Directory -Path $BUILDS_DIR -Force | Out-Null
}

Write-Host "🔨 Building Release APK..." -ForegroundColor Yellow
Push-Location android
& ./gradlew assembleRelease
Pop-Location

if ($LASTEXITCODE -eq 0) {
    $apkSource = "android/app/build/outputs/apk/release/app-release.apk"
    $apkDestination = "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.apk"
    Copy-Item $apkSource $apkDestination
    Write-Host "✅ APK built: $apkDestination" -ForegroundColor Green
} else {
    Write-Host "❌ APK build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Building Release AAB..." -ForegroundColor Yellow
Push-Location android
& ./gradlew bundleRelease
Pop-Location

if ($LASTEXITCODE -eq 0) {
    $aabSource = "android/app/build/outputs/bundle/release/app-release.aab"
    $aabDestination = "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.aab"
    Copy-Item $aabSource $aabDestination
    Write-Host "✅ AAB built: $aabDestination" -ForegroundColor Green
} else {
    Write-Host "❌ AAB build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Build completed successfully!" -ForegroundColor Green
Write-Host "📦 Files ready for Play Store deployment" -ForegroundColor Cyan
