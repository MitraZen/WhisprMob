# Android Development Environment Setup Script
# Run this script in PowerShell as Administrator

Write-Host "=== Android Development Environment Setup ===" -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Please run this script as Administrator" -ForegroundColor Red
    exit 1
}

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check Java installation
Write-Host "`n1. Checking Java Installation..." -ForegroundColor Yellow
if (Test-Command "java") {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✅ Java is installed: $javaVersion" -ForegroundColor Green
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
    Write-Host "You can run: npx react-native doctor" -ForegroundColor Cyan
} else {
    Write-Host "❌ npx is not available" -ForegroundColor Red
}

# Environment Variables Setup
Write-Host "`n5. Environment Variables Setup..." -ForegroundColor Yellow
Write-Host "Current environment variables:" -ForegroundColor Cyan
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "ANDROID_SDK_ROOT: $env:ANDROID_SDK_ROOT"

# Suggest environment variable setup
Write-Host "`n=== Suggested Environment Variables ===" -ForegroundColor Green
Write-Host "Add these to your System Environment Variables:" -ForegroundColor Yellow
Write-Host "JAVA_HOME = C:\Program Files\Java\jdk-17" -ForegroundColor White
Write-Host "ANDROID_HOME = C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor White
Write-Host "ANDROID_SDK_ROOT = C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor White
Write-Host "`nAdd these to your PATH:" -ForegroundColor Yellow
Write-Host "%JAVA_HOME%\bin" -ForegroundColor White
Write-Host "%ANDROID_HOME%\platform-tools" -ForegroundColor White
Write-Host "%ANDROID_HOME%\tools" -ForegroundColor White
Write-Host "%ANDROID_HOME%\tools\bin" -ForegroundColor White

Write-Host "`n=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Install JDK 17 if not already installed" -ForegroundColor Yellow
Write-Host "2. Install Android Studio" -ForegroundColor Yellow
Write-Host "3. Set up environment variables" -ForegroundColor Yellow
Write-Host "4. Open Android Studio and install required SDK components" -ForegroundColor Yellow
Write-Host "5. Run: npx react-native doctor" -ForegroundColor Yellow
Write-Host "6. Test build with: npm run android" -ForegroundColor Yellow

Write-Host "`nSetup complete! Check the android-setup-guide.md for detailed instructions." -ForegroundColor Green



