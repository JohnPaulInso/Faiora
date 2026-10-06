# PowerShell script to help install notification icons from Android Asset Studio
# After downloading from https://romannurik.github.io/AndroidAssetStudio/icons-notification.html

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Faiora Notification Icon Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if user has downloaded icons
Write-Host "Have you downloaded the icons from Android Asset Studio?" -ForegroundColor Yellow
Write-Host "URL: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html" -ForegroundColor White
Write-Host ""
Write-Host "1. Upload your applogo.png" -ForegroundColor White
Write-Host "2. Set name to: ic_notification_logo" -ForegroundColor White
Write-Host "3. Adjust padding (try 10-15%)" -ForegroundColor White
Write-Host "4. Download the ZIP file" -ForegroundColor White
Write-Host "5. Extract it somewhere" -ForegroundColor White
Write-Host ""

$response = Read-Host "Have you extracted the ZIP? (y/n)"

if ($response -ne "y") {
    Write-Host ""
    Write-Host "Please download and extract first, then run this script again." -ForegroundColor Red
    exit
}

Write-Host ""
$sourcePath = Read-Host "Enter the path to the extracted 'res' folder (or drag and drop it here)"

# Clean up path (remove quotes if user dragged and dropped)
$sourcePath = $sourcePath.Trim('"')

if (-not (Test-Path $sourcePath)) {
    Write-Host ""
    Write-Host "ERROR: Path not found: $sourcePath" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Copying notification icons..." -ForegroundColor Green

$targetPath = "android/app/src/main/res"

# Copy each density folder
$densities = @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")
$copiedCount = 0

foreach ($density in $densities) {
    $sourceFolder = Join-Path $sourcePath "drawable-$density"
    $targetFolder = Join-Path $targetPath "drawable-$density"
    
    if (Test-Path $sourceFolder) {
        # Create target folder if it doesn't exist
        if (-not (Test-Path $targetFolder)) {
            New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
        }
        
        # Copy the icon file
        $sourceFile = Join-Path $sourceFolder "ic_notification_logo.png"
        if (Test-Path $sourceFile) {
            Copy-Item $sourceFile $targetFolder -Force
            Write-Host "  ✓ Copied drawable-$density/ic_notification_logo.png" -ForegroundColor Green
            $copiedCount++
        }
    }
}

Write-Host ""
if ($copiedCount -eq 0) {
    Write-Host "ERROR: No icon files found. Make sure you extracted the ZIP correctly." -ForegroundColor Red
    Write-Host "The extracted folder should contain: drawable-mdpi, drawable-hdpi, etc." -ForegroundColor Yellow
} else {
    Write-Host "SUCCESS! Copied $copiedCount density versions." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run: npm run build" -ForegroundColor White
    Write-Host "2. Run: npx cap sync android" -ForegroundColor White
    Write-Host "3. Build APK: cd android && ./gradlew assembleDebug" -ForegroundColor White
    Write-Host "4. Install and test!" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
