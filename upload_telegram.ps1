# Telegram APK Uploader
# Upload the most recent APK to your private Telegram channel

param()
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot

Write-Host "`n============================================" -ForegroundColor DarkGray
Write-Host " Telegram APK Uploader" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor DarkGray

# === CONFIGURATION ===
# Get credentials from environment variables or config file
$configPath = "$root\.telegram_config"
$BOT_TOKEN = $env:TELEGRAM_BOT_TOKEN
$CHAT_ID = $env:TELEGRAM_CHAT_ID

# If env vars not set, try to read from config file
if (-not $BOT_TOKEN -or -not $CHAT_ID) {
    if (Test-Path $configPath) {
        Write-Host "`nReading config from .telegram_config..." -ForegroundColor Cyan
        $config = Get-Content $configPath | ConvertFrom-Json
        $BOT_TOKEN = $config.bot_token
        $CHAT_ID = $config.chat_id
    }
}

# If still not set, prompt user to create config
if (-not $BOT_TOKEN -or -not $CHAT_ID) {
    Write-Host "`nTelegram credentials not found!" -ForegroundColor Red
    Write-Host "Please set up your Telegram bot credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Environment Variables:" -ForegroundColor Cyan
    Write-Host "  `$env:TELEGRAM_BOT_TOKEN = 'your_bot_token_here'"
    Write-Host "  `$env:TELEGRAM_CHAT_ID = 'your_chat_id_here'"
    Write-Host ""
    Write-Host "Option 2 - Create .telegram_config file:" -ForegroundColor Cyan
    Write-Host "  {" 
    Write-Host "    `"bot_token`": `"your_bot_token_here`","
    Write-Host "    `"chat_id`": `"your_chat_id_here`""
    Write-Host "  }"
    Write-Host ""
    Write-Host "How to get credentials:" -ForegroundColor Yellow
    Write-Host "  1. Create a bot via @BotFather on Telegram"
    Write-Host "  2. Get your channel ID (use @userinfobot or forward a message)"
    Write-Host "  3. Add your bot as admin to your private channel"
    Write-Host ""
    exit 1
}

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

# === UPLOAD TO TELEGRAM ===
Write-Host "`nUploading to Telegram..." -ForegroundColor Cyan

$apiUrl = "https://api.telegram.org/bot$BOT_TOKEN/sendDocument"

# Use curl for better handling of large files
$curlArgs = @(
    "-X", "POST",
    "-F", "chat_id=$CHAT_ID",
    "-F", "caption=Faiora APK - $apkDate",
    "-F", "document=@`"$apkPath`"",
    $apiUrl
)

try {
    $result = & curl.exe @curlArgs 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "`n============================================" -ForegroundColor DarkGray
        Write-Host " UPLOAD SUCCESSFUL" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor DarkGray
        Write-Host "APK uploaded to your Telegram channel!" -ForegroundColor Green
    } else {
        Write-Host "Upload failed!" -ForegroundColor Red
        Write-Host $result
        Write-Host "`nOpening APK folder for manual upload..." -ForegroundColor Yellow
        Start-Process explorer.exe -ArgumentList $apkDir
        exit 1
    }
} catch {
    Write-Host "`nUpload failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nOpening APK folder for manual upload..." -ForegroundColor Yellow
    Start-Process explorer.exe -ArgumentList $apkDir
    exit 1
}
