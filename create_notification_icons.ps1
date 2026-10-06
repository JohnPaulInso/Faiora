# PowerShell script to create properly sized notification icons for Android
# This creates the required density-specific versions

# Source icon (use your applogo or a simplified version)
$sourceIcon = "applogo.png"

# Target directories and sizes
$densities = @{
    "mdpi" = 24
    "hdpi" = 36
    "xhdpi" = 48
    "xxhdpi" = 72
    "xxxhdpi" = 96
}

# Base path
$basePath = "android/app/src/main/res"

Write-Host "Creating notification icon directories and files..." -ForegroundColor Green

foreach ($density in $densities.GetEnumerator()) {
    $dirName = "drawable-$($density.Key)"
    $targetDir = Join-Path $basePath $dirName
    $targetFile = Join-Path $targetDir "ic_notification_logo.png"
    
    # Create directory if it doesn't exist
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Write-Host "Created directory: $targetDir" -ForegroundColor Yellow
    }
    
    $size = $density.Value
    Write-Host "For $dirName, create a ${size}x${size}px version at: $targetFile" -ForegroundColor Cyan
}

Write-Host "`nNOTE: This script shows where to place icons. You need to:" -ForegroundColor Magenta
Write-Host "1. Use an image editor (Photoshop, GIMP, or online tool)" -ForegroundColor White
Write-Host "2. Create simple, bold versions of your logo" -ForegroundColor White
Write-Host "3. Make them white/transparent (Android renders them as silhouettes)" -ForegroundColor White
Write-Host "4. Save at the sizes shown above" -ForegroundColor White
Write-Host "`nAlternatively, use Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/icons-notification.html" -ForegroundColor Green
