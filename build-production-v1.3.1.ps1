# Build Production Script for Whispr Mobile App v1.3.1
# This script generates both APK and AAB files for Play Store deployment

Write-Host "🚀 Starting Production Build for Whispr Mobile App v1.3.1" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Set version details
$VERSION_NAME = "1.3.1"
$VERSION_CODE = "41"
$BUILD_DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "📋 Build Details:" -ForegroundColor Yellow
Write-Host "   Version Name: $VERSION_NAME" -ForegroundColor White
Write-Host "   Version Code: $VERSION_CODE" -ForegroundColor White
Write-Host "   Build Date: $BUILD_DATE" -ForegroundColor White
Write-Host ""

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "android/app/build") {
    Remove-Item -Recurse -Force "android/app/build"
    Write-Host "   ✅ Cleaned android/app/build" -ForegroundColor Green
}

if (Test-Path "android/build") {
    Remove-Item -Recurse -Force "android/build"
    Write-Host "   ✅ Cleaned android/build" -ForegroundColor Green
}

# Clean React Native cache
Write-Host "🧹 Cleaning React Native cache..." -ForegroundColor Yellow
npx react-native start --reset-cache --port 8082 > $null 2>&1
Start-Sleep -Seconds 3
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*Metro*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "   ✅ React Native cache cleaned" -ForegroundColor Green

# Create builds directory
$BUILDS_DIR = "builds/v1.3.1_$BUILD_DATE"
if (!(Test-Path $BUILDS_DIR)) {
    New-Item -ItemType Directory -Path $BUILDS_DIR -Force | Out-Null
    Write-Host "   ✅ Created builds directory: $BUILDS_DIR" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔨 Building Release APK..." -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Yellow

# Build Release APK
try {
    $apkBuildStart = Get-Date
    Write-Host "   📱 Building APK..." -ForegroundColor White
    
    # Change to android directory and run gradle build
    Push-Location android
    $apkResult = & ./gradlew assembleRelease 2>&1
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        $apkBuildTime = (Get-Date) - $apkBuildStart
        Write-Host "   ✅ APK build completed in $($apkBuildTime.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green
        
        # Copy APK to builds directory
        $apkSource = "android/app/build/outputs/apk/release/app-release.apk"
        $apkDestination = "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.apk"
        
        if (Test-Path $apkSource) {
            Copy-Item $apkSource $apkDestination
            $apkSize = [math]::Round((Get-Item $apkDestination).Length / 1MB, 2)
            Write-Host "   📦 APK copied to: $apkDestination" -ForegroundColor Green
            Write-Host "   📊 APK Size: $apkSize MB" -ForegroundColor Cyan
        } else {
            Write-Host "   ❌ APK file not found at expected location" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ APK build failed!" -ForegroundColor Red
        Write-Host "   Error output:" -ForegroundColor Red
        Write-Host $apkResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ APK build error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Building Release AAB (Android App Bundle)..." -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Yellow

# Build Release AAB
try {
    $aabBuildStart = Get-Date
    Write-Host "   📱 Building AAB..." -ForegroundColor White
    
    # Change to android directory and run gradle build
    Push-Location android
    $aabResult = & ./gradlew bundleRelease 2>&1
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        $aabBuildTime = (Get-Date) - $aabBuildStart
        Write-Host "   ✅ AAB build completed in $($aabBuildTime.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green
        
        # Copy AAB to builds directory
        $aabSource = "android/app/build/outputs/bundle/release/app-release.aab"
        $aabDestination = "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.aab"
        
        if (Test-Path $aabSource) {
            Copy-Item $aabSource $aabDestination
            $aabSize = [math]::Round((Get-Item $aabDestination).Length / 1MB, 2)
            Write-Host "   📦 AAB copied to: $aabDestination" -ForegroundColor Green
            Write-Host "   📊 AAB Size: $aabSize MB" -ForegroundColor Cyan
        } else {
            Write-Host "   ❌ AAB file not found at expected location" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ AAB build failed!" -ForegroundColor Red
        Write-Host "   Error output:" -ForegroundColor Red
        Write-Host $aabResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ AAB build error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Build Summary" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   Version: $VERSION_NAME (Code: $VERSION_CODE)" -ForegroundColor White
Write-Host "   Build Date: $BUILD_DATE" -ForegroundColor White
Write-Host "   Build Directory: $BUILDS_DIR" -ForegroundColor White
Write-Host ""
Write-Host "📦 Generated Files:" -ForegroundColor Yellow
if (Test-Path "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.apk") {
    $apkSize = [math]::Round((Get-Item "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.apk").Length / 1MB, 2)
    Write-Host "   ✅ APK: WhisprMobile_v$VERSION_NAME.apk ($apkSize MB)" -ForegroundColor Green
}
if (Test-Path "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.aab") {
    $aabSize = [math]::Round((Get-Item "$BUILDS_DIR/WhisprMobile_v$VERSION_NAME.aab").Length / 1MB, 2)
    Write-Host "   ✅ AAB: WhisprMobile_v$VERSION_NAME.aab ($aabSize MB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Next Steps for Play Store Deployment:" -ForegroundColor Cyan
Write-Host "   1. Upload the AAB file to Google Play Console" -ForegroundColor White
Write-Host "   2. Use the APK file for testing or sideloading" -ForegroundColor White
Write-Host "   3. Update release notes in Play Console" -ForegroundColor White
Write-Host "   4. Submit for review" -ForegroundColor White

Write-Host ""
Write-Host "✨ Build completed successfully!" -ForegroundColor Green

