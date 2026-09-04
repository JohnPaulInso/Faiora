// ==========================================================================
// FAIORA SERVICE WORKER — FCM Background Push + Local Notifications
// ==========================================================================
/*
 * Faiora Service Worker (sw.js)
 * v1.0.4 - Added Data-only payload support for reliable background notifications
 */
// This service worker handles:
//   1. FCM background push messages (when app is closed)
//   2. Local notification display (when app is open)
//   3. Notification click → open/focus the app
//   4. Notification dismiss action
//
// LABEL: SW-FCM — Firebase Cloud Messaging integration
// LABEL: SW-LOCAL — Local notification scheduling
// LABEL: SW-CLICK — Notification click handling
// ==========================================================================

// --------------------------------------------------------------------------
// SECTION: SW-FCM — Import Firebase Messaging for background push
// --------------------------------------------------------------------------
// (2026-07-13) Use local vendor scripts for offline support. Prev: gstatic remote
importScripts('assets/vendor/firebase-app-compat.js');
importScripts('assets/vendor/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// NOTE: This must match the config in index.html
firebase.initializeApp({
    apiKey: "AIzaSyDktbyVgI7AAwaY2u-KsWBRwLZawy0949s",
    authDomain: "faiora-24f4a.firebaseapp.com",
    projectId: "faiora-24f4a",
    storageBucket: "faiora-24f4a.firebasestorage.app",
    messagingSenderId: "752265363994",
    appId: "1:752265363994:web:78795bfad67d2d541e07a3",
    measurementId: "G-B0DWSL1JMV"
});

// Get Firebase Messaging instance for background message handling
const messaging = firebase.messaging();

// --------------------------------------------------------------------------
// SECTION: SW-FCM — Handle background push messages from Cloud Functions
// --------------------------------------------------------------------------
// This fires when a push message arrives and the app is NOT in the foreground.
// The notification is automatically shown by Firebase SDK if a 'notification'
// payload is present. This handler is for data-only messages or custom logic.
messaging.onBackgroundMessage((payload) => {
    console.log('🔥 [SW] Background message received:', payload);

    // Handle Data-only messages from Cloud Functions
    if (payload.data) {
        const title = payload.data.title || '🔥 Faiora Reminder';
        const body = payload.data.body || 'You have a task due!';
        const taskId = payload.data.taskId || Date.now();

        return self.registration.showNotification(title, {
            body: body,
            icon: 'logo.png',
            badge: 'logo.png',
            tag: 'faiora-' + taskId,
            renotify: true,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            // (2026-07-13) Pull down quick tap actions. Prev: open/dismiss
            actions: [
                { action: 'complete_task', title: '✓ Complete' },
                { action: 'snooze_1h', title: '+1 Hour' }
            ],
            data: {
                url: self.location.origin,
                taskId: taskId
            }
        });
    }
});

// --------------------------------------------------------------------------
// SECTION: SW-LOCAL — Handle local notification messages from main app
// --------------------------------------------------------------------------
// The main app sends messages via postMessage() for client-side scheduling
// (works as a fallback when the app is open)
self.addEventListener('message', (event) => {
    const data = event.data;

    // LABEL: SW-LOCAL-SCHEDULE — Schedule a local notification
    if (data && data.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, tag, timestamp } = data;
        const delay = timestamp - Date.now();

        if (delay <= 0) {
            showLocalNotification(title, body, tag);
        } else {
            setTimeout(() => {
                showLocalNotification(title, body, tag);
            }, delay);
        }
    }

    // LABEL: SW-LOCAL-CANCEL — Cancel/close a notification
    if (data && data.type === 'CANCEL_NOTIFICATION') {
        self.registration.getNotifications({ tag: data.tag }).then(notifications => {
            notifications.forEach(n => n.close());
        });
    }
});

// --------------------------------------------------------------------------
// SECTION: SW-LOCAL — Show a local notification
// --------------------------------------------------------------------------
function showLocalNotification(title, body, tag) {
    self.registration.showNotification(title, {
        body: body,
        icon: 'logo.png',
        badge: 'logo.png',
        tag: tag,
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        // (2026-07-13) Pull down quick tap actions. Prev: open/dismiss
        actions: [
            { action: 'complete_task', title: '✓ Complete' },
            { action: 'snooze_1h', title: '+1 Hour' }
        ],
        data: {
            url: self.location.origin
        }
    });
}

// --------------------------------------------------------------------------
// SECTION: SW-CLICK — Handle notification tap/click
// --------------------------------------------------------------------------
// When user taps the notification:
//   - "Open App" action or tap body → opens/focuses the app
//   - "Dismiss" action → just closes the notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // If user clicked "Dismiss", do nothing
    if (event.action === 'dismiss') return;

    // (2026-07-13) Dispatch notification actions to client window. Prev: open only
    if (event.action === 'complete_task' || event.action === 'snooze_1h') {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                const taskId = event.notification.data?.taskId;
                for (const client of clientList) {
                    client.postMessage({
                        type: 'NOTIFICATION_ACTION',
                        action: event.action,
                        taskId: taskId
                    });
                }
            })
        );
        return;
    }

    // Otherwise, open or focus the app
    const targetUrl = event.notification.data?.url || self.location.origin;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // If the app is already open in a tab, focus it
            for (const client of clientList) {
                if ((client.url.includes('index.html') || client.url.includes('Faiora')) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new browser tab/window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// --------------------------------------------------------------------------
// SECTION: SW-LIFECYCLE — Install, Activate & Offline Cache
// --------------------------------------------------------------------------
// (2026-07-13) Cache app shell and vendor assets for offline use. Prev: none
const CACHE_NAME = 'faiora-offline-v1';
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './logo.png',
    './tailwind.cdn.js',
    'assets/vendor/react.production.min.js',
    'assets/vendor/react-dom.production.min.js',
    'assets/vendor/history.production.min.js',
    'assets/vendor/react-router.production.min.js',
    'assets/vendor/react-router-dom.production.min.js',
    'assets/vendor/babel.min.js',
    'assets/vendor/firebase-app-compat.js',
    'assets/vendor/firebase-auth-compat.js',
    'assets/vendor/firebase-firestore-compat.js',
    'assets/vendor/firebase-messaging-compat.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;
    if (url.origin.includes('firestore.googleapis.com') || url.origin.includes('identitytoolkit')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((res) => {
                if (res && res.status === 200 && (url.origin === self.location.origin || url.pathname.endsWith('.js'))) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return res;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html') || caches.match('./');
                }
            });
        })
    );
});
