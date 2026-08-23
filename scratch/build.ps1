# (2026-07-13) Sync root web files to www folder for Capacitor Android build. Prev: missing build script
$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "Syncing web assets from root ($root) to www..." -ForegroundColor Cyan

# Ensure www directory exists
if (-not (Test-Path "$root\www")) {
    New-Item -ItemType Directory -Path "$root\www" -Force | Out-Null
}

# List of files to copy directly
$files = @(
    "index.html",
    "style.css",
    "manifest.json",
    "logo.png",
    "applogo.png",
    "fire-wipe-spritesheet.png",
    "fire_bg_video.mp4",
    "fire_bg_video_hd.mp4",
    "fire_transition_sfx.mp3",
    "alarm_ringtone.mp3",
    "alarm_ringtone.ogg",
    "tailwind.cdn.js",
    "sw.js",
    "admin.html",
    "terms.html",
    "privacy.html",
    "share_note.html"
)

foreach ($f in $files) {
    if (Test-Path "$root\$f") {
        Copy-Item -Path "$root\$f" -Destination "$root\www\$f" -Force
    }
}

# Copy assets folder if present
if (Test-Path "$root\assets") {
    Copy-Item -Path "$root\assets" -Destination "$root\www" -Recurse -Force
}

Write-Host "Asset synchronization complete." -ForegroundColor Green
