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
const crypto = require("crypto");

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
// SECTION 1c: Formatting Helpers
// --------------------------------------------------------------------------
function formatTitleCase(text) {
    if (!text) return "";
    const t = text.trim();
    if (t.length === 0) return "";
    return t.split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

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
    // We use "Data-only" messages because they force the Service Worker
    // to wake up even if the app process is closed/swiped away.
    const message = {
        // Android-specific config for tray notifications
        android: {
            priority: "high",
            ttl: 86400000, // 24 hours in milliseconds
        },
        // Web push config
        webpush: {
            headers: {
                TTL: "86400", // 24 hours in seconds
                Urgency: "high"
            },
            fcmOptions: {
                link: "https://johnpaulinso.github.io/Faiora/index.html",
            },
        },
        data: {
            title: title,
            body: body,
            taskId: taskId,
            type: "quicktask_reminder",
            clickAction: "OPEN_APP"
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
                    // Use timezone-independent timestamp if available (new format)
                    // Fallback to parsing strings (legacy/server-local format)
                    const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
                    const dueMsFromRef = isNaN(dueDateTime.getTime()) ? null : dueDateTime.getTime();
                    
                    const dueMs = task.dueTimestamp || dueMsFromRef;
                    if (!dueMs) continue;

                    const taskId = task.id;

                    // --------------------------------------------------------
                    // CHECK 1: At exact due time (within wide window for reliability)
                    // --------------------------------------------------------
                    const dueNotifId = `${userId}_${taskId}_due`;
                    if (
                        dueMs >= nowMs - 120000 &&
                        dueMs <= nowMs + 30000
                    ) {
                        if (!(await wasAlreadySent(dueNotifId))) {
                            const taskName = formatTitleCase(task.text);
                            await sendPushToUser(
                                userId,
                                "🔥 Task Reminder!",
                                `📌 Due Now!: ${taskName}`,
                                taskId
                            );
                            await markAsSent(dueNotifId);
                        }
                    }

                    // --------------------------------------------------------
                    // CHECK 2: 2 hours before (within wide window)
                    // --------------------------------------------------------
                    const twoHoursBefore = dueMs - 2 * 60 * 60 * 1000;
                    const twoHNotifId = `${userId}_${taskId}_2h`;
                    if (
                        twoHoursBefore >= nowMs - 120000 &&
                        twoHoursBefore <= nowMs + 30000
                    ) {
                        if (!(await wasAlreadySent(twoHNotifId))) {
                            const taskName = formatTitleCase(task.text);
                            await sendPushToUser(
                                userId,
                                "🔥 Task Reminder!",
                                `⏳ Due in 2 hours!: ${taskName}`,
                                taskId
                            );
                            await markAsSent(twoHNotifId);
                        }
                    }

                    // --------------------------------------------------------
                    // CHECK 3: 1 day before at 9 AM (within wide window)
                    // --------------------------------------------------------
                    const dayBefore = new Date(dueDateTime);
                    dayBefore.setDate(dayBefore.getDate() - 1);
                    dayBefore.setHours(9, 0, 0, 0);
                    const dayBeforeMs = dayBefore.getTime();
                    const oneDNotifId = `${userId}_${taskId}_1d`;
                    if (
                        dayBeforeMs >= nowMs - 120000 &&
                        dayBeforeMs <= nowMs + 30000
                    ) {
                        if (!(await wasAlreadySent(oneDNotifId))) {
                            const taskName = formatTitleCase(task.text);
                            await sendPushToUser(
                                userId,
                                "🔥 Task Reminder!",
                                `⚡ Due Tomorrow!: ${taskName}`,
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

// --------------------------------------------------------------------------
// SECTION 6: Lightweight Admin API
// --------------------------------------------------------------------------
const ADMIN_COLLECTION = 'admin_accounts';
const ADMIN_SECRET_COLLECTION = 'admin_private';
const BOOTSTRAP_ADMIN_EMAIL = 'admin@admin.com';
const BOOTSTRAP_ADMIN_PASSWORD = 'admin';
const ADMIN_DATA_COLLECTIONS = ['tasks', 'users', 'users_public', 'userdata', 'notes', 'faiora_data', 'user_metadata'];
const ADMIN_DISCOVERY_COLLECTIONS = ['faiora_metadata', ...ADMIN_DATA_COLLECTIONS, 'metadata', 'profiles', 'user_accounts', 'user_notes', 'planner_data', 'cloud_notes'];
const ADMIN_PASSWORD_DIGEST = 'sha512';
const ADMIN_PASSWORD_ITERATIONS = 120000;
const ADMIN_PASSWORD_BYTES = 64;

function setAdminCors(res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function sendJson(res, status, payload) {
    res.status(status).json(payload);
}

function toArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
}

function normalizeAdminEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function buildAdminPasswordHash(password, saltHex = crypto.randomBytes(16).toString('hex')) {
    const normalizedPassword = String(password || '');
    const hash = crypto.pbkdf2Sync(
        normalizedPassword,
        Buffer.from(saltHex, 'hex'),
        ADMIN_PASSWORD_ITERATIONS,
        ADMIN_PASSWORD_BYTES,
        ADMIN_PASSWORD_DIGEST
    ).toString('hex');

    return {
        salt: saltHex,
        hash,
        iterations: ADMIN_PASSWORD_ITERATIONS,
        digest: ADMIN_PASSWORD_DIGEST,
    };
}

function isPasswordHashMatch(expectedHex, candidateHex) {
    try {
        const expected = Buffer.from(String(expectedHex || ''), 'hex');
        const candidate = Buffer.from(String(candidateHex || ''), 'hex');
        if (expected.length === 0 || candidate.length === 0 || expected.length !== candidate.length) {
            return false;
        }
        return crypto.timingSafeEqual(expected, candidate);
    } catch (error) {
        return false;
    }
}

function stripHtmlPreview(value, limit = 220) {
    return String(value || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit);
}

function summarizeNote(note) {
    return {
        id: note?.id || note?.noteId || note?.sourceNoteId || '',
        title: note?.title || 'Untitled',
        preview: stripHtmlPreview(note?.content),
        labels: Array.isArray(note?.labels) ? note.labels.slice(0, 5) : [],
        updatedAt: note?.updatedAt || note?.lastKnownUpdatedAt || null,
        ownerId: note?.ownerId || null,
        ownerEmail: note?.ownerEmail || null,
        backupStatus: note?.backupStatus || null,
        isPinned: !!note?.isPinned,
        isSharedNote: !!note?.isSharedNote,
    };
}

function summarizeTask(task) {
    return {
        id: task?.id || '',
        text: task?.text || task?.title || '',
        dueDate: task?.dueDate || '',
        dueTime: task?.dueTime || '',
        completed: !!task?.completed,
        updatedAt: task?.updatedAt || task?.createdAt || null,
    };
}

function isSafeAdminCollection(value) {
    const name = String(value || '').trim();
    return !!name && ADMIN_DISCOVERY_COLLECTIONS.includes(name);
}

function getNoteId(note = {}, fallback = '') {
    return String(note.sourceNoteId || note.noteId || note.id || fallback || '').trim();
}

function getTaskId(task = {}, fallback = '') {
    return String(task.id || fallback || '').trim();
}

function buildNoteBackupId(ownerId, noteId) {
    return `${encodeURIComponent(String(ownerId || 'guest'))}__${encodeURIComponent(String(noteId || ''))}`;
}

function normalizeReadableNote(note = {}, ownerId = '', ownerEmail = '') {
    const noteId = getNoteId(note);
    return {
        noteId,
        title: note.title || 'Untitled',
        content: note.content || '',
        labels: Array.isArray(note.labels) ? note.labels : [],
        noteTheme: note.noteTheme || '',
        noteIcon: note.noteIcon || '',
        reminderDate: note.reminderDate || '',
        reminderTime: note.reminderTime || '',
        section: note.section || '',
        updatedAt: note.updatedAt || Date.now(),
        ownerId,
        ownerEmail: ownerEmail || note.ownerEmail || '',
        backupDocId: note.backupDocId || buildNoteBackupId(ownerId, noteId),
        backupStatus: note.backupStatus || 'active',
    };
}

async function syncReadableNoteMirror(ownerId, note = {}, mode = 'active') {
    const mirrorRef = db.collection('notes').doc(ownerId);
    const snap = await mirrorRef.get().catch(() => null);
    const data = snap && snap.exists ? (snap.data() || {}) : {};
    const noteId = getNoteId(note);
    const matchesNote = (candidate) => getNoteId(candidate) === noteId;
    const readableNotes = Array.isArray(data.readableNotes) ? data.readableNotes.filter((candidate) => !matchesNote(candidate)) : [];
    const readableTrashNotes = Array.isArray(data.readableTrashNotes) ? data.readableTrashNotes.filter((candidate) => !matchesNote(candidate)) : [];
    const payload = normalizeReadableNote(note, ownerId, note.ownerEmail || data.ownerEmail || '');
    if (mode === 'deleted') {
        readableTrashNotes.unshift({ ...payload, backupStatus: 'deleted', deletedAt: new Date().toISOString() });
    } else {
        readableNotes.unshift({ ...payload, backupStatus: 'active' });
    }
    await mirrorRef.set({
        ownerId,
        ownerEmail: note.ownerEmail || data.ownerEmail || '',
        readableNotes,
        readableTrashNotes,
        readableNoteCount: readableNotes.length,
        readableTrashCount: readableTrashNotes.length,
        readableMirrorUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

async function syncNoteBackup(note = {}, ownerId = '', collection = '', status = 'active') {
    const noteId = getNoteId(note);
    if (!ownerId || !noteId) return;
    const backupDocId = note.backupDocId || buildNoteBackupId(ownerId, noteId);
    await db.collection('notes').doc(backupDocId).set({
        ...note,
        id: noteId,
        noteId,
        sourceNoteId: noteId,
        ownerId,
        ownerCollection: collection,
        sourceCollection: collection,
        backupDocId,
        backupStatus: status,
        deletedAt: status === 'active' ? null : (note.deletedAt || new Date().toISOString()),
        backupUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastKnownUpdatedAt: note.updatedAt || Date.now(),
    }, { merge: true });
}

async function adminSaveNote({ ownerId, collection, note }) {
    if (!ownerId || !isSafeAdminCollection(collection)) throw new Error('Invalid note owner or collection.');
    const noteId = getNoteId(note);
    if (!noteId) throw new Error('Missing note id.');
    const cleanNote = {
        ...note,
        id: noteId,
        noteId,
        sourceNoteId: noteId,
        ownerId,
        ownerCollection: collection,
        sourceCollection: collection,
        updatedAt: Date.now(),
    };
    await db.collection(collection).doc(ownerId).update(new admin.firestore.FieldPath('notes', noteId), cleanNote)
        .catch(async (error) => {
            if (error.code !== 5 && error.code !== 'not-found') throw error;
            await db.collection(collection).doc(ownerId).set(
                { notes: { [noteId]: cleanNote } },
                { mergeFields: [new admin.firestore.FieldPath('notes', noteId)] }
            );
        });
    await Promise.allSettled([
        syncReadableNoteMirror(ownerId, cleanNote, 'active'),
        syncNoteBackup(cleanNote, ownerId, collection, 'active'),
        cleanNote.publicShareToken ? db.collection('public_shares').doc(cleanNote.publicShareToken).set({
            ...cleanNote,
            isPublic: cleanNote.isPublic === true,
            allowPublicEdit: cleanNote.allowPublicEdit === true,
        }, { merge: true }) : Promise.resolve(),
    ]);
    return cleanNote;
}

async function adminDeleteNote({ ownerId, collection, note }) {
    if (!ownerId || !isSafeAdminCollection(collection)) throw new Error('Invalid note owner or collection.');
    const noteId = getNoteId(note);
    if (!noteId) throw new Error('Missing note id.');
    await db.collection(collection).doc(ownerId).update(new admin.firestore.FieldPath('notes', noteId), admin.firestore.FieldValue.delete())
        .catch((error) => {
            if (error.code !== 5 && error.code !== 'not-found') throw error;
        });
    await Promise.allSettled([
        syncReadableNoteMirror(ownerId, note, 'deleted'),
        syncNoteBackup({ ...note, deletedAt: new Date().toISOString() }, ownerId, collection, 'deleted'),
        note.publicShareToken ? db.collection('public_shares').doc(note.publicShareToken).delete() : Promise.resolve(),
    ]);
}

async function adminSaveTask({ ownerId, collection, task }) {
    if (!ownerId || !isSafeAdminCollection(collection)) throw new Error('Invalid task owner or collection.');
    const taskId = getTaskId(task);
    if (!taskId) throw new Error('Missing task id.');
    const docRef = db.collection(collection).doc(ownerId);
    const snap = await docRef.get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const rawTasks = data.quickTasks || [];
    const cleanTask = { ...task, id: taskId, ownerId, sourceCollection: collection, updatedAt: task.updatedAt || Date.now() };
    let nextQuickTasks;
    if (Array.isArray(rawTasks)) {
        const index = rawTasks.findIndex((item) => getTaskId(item) === taskId);
        nextQuickTasks = index >= 0 ? rawTasks.map((item, itemIndex) => itemIndex === index ? cleanTask : item) : [cleanTask, ...rawTasks];
    } else {
        const matchedEntry = Object.entries(rawTasks || {}).find(([key, item]) => key === taskId || getTaskId(item) === taskId);
        nextQuickTasks = { ...(rawTasks || {}), [matchedEntry ? matchedEntry[0] : taskId]: cleanTask };
    }
    await docRef.set({ quickTasks: nextQuickTasks }, { merge: true });
    return cleanTask;
}

async function adminDeleteTask({ ownerId, collection, task }) {
    if (!ownerId || !isSafeAdminCollection(collection)) throw new Error('Invalid task owner or collection.');
    const taskId = getTaskId(task);
    if (!taskId) throw new Error('Missing task id.');
    const docRef = db.collection(collection).doc(ownerId);
    const snap = await docRef.get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const rawTasks = data.quickTasks || [];
    let removedTask = task;
    let nextQuickTasks;
    if (Array.isArray(rawTasks)) {
        removedTask = rawTasks.find((item) => getTaskId(item) === taskId) || task;
        nextQuickTasks = rawTasks.filter((item) => getTaskId(item) !== taskId);
    } else {
        nextQuickTasks = { ...(rawTasks || {}) };
        Object.entries(nextQuickTasks).forEach(([key, item]) => {
            if (key === taskId || getTaskId(item) === taskId) {
                removedTask = item || task;
                delete nextQuickTasks[key];
            }
        });
    }
    const quickTaskTrash = Array.isArray(data.quickTaskTrash) ? data.quickTaskTrash.filter((item) => getTaskId(item) !== taskId) : [];
    quickTaskTrash.unshift({ ...removedTask, deletedAt: new Date().toISOString(), trashType: 'quickTask' });
    await docRef.set({ quickTasks: nextQuickTasks, quickTaskTrash }, { merge: true });
}

function serializeAdminDate(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return value;
}

async function upsertAdminCredential(uid, email, password) {
    const passwordHash = buildAdminPasswordHash(password);
    await db.collection(ADMIN_SECRET_COLLECTION).doc(uid).set({
        email: normalizeAdminEmail(email),
        hash: passwordHash.hash,
        salt: passwordHash.salt,
        iterations: passwordHash.iterations,
        digest: passwordHash.digest,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

async function verifyAdminCredential(uid, password) {
    const secretSnap = await db.collection(ADMIN_SECRET_COLLECTION).doc(uid).get();
    if (!secretSnap.exists) {
        throw new Error('Admin credential record is missing. Run Register Admin first.');
    }

    const secret = secretSnap.data() || {};
    const salt = secret.salt;
    const digest = secret.digest || ADMIN_PASSWORD_DIGEST;
    const iterations = Number(secret.iterations || ADMIN_PASSWORD_ITERATIONS);
    if (!salt || !secret.hash) {
        throw new Error('Admin credential record is incomplete. Run Register Admin again.');
    }

    const candidateHash = crypto.pbkdf2Sync(
        String(password || ''),
        Buffer.from(String(salt), 'hex'),
        iterations,
        ADMIN_PASSWORD_BYTES,
        digest
    ).toString('hex');

    return isPasswordHashMatch(secret.hash, candidateHash);
}

async function ensureBootstrapAdmin(email = BOOTSTRAP_ADMIN_EMAIL, password = BOOTSTRAP_ADMIN_PASSWORD) {
    const normalizedEmail = normalizeAdminEmail(email) || BOOTSTRAP_ADMIN_EMAIL;
    const normalizedPassword = String(password || BOOTSTRAP_ADMIN_PASSWORD);
    const existingAdmins = await db.collection(ADMIN_COLLECTION).limit(1).get();
    let authUser = null;

    try {
        authUser = await admin.auth().getUserByEmail(normalizedEmail);
    } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
    }

    if (!authUser) {
        authUser = await admin.auth().createUser({
            email: normalizedEmail,
            password: normalizedPassword,
            displayName: 'Faiora Admin'
        });
    }

    const secretSnap = await db.collection(ADMIN_SECRET_COLLECTION).doc(authUser.uid).get();
    if (!secretSnap.exists) {
        await upsertAdminCredential(authUser.uid, normalizedEmail, normalizedPassword);
    }

    if (existingAdmins.empty) {
        await db.collection(ADMIN_COLLECTION).doc(authUser.uid).set({
            role: 'superadmin',
            email: normalizedEmail,
            displayName: 'Faiora Admin',
            bootstrap: true,
            mustRotatePassword: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } else {
        await db.collection(ADMIN_COLLECTION).doc(authUser.uid).set({
            role: 'superadmin',
            email: normalizedEmail,
            displayName: 'Faiora Admin',
            bootstrap: true,
            mustRotatePassword: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    return authUser;
}

async function issueAdminCustomToken(email, password) {
    const normalizedEmail = normalizeAdminEmail(email);
    if (!normalizedEmail || !password) {
        throw new Error('Email and password are required.');
    }

    let authUser;
    try {
        authUser = await admin.auth().getUserByEmail(normalizedEmail);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            throw new Error('That admin account is not registered yet. Press Register Admin first.');
        }
        throw error;
    }

    const adminSnap = await db.collection(ADMIN_COLLECTION).doc(authUser.uid).get();
    if (!adminSnap.exists) {
        throw new Error('This Firebase account is not an admin yet.');
    }

    const isMatch = await verifyAdminCredential(authUser.uid, password);
    if (!isMatch) {
        throw new Error('Wrong email or password.');
    }

    const customToken = await admin.auth().createCustomToken(authUser.uid, {
        faioraAdmin: true,
        faioraAdminRole: (adminSnap.data() || {}).role || 'admin',
    });

    return {
        customToken,
        authUser,
        profile: adminSnap.data() || {},
    };
}

async function getVerifiedAdmin(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return null;

    const decoded = await admin.auth().verifyIdToken(token);
    const adminSnap = await db.collection(ADMIN_COLLECTION).doc(decoded.uid).get();
    if (!adminSnap.exists) return null;

    const adminData = adminSnap.data() || {};
    if (!['admin', 'superadmin'].includes(adminData.role)) return null;

    return {
        uid: decoded.uid,
        email: decoded.email || adminData.email || '',
        claims: decoded,
        profile: adminData,
    };
}

async function findUserDoc(uid, preferredCollections = []) {
    const collections = [...new Set([...preferredCollections.filter(Boolean), ...ADMIN_DATA_COLLECTIONS])];
    for (const coll of collections) {
        try {
            const snap = await db.collection(coll).doc(uid).get();
            if (snap.exists) {
                const data = snap.data() || {};
                if (data.notes || data.quickTasks || data.profile || data.settings || data.noteSections) {
                    return { collection: coll, data };
                }
            }
        } catch (error) {
            // ignore and keep scanning
        }
    }
    return { collection: '', data: null };
}

async function loadUserBundle(uid) {
    const metadataSnap = await db.collection('faiora_metadata').doc(uid).get().catch(() => null);
    const metadata = metadataSnap && metadataSnap.exists ? (metadataSnap.data() || {}) : {};
    const preferred = [metadata.notesCollection, metadata.quickTasksCollection, metadata.activeCollection].filter(Boolean);
    const liveSource = await findUserDoc(uid, preferred);
    const mirrorSnap = await db.collection('notes').doc(uid).get().catch(() => null);
    const mirrorData = mirrorSnap && mirrorSnap.exists ? (mirrorSnap.data() || {}) : {};
    const publicSnap = await db.collection('users_public').doc(uid).get().catch(() => null);
    const publicData = publicSnap && publicSnap.exists ? (publicSnap.data() || {}) : {};

    let authUser = null;
    try {
        authUser = await admin.auth().getUser(uid);
    } catch (error) {
        authUser = null;
    }

    const rawNotesMap = liveSource.data?.notes || liveSource.data?.allNotes || {};
    const rawQuickTasks = toArray(liveSource.data?.quickTasks || []);
    const readableNotes = Array.isArray(mirrorData.readableNotes) && mirrorData.readableNotes.length > 0
        ? mirrorData.readableNotes.map(summarizeNote)
        : Object.entries(rawNotesMap).map(([noteId, note]) => summarizeNote({ ...(note || {}), id: note?.id || noteId }));
    const readableTrashNotes = Array.isArray(mirrorData.readableTrashNotes)
        ? mirrorData.readableTrashNotes.map(summarizeNote)
        : [];

    return {
        authUser: authUser ? {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || '',
            disabled: !!authUser.disabled,
            createdAt: authUser.metadata?.creationTime || null,
            lastSignInAt: authUser.metadata?.lastSignInTime || null,
            providers: (authUser.providerData || []).map((provider) => provider.providerId),
        } : { uid, email: '', displayName: '', disabled: false, createdAt: null, lastSignInAt: null, providers: [] },
        metadata,
        publicProfile: publicData,
        passwordHash: publicData.passwordHash || metadata.passwordHash || '',
        passwordHashAlgorithm: publicData.passwordHashAlgorithm || metadata.passwordHashAlgorithm || '',
        sourceCollection: liveSource.collection || metadata.activeCollection || '',
        notes: readableNotes.slice(0, 120),
        trashNotes: readableTrashNotes.slice(0, 40),
        quickTasks: rawQuickTasks.map(summarizeTask).slice(0, 120),
        profile: liveSource.data?.profile || {},
        settings: liveSource.data?.settings || {},
        noteSections: Array.isArray(liveSource.data?.noteSections) ? liveSource.data.noteSections : [],
    };
}

async function loadUserDirectorySummary(authUser) {
    const uid = authUser.uid;
    const metadataSnap = await db.collection('faiora_metadata').doc(uid).get().catch(() => null);
    const metadata = metadataSnap && metadataSnap.exists ? (metadataSnap.data() || {}) : {};
    const preferred = [metadata.notesCollection, metadata.quickTasksCollection, metadata.activeCollection].filter(Boolean);
    const liveSource = await findUserDoc(uid, preferred);
    const mirrorSnap = await db.collection('notes').doc(uid).get().catch(() => null);
    const mirrorData = mirrorSnap && mirrorSnap.exists ? (mirrorSnap.data() || {}) : {};
    const publicSnap = await db.collection('users_public').doc(uid).get().catch(() => null);
    const publicData = publicSnap && publicSnap.exists ? (publicSnap.data() || {}) : {};
    const sourceData = liveSource.data || {};
    const rawNotesMap = sourceData.notes || sourceData.allNotes || {};
    const readableNotesCount = Array.isArray(mirrorData.readableNotes) ? mirrorData.readableNotes.length : 0;
    const sourceNotesCount = rawNotesMap && typeof rawNotesMap === 'object' ? Object.keys(rawNotesMap).length : 0;
    const quickTasksCount = toArray(sourceData.quickTasks || []).length;
    const collections = [
        liveSource.collection,
        mirrorSnap && mirrorSnap.exists ? 'notes' : '',
        publicSnap && publicSnap.exists ? 'users_public' : '',
        metadata.activeCollection,
        metadata.notesCollection,
        metadata.quickTasksCollection,
    ].filter(Boolean);

    return {
        uid,
        email: authUser.email || publicData.email || sourceData.email || sourceData.profile?.email || '',
        displayName: authUser.displayName || publicData.displayName || publicData.name || sourceData.displayName || sourceData.profile?.displayName || '',
        disabled: !!authUser.disabled,
        createdAt: authUser.metadata?.creationTime || null,
        lastSignInAt: authUser.metadata?.lastSignInTime || null,
        providers: (authUser.providerData || []).map((provider) => provider.providerId),
        collections: [...new Set(collections)],
        notesCount: Math.max(Number(mirrorData.readableNoteCount || 0), readableNotesCount, sourceNotesCount),
        taskCount: quickTasksCount,
        updatedAt: serializeAdminDate(metadata.lastSeenAt || metadata.updatedAt || mirrorData.readableMirrorUpdatedAt || sourceData.updatedAt || authUser.metadata?.lastSignInTime || authUser.metadata?.creationTime || null),
        passwordHashKnown: !!(publicData.passwordHash || metadata.passwordHash),
    };
}

function addFirestoreDirectoryUser(map, collection, docId, data = {}) {
    const uid = String(data.uid || data.userId || data.ownerId || docId || '');
    if (!uid || uid.includes('__')) return;

    const hasSignal = !!(
        data.readableNotes ||
        data.readableNoteCount ||
        data.quickTasks ||
        data.notes ||
        data.profile ||
        data.settings ||
        data.email ||
        data.displayName ||
        data.ownerId ||
        data.name ||
        data.username ||
        collection === 'faiora_metadata'
    );
    if (!hasSignal) return;

    const existing = map.get(uid) || {
        uid,
        email: '',
        displayName: '',
        disabled: false,
        createdAt: null,
        lastSignInAt: null,
        providers: [],
        collections: [],
        notesCount: 0,
        taskCount: 0,
        updatedAt: null,
    };

    if (!existing.collections.includes(collection)) {
        existing.collections.push(collection);
    }
    [data.activeCollection, data.notesCollection, data.quickTasksCollection].filter(Boolean).forEach((collectionName) => {
        if (!existing.collections.includes(collectionName)) {
            existing.collections.push(collectionName);
        }
    });

    existing.email = existing.email || data.email || data.profile?.email || data.ownerEmail || data.publicEmail || '';
    existing.displayName = existing.displayName || data.displayName || data.profile?.displayName || data.ownerName || data.name || data.username || '';
    existing.notesCount = Math.max(
        Number(existing.notesCount || 0),
        Number(data.readableNoteCount || 0),
        Number(data.notesCount || 0),
        Array.isArray(data.readableNotes) ? data.readableNotes.length : 0,
        data.notes && typeof data.notes === 'object' ? Object.keys(data.notes).length : 0
    );
    existing.taskCount = Math.max(
        Number(existing.taskCount || 0),
        Number(data.taskCount || 0),
        toArray(data.quickTasks || []).length
    );
    existing.updatedAt = serializeAdminDate(existing.updatedAt || data.lastSeenAt || data.updatedAt || data.readableMirrorUpdatedAt || data.createdAt || null);
    map.set(uid, existing);
}

async function scanAdminCollection(collection, pageSize = 150, maxPages = 6) {
    const docs = [];
    let lastDoc = null;
    for (let page = 0; page < maxPages; page += 1) {
        let query = db.collection(collection)
            .orderBy(admin.firestore.FieldPath.documentId())
            .limit(pageSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snap = await query.get().catch(() => null);
        if (!snap || snap.empty) break;
        docs.push(...snap.docs);
        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.size < pageSize) break;
    }
    return docs;
}

async function collectFirestoreDirectoryUsers() {
    const map = new Map();
    await Promise.all(ADMIN_DISCOVERY_COLLECTIONS.map(async (collection) => {
        const docs = await scanAdminCollection(collection);
        docs.forEach((doc) => addFirestoreDirectoryUser(map, collection, doc.id, doc.data() || {}));
    }));
    return Array.from(map.values());
}

function mergeDirectoryUsers(primary = [], secondary = []) {
    const map = new Map();
    [...secondary, ...primary].forEach((user) => {
        if (!user || !user.uid) return;
        const existing = map.get(user.uid) || {
            uid: user.uid,
            email: '',
            displayName: '',
            disabled: false,
            createdAt: null,
            lastSignInAt: null,
            providers: [],
            collections: [],
            notesCount: 0,
            taskCount: 0,
            updatedAt: null,
        };
        const existingCollections = existing.collections || [];
        const existingProviders = existing.providers || [];
        const existingNotesCount = Number(existing.notesCount || 0);
        const existingTaskCount = Number(existing.taskCount || 0);
        const existingUpdatedAt = existing.updatedAt;
        Object.assign(existing, user);
        existing.email = existing.email || user.email || '';
        existing.displayName = existing.displayName || user.displayName || '';
        existing.collections = [...new Set([...existingCollections, ...(user.collections || [])])];
        existing.providers = [...new Set([...existingProviders, ...(user.providers || [])])];
        existing.notesCount = Math.max(existingNotesCount, Number(user.notesCount || 0));
        existing.taskCount = Math.max(existingTaskCount, Number(user.taskCount || 0));
        existing.updatedAt = serializeAdminDate(existingUpdatedAt || user.updatedAt || user.lastSignInAt || user.createdAt || null);
        map.set(user.uid, existing);
    });
    return Array.from(map.values()).sort((a, b) => {
        const updatedDiff = new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        if (updatedDiff !== 0) return updatedDiff;
        return String(a.displayName || a.email || a.uid).localeCompare(String(b.displayName || b.email || b.uid));
    });
}

exports.adminApi = functions.https.onRequest(async (req, res) => {
    setAdminCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    const url = new URL(req.url, 'https://admin.local');
    const route = (url.pathname || '/')
        .replace(/^\/+/, '')
        .replace(/^adminApi\/?/, '');

    try {
        if (route === 'health') {
            const adminSnap = await db.collection(ADMIN_COLLECTION).limit(1).get().catch(() => null);
            const secretSnap = await db.collection(ADMIN_SECRET_COLLECTION).limit(1).get().catch(() => null);
            sendJson(res, 200, {
                ok: true,
                api: 'online',
                bootstrapAdminExists: !!(adminSnap && !adminSnap.empty),
                credentialRecordExists: !!(secretSnap && !secretSnap.empty),
                bootstrapEmail: BOOTSTRAP_ADMIN_EMAIL,
            });
            return;
        }

        if (route === 'bootstrap' && req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            const requestedEmail = body.email || BOOTSTRAP_ADMIN_EMAIL;
            const requestedPassword = body.password || BOOTSTRAP_ADMIN_PASSWORD;
            const authUser = await ensureBootstrapAdmin(requestedEmail, requestedPassword);
            sendJson(res, 200, {
                ok: true,
                bootstrap: true,
                email: normalizeAdminEmail(requestedEmail),
                uid: authUser.uid,
                warning: 'Default bootstrap credentials exist. Change the password immediately after first login.'
            });
            return;
        }

        if (route === 'login' && req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            const result = await issueAdminCustomToken(body.email, body.password);
            sendJson(res, 200, {
                ok: true,
                customToken: result.customToken,
                admin: {
                    uid: result.authUser.uid,
                    email: result.authUser.email || '',
                    role: result.profile.role || 'admin',
                    mustRotatePassword: !!result.profile.mustRotatePassword,
                }
            });
            return;
        }

        const adminUser = await getVerifiedAdmin(req);
        if (!adminUser) {
            sendJson(res, 401, { ok: false, error: 'Admin authorization required.' });
            return;
        }

        if (route === 'me') {
            sendJson(res, 200, {
                ok: true,
                admin: {
                    uid: adminUser.uid,
                    email: adminUser.email,
                    profile: adminUser.profile,
                }
            });
            return;
        }

        if (route === 'overview') {
            const listed = await admin.auth().listUsers(100);
            const notesMirror = await db.collection('notes').limit(25).get().catch(() => ({ size: 0 }));
            const firestoreUsers = await collectFirestoreDirectoryUsers().catch(() => []);
            sendJson(res, 200, {
                ok: true,
                counts: {
                    usersSampled: Math.max(listed.users.length, firestoreUsers.length),
                    mirroredNotesDocs: notesMirror.size || 0,
                    firestoreUsers: firestoreUsers.length,
                }
            });
            return;
        }

        if (route === 'users') {
            const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '60', 10), 100));
            const pageToken = url.searchParams.get('pageToken') || undefined;
            const search = (url.searchParams.get('q') || '').trim().toLowerCase();
            const listed = await admin.auth().listUsers(limit, pageToken);
            const authUsers = await Promise.all(listed.users.map((user) => loadUserDirectorySummary(user)));
            const firestoreUsers = await collectFirestoreDirectoryUsers().catch(() => []);
            const users = mergeDirectoryUsers(authUsers, firestoreUsers)
                .filter((user) => {
                    if (!search) return true;
                    return [user.email, user.displayName, user.uid, ...(user.collections || [])].some((value) => String(value || '').toLowerCase().includes(search));
                });

            sendJson(res, 200, {
                ok: true,
                users,
                nextPageToken: listed.pageToken || null,
            });
            return;
        }

        if (route.startsWith('user/')) {
            const uid = route.split('/')[1] || '';
            if (!uid) {
                sendJson(res, 400, { ok: false, error: 'Missing uid.' });
                return;
            }
            const bundle = await loadUserBundle(uid);
            sendJson(res, 200, { ok: true, bundle });
            return;
        }

        if (route === 'note/save' && req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            const note = await adminSaveNote(body);
            sendJson(res, 200, { ok: true, note });
            return;
        }

        if (route === 'note/delete' && req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            await adminDeleteNote(body);
            sendJson(res, 200, { ok: true });
            return;
        }

        if (route === 'task/save' && req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            const task = await adminSaveTask(body);
            sendJson(res, 200, { ok: true, task });
            return;
        }

        if (route === 'task/delete' && req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            await adminDeleteTask(body);
            sendJson(res, 200, { ok: true });
            return;
        }

        sendJson(res, 404, { ok: false, error: 'Not found.' });
    } catch (error) {
        console.error('[ADMIN API]', error);
        sendJson(res, 500, {
            ok: false,
            error: error?.message || 'Unknown admin API error.'
        });
    }
});
