@echo off
echo Whispr App Icon Copy Script
echo ==========================

echo.
echo This script will help you copy your prepared icon files to the correct locations.
echo.
echo Make sure you have prepared the following files in this directory:
echo - ic_launcher_48.png (48x48px)
echo - ic_launcher_72.png (72x72px)  
echo - ic_launcher_96.png (96x96px)
echo - ic_launcher_144.png (144x144px)
echo - ic_launcher_192.png (192x192px)
echo.

pause

echo Copying icons to mipmap directories...

if exist ic_launcher_48.png (
    copy ic_launcher_48.png ..\mipmap-mdpi\ic_launcher.png
    copy ic_launcher_48.png ..\mipmap-mdpi\ic_launcher_round.png
    echo ✓ Copied 48x48px icons to mipmap-mdpi
) else (
    echo ✗ ic_launcher_48.png not found
)

if exist ic_launcher_72.png (
    copy ic_launcher_72.png ..\mipmap-hdpi\ic_launcher.png
    copy ic_launcher_72.png ..\mipmap-hdpi\ic_launcher_round.png
    echo ✓ Copied 72x72px icons to mipmap-hdpi
) else (
    echo ✗ ic_launcher_72.png not found
)

if exist ic_launcher_96.png (
    copy ic_launcher_96.png ..\mipmap-xhdpi\ic_launcher.png
    copy ic_launcher_96.png ..\mipmap-xhdpi\ic_launcher_round.png
    echo ✓ Copied 96x96px icons to mipmap-xhdpi
) else (
    echo ✗ ic_launcher_96.png not found
)

if exist ic_launcher_144.png (
    copy ic_launcher_144.png ..\mipmap-xxhdpi\ic_launcher.png
    copy ic_launcher_144.png ..\mipmap-xxhdpi\ic_launcher_round.png
    echo ✓ Copied 144x144px icons to mipmap-xxhdpi
) else (
    echo ✗ ic_launcher_144.png not found
)

if exist ic_launcher_192.png (
    copy ic_launcher_192.png ..\mipmap-xxxhdpi\ic_launcher.png
    copy ic_launcher_192.png ..\mipmap-xxxhdpi\ic_launcher_round.png
    echo ✓ Copied 192x192px icons to mipmap-xxxhdpi
) else (
    echo ✗ ic_launcher_192.png not found
)

echo.
echo Icon copy process completed!
echo.
echo Next steps:
echo 1. Run: npx react-native run-android
echo 2. Check the app icon on your device
echo.
pause
