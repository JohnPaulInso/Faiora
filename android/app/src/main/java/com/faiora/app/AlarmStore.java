package com.faiora.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

final class AlarmStore {
    private static final String PREFS = "faiora_native_alarm_store";
    private static final String KEY_ALARMS = "alarms";
    private static final String KEY_EVENTS = "events";

    private AlarmStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONObject readJsonObject(Context context, String key) {
        try {
            return new JSONObject(prefs(context).getString(key, "{}"));
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    private static JSONArray readJsonArray(Context context, String key) {
        try {
            return new JSONArray(prefs(context).getString(key, "[]"));
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    static void upsertAlarm(Context context, NativeAlarmScheduler.AlarmRecord alarm) {
        JSONObject alarms = readJsonObject(context, KEY_ALARMS);
        try {
            alarms.put(alarm.id, alarm.toJson());
            prefs(context).edit().putString(KEY_ALARMS, alarms.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static void removeAlarm(Context context, String alarmId) {
        JSONObject alarms = readJsonObject(context, KEY_ALARMS);
        alarms.remove(alarmId);
        prefs(context).edit().putString(KEY_ALARMS, alarms.toString()).apply();
    }

    static List<NativeAlarmScheduler.AlarmRecord> getScheduledAlarms(Context context) {
        JSONObject alarms = readJsonObject(context, KEY_ALARMS);
        List<NativeAlarmScheduler.AlarmRecord> records = new ArrayList<>();
        Iterator<String> keys = alarms.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            JSONObject value = alarms.optJSONObject(key);
            if (value == null) continue;
            NativeAlarmScheduler.AlarmRecord record = NativeAlarmScheduler.AlarmRecord.fromJson(value);
            if (record != null) {
                records.add(record);
            }
        }
        return records;
    }

    static void appendEvent(Context context, String type, String alarmId, String label, String time, boolean repeatDaily, long triggeredAt) {
        JSONArray events = readJsonArray(context, KEY_EVENTS);
        JSONObject event = new JSONObject();
        try {
            event.put("type", type);
            event.put("alarmId", alarmId);
            event.put("label", label == null ? "" : label);
            event.put("time", time == null ? "" : time);
            event.put("repeatDaily", repeatDaily);
            event.put("triggeredAt", triggeredAt);
            events.put(event);
            prefs(context).edit().putString(KEY_EVENTS, events.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static String consumeEvents(Context context) {
        SharedPreferences sharedPreferences = prefs(context);
        String events = sharedPreferences.getString(KEY_EVENTS, "[]");
        sharedPreferences.edit().remove(KEY_EVENTS).apply();
        return events == null ? "[]" : events;
    }
}
