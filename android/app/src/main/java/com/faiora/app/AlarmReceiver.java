package com.faiora.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String alarmId = intent.getStringExtra(NativeAlarmScheduler.EXTRA_ALARM_ID);
        if (alarmId == null || alarmId.trim().isEmpty()) return;

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

        AlarmStore.appendEvent(context, "triggered", alarmId, label, time, repeatDaily, System.currentTimeMillis());
        if (repeatDaily) {
            NativeAlarmScheduler.scheduleAlarm(
                context,
                alarm.withTriggerAtMillis(NativeAlarmScheduler.computeNextTriggerAtMillis(alarm.time))
            );
        } else {
            AlarmStore.removeAlarm(context, alarmId);
        }

        // (2026-07-13) Show notification immediately with sound. Prev: async in service
        NativeAlarmScheduler.showAlarmNotification(context, alarm, true);
        NativeAlarmScheduler.launchAlarmUi(context, alarm);
    }
}
