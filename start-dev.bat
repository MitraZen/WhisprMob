@echo off
REM Simple Development Start Script
REM Runs commands sequentially - waits for each to complete

echo.
echo ========================================
echo   Starting React Native Development
echo ========================================
echo.

echo Step 1: Stopping any running Node processes...
taskkill /f /im node.exe 2>nul
if errorlevel 1 (
    echo No Node processes found (this is OK)
) else (
    echo Node processes stopped
)
echo.

echo Step 2: Starting Metro Bundler...
echo NOTE: This will open in a new window. Close it when done.
start "Metro Bundler" cmd /k "npx react-native start --reset-cache"
timeout /t 3 /nobreak >nul
echo.

echo Step 3: Checking connected devices...
adb devices
echo.

echo Step 4: Building and running Android app...
echo This will take a few minutes...
npx react-native run-android
echo.

echo ========================================
echo   Done!
echo ========================================
echo.
pause

