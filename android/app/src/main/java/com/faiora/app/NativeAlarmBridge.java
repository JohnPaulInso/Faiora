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
}
