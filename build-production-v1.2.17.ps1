# Whispr Mobile App - Production Build Script v1.2.17
# This script builds both APK and AAB files for Play Store deployment

Write-Host "🚀 Starting Whispr Mobile App Production Build v1.2.17" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Set build variables
$VERSION_NAME = "1.2.17"
$VERSION_CODE = "36"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd"
$BUILD_TIME = Get-Date -Format "HH-mm"
$BUILD_DIR = "builds\latest"

Write-Host "📱 Build Configuration:" -ForegroundColor Yellow
Write-Host "   Version Name: $VERSION_NAME" -ForegroundColor White
Write-Host "   Version Code: $VERSION_CODE" -ForegroundColor White
Write-Host "   Build Date: $BUILD_DATE" -ForegroundColor White
Write-Host "   Build Time: $BUILD_TIME" -ForegroundColor White
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "android\app\build.gradle")) {
    Write-Host "❌ Error: Not in the correct project directory" -ForegroundColor Red
    Write-Host "   Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if Android SDK is available
Write-Host "🔍 Checking Android SDK..." -ForegroundColor Yellow
try {
    $androidHome = $env:ANDROID_HOME
    if (-not $androidHome) {
        Write-Host "❌ ANDROID_HOME environment variable not set" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Android SDK found at: $androidHome" -ForegroundColor Green
} catch {
    Write-Host "❌ Android SDK not found" -ForegroundColor Red
    exit 1
}

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
try {
    Set-Location android
    .\gradlew clean
    Set-Location ..
    Write-Host "✅ Clean completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Clean failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Build APK
Write-Host "📦 Building APK file..." -ForegroundColor Yellow
try {
    Set-Location android
    .\gradlew assembleRelease
    Set-Location ..
    
    # Copy APK to builds directory
    $apkSource = "android\app\build\outputs\apk\release\app-release.apk"
    $apkDestination = "$BUILD_DIR\Whispr_v$VERSION_NAME`_v$VERSION_CODE`_$BUILD_DATE`_$BUILD_TIME.apk"
    
    if (Test-Path $apkSource) {
        Copy-Item $apkSource $apkDestination
        Write-Host "✅ APK built successfully: $apkDestination" -ForegroundColor Green
        
        # Get APK file size
        $apkSize = (Get-Item $apkDestination).Length / 1MB
        Write-Host "   APK Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor White
    } else {
        Write-Host "❌ APK file not found at: $apkSource" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ APK build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Build AAB
Write-Host "📦 Building AAB file..." -ForegroundColor Yellow
try {
    Set-Location android
    .\gradlew bundleRelease
    Set-Location ..
    
    # Copy AAB to builds directory
    $aabSource = "android\app\build\outputs\bundle\release\app-release.aab"
    $aabDestination = "$BUILD_DIR\Whispr_v$VERSION_NAME`_v$VERSION_CODE`_$BUILD_DATE`_$BUILD_TIME.aab"
    
    if (Test-Path $aabSource) {
        Copy-Item $aabSource $aabDestination
        Write-Host "✅ AAB built successfully: $aabDestination" -ForegroundColor Green
        
        # Get AAB file size
        $aabSize = (Get-Item $aabDestination).Length / 1MB
        Write-Host "   AAB Size: $([math]::Round($aabSize, 2)) MB" -ForegroundColor White
    } else {
        Write-Host "❌ AAB file not found at: $aabSource" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ AAB build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify build files
Write-Host "🔍 Verifying build files..." -ForegroundColor Yellow
$apkExists = Test-Path $apkDestination
$aabExists = Test-Path $aabDestination

if ($apkExists -and $aabExists) {
    Write-Host "✅ Both build files created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Build verification failed" -ForegroundColor Red
    if (-not $apkExists) { Write-Host "   APK file missing" -ForegroundColor Red }
    if (-not $aabExists) { Write-Host "   AAB file missing" -ForegroundColor Red }
    exit 1
}

# Display build summary
Write-Host ""
Write-Host "🎉 Build Summary" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host "✅ Version: $VERSION_NAME (Code: $VERSION_CODE)" -ForegroundColor White
Write-Host "✅ Build Date: $BUILD_DATE $BUILD_TIME" -ForegroundColor White
Write-Host "✅ APK File: Whispr_v$VERSION_NAME`_v$VERSION_CODE`_$BUILD_DATE`_$BUILD_TIME.apk" -ForegroundColor White
Write-Host "✅ AAB File: Whispr_v$VERSION_NAME`_v$VERSION_CODE`_$BUILD_DATE`_$BUILD_TIME.aab" -ForegroundColor White
Write-Host "✅ Build Directory: $BUILD_DIR" -ForegroundColor White
Write-Host ""

# Display file sizes
Write-Host "📊 File Sizes:" -ForegroundColor Yellow
if ($apkExists) {
    $apkSize = (Get-Item $apkDestination).Length / 1MB
    Write-Host "   APK: $([math]::Round($apkSize, 2)) MB" -ForegroundColor White
}
if ($aabExists) {
    $aabSize = (Get-Item $aabDestination).Length / 1MB
    Write-Host "   AAB: $([math]::Round($aabSize, 2)) MB" -ForegroundColor White
}

Write-Host ""
Write-Host "🚀 Build completed successfully!" -ForegroundColor Green
Write-Host "📱 Ready for Play Store deployment" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload AAB file to Google Play Console" -ForegroundColor White
Write-Host "2. Use version code $VERSION_CODE for this release" -ForegroundColor White
Write-Host "3. Test on internal track before production release" -ForegroundColor White
Write-Host "4. Review release notes in Whispr_v$VERSION_NAME`_ReleaseNotes.md" -ForegroundColor White