# AVD (Android Virtual Device) Setup Check
# This script checks your Android emulator configuration

Write-Host "=== Android Virtual Device (AVD) Setup Check ===" -ForegroundColor Green

# Check AVD directory
$avdPath = "$env:USERPROFILE\.android\avd"
Write-Host "`n1. Checking AVD Directory..." -ForegroundColor Yellow
Write-Host "AVD Path: $avdPath" -ForegroundColor Cyan

if (Test-Path $avdPath) {
    Write-Host "✅ AVD directory exists" -ForegroundColor Green
    
    # List available AVDs
    $avds = Get-ChildItem $avdPath -Name "*.avd" -ErrorAction SilentlyContinue
    if ($avds) {
        Write-Host "`nAvailable Virtual Devices:" -ForegroundColor Green
        foreach ($avd in $avds) {
            $avdName = $avd -replace '\.avd', ''
            Write-Host "  ✅ $avdName" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ No virtual devices found" -ForegroundColor Red
        Write-Host "You need to create a virtual device in Android Studio" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ AVD directory not found" -ForegroundColor Red
    Write-Host "This is normal if you haven't created any virtual devices yet" -ForegroundColor Yellow
}

# Check Android SDK platforms
Write-Host "`n2. Checking Android SDK Platforms..." -ForegroundColor Yellow
$platformsPath = "$env:LOCALAPPDATA\Android\Sdk\platforms"
if (Test-Path $platformsPath) {
    $platforms = Get-ChildItem $platformsPath -Name -ErrorAction SilentlyContinue
    if ($platforms) {
        Write-Host "✅ Installed Android Platforms:" -ForegroundColor Green
        foreach ($platform in $platforms) {
            Write-Host "  ✅ $platform" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ No Android platforms installed" -ForegroundColor Red
        Write-Host "You need to install Android platforms in Android Studio" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Platforms directory not found" -ForegroundColor Red
}

# Check system images
Write-Host "`n3. Checking System Images..." -ForegroundColor Yellow
$systemImagesPath = "$env:LOCALAPPDATA\Android\Sdk\system-images"
if (Test-Path $systemImagesPath) {
    $images = Get-ChildItem $systemImagesPath -Recurse -Directory -ErrorAction SilentlyContinue
    if ($images) {
        Write-Host "✅ Available System Images:" -ForegroundColor Green
        foreach ($image in $images) {
            if ($image.Name -match "android-\d+") {
                Write-Host "  ✅ $($image.Name)" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "❌ No system images found" -ForegroundColor Red
    }
} else {
    Write-Host "❌ System images directory not found" -ForegroundColor Red
}

# Check emulator
Write-Host "`n4. Checking Android Emulator..." -ForegroundColor Yellow
$emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator"
if (Test-Path $emulatorPath) {
    Write-Host "✅ Android Emulator found" -ForegroundColor Green
    
    # Check if emulator executable exists
    $emulatorExe = Get-ChildItem $emulatorPath -Name "emulator.exe" -ErrorAction SilentlyContinue
    if ($emulatorExe) {
        Write-Host "✅ Emulator executable found" -ForegroundColor Green
    } else {
        Write-Host "❌ Emulator executable not found" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Android Emulator not found" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "Having AVD Manager is great! Here's what you need:" -ForegroundColor Yellow
Write-Host "1. ✅ AVD Manager (you have this)" -ForegroundColor Green
Write-Host "2. ❓ Android Platforms (check above)" -ForegroundColor Yellow
Write-Host "3. ❓ System Images (check above)" -ForegroundColor Yellow
Write-Host "4. ❓ Virtual Devices (check above)" -ForegroundColor Yellow

Write-Host "`n=== Next Steps ===" -ForegroundColor Green
Write-Host "If you see ❌ above, you need to:" -ForegroundColor Yellow
Write-Host "1. Open Android Studio" -ForegroundColor White
Write-Host "2. Go to Tools → SDK Manager" -ForegroundColor White
Write-Host "3. Install Android platforms (API 31, 33, 34)" -ForegroundColor White
Write-Host "4. Go to Tools → AVD Manager" -ForegroundColor White
Write-Host "5. Create a virtual device" -ForegroundColor White










