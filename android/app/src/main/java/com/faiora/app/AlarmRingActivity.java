package com.faiora.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import java.util.Locale;

public class AlarmRingActivity extends AppCompatActivity {
    private static final long OVERLAY_AUTO_DISMISS_MS = 30_000L;

    private AlarmAlertPlayer alertPlayer;
    private String alarmId = "";
    private final Handler timeoutHandler = new Handler(Looper.getMainLooper());
    private final Runnable autoDismissRunnable = this::dismissAlarm;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWindow();
        setContentView(R.layout.view_alarm_surface);

        stopService(new Intent(this, AlarmOverlayService.class));

        alarmId = getIntent().getStringExtra(NativeAlarmScheduler.EXTRA_ALARM_ID);
        String label = getIntent().getStringExtra(NativeAlarmScheduler.EXTRA_LABEL);
        String time = getIntent().getStringExtra(NativeAlarmScheduler.EXTRA_TIME);
        long triggerAtMillis = getIntent().getLongExtra(NativeAlarmScheduler.EXTRA_TRIGGER_AT, System.currentTimeMillis());

        TextView statusView = findViewById(R.id.alarmStatus);
        TextView title = findViewById(R.id.alarmTitle);
        TextView timeMainView = findViewById(R.id.alarmTimeMain);
        TextView timeSuffixView = findViewById(R.id.alarmTimeSuffix);
        AlarmSwipeRingView swipeRingView = findViewById(R.id.alarmSwipeRing);

        String[] timeParts = splitAlarmDisplayTime(time);
        statusView.setText("ALARM RINGING");
        title.setText(label == null || label.trim().isEmpty() ? "ALARM" : label.trim().toUpperCase(Locale.US));
        timeMainView.setText(timeParts[0]);
        timeSuffixView.setText(timeParts[1]);
        swipeRingView.setOnCompleteListener(this::dismissAlarm);

        alertPlayer = new AlarmAlertPlayer(this);
        alertPlayer.start();
        timeoutHandler.removeCallbacks(autoDismissRunnable);
        timeoutHandler.postDelayed(autoDismissRunnable, OVERLAY_AUTO_DISMISS_MS);
    }

    @Override
    protected void onDestroy() {
        timeoutHandler.removeCallbacks(autoDismissRunnable);
        if (alertPlayer != null) {
            alertPlayer.stop();
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        dismissAlarm();
    }

    private void dismissAlarm() {
        timeoutHandler.removeCallbacks(autoDismissRunnable);
        if (alertPlayer != null) {
            alertPlayer.stop();
        }
        NativeAlarmScheduler.dismissNotification(this, alarmId);
        NativeAlarmScheduler.stopOverlayService(this, alarmId);
        finishAndRemoveTask();
    }

    private void configureWindow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        );
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
