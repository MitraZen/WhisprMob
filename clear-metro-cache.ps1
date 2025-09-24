# Metro Cache Clearing Script for Whispr Mobile App
# This script completely clears all Metro and React Native caches

Write-Host "🧹 Clearing Metro and React Native caches..." -ForegroundColor Yellow

# Stop all Node.js processes
Write-Host "🛑 Stopping Node.js processes..." -ForegroundColor Cyan
try {
    taskkill /f /im node.exe 2>$null
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No Node.js processes running" -ForegroundColor Blue
}

# Clear npm cache
Write-Host "🗑️ Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force
Write-Host "✅ npm cache cleared" -ForegroundColor Green

# Clear Metro cache directories
Write-Host "🗑️ Clearing Metro cache directories..." -ForegroundColor Cyan

$cacheDirs = @(
    "$env:TEMP\metro-*",
    "$env:TEMP\react-*",
    "$env:TEMP\haste-*",
    "node_modules\.cache",
    ".metro-cache"
)

foreach ($dir in $cacheDirs) {
    if (Test-Path $dir) {
        Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Cleared: $dir" -ForegroundColor Green
    }
}

# Clear Android build cache
Write-Host "🗑️ Clearing Android build cache..." -ForegroundColor Cyan
if (Test-Path "android") {
    Set-Location android
    .\gradlew clean
    Set-Location ..
    Write-Host "✅ Android build cache cleared" -ForegroundColor Green
}

# Clear watchman cache (if installed)
Write-Host "🗑️ Clearing Watchman cache..." -ForegroundColor Cyan
try {
    watchman watch-del-all 2>$null
    Write-Host "✅ Watchman cache cleared" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Watchman not installed or not running" -ForegroundColor Blue
}

# Clear React Native cache
Write-Host "🗑️ Clearing React Native cache..." -ForegroundColor Cyan
try {
    npx react-native start --reset-cache --port 8081 --dry-run 2>$null
    Write-Host "✅ React Native cache reset" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ React Native cache reset attempted" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🎉 Cache clearing completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start Metro: npx react-native start --reset-cache" -ForegroundColor White
Write-Host "2. Run app: npx react-native run-android" -ForegroundColor White
Write-Host ""