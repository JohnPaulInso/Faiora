package com.faiora.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

final class NativeAlarmScheduler {
    static final String EXTRA_ALARM_ID = "alarmId";
    static final String EXTRA_LABEL = "label";
    static final String EXTRA_TIME = "time";
    static final String EXTRA_REPEAT_DAILY = "repeatDaily";
    static final String EXTRA_TRIGGER_AT = "triggerAt";
    static final String ACTION_OPEN_WEB_ALARM = "com.faiora.app.OPEN_WEB_ALARM";
    static final String ACTION_DISMISS_ALARM = "com.faiora.app.DISMISS_ALARM";
    static final String NATIVE_ALARM_CHANNEL_ID = "faiora_native_alarm_screen";
    private static final long ALARM_AUTO_STOP_MS = 30_000L;
    private static AlarmAlertPlayer activeAlarmPlayer;
    private static final Handler alarmHandler = new Handler(Looper.getMainLooper());
    private static final Runnable stopAlarmRunnable = NativeAlarmScheduler::stopAlarmPlayback;

    private NativeAlarmScheduler() {}

    static boolean scheduleAlarm(Context context, AlarmRecord alarm) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            return false;
        }

        PendingIntent receiverIntent = buildReceiverPendingIntent(context, alarm, PendingIntent.FLAG_UPDATE_CURRENT);
        AlarmStore.upsertAlarm(context, alarm);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.triggerAtMillis, receiverIntent);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, alarm.triggerAtMillis, receiverIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, alarm.triggerAtMillis, receiverIntent);
        }
        return true;
    }

    static void cancelAlarm(Context context, String alarmId) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            PendingIntent receiverIntent = buildReceiverPendingIntent(
                context,
                new AlarmRecord(alarmId, "Alarm", "07:00", System.currentTimeMillis(), false),
                PendingIntent.FLAG_NO_CREATE
            );
            if (receiverIntent != null) {
                alarmManager.cancel(receiverIntent);
                receiverIntent.cancel();
            }
        }
        AlarmStore.removeAlarm(context, alarmId);
        stopAlarmPlayback();
        dismissNotification(context, alarmId);
        stopOverlayService(context, alarmId);
    }

    static void rescheduleStoredAlarms(Context context) {
        List<AlarmRecord> alarms = AlarmStore.getScheduledAlarms(context);
        long now = System.currentTimeMillis();
        for (AlarmRecord alarm : alarms) {
            if (alarm.repeatDaily && alarm.triggerAtMillis <= now) {
                scheduleAlarm(context, alarm.withTriggerAtMillis(computeNextTriggerAtMillis(alarm.time)));
            } else if (!alarm.repeatDaily && alarm.triggerAtMillis <= now) {
                AlarmStore.removeAlarm(context, alarm.id);
            } else {
                scheduleAlarm(context, alarm);
            }
        }
    }

    static boolean canDrawOverlays(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context);
    }

    static void requestOverlayPermission(Activity activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + activity.getPackageName())
        );
        activity.startActivity(intent);
    }

    static void ensureAlarmChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        Uri soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.alarm_ringtone_mp3);

        NotificationChannel channel = new NotificationChannel(
            NATIVE_ALARM_CHANNEL_ID,
            "Faiora Alarm Screen",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Urgent full-screen alarms");
        channel.enableLights(true);
        channel.enableVibration(true);
        channel.setLightColor(Color.parseColor("#f97316"));
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        channel.setSound(soundUri, audioAttributes);
        manager.createNotificationChannel(channel);
    }

    static NotificationCompat.Builder buildAlarmNotification(Context context, AlarmRecord alarm, boolean includeFullScreenIntent) {
        ensureAlarmChannel(context);
        PendingIntent contentIntent = buildAlarmActivityPendingIntent(context, alarm);
        // (2026-07-13) Use ic_stat_faiora drawable for notification. Prev: mipmap
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NATIVE_ALARM_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_faiora)
            .setColor(Color.parseColor("#f97316"))
            .setContentTitle(alarm.label == null || alarm.label.trim().isEmpty() ? "Alarm Ringing" : alarm.label)
            .setContentText(formatAlarmDisplayTime(alarm.time))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(contentIntent)
            .setAutoCancel(false)
            .setOngoing(true)
            .setOnlyAlertOnce(false)
            .setSilent(true)
            .setSound(null)
            .setVibrate(null);

        if (includeFullScreenIntent) {
            builder.setFullScreenIntent(contentIntent, true);
        }
        return builder;
    }

    static void showAlarmNotification(Context context, AlarmRecord alarm, boolean includeFullScreenIntent) {
        NotificationManagerCompat.from(context).notify(
            notificationIdFor(alarm.id),
            buildAlarmNotification(context, alarm, includeFullScreenIntent).build()
        );
    }

    static void dismissNotification(Context context, String alarmId) {
        NotificationManagerCompat.from(context).cancel(notificationIdFor(alarmId));
    }

    static synchronized void startAlarmPlayback(Context context) {
        stopAlarmPlayback();
        activeAlarmPlayer = new AlarmAlertPlayer(context.getApplicationContext());
        activeAlarmPlayer.start();
        alarmHandler.removeCallbacks(stopAlarmRunnable);
        alarmHandler.postDelayed(stopAlarmRunnable, ALARM_AUTO_STOP_MS);
    }

    static synchronized void stopAlarmPlayback() {
        alarmHandler.removeCallbacks(stopAlarmRunnable);
        if (activeAlarmPlayer != null) {
            activeAlarmPlayer.stop();
            activeAlarmPlayer = null;
        }
    }

    static void startOverlayService(Context context, AlarmRecord alarm) {
        Intent intent = new Intent(context, AlarmOverlayService.class);
        intent.putExtra(EXTRA_ALARM_ID, alarm.id);
        intent.putExtra(EXTRA_LABEL, alarm.label);
        intent.putExtra(EXTRA_TIME, alarm.time);
        intent.putExtra(EXTRA_REPEAT_DAILY, alarm.repeatDaily);
        intent.putExtra(EXTRA_TRIGGER_AT, alarm.triggerAtMillis);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(context, intent);
        } else {
            context.startService(intent);
        }
    }

    static void stopOverlayService(Context context, String alarmId) {
        Intent intent = new Intent(context, AlarmOverlayService.class);
        intent.putExtra(EXTRA_ALARM_ID, alarmId);
        context.stopService(intent);
    }

    static int notificationIdFor(String alarmId) {
        return Math.max(1, Math.abs((alarmId == null ? "faiora-alarm" : alarmId).hashCode()));
    }

    static long computeNextTriggerAtMillis(String time) {
        Calendar calendar = Calendar.getInstance();
        String[] parts = (time == null ? "07:00" : time).split(":");
        int hours = 7;
        int minutes = 0;
        try {
            if (parts.length > 0) hours = Integer.parseInt(parts[0]);
            if (parts.length > 1) minutes = Integer.parseInt(parts[1]);
        } catch (NumberFormatException ignored) {
        }
        calendar.setTimeInMillis(System.currentTimeMillis());
        calendar.set(Calendar.HOUR_OF_DAY, hours);
        calendar.set(Calendar.MINUTE, minutes);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1);
        }
        return calendar.getTimeInMillis();
    }

    private static PendingIntent buildReceiverPendingIntent(Context context, AlarmRecord alarm, int extraFlags) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra(EXTRA_ALARM_ID, alarm.id);
        intent.putExtra(EXTRA_LABEL, alarm.label);
        intent.putExtra(EXTRA_TIME, alarm.time);
        intent.putExtra(EXTRA_REPEAT_DAILY, alarm.repeatDaily);
        intent.putExtra(EXTRA_TRIGGER_AT, alarm.triggerAtMillis);
        int flags = PendingIntent.FLAG_IMMUTABLE | extraFlags;
        return PendingIntent.getBroadcast(context, notificationIdFor(alarm.id), intent, flags);
    }

    static void launchAlarmUi(Context context, AlarmRecord alarm) {
        if (canDrawOverlays(context)) {
            startOverlayService(context, alarm);
            return;
        }
        launchAlarmRingActivity(context, alarm);
    }

    static void launchMainActivityForAlarm(Context context, AlarmRecord alarm) {
        try {
            Intent intent = buildMainActivityIntent(context, alarm);
            context.startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    static void launchAlarmRingActivity(Context context, AlarmRecord alarm) {
        try {
            Intent intent = buildRingActivityIntent(context, alarm);
            context.startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    private static Intent buildMainActivityIntent(Context context, AlarmRecord alarm) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(ACTION_OPEN_WEB_ALARM);
        intent.putExtra(EXTRA_ALARM_ID, alarm.id);
        intent.putExtra(EXTRA_LABEL, alarm.label);
        intent.putExtra(EXTRA_TIME, alarm.time);
        intent.putExtra(EXTRA_REPEAT_DAILY, alarm.repeatDaily);
        intent.putExtra(EXTRA_TRIGGER_AT, alarm.triggerAtMillis);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return intent;
    }

    private static Intent buildRingActivityIntent(Context context, AlarmRecord alarm) {
        Intent intent = new Intent(context, AlarmRingActivity.class);
        intent.putExtra(EXTRA_ALARM_ID, alarm.id);
        intent.putExtra(EXTRA_LABEL, alarm.label);
        intent.putExtra(EXTRA_TIME, alarm.time);
        intent.putExtra(EXTRA_REPEAT_DAILY, alarm.repeatDaily);
        intent.putExtra(EXTRA_TRIGGER_AT, alarm.triggerAtMillis);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return intent;
    }

    private static PendingIntent buildAlarmActivityPendingIntent(Context context, AlarmRecord alarm) {
        Intent intent = buildRingActivityIntent(context, alarm);
        return PendingIntent.getActivity(
            context,
            notificationIdFor(alarm.id),
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    static String formatAlarmDisplayTime(String time) {
        try {
            String[] parts = (time == null ? "07:00" : time).split(":");
            int hours = Integer.parseInt(parts[0]);
            int minutes = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            String suffix = hours >= 12 ? "PM" : "AM";
            int displayHours = hours % 12;
            if (displayHours == 0) displayHours = 12;
            return String.format("%02d:%02d %s", displayHours, minutes, suffix);
        } catch (Exception ignored) {
            return time == null ? "07:00" : time;
        }
    }

    static String formatAlarmDisplayDate(long triggerAtMillis) {
        long safeTime = triggerAtMillis > 0 ? triggerAtMillis : System.currentTimeMillis();
        return new SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(safeTime);
    }

    static final class AlarmRecord {
        final String id;
        final String label;
        final String time;
        final long triggerAtMillis;
        final boolean repeatDaily;

        AlarmRecord(String id, String label, String time, long triggerAtMillis, boolean repeatDaily) {
            this.id = id;
            this.label = label == null ? "Alarm" : label;
            this.time = time == null ? "07:00" : time;
            this.triggerAtMillis = triggerAtMillis;
            this.repeatDaily = repeatDaily;
        }

        AlarmRecord withTriggerAtMillis(long nextTriggerAtMillis) {
            return new AlarmRecord(id, label, time, nextTriggerAtMillis, repeatDaily);
        }

        JSONObject toJson() {
            JSONObject json = new JSONObject();
            try {
                json.put("id", id);
                json.put("label", label);
                json.put("time", time);
                json.put("triggerAtMillis", triggerAtMillis);
                json.put("repeatDaily", repeatDaily);
            } catch (Exception ignored) {
            }
            return json;
        }

        static AlarmRecord fromJson(JSONObject json) {
            if (json == null) return null;
            String id = json.optString("id", "");
            if (id.isEmpty()) return null;
            return new AlarmRecord(
                id,
                json.optString("label", "Alarm"),
                json.optString("time", "07:00"),
                json.optLong("triggerAtMillis", System.currentTimeMillis()),
                json.optBoolean("repeatDaily", false)
            );
        }
    }
}
