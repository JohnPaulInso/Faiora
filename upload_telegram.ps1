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
$apkDate = $apkFile.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "Found APK: $($apkFile.Name)" -ForegroundColor Green
Write-Host "  Size: ${apkSize} MB" -ForegroundColor Gray
Write-Host "  Modified: $apkDate" -ForegroundColor Gray

# === UPLOAD TO TELEGRAM ===
Write-Host "`nUploading to Telegram..." -ForegroundColor Cyan

$apiUrl = "https://api.telegram.org/bot$BOT_TOKEN/sendDocument"

# Create caption with build info
$caption = "🚀 Faiora APK Build`n📅 $apkDate`n📦 ${apkSize} MB"

# Prepare multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"chat_id`"$LF",
    $CHAT_ID,
    "--$boundary",
    "Content-Disposition: form-data; name=`"caption`"$LF",
    $caption,
    "--$boundary",
    "Content-Disposition: form-data; name=`"document`"; filename=`"$($apkFile.Name)`"",
    "Content-Type: application/vnd.android.package-archive$LF"
) -join $LF

$fileBytes = [System.IO.File]::ReadAllBytes($apkPath)

$bodyLinesBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyLines)
$boundaryBytes = [System.Text.Encoding]::UTF8.GetBytes("$LF--$boundary--$LF")

# Combine all parts
$requestBody = New-Object System.Collections.Generic.List[byte]
$requestBody.AddRange($bodyLinesBytes)
$requestBody.AddRange($fileBytes)
$requestBody.AddRange($boundaryBytes)

try {
    $response = Invoke-WebRequest -Uri $apiUrl `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $requestBody.ToArray() `
        -TimeoutSec 300

    if ($response.StatusCode -eq 200) {
        Write-Host "`n============================================" -ForegroundColor DarkGray
        Write-Host " UPLOAD SUCCESSFUL ✓" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor DarkGray
        Write-Host "APK uploaded to your Telegram channel!" -ForegroundColor Green
    } else {
        Write-Host "Upload failed with status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
        exit 1
    }
} catch {
    Write-Host "`nUpload failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}
