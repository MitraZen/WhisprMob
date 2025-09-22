# Virtualization Diagnostics Script
# This script checks your system's virtualization capabilities

Write-Host "=== Virtualization Diagnostics ===" -ForegroundColor Green

# Check if virtualization is supported in BIOS
Write-Host "`n1. Checking CPU Virtualization Support..." -ForegroundColor Yellow
try {
    $cpuInfo = Get-WmiObject -Class Win32_Processor
    $cpuName = $cpuInfo.Name
    Write-Host "CPU: $cpuName" -ForegroundColor Cyan
    
    # Check for Intel VT-x or AMD-V
    if ($cpuName -match "Intel") {
        Write-Host "Intel CPU detected - checking for VT-x support" -ForegroundColor Yellow
    } elseif ($cpuName -match "AMD") {
        Write-Host "AMD CPU detected - checking for AMD-V support" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not detect CPU information" -ForegroundColor Red
}

# Check Windows Features
Write-Host "`n2. Checking Windows Virtualization Features..." -ForegroundColor Yellow
try {
    $hyperV = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue
    if ($hyperV) {
        Write-Host "Hyper-V Status: $($hyperV.State)" -ForegroundColor Cyan
    }
    
    $hypervisorPlatform = Get-WindowsOptionalFeature -Online -FeatureName HypervisorPlatform -ErrorAction SilentlyContinue
    if ($hypervisorPlatform) {
        Write-Host "Hypervisor Platform Status: $($hypervisorPlatform.State)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Could not check Windows features (may need admin privileges)" -ForegroundColor Yellow
}

# Check if HAXM is installed
Write-Host "`n3. Checking Intel HAXM Installation..." -ForegroundColor Yellow
$haxmPath = "$env:LOCALAPPDATA\Android\Sdk\extras\intel\Hardware_Accelerated_Execution_Manager"
if (Test-Path $haxmPath) {
    Write-Host "✅ Intel HAXM directory found: $haxmPath" -ForegroundColor Green
    
    $haxmInstaller = Get-ChildItem "$haxmPath" -Name "*HAXM*" -ErrorAction SilentlyContinue
    if ($haxmInstaller) {
        Write-Host "HAXM installer found: $haxmInstaller" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Intel HAXM not found" -ForegroundColor Red
}

# Check Android Emulator
Write-Host "`n4. Checking Android Emulator..." -ForegroundColor Yellow
$emulatorPath = "$env:LOCALAPPDATA\Android\Sdk\emulator"
if (Test-Path $emulatorPath) {
    Write-Host "✅ Android Emulator found" -ForegroundColor Green
    
    # List available AVDs
    $avdPath = "$env:USERPROFILE\.android\avd"
    if (Test-Path $avdPath) {
        $avds = Get-ChildItem $avdPath -Name "*.avd" -ErrorAction SilentlyContinue
        if ($avds) {
            Write-Host "Available AVDs:" -ForegroundColor Cyan
            foreach ($avd in $avds) {
                Write-Host "  - $($avd -replace '\.avd', '')" -ForegroundColor White
            }
        } else {
            Write-Host "No AVDs found" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Android Emulator not found" -ForegroundColor Red
}

# Check system requirements
Write-Host "`n5. System Requirements Check..." -ForegroundColor Yellow
$totalRAM = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
Write-Host "Total RAM: $totalRAM GB" -ForegroundColor Cyan

if ($totalRAM -ge 8) {
    Write-Host "✅ Sufficient RAM for emulator" -ForegroundColor Green
} else {
    Write-Host "⚠️ Low RAM - may affect emulator performance" -ForegroundColor Yellow
}

Write-Host "`n=== Troubleshooting Recommendations ===" -ForegroundColor Green
Write-Host "1. Enable virtualization in BIOS/UEFI" -ForegroundColor Yellow
Write-Host "2. Install Intel HAXM" -ForegroundColor Yellow
Write-Host "3. Disable Hyper-V if using Intel HAXM" -ForegroundColor Yellow
Write-Host "4. Use Windows Hypervisor Platform instead" -ForegroundColor Yellow
Write-Host "5. Try using a physical Android device" -ForegroundColor Yellow








