# Build Production APK and AAB for Whispr Mobile App v1.3.3
# This script generates both APK and AAB files for Play Store deployment

Write-Host "🚀 Starting Whispr Mobile App Production Build v1.3.3" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# --- Configuration ---
$VERSION_NAME = "1.3.3"
$VERSION_CODE = 43
$BUILD_DATE = (Get-Date -Format "yyyy-MM-dd_HH-mm")
$BUILDS_ROOT_DIR = "builds"
$BUILDS_DIR = "$BUILDS_ROOT_DIR/v${VERSION_NAME}_${BUILD_DATE}"

Write-Host "📋 Build Configuration:" -ForegroundColor Cyan
Write-Host "   Version Name: $VERSION_NAME" -ForegroundColor White
Write-Host "   Version Code: $VERSION_CODE" -ForegroundColor White
Write-Host "   Build Date: $BUILD_DATE" -ForegroundColor White
Write-Host "   Output Directory: $BUILDS_DIR" -ForegroundColor White
Write-Host ""

# --- Clean Previous Builds ---
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "android/app/build") {
    Remove-Item -Recurse -Force "android/app/build"
    Write-Host "   ✅ Cleaned android/app/build" -ForegroundColor Green
}

if (Test-Path "android/build") {
    Remove-Item -Recurse -Force "android/build"
    Write-Host "   ✅ Cleaned android/build" -ForegroundColor Green
}

# --- Create Build Directory ---
Write-Host "📁 Creating build directory..." -ForegroundColor Yellow
if (!(Test-Path $BUILDS_ROOT_DIR)) {
    New-Item -ItemType Directory -Path $BUILDS_ROOT_DIR | Out-Null
}
if (!(Test-Path $BUILDS_DIR)) {
    New-Item -ItemType Directory -Path $BUILDS_DIR | Out-Null
}
Write-Host "   ✅ Created $BUILDS_DIR" -ForegroundColor Green

# --- Build Release APK ---
Write-Host "🔨 Building Release APK..." -ForegroundColor Yellow
Set-Location android
$apkBuildResult = & ./gradlew assembleRelease 2>&1
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ APK build successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ APK build failed!" -ForegroundColor Red
    Write-Host "   Error: $apkBuildResult" -ForegroundColor Red
    exit 1
}

# --- Build Release AAB ---
Write-Host "🔨 Building Release AAB..." -ForegroundColor Yellow
Set-Location android
$aabBuildResult = & ./gradlew bundleRelease 2>&1
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ AAB build successful!" -ForegroundColor Green
} else {
    Write-Host "   ❌ AAB build failed!" -ForegroundColor Red
    Write-Host "   Error: $aabBuildResult" -ForegroundColor Red
    exit 1
}

# --- Copy APK to builds directory ---
Write-Host "📦 Copying APK to builds directory..." -ForegroundColor Yellow
$apkSource = "android/app/build/outputs/apk/release/app-release.apk"
$apkDestination = "$BUILDS_DIR/Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDestination
    $apkSize = [math]::Round((Get-Item $apkDestination).Length / 1MB, 1)
    Write-Host "   ✅ APK copied: $apkDestination ($apkSize MB)" -ForegroundColor Green
} else {
    Write-Host "   ❌ APK file not found at $apkSource" -ForegroundColor Red
}

# --- Copy AAB to builds directory ---
Write-Host "📦 Copying AAB to builds directory..." -ForegroundColor Yellow
$aabSource = "android/app/build/outputs/bundle/release/app-release.aab"
$aabDestination = "$BUILDS_DIR/Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}.aab"

if (Test-Path $aabSource) {
    Copy-Item $aabSource $aabDestination
    $aabSize = [math]::Round((Get-Item $aabDestination).Length / 1MB, 1)
    Write-Host "   ✅ AAB copied: $aabDestination ($aabSize MB)" -ForegroundColor Green
} else {
    Write-Host "   ❌ AAB file not found at $aabSource" -ForegroundColor Red
}

# --- Copy to latest directory ---
Write-Host "📁 Copying to latest directory..." -ForegroundColor Yellow
$latestDir = "$BUILDS_ROOT_DIR/latest"
if (!(Test-Path $latestDir)) {
    New-Item -ItemType Directory -Path $latestDir | Out-Null
}

# Copy APK to latest
if (Test-Path $apkDestination) {
    Copy-Item $apkDestination "$latestDir/" -Force
    Write-Host "   ✅ APK copied to latest directory" -ForegroundColor Green
}

# Copy AAB to latest
if (Test-Path $aabDestination) {
    Copy-Item $aabDestination "$latestDir/" -Force
    Write-Host "   ✅ AAB copied to latest directory" -ForegroundColor Green
}

# --- Create Build Info File ---
Write-Host "📄 Creating build info file..." -ForegroundColor Yellow
$buildInfoContent = "Whispr Mobile App Build Information`n" +
"-----------------------------------`n" +
"Version Name: $VERSION_NAME`n" +
"Version Code: $VERSION_CODE`n" +
"Build Date: $BUILD_DATE`n" +
"Build Type: Production Release`n`n" +
"Generated Files:`n" +
"  - APK: Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}.apk ($apkSize MB)`n" +
"  - AAB: Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}.aab ($aabSize MB)`n`n" +
"Key Changes in v$VERSION_NAME:`n" +
"- Fixed text contrast issues in message input fields`n" +
"- Implemented SmartSafeAreaView for debug borders`n" +
"- Enhanced text visibility across all devices`n" +
"- Improved chat UI consistency`n" +
"- Database constraint fixes for achievements`n" +
"- Moved Delete Account option to bottom of ProfileScreen`n`n" +
"Previous Version: 1.3.2 (Version Code: 42)`n`n" +
"File Naming Convention: Whispr_v1.33_v43_Date_time"

$buildInfoFile = "$BUILDS_DIR/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt"
$buildInfoContent | Out-File -FilePath $buildInfoFile -Encoding UTF8
Write-Host "   ✅ Build info created: $buildInfoFile" -ForegroundColor Green

# Copy build info to latest
Copy-Item $buildInfoFile "$latestDir/build_info_v${VERSION_NAME}_v${VERSION_CODE}.txt" -Force

# --- Build Summary ---
Write-Host ""
Write-Host "🎉 Build Complete!" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host "Version: $VERSION_NAME (Code: $VERSION_CODE)" -ForegroundColor White
Write-Host "Build Date: $BUILD_DATE" -ForegroundColor White
Write-Host ""
Write-Host "📁 Files Generated:" -ForegroundColor Cyan
Write-Host "   APK: $apkDestination" -ForegroundColor White
Write-Host "   AAB: $aabDestination" -ForegroundColor White
Write-Host "   Info: $buildInfoFile" -ForegroundColor White
Write-Host ""
Write-Host "📁 Latest Files:" -ForegroundColor Cyan
Write-Host "   APK: $latestDir/Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}.apk" -ForegroundColor White
Write-Host "   AAB: $latestDir/Whispr_v${VERSION_NAME}_v${VERSION_CODE}_${BUILD_DATE}.aab" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Ready for Play Store deployment!" -ForegroundColor Green
