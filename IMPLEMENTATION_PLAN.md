# Comprehensive Feature & Bug Fix Implementation Plan

This plan outlines the architecture, design, and execution strategy for the requested features and fixes across Faiora.

---

## Architecture Decisions

> [!IMPORTANT]
> **Offline Mode Architecture (Item 3)**: Core libraries (`react`, `react-dom`, `history`, `react-router`, `babel`, `firebase`) were previously loaded remotely via CDN `<script>` tags from `unpkg.com` and `gstatic.com`. To allow the Android APK and web app to open completely offline on cold start without an internet connection, all core vendor scripts are localized in `assets/vendor/` and copied to `www/` during build.

> [!NOTE]
> **Push Notifications Action Buttons (Item 5)**: Native notification action buttons (`Complete` and `+1 Hour`) are registered in `@capacitor/local-notifications` and Service Worker (`sw.js`). Users can pull down or expand the notification directly in the Android shade to perform these actions without opening the app.

---

## Implemented Features & Technical Details

---

### 1. Speech-to-Text "Google Microphone" for Quick Tasks

#### Problem & Scope
When creating or editing a quick task, manual typing was required. A microphone button was needed to enable voice dictation using speech-to-text.

#### Solution
- **UI Element**: Google-styled microphone button inside the quick task text input in `QuickTaskModal`.
  - Includes active listening indicator (pulsing glow and listening animation).
- **Speech Recognition Engine**:
  - Implemented Web Speech API (`window.webkitSpeechRecognition` or `window.SpeechRecognition`).
  - Supports continuous speech streaming directly into the textarea.
  - Tapping while recording stops listening; silence automatically finalizes.
  - Handled permission errors with fallback toast warnings.

#### Files Modified
- `index.html` (`QuickTaskModal` component).

---

### 2. Batch Deadline Modifier in Task Selection Mode

#### Problem & Scope
In multi-select mode (`DashboardPage` and `QuickTasksPage`), the floating selection toolbar only allowed deleting or assigning categories to selected tasks. The ability to batch-change deadlines was missing.

#### Solution
- **UI Button**: Added a "Change Deadline" icon button (`calendar_today`) to the selection floating action bar in both `DashboardPage` and `QuickTasksPage`.
- **Deadline Selection Modal (`BatchDeadlineModal`)**:
  - Modal with custom date and time inputs.
  - Quick preset buttons: "Today", "Tomorrow", "Next Week", "Clear Deadline".
  - On confirm:
    - Iterates over all selected task IDs.
    - Updates `dueDate`, `dueTime`, and `dueTimestamp` on each selected task.
    - Triggers notification rescheduling via `FaioraNotifications.rescheduleAll`.
    - Saves changes to `localStorage` and commits to Firestore.
    - Displays confirmation toast with `UNDO` support.
    - Clears selection and exits selection mode.

#### Files Modified
- `index.html` (`BatchDeadlineModal`, `DashboardPage`, `QuickTasksPage`).

---

### 3. Offline Mode & Auto-Sync on Reconnect

#### Problem & Scope
The app could not open offline because remote CDN scripts failed to resolve, and auth/probing blocked offline usage.

#### Root Causes Resolved
1. **Remote CDN Dependencies**: `react`, `react-dom`, `history`, `react-router`, `babel`, and `firebase` were linked via remote CDN URLs in `<head>`. When launching offline, the browser/WebView could not resolve these scripts, crashing before React could boot.
2. **Auth Initialization Hang**: On cold boot without network, `auth.onAuthStateChanged()` waited indefinitely, leaving the app trapped on the splash screen.
3. **Probe Blocking**: `isProbing` defaulted to `true` and waited for network. Local writes were aborted during probing.
4. **No Offline Mutation Queue**: When offline, changes were not queued to sync to Firestore once internet was restored.

#### Solution
1. **Localize Vendor Scripts**:
   - Downloaded and stored all vendor libraries locally in `assets/vendor/` (`react`, `react-dom`, `history`, `react-router`, `react-router-dom`, `babel`, `firebase-app`, `firebase-auth`, `firebase-firestore`, `firebase-messaging`).
   - Updated `index.html` and `sw.js` to reference local `assets/vendor/` scripts.
   - Updated `scratch/build.ps1` to ensure `assets/vendor/` is mirrored to `www/assets/vendor/` and bundled directly in the Android APK.
   - Added Service Worker app shell caching for web/PWA offline operation.
2. **Offline-First Auth Hydration**:
   - Initialized `isOffline`, `isProbing`, and `isAuthChecked` based on `navigator.onLine` and `localStorage.getItem('faiora_cached_user')`.
   - Added a 500ms fallback unblocker so cold boots never get stuck on splash if offline.
3. **Unblock Offline Storage**:
   - In `handleUpdateQuickTasks`, `handleBulkUpdate`, and `handleBulkDelete`, writes immediately persist to `localStorage` first regardless of connection state or probing.
4. **Auto-Sync Engine**:
   - Added `triggerAutoSync` listener on `window.addEventListener('online', ...)`.
   - When network connectivity returns, queued and local changes automatically push to Firestore and display a sync confirmation toast.
   - Added an offline badge indicator (`faiora_offline_status_badge`) informing users when in offline mode.

#### Files Modified
- `index.html`
- `sw.js`
- `scratch/build.ps1`
- `assets/vendor/*`

---

### 4. Eliminate Push Notifications for Completed Tasks

#### Problem & Scope
Push notifications and local reminders continued to appear for tasks that were already completed or reached 100% progress.

#### Root Causes Resolved
1. **Missing Tray Cancellation**: `cancelNativeTaskNotifications` cancelled future alarms but did not call `plugin.removeDeliveredNotifications()`, leaving already-delivered status bar notifications stuck in the tray.
2. **Filter Gaps in Cloud Scheduler**: In `functions/index.js`, tasks from Firestore triggered reminders if `progress === 100` was set without `completed === true`.
3. **Frontend Notification Rescheduler**: `rescheduleAll` did not strictly check `progress >= 100`.

#### Solution
1. **Active Tray Dismissal**:
   - Added `removeDeliveredTaskNotifications` to query `plugin.getDeliveredNotifications()` and dismiss all notifications matching `taskId` when completed or deleted.
2. **Comprehensive Filter in Cloud Functions & Reschedule**:
   - Filtered out tasks where `t.completed || (t.progress !== undefined && t.progress >= 100)` across both frontend `rescheduleAll` and backend `functions/index.js`.
3. **Clean Pruning**:
   - Cleans stored notification entries from `faiora_scheduled_notifs` on task completion.

#### Files Modified
- `index.html`
- `functions/index.js`

---

### 5. Interactive Pull-Down Notification Actions (Complete & +1 Hour)

#### Problem & Scope
Users could not perform quick actions from the notification tray (such as completing a task or postponing by 1 hour) without opening the app.

#### Solution
1. **Registered Action Types in Native Capacitor**:
   - Registered `FAIORA_TASK_ACTIONS` with actions `complete_task` ("✓ Complete") and `snooze_1h` ("+1 Hour").
   - Attached `actionTypeId: 'FAIORA_TASK_ACTIONS'` to all scheduled notifications.
2. **Notification Action Handling**:
   - In `localNotificationActionPerformed`:
     - If `complete_task`: marks task complete, clears notification from tray, cancels upcoming reminders, and saves to storage.
     - If `snooze_1h`: postpones deadline by 1 hour from current deadline (or 1 hour from now if already overdue), reschedules reminders, and saves to storage.
3. **Service Worker Push Actions**:
   - Added action buttons to `sw.js` for background web push notifications and dispatched actions to window clients.

#### Files Modified
- `index.html`
- `sw.js`

---

### 6. Overwrite & Deduplicate Multi-Stage Notifications (Single Notification per Task)

#### Problem & Scope
Multiple notifications appeared simultaneously for the same task across different stages (24h, 1h, Due Now) instead of updating in-place.

#### Solution
1. **Tray Deduplication on Delivery**:
   - In `localNotificationReceived`, any prior delivered notification matching the same `taskId` is removed so only the latest stage remains visible.
2. **Notification Tagging & Collapse Keys**:
   - In `sw.js`: set fixed `tag: 'faiora-' + taskId` and `renotify: true`.
   - In `functions/index.js`: added `collapseKey: "faiora-task-" + taskId` and `android.notification.tag = "faiora-task-" + taskId` to FCM payload so subsequent push notifications update the existing notification rather than creating duplicate entries.
3. **Consistent Notification Stages**:
   - Unified stages across client and server:
     - 24 hours before due time: `⚡ Due in 24hrs: [Task]`
     - 1 hour before due time: `⏳ Due in 1hr: [Task]`
     - At due time: `📌 Due Now: [Task]`

#### Files Modified
- `index.html`
- `sw.js`
- `functions/index.js`

---

### 7. Speed Up Initial Skeleton Loader by 0.5s

#### Problem & Scope
The cold-boot skeleton loader felt slow before displaying content.

#### Solution
1. Reduced cold-boot probe `setTimeout` delay from `1000ms` to `500ms` (0.5s faster).
2. Reduced readiness timer `setTimeout` delay from `1000ms` to `500ms` (0.5s faster).
3. If notes or tasks exist in `localStorage`, optimistic rendering bypasses delay immediately.

#### Files Modified
- `index.html`

---

### 8. Place PAST DUE and YESTERDAY Sections Above TODAY in Notepad View Mode

#### Problem & Scope
In Notepad view mode, `PAST DUE` and `YESTERDAY` sections were placed at the bottom below future and undated tasks.

#### Solution
1. Reordered section generation in `groupQuickTasksDaily` so `PAST DUE` and `YESTERDAY` are placed at the very top:
   1. **Past Due**
   2. **Yesterday**
   3. **Today**
   4. Tomorrow
   5. Future daily groups
   6. No Deadline groups
   7. Finished

#### Files Modified
- `index.html` (`groupQuickTasksDaily`)

---

## Verification & Synchronization
- Built and synchronized web assets to `www/` and `android/app/src/main/assets/public/` using `npm run sync-android`.
- Verified clean build exit status and bundling of all local vendor assets into the Android APK directory.
