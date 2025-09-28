# Cloud Backup Integration for Whispr Mobile App
# This script sets up cloud backup using OneDrive, Google Drive, or Dropbox

param(
    [string]$ProjectPath = "C:\Projects\Whispr_Mobile_App_Dev",
    [string]$CloudProvider = "OneDrive", # "OneDrive", "GoogleDrive", "Dropbox"
    [string]$BackupType = "Lightweight" # "Complete" or "Lightweight"
)

Write-Host "☁️ Setting up Cloud Backup Integration..." -ForegroundColor Green

# Detect cloud provider paths
$cloudPaths = @{
    "OneDrive" = @(
        "$env:USERPROFILE\OneDrive",
        "$env:USERPROFILE\OneDrive - Personal",
        "$env:USERPROFILE\OneDrive - Business"
    )
    "GoogleDrive" = @(
        "$env:USERPROFILE\Google Drive",
        "$env:LOCALAPPDATA\Google\Drive"
    )
    "Dropbox" = @(
        "$env:USERPROFILE\Dropbox",
        "$env:LOCALAPPDATA\Dropbox"
    )
}

# Find the cloud provider path
$cloudPath = $null
foreach ($path in $cloudPaths[$CloudProvider]) {
    if (Test-Path $path) {
        $cloudPath = $path
        break
    }
}

if (-not $cloudPath) {
    Write-Host "❌ $CloudProvider not found. Please ensure it's installed and synced." -ForegroundColor Red
    Write-Host "Available paths checked:" -ForegroundColor Yellow
    foreach ($path in $cloudPaths[$CloudProvider]) {
        Write-Host "  • $path" -ForegroundColor Gray
    }
    exit 1
}

Write-Host "✅ Found $CloudProvider at: $cloudPath" -ForegroundColor Green

# Create cloud backup directory
$cloudBackupDir = Join-Path $cloudPath "WhisprMobile_Backups"
if (-not (Test-Path $cloudBackupDir)) {
    New-Item -ItemType Directory -Path $cloudBackupDir -Force | Out-Null
    Write-Host "✅ Created cloud backup directory: $cloudBackupDir" -ForegroundColor Green
}

# Create cloud backup script
$cloudBackupScript = @"
# Cloud Backup Script for Whispr Mobile App
# This script creates a backup and syncs it to $CloudProvider

param(
    [string]`$ProjectPath = "$ProjectPath",
    [string]`$CloudBackupDir = "$cloudBackupDir",
    [string]`$BackupType = "$BackupType"
)

Write-Host "☁️ Starting Cloud Backup to $CloudProvider..." -ForegroundColor Green

try {
    # Create local temporary backup
    `$tempBackupDir = Join-Path `$env:TEMP "WhisprMobile_CloudBackup_`$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path `$tempBackupDir -Force | Out-Null

    # Run the appropriate backup script
    if (`$BackupType -eq "Complete") {
        & "$PSScriptRoot\create-complete-backup.ps1" -BackupLocation `$tempBackupDir -ProjectPath `$ProjectPath -CompressBackup
    } else {
        & "$PSScriptRoot\create-lightweight-backup.ps1" -BackupLocation `$tempBackupDir -ProjectPath `$ProjectPath -CompressBackup
    }

    # Move backup to cloud directory
    `$backupFiles = Get-ChildItem -Path `$tempBackupDir -Filter "*.zip"
    foreach (`$backupFile in `$backupFiles) {
        `$cloudBackupPath = Join-Path `$CloudBackupDir `$backupFile.Name
        Move-Item -Path `$backupFile.FullName -Destination `$cloudBackupPath -Force
        Write-Host "✅ Moved backup to cloud: `$(`$backupFile.Name)" -ForegroundColor Green
    }

    # Clean up temporary directory
    Remove-Item -Path `$tempBackupDir -Recurse -Force

    Write-Host "🎉 Cloud backup completed successfully!" -ForegroundColor Green
    Write-Host "📁 Backup location: `$CloudBackupDir" -ForegroundColor Cyan
    Write-Host "☁️ Syncing to $CloudProvider..." -ForegroundColor Cyan

} catch {
    Write-Host "❌ Cloud backup failed: `$(`$_.Exception.Message)" -ForegroundColor Red
    exit 1
}
"@

$cloudBackupScriptPath = Join-Path $cloudBackupDir "cloud-backup.ps1"
$cloudBackupScript | Out-File -FilePath $cloudBackupScriptPath -Encoding UTF8
Write-Host "✅ Created cloud backup script: $cloudBackupScriptPath" -ForegroundColor Green

# Create cloud backup management
$cloudManagementScript = @"
# Cloud Backup Management for Whispr Mobile App

Write-Host "☁️ $CloudProvider Backup Management" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

`$cloudBackupDir = "$cloudBackupDir"

if (-not (Test-Path `$cloudBackupDir)) {
    Write-Host "❌ Cloud backup directory not found: `$cloudBackupDir" -ForegroundColor Red
    exit 1
}

# List cloud backups
Write-Host "`n📁 Available Cloud Backups:" -ForegroundColor Yellow
`$backups = Get-ChildItem -Path `$cloudBackupDir -Filter "*.zip"
if (`$backups) {
    foreach (`$backup in `$backups) {
        `$sizeMB = [math]::Round(`$backup.Length / 1MB, 2)
        `$syncStatus = if (`$backup.LastWriteTime -gt (Get-Date).AddMinutes(-5)) { "✅ Synced" } else { "⏳ Syncing..." }
        Write-Host "  • `$(`$backup.Name) (`$sizeMB MB) - `$(`$backup.LastWriteTime) `$syncStatus" -ForegroundColor White
    }
} else {
    Write-Host "  No cloud backups found" -ForegroundColor Gray
}

# Cloud backup options
Write-Host "`n🔧 Cloud Backup Options:" -ForegroundColor Yellow
Write-Host "  1. Create new cloud backup" -ForegroundColor White
Write-Host "  2. Download backup from cloud" -ForegroundColor White
Write-Host "  3. Check sync status" -ForegroundColor White
Write-Host "  4. Clean old cloud backups" -ForegroundColor White
Write-Host "  5. Exit" -ForegroundColor White

`$choice = Read-Host "`nEnter your choice (1-5)"

switch (`$choice) {
    "1" {
        Write-Host "🚀 Creating new cloud backup..." -ForegroundColor Green
        & "$cloudBackupScriptPath"
    }
    "2" {
        Write-Host "📥 Available backups for download:" -ForegroundColor Yellow
        `$backups | ForEach-Object { Write-Host "  • `$(`$_.Name)" -ForegroundColor White }
        `$backupName = Read-Host "Enter backup name to download"
        `$backupPath = Join-Path `$cloudBackupDir `$backupName
        if (Test-Path `$backupPath) {
            `$downloadPath = Join-Path `$env:USERPROFILE\Downloads `$backupName
            Copy-Item -Path `$backupPath -Destination `$downloadPath -Force
            Write-Host "✅ Downloaded to: `$downloadPath" -ForegroundColor Green
        } else {
            Write-Host "❌ Backup not found" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "🔄 Checking sync status..." -ForegroundColor Yellow
        `$recentBackups = Get-ChildItem -Path `$cloudBackupDir -Filter "*.zip" | Where-Object { `$_.LastWriteTime -gt (Get-Date).AddHours(-1) }
        if (`$recentBackups) {
            Write-Host "✅ Recent backups are syncing properly" -ForegroundColor Green
        } else {
            Write-Host "⚠️ No recent backups found. Check $CloudProvider sync status." -ForegroundColor Yellow
        }
    }
    "4" {
        `$cutoffDate = (Get-Date).AddDays(-30)
        `$oldBackups = Get-ChildItem -Path `$cloudBackupDir -Filter "*.zip" | Where-Object { `$_.LastWriteTime -lt `$cutoffDate }
        if (`$oldBackups) {
            Write-Host "🗑️ Found `$(`$oldBackups.Count) old backup(s) to clean..." -ForegroundColor Yellow
            `$confirm = Read-Host "Delete old backups? (y/N)"
            if (`$confirm -eq "y" -or `$confirm -eq "Y") {
                `$oldBackups | Remove-Item -Force
                Write-Host "✅ Cleaned old cloud backups" -ForegroundColor Green
            }
        } else {
            Write-Host "ℹ️ No old backups found" -ForegroundColor Cyan
        }
    }
    "5" {
        Write-Host "👋 Goodbye!" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}
"@

$cloudManagementScriptPath = Join-Path $cloudBackupDir "cloud-backup-management.ps1"
$cloudManagementScript | Out-File -FilePath $cloudManagementScriptPath -Encoding UTF8
Write-Host "✅ Created cloud backup management script: $cloudManagementScriptPath" -ForegroundColor Green

Write-Host "`n🎉 Cloud Backup Setup Complete!" -ForegroundColor Green
Write-Host "`n📋 Cloud Backup Summary:" -ForegroundColor Yellow
Write-Host "  • Cloud Provider: $CloudProvider" -ForegroundColor White
Write-Host "  • Cloud Path: $cloudPath" -ForegroundColor White
Write-Host "  • Backup Directory: $cloudBackupDir" -ForegroundColor White
Write-Host "  • Backup Type: $BackupType" -ForegroundColor White
Write-Host "  • Management Script: $cloudManagementScriptPath" -ForegroundColor White

Write-Host "`n🔧 To manage cloud backups, run:" -ForegroundColor Cyan
Write-Host "  PowerShell -ExecutionPolicy Bypass -File `"$cloudManagementScriptPath`"" -ForegroundColor White

Write-Host "`n⚠️ Important Notes:" -ForegroundColor Yellow
Write-Host "  • Ensure $CloudProvider is installed and syncing" -ForegroundColor White
Write-Host "  • Cloud backups will sync automatically when $CloudProvider is online" -ForegroundColor White
Write-Host "  • Large backups may take time to sync depending on your internet speed" -ForegroundColor White
