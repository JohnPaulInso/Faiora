/**
 * NOTIFICATION SERVICE
 * Extracted from index.html on 2026-04-22
 * 
 * LABEL: NOTIFICATION-ENGINE — Manages all notification logic (Local, Native, FCM)
 */
import { formatTaskText, getAlarmScheduleDate, firebase, db, auth } from '../core/config';

const FaioraNotifications = (() => {
    const timers = new Map(); // taskId -> [timerIds]
    let swReady = false;
    let swRegistration = null;

    // ------------------------------------------------------------------
    // LABEL: NOTIF-SW — Register Service Worker
    // ------------------------------------------------------------------
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // FIX 2026-04-22: Deep 2000ms delay to satisfy Chrome Extensions
            setTimeout(() => {
                navigator.serviceWorker.register('sw.js').then(reg => {
                    swRegistration = reg;
                    swReady = true;
                    console.log('🔥 Faiora SW registered');
                    
                    setTimeout(() => { try { reg.update(); } catch(e) {} }, 5000);

                    if (navigator.storage && navigator.storage.persist) {
                        navigator.storage.persist().then(granted => {
                            if (granted) console.log("💾 [Faiora] Persistent storage granted");
                        });
                    }
                }).catch(err => {
                    if (!err.message.includes('message port closed')) {
                        console.warn('SW registration failed:', err);
                    }
                });
            }, 2000);
        });
    }

    const VAPID_KEY = 'BPEtleiswwW1JQ2b8rtlPBGHm2DhcSmxmDZh6ifdZusmLdD0HzOScot047EvfbSJkN9VbQlD04G4RaNCoBbdiFI';
    const hasNotificationApi = typeof window !== 'undefined' && typeof window.Notification !== 'undefined';
    const inAppListeners = new Set();
    let nativeChannelsReady = false;
    let nativeListenersReady = false;
    
    const nativeLocalNotifications = () => window.Capacitor?.Plugins?.LocalNotifications || null;
    const hasNativeLocalNotifications = () => !!nativeLocalNotifications();
    const nativeAlarmBridge = () => window.FaioraNativeAlarmBridge || null;
    const hasNativeAlarmBridge = () => !!nativeAlarmBridge()?.scheduleAlarm;
    
    const QUICK_TASK_CHANNEL_ID = 'faiora-quick-tasks-v2';
    const ALARM_CHANNEL_ID = 'faiora-alarms-v2';
    const NATIVE_NOTIFICATION_SOUND = 'fire_transition_sfx.mp3';

    const hashNotificationId = (seed) => {
        const str = String(seed || 'faiora');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash || 1);
    };

    const emitInAppAlert = (alert) => {
        const enrichedAlert = { id: Date.now() + Math.random(), ...alert };
        inAppListeners.forEach(listener => {
            try {
                listener(enrichedAlert);
            } catch (error) {
                console.warn('In-app alert listener failed', error);
            }
        });
        return enrichedAlert;
    };

    const subscribeInApp = (listener) => {
        inAppListeners.add(listener);
        return () => inAppListeners.delete(listener);
    };

    const toNativePayload = (notificationLike) => {
        const notification = notificationLike?.notification || notificationLike || {};
        const extra = notification.extra || notification.data || {};
        return {
            id: notification.id,
            title: notification.title || extra.title || 'Faiora Alert',
            body: notification.body || extra.body || '',
            tag: notification.tag || extra.tag || `faiora-native-${notification.id || Date.now()}`,
            type: extra.type || 'generic',
            stage: extra.stage || '',
            taskId: extra.taskId || '',
            alarmId: extra.alarmId || '',
            time: extra.time || '',
            label: extra.label || '',
            dueDate: extra.dueDate || '',
            dueTime: extra.dueTime || '',
            native: true
        };
    };

    const ensureNativeChannels = async () => {
        const plugin = nativeLocalNotifications();
        if (!plugin || nativeChannelsReady) return;
        try {
            await plugin.registerActionTypes({
                types: [{
                    id: 'FAIORA_ALARM_ACTIONS',
                    actions: [
                        { id: 'stop', title: 'STOP', foreground: true, destructive: true },
                        { id: 'snooze', title: 'SNOOZE (5m)', foreground: false }
                    ]
                }]
            });

            await plugin.createChannel({
                id: QUICK_TASK_CHANNEL_ID,
                name: 'Quick Task Reminders',
                description: 'Due now, due in 1 hour, and due in 24 hours',
                importance: 5,
                visibility: 1,
                vibration: true,
                lights: true,
                lightColor: '#f97316',
                sound: NATIVE_NOTIFICATION_SOUND
            });
            await plugin.createChannel({
                id: ALARM_CHANNEL_ID,
                name: 'Faiora Alarms',
                description: 'High-priority alarms and wake-up reminders',
                importance: 5,
                visibility: 1,
                vibration: true,
                lights: true,
                lightColor: '#fb923c',
                sound: NATIVE_NOTIFICATION_SOUND
            });
            nativeChannelsReady = true;
        } catch (error) {
            console.warn('Native notification channel init failed', error);
        }
    };

    const ensureNativeListeners = async () => {
        const plugin = nativeLocalNotifications();
        if (!plugin || nativeListenersReady) return;
        try {
            await plugin.addListener('localNotificationReceived', notification => {
                emitInAppAlert(toNativePayload(notification));
            });
            await plugin.addListener('localNotificationActionPerformed', action => {
                emitInAppAlert(toNativePayload(action));
            });
            nativeListenersReady = true;
        } catch (error) {
            console.warn('Native notification listeners failed', error);
        }
    };

    const ensureNativeNotificationsReady = async () => {
        const plugin = nativeLocalNotifications();
        if (!plugin) return false;
        await ensureNativeChannels();
        await ensureNativeListeners();
        return true;
    };

    const cancelNativeNotifications = async (ids = []) => {
        const plugin = nativeLocalNotifications();
        if (!plugin || !ids.length) return;
        try {
            await plugin.cancel({ notifications: ids.map(id => ({ id })) });
        } catch (error) {
            console.warn('Native notification cancel failed', error);
        }
    };

    const removeDeliveredAlarmNotifications = async (alarmId = '') => {
        const plugin = nativeLocalNotifications();
        if (!plugin) return;
        try {
            const delivered = await plugin.getDeliveredNotifications();
            const matching = (delivered?.notifications || []).filter(notification => {
                const payload = notification?.data || notification?.extra || {};
                return payload?.type === 'alarm' && (!alarmId || payload.alarmId === alarmId);
            });
            if (matching.length) {
                await plugin.removeDeliveredNotifications({ notifications: matching });
            }
        } catch (error) {
            console.warn('Delivered alarm cleanup failed', error);
        }
    };

    const getDeliveredNotifications = async () => {
        const plugin = nativeLocalNotifications();
        if (!plugin) return [];
        try {
            const delivered = await plugin.getDeliveredNotifications();
            return delivered?.notifications || [];
        } catch (error) {
            console.warn('Delivered notification fetch failed', error);
            return [];
        }
    };

    const hasNativeNotificationPermission = async () => {
        const plugin = nativeLocalNotifications();
        if (!plugin) return false;
        try {
            const status = await plugin.checkPermissions();
            if (status?.display !== 'granted') return false;
            await ensureNativeNotificationsReady();
            return true;
        } catch (error) {
            console.warn('Native notification permission check failed', error);
            return false;
        }
    };

    const getTaskReminderTag = (taskId, stage) => {
        if (stage === 'due') return `faiora-due-${taskId}`;
        if (stage === '1h') return `faiora-1h-${taskId}`;
        if (stage === '24h') return `faiora-24h-${taskId}`;
        return `faiora-task-${stage}-${taskId}`;
    };
    const getTaskReminderId = (taskId, stage) => hashNotificationId(getTaskReminderTag(taskId, stage));
    
    const getAlarmNotificationTag = (alarmId) => `faiora-alarm-${alarmId}`;
    const getAlarmNotificationId = (alarmId) => hashNotificationId(getAlarmNotificationTag(alarmId));

    const hasAlarmOverlayPermission = () => {
        try {
            return !!nativeAlarmBridge()?.hasOverlayPermission?.();
        } catch (error) {
            console.warn('Native overlay permission check failed', error);
            return false;
        }
    };

    const requestAlarmOverlayPermission = () => {
        try {
            nativeAlarmBridge()?.requestOverlayPermission?.();
        } catch (error) {
            console.warn('Native overlay permission request failed', error);
        }
    };

    const consumeNativeAlarmEvents = () => {
        try {
            const raw = nativeAlarmBridge()?.consumeEvents?.();
            return JSON.parse(raw || '[]');
        } catch (error) {
            console.warn('Native alarm event consume failed', error);
            return [];
        }
    };

    const buildTaskReminderEntries = (task) => {
        if (!task || !task.dueDate || task.completed) return [];
        const dueTime = task.dueTime || '23:59';
        const dueDateTime = new Date(`${task.dueDate}T${dueTime}`);
        if (Number.isNaN(dueDateTime.getTime())) return [];

        const now = Date.now();
        const dueMs = dueDateTime.getTime();
        const taskName = formatTaskText(task.text || task.title || 'Task');
        const stages = [
            { stage: '24h', offsetMs: 24 * 60 * 60 * 1000, title: 'Task Reminder! 🔥', body: `⚡ Due in 24hrs: ${taskName}\n` },
            { stage: '1h', offsetMs: 60 * 60 * 1000, title: 'Task Reminder! 🔥', body: `⏳ Due in 1hr: ${taskName}\n` },
            { stage: 'due', offsetMs: 0, title: 'Task Reminder! 🔥', body: `📌 Due Now: ${taskName}\n` }
        ];

        return stages
            .map(entry => {
                const at = dueMs - entry.offsetMs;
                if (at <= now) return null;
                return {
                    ...entry,
                    at,
                    tag: getTaskReminderTag(task.id, entry.stage),
                    id: getTaskReminderId(task.id, entry.stage)
                };
            })
            .filter(Boolean);
    };

    const scheduleNativeTaskNotifications = async (task) => {
        const plugin = nativeLocalNotifications();
        if (!plugin) return false;
        const hasPermission = await hasNativeNotificationPermission();
        if (!hasPermission) return false;

        const entries = buildTaskReminderEntries(task);
        if (!entries.length) return true;

        try {
            await plugin.schedule({
                notifications: entries.map(entry => ({
                    id: entry.id,
                    title: entry.title,
                    body: entry.body,
                    channelId: QUICK_TASK_CHANNEL_ID,
                    // (2026-07-13) Use ic_stat_faiora for notification icon. Prev: ic_launcher
                    smallIcon: 'ic_stat_faiora',
                    schedule: { at: new Date(entry.at), allowWhileIdle: true },
                    extra: {
                        type: 'quick-task',
                        stage: entry.stage,
                        taskId: task.id,
                        tag: entry.tag,
                        title: entry.title,
                        body: entry.body,
                        dueDate: task.dueDate || '',
                        dueTime: task.dueTime || '',
                        taskText: formatTaskText(task.text || task.title || 'Task')
                    }
                }))
            });
            return true;
        } catch (error) {
            console.warn('Native quick-task scheduling failed', error);
            return false;
        }
    };

    const cancelNativeTaskNotifications = async (taskId = '') => {
        if (!taskId) return;
        await cancelNativeNotifications([
            getTaskReminderId(taskId, '24h'),
            getTaskReminderId(taskId, '1h'),
            getTaskReminderId(taskId, 'due')
        ]);
    };

    const scheduleAlarmNotification = async (alarm) => {
        const bridge = nativeAlarmBridge();
        if (bridge?.scheduleAlarm && alarm?.enabled && alarm?.time) {
            const target = getAlarmScheduleDate(alarm);
            if (target) {
                try {
                    const scheduled = bridge.scheduleAlarm(
                        String(alarm.id || ''),
                        String(alarm.label || 'Alarm'),
                        String(alarm.time || ''),
                        target.getTime(),
                        !!alarm.repeatDaily
                    );
                    if (scheduled) return true;
                } catch (error) {
                    console.warn('Native exact alarm bridge scheduling failed', error);
                }
            }
        }
        const plugin = nativeLocalNotifications();
        if (!plugin || !alarm || !alarm.enabled || !alarm.time) return false;
        const hasPermission = await hasNativeNotificationPermission();
        if (!hasPermission) return false;

        const target = getAlarmScheduleDate(alarm);
        if (!target) return false;

        try {
            await plugin.schedule({
                notifications: [{
                    id: getAlarmNotificationId(alarm.id),
                    title: 'Alarm Ringing',
                    body: `${alarm.label || 'Alarm'} • ${alarm.time}`,
                    channelId: ALARM_CHANNEL_ID,
                    actionTypeId: 'FAIORA_ALARM_ACTIONS',
                    ongoing: true,
                    autoCancel: false,
                    // (2026-07-13) Use ic_stat_faiora for notification icon. Prev: ic_launcher
                    smallIcon: 'ic_stat_faiora',
                    schedule: { at: target, allowWhileIdle: true },
                    extra: {
                        type: 'alarm',
                        alarmId: alarm.id,
                        label: alarm.label || 'Alarm',
                        time: alarm.time,
                        repeatDaily: !!alarm.repeatDaily,
                        tag: getAlarmNotificationTag(alarm.id),
                        title: 'Alarm Ringing',
                        body: `${alarm.label || 'Alarm'} • ${alarm.time}`
                    }
                }]
            });
            return true;
        } catch (error) {
            console.warn('Native alarm scheduling failed', error);
            return false;
        }
    };

    const cancelAlarmNotification = async (alarmId = '') => {
        if (!alarmId) return;
        try {
            nativeAlarmBridge()?.cancelAlarm?.(String(alarmId));
        } catch (error) {
            console.warn('Native exact alarm bridge cancel failed', error);
        }
        await cancelNativeNotifications([getAlarmNotificationId(alarmId)]);
        await removeDeliveredAlarmNotifications(alarmId);
    };

    const requestPermission = async () => {
        const nativePlugin = nativeLocalNotifications();
        if (nativePlugin) {
            try {
                const current = await nativePlugin.checkPermissions();
                let status = current?.display || 'prompt';
                if (status !== 'granted') {
                    const requested = await nativePlugin.requestPermissions();
                    status = requested?.display || status;
                }
                if (status === 'granted') {
                    await ensureNativeNotificationsReady();
                }
                return status;
            } catch (err) {
                console.error('Error requesting native notification permission:', err);
                return 'unsupported';
            }
        }

        if (!('Notification' in window)) return 'unsupported';
        try {
            const status = await Notification.requestPermission();
            if (status === 'granted') {
                registerFCMToken();
            }
            return status;
        } catch (err) {
            console.error('Error requesting notification permission:', err);
            return hasNotificationApi ? Notification.permission : 'unsupported';
        }
    };

    const testNotification = async () => {
        const nativePlugin = nativeLocalNotifications();
        if (nativePlugin) {
            const status = await requestPermission();
            if (status !== 'granted') return;
            await ensureNativeNotificationsReady();
            playNotifSFX();
            await nativePlugin.schedule({
                notifications: [{
                    id: hashNotificationId('faiora-test'),
                    title: "🔥 Faiora Test Alert",
                    body: "Your native APK notifications are working.",
                    channelId: 'faiora-quick-tasks',
                    schedule: { at: new Date(Date.now() + 250), allowWhileIdle: true },
                    extra: { type: 'generic', tag: 'faiora-test' }
                }]
            });
            return;
        }

        if (!hasNotificationApi || Notification.permission !== 'granted') {
            const res = await requestPermission();
            if (res !== 'granted') return;
        }
        
        playNotifSFX();
        const title = "🔥 Faiora Test Alert";
        const body = "Your notification system is working! This is a local test.";
        
        if (swRegistration) {
            swRegistration.showNotification(title, { body, tag: 'faiora-test', renotify: true });
        } else {
            new Notification(title, { body });
        }
        registerFCMToken();
    };

    const registerFCMToken = async () => {
        try {
            const messaging = firebase.messaging();
            let reg = swRegistration;
            if (!reg && 'serviceWorker' in navigator) {
                reg = await navigator.serviceWorker.ready;
            }

            const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });

            if (token && auth.currentUser) {
                const userId = auth.currentUser.uid;
                const tokenRef = db.collection('fcmTokens').doc(userId);
                const doc = await tokenRef.get();

                if (doc.exists) {
                    const existing = doc.data().tokens || [];
                    if (!existing.includes(token)) {
                        await tokenRef.update({
                            tokens: firebase.firestore.FieldValue.arrayUnion(token),
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } else {
                    await tokenRef.set({
                        tokens: [token],
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                console.log('🔔 FCM token verified/registered');
            }
        } catch (err) {
            console.warn('FCM token registration failed:', err);
        }
    };

    const playNotifSFX = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playTone = (freq, start, dur, vol = 0.15) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                gain.gain.setValueAtTime(vol, ctx.currentTime + start);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + dur);
            };
            playTone(1046.50, 0, 0.15, 0.12); 
            playTone(1318.51, 0.12, 0.15, 0.1); 
            playTone(1567.98, 0.24, 0.25, 0.08); 
        } catch(e) {}
    };

    const playAlarmSFX = () => {
        try {
            if (window._faiora_alarm_audio) {
                if (window._faiora_alarm_audio.paused) {
                    window._faiora_alarm_audio.play().catch(() => {
                        if (!window._faiora_audio_resume_fn) {
                            window._faiora_audio_resume_fn = () => {
                                if (window._faiora_alarm_audio) window._faiora_alarm_audio.play().catch(() => {});
                                document.removeEventListener('click', window._faiora_audio_resume_fn);
                                document.removeEventListener('keydown', window._faiora_audio_resume_fn);
                                window._faiora_audio_resume_fn = null;
                            };
                            document.addEventListener('click', window._faiora_audio_resume_fn);
                            document.addEventListener('keydown', window._faiora_audio_resume_fn);
                        }
                    });
                }
                return;
            }
            const alarmUrl = 'https://assets.mixkit.co/music/preview/mixkit-morning-sun-wake-up-alarm-2688.mp3';
            const audio = new Audio(alarmUrl);
            audio.loop = true;
            audio.volume = 0.9;
            window._faiora_alarm_audio = audio;
            
            audio.play().catch(() => {
                if (!window._faiora_audio_resume_fn) {
                    window._faiora_audio_resume_fn = () => {
                        if (window._faiora_alarm_audio) window._faiora_alarm_audio.play().catch(() => {});
                        document.removeEventListener('click', window._faiora_audio_resume_fn);
                        document.removeEventListener('keydown', window._faiora_audio_resume_fn);
                        window._faiora_audio_resume_fn = null;
                    };
                    document.addEventListener('click', window._faiora_audio_resume_fn);
                    document.addEventListener('keydown', window._faiora_audio_resume_fn);
                }
            });
        } catch (e) { console.warn('Alarm SFX failed', e); }
    };

    const stopAlarmSFX = () => {
        if (window._faiora_audio_resume_fn) {
            document.removeEventListener('click', window._faiora_audio_resume_fn);
            document.removeEventListener('keydown', window._faiora_audio_resume_fn);
            window._faiora_audio_resume_fn = null;
        }
        if (window._faiora_alarm_audio) {
            window._faiora_alarm_audio.pause();
            window._faiora_alarm_audio.currentTime = 0;
            window._faiora_alarm_audio = null;
        }
    };

    const playCheckSFX = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const playTone = (freq, start, dur, vol = 0.1) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                gain.gain.setValueAtTime(vol, ctx.currentTime + start);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + dur);
            };
            playTone(1046.50, 0, 0.1, 0.08); 
            playTone(1318.51, 0.05, 0.15, 0.06); 
        } catch(e) {}
    };

    const formatNotifTime = (dateObj) => {
        let hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const minStr = minutes === 0 ? '' : ':' + String(minutes).padStart(2, '0');
        return `${hours}${minStr}${ampm}`;
    };

    const sendNotification = async (title, body, tag, extra = {}) => {
        const nativePlugin = nativeLocalNotifications();
        if (nativePlugin) {
            const permission = await requestPermission();
            if (permission !== 'granted') return;
            await ensureNativeNotificationsReady();
            playNotifSFX();
            await nativePlugin.schedule({
                notifications: [{
                    id: hashNotificationId(tag),
                    title, body,
                    channelId: extra.type === 'alarm' ? ALARM_CHANNEL_ID : QUICK_TASK_CHANNEL_ID,
                    schedule: { at: new Date(Date.now() + 200), allowWhileIdle: true },
                    extra: { ...extra, tag }
                }]
            });
            return;
        }
        if (!swRegistration) return;
        playNotifSFX();
        swRegistration.showNotification(title, { body, tag, renotify: true });
    };

    const scheduleForTask = async (task) => {
        if (!task || !task.dueDate || task.completed) return;
        cancelForTask(task.id);
        const nativeScheduled = await scheduleNativeTaskNotifications(task);
        if (nativeScheduled) return;

        const dueTime = task.dueTime || '23:59';
        const dueDateTime = new Date(`${task.dueDate}T${dueTime}`);
        if (isNaN(dueDateTime.getTime())) return;

        const now = Date.now();
        const dueMs = dueDateTime.getTime();
        const taskTimers = [];

        if (dueMs > now) {
            taskTimers.push(setTimeout(() => sendNotification(`Task Reminder! 🔥`, `📌 Due Now: ${formatTaskText(task.text)}\n`, `faiora-due-${task.id}`), dueMs - now));
        }
        const oneHourBefore = dueMs - (1 * 60 * 60 * 1000);
        if (oneHourBefore > now) {
            taskTimers.push(setTimeout(() => sendNotification(`Task Reminder! 🔥`, `⏳ Due in 1hr: ${formatTaskText(task.text)}\n`, `faiora-1h-${task.id}`), oneHourBefore - now));
        }
        const twentyFourHoursBefore = dueMs - (24 * 60 * 60 * 1000);
        if (twentyFourHoursBefore > now) {
            taskTimers.push(setTimeout(() => sendNotification(`Task Reminder! 🔥`, `⚡ Due in 24hrs: ${formatTaskText(task.text)}\n`, `faiora-24h-${task.id}`), twentyFourHoursBefore - now));
        }

        if (taskTimers.length > 0) timers.set(task.id, taskTimers);
    };

    const cancelForTask = (taskId) => {
        const existing = timers.get(taskId);
        if (existing) {
            existing.forEach(id => clearTimeout(id));
            timers.delete(taskId);
        }
        cancelNativeTaskNotifications(taskId);
    };

    return {
        isSwReady: () => swReady,
        requestPermission,
        testNotification,
        registerFCMToken,
        scheduleForTask,
        cancelForTask,
        rescheduleAll: (tasks) => {
            timers.forEach(t => t.forEach(id => clearTimeout(id)));
            timers.clear();
            if (tasks) tasks.filter(t => t.dueDate && !t.completed).forEach(t => scheduleForTask(t));
        },
        playCheckSFX,
        playNotifSFX,
        playAlarmSFX,
        stopAlarmSFX,
        hasNativeLocalNotifications,
        hasNativeAlarmBridge,
        hasAlarmOverlayPermission,
        requestAlarmOverlayPermission,
        consumeNativeAlarmEvents,
        scheduleAlarmNotification,
        cancelAlarmNotification,
        removeDeliveredAlarmNotifications,
        getDeliveredNotifications,
        show: (title, body, tag = 'faiora-generic', extra = {}) => sendNotification(title, body, tag, extra)
    };
})();
export default FaioraNotifications;
