# Whispr Mobile App Builds

This directory contains all APK and AAB build files for the Whispr Mobile App.

## Directory Structure

```
builds/
├── apk/          # All APK files (Android Package files)
├── aab/          # All AAB files (Android App Bundle files)
├── v1.0/         # Version 1.0 builds (archived)
├── v1.1/         # Version 1.1 builds (current)
├── latest/       # Latest/current builds (symlinks or copies)
└── README.md     # This file
```

## File Types

### APK Files (`builds/apk/`)
- **Purpose**: Direct installation files for Android devices
- **Usage**: Side-loading, testing, direct distribution
- **File Extension**: `.apk`

### AAB Files (`builds/aab/`)
- **Purpose**: Google Play Store distribution format
- **Usage**: Play Store uploads, optimized delivery
- **File Extension**: `.aab`

## Current Builds (as of 2025-01-24)

### APK Files (8 files)
- `Whispr-v1.1.0-2025-01-24.apk` ← **Latest Production Build**
- `Whispr_v1.1.1_20250930_004833.apk`
- `Whispr_v1.1.0_20250929_014216.apk`
- `Whispr_Release_20250928_135452.apk`
- `Whispr_Build_20250926_v1.1.apk`
- `Whispr_Build_20250926_Production.apk`
- `Whispr_Build_20250926_Fixed.apk`
- `Whispr_Build_20250926.apk`

### AAB Files (8 files)
- `Whispr-v1.1.0-2025-01-24.aab` ← **Latest Production Build**
- `Whispr_v1.1.1_20250930_004830.aab`
- `Whispr_v1.1.0_20250929_014213.aab`
- `Whispr_Release_20250928_135530.aab`
- `Whispr_v1.3_20250927_000110.aab`
- `Whispr_Latest_20250926_235028.aab`
- `Whispr_Build_20250926_v1.2_NoPrivacyPolicy.aab`
- `Whispr_Build_20250926_v1.1.aab`

## Build Naming Convention

```
Whispr_[Version]_[Date]_[Time].[ext]
Whispr-v[Version]-[Date].[ext]        # Latest format
```

Examples:
- `Whispr-v1.1.0-2025-01-24.apk` (Latest format)
- `Whispr_v1.1.1_20250930_004833.apk` (Legacy format)

## Usage Instructions

### For Testing
1. Use APK files from `builds/apk/`
2. Install via ADB: `adb install path/to/file.apk`
3. Or transfer to device and install manually

### For Play Store
1. Use AAB files from `builds/aab/`
2. Upload to Google Play Console
3. AAB files are optimized for Play Store distribution

## Maintenance

- **Archive old builds** to version-specific folders
- **Keep latest builds** easily accessible
- **Document release notes** for each build
- **Clean up** development/test builds periodically

## Security Note

⚠️ **Important**: These build files may contain sensitive information. Do not commit to public repositories without proper security review.

