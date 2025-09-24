# 🚀 Whispr Mobile App - Production Build Guide

## Overview

This guide covers the production build setup for the Whispr Mobile App, including keystore management, Proguard configuration, and version management.

## 🔐 Production Keystore

### Keystore Details
- **File**: `android/app/whispr-release-key.keystore`
- **Alias**: `whispr-key-alias`
- **Algorithm**: RSA 2048-bit
- **Validity**: 10,000 days
- **Password**: `whispr123` (⚠️ Change in production!)

### Security Notes
⚠️ **IMPORTANT**: The current keystore uses a simple password for development. For production:
1. Generate a new keystore with a strong password
2. Store the keystore and password securely
3. Never commit the keystore to version control
4. Use environment variables for passwords

## 🛡️ Proguard Configuration

### Enabled Features
- **Code Minification**: Reduces APK size by removing unused code
- **Resource Shrinking**: Removes unused resources
- **Code Obfuscation**: Makes reverse engineering harder
- **Optimization**: Improves app performance

### Proguard Rules
The `proguard-rules.pro` file includes rules for:
- React Native core libraries
- Third-party modules (gesture handler, vector icons, etc.)
- Supabase and crypto libraries
- Native methods and serialization

## 📱 Version Management

### Version Properties File
Location: `android/app/version.properties`

```properties
VERSION_NAME=1.0.0
VERSION_CODE=1
BUILD_TYPE=release
BUILD_DATE=2025-01-24
RELEASE_NOTES=Initial production release
```

### Dynamic Version Loading
The build.gradle automatically loads versions from `version.properties`, making it easy to update versions without editing build files.

## 🔨 Build Scripts

### PowerShell Script (Recommended)
```powershell
# Increment version and build
.\build-release.ps1 -IncrementVersion

# Set specific version and build
.\build-release.ps1 -VersionName "1.1.0" -BuildRelease

# Build with current version
.\build-release.ps1 -BuildRelease
```

### Batch Script (Windows)
```cmd
# Simple version increment and build
build-release.bat
```

## 📦 Build Process

### Manual Build Steps
1. **Clean previous builds**:
   ```bash
   cd android
   ./gradlew clean
   ```

2. **Build release APK**:
   ```bash
   ./gradlew assembleRelease
   ```

3. **Locate APK**:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

### Automated Build Process
The build scripts automatically:
1. Update version numbers
2. Clean previous builds
3. Build release APK
4. Copy APK to `apk-files/` directory
5. Generate release notes

## 🎯 Build Variants

### Debug Build
- **Purpose**: Development and testing
- **Signing**: Debug keystore
- **Optimization**: None
- **Command**: `npm run android`

### Release Build
- **Purpose**: Production deployment
- **Signing**: Production keystore
- **Optimization**: Proguard enabled
- **Command**: `.\build-release.ps1 -BuildRelease`

## 📊 Build Output

### APK Location
- **Debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release**: `android/app/build/outputs/apk/release/app-release.apk`
- **Copied to**: `apk-files/Whispr-Release-{version}.apk`

### APK Size Optimization
With Proguard enabled, the release APK is typically:
- **30-50% smaller** than debug APK
- **Optimized** for performance
- **Obfuscated** for security

## 🔧 Troubleshooting

### Common Issues

1. **Keystore Not Found**
   ```
   Error: Keystore file not found
   ```
   **Solution**: Ensure `whispr-release-key.keystore` exists in `android/app/`

2. **Proguard Errors**
   ```
   Error: Can't find referenced class
   ```
   **Solution**: Add keep rules to `proguard-rules.pro`

3. **Version Properties Error**
   ```
   Error: version.properties not found
   ```
   **Solution**: Ensure `version.properties` exists in `android/app/`

### Build Verification
After building, verify:
1. APK size is reasonable (should be smaller than debug)
2. App launches without crashes
3. All features work correctly
4. Version number is correct in app settings

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Update keystore password to strong value
- [ ] Test release build on multiple devices
- [ ] Verify all features work with Proguard
- [ ] Update version numbers appropriately
- [ ] Generate release notes
- [ ] Test APK installation and functionality

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-24 | Initial production release with admin features |

## 🔗 Related Files

- `android/app/build.gradle` - Build configuration
- `android/app/proguard-rules.pro` - Proguard rules
- `android/app/version.properties` - Version management
- `build-release.ps1` - PowerShell build script
- `build-release.bat` - Batch build script
- `apk-files/` - Release APK storage

---

**Note**: This guide assumes you have the Android development environment properly set up. Refer to `android-setup-guide.md` for environment setup instructions.
