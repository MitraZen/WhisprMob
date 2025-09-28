# Automated Backup Scheduler for Whispr Mobile App
# This script sets up automated backups using Windows Task Scheduler

param(
    [string]$BackupLocation = "C:\Backups\WhisprMobile",
    [string]$ProjectPath = "C:\Projects\Whispr_Mobile_App_Dev",
    [string]$BackupType = "Lightweight", # "Complete" or "Lightweight"
    [string]$Schedule = "Daily", # "Daily", "Weekly", "Monthly"
    [string]$Time = "02:00" # 24-hour format
)

Write-Host "🕐 Setting up Automated Backup Schedule..." -ForegroundColor Green

# Validate parameters
if (-not (Test-Path $ProjectPath)) {
    Write-Host "❌ Project path not found: $ProjectPath" -ForegroundColor Red
    exit 1
}

if ($BackupType -notin @("Complete", "Lightweight")) {
    Write-Host "❌ Invalid backup type. Use 'Complete' or 'Lightweight'" -ForegroundColor Red
    exit 1
}

if ($Schedule -notin @("Daily", "Weekly", "Monthly")) {
    Write-Host "❌ Invalid schedule. Use 'Daily', 'Weekly', or 'Monthly'" -ForegroundColor Red
    exit 1
}

try {
    # Create backup directory if it doesn't exist
    if (-not (Test-Path $BackupLocation)) {
        New-Item -ItemType Directory -Path $BackupLocation -Force | Out-Null
        Write-Host "✅ Created backup directory: $BackupLocation" -ForegroundColor Green
    }

    # Create the backup script content
    $backupScriptContent = @"
# Automated Whispr Mobile App Backup
# Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

param(
    [string]`$BackupLocation = "$BackupLocation",
    [string]`$ProjectPath = "$ProjectPath"
)

Write-Host "🤖 Running automated backup..." -ForegroundColor Green

# Run the appropriate backup script
if ("$BackupType" -eq "Complete") {
    & "$PSScriptRoot\create-complete-backup.ps1" -BackupLocation `$BackupLocation -ProjectPath `$ProjectPath -CompressBackup
} else {
    & "$PSScriptRoot\create-lightweight-backup.ps1" -BackupLocation `$BackupLocation -ProjectPath `$ProjectPath -CompressBackup
}

Write-Host "✅ Automated backup completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
"@

    # Save the automated backup script
    $automatedScriptPath = Join-Path $BackupLocation "automated-backup.ps1"
    $backupScriptContent | Out-File -FilePath $automatedScriptPath -Encoding UTF8
    Write-Host "✅ Created automated backup script: $automatedScriptPath" -ForegroundColor Green

    # Create Windows Task Scheduler task
    $taskName = "WhisprMobile_Backup_$BackupType"
    $taskDescription = "Automated backup for Whispr Mobile App ($BackupType backup)"
    
    # Define trigger based on schedule
    switch ($Schedule) {
        "Daily" {
            $trigger = New-ScheduledTaskTrigger -Daily -At $Time
        }
        "Weekly" {
            $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $Time
        }
        "Monthly" {
            $trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At $Time
        }
    }

    # Define action
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$automatedScriptPath`""

    # Define settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    # Create the task
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $taskDescription -Force | Out-Null
    
    Write-Host "✅ Created scheduled task: $taskName" -ForegroundColor Green
    Write-Host "📅 Schedule: $Schedule at $Time" -ForegroundColor Cyan
    Write-Host "📁 Backup Type: $BackupType" -ForegroundColor Cyan
    Write-Host "📂 Backup Location: $BackupLocation" -ForegroundColor Cyan

    # Create backup management script
    $managementScript = @"
# Whispr Mobile App Backup Management
# Use this script to manage your automated backups

Write-Host "🗂️ Whispr Mobile App Backup Management" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# List scheduled tasks
Write-Host "`n📅 Scheduled Backup Tasks:" -ForegroundColor Yellow
Get-ScheduledTask | Where-Object { `$_.TaskName -like "*WhisprMobile*" } | ForEach-Object {
    Write-Host "  • `$(`$_.TaskName) - `$(`$_.State)" -ForegroundColor White
}

# List backup files
Write-Host "`n📁 Available Backups:" -ForegroundColor Yellow
if (Test-Path "$BackupLocation") {
    Get-ChildItem -Path "$BackupLocation" -Filter "*.zip" | ForEach-Object {
        `$sizeMB = [math]::Round(`$_.Length / 1MB, 2)
        Write-Host "  • `$(`$_.Name) (`$sizeMB MB) - `$(`$_.LastWriteTime)" -ForegroundColor White
    }
} else {
    Write-Host "  No backup directory found" -ForegroundColor Gray
}

# Management options
Write-Host "`n🔧 Management Options:" -ForegroundColor Yellow
Write-Host "  1. Run backup now" -ForegroundColor White
Write-Host "  2. List all backups" -ForegroundColor White
Write-Host "  3. Delete old backups (older than 30 days)" -ForegroundColor White
Write-Host "  4. View backup logs" -ForegroundColor White
Write-Host "  5. Exit" -ForegroundColor White

`$choice = Read-Host "`nEnter your choice (1-5)"

switch (`$choice) {
    "1" {
        Write-Host "🚀 Running backup now..." -ForegroundColor Green
        & "$automatedScriptPath"
    }
    "2" {
        Write-Host "📁 All backup files:" -ForegroundColor Yellow
        Get-ChildItem -Path "$BackupLocation" -Recurse | ForEach-Object {
            `$sizeMB = [math]::Round(`$_.Length / 1MB, 2)
            Write-Host "  • `$(`$_.FullName) (`$sizeMB MB)" -ForegroundColor White
        }
    }
    "3" {
        `$cutoffDate = (Get-Date).AddDays(-30)
        `$oldBackups = Get-ChildItem -Path "$BackupLocation" -Recurse | Where-Object { `$_.LastWriteTime -lt `$cutoffDate }
        if (`$oldBackups) {
            Write-Host "🗑️ Deleting `$(`$oldBackups.Count) old backup(s)..." -ForegroundColor Yellow
            `$oldBackups | Remove-Item -Force
            Write-Host "✅ Deleted old backups" -ForegroundColor Green
        } else {
            Write-Host "ℹ️ No old backups found" -ForegroundColor Cyan
        }
    }
    "4" {
        Write-Host "📋 Recent backup activity:" -ForegroundColor Yellow
        Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" | Where-Object { `$_.Message -like "*WhisprMobile*" } | Select-Object -First 10 | ForEach-Object {
            Write-Host "  • `$(`$_.TimeCreated) - `$(`$_.LevelDisplayName)" -ForegroundColor White
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

    $managementScriptPath = Join-Path $BackupLocation "backup-management.ps1"
    $managementScript | Out-File -FilePath $managementScriptPath -Encoding UTF8
    Write-Host "✅ Created backup management script: $managementScriptPath" -ForegroundColor Green

    Write-Host "`n🎉 Automated Backup Setup Complete!" -ForegroundColor Green
    Write-Host "`n📋 Setup Summary:" -ForegroundColor Yellow
    Write-Host "  • Task Name: $taskName" -ForegroundColor White
    Write-Host "  • Schedule: $Schedule at $Time" -ForegroundColor White
    Write-Host "  • Backup Type: $BackupType" -ForegroundColor White
    Write-Host "  • Backup Location: $BackupLocation" -ForegroundColor White
    Write-Host "  • Management Script: $managementScriptPath" -ForegroundColor White

    Write-Host "`n🔧 To manage backups, run:" -ForegroundColor Cyan
    Write-Host "  PowerShell -ExecutionPolicy Bypass -File `"$managementScriptPath`"" -ForegroundColor White

} catch {
    Write-Host "❌ Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
