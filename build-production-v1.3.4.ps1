# Build Production APK and AAB for Whispr Mobile App v1.3.4
# This script generates both APK and AAB files for Play Store deployment

Write-Host "Starting Whispr Mobile App Production Build v1.3.4" -ForegroundColor Green

# Configuration
$VERSION_NAME = "1.3.4"
$VERSION_CODE = 44
$BUILD_DATE = (Get-Date -Format "yyyy-MM-dd_HH-mm")
$BUILDS_ROOT_DIR = "builds"
$BUILDS_DIR = "$BUILDS_ROOT_DIR/v${VERSION_NAME}_${BUILD_DATE}"

Write-Host "Version Name: $VERSION_NAME" -ForegroundColor White
Write-Host "Version Code: $VERSION_CODE" -ForegroundColor White
Write-Host "Build Date: $BUILD_DATE" -ForegroundColor White

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "android/app/build") {
    Remove-Item -Recurse -Force "android/app/build"
}
if (Test-Path "android/build") {
    Remove-Item -Recurse -Force "android/build"
}

# Create build directory
if (!(Test-Path $BUILDS_ROOT_DIR)) {
    New-Item -ItemType Directory -Path $BUILDS_ROOT_DIR | Out-Null
}
if (!(Test-Path $BUILDS_DIR)) {
    New-Item -ItemType Directory -Path $BUILDS_DIR | Out-Null
}

# Build Release APK
Write-Host "Building Release APK..." -ForegroundColor Yellow
Set-Location android
$apkResult = & ./gradlew assembleRelease
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "APK build successful!" -ForegroundColor Green
} else {
    Write-Host "APK build failed!" -ForegroundColor Red
    exit 1
}

# Build Release AAB
Write-Host "Building Release AAB..." -ForegroundColor Yellow
Set-Location android
$aabResult = & ./gradlew bundleRelease
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "AAB build successful!" -ForegroundColor Green
} else {
    Write-Host "AAB build failed!" -ForegroundColor Red
    exit 1
}

# Copy APK with naming convention
$apkSource = "android/app/build/outputs/apk/release/app-release.apk"
$apkDestination = "$BUILDS_DIR/Whispr_v1.34_v${VERSION_CODE}_${BUILD_DATE}.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDestination
    $apkSize = [math]::Round((Get-Item $apkDestination).Length / 1MB, 1)
    Write-Host "APK copied: $apkSize MB" -ForegroundColor Green
}

# Copy AAB with naming convention
$aabSource = "android/app/build/outputs/bundle/release/app-release.aab"
$aabDestination = "$BUILDS_DIR/Whispr_v1.34_v${VERSION_CODE}_${BUILD_DATE}.aab"

if (Test-Path $aabSource) {
    Copy-Item $aabSource $aabDestination
    $aabSize = [math]::Round((Get-Item $aabDestination).Length / 1MB, 1)
    Write-Host "AAB copied: $aabSize MB" -ForegroundColor Green
}

# Copy to latest directory
$latestDir = "$BUILDS_ROOT_DIR/latest"
if (!(Test-Path $latestDir)) {
    New-Item -ItemType Directory -Path $latestDir | Out-Null
}

if (Test-Path $apkDestination) {
    Copy-Item $apkDestination "$latestDir/" -Force
}
if (Test-Path $aabDestination) {
    Copy-Item $aabDestination "$latestDir/" -Force
}

# Create build info
$buildInfo = "Whispr Mobile App Build Information`nVersion Name: $VERSION_NAME`nVersion Code: $VERSION_CODE`nBuild Date: $BUILD_DATE`nBuild Type: Production Release`n`nKey Changes:`n- Fixed OnePlus full-screen display issue`n- Implemented device-specific safe area handling`n- Enhanced text contrast across all devices`n- Improved chat UI consistency`n- Professional device detection and configuration`n- Database constraint fixes for achievements`n- Moved Delete Account option to bottom of ProfileScreen`n`nPrevious Version: 1.3.3 (Version Code: 43)"

$buildInfoFile = "$BUILDS_DIR/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"
$buildInfo | Out-File -FilePath $buildInfoFile -Encoding UTF8
Copy-Item $buildInfoFile "$latestDir/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt" -Force

Write-Host ""
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "Version: $VERSION_NAME (Code: $VERSION_CODE)" -ForegroundColor White
Write-Host "Files generated in: $BUILDS_DIR" -ForegroundColor White
Write-Host "Latest files in: $latestDir" -ForegroundColor White
Write-Host "Ready for Play Store deployment!" -ForegroundColor Green



