# (2026-07-13) Allow native stderr without false abort. Prev: Stop
param()
$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$root = $PSScriptRoot

Write-Host "============================================" -ForegroundColor DarkGray
Write-Host " Faiora APK Builder" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor DarkGray

Write-Host "`n[1/3] Building web assets..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: npm run build" -ForegroundColor Red; exit 1 }

Write-Host "`n[2/3] Syncing Android project (cap sync)..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: cap sync android" -ForegroundColor Red; exit 1 }

Write-Host "`n[3/3] Assembling Debug APK (clean + assemble)..." -ForegroundColor Cyan
Set-Location "$root\android"
# (2026-07-13) Clean gradle assemble to ensure stale assets are deleted. Prev: assembleDebug only
.\gradlew.bat clean assembleDebug
$gradleExit = $LASTEXITCODE
Set-Location $root
if ($gradleExit -ne 0) { Write-Host "FAILED: Gradle assembleDebug (exit $gradleExit)" -ForegroundColor Red; exit 1 }

Write-Host "`n============================================" -ForegroundColor DarkGray
Write-Host " BUILD COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor DarkGray

$apkPath = "$root\android\app\build\outputs\apk\debug\com.faiora.app.apk"
if (Test-Path $apkPath) {
    Write-Host " APK: $apkPath" -ForegroundColor Green
    Start-Process explorer.exe -ArgumentList "/select,`"$apkPath`""
} else {
    Write-Host " APK not found at expected path, opening output dir..." -ForegroundColor Yellow
    Start-Process explorer.exe -ArgumentList "$root\android\app\build\outputs\apk\debug"
}

