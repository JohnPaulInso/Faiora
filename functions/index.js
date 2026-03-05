// ==========================================================================
// FAIORA CLOUD FUNCTIONS — Push Notification Scheduler
// ==========================================================================
// This function runs every minute and sends FCM push notifications
// to users with Quick Tasks approaching their due dates.
//
// NOTIFICATION SCHEDULE:
//   1. "Due Tomorrow"   → Sent at 9:00 AM the day before
//   2. "Due in 2 Hours" → Sent exactly 2 hours before due time
//   3. "Task Due Now!"  → Sent at exact due time
//
// HOW IT WORKS:
//   - Runs via Cloud Scheduler (every minute)
//   - Reads all users' quickTasks from Firestore
//   - Checks each task against current time
//   - Sends FCM push to user's registered device tokens
//   - Tracks sent notifications to avoid duplicates
//
// COST: Free tier covers ~2 million invocations/month.
//       1 call/minute = ~43,200/month = well within free tier.
// ==========================================================================

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// --------------------------------------------------------------------------
// SECTION 1: Firebase Admin Initialization
// --------------------------------------------------------------------------
admin.initializeApp();
const db = admin.firestore();

// --------------------------------------------------------------------------
// SECTION 1b: Cost Safeguards
// --------------------------------------------------------------------------
// These limits prevent unexpected Firestore reads/writes if the app grows.
// For personal use, you'll never hit these. Adjust upward if needed.
const MAX_USERS_PER_COLLECTION = 200; // Max users to scan per run
const MAX_TASKS_PER_USER = 20;        // Max tasks to check per user
const MAX_NOTIFICATIONS_PER_DAY = 50; // Max push notifications per user/day

// --------------------------------------------------------------------------
// SECTION 2: Helper — Check if notification was already sent
// --------------------------------------------------------------------------
// We store sent notification IDs in Firestore to prevent duplicates.
// Format: "sentNotifications/{userId}_{taskId}_{type}" where type = "1d", "2h", "due"
async function wasAlreadySent(notifId) {
    const doc = await db.collection("sentNotifications").doc(notifId).get();
    return doc.exists;
}

async function markAsSent(notifId) {
    await db.collection("sentNotifications").doc(notifId).set({
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

// Check if user has exceeded daily notification limit
async function getDailyNotifCount(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const snapshot = await db.collection("sentNotifications")
        .where("sentAt", ">=", today)
        .limit(MAX_NOTIFICATIONS_PER_DAY + 1)
        .get();
    // Count only this user's notifications
    return snapshot.docs.filter(d => d.id.startsWith(userId)).length;
}

// --------------------------------------------------------------------------
// SECTION 3: Helper — Send FCM push notification to a user
// --------------------------------------------------------------------------
async function sendPushToUser(userId, title, body, taskId) {
    // Get all FCM tokens for this user
    const tokensDoc = await db.collection("fcmTokens").doc(userId).get();
    if (!tokensDoc.exists) return;

    const data = tokensDoc.data();
    const tokens = data.tokens || [];
    if (tokens.length === 0) return;

    // Build the notification message
    const message = {
        notification: {
            title: title,
            body: body,
        },
        // Android-specific config for tray notifications
        android: {
            priority: "high",
            notification: {
                icon: "ic_notification",       // Uses app icon
                color: "#f97316",              // Faiora orange
                sound: "default",
                channelId: "faiora_tasks",     // Android notification channel
                defaultVibrateTimings: true,
                clickAction: "OPEN_APP",
            },
        },
        // Web push config
        webpush: {
            notification: {
                icon: "logo.png",
                badge: "logo.png",
                vibrate: [200, 100, 200],
                requireInteraction: true,
                actions: [
                    { action: "open", title: "Open App" },
                    { action: "dismiss", title: "Dismiss" },
                ],
            },
            fcmOptions: {
                link: "https://johnpaulinso.github.io/Faiora/index.html",
            },
        },
        data: {
            taskId: taskId,
            type: "quicktask_reminder",
        },
    };

    // Send to all registered tokens (user might have multiple devices)
    const invalidTokens = [];

    for (const token of tokens) {
        try {
            await admin.messaging().send({ ...message, token: token });
            console.log(`✅ Sent to ${userId}: "${title}"`);
        } catch (err) {
            console.warn(`❌ Failed for token ${token.substring(0, 10)}...: ${err.code}`);
            // Remove invalid/expired tokens
            if (
                err.code === "messaging/invalid-registration-token" ||
                err.code === "messaging/registration-token-not-registered"
            ) {
                invalidTokens.push(token);
            }
        }
    }

    // --------------------------------------------------------------------------
    // SECTION 3b: Cleanup — Remove expired/invalid tokens
    // --------------------------------------------------------------------------
    if (invalidTokens.length > 0) {
        const validTokens = tokens.filter((t) => !invalidTokens.includes(t));
        await db.collection("fcmTokens").doc(userId).update({ tokens: validTokens });
        console.log(`🧹 Cleaned ${invalidTokens.length} invalid tokens for ${userId}`);
    }
}

// --------------------------------------------------------------------------
// SECTION 4: Main Cloud Function — Notification Scheduler
// --------------------------------------------------------------------------
// Runs every minute via Google Cloud Scheduler (free tier).
// Scans all users' quickTasks and sends notifications at the right times.
exports.sendTaskNotifications = functions.pubsub
    .schedule("every 1 minutes")
    .onRun(async (context) => {
        const now = new Date();
        const nowMs = now.getTime();

        // Probe all possible collections the app uses
        const collections = ["tasks", "users", "userdata", "notes", "faiora_data", "user_metadata"];

        for (const collName of collections) {
            let snapshot;
            try {
                // COST GUARD: Limit how many user docs we read per collection
                snapshot = await db.collection(collName).limit(MAX_USERS_PER_COLLECTION).get();
            } catch (err) {
                continue; // Skip if collection doesn't exist
            }

            for (const userDoc of snapshot.docs) {
                const userId = userDoc.id;
                const data = userDoc.data();
                const rawTasks = data.quickTasks || [];
                // Handle both Array (legacy) and Map/Object (new) formats from Firestore
                const taskList = Array.isArray(rawTasks) ? rawTasks : Object.values(rawTasks || {});

                // Only process tasks that have due dates and aren't completed
                // COST GUARD: Limit tasks per user to prevent excessive processing
                const pendingTasks = taskList.filter(
                    (t) => t && t.dueDate && !t.completed
                ).slice(0, MAX_TASKS_PER_USER);

                for (const task of pendingTasks) {
                    const dueTime = task.dueTime || "23:59";
                    const dueDateTime = new Date(`${task.dueDate}T${dueTime}`);
                    if (isNaN(dueDateTime.getTime())) continue;

                    const dueMs = dueDateTime.getTime();
                    const taskId = task.id;

                    // --------------------------------------------------------
                    // CHECK 1: At exact due time (within 1-minute window)
                    // --------------------------------------------------------
                    const dueNotifId = `${userId}_${taskId}_due`;
                    if (
                        dueMs >= nowMs - 30000 &&
                        dueMs <= nowMs + 30000
                    ) {
                        if (!(await wasAlreadySent(dueNotifId))) {
                            await sendPushToUser(
                                userId,
                                "🔥 Task Reminder!",
                                `📌 Due Now!: ${task.text}`,
                                taskId
                            );
                            await markAsSent(dueNotifId);
                        }
                    }

                    // --------------------------------------------------------
                    // CHECK 2: 2 hours before (within 1-minute window)
                    // --------------------------------------------------------
                    const twoHoursBefore = dueMs - 2 * 60 * 60 * 1000;
                    const twoHNotifId = `${userId}_${taskId}_2h`;
                    if (
                        twoHoursBefore >= nowMs - 30000 &&
                        twoHoursBefore <= nowMs + 30000
                    ) {
                        if (!(await wasAlreadySent(twoHNotifId))) {
                            await sendPushToUser(
                                userId,
                                "🔥 Task Reminder!",
                                `⏳ Due in 2 hours!: ${task.text}`,
                                taskId
                            );
                            await markAsSent(twoHNotifId);
                        }
                    }

                    // --------------------------------------------------------
                    // CHECK 3: 1 day before at 9 AM (within 1-minute window)
                    // --------------------------------------------------------
                    const dayBefore = new Date(dueDateTime);
                    dayBefore.setDate(dayBefore.getDate() - 1);
                    dayBefore.setHours(9, 0, 0, 0);
                    const dayBeforeMs = dayBefore.getTime();
                    const oneDNotifId = `${userId}_${taskId}_1d`;
                    if (
                        dayBeforeMs >= nowMs - 30000 &&
                        dayBeforeMs <= nowMs + 30000
                    ) {
                        if (!(await wasAlreadySent(oneDNotifId))) {
                            await sendPushToUser(
                                userId,
                                "🔥 Task Reminder!",
                                `⚡ Due Tomorrow!: ${task.text}`,
                                taskId
                            );
                            await markAsSent(oneDNotifId);
                        }
                    }
                }
            }
        }

        return null;
    });

// --------------------------------------------------------------------------
// SECTION 5: Cleanup — Auto-delete old sent notification records
// --------------------------------------------------------------------------
// Runs daily to clean up old entries from sentNotifications collection
// so it doesn't grow forever. Deletes records older than 7 days.
exports.cleanupSentNotifications = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async (context) => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldEntries = await db
            .collection("sentNotifications")
            .where("sentAt", "<", sevenDaysAgo)
            .limit(500)
            .get();

        const batch = db.batch();
        oldEntries.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        console.log(`🧹 Cleaned ${oldEntries.size} old notification records`);
        return null;
    });
