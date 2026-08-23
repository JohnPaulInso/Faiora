package com.faiora.app;

import android.app.Service;
import android.content.pm.ServiceInfo;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.ServiceCompat;

import java.util.Locale;

public class AlarmOverlayService extends Service {
    private static final long OVERLAY_AUTO_DISMISS_MS = 30_000L;

    private WindowManager windowManager;
    private View overlayView;
    private AlarmAlertPlayer alertPlayer;
    private String alarmId = "";
    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private final Runnable autoDismissRunnable = this::dismissOverlay;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!NativeAlarmScheduler.canDrawOverlays(this) || intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        alarmId = intent.getStringExtra(NativeAlarmScheduler.EXTRA_ALARM_ID);
        String label = intent.getStringExtra(NativeAlarmScheduler.EXTRA_LABEL);
        String time = intent.getStringExtra(NativeAlarmScheduler.EXTRA_TIME);
        boolean repeatDaily = intent.getBooleanExtra(NativeAlarmScheduler.EXTRA_REPEAT_DAILY, false);
        long triggerAtMillis = intent.getLongExtra(NativeAlarmScheduler.EXTRA_TRIGGER_AT, System.currentTimeMillis());

        NativeAlarmScheduler.AlarmRecord alarm = new NativeAlarmScheduler.AlarmRecord(
            alarmId,
            label,
            time,
            triggerAtMillis,
            repeatDaily
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                NativeAlarmScheduler.notificationIdFor(alarm.id),
                NativeAlarmScheduler.buildAlarmNotification(this, alarm, false).build(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            );
        } else {
            startForeground(
                NativeAlarmScheduler.notificationIdFor(alarm.id),
                NativeAlarmScheduler.buildAlarmNotification(this, alarm, false).build()
            );
        }
        showOverlay(alarm);

        if (alertPlayer == null) {
            alertPlayer = new AlarmAlertPlayer(this);
            alertPlayer.start();
        }
        timeoutHandler.removeCallbacks(autoDismissRunnable);
        timeoutHandler.postDelayed(autoDismissRunnable, OVERLAY_AUTO_DISMISS_MS);
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        timeoutHandler.removeCallbacks(autoDismissRunnable);
        if (windowManager != null && overlayView != null) {
            windowManager.removeView(overlayView);
            overlayView = null;
        }
        if (alertPlayer != null) {
            alertPlayer.stop();
            alertPlayer = null;
        }
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    private void showOverlay(NativeAlarmScheduler.AlarmRecord alarm) {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) return;

        if (overlayView != null) {
            updateOverlay(alarm);
            return;
        }

        overlayView = LayoutInflater.from(this).inflate(R.layout.view_alarm_surface, null);
        updateOverlay(alarm);

        AlarmSwipeRingView swipeRingView = overlayView.findViewById(R.id.alarmSwipeRing);
        swipeRingView.setOnCompleteListener(this::dismissOverlay);

        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN |
                WindowManager.LayoutParams.FLAG_FULLSCREEN |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;
        windowManager.addView(overlayView, params);
    }

    private void updateOverlay(NativeAlarmScheduler.AlarmRecord alarm) {
        if (overlayView == null) return;
        TextView statusView = overlayView.findViewById(R.id.alarmStatus);
        TextView title = overlayView.findViewById(R.id.alarmTitle);
        TextView timeMainView = overlayView.findViewById(R.id.alarmTimeMain);
        TextView timeSuffixView = overlayView.findViewById(R.id.alarmTimeSuffix);
        String[] timeParts = splitAlarmDisplayTime(alarm.time);
        statusView.setText("ALARM RINGING");
        title.setText(alarm.label == null || alarm.label.trim().isEmpty() ? "ALARM" : alarm.label.trim().toUpperCase(Locale.US));
        timeMainView.setText(timeParts[0]);
        timeSuffixView.setText(timeParts[1]);
    }

    private void dismissOverlay() {
        timeoutHandler.removeCallbacks(autoDismissRunnable);
        if (alertPlayer != null) {
            alertPlayer.stop();
        }
        NativeAlarmScheduler.dismissNotification(this, alarmId);
        stopSelf();
    }

    private String[] splitAlarmDisplayTime(String rawTime) {
        String display = NativeAlarmScheduler.formatAlarmDisplayTime(rawTime);
        if (display == null || display.trim().isEmpty()) {
            return new String[] { "12:00", "AM" };
        }
        String normalized = display.trim().toUpperCase(Locale.US);
        int lastSpace = normalized.lastIndexOf(' ');
        if (lastSpace > 0 && lastSpace < normalized.length() - 1) {
            return new String[] {
                normalized.substring(0, lastSpace).trim(),
                normalized.substring(lastSpace + 1).trim()
            };
        }
        return new String[] { normalized, "" };
    }
}
