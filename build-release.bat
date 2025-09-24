@echo off
echo Whispr Mobile App - Release Build Script
echo.

REM Check if version.properties exists
if not exist "android\app\version.properties" (
    echo Error: version.properties file not found!
    pause
    exit /b 1
)

REM Load current version
for /f "tokens=2 delims==" %%a in ('findstr "VERSION_NAME" android\app\version.properties') do set CURRENT_VERSION=%%a
for /f "tokens=2 delims==" %%a in ('findstr "VERSION_CODE" android\app\version.properties') do set CURRENT_CODE=%%a

echo Current Version: %CURRENT_VERSION% (Code: %CURRENT_CODE%)
echo.

REM Increment version
set /a NEW_CODE=%CURRENT_CODE%+1
echo Incrementing version code to: %NEW_CODE%

REM Update version.properties
echo # Version management for Whispr Mobile App > android\app\version.properties
echo # Updated on %DATE% %TIME% >> android\app\version.properties
echo. >> android\app\version.properties
echo # App version (displayed to users) >> android\app\version.properties
echo VERSION_NAME=%CURRENT_VERSION% >> android\app\version.properties
echo. >> android\app\version.properties
echo # Version code (incremented for each release) >> android\app\version.properties
echo VERSION_CODE=%NEW_CODE% >> android\app\version.properties
echo. >> android\app\version.properties
echo # Build type >> android\app\version.properties
echo BUILD_TYPE=release >> android\app\version.properties
echo. >> android\app\version.properties
echo # Build date >> android\app\version.properties
echo BUILD_DATE=%DATE% >> android\app\version.properties
echo. >> android\app\version.properties
echo # Release notes >> android\app\version.properties
echo RELEASE_NOTES=Production release %CURRENT_VERSION% >> android\app\version.properties

echo Updated version.properties
echo.

REM Build release
echo Building release APK...
cd android
call gradlew clean
call gradlew assembleRelease

if %errorlevel% equ 0 (
    echo Release build successful!
    
    REM Copy APK to apk-files directory
    if exist "app\build\outputs\apk\release\app-release.apk" (
        copy "app\build\outputs\apk\release\app-release.apk" "..\apk-files\Whispr-Release-%CURRENT_VERSION%.apk"
        echo APK copied to apk-files directory
    )
) else (
    echo Release build failed!
    cd ..
    pause
    exit /b 1
)

cd ..
echo Build process completed!
echo Version: %CURRENT_VERSION% (Code: %NEW_CODE%)
pause
