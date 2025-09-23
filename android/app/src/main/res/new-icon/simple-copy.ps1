# Simple PowerShell script to copy your Whispr logo
# This is much easier to understand than the batch file

Write-Host "🎯 Whispr App Icon Setup" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

Write-Host "This script will help you copy your logo to the app." -ForegroundColor Yellow
Write-Host ""

# Check if the user has prepared their images
Write-Host "First, make sure you have these files ready:" -ForegroundColor Cyan
Write-Host "- whispr_48.png (48x48 pixels)" -ForegroundColor White
Write-Host "- whispr_72.png (72x72 pixels)" -ForegroundColor White  
Write-Host "- whispr_96.png (96x96 pixels)" -ForegroundColor White
Write-Host "- whispr_144.png (144x144 pixels)" -ForegroundColor White
Write-Host "- whispr_192.png (192x192 pixels)" -ForegroundColor White
Write-Host ""

$continue = Read-Host "Do you have all these files ready? (y/n)"

if ($continue -eq "y" -or $continue -eq "Y") {
    Write-Host ""
    Write-Host "Great! Let's copy your icons..." -ForegroundColor Green
    
    # Copy 48px icons
    if (Test-Path "whispr_48.png") {
        Copy-Item "whispr_48.png" "..\mipmap-mdpi\ic_launcher.png" -Force
        Copy-Item "whispr_48.png" "..\mipmap-mdpi\ic_launcher_round.png" -Force
        Write-Host "✅ Copied 48px icons" -ForegroundColor Green
    } else {
        Write-Host "❌ whispr_48.png not found" -ForegroundColor Red
    }
    
    # Copy 72px icons
    if (Test-Path "whispr_72.png") {
        Copy-Item "whispr_72.png" "..\mipmap-hdpi\ic_launcher.png" -Force
        Copy-Item "whispr_72.png" "..\mipmap-hdpi\ic_launcher_round.png" -Force
        Write-Host "✅ Copied 72px icons" -ForegroundColor Green
    } else {
        Write-Host "❌ whispr_72.png not found" -ForegroundColor Red
    }
    
    # Copy 96px icons
    if (Test-Path "whispr_96.png") {
        Copy-Item "whispr_96.png" "..\mipmap-xhdpi\ic_launcher.png" -Force
        Copy-Item "whispr_96.png" "..\mipmap-xhdpi\ic_launcher_round.png" -Force
        Write-Host "✅ Copied 96px icons" -ForegroundColor Green
    } else {
        Write-Host "❌ whispr_96.png not found" -ForegroundColor Red
    }
    
    # Copy 144px icons
    if (Test-Path "whispr_144.png") {
        Copy-Item "whispr_144.png" "..\mipmap-xxhdpi\ic_launcher.png" -Force
        Copy-Item "whispr_144.png" "..\mipmap-xxhdpi\ic_launcher_round.png" -Force
        Write-Host "✅ Copied 144px icons" -ForegroundColor Green
    } else {
        Write-Host "❌ whispr_144.png not found" -ForegroundColor Red
    }
    
    # Copy 192px icons
    if (Test-Path "whispr_192.png") {
        Copy-Item "whispr_192.png" "..\mipmap-xxxhdpi\ic_launcher.png" -Force
        Copy-Item "whispr_192.png" "..\mipmap-xxxhdpi\ic_launcher_round.png" -Force
        Write-Host "✅ Copied 192px icons" -ForegroundColor Green
    } else {
        Write-Host "❌ whispr_192.png not found" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🎉 Icon copying completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run: npx react-native run-android" -ForegroundColor White
    Write-Host "2. Check your app icon on the phone!" -ForegroundColor White
    
} else {
    Write-Host ""
    Write-Host "No problem! Please prepare your images first." -ForegroundColor Yellow
    Write-Host "Check the SIMPLE_ICON_GUIDE.md file for detailed instructions." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
