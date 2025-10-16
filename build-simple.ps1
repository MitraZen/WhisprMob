Write-Host "Starting Whispr Mobile App Production Build..." -ForegroundColor Green
Write-Host "Version: 1.2.14 (Code: 33)" -ForegroundColor Cyan

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "android/app/build") {
    Remove-Item -Recurse -Force "android/app/build"
}
if (Test-Path "builds/latest") {
    Remove-Item -Recurse -Force "builds/latest"
}
New-Item -ItemType Directory -Path "builds/latest" -Force | Out-Null

# Build Android release
Write-Host "Building Android release..." -ForegroundColor Yellow
cd android
./gradlew clean
./gradlew assembleRelease
./gradlew bundleRelease
cd ..

# Move files to builds/latest
Write-Host "Moving build files..." -ForegroundColor Yellow
$APK_SOURCE = "android/app/build/outputs/apk/release/app-release.apk"
$AAB_SOURCE = "android/app/build/outputs/bundle/release/app-release.aab"

$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_TIME = Get-Date -Format "HH-mm"
$APK_NAME = "Whispr_v1.2.14_v33_$BUILD_DATE`_$BUILD_TIME.apk"
$AAB_NAME = "Whispr_v1.2.14_v33_$BUILD_DATE`_$BUILD_TIME.aab"

if (Test-Path $APK_SOURCE) {
    Copy-Item $APK_SOURCE "builds/latest/$APK_NAME"
    Write-Host "APK created: $APK_NAME" -ForegroundColor Green
} else {
    Write-Host "APK not found!" -ForegroundColor Red
}

if (Test-Path $AAB_SOURCE) {
    Copy-Item $AAB_SOURCE "builds/latest/$AAB_NAME"
    Write-Host "AAB created: $AAB_NAME" -ForegroundColor Green
} else {
    Write-Host "AAB not found!" -ForegroundColor Red
}

Write-Host "Production build completed successfully!" -ForegroundColor Green
Write-Host "Files saved to: builds/latest/" -ForegroundColor Cyan
Write-Host "Version: 1.2.14 (Code: 33)" -ForegroundColor White
Write-Host "Ready for Play Store upload!" -ForegroundColor Green
