# (2026-07-13) Open APK output in Explorer on complete. Prev: no open
param()
Write-Host "[1/3] Building assets..." -ForegroundColor Cyan
npm run build
Write-Host "[2/3] Syncing Android project..." -ForegroundColor Cyan
npx cap sync android
Write-Host "[3/3] Assembling Debug APK..." -ForegroundColor Cyan
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..
$apkPath = "$PSScriptRoot\android\app\build\outputs\apk\debug\com.faiora.app.apk"
if (Test-Path $apkPath) {
    Start-Process explorer.exe -ArgumentList "/select,`"$apkPath`""
} else {
    Start-Process explorer.exe -ArgumentList "$PSScriptRoot\android\app\build\outputs\apk\debug"
}
Write-Host "Build complete." -ForegroundColor Green

