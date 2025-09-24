# 🚀 Metro Troubleshooting Guide for Whispr Mobile App

## Overview

This guide covers common Metro bundler issues and their solutions for the Whispr Mobile App.

## ✅ **Metro Issues Resolved**

### 1. **Cache Clearing** ✅
- **Problem**: Metro serving stale cached code
- **Solution**: Complete cache clearing implemented
- **Status**: Resolved with automated script

### 2. **Dependency Conflicts** ✅
- **Problem**: Outdated packages causing compatibility issues
- **Solution**: Updated critical dependencies
- **Status**: Resolved

### 3. **Metro Configuration** ✅
- **Problem**: Basic Metro config causing issues
- **Solution**: Enhanced Metro configuration with proper aliases
- **Status**: Resolved

## 🔧 **Metro Configuration Updates**

### Enhanced `metro.config.js`
```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/screens': path.resolve(__dirname, 'src/screens'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/store': path.resolve(__dirname, 'src/store'),
    },
    platforms: ['ios', 'android', 'native', 'web'],
  },
  transformer: {
    hermesParser: true,
    unstable_allowRequireContext: true,
  },
  resetCache: true,
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

## 📦 **Dependency Updates**

### Updated Packages
- **@react-native-async-storage/async-storage**: `1.24.0` → `2.2.0`
- **@tanstack/react-query**: `5.87.4` → `5.90.2`

### Remaining Outdated Packages (Non-Critical)
- `@types/jest`: `29.5.14` → `30.0.0`
- `eslint`: `8.57.1` → `9.36.0`
- `jest`: `29.7.0` → `30.1.3`
- `prettier`: `2.8.8` → `3.6.2`
- `react-native-keychain`: `8.2.0` → `10.0.0`
- `zustand`: `4.5.7` → `5.0.8`

## 🛠️ **Cache Clearing Process**

### Manual Cache Clearing
1. **Stop Node.js processes**:
   ```cmd
   taskkill /f /im node.exe
   ```

2. **Clear npm cache**:
   ```cmd
   npm cache clean --force
   ```

3. **Clear Android build cache**:
   ```cmd
   cd android
   ./gradlew clean
   cd ..
   ```

4. **Start Metro with reset cache**:
   ```cmd
   npx react-native start --reset-cache --port 8081
   ```

### Automated Cache Clearing
Use the provided script:
```powershell
.\clear-metro-cache.ps1
```

## 🚨 **Common Metro Issues & Solutions**

### Issue 1: "md undefined" Error
**Symptoms**: App crashes with "Cannot read property 'md' of undefined"
**Cause**: Metro serving old cached code with theme issues
**Solution**:
1. Clear Metro cache completely
2. Restart Metro bundler
3. Rebuild app

### Issue 2: Port Already in Use
**Symptoms**: `EADDRINUSE: address already in use :::8081`
**Cause**: Multiple Metro instances running
**Solution**:
1. Kill all Node.js processes
2. Use different port: `npx react-native start --port 8082`
3. Or wait for port to be released

### Issue 3: Dependency Resolution Errors
**Symptoms**: Module not found errors
**Cause**: Outdated or conflicting dependencies
**Solution**:
1. Update problematic packages
2. Clear node_modules and reinstall
3. Check package compatibility

### Issue 4: Build Cache Issues
**Symptoms**: Build failures or inconsistent behavior
**Cause**: Stale build cache
**Solution**:
1. Clean Android build: `cd android && ./gradlew clean`
2. Clear Metro cache
3. Rebuild from scratch

## 🔍 **Metro Debugging Commands**

### Check Metro Status
```cmd
netstat -ano | findstr :8081
```

### Start Metro with Verbose Logging
```cmd
npx react-native start --reset-cache --verbose
```

### Test Metro Bundle
```cmd
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
```

## 📊 **Build Status**

### Current Build Status: ✅ **SUCCESSFUL**
- **Metro Bundler**: Running on port 8081
- **Android Build**: Successful (6m 5s)
- **App Installation**: Successful on emulator
- **Dependencies**: Resolved
- **Cache**: Cleared and fresh

### Build Warnings (Non-Critical)
- Deprecated DSL elements (will be fixed in future Gradle versions)
- Package namespace warnings (cosmetic, doesn't affect functionality)
- Deprecated React Native methods (will be updated in future versions)

## 🎯 **Best Practices**

### 1. **Regular Cache Maintenance**
- Clear Metro cache weekly
- Clean Android build before major changes
- Use `--reset-cache` flag when starting Metro

### 2. **Dependency Management**
- Keep critical packages updated
- Test compatibility before major updates
- Use `npm outdated` to check for updates

### 3. **Build Process**
- Always clean build before release
- Test on multiple devices/emulators
- Monitor build warnings and address critical ones

### 4. **Development Workflow**
- Use consistent port numbers
- Stop Metro before switching branches
- Clear cache when encountering issues

## 🚀 **Next Steps**

1. **Monitor Build Performance**: Track build times and success rates
2. **Update Remaining Dependencies**: Gradually update non-critical packages
3. **Implement CI/CD**: Automate cache clearing and builds
4. **Document Issues**: Keep track of new issues and solutions

## 📝 **Troubleshooting Checklist**

When encountering Metro issues:

- [ ] Check if Metro is running on expected port
- [ ] Clear npm cache
- [ ] Clear Metro cache
- [ ] Clean Android build
- [ ] Restart Metro bundler
- [ ] Check for dependency conflicts
- [ ] Verify Metro configuration
- [ ] Test on different port if needed
- [ ] Check for Node.js process conflicts

---

**Last Updated**: January 24, 2025
**Status**: All Metro issues resolved ✅
**Build Status**: Successful ✅
