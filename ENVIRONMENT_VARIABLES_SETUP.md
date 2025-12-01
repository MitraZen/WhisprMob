# Environment Variables Setup for Cursor & React Native Android Development

## Required Environment Variables

### 1. **JAVA_HOME** ✅ (Already Set)
- **Current Value**: `C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot`
- **Purpose**: Points to Java JDK installation
- **Required For**: Gradle builds, Android compilation
- **Status**: ✅ Configured

### 2. **ANDROID_HOME** ❌ (Missing - Required)
- **Should Be**: `C:\Users\User\AppData\Local\Android\Sdk`
- **Purpose**: Standard Android SDK location variable
- **Required For**: React Native CLI, Android tooling
- **Status**: ❌ Not Set

### 3. **ANDROID_SDK_ROOT** ❌ (Missing - Recommended)
- **Should Be**: `C:\Users\User\AppData\Local\Android\Sdk`
- **Purpose**: Alternative Android SDK location variable (some tools prefer this)
- **Required For**: Some Android tools, Gradle
- **Status**: ❌ Not Set

## PATH Environment Variable Additions

Your PATH should include the following Android SDK paths:

### Currently in PATH ✅
- `C:\Users\User\AppData\Local\Android\Sdk\platform-tools` ✅ (ADB)

### Should Also Be in PATH ❌
- `C:\Users\User\AppData\Local\Android\Sdk\tools`
- `C:\Users\User\AppData\Local\Android\Sdk\tools\bin`
- `C:\Users\User\AppData\Local\Android\Sdk\platform-tools` ✅ (Already added)
- `C:\Users\User\AppData\Local\Android\Sdk\emulator` (if using emulator)
- `C:\Users\User\AppData\Local\Android\Sdk\build-tools\<version>` (e.g., `build-tools\34.0.0`)

## How to Set Environment Variables

### Method 1: Using PowerShell (Quick Setup)

Run these commands in PowerShell **as Administrator**:

```powershell
# Set ANDROID_HOME
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\User\AppData\Local\Android\Sdk", "User")

# Set ANDROID_SDK_ROOT
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", "C:\Users\User\AppData\Local\Android\Sdk", "User")

# Add Android SDK paths to PATH
$sdkPath = "C:\Users\User\AppData\Local\Android\Sdk"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @(
    "$sdkPath\tools",
    "$sdkPath\tools\bin",
    "$sdkPath\platform-tools",
    "$sdkPath\emulator"
)

foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($currentPath -notlike "*$path*") {
            $currentPath += ";$path"
            Write-Host "Added: $path" -ForegroundColor Green
        } else {
            Write-Host "Already exists: $path" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Path not found (skipping): $path" -ForegroundColor Gray
    }
}

[Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
Write-Host "`n✅ Environment variables updated!" -ForegroundColor Green
Write-Host "⚠️  Restart Cursor/terminal for changes to take effect." -ForegroundColor Yellow
```

### Method 2: Manual Setup via Windows UI

1. **Open System Properties**:
   - Press `Win + X` → **System**
   - Or: **Settings** → **System** → **About** → **Advanced system settings**

2. **Open Environment Variables**:
   - Click **"Environment Variables"** button

3. **Add User Variables** (under "User variables"):
   - Click **"New"** and add:
     - **Variable name**: `ANDROID_HOME`
     - **Variable value**: `C:\Users\User\AppData\Local\Android\Sdk`
   - Click **"New"** again and add:
     - **Variable name**: `ANDROID_SDK_ROOT`
     - **Variable value**: `C:\Users\User\AppData\Local\Android\Sdk`

4. **Edit PATH Variable**:
   - Under "User variables", find **"Path"** and click **"Edit"**
   - Click **"New"** and add each of these (if they exist):
     - `C:\Users\User\AppData\Local\Android\Sdk\tools`
     - `C:\Users\User\AppData\Local\Android\Sdk\tools\bin`
     - `C:\Users\User\AppData\Local\Android\Sdk\platform-tools` (may already exist)
     - `C:\Users\User\AppData\Local\Android\Sdk\emulator` (if using emulator)

5. **Click OK** on all dialogs

6. **Restart Cursor** and any open terminals

## Verification

After setting up, verify in a **new** PowerShell window:

```powershell
# Check environment variables
Write-Host "JAVA_HOME: $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "ANDROID_SDK_ROOT: $env:ANDROID_SDK_ROOT"

# Check if ADB is accessible
adb --version

# Check if Android SDK tools are accessible
Write-Host "`nAndroid SDK paths in PATH:"
$env:Path -split ';' | Where-Object { $_ -like "*Android*" } | ForEach-Object { Write-Host "  $_" }
```

## Summary of Required Variables

| Variable | Value | Status | Priority |
|----------|-------|--------|----------|
| `JAVA_HOME` | `C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot` | ✅ Set | Required |
| `ANDROID_HOME` | `C:\Users\User\AppData\Local\Android\Sdk` | ❌ Missing | Required |
| `ANDROID_SDK_ROOT` | `C:\Users\User\AppData\Local\Android\Sdk` | ❌ Missing | Recommended |
| `PATH` (platform-tools) | `C:\Users\User\AppData\Local\Android\Sdk\platform-tools` | ✅ Set | Required |
| `PATH` (tools) | `C:\Users\User\AppData\Local\Android\Sdk\tools` | ❌ Missing | Optional |
| `PATH` (tools/bin) | `C:\Users\User\AppData\Local\Android\Sdk\tools\bin` | ❌ Missing | Optional |
| `PATH` (emulator) | `C:\Users\User\AppData\Local\Android\Sdk\emulator` | ❌ Missing | Optional |

## Notes

- **Cursor/IDE Restart Required**: After setting environment variables, you must restart Cursor for the changes to take effect in the IDE.
- **Terminal Restart Required**: Close and reopen any terminal windows after setting PATH variables.
- **Build Tools**: The `build-tools` path is usually auto-detected by Gradle, so it's not always needed in PATH.
- **User vs System Variables**: Setting these as **User variables** (recommended) means they only apply to your user account. **System variables** apply to all users.

## Quick Setup Script

Save this as `setup-env-vars.ps1` and run as Administrator:

```powershell
# Setup Environment Variables for React Native Android Development
# Run as Administrator

$sdkPath = "C:\Users\User\AppData\Local\Android\Sdk"

# Set ANDROID_HOME
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
Write-Host "✅ ANDROID_HOME set" -ForegroundColor Green

# Set ANDROID_SDK_ROOT
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkPath, "User")
Write-Host "✅ ANDROID_SDK_ROOT set" -ForegroundColor Green

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @(
    "$sdkPath\platform-tools",
    "$sdkPath\tools",
    "$sdkPath\tools\bin"
)

foreach ($path in $pathsToAdd) {
    if (Test-Path $path) {
        if ($currentPath -notlike "*$path*") {
            $currentPath += ";$path"
            Write-Host "✅ Added to PATH: $path" -ForegroundColor Green
        }
    }
}

[Environment]::SetEnvironmentVariable("Path", $currentPath, "User")
Write-Host "`n✅ All environment variables configured!" -ForegroundColor Green
Write-Host "⚠️  Please restart Cursor and your terminal for changes to take effect." -ForegroundColor Yellow
```





