# Android Development Environment Check Script
# Run this script in PowerShell

Write-Host "=== Android Development Environment Check ===" -ForegroundColor Green

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check Java installation
Write-Host "`n1. Checking Java Installation..." -ForegroundColor Yellow
if (Test-Command "java") {
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        Write-Host "✅ Java is installed: $javaVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Java command failed" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Java is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install JDK 17 from: https://adoptium.net/" -ForegroundColor Yellow
}

# Check Android SDK
Write-Host "`n2. Checking Android SDK..." -ForegroundColor Yellow
$androidHome = $env:ANDROID_HOME
if ($androidHome) {
    Write-Host "✅ ANDROID_HOME is set to: $androidHome" -ForegroundColor Green
    
    if (Test-Path "$androidHome\platform-tools\adb.exe") {
        Write-Host "✅ ADB is available" -ForegroundColor Green
    } else {
        Write-Host "❌ ADB not found in $androidHome\platform-tools\" -ForegroundColor Red
    }
} else {
    Write-Host "❌ ANDROID_HOME environment variable is not set" -ForegroundColor Red
    Write-Host "Please set ANDROID_HOME to your Android SDK path" -ForegroundColor Yellow
}

# Check Node.js and npm
Write-Host "`n3. Checking Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
}

if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm is installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
}

# Check React Native CLI
Write-Host "`n4. Checking React Native..." -ForegroundColor Yellow
if (Test-Command "npx") {
    Write-Host "✅ npx is available" -ForegroundColor Green
} else {
    Write-Host "❌ npx is not available" -ForegroundColor Red
}

# Environment Variables Display
Write-Host "`n5. Current Environment Variables..." -ForegroundColor Yellow
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "ANDROID_SDK_ROOT: $env:ANDROID_SDK_ROOT"

Write-Host "`n=== Setup Instructions ===" -ForegroundColor Green
Write-Host "1. Install JDK 17: https://adoptium.net/" -ForegroundColor Yellow
Write-Host "2. Install Android Studio: https://developer.android.com/studio" -ForegroundColor Yellow
Write-Host "3. Set environment variables (see android-setup-guide.md)" -ForegroundColor Yellow
Write-Host "4. Run: npx react-native doctor" -ForegroundColor Yellow



