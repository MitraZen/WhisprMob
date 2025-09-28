# Lightweight Whispr Mobile App Project Backup Script
# This script creates a backup excluding node_modules and build artifacts for faster backup/restore

param(
    [string]$BackupLocation = "C:\Backups\WhisprMobile",
    [string]$ProjectPath = "C:\Projects\Whispr_Mobile_App_Dev",
    [switch]$CompressBackup = $true
)

Write-Host "🚀 Starting Lightweight Whispr Mobile App Backup..." -ForegroundColor Green
Write-Host "Project Path: $ProjectPath" -ForegroundColor Cyan
Write-Host "Backup Location: $BackupLocation" -ForegroundColor Cyan

# Create backup directory with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "$BackupLocation\WhisprMobile_Lightweight_$timestamp"

try {
    # Create backup directory
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✅ Created backup directory: $backupDir" -ForegroundColor Green

    # Define what to exclude (lightweight backup)
    $excludePatterns = @(
        "node_modules",
        "android\build",
        "android\.gradle",
        "android\gradle",
        "ios\build",
        "ios\DerivedData",
        "\.git",
        "\.vscode",
        "\.idea",
        "*.log",
        "*.tmp",
        "*.temp",
        "android\app\build",
        "android\gradle\wrapper\gradle-wrapper.jar"
    )

    # Copy everything except excluded patterns
    Write-Host "📁 Copying project files (excluding dependencies and build artifacts)..." -ForegroundColor Yellow
    
    # Get all items in project directory
    $allItems = Get-ChildItem -Path $ProjectPath -Force
    
    foreach ($item in $allItems) {
        $shouldExclude = $false
        
        # Check if item should be excluded
        foreach ($pattern in $excludePatterns) {
            if ($item.Name -like $pattern -or $item.FullName -like "*$pattern*") {
                $shouldExclude = $true
                break
            }
        }
        
        if (-not $shouldExclude) {
            $destPath = Join-Path $backupDir $item.Name
            if ($item.PSIsContainer) {
                Copy-Item -Path $item.FullName -Destination $destPath -Recurse -Force
            } else {
                Copy-Item -Path $item.FullName -Destination $destPath -Force
            }
            Write-Host "  ✅ Copied: $($item.Name)" -ForegroundColor Green
        } else {
            Write-Host "  ⏭️ Skipped: $($item.Name)" -ForegroundColor Gray
        }
    }

    # Create restoration instructions
    $restoreInstructions = @"
# Whispr Mobile App Restoration Instructions

## Backup Information
- Backup Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- Project Path: $ProjectPath
- Backup Type: Lightweight (excludes node_modules and build artifacts)

## Restoration Steps

### 1. Restore Project Files
1. Extract this backup to your desired location
2. Rename the folder to your project name (e.g., Whispr_Mobile_App_Dev)

### 2. Install Dependencies
cd /path/to/restored/project
npm install

### 3. Android Setup
cd android
./gradlew clean

### 4. iOS Setup (if on macOS)
cd ios
pod install

### 5. Build Project
For Android: npm run android
For iOS (macOS only): npm run ios

## What's Included
- Complete source code (src/)
- Configuration files (package.json, tsconfig.json, etc.)
- Android project files (excluding build artifacts)
- iOS project files (excluding build artifacts)
- Documentation and scripts
- Database schemas and scripts
- Build configuration files

## What's Excluded
- node_modules (will be reinstalled)
- Build artifacts (will be regenerated)
- Cache files
- IDE configuration files

## Notes
- This is a lightweight backup designed for code preservation
- Dependencies will need to be reinstalled after restoration
- Build artifacts will be regenerated on first build
- All source code and configuration is preserved
"@

    $restorePath = Join-Path $backupDir "RESTORATION_INSTRUCTIONS.md"
    $restoreInstructions | Out-File -FilePath $restorePath -Encoding UTF8
    Write-Host "✅ Created restoration instructions" -ForegroundColor Green

    # Create backup manifest
    $manifest = @{
        BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ProjectPath = $ProjectPath
        BackupLocation = $backupDir
        BackupType = "Lightweight"
        IncludedItems = @{
            SourceCode = $true
            ConfigurationFiles = $true
            Documentation = $true
            DatabaseScripts = $true
            BuildScripts = $true
            AndroidProject = $true
            iOSProject = $true
        }
        ExcludedItems = @{
            NodeModules = $true
            BuildArtifacts = $true
            CacheFiles = $true
            IDEFiles = $true
        }
        ProjectInfo = @{
            PackageName = "com.whisprmobiletemp"
            Version = "1.0.0"
            ReactNativeVersion = "0.81"
        }
        RestorationRequired = @{
            InstallDependencies = "npm install"
            AndroidClean = "cd android && ./gradlew clean"
            iOSInstall = "cd ios && pod install (macOS only)"
        }
    }

    $manifestPath = Join-Path $backupDir "backup-manifest.json"
    $manifest | ConvertTo-Json -Depth 4 | Out-File -FilePath $manifestPath -Encoding UTF8
    Write-Host "✅ Created backup manifest" -ForegroundColor Green

    # Compress backup (if requested)
    if ($CompressBackup) {
        Write-Host "🗜️ Compressing backup..." -ForegroundColor Yellow
        $zipPath = "$backupDir.zip"
        Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force
        Remove-Item -Path $backupDir -Recurse -Force
        Write-Host "✅ Compressed backup: $zipPath" -ForegroundColor Green
        $finalBackupPath = $zipPath
    } else {
        $finalBackupPath = $backupDir
    }

    # Calculate backup size
    $backupSize = (Get-ChildItem -Path $finalBackupPath -Recurse | Measure-Object -Property Length -Sum).Sum
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)

    Write-Host "`n🎉 Lightweight Backup Complete!" -ForegroundColor Green
    Write-Host "📁 Backup Location: $finalBackupPath" -ForegroundColor Cyan
    Write-Host "📊 Backup Size: $backupSizeMB MB" -ForegroundColor Cyan
    Write-Host "⏰ Backup Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Backup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Lightweight Backup Summary:" -ForegroundColor Yellow
Write-Host "  • Complete source code" -ForegroundColor White
Write-Host "  • Configuration files" -ForegroundColor White
Write-Host "  • Documentation and scripts" -ForegroundColor White
Write-Host "  • Database schemas" -ForegroundColor White
Write-Host "  • Project structure" -ForegroundColor White
Write-Host "  • Restoration instructions" -ForegroundColor White
Write-Host "  • Backup manifest" -ForegroundColor White
Write-Host "`n⚠️ Note: Dependencies (node_modules) excluded for faster backup/restore" -ForegroundColor Yellow
