# Android Studio Setup Guide for Whispr Mobile App

## Prerequisites Installation

### 1. Install Java Development Kit (JDK) 17
- Download from [Oracle JDK 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) or [OpenJDK 17](https://adoptium.net/)
- Install with default settings
- Set environment variables:
  - `JAVA_HOME` = `C:\Program Files\Java\jdk-17`
  - Add `%JAVA_HOME%\bin` to PATH

### 2. Install Android Studio
- Download from [developer.android.com/studio](https://developer.android.com/studio)
- Install with default settings
- During setup, install:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device

## Android Studio Configuration

### 1. SDK Manager Setup
Open Android Studio → File → Settings → Appearance & Behavior → System Settings → Android SDK

**SDK Platforms to install:**
- ✅ Android 14 (API 34)
- ✅ Android 13 (API 33) 
- ✅ Android 12 (API 31)
- ✅ Android 11 (API 30)

**SDK Tools to install:**
- ✅ Android SDK Build-Tools 36.0.0
- ✅ Android SDK Command-line Tools (latest)
- ✅ Android SDK Platform-Tools
- ✅ Android Emulator
- ✅ Intel x86 Emulator Accelerator (HAXM installer)

### 2. Environment Variables
Add these system environment variables:

```
ANDROID_HOME = C:\Users\[YourUsername]\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT = C:\Users\[YourUsername]\AppData\Local\Android\Sdk
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

## Project Configuration

### 1. Open Project in Android Studio
- Open Android Studio
- Select "Open an existing Android Studio project"
- Navigate to your project folder: `C:\Projects\Whispr_Mobile_App_Dev\android`
- Click "OK"

### 2. Sync Project
- Android Studio will automatically sync Gradle files
- Wait for the sync to complete
- If prompted, accept any license agreements

### 3. Configure AVD (Android Virtual Device)
- Go to Tools → AVD Manager
- Click "Create Virtual Device"
- Choose a device (e.g., Pixel 6)
- Select a system image (Android 13 or 14)
- Click "Finish"

## Verification Steps

### 1. Check Java Installation
```bash
java -version
javac -version
```

### 2. Check Android SDK
```bash
adb version
```

### 3. Check React Native CLI
```bash
npx react-native doctor
```

## Running Your App

### 1. Start Metro Bundler
```bash
npm start
```

### 2. Run on Android
```bash
npm run android
```

## Troubleshooting

### Common Issues:

1. **"SDK location not found"**
   - Set ANDROID_HOME environment variable
   - Restart Android Studio

2. **"Java version mismatch"**
   - Ensure JDK 17 is installed and JAVA_HOME is set correctly

3. **"Build failed"**
   - Clean project: Build → Clean Project
   - Rebuild: Build → Rebuild Project

4. **"Emulator not starting"**
   - Enable virtualization in BIOS
   - Install Intel HAXM

### Project-Specific Notes:
- Your project uses React Native 0.81.4
- Build tools version: 36.0.0
- Target SDK: 36 (Android 14)
- Min SDK: 24 (Android 7.0)
- Hermes is enabled
- New Architecture is enabled

## Next Steps
1. Complete the environment setup
2. Test the build process
3. Set up device/emulator for testing
4. Configure debugging tools



