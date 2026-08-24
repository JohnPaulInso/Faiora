# (2026-07-13) Clean and sync root web files to www folder for Capacitor Android build. Prev: stale files accumulated
$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "Cleaning www directory..." -ForegroundColor Cyan

# Clean stale www folder to ensure APK only bundles active files
if (Test-Path "$root\www") {
    Remove-Item -Path "$root\www" -Recurse -Force | Out-Null
}
New-Item -ItemType Directory -Path "$root\www" -Force | Out-Null

# Clean stale android public assets directory
if (Test-Path "$root\android\app\src\main\assets\public") {
    Remove-Item -Path "$root\android\app\src\main\assets\public" -Recurse -Force | Out-Null
}

Write-Host "Syncing active web assets from root to www..." -ForegroundColor Cyan

# List of active files to copy directly
$files = @(
    "index.html",
    "style.css",
    "manifest.json",
    "logo.png",
    "applogo.png",
    # (2026-07-13) Sync desktop & mobile fire spritesheets. Prev: single sheet
    "fire-wipe-spritesheet_desktop_tablet.png",
    "fire-wipe-spritesheet_mobile.png",
    "fire_bg_video_hd_desktop_tablet.mp4",
    "fire_bg_video_hd_mobile.mp4",
    "fire_transition_sfx.mp3",
    "alarm_ringtone.mp3",
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
    Copy-Item -Path "$root\assets" -Destination "$root\www\assets" -Recurse -Force
}

Write-Host "Asset clean synchronization complete." -ForegroundColor Green
