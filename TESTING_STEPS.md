# Step-by-Step Testing Guide for Implemented Features

This guide provides exact steps to test and verify all 8 features and fixes implemented in Faiora.

---

## 1. Speech-to-Text Google Microphone in Quick Tasks

### Steps:
1. In Faiora, click the `+` button or the Quick Task input box to open the Quick Task creation modal (`QuickTaskModal`).
2. Look at the bottom-right of the textarea. You will see the microphone button (`mic`).
3. Click or tap the microphone button.
   - The button pulses with an orange fire glow indicating active listening.
   - A toast will show: `"Listening... Speak now"`.
4. Speak clearly into your microphone (e.g., *"Finish project documentation by Friday"*).
5. Watch the transcribed text appear live inside the textarea.
6. Tap the microphone button again (or pause speaking) to stop listening.

---

## 2. Multi-Select Batch Deadline Modifier

### Steps:
1. Go to the **Dashboard** or **Quick Tasks** page.
2. Long-press or click the select icon on any task to enter **Selection Mode**.
3. Select two or more tasks by clicking their checkboxes.
4. Observe the floating toolbar at the bottom: next to the label and delete buttons, you will see the new calendar button (`calendar_today`).
5. Click the calendar button to open the **Batch Deadline Modal**.
6. You can choose a quick preset (e.g. **Today**, **Tomorrow**, **Next Week**, or **Clear**) or pick custom Date & Time inputs.
7. Click **Apply Deadline**.
8. Verify that all selected tasks immediately update to the chosen deadline, selection mode exits, and an undo toast appears.

---

## 3. Offline Mode & Auto-Sync on Reconnect

### Steps:
1. Make sure you are logged in and have some notes/tasks.
2. Disconnect your device from the internet (turn off Wi-Fi and mobile data / Airplane mode).
3. Completely close and reopen Faiora (cold boot).
4. Verify:
   - The app boots immediately from local files without a white screen or network error.
   - An amber pill at the top says: `"Offline Mode — Changes will sync when online"`.
   - All your cached notes and tasks are visible.
5. Create a new quick task or edit a note while still offline.
6. Re-enable Wi-Fi / mobile data.
7. Within moments of reconnecting:
   - The offline pill disappears.
   - A toast appears: `"Back online — all changes synced!"`.
   - Check Firebase console or reload to verify the offline changes are saved in Firestore.

---

## 4. Completed Tasks Notification Elimination

### Steps:
1. Create a task with a deadline in 2 minutes.
2. Mark the task as completed by clicking its checkmark before or right as the notification arrives.
3. Check your notification tray:
   - Notice that any existing notification for that task is removed from the tray immediately.
   - No further reminders or alarms trigger for this task.

---

## 5. Pull-Down Quick Actions (✓ Complete & +1 Hour)

### Steps:
1. Create a task with a due date set for a few minutes ahead, or trigger a local reminder.
2. When the notification arrives on Android or web push, swipe down / expand the notification.
3. Observe the two action buttons:
   - `✓ Complete`
   - `+1 Hour`
4. Tap `✓ Complete`:
   - The notification dismisses, and the task is marked 100% completed inside the app without having to manually open it.
5. Alternatively, create another task and tap `+1 Hour`:
   - The task's deadline advances by 1 hour (from the current deadline, or 1 hour from now if overdue).
   - The notification is dismissed and rescheduled.

---

## 6. Overwrite & Deduplicate Multi-Stage Notifications

### Steps:
1. Set a task with a due date.
2. When the stage notification triggers (or when testing 24h, 1h, and Due Now transitions):
3. Notice that instead of piling up multiple separate notifications for the same task in your Android notification shade, the newer notification cleanly replaces and updates the previous notification row.

---

## 7. Faster Skeleton Loader (0.5s Shorter)

### Steps:
1. Completely close the app process.
2. Open Faiora.
3. Notice the cold-boot splash / skeleton transition: the delay has been reduced by 500ms (0.5s faster), transitioning swiftly into your dashboard.

---

## 8. PAST DUE and YESTERDAY Top Placement in Notepad View

### Steps:
1. Ensure you have at least one overdue task (due yesterday or earlier) and one task due today.
2. Navigate to the **Quick Tasks** page (`#/quick-tasks`).
3. In the view toggle toolbar, switch to **Notepad** view mode (the notepad icon).
4. Observe the section ordering from top to bottom:
   - **PAST DUE** (if any overdue tasks exist)
   - **YESTERDAY** (if any tasks were due yesterday)
   - **TODAY**
   - Tomorrow & Upcoming days
   - Finished
5. Notice that `PAST DUE` and `YESTERDAY` are at the top, directly above `TODAY`.
