# Set Android Development Environment Variables
# Run this in PowerShell to set variables for current session

Write-Host "Setting Android Development Environment Variables..." -ForegroundColor Green

# Set Android SDK path
$androidSdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath

Write-Host "ANDROID_HOME set to: $androidSdkPath" -ForegroundColor Yellow

# Add Android tools to PATH for current session
$androidTools = @(
    "$androidSdkPath\platform-tools",
    "$androidSdkPath\tools",
    "$androidSdkPath\tools\bin"
)

foreach ($tool in $androidTools) {
    if (Test-Path $tool) {
        $env:PATH += ";$tool"
        Write-Host "Added to PATH: $tool" -ForegroundColor Green
    }
}

# Test ADB
Write-Host "`nTesting ADB..." -ForegroundColor Yellow
if (Test-Command "adb") {
    $adbVersion = adb version
    Write-Host "✅ ADB is now working: $adbVersion" -ForegroundColor Green
} else {
    Write-Host "❌ ADB still not working" -ForegroundColor Red
}

Write-Host "`nEnvironment variables set for current session only." -ForegroundColor Cyan
Write-Host "To make permanent, add these to System Environment Variables:" -ForegroundColor Yellow
Write-Host "ANDROID_HOME = $androidSdkPath" -ForegroundColor White
Write-Host "ANDROID_SDK_ROOT = $androidSdkPath" -ForegroundColor White
Write-Host "PATH += $androidSdkPath\platform-tools;$androidSdkPath\tools;$androidSdkPath\tools\bin" -ForegroundColor White



