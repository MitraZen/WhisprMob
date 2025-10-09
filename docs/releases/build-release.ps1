# Whispr Mobile App - Release Build Script
# This script helps manage versions and create release builds

param(
    [string]$VersionName = "",
    [switch]$IncrementVersion,
    [switch]$BuildRelease,
    [switch]$Help
)

if ($Help) {
    Write-Host "Whispr Mobile App - Release Build Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\build-release.ps1 -IncrementVersion          # Increment version and build"
    Write-Host "  .\build-release.ps1 -VersionName '1.1.0'     # Set specific version and build"
    Write-Host "  .\build-release.ps1 -BuildRelease             # Build release with current version"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\build-release.ps1 -IncrementVersion"
    Write-Host "  .\build-release.ps1 -VersionName '1.2.0' -BuildRelease"
    Write-Host ""
    exit 0
}

# Load version properties
$versionFile = "android\app\version.properties"
if (-not (Test-Path $versionFile)) {
    Write-Host "Error: version.properties file not found!" -ForegroundColor Red
    exit 1
}

$versionContent = Get-Content $versionFile
$versionProperties = @{}

foreach ($line in $versionContent) {
    if ($line -match "^([^#][^=]+)=(.*)$") {
        $versionProperties[$matches[1]] = $matches[2]
    }
}

# Get current version
$currentVersionName = $versionProperties["VERSION_NAME"]
$currentVersionCode = [int]$versionProperties["VERSION_CODE"]

Write-Host "Current Version: $currentVersionName (Code: $currentVersionCode)" -ForegroundColor Cyan

# Handle version updates
if ($IncrementVersion) {
    # Parse version (assume semantic versioning)
    $versionParts = $currentVersionName -split '\.'
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2]
    
    # Increment patch version
    $patch++
    $newVersionName = "$major.$minor.$patch"
    $newVersionCode = $currentVersionCode + 1
    
    Write-Host "Incrementing version to: $newVersionName (Code: $newVersionCode)" -ForegroundColor Green
} elseif ($VersionName) {
    $newVersionName = $VersionName
    $newVersionCode = $currentVersionCode + 1
    Write-Host "Setting version to: $newVersionName (Code: $newVersionCode)" -ForegroundColor Green
} else {
    $newVersionName = $currentVersionName
    $newVersionCode = $currentVersionCode
}

# Update version.properties
$newVersionContent = @"
# Version management for Whispr Mobile App
# Updated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# App version (displayed to users)
VERSION_NAME=$newVersionName

# Version code (incremented for each release)
VERSION_CODE=$newVersionCode

# Build type
BUILD_TYPE=release

# Build date
BUILD_DATE=$(Get-Date -Format 'yyyy-MM-dd')

# Release notes
RELEASE_NOTES=Production release $newVersionName
"@

Set-Content -Path $versionFile -Value $newVersionContent
Write-Host "Updated version.properties" -ForegroundColor Green

# Build release if requested
if ($BuildRelease -or $IncrementVersion -or $VersionName) {
    Write-Host "Building release APK..." -ForegroundColor Yellow
    
    # Clean previous builds
    Write-Host "Cleaning previous builds..." -ForegroundColor Cyan
    Set-Location android
    .\gradlew clean
    
    # Build release APK
    Write-Host "Building release APK..." -ForegroundColor Cyan
    .\gradlew assembleRelease
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Release build successful!" -ForegroundColor Green
        
        # Copy APK to apk-files directory
        $apkSource = "app\build\outputs\apk\release\app-release.apk"
        $apkDestination = "..\apk-files\Whispr-Release-$newVersionName.apk"
        
        if (Test-Path $apkSource) {
            Copy-Item $apkSource $apkDestination -Force
            Write-Host "APK copied to: $apkDestination" -ForegroundColor Green
        }
    } else {
        Write-Host "Release build failed!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    
    Set-Location ..
}

Write-Host "Build process completed!" -ForegroundColor Green
Write-Host "Version: $newVersionName (Code: $newVersionCode)" -ForegroundColor Cyan
