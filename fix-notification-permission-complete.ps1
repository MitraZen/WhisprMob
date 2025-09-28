# Fix Notification Permission for Whispr App
# This script handles notification permission issues on Android devices

Write-Host "=== WHISPR NOTIFICATION PERMISSION FIX ===" -ForegroundColor Green
Write-Host ""

# Check if ADB is available
$adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
if (-not (Test-Path $adbPath)) {
    Write-Host "❌ Error: ADB not found at $adbPath" -ForegroundColor Red
    Write-Host "Please ensure ANDROID_HOME is set correctly" -ForegroundColor Yellow
    Write-Host "You can set it with: `$env:ANDROID_HOME = 'C:\Users\YourName\AppData\Local\Android\Sdk'" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ ADB found at: $adbPath" -ForegroundColor Green

# Check if device is connected
Write-Host "Checking for connected devices..." -ForegroundColor Yellow
$devices = & $adbPath devices
if ($devices -match "device$") {
    Write-Host "✅ Device connected successfully" -ForegroundColor Green
} else {
    Write-Host "❌ No device connected or device not authorized" -ForegroundColor Red
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "1. Device is connected via USB" -ForegroundColor White
    Write-Host "2. USB Debugging is enabled" -ForegroundColor White
    Write-Host "3. Device is authorized for debugging" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=== STEP 1: GRANT NOTIFICATION PERMISSION ===" -ForegroundColor Cyan
Write-Host "Granting POST_NOTIFICATIONS permission..." -ForegroundColor Yellow

$grantResult = & $adbPath shell pm grant com.whisprmobiletemp android.permission.POST_NOTIFICATIONS 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Permission granted successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Permission grant result: $grantResult" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== STEP 2: VERIFY PERMISSION STATUS ===" -ForegroundColor Cyan
Write-Host "Checking permission status..." -ForegroundColor Yellow

$permissionCheck = & $adbPath shell dumpsys package com.whisprmobiletemp | Select-String "android.permission.POST_NOTIFICATIONS"
if ($permissionCheck -match "granted=true") {
    Write-Host "✅ POST_NOTIFICATIONS permission is GRANTED" -ForegroundColor Green
} else {
    Write-Host "❌ POST_NOTIFICATIONS permission is NOT GRANTED" -ForegroundColor Red
    Write-Host "Permission details: $permissionCheck" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== STEP 3: ENABLE NOTIFICATION CHANNELS ===" -ForegroundColor Cyan
Write-Host "Enabling notification channels..." -ForegroundColor Yellow

# Enable message notifications channel
& $adbPath shell settings put global heads_up_notifications_enabled 1
Write-Host "✅ Enabled heads-up notifications" -ForegroundColor Green

# Enable notification sounds
& $adbPath shell settings put system notification_sound_default 1
Write-Host "✅ Enabled notification sounds" -ForegroundColor Green

Write-Host ""
Write-Host "=== STEP 4: SEND TEST NOTIFICATION ===" -ForegroundColor Cyan
Write-Host "Sending test notification..." -ForegroundColor Yellow

$testResult = & $adbPath shell cmd notification post -S bigtext -t "Whispr Test" "Notification permission test - if you see this, notifications are working!" notification 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Test notification sent successfully!" -ForegroundColor Green
    Write-Host "Check your device for the test notification" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Test notification result: $testResult" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== STEP 5: RESTART APP ===" -ForegroundColor Cyan
Write-Host "Restarting Whispr app..." -ForegroundColor Yellow

# Force stop the app
& $adbPath shell am force-stop com.whisprmobiletemp
Write-Host "✅ App force stopped" -ForegroundColor Green

# Start the app
& $adbPath shell am start -n com.whisprmobiletemp/.MainActivity
Write-Host "✅ App restarted" -ForegroundColor Green

Write-Host ""
Write-Host "=== FINAL VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Final permission check..." -ForegroundColor Yellow

$finalCheck = & $adbPath shell dumpsys package com.whisprmobiletemp | Select-String "android.permission.POST_NOTIFICATIONS"
if ($finalCheck -match "granted=true") {
    Write-Host "🎉 SUCCESS! Notification permissions are properly configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test sending a message from the web app" -ForegroundColor White
    Write-Host "2. Check if notifications appear on the mobile device" -ForegroundColor White
    Write-Host "3. If notifications still don't work, try:" -ForegroundColor White
    Write-Host "   - Go to Settings > Apps > Whispr > Notifications" -ForegroundColor White
    Write-Host "   - Enable 'Allow notifications'" -ForegroundColor White
    Write-Host "   - Enable 'Show on lock screen'" -ForegroundColor White
} else {
    Write-Host "❌ Permission still not granted. Manual intervention required." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Settings > Apps > Whispr" -ForegroundColor White
    Write-Host "2. Tap 'Permissions'" -ForegroundColor White
    Write-Host "3. Enable 'Notifications'" -ForegroundColor White
    Write-Host "4. Go to Settings > Apps > Whispr > Notifications" -ForegroundColor White
    Write-Host "5. Enable all notification options" -ForegroundColor White
}

Write-Host ""
Write-Host "=== SCRIPT COMPLETED ===" -ForegroundColor Green
