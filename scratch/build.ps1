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

# (2026-07-13) Patch TimedNotificationPublisher deduplication. Prev: old patch
$tnpPath = "$root\node_modules\@capacitor\local-notifications\android\src\main\java\com\capacitorjs\plugins\localnotifications\TimedNotificationPublisher.java"
if (Test-Path $tnpPath) {
    $tnpContent = Get-Content -Raw $tnpPath
    if (-not $tnpContent.Contains("faiora_completed_tasks")) {
        $replacement = @"
        JSObject notificationJson = storage.getSavedNotificationAsJSObject(Integer.toString(id));
        if (notificationJson == null) {
            return;
        }
        LocalNotificationsPlugin.fireReceived(notificationJson);
        int postNotificationId = id;
        JSObject extra = notificationJson.getJSObject("extra");
        if (extra != null) {
            String taskId = extra.getString("taskId");
            if (taskId != null && !taskId.isEmpty()) {
                android.content.SharedPreferences sp = context.getSharedPreferences("faiora_completed_tasks", android.content.Context.MODE_PRIVATE);
                if (sp != null && sp.getBoolean(taskId, false)) {
                    storage.deleteNotification(Integer.toString(id));
                    return;
                }
                int hash = ("faiora-task-" + taskId).hashCode();
                postNotificationId = Math.abs(hash != 0 ? hash : 1);
                try {
                    notificationManager.cancel(Math.abs(("faiora-sched-1h-" + taskId).hashCode()));
                    notificationManager.cancel(Math.abs(("faiora-sched-due-" + taskId).hashCode()));
                    notificationManager.cancel(Math.abs(("faiora-sched-24h-" + taskId).hashCode()));
                } catch (Exception e) {}
            }
        }
        notificationManager.notify(postNotificationId, notification);
"@
        $regex = '(?s)JSObject notificationJson = storage\.getSavedNotificationAsJSObject\(Integer\.toString\(id\)\);.*?notificationManager\.notify\([^;]+, notification\);'
        $tnpContent = [regex]::Replace($tnpContent, $regex, $replacement)
        Set-Content -Path $tnpPath -Value $tnpContent -NoNewline
    }
}

# (2026-07-13) Patch LocalNotificationManager broadcast actions. Prev: activity
$lnmPath = "$root\node_modules\@capacitor\local-notifications\android\src\main\java\com\capacitorjs\plugins\localnotifications\LocalNotificationManager.java"
if (Test-Path $lnmPath) {
    $lnmContent = Get-Content -Raw $lnmPath
    if (-not $lnmContent.Contains("TaskActionReceiver")) {
        $target = 'Intent actionIntent = buildIntent(localNotification, notificationAction.getId());' + [Environment]::NewLine + '                PendingIntent actionPendingIntent = PendingIntent.getActivity(' + [Environment]::NewLine + '                    context,' + [Environment]::NewLine + '                    localNotification.getId() + notificationAction.getId().hashCode(),' + [Environment]::NewLine + '                    actionIntent,' + [Environment]::NewLine + '                    flags' + [Environment]::NewLine + '                );'
        $rep = @'
                Intent actionIntent;
                PendingIntent actionPendingIntent;
                if ("FAIORA_TASK_ACTIONS".equals(actionTypeId)) {
                    actionIntent = new Intent("com.faiora.app.ACTION_TASK_NOTIFICATION");
                    actionIntent.setClassName(context.getPackageName(), "com.faiora.app.TaskActionReceiver");
                    actionIntent.putExtra("notificationId", localNotification.getId());
                    actionIntent.putExtra("actionId", notificationAction.getId());
                    actionIntent.putExtra("notification", localNotification.getSource());
                    int bFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        bFlags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    actionPendingIntent = PendingIntent.getBroadcast(
                        context,
                        localNotification.getId() + notificationAction.getId().hashCode(),
                        actionIntent,
                        bFlags
                    );
                } else {
                    actionIntent = buildIntent(localNotification, notificationAction.getId());
                    actionPendingIntent = PendingIntent.getActivity(
                        context,
                        localNotification.getId() + notificationAction.getId().hashCode(),
                        actionIntent,
                        flags
                    );
                }
'@
        $lnmContent = $lnmContent.Replace($target, $rep)
        Set-Content -Path $lnmPath -Value $lnmContent -NoNewline
    }
}

Write-Host "Asset clean synchronization complete." -ForegroundColor Green
