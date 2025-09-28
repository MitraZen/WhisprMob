# Simple Whispr Mobile App Backup Script
param(
    [string]$BackupLocation = "C:\Backups\WhisprMobile",
    [string]$ProjectPath = "C:\Projects\Whispr_Mobile_App_Dev"
)

Write-Host "🚀 Starting Simple Whispr Mobile App Backup..." -ForegroundColor Green

# Create backup directory with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "$BackupLocation\WhisprMobile_$timestamp"

try {
    # Create backup directory
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✅ Created backup directory: $backupDir" -ForegroundColor Green

    # Copy essential files and directories
    $itemsToCopy = @(
        "src",
        "android\app\src",
        "android\app\build.gradle",
        "android\build.gradle",
        "android\gradle.properties",
        "android\settings.gradle",
        "android\gradlew",
        "android\gradlew.bat",
        "ios",
        "App.tsx",
        "index.js",
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "babel.config.js",
        "metro.config.js",
        "jest.config.js",
        "jest.setup.js",
        "app.json"
    )

    foreach ($item in $itemsToCopy) {
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

    # Copy documentation and scripts
    $docFiles = Get-ChildItem -Path $ProjectPath -Filter "*.md"
    foreach ($doc in $docFiles) {
        Copy-Item -Path $doc.FullName -Destination $backupDir -Force
        Write-Host "  ✅ Copied: $($doc.Name)" -ForegroundColor Green
    }

    $scriptFiles = Get-ChildItem -Path $ProjectPath -Filter "*.ps1"
    foreach ($script in $scriptFiles) {
        Copy-Item -Path $script.FullName -Destination $backupDir -Force
        Write-Host "  ✅ Copied: $($script.Name)" -ForegroundColor Green
    }

    $sqlFiles = Get-ChildItem -Path $ProjectPath -Filter "*.sql"
    foreach ($sql in $sqlFiles) {
        Copy-Item -Path $sql.FullName -Destination $backupDir -Force
        Write-Host "  ✅ Copied: $($sql.Name)" -ForegroundColor Green
    }

    # Copy APK and AAB files
    $apkFiles = Get-ChildItem -Path $ProjectPath -Filter "*.apk" -Recurse
    foreach ($apk in $apkFiles) {
        Copy-Item -Path $apk.FullName -Destination $backupDir -Force
        Write-Host "  ✅ Copied APK: $($apk.Name)" -ForegroundColor Green
    }

    $aabFiles = Get-ChildItem -Path $ProjectPath -Filter "*.aab" -Recurse
    foreach ($aab in $aabFiles) {
        Copy-Item -Path $aab.FullName -Destination $backupDir -Force
        Write-Host "  ✅ Copied AAB: $($aab.Name)" -ForegroundColor Green
    }

    # Create backup info file
    $backupInfo = @{
        BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ProjectPath = $ProjectPath
        BackupLocation = $backupDir
        ItemsIncluded = @(
            "Complete source code (src/)",
            "Configuration files",
            "Documentation",
            "Database scripts",
            "Build scripts",
            "APK/AAB files",
            "Android project files",
            "iOS project files"
        )
        ItemsExcluded = @(
            "node_modules (reinstall with: npm install)",
            "Build artifacts (regenerated on build)",
            "Cache files",
            "IDE configuration files"
        )
        ProjectInfo = @{
            PackageName = "com.whisprmobiletemp"
            Version = "1.0.0"
            ReactNativeVersion = "0.81"
        }
    }

    $infoPath = Join-Path $backupDir "backup-info.json"
    $backupInfo | ConvertTo-Json -Depth 3 | Out-File -FilePath $infoPath -Encoding UTF8
    Write-Host "✅ Created backup info file" -ForegroundColor Green

    # Compress backup
    Write-Host "🗜️ Compressing backup..." -ForegroundColor Yellow
    $zipPath = "$backupDir.zip"
    Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force
    Remove-Item -Path $backupDir -Recurse -Force
    Write-Host "✅ Compressed backup: $zipPath" -ForegroundColor Green

    # Calculate backup size
    $backupSize = (Get-Item $zipPath).Length
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)

    Write-Host "`n🎉 Backup Complete!" -ForegroundColor Green
    Write-Host "📁 Backup Location: $zipPath" -ForegroundColor Cyan
    Write-Host "📊 Backup Size: $backupSizeMB MB" -ForegroundColor Cyan
    Write-Host "⏰ Backup Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Backup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 Backup Summary:" -ForegroundColor Yellow
Write-Host "  • Complete source code" -ForegroundColor White
Write-Host "  • Configuration files" -ForegroundColor White
Write-Host "  • Documentation and scripts" -ForegroundColor White
Write-Host "  • Database schemas" -ForegroundColor White
Write-Host "  • APK/AAB files" -ForegroundColor White
Write-Host "  • Project structure" -ForegroundColor White
Write-Host "`n⚠️ Note: Run npm install after restoring to reinstall dependencies" -ForegroundColor Yellow
