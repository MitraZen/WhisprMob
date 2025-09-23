# Whispr App Icon Setup Guide

## Overview
This guide will help you replace the current app icon with your new Whispr logo.

## Required Icon Sizes
You need to create the following sizes from your original image:

| Density | Size | File Location |
|---------|------|--------------|
| mdpi    | 48x48px   | `mipmap-mdpi/ic_launcher.png` |
| hdpi    | 72x72px   | `mipmap-hdpi/ic_launcher.png` |
| xhdpi   | 96x96px   | `mipmap-xhdpi/ic_launcher.png` |
| xxhdpi  | 144x144px | `mipmap-xxhdpi/ic_launcher.png` |
| xxxhdpi | 192x192px | `mipmap-xxxhdpi/ic_launcher.png` |

## Steps to Replace Icons

### 1. Prepare Your Image
- Take your original Whispr logo image
- Ensure it's square (1:1 aspect ratio)
- Use a high-resolution source image (at least 512x512px recommended)

### 2. Generate Different Sizes
You can use any image editor (Photoshop, GIMP, online tools) to resize:

**Option A: Online Tools**
- Use https://appicon.co/ or https://icon.kitchen/
- Upload your image and download all Android sizes

**Option B: Manual Resizing**
- Open your image in any image editor
- Resize to each required size (48, 72, 96, 144, 192 pixels)
- Save as PNG format

### 3. Replace the Files
For each density folder, replace both files:
- `ic_launcher.png` (square icon)
- `ic_launcher_round.png` (round icon - same image)

### 4. File Locations
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png      ← Replace with 48x48px
│   └── ic_launcher_round.png ← Replace with 48x48px
├── mipmap-hdpi/
│   ├── ic_launcher.png      ← Replace with 72x72px
│   └── ic_launcher_round.png ← Replace with 72x72px
├── mipmap-xhdpi/
│   ├── ic_launcher.png      ← Replace with 96x96px
│   └── ic_launcher_round.png ← Replace with 96x96px
├── mipmap-xxhdpi/
│   ├── ic_launcher.png      ← Replace with 144x144px
│   └── ic_launcher_round.png ← Replace with 144x144px
└── mipmap-xxxhdpi/
    ├── ic_launcher.png      ← Replace with 192x192px
    └── ic_launcher_round.png ← Replace with 192x192px
```

### 5. Test the Icon
After replacing all files:
1. Clean and rebuild the app: `npx react-native run-android`
2. Check the app icon on your device/emulator
3. The icon should appear on the home screen and app drawer

## Notes
- Both `ic_launcher.png` and `ic_launcher_round.png` should be the same image
- Android will automatically apply the round mask to `ic_launcher_round.png`
- Make sure all images are PNG format
- Keep the original filenames exactly as shown

## Troubleshooting
- If the icon doesn't update, try uninstalling and reinstalling the app
- Make sure all file sizes are correct
- Ensure PNG format is used
- Check that filenames match exactly (case-sensitive)
