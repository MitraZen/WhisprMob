# Windows Service Diagnostics Script
# This script checks virtualization-related services

Write-Host "=== Windows Service Diagnostics ===" -ForegroundColor Green

# Check virtualization-related services
$services = @(
    "IntelHaxm",
    "IntelHaxmService", 
    "vboxservice",
    "VBoxService",
    "HyperV",
    "vmcompute",
    "vmms",
    "vmicguestinterface",
    "vmicheartbeat",
    "vmickvpexchange",
    "vmicrdv",
    "vmicshutdown",
    "vmictimesync",
    "vmicvmsession",
    "vmicvss",
    "HvHost"
)

Write-Host "`nChecking Virtualization Services..." -ForegroundColor Yellow
foreach ($service in $services) {
    try {
        $svc = Get-Service -Name $service -ErrorAction SilentlyContinue
        if ($svc) {
            Write-Host "Service: $($svc.Name) - Status: $($svc.Status) - StartType: $($svc.StartType)" -ForegroundColor Cyan
        }
    } catch {
        # Service doesn't exist, which is normal for some
    }
}

# Check Windows Features
Write-Host "`nChecking Windows Optional Features..." -ForegroundColor Yellow
$features = @(
    "Microsoft-Hyper-V-All",
    "HypervisorPlatform",
    "Microsoft-Windows-Subsystem-Linux",
    "VirtualMachinePlatform"
)

foreach ($feature in $features) {
    try {
        $feat = Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue
        if ($feat) {
            Write-Host "Feature: $($feat.FeatureName) - State: $($feat.State)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Could not check feature: $feature" -ForegroundColor Yellow
    }
}

# Check Intel HAXM installation
Write-Host "`nChecking Intel HAXM..." -ForegroundColor Yellow
$haxmPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\extras\intel\Hardware_Accelerated_Execution_Manager",
    "C:\Program Files\Intel\HAXM",
    "C:\Program Files (x86)\Intel\HAXM"
)

foreach ($path in $haxmPaths) {
    if (Test-Path $path) {
        Write-Host "✅ HAXM found at: $path" -ForegroundColor Green
        
        # Look for HAXM installer
        $installer = Get-ChildItem $path -Name "*HAXM*" -ErrorAction SilentlyContinue
        if ($installer) {
            Write-Host "  Installer: $installer" -ForegroundColor Cyan
        }
    }
}

# Check system info
Write-Host "`nSystem Information..." -ForegroundColor Yellow
try {
    $cpu = Get-WmiObject -Class Win32_Processor
    Write-Host "CPU: $($cpu.Name)" -ForegroundColor Cyan
    
    $os = Get-WmiObject -Class Win32_OperatingSystem
    Write-Host "OS: $($os.Caption) $($os.Version)" -ForegroundColor Cyan
} catch {
    Write-Host "Could not get system info" -ForegroundColor Red
}

Write-Host "`n=== Troubleshooting Steps ===" -ForegroundColor Green
Write-Host "1. Install Intel HAXM through Android Studio" -ForegroundColor Yellow
Write-Host "2. Enable virtualization in BIOS" -ForegroundColor Yellow
Write-Host "3. Disable conflicting Hyper-V features" -ForegroundColor Yellow
Write-Host "4. Use Windows Hypervisor Platform instead" -ForegroundColor Yellow
Write-Host "5. Use a physical Android device" -ForegroundColor Yellow







