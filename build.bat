@echo off
setlocal enabledelayedexpansion
REM Simple Build Script for Whispr
REM Just run: build.bat

REM Set version info
set VERSION_NAME=2.27.0
set VERSION_CODE=130
set RELEASE_TAG=P14

echo.
echo ========================================
echo   Whispr Build Script
echo ========================================
echo.
echo Version: %VERSION_NAME% ^(%VERSION_CODE%^) - %RELEASE_TAG%
echo.

echo Step 0: Cleaning up all processes...
REM Kill Node.js
taskkill /f /im node.exe >nul 2>&1
REM Kill Java/Gradle
taskkill /f /im java.exe >nul 2>&1
taskkill /f /im gradle.exe >nul 2>&1
echo [OK] Processes cleaned
timeout /t 2 /nobreak >nul

REM Stop Gradle daemon
cd android
call gradlew --stop >nul 2>&1
cd ..
echo.

echo Step 1: Updating build.gradle with version info...
powershell -ExecutionPolicy Bypass -File "%~dp0update-build-gradle.ps1" -VersionName "%VERSION_NAME%" -VersionCode %VERSION_CODE% -ReleaseTag "%RELEASE_TAG%"
if errorlevel 1 (
    echo WARNING: Failed to update build.gradle
    pause
    exit /b 1
)
echo.

REM Generate timestamp
for /f "tokens=1-3 delims=/- " %%a in ('date /t') do set DATE_PART=%%c-%%a-%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME_PART=%%a-%%b
set TIMESTAMP=%DATE_PART%_%TIME_PART%
set TIMESTAMP=%TIMESTAMP: =0%

echo Step 2: Cleaning Gradle build...
cd android

REM Use --no-daemon to avoid daemon issues
echo Running clean... (this may take 30-60 seconds)
call gradlew clean --no-daemon --stacktrace --max-workers=2
if errorlevel 1 (
    echo ERROR: Clean failed!
    cd ..
    pause
    exit /b 1
)
echo [OK] Clean complete
cd ..
echo.

echo Step 3: Building AAB...
cd android
echo Building AAB... (this may take 2-3 minutes)
call gradlew bundleRelease --no-daemon --stacktrace --max-workers=2
if errorlevel 1 (
    echo ERROR: AAB build failed!
    cd ..
    pause
    exit /b 1
)
echo [OK] AAB build complete
cd ..
echo.

echo Step 4: Building APK...
cd android
echo Building APK... (this may take 2-3 minutes)
call gradlew assembleRelease --no-daemon --stacktrace --max-workers=2
if errorlevel 1 (
    echo ERROR: APK build failed!
    cd ..
    pause
    exit /b 1
)
echo [OK] APK build complete
cd ..
echo.

echo Step 5: Verifying build files...
powershell -ExecutionPolicy Bypass -File "%~dp0wait-for-build-files.ps1" -MaxWaitSeconds 30 -CheckIntervalSeconds 1
echo.

echo Step 6: Copying files to builds\latest...

REM Create directory
if not exist "builds\latest" mkdir "builds\latest"

REM Copy AAB
set AAB_SOURCE=android\app\build\outputs\bundle\release
set AAB_DEST=builds\latest

if exist "%AAB_SOURCE%\app-release.aab" (
    set AAB_NEW_NAME=Whispr_v%VERSION_NAME%_%RELEASE_TAG%_2025-%TIMESTAMP%.aab
    copy "%AAB_SOURCE%\app-release.aab" "%AAB_DEST%\!AAB_NEW_NAME!" >nul
    if not errorlevel 1 (
        echo [OK] AAB: !AAB_NEW_NAME!
    )
) else (
    echo [WARNING] AAB not found
)

REM Copy APK
set APK_SOURCE=android\app\build\outputs\apk\release
set APK_DEST=builds\latest

for %%f in ("%APK_SOURCE%\*.apk") do (
    set APK_FILE=%%~nxf
    copy "%%f" "%APK_DEST%\!APK_FILE!" >nul
    if not errorlevel 1 (
        echo [OK] APK: !APK_FILE!
    )
)

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Files in builds\latest:
dir /b builds\latest\*.aab builds\latest\*.apk 2>nul
echo.
pause
