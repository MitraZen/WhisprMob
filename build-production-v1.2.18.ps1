# Production Build Script for Whispr Mobile App v1.2.18
# This script creates both APK and AAB files for Play Store

Write-Host "Starting Whispr Mobile App Production Build v1.2.18" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Get current date and time
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_TIME = Get-Date -Format "HH-mm"
$VERSION_NAME = "1.2.18"
$VERSION_CODE = "37"

Write-Host "Build Date: $BUILD_DATE" -ForegroundColor Cyan
Write-Host "Build Time: $BUILD_TIME" -ForegroundColor Cyan
Write-Host "Version Name: $VERSION_NAME" -ForegroundColor Cyan
Write-Host "Version Code: $VERSION_CODE" -ForegroundColor Cyan

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
Set-Location android
& .\gradlew clean
Set-Location ..

# Clean React Native cache
Write-Host "Cleaning React Native cache..." -ForegroundColor Yellow
Start-Process -FilePath "npx" -ArgumentList "react-native", "start", "--reset-cache", "--port=8081" -WindowStyle Hidden
Start-Sleep -Seconds 5
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*Metro*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Create builds directory if it doesn't exist
if (!(Test-Path "builds/latest")) {
    New-Item -ItemType Directory -Path "builds/latest" -Force
}

# Build APK
Write-Host "Building APK..." -ForegroundColor Blue
Set-Location android
& .\gradlew assembleRelease
Set-Location ..

# Copy APK to builds directory
$APK_NAME = "Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}_${BUILD_TIME}.apk"
Copy-Item "android/app/build/outputs/apk/release/app-release.apk" "builds/latest/$APK_NAME"
Write-Host "APK created: $APK_NAME" -ForegroundColor Green

# Build AAB (Android App Bundle)
Write-Host "Building AAB..." -ForegroundColor Blue
Set-Location android
& .\gradlew bundleRelease
Set-Location ..

# Copy AAB to builds directory
$AAB_NAME = "Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}_${BUILD_TIME}.aab"
Copy-Item "android/app/build/outputs/bundle/release/app-release.aab" "builds/latest/$AAB_NAME"
Write-Host "AAB created: $AAB_NAME" -ForegroundColor Green

# Create build info file
$BUILD_INFO_FILE = "builds/latest/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"
$BUILD_INFO = "Whispr Mobile App Build Information`n====================================`n`nVersion Name: $VERSION_NAME`nVersion Code: $VERSION_CODE`nBuild Date: $BUILD_DATE`nBuild Time: $BUILD_TIME`nBuild Type: Release`n`nFiles Created:`n- $APK_NAME`n- $AAB_NAME`n`nRelease Notes:`nVersion 1.2.18 - Enhanced user onboarding with comprehensive walkthrough system. Fixed walkthrough layout issues for better mobile experience. Made Auth Debugger admin-only for improved security. Implemented user-based walkthrough tracking and optimized performance. Added scrollable walkthrough content and centered navigation buttons.`n`nKey Features:`n- Comprehensive walkthrough system for new users`n- Fixed walkthrough layout and button positioning`n- Auth Debugger now admin-only for security`n- User-based walkthrough tracking`n- Optimized walkthrough performance`n- Scrollable content for better mobile experience`n- Centered navigation buttons`n- Enhanced user onboarding flow`n`nBuild completed successfully!"

Set-Content -Path $BUILD_INFO_FILE -Value $BUILD_INFO
Write-Host "Build info created: build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt" -ForegroundColor Green

# Display file sizes
Write-Host ""
Write-Host "Build Summary:" -ForegroundColor Magenta
Write-Host "==================" -ForegroundColor Magenta
$APK_SIZE = (Get-Item "builds/latest/$APK_NAME").Length / 1MB
$AAB_SIZE = (Get-Item "builds/latest/$AAB_NAME").Length / 1MB
Write-Host "APK: $([math]::Round($APK_SIZE, 2)) MB" -ForegroundColor White
Write-Host "AAB: $([math]::Round($AAB_SIZE, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "Production build completed successfully!" -ForegroundColor Green
Write-Host "Files saved to: builds/latest/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready for Play Store upload!" -ForegroundColor Green
