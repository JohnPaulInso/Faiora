package com.faiora.app;

import android.webkit.JavascriptInterface;

final class NativeAlarmBridge {
    private final MainActivity activity;

    NativeAlarmBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public boolean scheduleAlarm(String alarmId, String label, String time, long triggerAtMillis, boolean repeatDaily) {
        return NativeAlarmScheduler.scheduleAlarm(
            activity.getApplicationContext(),
            new NativeAlarmScheduler.AlarmRecord(alarmId, label, time, triggerAtMillis, repeatDaily)
        );
    }

    @JavascriptInterface
    public void cancelAlarm(String alarmId) {
        NativeAlarmScheduler.cancelAlarm(activity.getApplicationContext(), alarmId);
    }

    @JavascriptInterface
    public boolean hasOverlayPermission() {
        return NativeAlarmScheduler.canDrawOverlays(activity.getApplicationContext());
    }

    @JavascriptInterface
    public void requestOverlayPermission() {
        activity.runOnUiThread(() -> NativeAlarmScheduler.requestOverlayPermission(activity));
    }

    @JavascriptInterface
    public String consumeEvents() {
        return AlarmStore.consumeEvents(activity.getApplicationContext());
    }

    @JavascriptInterface
    public void dismissActiveAlarm() {
        NativeAlarmScheduler.stopAlarmPlayback();
    }

    @JavascriptInterface
    public void startActiveAlarm() {
        NativeAlarmScheduler.startAlarmPlayback(activity.getApplicationContext());
    }

    // (2026-07-13) Mark task status in native SharedPreferences. Prev: none
    @JavascriptInterface
    public void markTaskCompleted(String taskId, boolean completed) {
        if (taskId == null || taskId.isEmpty()) return;
        android.content.SharedPreferences sp = activity.getApplicationContext().getSharedPreferences("faiora_completed_tasks", android.content.Context.MODE_PRIVATE);
        if (completed) {
            sp.edit().putBoolean(taskId, true).apply();
        }
    }

    // (2026-07-13) Expose background task actions to WebView. Prev: none
    @JavascriptInterface
    public String consumeTaskActions() {
        android.content.SharedPreferences sp = activity.getApplicationContext().getSharedPreferences("faiora_pending_task_actions", android.content.Context.MODE_PRIVATE);
        String actions = sp.getString("actions", "[]");
        sp.edit().remove("actions").apply();
        return actions == null ? "[]" : actions;
    }
}

