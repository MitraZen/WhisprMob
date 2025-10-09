@echo off
REM Whispr Mobile App - Play Store Release Build Script (Windows)
REM This script creates a signed release APK for Google Play Store

echo 🚀 Starting Whispr Mobile App Release Build Process...

REM Set variables
set APP_NAME=Whispr
set VERSION_NAME=1.1.0
set VERSION_CODE=6
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set BUILD_DATE=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%
set RELEASE_DIR=release-builds

REM Create release directory
echo 📁 Creating release directory...
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

REM Clean previous builds
echo 🧹 Cleaning previous builds...
cd android
call gradlew clean

REM Generate release APK
echo 🔨 Building release APK...
call gradlew assembleRelease

REM Check if build was successful
if %errorlevel% equ 0 (
    echo ✅ Release APK built successfully!
    
    REM Copy APK to release directory
    set APK_PATH=app\build\outputs\apk\release\app-release.apk
    set RELEASE_APK_NAME=%APP_NAME%-v%VERSION_NAME%-%BUILD_DATE%.apk
    
    if exist "%APK_PATH%" (
        copy "%APK_PATH%" "..\%RELEASE_DIR%\%RELEASE_APK_NAME%"
        echo 📦 APK copied to: %RELEASE_DIR%\%RELEASE_APK_NAME%
        
        REM Generate checksums
        echo 🔐 Generating checksums...
        cd "..\%RELEASE_DIR%"
        certutil -hashfile "%RELEASE_APK_NAME%" SHA256 > "%RELEASE_APK_NAME%.sha256"
        certutil -hashfile "%RELEASE_APK_NAME%" MD5 > "%RELEASE_APK_NAME%.md5"
        
        echo.
        echo 🎉 Release build completed successfully!
        echo 📱 APK: %RELEASE_APK_NAME%
        for %%I in ("%RELEASE_APK_NAME%") do echo 📊 Size: %%~zI bytes
        echo 🔐 SHA256: 
        type "%RELEASE_APK_NAME%.sha256"
        echo.
        echo 📋 Next steps for Play Store upload:
        echo 1. Test the APK on a physical device
        echo 2. Upload to Google Play Console
        echo 3. Fill in store listing details
        echo 4. Submit for review
        
    ) else (
        echo ❌ APK file not found at expected location: %APK_PATH%
        exit /b 1
    )
) else (
    echo ❌ Release build failed!
    exit /b 1
)

cd ..