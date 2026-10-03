# Replace all Android app icons with applogo.png
$rootLogo = "applogo.png"

# Check if source file exists
if (-not (Test-Path $rootLogo)) {
    Write-Error "applogo.png not found in root!"
    exit 1
}

Write-Host "Copying applogo.png to all Android icon files..."

# Copy to drawable
Copy-Item $rootLogo "android/app/src/main/res/drawable/applogo.png" -Force

# Replace all mipmap ic_launcher*.png files
$densities = @("ldpi", "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")

foreach ($density in $densities) {
    $mipmapDir = "android/app/src/main/res/mipmap-$density"
    
    # Replace ic_launcher.png
    Copy-Item $rootLogo "$mipmapDir/ic_launcher.png" -Force
    Write-Host "  Replaced $mipmapDir/ic_launcher.png"
    
    # Replace ic_launcher_round.png
    Copy-Item $rootLogo "$mipmapDir/ic_launcher_round.png" -Force
    Write-Host "  Replaced $mipmapDir/ic_launcher_round.png"
}

Write-Host "`nDone! All Android icons replaced with applogo.png"
Write-Host "Now rebuild the APK: cd android && ./gradlew assembleDebug"
