@echo off
REM Simple Build Script for Whispr
REM Just run: build.bat
REM Make sure build.gradle has the correct version before running

echo.
echo ========================================
echo   Whispr Build Script
echo ========================================
echo.
echo NOTE: Make sure android\app\build.gradle has the correct version!
echo.

REM Generate timestamp (YYYY-MM-DD_HH-MM format)
for /f "tokens=1-3 delims=/- " %%a in ('date /t') do set DATE_PART=%%c-%%a-%%b
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME_PART=%%a-%%b
set TIMESTAMP=%DATE_PART%_%TIME_PART%
set TIMESTAMP=%TIMESTAMP: =0%
set TIMESTAMP=%TIMESTAMP:/=-%

echo Step 1: Cleaning...
cd android
call gradlew clean --no-daemon
if errorlevel 1 (
    echo ERROR: Clean failed!
    cd ..
    exit /b 1
)

echo.
echo Step 2: Building AAB...
call gradlew bundleRelease --no-daemon
if errorlevel 1 (
    echo ERROR: AAB build failed!
    cd ..
    exit /b 1
)

echo.
echo Step 3: Building APK...
call gradlew assembleRelease --no-daemon
if errorlevel 1 (
    echo ERROR: APK build failed!
    cd ..
    exit /b 1
)

cd ..

echo.
echo Step 4: Copying files to builds\latest...

REM Create builds\latest directory if it doesn't exist
if not exist "builds\latest" mkdir "builds\latest"

REM Copy AAB (Gradle will rename it, so find the actual file)
set AAB_SOURCE=android\app\build\outputs\bundle\release
set AAB_DEST=builds\latest

if exist "%AAB_SOURCE%\app-release.aab" (
    REM Find the renamed AAB file or use app-release.aab
    for %%f in ("%AAB_SOURCE%\*.aab") do (
        set AAB_FILE=%%~nxf
        goto :aab_found
    )
    :aab_found
    if defined AAB_FILE (
        copy "%AAB_SOURCE%\%AAB_FILE%" "%AAB_DEST%\%AAB_FILE%" >nul
        echo [OK] AAB copied: %AAB_FILE%
    ) else (
        echo [WARNING] AAB not found
    )
) else (
    echo [WARNING] AAB not found at %AAB_SOURCE%
)

REM Copy APK (Gradle will rename it, so find the actual file)
set APK_SOURCE=android\app\build\outputs\apk\release
set APK_DEST=builds\latest

for %%f in ("%APK_SOURCE%\*.apk") do (
    set APK_FILE=%%~nxf
    copy "%%f" "%APK_DEST%\%APK_FILE%" >nul
    echo [OK] APK copied: %APK_FILE%
    goto :apk_done
)
echo [WARNING] APK not found in %APK_SOURCE%
:apk_done

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Files copied to builds\latest
dir /b builds\latest\*.aab builds\latest\*.apk 2>nul
echo.

