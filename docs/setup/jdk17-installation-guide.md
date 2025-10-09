# JDK 17 Installation Guide for Android Development

## Quick Installation Steps

### Option 1: Manual Download & Install (Recommended)

1. **Download JDK 17:**
   - Visit: https://adoptium.net/temurin/releases/?version=17
   - Select: **JDK 17** → **Windows** → **x64** → **.msi**
   - Download the installer

2. **Install JDK 17:**
   - Run the downloaded `.msi` file
   - Click "Next" through the installation wizard
   - **Important:** Note the installation path (usually `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot\`)
   - Complete the installation

3. **Verify Installation:**
   - Open a new PowerShell window
   - Run: `java -version`
   - You should see: `openjdk version "17.x.x"`

### Option 2: Using Chocolatey (if available)

If you have Chocolatey package manager installed:

```powershell
# Install JDK 17
choco install openjdk17

# Verify installation
java -version
```

### Option 3: Using Winget (Windows Package Manager)

```powershell
# Install JDK 17
winget install EclipseAdoptium.Temurin.17.JDK

# Verify installation
java -version
```

## After Installation - Set Environment Variables

### Method 1: Using System Properties (Permanent)

1. **Open System Properties:**
   - Press `Win + R`
   - Type `sysdm.cpl`
   - Press Enter

2. **Set Environment Variables:**
   - Click "Environment Variables"
   - Under "System Variables", click "New"
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot` (your actual path)
   - Click "OK"

3. **Update PATH:**
   - Find "Path" in System Variables
   - Click "Edit"
   - Click "New"
   - Add: `%JAVA_HOME%\bin`
   - Click "OK" on all dialogs

### Method 2: Using PowerShell (Current Session Only)

```powershell
# Set JAVA_HOME for current session
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot"

# Add to PATH for current session
$env:PATH += ";$env:JAVA_HOME\bin"

# Verify
java -version
javac -version
```

## Verification Commands

After installation, run these commands to verify:

```powershell
# Check Java version
java -version

# Check Java compiler
javac -version

# Check JAVA_HOME
echo $env:JAVA_HOME

# Check if Java is in PATH
where java
```

## Expected Output

After successful installation, you should see:

```
openjdk version "17.0.x" 2024-xx-xx
OpenJDK Runtime Environment Temurin-17.0.x+x (build 17.0.x+x)
OpenJDK 64-Bit Server VM Temurin-17.0.x+x (build 17.0.x+x, mixed mode, sharing)
```

## Troubleshooting

### Common Issues:

1. **"java is not recognized"**
   - JAVA_HOME not set correctly
   - PATH doesn't include %JAVA_HOME%\bin
   - Need to restart PowerShell/Command Prompt

2. **"Access Denied" during installation**
   - Run installer as Administrator
   - Check antivirus software

3. **Multiple Java versions**
   - Ensure JAVA_HOME points to JDK 17
   - Check PATH order (JDK 17 should come first)

## Next Steps

After JDK 17 is installed and configured:

1. **Set Android Environment Variables:**
   ```
   ANDROID_HOME = C:\Users\[YourUsername]\AppData\Local\Android\Sdk
   ANDROID_SDK_ROOT = C:\Users\[YourUsername]\AppData\Local\Android\Sdk
   ```

2. **Test React Native Environment:**
   ```bash
   npx react-native doctor
   ```

3. **Try Building Your App:**
   ```bash
   npm run android
   ```



