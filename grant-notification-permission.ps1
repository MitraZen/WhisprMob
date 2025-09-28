# Grant notification permission for Whispr app on Android emulator
# This script grants the POST_NOTIFICATIONS permission via ADB

Write-Host "Granting notification permission for Whispr app..." -ForegroundColor Green

# Check if ADB is available
$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
if (-not (Test-Path $adbPath)) {
    Write-Host "Error: ADB not found at $adbPath" -ForegroundColor Red
    Write-Host "Please ensure ANDROID_HOME is set correctly" -ForegroundColor Yellow
    exit 1
}

# Grant the permission
Write-Host "Granting POST_NOTIFICATIONS permission..." -ForegroundColor Yellow
& $adbPath shell pm grant com.whisprmobiletemp android.permission.POST_NOTIFICATIONS

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Permission granted successfully!" -ForegroundColor Green
    
    # Verify the permission
    Write-Host "Verifying permission status..." -ForegroundColor Yellow
    & $adbPath shell dumpsys package com.whisprmobiletemp | Select-String "android.permission.POST_NOTIFICATIONS"
    
    # Send a test notification
    Write-Host "Sending test notification..." -ForegroundColor Yellow
    & $adbPath shell cmd notification post -S bigtext -t "Whispr Test" "Notification permission granted successfully!" notification
    
    Write-Host "✅ Notification permission setup complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to grant permission" -ForegroundColor Red
    Write-Host "Make sure the app is installed and the emulator is running" -ForegroundColor Yellow
}
