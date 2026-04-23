// ==========================================================================
// FAIORA SERVICE WORKER - Offline App Shell + FCM Background Push
// ==========================================================================
/*
 * Faiora Service Worker (sw.js)
 * v1.1.0 - Offline shell/runtime caching plus background notifications
 */

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDktbyVgI7AAwaY2u-KsWBRwLZawy0949s",
    authDomain: "faiora-24f4a.firebaseapp.com",
    projectId: "faiora-24f4a",
    storageBucket: "faiora-24f4a.firebasestorage.app",
    messagingSenderId: "752265363994",
    appId: "1:752265363994:web:78795bfad67d2d541e07a3",
    measurementId: "G-B0DWSL1JMV"
});

const messaging = firebase.messaging();
const CACHE_VERSION = 'faiora-cache-v2026-04-22-3';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
    './',
    'index.html',
    'style.css',
    'manifest.json',
    'applogo.png',
    'logo.png',
    'alarm_ringtone.mp3',
    'fire_transition_sfx.mp3',
    'fire-wipe-spritesheet.png',
    'fire_bg_video.mp4',
    'googled6ec6ba0775bed83.html',
    'privacy.html',
    'share_note.html',
    'terms.html',
    'assets/icon.png',
    'assets/icon-only.png'
];
const RUNTIME_HOSTS = new Set([
    'unpkg.com',
    'cdn.tailwindcss.com',
    'www.gstatic.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
]);

const isCacheableRequest = (request) => {
    if (!request || request.method !== 'GET') return false;
    const url = new URL(request.url);
    if (url.origin === self.location.origin) return true;
    return RUNTIME_HOSTS.has(url.hostname);
};

const cacheResponse = async (cacheName, request, response) => {
    if (!response || response.status >= 400) return response;
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    return response;
};

messaging.onBackgroundMessage((payload) => {
    if (payload.data) {
        // [FIX 2026-04-22] Skip background notification for alarms as overlay/native bridge handles it
        if (payload.data.type === 'alarm') {
            console.log("🔔 [FCM] Skipping background notification for alarm (handled by overlay)");
            return;
        }

        const title = payload.data.title || 'Faiora Reminder';
        const body = payload.data.body || 'You have a task due!';
        const taskId = payload.data.taskId || Date.now();

        return self.registration.showNotification(title, {
            body,
            icon: 'applogo.png',
            badge: 'applogo.png',
            tag: 'faiora-' + taskId,
            renotify: true,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'Open App' },
                { action: 'dismiss', title: 'Dismiss' }
            ],
            data: {
                url: self.location.origin,
                taskId
            }
        });
    }
});

self.addEventListener('message', (event) => {
    const data = event.data;

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

    if (data && data.type === 'CANCEL_NOTIFICATION') {
        self.registration.getNotifications({ tag: data.tag }).then(notifications => {
            notifications.forEach(notification => notification.close());
        });
    }
});

function showLocalNotification(title, body, tag) {
    self.registration.showNotification(title, {
        body,
        icon: 'applogo.png',
        badge: 'applogo.png',
        tag,
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
        ],
        data: {
            url: self.location.origin
        }
    });
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || self.location.origin;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if ((client.url.includes('index.html') || client.url.includes('Faiora')) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (!isCacheableRequest(request)) return;

    const requestUrl = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            const cache = await caches.open(SHELL_CACHE);
            const cachedShell = await cache.match('index.html');
            const networkFetch = fetch(request)
                .then(response => cacheResponse(SHELL_CACHE, 'index.html', response))
                .catch(() => cachedShell || Response.error());
            event.waitUntil(networkFetch.catch(() => {}));

            if (cachedShell) return cachedShell;
            const fallback = await cache.match('./');
            return fallback || networkFetch;
        })());
        return;
    }

    event.respondWith((async () => {
        const cacheName = requestUrl.origin === self.location.origin ? SHELL_CACHE : RUNTIME_CACHE;
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);

        const networkFetch = fetch(request)
            .then(response => cacheResponse(cacheName, request, response))
            .catch(() => cached || Response.error());

        return cached || networkFetch;
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys
                .filter(key => key.startsWith('faiora-cache-') && ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
                .map(key => caches.delete(key))
        ))
    );
});
