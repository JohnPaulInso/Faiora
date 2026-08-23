import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import React from 'react';

// LABEL: STARTUP-SCRIPT-OVERRIDE — Disabled startup fallback script
// FIX 2026-04-15: Removed loaders for a more direct app launch experience.
(function setupStartupFallback() {
    let fired = false;
    const trigger = () => {
        if (fired) return;
        fired = true;
        // LABEL: FAIORA-APP-READY-TRIGGER — Triggers app fade-in
        document.body.classList.add('faiora-react-ready');
        document.documentElement.classList.add('faiora-app-loaded');
    };

    window.addEventListener('faiora-app-ready', trigger);

    // SAFETY FALLBACK: If React/Auth takes too long, force show the app anyway
    // FIX 2026-04-16: Increased to 6s to allow more time for Firestore sync
    // FIX 2026-04-17: Reduced to 2.5s for faster feel, ensuring app reveal even if sync is slow [Performance Optimization]
    setTimeout(trigger, 2500); // setupStartupFallback — Safety timeout for app reveal [FIX 2026-04-17]
})();

// LABEL: ROUTING-UTILITIES — Helpers for path normalization
const normalizeRouteLocation = (loc) => {
    if (!loc || typeof loc !== 'object') return { pathname: '/', search: '', hash: '', state: null, key: 'default' };
    return { ...loc, pathname: loc.pathname && loc.pathname !== '' ? loc.pathname : '/' };
};

// Capacitor / in-app WebView: empty or bare "#" hash yields no Route match → blank UI after login.
(function ensureHashDefault() {
    try {
        const h = window.location.hash;
        if (h === '' || h === '#') {
            window.location.hash = '#/';
        }
    } catch (e) { /* ignore */ }
})();

// LABEL: DATE-UTILITIES — Core formatting and parsing helpers
export const formatDateLocal = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const formatTaskText = (text) => {
    if (!text) return '';
    const t = text.trim();
    if (t.length === 0) return '';
    return t.split(/\s+/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

// LABEL: THEME-UTILITIES — Maps theme IDs to Tailwind CSS classes
export const getThemeClasses = (themeId) => {
    const maps = {
        'amber':    { bg: 'bg-amber-50',    border: 'border-amber-200/60',   icon: 'text-amber-600/60',   text: 'text-amber-950',   sub: 'text-amber-900/60',   label: 'text-amber-800',   labelBg: 'bg-amber-200/50',   chipBg: 'bg-amber-100', chipBorder: 'border-amber-300/40' },
        'orange':   { bg: 'bg-orange-50',   border: 'border-orange-200/60',  icon: 'text-orange-600/60',  text: 'text-orange-950',  sub: 'text-orange-900/60',  label: 'text-orange-800',  labelBg: 'bg-orange-200/50',  chipBg: 'bg-orange-100', chipBorder: 'border-orange-300/40' },
        'peach':    { bg: 'bg-orange-50',    border: 'border-orange-200/60',  icon: 'text-orange-500/60',  text: 'text-orange-950',  sub: 'text-orange-900/60',  label: 'text-orange-800',  labelBg: 'bg-orange-100/60',  chipBg: 'bg-orange-100', chipBorder: 'border-orange-200/50' },
        'yellow':   { bg: 'bg-yellow-50',   border: 'border-yellow-200/60',  icon: 'text-yellow-700/60',  text: 'text-yellow-950',  sub: 'text-yellow-900/60',  label: 'text-yellow-800',  labelBg: 'bg-yellow-200/50',  chipBg: 'bg-yellow-100', chipBorder: 'border-yellow-300/40' },
        'glass':    { bg: 'bg-white/5',      border: 'border-white/10',       icon: 'text-primary/60',     text: 'text-cream-light', sub: 'text-cream-light/50', label: 'text-cream-light/80', labelBg: 'bg-white/10',    chipBg: 'bg-white/10',  chipBorder: 'border-white/15' },
        'sage':     { bg: 'bg-emerald-50',   border: 'border-emerald-200/60', icon: 'text-emerald-600/60', text: 'text-emerald-950', sub: 'text-emerald-900/60', label: 'text-emerald-800', labelBg: 'bg-emerald-200/50', chipBg: 'bg-emerald-100', chipBorder: 'border-emerald-300/40' },
        'sky':      { bg: 'bg-sky-50',       border: 'border-sky-200/60',     icon: 'text-sky-600/60',     text: 'text-sky-950',     sub: 'text-sky-900/60',     label: 'text-sky-800',     labelBg: 'bg-sky-200/50',     chipBg: 'bg-sky-100',    chipBorder: 'border-sky-300/40' },
        'lavender': { bg: 'bg-indigo-50',    border: 'border-indigo-200/60',  icon: 'text-indigo-600/60',  text: 'text-indigo-950',  sub: 'text-indigo-900/60',  label: 'text-indigo-800',  labelBg: 'bg-indigo-200/50',  chipBg: 'bg-indigo-100', chipBorder: 'border-indigo-300/40' },
        'rose':     { bg: 'bg-rose-50',      border: 'border-rose-200/60',    icon: 'text-rose-600/60',    text: 'text-rose-950',    sub: 'text-rose-900/60',    label: 'text-rose-800',    labelBg: 'bg-rose-200/50',    chipBg: 'bg-rose-100',   chipBorder: 'border-rose-300/40' },
        'slate':    { bg: 'bg-slate-100',    border: 'border-slate-300/60',   icon: 'text-slate-600/60',   text: 'text-slate-950',   sub: 'text-slate-700/60',   label: 'text-slate-700',   labelBg: 'bg-slate-200/50',   chipBg: 'bg-slate-200',  chipBorder: 'border-slate-300/40' },
        'teal':     { bg: 'bg-teal-50',      border: 'border-teal-200/60',    icon: 'text-teal-600/60',    text: 'text-teal-950',    sub: 'text-teal-900/60',    label: 'text-teal-800',    labelBg: 'bg-teal-200/50',    chipBg: 'bg-teal-100',   chipBorder: 'border-teal-300/40' },
        'indigo':   { bg: 'bg-violet-50',    border: 'border-violet-200/60',  icon: 'text-violet-600/60',  text: 'text-violet-950',  sub: 'text-violet-900/60',  label: 'text-violet-800',  labelBg: 'bg-violet-200/50',  chipBg: 'bg-violet-100', chipBorder: 'border-violet-300/40' },
        'warm1':    { bg: 'bg-[#e9d9c4]',    border: 'border-[#c4a882]/60',   icon: 'text-[#8b6914]/60',  text: 'text-[#4a3520]',   sub: 'text-[#6b5240]/70',   label: 'text-[#7a5c3a]',   labelBg: 'bg-[#d4c0a4]/50',   chipBg: 'bg-[#dccdb5]',  chipBorder: 'border-[#c4a882]/40' },
        'warm2':    { bg: 'bg-[#e9e5d8]',    border: 'border-[#c8c3b2]/60',   icon: 'text-[#7a7260]/60',  text: 'text-[#3d3a2e]',   sub: 'text-[#6b6758]/70',   label: 'text-[#6b6250]',   labelBg: 'bg-[#d5d0c2]/50',   chipBg: 'bg-[#ddd8cb]',  chipBorder: 'border-[#c8c3b2]/40' },
        'warm3':    { bg: 'bg-[#e9e2da]',    border: 'border-[#c8bdb2]/60',   icon: 'text-[#8b7060]/60',  text: 'text-[#3d352e]',   sub: 'text-[#6b5f55]/70',   label: 'text-[#7a6555]',   labelBg: 'bg-[#d5ccc2]/50',   chipBg: 'bg-[#ddd6cd]',  chipBorder: 'border-[#c8bdb2]/40' },
        'warm4':    { bg: 'bg-[#e8c59d]',    border: 'border-[#c4a06a]/60',   icon: 'text-[#8b6914]/60',  text: 'text-[#4a3520]',   sub: 'text-[#6b5030]/70',   label: 'text-[#7a5520]',   labelBg: 'bg-[#d4ae80]/50',   chipBg: 'bg-[#ddb888]',  chipBorder: 'border-[#c4a06a]/40' },
        'warm5':    { bg: 'bg-[#e9e6d5]',    border: 'border-[#c8c4aa]/60',   icon: 'text-[#7a7250]/60',  text: 'text-[#3d3a2a]',   sub: 'text-[#6b6548]/70',   label: 'text-[#6b6040]',   labelBg: 'bg-[#d5d1bb]/50',   chipBg: 'bg-[#dddac5]',  chipBorder: 'border-[#c8c4aa]/40' }
    };
    return maps[themeId] || maps['peach'];
};

export const formatReminderDate = (dateStr) => {
    try {
        const d = parseDateString(dateStr);
        if (!d || isNaN(d.getTime())) return dateStr;
        const month = d.toLocaleString('en-US', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${month} ${day} • ${time}`;
    } catch(e) { return dateStr; }
};

export const formatDateMinimal = (dateStr) => {
    try {
        const d = parseDateString(dateStr);
        if (!d || isNaN(d.getTime())) return dateStr;
        const month = d.toLocaleString('en-US', { month: 'short' });
        const day = d.getDate();
        return `${month} ${day}`;
    } catch(e) { return dateStr; }
};

export const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    // Remove <hr> tags specifically and other block-level separations
    const clean = html.replace(/<hr[^>]*>/gi, ' ');
    const formatted = clean.replace(/<\/div>| <\/p>|<\/h1>|<\/h2>|<\/h3>|<\/li>|<\/br>|<br\/?>/gi, ' ');
    tmp.innerHTML = formatted;
    return (tmp.textContent || tmp.innerText || '').trim().replace(/\s+/g, ' ');
};

export const formatTitle = (text) => {
    if (!text) return '';
    const t = text.trim();
    if (t.length === 0) return '';
    const limited = t.slice(0, 24);
    // If already all caps (and contains at least one letter), keep it. 
    // Otherwise, apply Title Case to ensure it's never all lowercase.
    if (limited === limited.toUpperCase() && /[A-Z]/.test(limited)) {
        return limited;
    }
    return limited.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

export const hashPIN = async (pin) => {
    const utf8 = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('');
};

export const verifyPIN = async (pin, storedHash) => {
    const hashed = await hashPIN(pin);
    return hashed === storedHash;
};

export const parseDateString = (str) => {
    if (!str) return null;
    if (str.includes('T')) return new Date(str);
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

// LABEL: ALARM-UTILITIES — Critical date calculation helpers for scheduling & UI readouts
export const getAlarmScheduleDate = (timeOrAlarm, daysInput) => {
    let time = '';
    let days = [];

    if (typeof timeOrAlarm === 'object' && timeOrAlarm !== null) {
        time = timeOrAlarm.time;
        days = timeOrAlarm.days || [];
    } else {
        time = timeOrAlarm;
        days = daysInput || [];
    }

    if (!time) return null;
    const [hours, minutes] = String(time).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    
    let target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, start checking from tomorrow
    if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
    }

    // If specific days are selected, find the next valid day
    if (days && days.length > 0) {
        let loopLimit = 8; // Max 1 week search
        while (!days.includes(target.getDay()) && loopLimit > 0) {
            target.setDate(target.getDate() + 1);
            loopLimit--;
        }
    }
    
    return target;
};

export const getWaitTimeText = (targetDate) => {
    if (!targetDate) return '';
    const diffMs = targetDate.getTime() - Date.now();
    if (diffMs <= 0) return 'Alarm ringing';
    
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) {
        const remHrs = diffHrs % 24;
        return `Alarm in ${diffDays} day${diffDays > 1 ? 's' : ''} ${remHrs > 0 ? `and ${remHrs} hour${remHrs > 1 ? 's' : ''}` : ''}`;
    }
    if (diffHrs > 0) {
        const remMin = diffMin % 60;
        return `Alarm in ${diffHrs} hour${diffHrs > 1 ? 's' : ''} ${remMin > 0 ? `and ${remMin} minute${remMin > 1 ? 's' : ''}` : ''}`;
    }
    return `Alarm in ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
};

export const formatDueDate = (date, time) => {
    if (!date) return { label: '', isOverdue: false, isNearDeadline: false, isDueTomorrow: false };
    const d = parseDateString(date);
    const now = new Date();
    const today = formatDateLocal(now);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateLocal(tomorrow);
    
    // Check for Overdue
    let isOverdue = false;
    const target = parseDateString(date);
    if (time) {
        const [h, m] = time.split(':');
        target.setHours(parseInt(h), parseInt(m), 0, 0);
    } else {
        target.setHours(23, 59, 59, 999);
    }
    
    if (now > target) {
        isOverdue = true;
    }

    let isDueTomorrow = false;
    if (date === today) {
        let label = isOverdue ? 'Past due' : 'Due Today';
        let isNearDeadline = false;
        if (time) {
            const [h, m] = time.split(':');
            const diffMs = target - now;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            if (diffHours > 0 && diffHours < 1) {
                const mins = Math.max(1, Math.ceil(diffHours * 60));
                isNearDeadline = true;
                label = `Due in ${mins} MINS`;
            } else if (diffHours > 0 && diffHours <= 4) {
                isNearDeadline = true;
                label = `Due in ${Math.ceil(diffHours)}${Math.ceil(diffHours) === 1 ? ' HR' : ' HRS'}`;
            } else if (diffHours > 0 && diffHours <= 8) {
                label = `Due in ${Math.ceil(diffHours)}${Math.ceil(diffHours) === 1 ? ' HR' : ' HRS'}`;
            }
            
            const hours = parseInt(h);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h12 = hours % 12 || 12;
            label += ` • ${h12}:${m} ${ampm}`;
        }
        return { label, isOverdue, isNearDeadline, isDueTomorrow };
    }
    
    if (date === tomorrowStr) {
        let label = isOverdue ? 'Past due' : 'Due Tomorrow';
        let isNearDeadline = false;
        if (time) {
            const [h, m] = time.split(':');
            const tgt = parseDateString(date);
            tgt.setHours(parseInt(h), parseInt(m), 0, 0);
            const diffMs = tgt - now;
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours > 0 && diffHours < 1) {
                const mins = Math.max(1, Math.ceil(diffHours * 60));
                isNearDeadline = true;
                label = `Due in ${mins} MINS`;
            } else if (diffHours > 0 && diffHours <= 4) {
                isNearDeadline = true;
                label = `Due in ${Math.ceil(diffHours)}${Math.ceil(diffHours) === 1 ? ' HR' : ' HRS'}`;
            }
            const hours = parseInt(h);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const h12 = hours % 12 || 12;
            label += ` • ${h12}:${m} ${ampm}`;
        }
        isDueTomorrow = true;
        return { label, isOverdue, isNearDeadline, isDueTomorrow };
    }

    const options = { month: 'short', day: 'numeric' };
    let str = d.toLocaleDateString('en-US', options);
    if (time) {
        const [h, m] = time.split(':');
        const hours = parseInt(h);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        str += ` • ${h12}:${m} ${ampm}`;
    }
    return { label: isOverdue ? `Past due • ${str}` : str, isOverdue, isNearDeadline: false, isDueTomorrow: false };
};

// LABEL: ALARM-CONSTANTS — Fixed arrays for Samsung-style wheel picker
export const ALARM_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
export const ALARM_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
export const ALARM_AMPM = ['AM', 'PM'];

// LABEL: formatTime — Converts 24h time string (HH:mm) to 12h AM/PM format
export const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = String(time).split(':');
    const hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${ampm}`;
};

// LABEL: TASK-UTILITIES — Helpers for sorting, grouping, and stats
export const sortQuickTasksList = (quickTasks = []) => {
    const tasks = [...(Array.isArray(quickTasks) ? quickTasks : [])];
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;

        const hasA = !!a.dueDate;
        const hasB = !!b.dueDate;
        if (hasA || hasB) {
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            if (a.dueDate !== b.dueDate) return String(a.dueDate || '').localeCompare(String(b.dueDate || ''));

            const tA = a.dueTime || '23:59';
            const tB = b.dueTime || '23:59';
            if (tA !== tB) return tA.localeCompare(tB);
        }

        const dateA = a.createdAt || 0;
        const dateB = b.createdAt || 0;
        return dateB - dateA;
    });
    return tasks;
};

export const groupQuickTasksBySchedule = (quickTasks = []) => {
    const sortedQuickTasks = sortQuickTasksList(quickTasks);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups = {
        today: [],
        tomorrow: [],
        upcoming: [],
        completed: []
    };

    sortedQuickTasks.forEach(task => {
        if (task.completed) {
            groups.completed.push(task);
            return;
        }
        if (!task.dueDate) {
            groups.today.push(task);
            return;
        }

        const due = new Date(`${task.dueDate}T00:00:00`);
        if (Number.isNaN(due.getTime())) {
            groups.upcoming.push(task);
            return;
        }

        if (due.getTime() <= today.getTime()) {
            groups.today.push(task);
        } else if (due.getTime() === tomorrow.getTime()) {
            groups.tomorrow.push(task);
        } else {
            groups.upcoming.push(task);
        }
    });

    return groups;
};

export const buildQuickTaskStats = (quickTasks = []) => {
    const all = Array.isArray(quickTasks) ? quickTasks : [];
    const completed = all.filter(t => t.completed);
    const pending = all.filter(t => !t.completed);
    const total = all.length;
    const completionRate = total ? Math.round((completed.length / total) * 100) : 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const doneToday = completed.filter(t => t.completedAt && t.completedAt >= startOfToday.getTime() && t.completedAt < endOfToday.getTime()).length;
    const overdue = pending.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(`${t.dueDate}T${t.dueTime || '23:59'}`).getTime();
        return !Number.isNaN(due) && due < Date.now();
    }).length;
    const dueToday = pending.filter(t => t.dueDate === formatDateLocal(startOfToday)).length;
    const dueTomorrow = pending.filter(t => t.dueDate === formatDateLocal(tomorrow)).length;
    const noDate = pending.filter(t => !t.dueDate).length;

    const weekBuckets = Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - (6 - idx));
        const key = d.toLocaleDateString('en-US', { weekday: 'short' });
        return { key, done: 0 };
    });

    completed.forEach(t => {
        if (!t.completedAt) return;
        const d = new Date(t.completedAt);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < 7) {
            const idx = 6 - diffDays;
            weekBuckets[idx].done += 1;
        }
    });

    const nextDueTask = sortQuickTasksList(pending.filter(t => !!t.dueDate))[0] || null;
    return { total, completed: completed.length, pending: pending.length, completionRate, doneToday, overdue, dueToday, dueTomorrow, noDate, weekBuckets, nextDueTask };
};

export const getTodayEnabledAlarms = (alarms = []) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return [...(Array.isArray(alarms) ? alarms : [])]
        .filter(alarm => alarm?.enabled)
        .map(alarm => {
            try {
                return { alarm, date: getAlarmScheduleDate(alarm) };
            } catch (error) {
                return null;
            }
        })
        .filter(Boolean)
        .filter(entry => entry.date >= start && entry.date < end)
        .sort((a, b) => a.date - b.date);
};

// ==========================================================================
// LABEL: FIREBASE & AUTH — Initialization and Google Sign-In
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDktbyVgI7AAwaY2u-KsWBRwLZawy0949s",
    authDomain: "faiora-24f4a.firebaseapp.com",
    projectId: "faiora-24f4a",
    storageBucket: "faiora-24f4a.firebasestorage.app",
    messagingSenderId: "752265363994",
    appId: "1:752265363994:web:78795bfad67d2d541e07a3",
    measurementId: "G-B0DWSL1JMV"
};

firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();
export { firebase };

export const isAndroidNative = () =>
    !!window.Capacitor &&
    typeof window.Capacitor.getPlatform === "function" &&
    window.Capacitor.getPlatform() === "android";

// [FIX 2026-04-19] THE FINAL STAND: Atomic Firestore Settings 
if (isAndroidNative()) {
    db.settings({
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
        host: "firestore.googleapis.com",
        ssl: true
    });
    console.log("✨ [FIREBASE] Final Stand: High-Compatibility Long-Polling enabled.");
}

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: !isAndroidNative() }).then(() => {
    console.log("✨ [FIREBASE] Persistence enabled (Native: " + isAndroidNative() + ")");
}).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn("⚠️ [FIREBASE] Multi-tab persistence already active. Sync should be consistent.");
    } else if (err.code === 'unimplemented') {
        console.warn("⚠️ [FIREBASE] Persistence not supported by browser");
    } else {
        console.error("❌ [FIREBASE] Persistence error:", err.message);
    }
});

const googleProvider = new firebase.auth.GoogleAuthProvider();

export const signInWithGoogle = async () => {
    if (isAndroidNative()) {
        const firebaseAuthPlugin = window.Capacitor?.Plugins?.FirebaseAuthentication;
        if (!firebaseAuthPlugin) {
            throw new Error("FirebaseAuthentication plugin is not available on Android build.");
        }
        const nativeResult = await firebaseAuthPlugin.signInWithGoogle({
            skipNativeAuth: true,
            scopes: ["email", "profile"],
            useCredentialManager: false
        });
        let idToken = nativeResult?.credential?.idToken;
        if (!idToken) {
            const tokenResult = await firebaseAuthPlugin.getIdToken({ forceRefresh: true });
            idToken = tokenResult?.token;
        }
        if (!idToken) {
            throw new Error("Google sign-in did not return an ID token.");
        }
        const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
        const result = await auth.signInWithCredential(credential);
        if (result?.user) {
            localStorage.setItem('faiora_logged_in', 'true');
            window.dispatchEvent(new CustomEvent('faiora-signed-in', { detail: result.user, source: 'native' }));
        }
        return result;
    }

    const result = await auth.signInWithPopup(googleProvider);
    if (result?.user) {
        localStorage.setItem('faiora_logged_in', 'true');
        window.dispatchEvent(new CustomEvent('faiora-signed-in', { detail: result.user, source: 'popup' }));
    }
    return result;
};
