# Quick Telegram Send - Opens Telegram Desktop with file ready to send
param()
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot

Write-Host "`n============================================" -ForegroundColor DarkGray
Write-Host " Quick Telegram Send" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor DarkGray

# === FIND APK ===
Write-Host "`nSearching for APK files..." -ForegroundColor Cyan
$apkDir = "$root\android\app\build\outputs\apk\debug"

if (-not (Test-Path $apkDir)) {
    Write-Host "APK directory not found: $apkDir" -ForegroundColor Red
    Write-Host "Please build the APK first using: .\a.ps1" -ForegroundColor Yellow
    exit 1
}

# Find the most recent APK file
$apkFile = Get-ChildItem -Path $apkDir -Filter "*.apk" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

if (-not $apkFile) {
    Write-Host "No APK files found in: $apkDir" -ForegroundColor Red
    Write-Host "Please build the APK first using: .\a.ps1" -ForegroundColor Yellow
    exit 1
}

$apkPath = $apkFile.FullName
$apkSize = [math]::Round($apkFile.Length / 1MB, 2)
$apkDate = $apkFile.LastWriteTime.ToString("MMM dd, yyyy - hh:mmtt")

Write-Host "Found APK: $($apkFile.Name)" -ForegroundColor Green
Write-Host "  Size: ${apkSize} MB" -ForegroundColor Gray
Write-Host "  Modified: $apkDate" -ForegroundColor Gray

# === OPEN IN TELEGRAM ===
Write-Host "`nOpening Telegram Desktop..." -ForegroundColor Cyan

# Channel ID from config
$configPath = "$root\.telegram_config"
$CHAT_ID = $env:TELEGRAM_CHAT_ID

if (-not $CHAT_ID) {
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $CHAT_ID = $config.chat_id
    }
}

if ($CHAT_ID) {
    # Remove the -100 prefix and @ symbol if present
    $channelId = $CHAT_ID -replace '^-100', '' -replace '^@', ''
    
    # Try opening Telegram Desktop with the channel
    Write-Host "Opening channel in Telegram..." -ForegroundColor Cyan
    try {
        Start-Process "tg://resolve?domain=$channelId"
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "Note: Telegram Desktop may not be installed or tg:// protocol not registered" -ForegroundColor Yellow
    }
}

# Copy file path to clipboard for easy pasting
Write-Host "`nFile path copied to clipboard!" -ForegroundColor Green
Write-Host "You can paste (Ctrl+V) in Telegram to send the file." -ForegroundColor Yellow
Set-Clipboard -Value $apkPath

# Also open the folder
Write-Host "`nOpening APK folder..." -ForegroundColor Cyan
Start-Process explorer.exe -ArgumentList "/select,`"$apkPath`""

Write-Host "`n============================================" -ForegroundColor DarkGray
Write-Host " Ready to Send!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host "Options:" -ForegroundColor Yellow
Write-Host "  1. Paste (Ctrl+V) in Telegram - file path is in clipboard" -ForegroundColor Gray
Write-Host "  2. Drag and drop the selected file to Telegram" -ForegroundColor Gray
Write-Host ""
