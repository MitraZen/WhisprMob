# Complete Whispr Mobile App Project Backup Script
# This script creates a comprehensive backup including all dependencies and build artifacts

param(
    [string]$BackupLocation = "C:\Backups\WhisprMobile",
    [string]$ProjectPath = "C:\Projects\Whispr_Mobile_App_Dev",
    [switch]$IncludeNodeModules = $true,
    [switch]$IncludeBuildArtifacts = $true,
    [switch]$CompressBackup = $true
)

Write-Host "🚀 Starting Complete Whispr Mobile App Backup..." -ForegroundColor Green
Write-Host "Project Path: $ProjectPath" -ForegroundColor Cyan
Write-Host "Backup Location: $BackupLocation" -ForegroundColor Cyan

# Create backup directory with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "$BackupLocation\WhisprMobile_Complete_$timestamp"

try {
    # Create backup directory
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✅ Created backup directory: $backupDir" -ForegroundColor Green

    # Define what to include/exclude
    $excludePatterns = @(
        "node_modules\.cache",
        "node_modules\.bin",
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
        "*.temp"
    )

    # Core project files (always included)
    Write-Host "📁 Copying core project files..." -ForegroundColor Yellow
    $coreItems = @(
        "src",
        "android\app\src",
        "android\app\build.gradle",
        "android\build.gradle",
        "android\gradle.properties",
        "android\settings.gradle",
        "ios\WhisprMobileTemp",
        "ios\Podfile",
        "App.tsx",
        "index.js",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "babel.config.js",
        "metro.config.js",
        "jest.config.js",
        "jest.setup.js",
        "app.json",
        "*.md",
        "*.sql",
        "*.ps1",
        "*.bat",
        "*.sh"
    )

    foreach ($item in $coreItems) {
        $sourcePath = Join-Path $ProjectPath $item
        if (Test-Path $sourcePath) {
            $destPath = Join-Path $backupDir $item
            $destParent = Split-Path $destPath -Parent
            if (!(Test-Path $destParent)) {
                New-Item -ItemType Directory -Path $destParent -Force | Out-Null
            }
            Copy-Item -Path $sourcePath -Destination $destPath -Recurse -Force
            Write-Host "  ✅ Copied: $item" -ForegroundColor Green
        }
    }

    # Node modules (if requested)
    if ($IncludeNodeModules) {
        Write-Host "📦 Copying node_modules (this may take a while)..." -ForegroundColor Yellow
        $nodeModulesPath = Join-Path $ProjectPath "node_modules"
        if (Test-Path $nodeModulesPath) {
            $destNodeModules = Join-Path $backupDir "node_modules"
            Copy-Item -Path $nodeModulesPath -Destination $destNodeModules -Recurse -Force
            Write-Host "  ✅ Copied node_modules" -ForegroundColor Green
        }
    }

    # Android build artifacts (if requested)
    if ($IncludeBuildArtifacts) {
        Write-Host "🤖 Copying Android build artifacts..." -ForegroundColor Yellow
        
        # APK files
        $apkFiles = Get-ChildItem -Path $ProjectPath -Filter "*.apk" -Recurse
        foreach ($apk in $apkFiles) {
            $destApk = Join-Path $backupDir $apk.Name
            Copy-Item -Path $apk.FullName -Destination $destApk -Force
            Write-Host "  ✅ Copied APK: $($apk.Name)" -ForegroundColor Green
        }

        # AAB files
        $aabFiles = Get-ChildItem -Path $ProjectPath -Filter "*.aab" -Recurse
        foreach ($aab in $aabFiles) {
            $destAab = Join-Path $backupDir $aab.Name
            Copy-Item -Path $aab.FullName -Destination $destAab -Force
            Write-Host "  ✅ Copied AAB: $($aab.Name)" -ForegroundColor Green
        }

        # Android gradle wrapper
        $gradleWrapper = Join-Path $ProjectPath "android\gradlew*"
        if (Test-Path $gradleWrapper) {
            Copy-Item -Path $gradleWrapper -Destination (Join-Path $backupDir "android\") -Force
            Write-Host "  ✅ Copied Gradle wrapper" -ForegroundColor Green
        }
    }

    # Create backup manifest
    $manifest = @{
        BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ProjectPath = $ProjectPath
        BackupLocation = $backupDir
        IncludedItems = @{
            CoreFiles = $true
            NodeModules = $IncludeNodeModules
            BuildArtifacts = $IncludeBuildArtifacts
            APKFiles = (Get-ChildItem -Path $ProjectPath -Filter "*.apk" -Recurse).Count
            AABFiles = (Get-ChildItem -Path $ProjectPath -Filter "*.aab" -Recurse).Count
        }
        ProjectInfo = @{
            PackageName = "com.whisprmobiletemp"
            Version = "1.0.0"
            ReactNativeVersion = "0.81"
        }
    }

    $manifestPath = Join-Path $backupDir "backup-manifest.json"
    $manifest | ConvertTo-Json -Depth 3 | Out-File -FilePath $manifestPath -Encoding UTF8
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

    Write-Host "`n🎉 Backup Complete!" -ForegroundColor Green
    Write-Host "📁 Backup Location: $finalBackupPath" -ForegroundColor Cyan
    Write-Host "📊 Backup Size: $backupSizeMB MB" -ForegroundColor Cyan
    Write-Host "⏰ Backup Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Backup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Backup Summary:" -ForegroundColor Yellow
Write-Host "  • Complete source code" -ForegroundColor White
Write-Host "  • Configuration files" -ForegroundColor White
Write-Host "  • Documentation" -ForegroundColor White
Write-Host "  • Database scripts" -ForegroundColor White
Write-Host "  • Build scripts" -ForegroundColor White
if ($IncludeNodeModules) { Write-Host "  • Node modules (dependencies)" -ForegroundColor White }
if ($IncludeBuildArtifacts) { Write-Host "  • APK/AAB files" -ForegroundColor White }
Write-Host "  • Backup manifest with metadata" -ForegroundColor White
