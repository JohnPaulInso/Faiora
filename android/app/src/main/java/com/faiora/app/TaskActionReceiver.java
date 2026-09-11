// (2026-07-13) Background receiver for task notification actions. Prev: none
package com.faiora.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import org.json.JSONArray;
import org.json.JSONObject;

public class TaskActionReceiver extends BroadcastReceiver {
    public static final String ACTION_TASK_NOTIFICATION = "com.faiora.app.ACTION_TASK_NOTIFICATION";
    public static final String PREFS_COMPLETED = "faiora_completed_tasks";
    public static final String PREFS_ACTIONS = "faiora_pending_task_actions";
    public static final String KEY_ACTIONS = "actions";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        try {
            int notificationId = intent.getIntExtra("notificationId", 0);
            String actionId = intent.getStringExtra("actionId");
            String taskId = intent.getStringExtra("taskId");

            if (taskId == null || taskId.isEmpty()) {
                String notificationJsonStr = intent.getStringExtra("notification");
                if (notificationJsonStr != null && !notificationJsonStr.isEmpty()) {
                    try {
                        JSObject json = new JSObject(notificationJsonStr);
                        JSObject extra = json.getJSObject("extra");
                        if (extra == null) extra = json.getJSObject("data");
                        if (extra != null) {
                            taskId = extra.getString("taskId");
                        }
                    } catch (Exception ignored) {}
                }
            }

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                if (notificationId != 0) {
                    nm.cancel(notificationId);
                }
                if (taskId != null && !taskId.isEmpty()) {
                    int hash = ("faiora-task-" + taskId).hashCode();
                    nm.cancel(Math.abs(hash != 0 ? hash : 1));
                    try {
                        nm.cancel(Math.abs(("faiora-sched-1h-" + taskId).hashCode()));
                        nm.cancel(Math.abs(("faiora-sched-due-" + taskId).hashCode()));
                        nm.cancel(Math.abs(("faiora-sched-24h-" + taskId).hashCode()));
                    } catch (Exception ignored) {}
                }
            }

            if (taskId != null && !taskId.isEmpty() && actionId != null) {
                if ("complete_task".equals(actionId)) {
                    SharedPreferences compSp = context.getSharedPreferences(PREFS_COMPLETED, Context.MODE_PRIVATE);
                    compSp.edit().putBoolean(taskId, true).apply();
                }

                SharedPreferences actSp = context.getSharedPreferences(PREFS_ACTIONS, Context.MODE_PRIVATE);
                String existing = actSp.getString(KEY_ACTIONS, "[]");
                JSONArray array;
                try {
                    array = new JSONArray(existing);
                } catch (Exception e) {
                    array = new JSONArray();
                }
                JSONObject item = new JSONObject();
                item.put("taskId", taskId);
                item.put("action", actionId);
                item.put("timestamp", System.currentTimeMillis());
                array.put(item);
                actSp.edit().putString(KEY_ACTIONS, array.toString()).apply();
            }
        } catch (Exception ignored) {}
    }
}
