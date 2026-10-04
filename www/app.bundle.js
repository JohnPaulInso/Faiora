const { useState, useEffect, useRef, useMemo, useCallback } = React;
const { createRoot } = ReactDOM;
const { HashRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } = ReactRouterDOM;
const normalizeRouteLocation = (loc) => {
  if (!loc || typeof loc !== "object") return { pathname: "/", search: "", hash: "", state: null, key: "default" };
  return { ...loc, pathname: loc.pathname && loc.pathname !== "" ? loc.pathname : "/" };
};
class FaioraErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, err: error };
  }
  componentDidCatch(error, info) {
    console.error("FaioraErrorBoundary:", error, info == null ? void 0 : info.componentStack);
  }
  render() {
    var _a;
    if (this.state.hasError) {
      return /* @__PURE__ */ React.createElement("div", { id: "faiora_error_crash_screen", className: "min-h-[100dvh] flex flex-col items-center justify-center p-8 text-cream-light text-center gap-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, "Something went wrong loading the app."), /* @__PURE__ */ React.createElement("p", { className: "text-white/50 text-sm max-w-sm" }, ((_a = this.state.err) == null ? void 0 : _a.message) || "Unknown error"), /* @__PURE__ */ React.createElement("button", { id: "faiora_error_reload_btn", type: "button", onClick: () => window.location.reload(), className: "px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase" }, "Reload"));
    }
    return this.props.children;
  }
}
(function ensureHashDefault() {
  try {
    const h = window.location.hash;
    if (h === "" || h === "#") {
      window.location.hash = "#/";
    }
  } catch (e) {
  }
})();
const formatDateLocal = (d = /* @__PURE__ */ new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const parseDateString = (str) => {
  if (!str) return null;
  if (str.includes("T")) return new Date(str);
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const getAlarmScheduleDate = (timeOrAlarm, daysInput) => {
  let time = "";
  let days = [];
  if (typeof timeOrAlarm === "object" && timeOrAlarm !== null) {
    time = timeOrAlarm.time;
    days = timeOrAlarm.days || [];
  } else {
    time = timeOrAlarm;
    days = daysInput || [];
  }
  if (!time) return null;
  const [hours, minutes] = String(time).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  let target = /* @__PURE__ */ new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  if (days && days.length > 0) {
    let loopLimit = 8;
    while (!days.includes(target.getDay()) && loopLimit > 0) {
      target.setDate(target.getDate() + 1);
      loopLimit--;
    }
  }
  return target;
};
const getTomorrow = () => {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + 1);
  return formatDateLocal(d);
};
const getDayAfterTomorrow = () => {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + 2);
  return formatDateLocal(d);
};
const getWaitTimeText = (targetDate) => {
  if (!targetDate) return "";
  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return "Alarm ringing";
  const diffMin = Math.floor(diffMs / 6e4);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays > 0) {
    const remHrs = diffHrs % 24;
    return `Alarm in ${diffDays} day${diffDays > 1 ? "s" : ""} ${remHrs > 0 ? `and ${remHrs} hour${remHrs > 1 ? "s" : ""}` : ""}`;
  }
  if (diffHrs > 0) {
    const remMin = diffMin % 60;
    return `Alarm in ${diffHrs} hour${diffHrs > 1 ? "s" : ""} ${remMin > 0 ? `and ${remMin} minute${remMin > 1 ? "s" : ""}` : ""}`;
  }
  return `Alarm in ${diffMin} minute${diffMin > 1 ? "s" : ""}`;
};
const formatDueDate = (date, time) => {
  if (!date) return { label: "", isOverdue: false, isNearDeadline: false, isDueTomorrow: false };
  const d = parseDateString(date);
  const now = /* @__PURE__ */ new Date();
  const today = formatDateLocal(now);
  const tomorrow = /* @__PURE__ */ new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateLocal(tomorrow);
  let isOverdue = false;
  const target = parseDateString(date);
  if (time) {
    const [h, m] = time.split(":");
    target.setHours(parseInt(h), parseInt(m), 0, 0);
  } else {
    target.setHours(23, 59, 59, 999);
  }
  if (now > target) {
    isOverdue = true;
  }
  let isDueTomorrow = false;
  let isDueToday = false;
  if (date === today) {
    isDueToday = true;
    let label = "Today";
    let isNearDeadline = false;
    if (time) {
      const [h, m] = time.split(":");
      const diffMs = target - now;
      const diffHours = diffMs / (1e3 * 60 * 60);
      if (diffHours > 0 && diffHours < 1) {
        const mins = Math.max(1, Math.ceil(diffHours * 60));
        isNearDeadline = true;
        label = `Due in ${mins} MINS`;
      } else if (diffHours > 0 && diffHours <= 4) {
        isNearDeadline = true;
        label = `Due in ${Math.ceil(diffHours)}${Math.ceil(diffHours) === 1 ? " HR" : " HRS"}`;
      } else if (diffHours > 0 && diffHours <= 8) {
        label = `Due in ${Math.ceil(diffHours)}${Math.ceil(diffHours) === 1 ? " HR" : " HRS"}`;
      }
      const hours = parseInt(h);
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      label += ` \u2022 ${h12}:${m} ${ampm}`;
    }
    return { label, isOverdue, isNearDeadline, isDueTomorrow, isDueToday };
  }
  if (date === tomorrowStr) {
    let label = "Tomorrow";
    let isNearDeadline = false;
    if (time) {
      const [h, m] = time.split(":");
      const tgt = parseDateString(date);
      tgt.setHours(parseInt(h), parseInt(m), 0, 0);
      const diffMs = tgt - now;
      const diffHours = diffMs / (1e3 * 60 * 60);
      if (diffHours > 0 && diffHours < 1) {
        const mins = Math.max(1, Math.ceil(diffHours * 60));
        isNearDeadline = true;
        label = `Due in ${mins} MINS`;
      } else if (diffHours > 0 && diffHours <= 4) {
        isNearDeadline = true;
        label = `Due in ${Math.ceil(diffHours)}${Math.ceil(diffHours) === 1 ? " HR" : " HRS"}`;
      }
      const hours = parseInt(h);
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      label += ` \u2022 ${h12}:${m} ${ampm}`;
    }
    isDueTomorrow = true;
    return { label, isOverdue, isNearDeadline, isDueTomorrow, isDueToday: false };
  }
  const options = { month: "short", day: "numeric" };
  let str = d.toLocaleDateString("en-US", options);
  if (time) {
    const [h, m] = time.split(":");
    const hours = parseInt(h);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    str += ` \u2022 ${h12}:${m} ${ampm}`;
  }
  return { label: str, isOverdue, isNearDeadline: false, isDueTomorrow: false, isDueToday: false };
};
const formatTime = (time) => {
  if (!time) return "";
  const [h, m] = String(time).split(":");
  const hours = parseInt(h);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};
const sortQuickTasksList = (quickTasks2 = []) => {
  const tasks = [...Array.isArray(quickTasks2) ? quickTasks2 : []];
  tasks.sort((a, b) => {
    const hasA = !!a.dueDate;
    const hasB = !!b.dueDate;
    if (hasA || hasB) {
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      if (a.dueDate !== b.dueDate) return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
      const tA = a.dueTime || "23:59";
      const tB = b.dueTime || "23:59";
      if (tA !== tB) return tA.localeCompare(tB);
    }
    const dateA = a.createdAt || 0;
    const dateB = b.createdAt || 0;
    return dateB - dateA;
  });
  return tasks;
};
const groupQuickTasksBySchedule = (quickTasks2 = []) => {
  const sortedQuickTasks = sortQuickTasksList(quickTasks2);
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentDay = today.getDay();
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + daysUntilSunday);
  endOfThisWeek.setHours(23, 59, 59, 999);
  const startOfNextWeek = new Date(endOfThisWeek);
  startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
  startOfNextWeek.setHours(0, 0, 0, 0);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);
  const groups = {
    pastDue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    upcoming: [],
    noDate: [],
    completed: []
  };
  sortedQuickTasks.forEach((task) => {
    if (task.completed) {
      groups.completed.push(task);
      return;
    }
    if (!task.dueDate) {
      groups.noDate.push(task);
      return;
    }
    const due = /* @__PURE__ */ new Date(`${task.dueDate}T00:00:00`);
    if (Number.isNaN(due.getTime())) {
      groups.upcoming.push(task);
      return;
    }
    if (due.getTime() < today.getTime()) {
      groups.pastDue.push(task);
    } else if (due.getTime() === today.getTime()) {
      groups.today.push(task);
    } else if (due.getTime() === tomorrow.getTime()) {
      groups.tomorrow.push(task);
    } else if (due.getTime() <= endOfThisWeek.getTime()) {
      groups.thisWeek.push(task);
    } else if (due.getTime() <= endOfNextWeek.getTime()) {
      groups.nextWeek.push(task);
    } else {
      groups.upcoming.push(task);
    }
  });
  return groups;
};
const groupQuickTasksDaily = (quickTasks2 = [], includeCompleted = false) => {
  const tasks = [...Array.isArray(quickTasks2) ? quickTasks2 : []];
  tasks.sort((a, b) => {
    const hasA = !!a.dueDate;
    const hasB = !!b.dueDate;
    if (hasA || hasB) {
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      if (a.dueDate !== b.dueDate) return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
      const tA = a.dueTime || "23:59";
      const tB = b.dueTime || "23:59";
      if (tA !== tB) return tA.localeCompare(tB);
    }
    const dateA = a.createdAt || 0;
    const dateB = b.createdAt || 0;
    return dateB - dateA;
  });
  const pinnedTasks = [];
  const unpinnedTasks = [];
  tasks.forEach((task) => {
    if (task.pinned) {
      if (!task.completed || includeCompleted) {
        pinnedTasks.push(task);
      }
    } else {
      unpinnedTasks.push(task);
    }
  });
  const sorted = unpinnedTasks;
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const pastDueMap = /* @__PURE__ */ new Map();
  const yesterdayTasks = [];
  const todayTasks = [];
  const tomorrowTasks = [];
  const futureMap = /* @__PURE__ */ new Map();
  const noDateTasks = [];
  const completed = [];
  const finishedTasks = [];
  sorted.forEach((task) => {
    if (task.completed) {
      completed.push(task);
    }
    if (!task.dueDate) {
      if (!task.completed || includeCompleted) {
        noDateTasks.push(task);
      }
      return;
    }
    const due = /* @__PURE__ */ new Date(`${task.dueDate}T00:00:00`);
    if (Number.isNaN(due.getTime())) {
      if (!task.completed || includeCompleted) {
        noDateTasks.push(task);
      }
      return;
    }
    if (due.getTime() < today.getTime()) {
      if (due.getTime() === yesterday.getTime()) {
        if (!task.completed || includeCompleted) {
          yesterdayTasks.push(task);
        }
      } else if (!task.completed) {
        const dateKey = task.dueDate;
        if (!pastDueMap.has(dateKey)) pastDueMap.set(dateKey, []);
        pastDueMap.get(dateKey).push(task);
      } else if (includeCompleted) {
        finishedTasks.push(task);
      }
    } else if (due.getTime() === today.getTime()) {
      if (!task.completed || includeCompleted) {
        todayTasks.push(task);
      }
    } else if (due.getTime() === tomorrow.getTime()) {
      if (!task.completed || includeCompleted) {
        tomorrowTasks.push(task);
      }
    } else {
      if (!task.completed || includeCompleted) {
        const dateKey = task.dueDate;
        if (!futureMap.has(dateKey)) futureMap.set(dateKey, []);
        futureMap.get(dateKey).push(task);
      }
    }
  });
  const sections = [];
  const sortedPastDates = Array.from(pastDueMap.keys()).sort().reverse();
  sortedPastDates.forEach((dStr) => {
    const d = /* @__PURE__ */ new Date(`${dStr}T00:00:00`);
    const formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const dayAbbr = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    sections.push({
      key: `pastDue_${dStr}`,
      label: `PAST DUE ${formattedDate} (${dayAbbr})`,
      shortLabel: `PAST DUE (${formattedDate})`,
      items: pastDueMap.get(dStr),
      totalCount: pastDueMap.get(dStr).length,
      isPastDue: true
    });
  });
  if (yesterdayTasks.length > 0) {
    const yesterdayFormatted = yesterday.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const yesterdayDay = yesterday.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    sections.push({
      key: "yesterday",
      label: `YESTERDAY (${yesterdayDay})`,
      shortLabel: `YESTERDAY (${yesterdayFormatted})`,
      items: yesterdayTasks,
      totalCount: yesterdayTasks.length,
      isYesterday: true
    });
  }
  if (pinnedTasks.length > 0) {
    sections.push({
      key: "pinned",
      label: "PINNED (RECURRING)",
      shortLabel: "PINNED",
      items: pinnedTasks,
      totalCount: pinnedTasks.length,
      isPinned: true
    });
  }
  if (todayTasks.length > 0) {
    const todayFormatted = today.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const todayDay = today.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    sections.push({
      key: "today",
      label: `TODAY (${todayFormatted} - ${todayDay})`,
      shortLabel: `TODAY (${todayFormatted} - ${todayDay})`,
      items: todayTasks,
      totalCount: todayTasks.length
    });
  }
  if (tomorrowTasks.length > 0) {
    const tomorrowFormatted = tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    sections.push({
      key: "tomorrow",
      label: `TOMORROW (${tomorrowFormatted} - ${tomorrowDay})`,
      shortLabel: `TOMORROW (${tomorrowFormatted} - ${tomorrowDay})`,
      items: tomorrowTasks,
      totalCount: tomorrowTasks.length
    });
  }
  const sortedFutureDates = Array.from(futureMap.keys()).sort();
  sortedFutureDates.forEach((dStr) => {
    const d = /* @__PURE__ */ new Date(`${dStr}T00:00:00`);
    const formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const dayAbbr = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    sections.push({
      key: `future_${dStr}`,
      label: `${formattedDate} (${dayAbbr})`,
      shortLabel: formattedDate,
      items: futureMap.get(dStr),
      totalCount: futureMap.get(dStr).length
    });
  });
  if (noDateTasks.length > 0) {
    const noDateCatMap = /* @__PURE__ */ new Map();
    noDateTasks.forEach((task) => {
      const cats = Array.isArray(task.categories) && task.categories.length > 0 ? task.categories : task.category ? [task.category] : ["UNCATEGORIZED"];
      const primaryCat = (cats[0] || "UNCATEGORIZED").toUpperCase();
      if (!noDateCatMap.has(primaryCat)) noDateCatMap.set(primaryCat, []);
      noDateCatMap.get(primaryCat).push(task);
    });
    const sortedCats = Array.from(noDateCatMap.keys()).sort();
    sortedCats.forEach((cat) => {
      const items = noDateCatMap.get(cat);
      sections.push({
        key: `noDate_${cat}`,
        label: `NO DEADLINE \u2014 ${cat}`,
        shortLabel: `${cat}`,
        items,
        totalCount: items.length,
        isNoDate: true
      });
    });
  }
  if (finishedTasks.length > 0) {
    finishedTasks.sort((a, b) => {
      const timeA = new Date(a.completedAt || a.updatedAt || a.dueDate || 0).getTime();
      const timeB = new Date(b.completedAt || b.updatedAt || b.dueDate || 0).getTime();
      return timeB - timeA;
    });
    sections.push({
      key: "finished",
      label: "FINISHED",
      shortLabel: "FINISHED",
      items: finishedTasks,
      totalCount: finishedTasks.length,
      isFinished: true
    });
  }
  return {
    sections,
    completed
  };
};
const buildQuickTaskStats = (quickTasks2 = []) => {
  const all = Array.isArray(quickTasks2) ? quickTasks2 : [];
  const completed = all.filter((t) => t.completed);
  const pending = all.filter((t) => !t.completed);
  const total = all.length;
  const completionRate = total ? Math.round(completed.length / total * 100) : 0;
  const startOfToday = /* @__PURE__ */ new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const tomorrow = new Date(startOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  const doneToday = completed.filter((t) => t.completedAt && t.completedAt >= startOfToday.getTime() && t.completedAt < endOfToday.getTime()).length;
  const overdue = pending.filter((t) => {
    if (!t.dueDate) return false;
    const due = (/* @__PURE__ */ new Date(`${t.dueDate}T${t.dueTime || "23:59"}`)).getTime();
    return !Number.isNaN(due) && due < Date.now();
  }).length;
  const dueToday = pending.filter((t) => t.dueDate === formatDateLocal(startOfToday)).length;
  const dueTomorrow = pending.filter((t) => t.dueDate === formatDateLocal(tomorrow)).length;
  const noDate = pending.filter((t) => !t.dueDate).length;
  const weekBuckets = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - (6 - idx));
    const key = d.toLocaleDateString("en-US", { weekday: "short" });
    return { key, done: 0 };
  });
  completed.forEach((t) => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / (24 * 60 * 60 * 1e3));
    if (diffDays >= 0 && diffDays < 7) {
      const idx = 6 - diffDays;
      weekBuckets[idx].done += 1;
    }
  });
  const nextDueTask = sortQuickTasksList(pending.filter((t) => !!t.dueDate))[0] || null;
  return { total, completed: completed.length, pending: pending.length, completionRate, doneToday, overdue, dueToday, dueTomorrow, noDate, weekBuckets, nextDueTask };
};
const getTodayEnabledAlarms = (alarms2 = []) => {
  const start = /* @__PURE__ */ new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [...Array.isArray(alarms2) ? alarms2 : []].filter((alarm) => alarm == null ? void 0 : alarm.enabled).map((alarm) => {
    try {
      return { alarm, date: getAlarmScheduleDate(alarm) };
    } catch (error) {
      return null;
    }
  }).filter(Boolean).filter((entry) => entry.date >= start && entry.date < end).sort((a, b) => a.date - b.date);
};
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
const auth = firebase.auth();
const db = firebase.firestore();
const isAndroidNative = () => !!window.Capacitor && typeof window.Capacitor.getPlatform === "function" && window.Capacitor.getPlatform() === "android";
if (isAndroidNative()) {
  db.settings({
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
    host: "firestore.googleapis.com",
    ssl: true
  });
  console.log("\u2728 [FIREBASE] Final Stand: High-Compatibility Long-Polling enabled.");
}
db.enablePersistence({ synchronizeTabs: false }).then(() => {
  console.log("\u2728 [FIREBASE] Persistence enabled (Native: " + isAndroidNative() + ")");
}).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("\u26A0\uFE0F [FIREBASE] Multi-tab persistence already active in another tab/process. Sync should be consistent.");
  } else if (err.code === "unimplemented") {
    console.warn("\u26A0\uFE0F [FIREBASE] Persistence not supported by browser");
  } else {
    console.error("\u274C [FIREBASE] Persistence error:", err.message);
  }
});
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
  // Always show account chooser like Claude
  display: "popup"
});
const signInWithGoogle = async () => {
  var _a, _b, _c;
  if (isAndroidNative()) {
    const firebaseAuthPlugin = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.FirebaseAuthentication;
    if (!firebaseAuthPlugin) {
      throw new Error("FirebaseAuthentication plugin is not available on Android build.");
    }
    const nativeResult = await firebaseAuthPlugin.signInWithGoogle({
      skipNativeAuth: true,
      scopes: ["email", "profile"],
      useCredentialManager: false
    });
    let idToken = (_c = nativeResult == null ? void 0 : nativeResult.credential) == null ? void 0 : _c.idToken;
    if (!idToken) {
      const tokenResult = await firebaseAuthPlugin.getIdToken({ forceRefresh: true });
      idToken = tokenResult == null ? void 0 : tokenResult.token;
    }
    if (!idToken) {
      throw new Error("Google sign-in did not return an ID token.");
    }
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    const result2 = await auth.signInWithCredential(credential);
    if (result2 == null ? void 0 : result2.user) {
      localStorage.setItem("faiora_logged_in", "true");
      window.dispatchEvent(new CustomEvent("faiora-signed-in", { detail: result2.user, source: "native" }));
    }
    return result2;
  }
  const result = await auth.signInWithPopup(googleProvider);
  if (result == null ? void 0 : result.user) {
    localStorage.setItem("faiora_logged_in", "true");
    window.dispatchEvent(new CustomEvent("faiora-signed-in", { detail: result.user, source: "popup" }));
  }
  return result;
};
function initializeGoogleOneTap() {
  if (firebase.auth().currentUser) {
    console.log("\u23ED\uFE0F [ONE-TAP] Skipped - user already authenticated");
    return;
  }
  const isDesktop = window.innerWidth > 768;
  if (!isDesktop) return;
  const dismissed = sessionStorage.getItem("faiora_onetap_dismissed");
  if (dismissed) return;
  if (!document.getElementById("google-identity-services")) {
    const script = document.createElement("script");
    script.id = "google-identity-services";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("\u2728 [ONE-TAP] Google Identity Services loaded");
      setupOneTap();
    };
    script.onerror = () => {
      console.warn("\u26A0\uFE0F [ONE-TAP] Failed to load Google Identity Services");
    };
    document.head.appendChild(script);
  } else {
    setupOneTap();
  }
  function setupOneTap() {
    var _a, _b;
    if (!((_b = (_a = window.google) == null ? void 0 : _a.accounts) == null ? void 0 : _b.id)) {
      console.warn("\u26A0\uFE0F [ONE-TAP] Google Identity Services not available");
      return;
    }
    const clientId = "752265363994-e3b37t5hptlfg64tn9bq7d4d073a0kds.apps.googleusercontent.com";
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleOneTapSignIn,
      cancel_on_tap_outside: false,
      auto_select: false,
      itp_support: true,
      // Allow users to use a different account than what One Tap suggests
      use_fedcm_for_prompt: true,
      // Show "Use another account" option
      context: "signin"
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.log("\u{1F515} [ONE-TAP] Not displayed:", notification.getNotDisplayedReason());
      } else if (notification.isSkippedMoment()) {
        console.log("\u23ED\uFE0F [ONE-TAP] Skipped:", notification.getSkippedReason());
      } else if (notification.isDismissedMoment()) {
        console.log("\u274C [ONE-TAP] Dismissed:", notification.getDismissedReason());
        sessionStorage.setItem("faiora_onetap_dismissed", "true");
      }
    });
    console.log("\u2705 [ONE-TAP] Initialized and prompted");
  }
  async function handleOneTapSignIn(response) {
    try {
      console.log("\u{1F389} [ONE-TAP] Sign-in initiated");
      const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
      const result = await auth.signInWithCredential(credential);
      if (result == null ? void 0 : result.user) {
        localStorage.setItem("faiora_logged_in", "true");
        window.dispatchEvent(new CustomEvent("faiora-signed-in", {
          detail: result.user,
          source: "onetap"
        }));
        console.log("\u2705 [ONE-TAP] Sign-in successful:", result.user.email);
      }
    } catch (error) {
      console.error("\u274C [ONE-TAP] Sign-in failed:", error);
    }
  }
}
window.addEventListener("resize", () => {
  var _a, _b;
  const isMobile = window.innerWidth <= 768;
  if (isMobile && ((_b = (_a = window.google) == null ? void 0 : _a.accounts) == null ? void 0 : _b.id)) {
    window.google.accounts.id.cancel();
  }
});
window.addEventListener("faiora-signed-in", () => {
  var _a, _b;
  if ((_b = (_a = window.google) == null ? void 0 : _a.accounts) == null ? void 0 : _b.id) {
    window.google.accounts.id.cancel();
    console.log("\u2705 [ONE-TAP] Cancelled after sign-in");
  }
});
const FaioraNotifications = (() => {
  const timers = /* @__PURE__ */ new Map();
  let swReady = false;
  let swRegistration = null;
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      if (window.caches) {
        caches.delete("faiora-offline-v1").catch(() => {
        });
        caches.delete("faiora-offline-v2").catch(() => {
        });
      }
      setTimeout(() => {
        navigator.serviceWorker.register("sw.js").then((reg) => {
          swRegistration = reg;
          swReady = true;
          console.log("\u{1F525} Faiora SW registered");
          try {
            reg.update();
          } catch (e) {
          }
          setTimeout(() => {
            try {
              reg.update();
            } catch (e) {
            }
          }, 5e3);
          if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then((granted) => {
              if (granted) console.log("\u{1F4BE} [Faiora] Persistent storage granted");
            });
          }
        }).catch((err) => {
          if (!err.message.includes("message port closed")) {
            console.warn("SW registration failed:", err);
          }
        });
      }, 2e3);
    });
  }
  const VAPID_KEY = "BPEtleiswwW1JQ2b8rtlPBGHm2DhcSmxmDZh6ifdZusmLdD0HzOScot047EvfbSJkN9VbQlD04G4RaNCoBbdiFI";
  const hasNotificationApi = typeof window !== "undefined" && typeof window.Notification !== "undefined";
  const inAppListeners = /* @__PURE__ */ new Set();
  let nativeChannelsReady = false;
  let nativeListenersReady = false;
  const nativeLocalNotifications = () => {
    var _a, _b;
    return ((_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.LocalNotifications) || null;
  };
  const hasNativeLocalNotifications = () => !!nativeLocalNotifications();
  const nativeAlarmBridge = () => window.FaioraNativeAlarmBridge || null;
  const hasNativeAlarmBridge = () => {
    var _a;
    return !!((_a = nativeAlarmBridge()) == null ? void 0 : _a.scheduleAlarm);
  };
  const QUICK_TASK_CHANNEL_ID = "faiora-quick-tasks-v2";
  const ALARM_CHANNEL_ID = "faiora-alarms-v2";
  const NATIVE_NOTIFICATION_SOUND = "fire_transition_sfx.mp3";
  const hashNotificationId = (seed) => {
    const str = String(seed || "faiora");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash || 1);
  };
  const emitInAppAlert = (alert2) => {
    const enrichedAlert = { id: Date.now() + Math.random(), ...alert2 };
    inAppListeners.forEach((listener) => {
      try {
        listener(enrichedAlert);
      } catch (error) {
        console.warn("In-app alert listener failed", error);
      }
    });
    return enrichedAlert;
  };
  const subscribeInApp = (listener) => {
    inAppListeners.add(listener);
    return () => inAppListeners.delete(listener);
  };
  const toNativePayload = (notificationLike) => {
    const notification = (notificationLike == null ? void 0 : notificationLike.notification) || notificationLike || {};
    const extra = notification.extra || notification.data || {};
    return {
      id: notification.id,
      title: notification.title || extra.title || "Faiora Alert",
      body: notification.body || extra.body || "",
      tag: notification.tag || extra.tag || `faiora-native-${notification.id || Date.now()}`,
      type: extra.type || "generic",
      stage: extra.stage || "",
      taskId: extra.taskId || "",
      alarmId: extra.alarmId || "",
      time: extra.time || "",
      label: extra.label || "",
      dueDate: extra.dueDate || "",
      dueTime: extra.dueTime || "",
      native: true
    };
  };
  const ensureNativeChannels = async () => {
    const plugin = nativeLocalNotifications();
    if (!plugin || nativeChannelsReady) return;
    try {
      await plugin.registerActionTypes({
        types: [
          {
            id: "FAIORA_ALARM_ACTIONS",
            actions: [
              { id: "stop", title: "STOP", foreground: true, destructive: true },
              { id: "snooze", title: "SNOOZE (5m)", foreground: false }
            ]
          },
          {
            id: "FAIORA_TASK_ACTIONS",
            // (2026-07-13) Add Move Tomorrow action to task notifs. Prev: 2 actions
            actions: [
              { id: "complete_task", title: "\u2713 Complete", foreground: false },
              { id: "snooze_1h", title: "+1 Hour", foreground: false },
              { id: "tomorrow", title: "Move Tomorrow", foreground: false }
            ]
          }
        ]
      });
      await plugin.createChannel({
        id: QUICK_TASK_CHANNEL_ID,
        name: "Quick Task Reminders",
        description: "Due now, due in 1 hour, and due in 24 hours",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#f97316",
        sound: NATIVE_NOTIFICATION_SOUND
      });
      await plugin.createChannel({
        id: ALARM_CHANNEL_ID,
        name: "Faiora Alarms",
        description: "High-priority alarms and wake-up reminders",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#fb923c",
        sound: NATIVE_NOTIFICATION_SOUND
      });
      nativeChannelsReady = true;
    } catch (error) {
      console.warn("Native notification channel init failed", error);
    }
  };
  const ensureNativeListeners = async () => {
    const plugin = nativeLocalNotifications();
    if (!plugin || nativeListenersReady) return;
    try {
      await plugin.addListener("localNotificationReceived", async (notification) => {
        const extra = (notification == null ? void 0 : notification.extra) || (notification == null ? void 0 : notification.data) || {};
        if (extra.type === "quick-task" && extra.taskId) {
          try {
            const delivered = await plugin.getDeliveredNotifications();
            const older = ((delivered == null ? void 0 : delivered.notifications) || []).filter((n) => {
              const nExtra = (n == null ? void 0 : n.extra) || (n == null ? void 0 : n.data) || {};
              return nExtra.taskId === extra.taskId && n.id !== notification.id;
            });
            if (older.length) await plugin.removeDeliveredNotifications({ notifications: older });
          } catch (e) {
          }
        }
        emitInAppAlert(toNativePayload(notification));
      });
      await plugin.addListener("localNotificationActionPerformed", async (action) => {
        var _a, _b;
        const actionId = action.actionId;
        const extra = ((_a = action.notification) == null ? void 0 : _a.extra) || ((_b = action.notification) == null ? void 0 : _b.data) || {};
        if (extra.type === "quick-task" && extra.taskId) {
          if (actionId === "complete_task") {
            window.dispatchEvent(new CustomEvent("faiora-task-action-complete", { detail: { taskId: extra.taskId } }));
            await removeDeliveredTaskNotifications(extra.taskId);
            await cancelNativeTaskNotifications(extra.taskId);
          } else if (actionId === "snooze_1h") {
            window.dispatchEvent(new CustomEvent("faiora-task-action-snooze", { detail: { taskId: extra.taskId } }));
            await removeDeliveredTaskNotifications(extra.taskId);
          } else if (actionId === "tomorrow") {
            window.dispatchEvent(new CustomEvent("faiora-task-action-tomorrow", { detail: { taskId: extra.taskId } }));
            await removeDeliveredTaskNotifications(extra.taskId);
          }
        }
        emitInAppAlert(toNativePayload(action));
      });
      nativeListenersReady = true;
    } catch (error) {
      console.warn("Native notification listeners failed", error);
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
      await plugin.cancel({ notifications: ids.map((id) => ({ id })) });
    } catch (error) {
      console.warn("Native notification cancel failed", error);
    }
  };
  const removeDeliveredTaskNotifications = async (taskId = "") => {
    const plugin = nativeLocalNotifications();
    if (!plugin) return;
    try {
      const delivered = await plugin.getDeliveredNotifications();
      const targetId = getTaskReminderId(taskId);
      const matching = ((delivered == null ? void 0 : delivered.notifications) || []).filter((notification) => {
        const payload = (notification == null ? void 0 : notification.data) || (notification == null ? void 0 : notification.extra) || {};
        return !taskId || payload.taskId === taskId || notification.id === targetId || String(notification.id).includes(String(taskId));
      });
      if (matching.length) {
        await plugin.removeDeliveredNotifications({ notifications: matching });
      }
    } catch (error) {
      console.warn("Delivered task cleanup failed", error);
    }
  };
  const removeDeliveredAlarmNotifications = async (alarmId = "") => {
    const plugin = nativeLocalNotifications();
    if (!plugin) return;
    try {
      const delivered = await plugin.getDeliveredNotifications();
      const matching = ((delivered == null ? void 0 : delivered.notifications) || []).filter((notification) => {
        const payload = (notification == null ? void 0 : notification.data) || (notification == null ? void 0 : notification.extra) || {};
        return (payload == null ? void 0 : payload.type) === "alarm" && (!alarmId || payload.alarmId === alarmId);
      });
      if (matching.length) {
        await plugin.removeDeliveredNotifications({ notifications: matching });
      }
    } catch (error) {
      console.warn("Delivered alarm cleanup failed", error);
    }
  };
  const getDeliveredNotifications = async () => {
    const plugin = nativeLocalNotifications();
    if (!plugin) return [];
    try {
      const delivered = await plugin.getDeliveredNotifications();
      return (delivered == null ? void 0 : delivered.notifications) || [];
    } catch (error) {
      console.warn("Delivered notification fetch failed", error);
      return [];
    }
  };
  const hasNativeNotificationPermission = async () => {
    const plugin = nativeLocalNotifications();
    if (!plugin) return false;
    try {
      const status = await plugin.checkPermissions();
      if ((status == null ? void 0 : status.display) !== "granted") return false;
      await ensureNativeNotificationsReady();
      return true;
    } catch (error) {
      console.warn("Native notification permission check failed", error);
      return false;
    }
  };
  const getTaskReminderTag = (taskId, stage = "") => `faiora-task-${taskId}`;
  const getTaskReminderId = (taskId, stage = "") => hashNotificationId(`faiora-task-${taskId}`);
  try {
    window.getTaskReminderId = getTaskReminderId;
  } catch (e) {
  }
  const getTaskScheduleId = (taskId, stage = "") => hashNotificationId(`faiora-sched-${stage}-${taskId}`);
  const getAlarmNotificationTag = (alarmId) => `faiora-alarm-${alarmId}`;
  const getAlarmNotificationId = (alarmId) => hashNotificationId(getAlarmNotificationTag(alarmId));
  const hasAlarmOverlayPermission = () => {
    var _a, _b;
    try {
      return !!((_b = (_a = nativeAlarmBridge()) == null ? void 0 : _a.hasOverlayPermission) == null ? void 0 : _b.call(_a));
    } catch (error) {
      console.warn("Native overlay permission check failed", error);
      return false;
    }
  };
  const requestAlarmOverlayPermission = () => {
    var _a, _b;
    try {
      (_b = (_a = nativeAlarmBridge()) == null ? void 0 : _a.requestOverlayPermission) == null ? void 0 : _b.call(_a);
    } catch (error) {
      console.warn("Native overlay permission request failed", error);
    }
  };
  const consumeNativeAlarmEvents = () => {
    var _a, _b;
    try {
      const raw = (_b = (_a = nativeAlarmBridge()) == null ? void 0 : _a.consumeEvents) == null ? void 0 : _b.call(_a);
      return JSON.parse(raw || "[]");
    } catch (error) {
      console.warn("Native alarm event consume failed", error);
      return [];
    }
  };
  const buildTaskReminderEntries = (task) => {
    if (!task || !task.dueDate || task.completed) return [];
    const dueTime = task.dueTime || "23:59";
    const dueDateTime = /* @__PURE__ */ new Date(`${task.dueDate}T${dueTime}`);
    if (Number.isNaN(dueDateTime.getTime())) return [];
    const now = Date.now();
    const dueMs = dueDateTime.getTime();
    const taskName = formatTaskText(task.text || task.title || "Task");
    const stages = [
      { stage: "24h", offsetMs: 24 * 60 * 60 * 1e3, title: "Task Reminder! \u{1F525}", body: `\u26A1 Due in 24hrs: ${taskName}` },
      { stage: "1h", offsetMs: 60 * 60 * 1e3, title: "Task Reminder! \u{1F525}", body: `\u23F3 Due in 1hr: ${taskName}` },
      { stage: "due", offsetMs: 0, title: "Task Reminder! \u{1F525}", body: `\u{1F4CC} Due Now: ${taskName}` }
    ];
    const activeReminders = task.reminders;
    const filteredStages = stages.filter((s) => {
      if (!activeReminders) return true;
      if (Array.isArray(activeReminders)) return activeReminders.includes(s.stage);
      if (typeof activeReminders === "object") return activeReminders[s.stage] !== false;
      return true;
    });
    return filteredStages.map((entry) => {
      const at = dueMs - entry.offsetMs;
      if (at <= now) return null;
      return {
        ...entry,
        at,
        title: entry.title,
        tag: getTaskReminderTag(task.id, entry.stage),
        id: getTaskScheduleId(task.id, entry.stage),
        notificationId: getTaskReminderId(task.id)
      };
    }).filter(Boolean);
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
        notifications: entries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          body: entry.body,
          channelId: QUICK_TASK_CHANNEL_ID,
          // (2026-07-13) Attach task action buttons for quick taps. Prev: none
          actionTypeId: "FAIORA_TASK_ACTIONS",
          // (2026-07-13) Set smallIcon to ic_notification_logo. Prev: ic_stat_faiora
          smallIcon: "ic_notification_logo",
          schedule: { at: new Date(entry.at), allowWhileIdle: true },
          extra: {
            type: "quick-task",
            stage: entry.stage,
            taskId: task.id,
            tag: entry.tag,
            notificationId: entry.notificationId,
            title: entry.title,
            body: entry.body,
            dueDate: task.dueDate || "",
            dueTime: task.dueTime || "",
            taskText: formatTaskText(task.text || task.title || "Task")
          }
        }))
      });
      return true;
    } catch (error) {
      console.warn("Native quick-task scheduling failed", error);
      return false;
    }
  };
  const cancelNativeTaskNotifications = async (taskId = "") => {
    if (!taskId) return;
    await cancelNativeNotifications([
      getTaskScheduleId(taskId, "24h"),
      getTaskScheduleId(taskId, "1h"),
      getTaskScheduleId(taskId, "due"),
      getTaskReminderId(taskId),
      hashNotificationId(`faiora-24h-${taskId}`),
      hashNotificationId(`faiora-1h-${taskId}`),
      hashNotificationId(`faiora-due-${taskId}`)
    ]);
    await removeDeliveredTaskNotifications(taskId);
  };
  const scheduleAlarmNotification = async (alarm) => {
    const bridge = nativeAlarmBridge();
    if ((bridge == null ? void 0 : bridge.scheduleAlarm) && (alarm == null ? void 0 : alarm.enabled) && (alarm == null ? void 0 : alarm.time)) {
      const target2 = getAlarmScheduleDate(alarm);
      if (target2) {
        try {
          const scheduled = bridge.scheduleAlarm(
            String(alarm.id || ""),
            String(alarm.label || "Alarm"),
            String(alarm.time || ""),
            target2.getTime(),
            !!alarm.repeatDaily
          );
          if (scheduled) {
            return true;
          }
        } catch (error) {
          console.warn("Native exact alarm bridge scheduling failed", error);
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
          title: "Alarm Ringing",
          body: `${alarm.label || "Alarm"} \u2022 ${alarm.time}`,
          channelId: ALARM_CHANNEL_ID,
          actionTypeId: "FAIORA_ALARM_ACTIONS",
          ongoing: true,
          autoCancel: false,
          // (2026-07-13) Set smallIcon to ic_notification_logo. Prev: ic_stat_faiora
          smallIcon: "ic_notification_logo",
          schedule: { at: target, allowWhileIdle: true },
          extra: {
            type: "alarm",
            alarmId: alarm.id,
            label: alarm.label || "Alarm",
            time: alarm.time,
            repeatDaily: !!alarm.repeatDaily,
            tag: getAlarmNotificationTag(alarm.id),
            title: "Alarm Ringing",
            body: `${alarm.label || "Alarm"} \u2022 ${alarm.time}`
          }
        }]
      });
      return true;
    } catch (error) {
      console.warn("Native alarm scheduling failed", error);
      return false;
    }
  };
  const cancelAlarmNotification = async (alarmId = "") => {
    var _a, _b;
    if (!alarmId) return;
    try {
      (_b = (_a = nativeAlarmBridge()) == null ? void 0 : _a.cancelAlarm) == null ? void 0 : _b.call(_a, String(alarmId));
    } catch (error) {
      console.warn("Native exact alarm bridge cancel failed", error);
    }
    await cancelNativeNotifications([getAlarmNotificationId(alarmId)]);
    await removeDeliveredAlarmNotifications(alarmId);
  };
  const requestPermission = async () => {
    var _a;
    const nativePlugin = nativeLocalNotifications();
    if (nativePlugin) {
      try {
        const current = await nativePlugin.checkPermissions();
        let status = (current == null ? void 0 : current.display) || "prompt";
        if (status !== "granted") {
          const requested = await nativePlugin.requestPermissions();
          status = (requested == null ? void 0 : requested.display) || status;
        }
        if (status === "granted") {
          await ensureNativeNotificationsReady();
          try {
            const exactStatus = await ((_a = nativePlugin.checkExactNotificationSetting) == null ? void 0 : _a.call(nativePlugin));
            if ((exactStatus == null ? void 0 : exactStatus.exact_alarm) && exactStatus.exact_alarm !== "granted") {
              console.warn("Exact alarm permission is not enabled yet.");
            }
          } catch (error) {
            console.warn("Exact alarm check failed", error);
          }
        }
        return status;
      } catch (err) {
        console.error("Error requesting native notification permission:", err);
        return "unsupported";
      }
    }
    if (!("Notification" in window)) return "unsupported";
    try {
      const status = await Notification.requestPermission();
      if (status === "granted") {
        console.log("\u{1F514} Notification permission granted.");
        registerFCMToken();
      } else if (status === "denied") {
        console.warn("\u274C Notification permission denied.");
      }
      return status;
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return hasNotificationApi ? Notification.permission : "unsupported";
    }
  };
  const testNotification = async () => {
    const nativePlugin = nativeLocalNotifications();
    if (nativePlugin) {
      const status = await requestPermission();
      if (status !== "granted") return;
      await ensureNativeNotificationsReady();
      playNotifSFX();
      const title2 = "\xF0\u0178\u201D\xA5 Faiora Test Alert";
      const body2 = "Your native APK notifications are working.";
      await nativePlugin.schedule({
        notifications: [{
          id: hashNotificationId("faiora-test"),
          title: title2,
          body: body2,
          channelId: "faiora-quick-tasks",
          schedule: { at: new Date(Date.now() + 250), allowWhileIdle: true },
          extra: { type: "generic", tag: "faiora-test", title: title2, body: body2 }
        }]
      });
      return;
    }
    if (!hasNotificationApi || Notification.permission !== "granted") {
      const res = await requestPermission();
      if (res !== "granted") return;
    }
    playNotifSFX();
    const title = "\u{1F525} Faiora Test Alert";
    const body = "Your notification system is working! This is a local test.";
    if (swRegistration) {
      swRegistration.showNotification(title, {
        body,
        icon: "logo.png",
        badge: "logo.png",
        tag: "faiora-test",
        renotify: true,
        requireInteraction: true
      });
    } else {
      new Notification(title, { body, icon: "logo.png" });
    }
    registerFCMToken();
  };
  const registerFCMToken = async () => {
    try {
      if (VAPID_KEY === "YOUR_VAPID_KEY_HERE") {
        console.warn("\u26A0\uFE0F FCM VAPID key not set! Background notifications won't work.");
        return;
      }
      const messaging = firebase.messaging();
      let reg = swRegistration;
      if (!reg && "serviceWorker" in navigator) {
        reg = await navigator.serviceWorker.ready;
      }
      const token = await messaging.getToken({
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: reg
      });
      if (token && auth.currentUser) {
        const userId = auth.currentUser.uid;
        const tokenRef = db.collection("fcmTokens").doc(userId);
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
        console.log("\u{1F514} FCM token verified/registered");
      }
    } catch (err) {
      console.warn("FCM token registration failed:", err);
    }
  };
  let _sfxCtx = null;
  const getSFXCtx = () => {
    try {
      if (!_sfxCtx || _sfxCtx.state === "closed") {
        _sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_sfxCtx.state === "suspended") {
        _sfxCtx.resume().catch(() => {
        });
      }
      return _sfxCtx;
    } catch (e) {
      return null;
    }
  };
  let _notifSFXPending = false;
  const playNotifSFX = () => {
    if (_notifSFXPending) return;
    _notifSFXPending = true;
    setTimeout(() => {
      _notifSFXPending = false;
    }, 400);
    try {
      const ctx = getSFXCtx();
      if (!ctx) return;
      const playTone = (freq, start, dur, vol = 0.15) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(1046.5, 0, 0.15, 0.12);
      playTone(1318.51, 0.12, 0.15, 0.1);
      playTone(1567.98, 0.24, 0.25, 0.08);
    } catch (e) {
    }
  };
  const playAlarmSFX = () => {
    try {
      if (window._faiora_alarm_audio) {
        if (window._faiora_alarm_audio.paused) {
          window._faiora_alarm_audio.play().catch(() => {
            if (!window._faiora_audio_resume_fn) {
              window._faiora_audio_resume_fn = () => {
                if (window._faiora_alarm_audio) window._faiora_alarm_audio.play().catch(() => {
                });
                document.removeEventListener("click", window._faiora_audio_resume_fn);
                document.removeEventListener("keydown", window._faiora_audio_resume_fn);
                window._faiora_audio_resume_fn = null;
              };
              document.addEventListener("click", window._faiora_audio_resume_fn);
              document.addEventListener("keydown", window._faiora_audio_resume_fn);
            }
          });
        }
        return;
      }
      const alarmUrl = "https://assets.mixkit.co/music/preview/mixkit-morning-sun-wake-up-alarm-2688.mp3";
      const audio = new Audio(alarmUrl);
      audio.loop = true;
      audio.volume = 0.9;
      window._faiora_alarm_audio = audio;
      audio.play().catch(() => {
        if (!window._faiora_audio_resume_fn) {
          window._faiora_audio_resume_fn = () => {
            if (window._faiora_alarm_audio) window._faiora_alarm_audio.play().catch(() => {
            });
            document.removeEventListener("click", window._faiora_audio_resume_fn);
            document.removeEventListener("keydown", window._faiora_audio_resume_fn);
            window._faiora_audio_resume_fn = null;
          };
          document.addEventListener("click", window._faiora_audio_resume_fn);
          document.addEventListener("keydown", window._faiora_audio_resume_fn);
        }
      });
    } catch (e) {
      console.warn("Alarm SFX failed", e);
    }
  };
  const stopAlarmSFX = () => {
    if (window._faiora_audio_resume_fn) {
      document.removeEventListener("click", window._faiora_audio_resume_fn);
      document.removeEventListener("keydown", window._faiora_audio_resume_fn);
      window._faiora_audio_resume_fn = null;
    }
    if (window._faiora_alarm_audio) {
      window._faiora_alarm_audio.pause();
      window._faiora_alarm_audio.currentTime = 0;
      window._faiora_alarm_audio = null;
    }
  };
  let _checkSFXPending = false;
  const playCheckSFX = () => {
    if (_checkSFXPending) return;
    _checkSFXPending = true;
    setTimeout(() => {
      _checkSFXPending = false;
    }, 400);
    try {
      const ctx = getSFXCtx();
      if (!ctx) return;
      const playTone = (freq, start, dur, vol = 0.1) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(1174.66, 0, 0.09, 0.08);
    } catch (e) {
    }
  };
  const formatNotifTime = (dateObj) => {
    let hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minStr = minutes === 0 ? "" : ":" + String(minutes).padStart(2, "0");
    return `${hours}${minStr}${ampm}`;
  };
  const sendNotification = async (title, body, tag, extra = {}) => {
    const nativePlugin = nativeLocalNotifications();
    if (nativePlugin) {
      const permission = await requestPermission();
      if (permission !== "granted") return;
      const notifId = extra.taskId ? getTaskReminderId(extra.taskId) : hashNotificationId(tag);
      await nativePlugin.schedule({
        notifications: [{
          id: notifId,
          title,
          body,
          channelId: extra.type === "alarm" ? ALARM_CHANNEL_ID : QUICK_TASK_CHANNEL_ID,
          schedule: { at: new Date(Date.now()), allowWhileIdle: true },
          ongoing: extra.type === "alarm",
          autoCancel: extra.type !== "alarm",
          extra: { ...extra, tag, title, body }
        }]
      });
      return;
    }
    if (!swRegistration) return;
    playNotifSFX();
    swRegistration.showNotification(title, {
      body,
      icon: "logo.png",
      badge: "logo.png",
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: { url: location.origin + location.pathname, ...extra }
    });
  };
  const checkMissedNotifications = () => {
    const scheduled = JSON.parse(localStorage.getItem("faiora_scheduled_notifs") || "{}");
    const now = Date.now();
    let hasMissed = false;
    Object.keys(scheduled).forEach((tag) => {
      const item = scheduled[tag];
      if (item.timestamp < now) {
        sendNotification(item.title, item.body, tag);
        delete scheduled[tag];
        hasMissed = true;
      }
    });
    if (hasMissed) {
      localStorage.setItem("faiora_scheduled_notifs", JSON.stringify(scheduled));
    }
  };
  const scheduleForTask = async (task) => {
    if (!task || !task.dueDate || task.completed) return;
    cancelForTask(task.id);
    await cancelNativeTaskNotifications(task.id);
    const nativeScheduled = await scheduleNativeTaskNotifications(task);
    if (nativeScheduled) return;
    const permitted = hasNotificationApi && Notification.permission === "granted";
    if (!permitted) return;
    const dueTime = task.dueTime || "23:59";
    const dueDateTime = /* @__PURE__ */ new Date(`${task.dueDate}T${dueTime}`);
    if (isNaN(dueDateTime.getTime())) return;
    const now = Date.now();
    const dueMs = dueDateTime.getTime();
    const taskTimers = [];
    const taskName = formatTaskText(task.text || task.title || "Task");
    const timeStr = formatNotifTime(dueDateTime);
    if (dueMs > now) {
      const id = setTimeout(() => {
        sendNotification(`Task Reminder! \u{1F525}`, `\u{1F4CC} Due Now: ${taskName}`, `faiora-task-${task.id}`, { type: "quick-task", stage: "due", taskId: task.id });
        const scheduled = JSON.parse(localStorage.getItem("faiora_scheduled_notifs") || "{}");
        scheduled[`faiora-task-${task.id}`] = { title: `Task Reminder! \u{1F525}`, body: `\u{1F4CC} Due Now: ${taskName}`, timestamp: dueMs, taskId: task.id };
        localStorage.setItem("faiora_scheduled_notifs", JSON.stringify(scheduled));
      }, dueMs - now);
      taskTimers.push(id);
    }
    const oneHourBefore = dueMs - 1 * 60 * 60 * 1e3;
    if (oneHourBefore > now) {
      const id = setTimeout(() => {
        sendNotification(`Task Reminder! \u{1F525}`, `\u23F3 Due in 1hr: ${taskName}`, `faiora-task-${task.id}`, { type: "quick-task", stage: "1h", taskId: task.id });
        const scheduled = JSON.parse(localStorage.getItem("faiora_scheduled_notifs") || "{}");
        scheduled[`faiora-task-${task.id}`] = { title: `Task Reminder! \u{1F525}`, body: `\u23F3 Due in 1hr: ${taskName}`, timestamp: dueMs, taskId: task.id };
        localStorage.setItem("faiora_scheduled_notifs", JSON.stringify(scheduled));
      }, oneHourBefore - now);
      taskTimers.push(id);
    }
    const twentyFourHoursBefore = dueMs - 24 * 60 * 60 * 1e3;
    if (twentyFourHoursBefore > now) {
      const id = setTimeout(() => {
        sendNotification(`Task Reminder! \u{1F525}`, `\u26A1 Due in 24hrs: ${taskName}`, `faiora-task-${task.id}`, { type: "quick-task", stage: "24h", taskId: task.id });
        const scheduled = JSON.parse(localStorage.getItem("faiora_scheduled_notifs") || "{}");
        scheduled[`faiora-task-${task.id}`] = { title: `Task Reminder! \u{1F525}`, body: `\u26A1 Due in 24hrs: ${taskName}`, timestamp: dueMs, taskId: task.id };
        localStorage.setItem("faiora_scheduled_notifs", JSON.stringify(scheduled));
      }, twentyFourHoursBefore - now);
      taskTimers.push(id);
    }
    if (taskTimers.length > 0) {
      timers.set(task.id, taskTimers);
    }
  };
  const cancelForTask = (taskId) => {
    try {
      const existing = timers.get(taskId);
      if (existing) {
        existing.forEach((id) => clearTimeout(id));
        timers.delete(taskId);
      }
      try {
        cancelNativeTaskNotifications(taskId);
      } catch (e) {
      }
      try {
        removeDeliveredTaskNotifications(taskId);
      } catch (e) {
      }
      if (swRegistration && typeof swRegistration.getNotifications === "function") {
        ["faiora-task", "faiora-due", "faiora-1h", "faiora-24h"].forEach((prefix) => {
          try {
            swRegistration.getNotifications({ tag: `${prefix}-${taskId}` }).then((notifs) => {
              if (Array.isArray(notifs)) notifs.forEach((n) => {
                var _a;
                return (_a = n == null ? void 0 : n.close) == null ? void 0 : _a.call(n);
              });
            }).catch(() => {
            });
          } catch (e) {
          }
          try {
            const scheduled = JSON.parse(localStorage.getItem("faiora_scheduled_notifs") || "{}");
            delete scheduled[`${prefix}-${taskId}`];
            localStorage.setItem("faiora_scheduled_notifs", JSON.stringify(scheduled));
          } catch (e) {
          }
        });
      }
    } catch (err) {
      console.warn("cancelForTask failed", err);
    }
  };
  const rescheduleAll = (tasks) => {
    timers.forEach((timerIds) => timerIds.forEach((id) => clearTimeout(id)));
    timers.clear();
    if (!tasks || !Array.isArray(tasks)) return;
    tasks.forEach((t) => {
      var _a, _b;
      const isDone = !!t.completed || t.progress !== void 0 && t.progress >= 100;
      if (isDone) {
        cancelForTask(t.id);
        if ((_a = window.FaioraNativeAlarmBridge) == null ? void 0 : _a.markTaskCompleted) window.FaioraNativeAlarmBridge.markTaskCompleted(String(t.id), true);
      } else if (t.dueDate) {
        if ((_b = window.FaioraNativeAlarmBridge) == null ? void 0 : _b.markTaskCompleted) window.FaioraNativeAlarmBridge.markTaskCompleted(String(t.id), false);
        scheduleForTask(t);
      }
    });
  };
  const checkCloudHealth = async () => {
    try {
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      if (!userId) return { connected: false, hasToken: false };
      const activeColl = localStorage.getItem("faiora_active_collection") || "tasks";
      const status = { connected: false, hasToken: false };
      const testRef = db.collection(activeColl).doc(userId);
      await testRef.set({ _lastHealthCheck: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      const doc = await testRef.get();
      if (doc.exists) status.connected = true;
      const tokenDoc = await db.collection("fcmTokens").doc(userId).get();
      status.hasToken = tokenDoc.exists && (tokenDoc.data().tokens || []).length > 0;
      return status;
    } catch (e) {
      console.warn("Cloud health check failed:", e);
      return { connected: false, hasToken: false };
    }
  };
  const notifyNow = async (title, body, tag = "faiora-generic", extra = {}) => {
    if (hasNativeLocalNotifications()) {
      const hasPermission = await hasNativeNotificationPermission();
      if (hasPermission) {
        await sendNotification(title, body, tag, extra);
        return;
      }
    }
    if (!hasNotificationApi || Notification.permission !== "granted") return;
    sendNotification(title, body, tag, extra);
  };
  return {
    isSwReady: () => swReady,
    checkMissedNotifications,
    requestPermission,
    testNotification,
    registerFCMToken,
    scheduleForTask,
    cancelForTask,
    rescheduleAll,
    playCheckSFX,
    playNotifSFX,
    playAlarmSFX,
    stopAlarmSFX,
    // FIX 2026-04-22: Exported stopAlarmSFX to avoid ReferenceError in App core
    checkCloudHealth,
    notifyNow,
    emitInAppAlert,
    subscribeInApp,
    hasNativeLocalNotifications,
    hasNativeAlarmBridge,
    hasAlarmOverlayPermission,
    requestAlarmOverlayPermission,
    consumeNativeAlarmEvents,
    scheduleAlarmNotification,
    cancelAlarmNotification,
    removeDeliveredAlarmNotifications,
    getDeliveredNotifications,
    // (2026-07-13) Export getTaskReminderId. Prev: unexported
    getTaskReminderId,
    show: (title, body, tag = "faiora-generic", extra = {}) => notifyNow(title, body, tag, extra)
  };
})();
const Sidebar = () => null;
const MobileNav = () => null;
const createFireSparks = (x, y, width = 200, isWide = false) => {
  const sparkCount = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement("div");
    spark.className = "fire-spark-particle";
    const angle = Math.PI * 2 / sparkCount * i + (Math.random() - 0.5) * 0.6;
    const distance = 30 + Math.random() * 50;
    const sparkX = Math.cos(angle) * distance;
    const sparkY = Math.sin(angle) * distance;
    spark.style.setProperty("--spark-x", `${sparkX}px`);
    spark.style.setProperty("--spark-y", `${sparkY}px`);
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.animationDelay = `${i * 15}ms`;
    spark.style.animationDuration = `${250 + Math.random() * 150}ms`;
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 450);
  }
};
window.createFireSparks = createFireSparks;
const createEmberParticles = (x, y) => {
  const emberCount = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < emberCount; i++) {
    const ember = document.createElement("div");
    ember.className = "ember-particle";
    const spreadX = (Math.random() - 0.5) * 60;
    ember.style.left = `${x + spreadX}px`;
    ember.style.top = `${y}px`;
    ember.style.animationDelay = `${i * 20}ms`;
    ember.style.animationDuration = `${400 + Math.random() * 200}ms`;
    document.body.appendChild(ember);
    setTimeout(() => ember.remove(), 650);
  }
};
window.createEmberParticles = createEmberParticles;
const playWhooshSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    oscillator.type = "sine";
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (err) {
    console.warn("Could not play whoosh sound:", err);
  }
};
window.playWhooshSound = playWhooshSound;
const ResponsiveNav = () => {
  const location2 = useLocation();
  const isActive = (path) => location2.pathname === path;
  const createSparks = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    for (let i = 0; i < 10; i++) {
      const spark = document.createElement("div");
      spark.className = "spark";
      const tx = (Math.random() - 0.5) * 140;
      const ty = -Math.random() * 80 - 40;
      spark.style.setProperty("--tx", `${tx}px`);
      spark.style.setProperty("--ty", `${ty}px`);
      spark.style.left = `${centerX}px`;
      spark.style.top = `${centerY}px`;
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 800);
    }
  };
  const navIconMap = {
    "/": "home",
    "/notes": "notes",
    "/quick-tasks": "quick_tasks",
    "/alarms": "alarms",
    "/calendar": "calendar"
  };
  const NavLink = ({ to, label, iconKey = null }) => {
    const active = isActive(to);
    const resolvedKey = iconKey || navIconMap[to] || "home";
    const iconSrc = `assets/nav_icons/${resolvedKey}_${active ? "filled" : "outline"}.png`;
    return /* @__PURE__ */ React.createElement(
      Link,
      {
        to,
        onClick: createSparks,
        onContextMenu: (e) => e.preventDefault(),
        onTouchStart: (e) => {
          const target = e.currentTarget;
          if (!target) return;
          target.dataset.longPress = String(setTimeout(() => {
            if (target == null ? void 0 : target.dataset) target.dataset.preventClick = "true";
          }, 500));
        },
        onTouchEnd: (e) => {
          var _a;
          const target = e.currentTarget;
          if ((_a = target == null ? void 0 : target.dataset) == null ? void 0 : _a.longPress) {
            clearTimeout(parseInt(target.dataset.longPress));
            delete target.dataset.longPress;
          }
          setTimeout(() => {
            if (target == null ? void 0 : target.dataset) delete target.dataset.preventClick;
          }, 50);
        },
        onTouchCancel: (e) => {
          var _a;
          const target = e.currentTarget;
          if ((_a = target == null ? void 0 : target.dataset) == null ? void 0 : _a.longPress) {
            clearTimeout(parseInt(target.dataset.longPress));
            delete target.dataset.longPress;
          }
        },
        className: `nav-item-animation flex flex-col items-center justify-center group relative w-14 h-11 md:w-full md:aspect-square select-none transition-all duration-150 active:scale-95 rounded-xl`,
        style: { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }
      },
      /* @__PURE__ */ React.createElement(
        "img",
        {
          src: iconSrc,
          alt: label,
          draggable: false,
          onDragStart: (e) => e.preventDefault(),
          className: `nav-icon-filter w-[25.08px] h-[25.08px] object-contain select-none pointer-events-none transition-all duration-200 ${active ? "drop-shadow-[0_0_10px_rgba(249,115,22,0.85)]" : ""}`
        }
      ),
      /* @__PURE__ */ React.createElement("span", { className: "absolute left-full ml-4 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 -translate-x-4 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block whitespace-nowrap z-[100] shadow-xl" }, label)
    );
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("nav", { className: "faiora-mobile-nav fixed bottom-0 left-0 right-0 flex justify-around items-center py-2.5 z-[100] px-4 md:hidden transition-opacity duration-300" }, /* @__PURE__ */ React.createElement(NavLink, { to: "/", label: "Home", iconKey: "home" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/notes", label: "Notes", iconKey: "notes" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/quick-tasks", label: "Quick Tasks", iconKey: "quick_tasks" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/alarms", label: "Alarms", iconKey: "alarms" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/calendar", label: "Calendar", iconKey: "calendar" })), /* @__PURE__ */ React.createElement("nav", { id: "faiora_desktop_sidebar", className: "faiora-desktop-sidebar hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex-col items-center py-12 gap-8 z-[100]" }, /* @__PURE__ */ React.createElement("div", { id: "faiora_sidebar_logo_container", className: "mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("img", { src: "assets/icon-only.png", alt: "Faiora Logo", draggable: false, onDragStart: (e) => e.preventDefault(), className: "w-11 h-11 object-contain drop-shadow-[0_0_12px_rgba(249,115,22,0.7)] select-none pointer-events-none" }))), /* @__PURE__ */ React.createElement(NavLink, { to: "/", label: "Home", iconKey: "home" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/notes", label: "Notes", iconKey: "notes" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/quick-tasks", label: "Quick Tasks", iconKey: "quick_tasks" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/alarms", label: "Alarms", iconKey: "alarms" }), /* @__PURE__ */ React.createElement(NavLink, { to: "/calendar", label: "Calendar", iconKey: "calendar" })));
};
const PullToRefresh = ({ children, onRefresh, disabled = false }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState("idle");
  const pullDistanceRef = useRef(0);
  const isPulling = useRef(false);
  const startY = useRef(0);
  const statusRef = useRef("idle");
  const contentRef = useRef(null);
  const THRESHOLD = 72;
  const MAX_PULL = 100;
  useEffect(() => {
    if (disabled) return;
    const el = contentRef.current;
    if (!el) return;
    const handleTouchStart = (e) => {
      if (document.querySelector('.faiora-auth-screen, .fixed.inset-0.z-\\[950\\], .fixed.inset-0.z-\\[2000\\], .fixed.inset-0.z-\\[2050\\], [role="dialog"]')) return;
      const touch = e.touches[0];
      const scrollContainer = e.target.closest(".overflow-y-auto, [data-scroll]");
      if (scrollContainer && scrollContainer.scrollTop > 0) return;
      if (window.scrollY > 0) return;
      isPulling.current = true;
      startY.current = touch.pageY;
    };
    const handleTouchMove = (e) => {
      if (!isPulling.current) return;
      const diffY = e.touches[0].pageY - startY.current;
      if (diffY <= 0) {
        isPulling.current = false;
        return;
      }
      const pull = Math.min(MAX_PULL, diffY * 0.45);
      pullDistanceRef.current = pull;
      setPullDistance(pull);
      statusRef.current = pull >= THRESHOLD ? "ready" : "pulling";
      setStatus(statusRef.current);
      if (pull > 4 && e.cancelable) e.preventDefault();
    };
    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      const pull = pullDistanceRef.current;
      if (pull >= THRESHOLD) {
        statusRef.current = "refreshing";
        setStatus("refreshing");
        pullDistanceRef.current = 56;
        setPullDistance(56);
        if (onRefresh) {
          onRefresh().finally(() => {
            setTimeout(() => {
              statusRef.current = "idle";
              setStatus("idle");
              pullDistanceRef.current = 0;
              setPullDistance(0);
            }, 250);
          });
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        statusRef.current = "idle";
        setStatus("idle");
      }
    };
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [disabled, onRefresh]);
  const cardVisible = pullDistance > 0 || status === "refreshing";
  const NAVBAR_H = 76;
  const cardY = status === "refreshing" ? NAVBAR_H + 28 : Math.max(NAVBAR_H, NAVBAR_H + pullDistance * 0.65);
  const spinnerProgress = Math.min(1, pullDistance / THRESHOLD);
  const spinnerDash = 2 * Math.PI * 11;
  return /* @__PURE__ */ React.createElement("div", { id: "faiora_pull_to_refresh_wrapper", ref: contentRef, className: "flex-1 h-full flex flex-col relative", style: { touchAction: "pan-y" } }, /* @__PURE__ */ React.createElement(
    "div",
    {
      id: "faiora_pull_to_refresh_indicator",
      className: "pointer-events-none absolute left-1/2 z-[90]",
      style: {
        top: 0,
        transform: `translateX(-50%) translateY(${cardVisible ? cardY : NAVBAR_H - 56}px)`,
        transition: status === "refreshing" || status === "idle" ? "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s" : "none",
        opacity: cardVisible ? 1 : 0,
        willChange: "transform"
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-11 h-11 rounded-full flex items-center justify-center shadow-xl",
        style: { background: "#1a0a04", border: "1px solid rgba(249,115,22,0.25)" }
      },
      status === "refreshing" ? (
        /* Spinning loader ring when refreshing */
        /* @__PURE__ */ React.createElement("div", { className: "w-5 h-5 rounded-full border-2 border-white/10 border-t-primary animate-spin" })
      ) : (
        /* Arc fills as user pulls — clockwise like Google */
        /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", className: "-rotate-90" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "11", fill: "none", stroke: "rgba(255,255,255,0.07)", strokeWidth: "2.5" }), /* @__PURE__ */ React.createElement(
          "circle",
          {
            cx: "12",
            cy: "12",
            r: "11",
            fill: "none",
            stroke: spinnerProgress >= 1 ? "#f97316" : "#f97316",
            strokeWidth: "2.5",
            strokeLinecap: "round",
            strokeDasharray: spinnerDash,
            strokeDashoffset: spinnerDash * (1 - spinnerProgress),
            style: { opacity: spinnerProgress > 0 ? 1 : 0 }
          }
        ), /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M12 5 L9 8 L12 8 L12 5 Z",
            fill: "#f97316",
            style: {
              transformOrigin: "12px 8px",
              transform: `rotate(${spinnerProgress * 360}deg) translateX(0)`,
              opacity: spinnerProgress > 0 ? 1 : 0
            }
          }
        ))
      )
    )
  ), children);
};
const Layout = ({ children, onOpenCreator, onFabClick, onRefresh, noPadding = false, showFab = true, pomodoroTime, isPomodoroActive, disablePullToRefresh = false }) => {
  const handleFabClick = onFabClick || onOpenCreator;
  const location2 = useLocation();
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [pressedFabIndex, setPressedFabIndex] = useState(null);
  const navigate = useNavigate();
  const pomodoroProgress = isPomodoroActive ? (1500 - pomodoroTime) / 1500 * 100 : 0;
  useEffect(() => {
    if (!isFabMenuOpen) return;
    window.history.pushState({ modal: "fabMenu" }, "");
    const handlePopState = () => {
      setIsFabMenuOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isFabMenuOpen]);
  const closeFabMenu = useCallback((popHistory = true) => {
    var _a;
    setIsFabMenuOpen(false);
    window.__faioraLastFabCloseTime = Date.now();
    if (popHistory && ((_a = window.history.state) == null ? void 0 : _a.modal) === "fabMenu") {
      window.history.back();
    }
  }, []);
  useEffect(() => {
    window.__faioraFabMenuOpen = isFabMenuOpen;
    window.__faioraCloseFabMenu = () => closeFabMenu(false);
    if (isFabMenuOpen) {
      document.body.classList.add("fab-menu-open", "has-modal-open");
    } else {
      document.body.classList.remove("fab-menu-open");
      if (!document.querySelector('.qt-modal-backdrop-in, [class*="z-[2000]"]')) {
        document.body.classList.remove("has-modal-open");
      }
    }
    window.dispatchEvent(new CustomEvent("faiora-fab-state", { detail: { open: isFabMenuOpen } }));
    return () => {
      window.__faioraFabMenuOpen = false;
      window.__faioraCloseFabMenu = null;
      document.body.classList.remove("fab-menu-open");
    };
  }, [isFabMenuOpen, closeFabMenu]);
  useEffect(() => {
    const handleClosePopups = () => {
      if (isFabMenuOpen) closeFabMenu(false);
    };
    window.addEventListener("faiora-close-popups", handleClosePopups);
    return () => window.removeEventListener("faiora-close-popups", handleClosePopups);
  }, [isFabMenuOpen, closeFabMenu]);
  const handleMainFabClick = () => {
    if (location2.pathname === "/notes") {
      onOpenCreator == null ? void 0 : onOpenCreator();
    } else if (location2.pathname === "/quick-tasks") {
      onFabClick == null ? void 0 : onFabClick();
    } else if (location2.pathname === "/alarms") {
      onFabClick == null ? void 0 : onFabClick();
    } else {
      if (isFabMenuOpen) closeFabMenu();
      else setIsFabMenuOpen(true);
    }
  };
  const content = /* @__PURE__ */ React.createElement("main", { id: "faiora_main_content_scroll", className: `flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative pt-0 pb-24 md:pb-12 ${noPadding ? "px-0" : "px-0 md:px-18"} md:ml-24` }, children, showFab && /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      id: "faiora_mobile_fab",
      onClick: handleMainFabClick,
      className: `faiora-mobile-fab fixed bottom-[100px] md:bottom-12 right-5 md:right-12 w-[64px] h-[64px] md:w-20 md:h-20 ${isFabMenuOpen ? "bg-zinc-800 rotate-45 shadow-xl z-[400]" : "bg-gradient-to-br from-[#fb923c] via-[#ea580c] to-[#c2410c] shadow-[0_8px_25px_rgba(234,88,12,0.45)] border border-white/20 z-[120]"} text-white rounded-full flex items-center justify-center transition-all duration-200 hover:brightness-105 active:brightness-75 active:scale-95 group select-none`
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[30px] md:text-4xl group-hover:rotate-90 transition-transform duration-300" }, "add")
  ), isFabMenuOpen && typeof document !== "undefined" && ReactDOM.createPortal(
    /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "fixed inset-0 bg-black/85 backdrop-blur-md z-[900] animate-in fade-in duration-300 pointer-events-auto",
        onClick: closeFabMenu
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-[180px] md:bottom-36 right-5 md:right-12 flex flex-col items-end gap-4 z-[950] animate-in slide-in-from-bottom-10 fade-in duration-300" }, [
      {
        label: "ALARM",
        icon: "alarm",
        color: "bg-slate-700",
        onClick: () => {
          closeFabMenu(false);
          navigate("/alarms");
        }
      },
      // (2026-07-13) Replace history on FAB quick task. Prev: pop closed modal
      {
        label: "QUICK TASK",
        icon: "check_circle",
        color: "bg-burnt-orange",
        onClick: () => {
          var _a;
          if (((_a = window.history.state) == null ? void 0 : _a.modal) === "fabMenu") {
            window.history.replaceState({ modal: "quickTask" }, "");
          }
          closeFabMenu(false);
          if (location2.pathname === "/" && onFabClick) {
            onFabClick();
          } else {
            window.dispatchEvent(new CustomEvent("faiora-open-task-creator"));
          }
        }
      },
      {
        label: "NOTES",
        icon: "description",
        color: "bg-primary",
        onClick: () => {
          var _a;
          if (((_a = window.history.state) == null ? void 0 : _a.modal) === "fabMenu") {
            window.history.replaceState({ modal: "creator" }, "");
          }
          closeFabMenu(false);
          if (location2.pathname === "/calendar") navigate("/notes");
          else onOpenCreator();
        }
      }
    ].map((item, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        onClick: () => {
          setPressedFabIndex(null);
          item.onClick();
        },
        className: "flex items-center gap-3 group active:scale-90 active:brightness-125 transition-all duration-150 ease-out cursor-pointer select-none"
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-[10.5px] font-bold text-cream-light font-montserrat px-3.5 py-1.5 bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl uppercase tracking-wider select-none group-hover:border-primary/50 group-hover:text-primary transition-all duration-150 group-active:border-primary group-active:text-primary group-active:scale-95 group-active:bg-zinc-800" }, item.label),
      /* @__PURE__ */ React.createElement("div", { className: `w-14 h-14 md:w-16 md:h-16 ${item.color} rounded-[1.25rem] md:rounded-3xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all duration-150 border border-white/15 group-active:scale-90 group-active:ring-4 group-active:ring-white/40` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-2xl md:text-3xl" }, item.icon))
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        id: "faiora_mobile_fab_close",
        onClick: closeFabMenu,
        className: "faiora-mobile-fab fixed bottom-[100px] md:bottom-12 right-5 md:right-12 w-[64px] h-[64px] md:w-20 md:h-20 bg-zinc-800 border border-white/20 shadow-2xl text-white rounded-full flex items-center justify-center z-[950] active:scale-95 transition-all duration-200",
        title: "Close Menu"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[30px] md:text-4xl text-white/90" }, "close")
    )),
    document.body
  )));
  return /* @__PURE__ */ React.createElement("div", { id: "faiora_app_layout_shell", className: "flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-transparent" }, isPomodoroActive && /* @__PURE__ */ React.createElement("div", { id: "global_pomodoro_sync_bar", className: "fixed top-0 left-0 right-0 h-[3px] bg-white/5 z-[1000] pointer-events-none" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.8)] transition-all duration-1000 ease-linear",
      style: { width: `${pomodoroProgress}%` }
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-primary/30 to-transparent animate-pulse" })), /* @__PURE__ */ React.createElement(ResponsiveNav, null), onRefresh ? /* @__PURE__ */ React.createElement(PullToRefresh, { onRefresh, disabled: disablePullToRefresh }, content) : content);
};
const UserMenu = ({ user }) => {
  var _a, _b;
  const [isOpen, setIsOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const [cloudStatus, setCloudStatus] = useState("checking");
  const normalizeAvatarUrl = useCallback((value) => {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return "";
    if (!/(googleusercontent\.com|googleapis\.com)/i.test(raw)) return raw;
    let next = raw.replace(/=s\d+-c$/i, "=s256-c").replace(/=s\d+$/i, "=s256-c").replace(/([?&])sz=\d+/i, "$1sz=256");
    if (!/[?&]sz=\d+/i.test(next)) {
      next += next.includes("?") ? "&sz=256" : "?sz=256";
    }
    return next;
  }, []);
  const avatarSources = useMemo(() => {
    var _a2, _b2, _c;
    const providerPhoto = Array.isArray(user == null ? void 0 : user.providerData) ? (_a2 = user.providerData.find((entry) => entry == null ? void 0 : entry.photoURL)) == null ? void 0 : _a2.photoURL : "";
    const rawSources = [
      user == null ? void 0 : user.photoURL,
      providerPhoto,
      (_b2 = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _b2.photoUrl,
      (_c = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _c.photoURL
    ].filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
    const expandedSources = rawSources.flatMap((src) => {
      const normalized = normalizeAvatarUrl(src);
      return normalized && normalized !== src ? [normalized, src] : [src];
    });
    return Array.from(new Set(expandedSources));
  }, [normalizeAvatarUrl, user == null ? void 0 : user.photoURL, user == null ? void 0 : user.providerData, (_a = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _a.photoURL, (_b = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _b.photoUrl]);
  const currentSourceKey = avatarSources.join("|");
  const [avatarState, setAvatarState] = useState({ key: currentSourceKey, index: 0 });
  const resolvedIndex = avatarState.key === currentSourceKey ? avatarState.index : 0;
  const activeAvatarSrc = resolvedIndex < avatarSources.length ? avatarSources[resolvedIndex] : "";
  const menuRef = useRef();
  const navigate = useNavigate();
  useEffect(() => {
    if (isOpen && user) {
      FaioraNotifications.checkCloudHealth().then((res) => {
        setCloudStatus(res.connected ? "ok" : "error");
      });
    }
  }, [isOpen, user]);
  const handleRequestNotif = async () => {
    const result = await FaioraNotifications.requestPermission();
    setNotifStatus(result);
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleCloseInternal = () => setIsOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("faiora-close-popups", handleCloseInternal);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("faiora-close-popups", handleCloseInternal);
    };
  }, []);
  const toggleMenu = () => {
    const next = !isOpen;
    if (next) {
      window.history.pushState({ modal: "usermenu", popup: true }, "");
      setNotifStatus(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    }
    setIsOpen(next);
  };
  const handleLogout = () => {
    auth.signOut();
    localStorage.removeItem("faiora_logged_in");
    localStorage.removeItem("faiora_uid_override");
    localStorage.removeItem("faiora_active_collection");
  };
  const handleLogin = () => {
    signInWithGoogle().catch((e) => {
      console.error("Login failed", e);
      alert("Google login failed: " + ((e == null ? void 0 : e.message) || "Unknown error"));
    });
  };
  if (!user) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleLogin,
        className: "flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold transition-all text-cream-light/60 hover:text-primary active:scale-95"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "login"),
      "LOGIN"
    );
  }
  return /* @__PURE__ */ React.createElement("div", { className: "relative", ref: menuRef }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: toggleMenu,
      className: "w-[38px] h-[38px] md:w-12 md:h-12 rounded-full overflow-hidden border border-white/15 ring-2 ring-black/25 hover:ring-primary/50 transition-all duration-300 skeleton-profile-circle flex items-center justify-center bg-zinc-800",
      id: "user-profile-menu-button"
    },
    activeAvatarSrc ? /* @__PURE__ */ React.createElement(
      "img",
      {
        key: activeAvatarSrc,
        alt: user.displayName || "User",
        className: "w-full h-full object-cover bg-primary/20 opacity-0 transition-opacity duration-300",
        src: activeAvatarSrc,
        loading: "eager",
        decoding: "async",
        referrerPolicy: "no-referrer",
        onLoad: (e) => e.target.classList.remove("opacity-0"),
        onError: () => {
          setTimeout(() => {
            setAvatarState((prev) => ({
              key: currentSourceKey,
              index: (prev.key === currentSourceKey ? prev.index : 0) + 1
            }));
          }, 0);
        }
      }
    ) : /* @__PURE__ */ React.createElement("div", { id: "faiora_avatar_fallback", className: "faiora-avatar-fallback-initials w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-burnt-orange/30 text-primary font-black text-sm" }, (user.displayName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase())
  ), isOpen && /* FIX 2026-10-04: User menu dropdown with animations and auto-close */
  /* @__PURE__ */ React.createElement(
    "div",
    {
      id: "faiora_user_menu_dropdown",
      className: "faiora-user-menu-dropdown absolute right-0 mt-2 md:mt-4 w-48 sm:w-52 md:w-64 bg-slate-900 backdrop-blur-xl border border-white/15 rounded-2xl md:rounded-3xl p-1.5 md:p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-[250] overflow-hidden",
      style: {
        animation: "dropdown-slide-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        transformOrigin: "top right"
      }
    },
    /* @__PURE__ */ React.createElement("div", { id: "faiora_user_menu_info", className: "faiora-user-menu-header px-3 py-2 md:p-4 border-b border-white/5 mb-1 md:mb-2" }, /* @__PURE__ */ React.createElement("p", { id: "faiora_user_menu_name", className: "text-white font-bold text-xs md:text-sm truncate" }, user.displayName), /* @__PURE__ */ React.createElement("p", { id: "faiora_user_menu_email", className: "text-white/40 text-[10px] md:text-xs truncate" }, user.email)),
    /* @__PURE__ */ React.createElement("button", { id: "faiora_user_menu_profile_btn", onClick: () => {
      setIsOpen(false);
      navigate("/profile");
    }, className: "faiora-user-menu-item flex items-center gap-2.5 md:gap-3 w-full px-2.5 py-1.5 md:p-3 hover:bg-white/10 rounded-xl md:rounded-2xl text-white/70 hover:text-primary transition-all text-xs md:text-sm group" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-xl group-hover:scale-110 transition-transform" }, "person"), "Profile"),
    /* @__PURE__ */ React.createElement("button", { id: "faiora_user_menu_settings_btn", onClick: () => {
      setIsOpen(false);
      navigate("/settings");
    }, className: "faiora-user-menu-item flex items-center gap-2.5 md:gap-3 w-full px-2.5 py-1.5 md:p-3 hover:bg-white/10 rounded-xl md:rounded-2xl text-white/70 hover:text-primary transition-all text-xs md:text-sm group" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-xl group-hover:scale-110 transition-transform" }, "settings"), "Settings"),
    /* @__PURE__ */ React.createElement("button", { id: "faiora_user_menu_trash_btn", onClick: () => {
      setIsOpen(false);
      navigate("/trash");
    }, className: "faiora-user-menu-item flex items-center gap-2.5 md:gap-3 w-full px-2.5 py-1.5 md:p-3 hover:bg-white/10 rounded-xl md:rounded-2xl text-white/70 hover:text-rose-400 transition-all text-xs md:text-sm group" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-xl group-hover:scale-110 transition-transform" }, "delete"), "Trash"),
    /* @__PURE__ */ React.createElement("div", { className: "h-px bg-white/5 my-1 md:my-2" }),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        id: "faiora_user_menu_logout_btn",
        onClick: handleLogout,
        className: "faiora-user-menu-item-danger flex items-center gap-2.5 md:gap-3 w-full px-2.5 py-1.5 md:p-3 hover:bg-red-500/20 rounded-xl md:rounded-2xl text-red-400 hover:text-red-300 transition-all text-xs md:text-sm group"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-xl group-hover:scale-110 transition-transform" }, "logout"),
      "Logout"
    )
  ));
};
const Header = ({
  title = "Faiora",
  subtitle = "Digital Planner",
  user,
  showSearch = true,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  mobileSearchPlaceholder,
  desktopSearchPlaceholder
}) => {
  const navigate = useNavigate();
  const location2 = useLocation();
  const queryParams = new URLSearchParams(location2.search);
  const initialSearch = queryParams.get("search") || "";
  const [localQuery, setLocalQuery] = useState(initialSearch);
  const [isSearching, setIsSearching] = useState(false);
  const isControlledSearch = typeof onSearchChange === "function";
  const queryValue = isControlledSearch ? searchValue || "" : localQuery;
  const resolvedMobilePlaceholder = mobileSearchPlaceholder || searchPlaceholder || "Search Faiora...";
  const resolvedDesktopPlaceholder = desktopSearchPlaceholder || searchPlaceholder || "Search everything...";
  const searchSpinnerActive = !isControlledSearch && isSearching;
  const isNonStickyPage = location2.pathname === "/notes" || location2.pathname === "/alarms" || location2.pathname === "/calendar";
  const submitSearch = useCallback(() => {
    const trimmed = queryValue.trim();
    if (isControlledSearch) {
      if (typeof onSearchSubmit === "function") {
        onSearchSubmit(trimmed);
      }
      return;
    }
    if (trimmed) {
      const targetPath = ["/", "/quick-tasks", "/alarms"].includes(location2.pathname) ? location2.pathname : "/notes";
      navigate(`${targetPath}?search=${encodeURIComponent(trimmed)}`);
    } else if (["/", "/notes", "/quick-tasks", "/alarms"].includes(location2.pathname) && queryParams.has("search")) {
      navigate(location2.pathname);
    }
  }, [isControlledSearch, location2.pathname, navigate, onSearchSubmit, queryParams, queryValue]);
  const clearSearch = useCallback(() => {
    if (isControlledSearch) {
      onSearchChange("");
      if (typeof onSearchSubmit === "function") {
        onSearchSubmit("");
      }
    } else {
      setLocalQuery("");
      if (["/", "/notes", "/quick-tasks", "/alarms"].includes(location2.pathname) && queryParams.has("search")) {
        navigate(location2.pathname);
      }
    }
  }, [isControlledSearch, location2.pathname, navigate, onSearchChange, onSearchSubmit, queryParams]);
  useEffect(() => {
    if (!showSearch || isControlledSearch) return;
    if (localQuery.trim() !== initialSearch) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      const trimmed = localQuery.trim();
      if (trimmed && trimmed !== initialSearch) {
        const targetPath = ["/", "/quick-tasks", "/alarms"].includes(location2.pathname) ? location2.pathname : "/notes";
        navigate(`${targetPath}?search=${encodeURIComponent(trimmed)}`);
      } else if (!trimmed && ["/", "/notes", "/quick-tasks", "/alarms"].includes(location2.pathname) && queryParams.has("search")) {
        navigate(location2.pathname);
      }
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [showSearch, isControlledSearch, localQuery, initialSearch, navigate, location2.pathname]);
  useEffect(() => {
    if (isControlledSearch) return;
    setLocalQuery(initialSearch);
    setIsSearching(false);
  }, [isControlledSearch, initialSearch]);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, `
                        @keyframes search-spin {
                            to { transform: rotate(360deg); }
                        }
                        .search-loader {
                            animation: search-spin 0.6s linear infinite;
                        }
                    `), /* @__PURE__ */ React.createElement("header", { className: "faiora-mobile-header md:hidden fixed top-0 left-0 right-0 z-[100] flex items-center justify-center px-4 animate-mobile-header" }, /* @__PURE__ */ React.createElement("div", { className: "h-[54px] flex items-center justify-between gap-3 relative z-10 w-full max-w-lg mx-auto" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      className: "shrink-0 flex items-center justify-center w-8 h-8 transition-transform active:scale-90",
      "aria-label": "Go to homepage",
      title: "Go to homepage"
    },
    /* @__PURE__ */ React.createElement("img", { src: "assets/icon-only.png", alt: "Faiora Logo", draggable: false, onDragStart: (e) => e.preventDefault(), className: "w-[40px] h-[40px] object-contain drop-shadow-[0_0_6px_rgba(249,115,22,0.45)] select-none pointer-events-none" })
  ), showSearch ? /* @__PURE__ */ React.createElement("div", { className: "flex-1 relative flex items-center group h-9" }, /* @__PURE__ */ React.createElement("span", { className: "absolute left-3.5 flex items-center justify-center pointer-events-none text-white/40 group-focus-within:text-primary transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: `${searchSpinnerActive ? "search-loader" : ""} flex items-center justify-center` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13.5px]" }, searchSpinnerActive ? "refresh" : "search"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: resolvedMobilePlaceholder,
      value: queryValue,
      onChange: (e) => {
        if (isControlledSearch) onSearchChange(e.target.value);
        else setLocalQuery(e.target.value);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          submitSearch();
        }
      },
      className: `w-full h-full bg-white/[0.08] hover:bg-white/[0.11] focus:bg-white/[0.14] border border-white/10 focus:border-primary/60 rounded-full pl-[35px] ${Boolean(queryValue) ? "pr-8" : "pr-4"} text-[13.5px] text-cream-light placeholder:text-[13.5px] placeholder:text-white/35 outline-none focus:outline-none focus:ring-1 focus:ring-primary/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.15)] transition-all font-display`
    }
  ), Boolean(queryValue) && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: clearSearch,
      className: "absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all",
      "aria-label": "Clear search",
      title: "Clear search"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[14px]" }, "close")
  )) : /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0 px-1 flex flex-col justify-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-display font-bold italic tracking-tight text-cream-light truncate leading-tight" }, title), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold uppercase tracking-[0.28em] text-primary/60 truncate leading-tight" }, subtitle)), /* @__PURE__ */ React.createElement("div", { className: "shrink-0 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(UserMenu, { user })))), /* @__PURE__ */ React.createElement("header", { id: "faiora_desktop_header", className: `faiora-desktop-header hidden md:flex ${isNonStickyPage ? "relative" : "sticky"} top-0 md:pt-5 md:pb-3 mb-4 z-[100] bg-transparent items-center justify-between gap-8` }, /* @__PURE__ */ React.createElement("div", { id: "faiora_desktop_header_title_group", className: "faiora-desktop-header-title flex flex-col" }, /* @__PURE__ */ React.createElement("h1", { className: "text-[3.5rem] font-display font-bold tracking-tighter text-cream-light italic leading-none drop-shadow-2xl" }, title), /* @__PURE__ */ React.createElement("p", { className: "text-primary/70 text-xs uppercase tracking-[0.5em] font-sans font-bold opacity-90" }, subtitle)), /* @__PURE__ */ React.createElement("div", { id: "faiora_desktop_header_actions", className: `faiora-desktop-header-actions ${showSearch ? "flex-1" : ""} flex items-center justify-end gap-10` }, showSearch && /* @__PURE__ */ React.createElement("div", { className: "flex-1 max-w-lg relative group" }, /* @__PURE__ */ React.createElement("span", { className: "absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none" }, /* @__PURE__ */ React.createElement("span", { className: `${searchSpinnerActive ? "search-loader" : ""} flex items-center justify-center` }, /* @__PURE__ */ React.createElement("span", { className: `material-symbols-outlined ${searchSpinnerActive ? "text-primary" : "text-white/20"} text-2xl group-focus-within:text-primary transition-colors` }, searchSpinnerActive ? "refresh" : "search"))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: resolvedDesktopPlaceholder,
      value: queryValue,
      onChange: (e) => {
        if (isControlledSearch) onSearchChange(e.target.value);
        else setLocalQuery(e.target.value);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          submitSearch();
        }
      },
      className: `w-full bg-white/[0.03] border border-white/5 rounded-[2rem] py-5 pl-16 ${Boolean(queryValue) ? "pr-14" : "pr-8"} text-cream-light placeholder:text-white/10 outline-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/5 transition-all font-display`
    }
  ), Boolean(queryValue) && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: clearSearch,
      className: "absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all",
      "aria-label": "Clear search",
      title: "Clear search"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close")
  )), /* @__PURE__ */ React.createElement(UserMenu, { user }))));
};
const TaskCreator = ({ onClose, user, editingNote, activeCollection: activeCollection2, onUpdateNote, onDeleteNote, onSaveVersion, showToast: showToast2, notes: notes2 = [], quickTasks: quickTasks2 = [], onToggleLock, onOpenLockSet, onToggleQuickTask, onUpdateQuickTask }) => {
  var _a;
  const noteId = useMemo(() => editingNote ? editingNote.id : "note_" + Date.now(), [editingNote]);
  const [title, setTitle] = useState(editingNote ? editingNote.title || "" : "");
  const [content, setContent] = useState(editingNote ? editingNote.content || "" : "");
  const isQuickTasksNotepad = useMemo(() => {
    var _a2;
    return ((editingNote == null ? void 0 : editingNote.labels) || []).includes("QUICK-TASKS") || ((_a2 = editingNote == null ? void 0 : editingNote.id) == null ? void 0 : _a2.startsWith("qt_live_notepad")) || (editingNote == null ? void 0 : editingNote.title) === "Quick Tasks Notepad" || title === "Quick Tasks Notepad";
  }, [editingNote, title]);
  const calculateQuickTasksProgress = useCallback((html) => {
    if (!html) return 0;
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const items = temp.querySelectorAll(".checklist-item, .qt-notepad-live-item");
    if (items.length === 0) return 0;
    let checked = 0;
    items.forEach((el) => {
      if (el.classList.contains("checked")) checked++;
    });
    return Math.round(checked / items.length * 100);
  }, []);
  const [progress, setProgress] = useState(() => {
    var _a2;
    if (editingNote) {
      if (((editingNote == null ? void 0 : editingNote.labels) || []).includes("QUICK-TASKS") || ((_a2 = editingNote == null ? void 0 : editingNote.id) == null ? void 0 : _a2.startsWith("qt_live_notepad")) || (editingNote == null ? void 0 : editingNote.title) === "Quick Tasks Notepad") {
        return calculateQuickTasksProgress(editingNote.content || "");
      }
      const saved = localStorage.getItem(`faiora_draft_progress_${editingNote.id}`);
      if (saved !== null) return parseInt(saved);
      return editingNote.progress || 0;
    }
    return 0;
  });
  useEffect(() => {
    if (isQuickTasksNotepad) {
      const html = editorRef.current ? editorRef.current.innerHTML : content;
      const autoProgress = calculateQuickTasksProgress(html);
      setProgress(autoProgress);
    }
  }, [isQuickTasksNotepad, content, calculateQuickTasksProgress]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const warmRandomThemes = ["warm1", "warm2", "warm3", "warm4", "warm5"];
  const getRandomWarmTheme = () => warmRandomThemes[Math.floor(Math.random() * warmRandomThemes.length)];
  const [showConfirm, setShowConfirm] = useState({ show: false, title: "", message: "", onConfirm: null, type: "danger" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPinned, setIsPinned] = useState(editingNote ? !!editingNote.isPinned : false);
  const [noteTheme, setNoteTheme] = useState(editingNote ? editingNote.noteTheme || "peach" : getRandomWarmTheme());
  const [activePopup, setActivePopup] = useState(null);
  const isLocked = editingNote ? !!editingNote.isLocked : false;
  const [hasChanges, setHasChanges] = useState(false);
  const [reminderDate, setReminderDate] = useState(editingNote ? editingNote.reminderDate || "" : "");
  const [showCustomReminder, setShowCustomReminder] = useState(false);
  const [activeSubPopup, setActiveSubPopup] = useState(null);
  const [isOpeningCooldown, setIsOpeningCooldown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpeningCooldown(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [noteId]);
  useEffect(() => {
    const handleCloseInternal = () => {
      setActiveSubPopup(null);
      setActivePopup(null);
    };
    window.addEventListener("faiora-close-popups", handleCloseInternal);
    return () => window.removeEventListener("faiora-close-popups", handleCloseInternal);
  }, []);
  const handleSetActivePopup = (popup) => {
    if (popup) {
      window.history.pushState({ modal: "creator", popup: true }, "");
    } else if (activePopup) {
    }
    setActivePopup(popup);
  };
  const handleSetActiveSubPopup = (sub) => {
    if (sub) {
      window.history.pushState({ modal: "creator", popup: true, sub: true }, "");
    }
    setActiveSubPopup(sub);
  };
  const [noteIcon, setNoteIcon] = useState(editingNote ? editingNote.noteIcon || "" : "notes");
  const [searchTerm, setSearchTerm] = useState("");
  const [labels, setLabels] = useState(editingNote ? editingNote.labels || [] : []);
  const [newLabelText, setNewLabelText] = useState("");
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [sharedWith, setSharedWith] = useState(editingNote ? editingNote.sharedWith || [] : []);
  const [shareEmail, setShareEmail] = useState("");
  const [isPublic, setIsPublic] = useState(editingNote ? !!editingNote.isPublic : false);
  const [allowPublicEdit, setAllowPublicEdit] = useState(editingNote ? !!editingNote.allowPublicEdit : false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicShareToken, setPublicShareToken] = useState(editingNote ? editingNote.publicShareToken || "" : "");
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);
  const modalRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const keyboardSafeSpace = keyboardOffset > 40 ? Math.min(keyboardOffset + 136, 360) : 112;
  const initialContent = useMemo(() => editingNote ? editingNote.content || "" : "", [editingNote]);
  const hasChangesRef = useRef(false);
  const editingNoteRef = useRef(editingNote);
  useEffect(() => {
    editingNoteRef.current = editingNote;
  }, [editingNote]);
  const debouncedSaveTimer = useRef(null);
  const debouncedHistoryTimer = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [matchRanges, setMatchRanges] = useState([]);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });
  React.useEffect(() => {
    if (!window.visualViewport) return;
    const handleViewportChange = () => {
      const modal = modalRef.current;
      if (!modal) return;
      const viewport = window.visualViewport;
      const keyboardOffset2 = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      const nextKeyboardOffset = keyboardOffset2 > 40 ? keyboardOffset2 : 0;
      setKeyboardOffset(nextKeyboardOffset);
      modal.style.setProperty("--faiora-keyboard-offset", nextKeyboardOffset ? `${nextKeyboardOffset}px` : "0px");
    };
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
    handleViewportChange();
    return () => {
      window.visualViewport.removeEventListener("resize", handleViewportChange);
      window.visualViewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);
  const allUsedLabels = React.useMemo(() => {
    const labelSet = /* @__PURE__ */ new Set(["PERSONAL", "WORK"]);
    if (notes2 && notes2.length > 0) {
      notes2.forEach((n) => {
        if (n.labels) n.labels.forEach((l) => {
          const upper = l.toUpperCase();
          if (upper !== "PRIORITY") labelSet.add(upper);
        });
      });
    }
    const otherLabels = Array.from(labelSet).sort();
    return ["PRIORITY", ...otherLabels];
  }, [notes2]);
  const icons = [
    "star",
    "favorite",
    "home",
    "work",
    "rocket",
    "lightbulb",
    "eco",
    "auto_stories",
    "fitness_center",
    "restaurant",
    "pets",
    "explore",
    "shopping_cart",
    "celebration",
    "terminal",
    "brush",
    "psychology",
    "monitoring",
    "diversity_3",
    "sports_esports",
    "volunteer_activism",
    "public",
    "castle",
    "luggage",
    "shopping_bag",
    "wallet",
    "medication",
    "spa",
    "comedy_mask",
    "theater_comedy",
    "music_note",
    "piano",
    "palette",
    "architecture",
    "biotech",
    "science",
    "vape_free",
    "podcasts",
    "school",
    "book",
    "menu_book",
    "library_books",
    "bookmark",
    "grade",
    "attach_money",
    "account_balance",
    "savings",
    "credit_card",
    "receipt_long",
    "flight",
    "train",
    "directions_car",
    "directions_bike",
    "directions_walk",
    "camera",
    "videocam",
    "headphones",
    "mic",
    "movie",
    "tv",
    "code",
    "developer_mode",
    "bug_report",
    "build",
    "extension",
    "widgets",
    "local_cafe",
    "local_bar",
    "local_pizza",
    "bakery_dining",
    "lunch_dining",
    "icecream",
    "sports_basketball",
    "sports_soccer",
    "sports_tennis",
    "pool",
    "surfing",
    "hiking",
    "cloud",
    "wb_sunny",
    "nights_stay",
    "ac_unit",
    "park",
    "forest",
    "child_care",
    "family_restroom",
    "elderly",
    "groups",
    "person",
    "face",
    "lock",
    "key",
    "shield",
    "security",
    "verified",
    "admin_panel_settings",
    "notifications_active",
    "alarm",
    "timer",
    "event",
    "today",
    "calendar_month",
    "chat",
    "forum",
    "mail",
    "call",
    "sms",
    "send",
    "flag",
    "emoji_events",
    "military_tech",
    "workspace_premium",
    "diamond",
    "token",
    "handyman",
    "plumbing",
    "electrical_services",
    "carpenter",
    "cleaning_services",
    "language",
    "translate",
    "travel_explore",
    "map",
    "pin_drop",
    "place",
    "local_hospital",
    "health_and_safety",
    "medical_services",
    "emergency",
    "church",
    "mosque",
    "temple_buddhist",
    "synagogue",
    "edit",
    "draw",
    "design_services",
    "color_lens",
    "auto_fix_high",
    "photo_filter"
  ];
  const filteredIcons = icons.filter((icon) => icon.toLowerCase().includes(searchTerm.toLowerCase()));
  useEffect(() => {
    const checkFormat = () => {
      if (document.activeElement === editorRef.current) {
        setActiveFormats({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline")
        });
      }
    };
    document.addEventListener("selectionchange", checkFormat);
    return () => document.removeEventListener("selectionchange", checkFormat);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!editorRef.current) return;
      editorRef.current.querySelectorAll(".chart-widget").forEach((widget) => {
        recalculateChartWidget(widget);
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const handleGlobalCleanup = (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".dragging-now").forEach((el) => el.classList.remove("dragging-now"));
        window.draggingImageActive = false;
        window.resizingActive = false;
      }
    };
    window.addEventListener("keydown", handleGlobalCleanup);
    const handleBlur = () => {
      document.querySelectorAll(".dragging-now").forEach((el) => el.classList.remove("dragging-now"));
      window.draggingImageActive = false;
      window.resizingActive = false;
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleGlobalCleanup);
      window.removeEventListener("blur", handleBlur);
      document.querySelectorAll(".dragging-now").forEach((el) => el.classList.remove("dragging-now"));
      window.draggingImageActive = false;
      window.resizingActive = false;
    };
  }, []);
  useEffect(() => {
    if (editingNote) return;
    if (!user || !activeCollection2) return;
    db.collection(activeCollection2).doc(user.uid).get().then(function(doc) {
      if (doc.exists && !editingNote) {
      }
    })["catch"](function(e) {
      console.error("Error loading tasks", e);
    });
  }, [user, editingNote, activeCollection2]);
  const saveToFirestore = useCallback((updatedNote, forceSync = false) => {
    var _a2, _b;
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
    const newNote = {
      ...updatedNote,
      id: noteId,
      title: updatedNote.title !== void 0 ? updatedNote.title : title,
      content: updatedNote.content !== void 0 ? updatedNote.content : editorRef.current ? editorRef.current.innerHTML : content,
      progress: updatedNote.progress !== void 0 ? updatedNote.progress : progress,
      isPinned: updatedNote.isPinned !== void 0 ? updatedNote.isPinned : isPinned,
      noteTheme: updatedNote.noteTheme !== void 0 ? updatedNote.noteTheme : noteTheme,
      noteIcon: updatedNote.noteIcon !== void 0 ? updatedNote.noteIcon : noteIcon,
      labels: updatedNote.labels !== void 0 ? updatedNote.labels : labels,
      reminderDate: updatedNote.reminderDate !== void 0 ? updatedNote.reminderDate : reminderDate,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      versions: {
        ...(editingNote == null ? void 0 : editingNote.versions) || {},
        [today]: {
          title: updatedNote.title !== void 0 ? updatedNote.title : title,
          content: updatedNote.content !== void 0 ? updatedNote.content : editorRef.current ? editorRef.current.innerHTML : content,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      sharedWith: updatedNote.sharedWith !== void 0 ? updatedNote.sharedWith : sharedWith,
      ownerId: (editingNote == null ? void 0 : editingNote.ownerId) || (user == null ? void 0 : user.uid) || "guest",
      isPublic: updatedNote.isPublic !== void 0 ? updatedNote.isPublic : isPublic,
      allowPublicEdit: updatedNote.allowPublicEdit !== void 0 ? updatedNote.allowPublicEdit : allowPublicEdit,
      publicShareToken: updatedNote.publicShareToken !== void 0 ? updatedNote.publicShareToken : publicShareToken,
      section: updatedNote.section !== void 0 ? updatedNote.section : editingNote && editingNote.section ? editingNote.section : "",
      isLocked: updatedNote.isLocked !== void 0 ? updatedNote.isLocked : (editingNote == null ? void 0 : editingNote.isLocked) ?? false,
      pinHash: updatedNote.pinHash !== void 0 ? updatedNote.pinHash : (editingNote == null ? void 0 : editingNote.pinHash) ?? null,
      pinHint: updatedNote.pinHint !== void 0 ? updatedNote.pinHint : (editingNote == null ? void 0 : editingNote.pinHint) ?? null
    };
    if (onUpdateNote) {
      onUpdateNote(newNote);
    }
    const effectiveCollection = activeCollection2 || "tasks";
    if (forceSync && effectiveCollection) {
      const targetUid = newNote.ownerId || (user == null ? void 0 : user.uid);
      const noteData = {
        ...newNote,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (targetUid && targetUid !== "guest") {
        db.collection(effectiveCollection).doc(targetUid).update({
          [`notes.${noteId}`]: noteData
        }).catch((e) => {
          if (e.code === "not-found") {
            db.collection(effectiveCollection).doc(targetUid).set({
              notes: { [noteId]: noteData }
            }, { merge: true });
          } else {
            console.warn("Silent background save failed:", e.message);
          }
        });
      }
      if (newNote.isPublic && newNote.publicShareToken) {
        db.collection("public_shares").doc(newNote.publicShareToken).set({
          ...noteData,
          ownerCollection: effectiveCollection
          // Store collection for guest back-sync
        }).catch((e) => console.warn("Public share sync failed:", e.message));
      } else if (!newNote.isPublic && (newNote.publicShareToken || ((_a2 = editingNoteRef.current) == null ? void 0 : _a2.publicShareToken))) {
        const tokenToDelete = newNote.publicShareToken || ((_b = editingNoteRef.current) == null ? void 0 : _b.publicShareToken);
        db.collection("public_shares").doc(tokenToDelete).delete().catch((e) => {
        });
      }
    }
  }, [user, noteId, editingNote, onUpdateNote, activeCollection2, title, content, progress, isPinned, noteTheme, noteIcon, labels, reminderDate, sharedWith, isPublic, publicShareToken, allowPublicEdit]);
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        if (!isSearchOpen) setSearchQuery("");
        return;
      }
      if (e.key === "Escape" && isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(false);
        return;
      }
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y" || (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [history, historyIndex, isSearchOpen]);
  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      const html = editorRef.current ? editorRef.current.innerHTML : content;
      saveToFirestore({
        title,
        content: html,
        progress,
        isPinned,
        noteTheme,
        noteIcon,
        labels,
        reminderDate,
        sharedWith,
        section: editingNote && editingNote.section ? editingNote.section : ""
      }, true);
      setHasChanges(false);
      hasChangesRef.current = false;
      setHasSavedOnce(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [title, content, progress, isPinned, noteTheme, noteIcon, labels, reminderDate, sharedWith, isPublic, allowPublicEdit, publicShareToken, user, hasChanges, saveToFirestore]);
  useEffect(() => {
    if (!isPublic || !publicShareToken) return;
    const unsubscribe = db.collection("public_shares").doc(publicShareToken).onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data.title !== void 0 && data.title !== title) {
          setTitle(data.title);
        }
        if (data.progress !== void 0 && data.progress !== progress) {
          setProgress(data.progress);
          localStorage.setItem(`faiora_draft_progress_${noteId}`, data.progress.toString());
        }
        if (data.isPinned !== void 0 && data.isPinned !== isPinned) {
          setIsPinned(data.isPinned);
        }
        if (data.noteTheme !== void 0 && data.noteTheme !== noteTheme) {
          setNoteTheme(data.noteTheme);
        }
        if (data.noteIcon !== void 0 && data.noteIcon !== noteIcon) {
          setNoteIcon(data.noteIcon);
        }
        if (data.labels !== void 0 && JSON.stringify(data.labels) !== JSON.stringify(labels)) {
          setLabels(data.labels);
        }
        if (data.reminderDate !== void 0 && data.reminderDate !== reminderDate) {
          setReminderDate(data.reminderDate);
        }
        const incomingContent = data.content || "";
        if (editorRef.current && incomingContent !== editorRef.current.innerHTML) {
          if (document.activeElement !== editorRef.current) {
            editorRef.current.innerHTML = incomingContent;
            setContent(incomingContent);
          }
        }
      }
    }, (err) => console.warn("Guest sync listener failed", err));
    return () => unsubscribe();
  }, [isPublic, publicShareToken]);
  useEffect(() => {
    if (editorRef.current && initialContent !== void 0) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);
  useEffect(() => {
    const container2 = document.querySelector(".task-creator-modal .overflow-y-auto");
    if (container2) {
      container2.scrollTop = 0;
    }
  }, []);
  useEffect(() => {
    if (!window.CSS || !CSS.highlights) return;
    try {
      if (!isSearchOpen || !searchQuery.trim() || !editorRef.current) {
        CSS.highlights.clear();
        setTotalMatches(0);
        return;
      }
      const root2 = editorRef.current;
      const walker = document.createTreeWalker(root2, NodeFilter.SHOW_TEXT, null, false);
      const ranges = [];
      const query = searchQuery.toLowerCase();
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.toLowerCase();
        let startIndex = 0;
        let index;
        while ((index = text.indexOf(query, startIndex)) !== -1) {
          const range = new Range();
          range.setStart(node, index);
          range.setEnd(node, index + query.length);
          ranges.push(range);
          startIndex = index + query.length;
        }
      }
      setTotalMatches(ranges.length);
      setMatchRanges(ranges);
      const highlight = new Highlight(...ranges);
      CSS.highlights.set("search-match", highlight);
      if (ranges.length > 0) {
        const targetRange = ranges[(currentMatchIndex + ranges.length) % ranges.length];
        if (targetRange && targetRange.startContainer.parentElement) {
          targetRange.startContainer.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    } catch (e) {
      console.error("Highlight error:", e);
    }
  }, [searchQuery, isSearchOpen, currentMatchIndex, content]);
  const handleDeleteNote = () => {
    setShowDeleteConfirm(true);
  };
  const confirmDeleteNote = () => {
    setShowDeleteConfirm(false);
    if (!user) return;
    if (onDeleteNote) {
      onDeleteNote(noteId);
    }
    setIsClosing(true);
    setTimeout(() => onClose(), 180);
    if (activeCollection2) {
      db.collection(activeCollection2).doc(user.uid).update({
        [`notes.${noteId}`]: firebase.firestore.FieldValue.delete()
      }).catch(function(e) {
        if (e.code !== "not-found") {
          console.warn("Firestore delete failed (silent):", e.message);
        }
      });
    }
  };
  const triggerClose = (shouldShowToast = false) => {
    setIsClosing(true);
    setTimeout(() => {
      if (shouldShowToast && showToast2) showToast2("Changes Saved");
      onClose();
    }, 230);
  };
  useEffect(() => {
    const handlePopState = () => {
      if (activeSubPopup) {
        setActiveSubPopup(null);
        return;
      }
      if (activePopup) {
        setActivePopup(null);
        return;
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeSubPopup, activePopup]);
  const handleBackClick = () => {
    handleClose();
  };
  const handleClose = () => {
    if (isSubmitting) return;
    const html = editorRef.current ? editorRef.current.innerHTML : content;
    const isBlank = !title.trim() && (!html || html === "<br>" || html === "<div><br></div>" || html.trim() === "");
    if (isBlank && !editingNote) {
      triggerClose();
      return;
    }
    setIsSubmitting(true);
    if (hasChanges && !isBlank) {
      saveToFirestore({
        title,
        content: html,
        progress,
        isPinned,
        noteTheme,
        noteIcon,
        labels,
        reminderDate,
        sharedWith,
        isPublic,
        allowPublicEdit,
        publicShareToken,
        section: editingNote && editingNote.section ? editingNote.section : ""
      }, true);
      triggerClose(true);
    } else {
      triggerClose(hasSavedOnce && !isBlank);
    }
  };
  const updateProgress = (e) => {
    if (isQuickTasksNotepad) return;
    const bar = e.currentTarget.closest(".modal-top-progress") || e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percent = Math.round(Math.max(0, Math.min(100, x / rect.width * 100)) / 5) * 5;
    setProgress(percent);
    if (editingNote) {
      localStorage.setItem(`faiora_draft_progress_${editingNote.id}`, percent);
    }
    setHasChanges(true);
    hasChangesRef.current = true;
  };
  const handleProgressClick = (e) => {
    updateProgress(e);
    saveState();
  };
  const handleProgressDrag = (e) => {
    if (e.buttons !== 1 && !e.touches) return;
    updateProgress(e);
  };
  const themes = [
    { id: "glass", color: "rgba(255,255,255,0.05)", themeClass: "" },
    { id: "peach", color: "#ffedd5", themeClass: "theme-peach" },
    { id: "amber", color: "#fef3c7", themeClass: "theme-amber" },
    { id: "orange", color: "#ffedd5", themeClass: "theme-orange" },
    { id: "yellow", color: "#fef9c3", themeClass: "theme-yellow" },
    { id: "warm1", color: "#e9d9c4", themeClass: "theme-warm1" },
    { id: "warm2", color: "#e9e5d8", themeClass: "theme-warm2" },
    { id: "warm3", color: "#e9e2da", themeClass: "theme-warm3" },
    { id: "warm4", color: "#e8c59d", themeClass: "theme-warm4" },
    { id: "warm5", color: "#e9e6d5", themeClass: "theme-warm5" },
    { id: "sage", color: "#ecfdf5", themeClass: "theme-sage" },
    { id: "sky", color: "#e0f2fe", themeClass: "theme-sky" },
    { id: "lavender", color: "#eef2ff", themeClass: "theme-lavender" },
    { id: "rose", color: "#fff1f2", themeClass: "theme-rose" },
    { id: "slate", color: "#f1f5f9", themeClass: "theme-slate" },
    { id: "teal", color: "#f0fdfa", themeClass: "theme-teal" },
    { id: "indigo", color: "#f5f3ff", themeClass: "theme-indigo" }
  ];
  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setTitle(prev.title);
      if (editorRef.current) editorRef.current.innerHTML = prev.content;
      setContent(prev.content);
      setProgress(prev.progress);
      setIsPinned(prev.isPinned);
      setNoteTheme(prev.noteTheme || "glass");
      setReminderDate(prev.reminderDate || "");
      setHistoryIndex(historyIndex - 1);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setTitle(next.title);
      if (editorRef.current) editorRef.current.innerHTML = next.content;
      setContent(next.content);
      setProgress(next.progress);
      setIsPinned(next.isPinned);
      setNoteTheme(next.noteTheme || "glass");
      setReminderDate(next.reminderDate || "");
      setHistoryIndex(historyIndex + 1);
    }
  };
  const saveState = useCallback(() => {
    const html = editorRef.current ? editorRef.current.innerHTML : content;
    const formattedTitle = formatTitle(title);
    const isBlank = !formattedTitle.trim() && (!html || html === "<br>" || html === "<div><br></div>" || html.trim() === "");
    if (isBlank && !editingNote) return;
    const currentState = {
      title: formattedTitle,
      content: html,
      progress,
      isPinned,
      noteTheme,
      noteIcon,
      labels,
      reminderDate,
      sharedWith,
      isPublic,
      publicShareToken,
      allowPublicEdit,
      section: editingNote && editingNote.section ? editingNote.section : ""
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory.slice(-30));
    setHistoryIndex(Math.min(newHistory.length - 1, 29));
    saveToFirestore(currentState, true);
    setHasChanges(true);
    hasChangesRef.current = true;
  }, [title, content, progress, isPinned, noteTheme, noteIcon, labels, reminderDate, history, historyIndex, saveToFirestore, editingNote, sharedWith, isPublic, publicShareToken, allowPublicEdit]);
  const convertActiveBlock = (type) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let range = selection.getRangeAt(0);
    const getBlockParent = (node) => {
      if (!node) return null;
      let curr = node;
      if (curr.nodeType === 3) curr = curr.parentElement;
      while (curr && curr !== editorRef.current) {
        if (["LI", "DIV", "P", "BLOCKQUOTE", "H1", "H2", "H3"].includes(curr.nodeName)) return curr;
        curr = curr.parentNode;
      }
      return null;
    };
    const getSelectedCheckItems = () => {
      if (!editorRef.current) return [];
      const items = [];
      const allItems = editorRef.current.querySelectorAll(".checklist-item");
      allItems.forEach((item) => {
        if (selection.containsNode(item, true)) {
          items.push(item);
        }
      });
      return items;
    };
    const selectedCheckItems = getSelectedCheckItems();
    const isBulletActive = document.queryCommandState("insertUnorderedList");
    const isNumberActive = document.queryCommandState("insertOrderedList");
    let container2 = range.startContainer;
    if (container2 && container2.nodeType === 3) container2 = container2.parentElement;
    const activeCheckItem = container2 ? container2.closest(".checklist-item") : null;
    const checkItemsToConvert = selectedCheckItems.length > 0 ? selectedCheckItems : activeCheckItem ? [activeCheckItem] : [];
    if (type !== "todo" && checkItemsToConvert.length > 0) {
      const newDivs = [];
      checkItemsToConvert.forEach((item) => {
        const content2 = item.querySelector("span:not(.checklist-checkbox)") || item;
        const div = document.createElement("div");
        div.innerHTML = content2.innerHTML;
        item.parentNode.replaceChild(div, item);
        newDivs.push(div);
      });
      if (newDivs.length > 0) {
        const newRange = document.createRange();
        newRange.setStartBefore(newDivs[0]);
        newRange.setEndAfter(newDivs[newDivs.length - 1]);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
    if (type === "h1" || type === "h2") {
      document.execCommand("formatBlock", false, type === "h1" ? "H1" : "H2");
    } else if (type === "bullet" || type === "number") {
      if (type === "bullet") {
        document.execCommand("insertUnorderedList");
      } else {
        document.execCommand("insertOrderedList");
      }
    } else if (type === "normal") {
      if (isBulletActive) document.execCommand("insertUnorderedList");
      if (isNumberActive) document.execCommand("insertOrderedList");
      document.execCommand("formatBlock", false, "div");
    } else if (type === "todo") {
      if (selectedCheckItems.length > 0 || activeCheckItem) {
        const itemsToOff = selectedCheckItems.length > 0 ? selectedCheckItems : [activeCheckItem];
        const newDivs = [];
        itemsToOff.forEach((item) => {
          const contentSpan = item.querySelector("span:not(.checklist-checkbox)") || item;
          const div = document.createElement("div");
          div.innerHTML = contentSpan.innerHTML || "&nbsp;";
          item.parentNode.replaceChild(div, item);
          newDivs.push(div);
        });
        if (newDivs.length > 0) {
          const newRange = document.createRange();
          newRange.setStartBefore(newDivs[0]);
          newRange.setEndAfter(newDivs[newDivs.length - 1]);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
        return;
      }
      const inListItem = container2 ? container2.closest("li") : null;
      if (inListItem && range.collapsed) {
        const html = inListItem.innerHTML;
        const wrapper = document.createElement("div");
        wrapper.className = "checklist-item";
        wrapper.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span>${html.trim() || "&nbsp;"}</span>`;
        const list = inListItem.closest("ul, ol");
        if (list && list.children.length === 1) {
          list.parentNode.replaceChild(wrapper, list);
        } else {
          inListItem.parentNode.replaceChild(wrapper, inListItem);
        }
        const newRange = document.createRange();
        const contentSpan = wrapper.querySelector("span:not(.checklist-checkbox)");
        if (contentSpan) {
          newRange.selectNodeContents(contentSpan);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
        return;
      } else if (range.collapsed) {
        let targetBlock = getBlockParent(range.startContainer);
        if (!targetBlock || targetBlock === editorRef.current) {
          let curr = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
          while (curr && curr.parentElement && curr.parentElement !== editorRef.current) {
            curr = curr.parentElement;
          }
          targetBlock = curr;
        }
        if (targetBlock && targetBlock !== editorRef.current && targetBlock.parentNode) {
          const html = targetBlock.innerHTML !== void 0 ? targetBlock.innerHTML : targetBlock.textContent || "";
          const cleanHtml = html.replace(/<br\s*[\/]?>/gi, "").trim();
          const wrapper = document.createElement("div");
          wrapper.className = "checklist-item";
          wrapper.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span>${cleanHtml || "&nbsp;"}</span>`;
          targetBlock.parentNode.replaceChild(wrapper, targetBlock);
          const newRange = document.createRange();
          const contentSpan = wrapper.querySelector("span:not(.checklist-checkbox)");
          if (contentSpan) {
            newRange.selectNodeContents(contentSpan);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } else {
          const wrapper = document.createElement("div");
          wrapper.className = "checklist-item";
          wrapper.innerHTML = '<span class="checklist-checkbox" contenteditable="false"></span><span>&nbsp;</span>';
          range.insertNode(wrapper);
          const newRange = document.createRange();
          const contentSpan = wrapper.querySelector("span:not(.checklist-checkbox)");
          if (contentSpan) {
            newRange.setStart(contentSpan, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
        return;
      } else {
        const startBlock = getBlockParent(range.startContainer);
        const parentList = startBlock ? startBlock.closest("ul, ol") : null;
        const lines = [];
        if (parentList) {
          const allLIs = Array.from(parentList.querySelectorAll("li"));
          const selectedLIs = allLIs.filter((li) => selection.containsNode(li, true));
          selectedLIs.forEach((li) => lines.push(li.innerHTML));
          const insertedItems = [];
          if (selectedLIs.length === allLIs.length) {
            const anchor = parentList;
            const parent = anchor.parentNode;
            const frag = document.createDocumentFragment();
            lines.forEach((l) => {
              const wrapper = document.createElement("div");
              wrapper.className = "checklist-item";
              wrapper.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span>${l}</span>`;
              insertedItems.push(wrapper);
              frag.appendChild(wrapper);
            });
            parent.replaceChild(frag, anchor);
          } else {
            const frag = document.createDocumentFragment();
            lines.forEach((l) => {
              const wrapper = document.createElement("div");
              wrapper.className = "checklist-item";
              wrapper.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span>${l}</span>`;
              insertedItems.push(wrapper);
              frag.appendChild(wrapper);
            });
            parentList.parentNode.insertBefore(frag, parentList);
            selectedLIs.forEach((li) => li.remove());
          }
          if (insertedItems.length > 0) {
            const newRange = document.createRange();
            newRange.setStartBefore(insertedItems[0]);
            newRange.setEndAfter(insertedItems[insertedItems.length - 1]);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } else {
          const sBlock = getBlockParent(range.startContainer);
          const eBlock = getBlockParent(range.endContainer);
          if (sBlock) range.setStartBefore(sBlock);
          if (eBlock) range.setEndAfter(eBlock);
          selection.removeAllRanges();
          selection.addRange(range);
          const contents = range.extractContents();
          const tempArr = document.createElement("div");
          tempArr.appendChild(contents);
          let buffer = "";
          const flush = () => {
            const trimmed = buffer.replace(/&nbsp;/g, " ").trim();
            if (trimmed || buffer.includes("<img") || buffer.includes("<span")) {
              lines.push(buffer);
            }
            buffer = "";
          };
          const walk = (node) => {
            if (node.nodeType === 3) {
              buffer += node.textContent;
            } else if (node.nodeName === "BR") {
              flush();
            } else if (["DIV", "P", "LI", "UL", "OL", "H1", "H2", "H3", "BLOCKQUOTE"].includes(node.nodeName)) {
              flush();
              Array.from(node.childNodes).forEach(walk);
              flush();
            } else if (node.classList && node.classList.contains("checklist-checkbox")) {
            } else {
              buffer += node.nodeType === 1 ? node.outerHTML : "";
            }
          };
          Array.from(tempArr.childNodes).forEach(walk);
          flush();
          const frag = document.createDocumentFragment();
          const insertedItems2 = [];
          (lines.length > 0 ? lines : ["&nbsp;"]).forEach((l) => {
            const wrapper = document.createElement("div");
            wrapper.className = "checklist-item";
            wrapper.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span>${l}</span>`;
            insertedItems2.push(wrapper);
            frag.appendChild(wrapper);
          });
          range.insertNode(frag);
          if (insertedItems2.length > 0) {
            const newRange = document.createRange();
            newRange.setStartBefore(insertedItems2[0]);
            newRange.setEndAfter(insertedItems2[insertedItems2.length - 1]);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    }
    setHasChanges(true);
    hasChangesRef.current = true;
  };
  const handleEditorKeyDown = (e) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const startOffset = range.startOffset;
    if (e.key === " ") {
      const item = startNode.nodeType === 3 ? startNode.parentElement.closest(".checklist-item") : startNode.closest(".checklist-item");
      if (!item) {
        const currentBlock = startNode.nodeType === 3 ? startNode.parentElement.closest("div") : startNode.closest("div");
        if (currentBlock && !currentBlock.classList.contains("note-editor-area")) {
          const text = currentBlock.textContent;
          if (startOffset === 1 && (text === "-" || text === "*")) {
            e.preventDefault();
            currentBlock.innerHTML = "-&nbsp;";
            currentBlock.className = "bullet-item";
            const newRange = document.createRange();
            newRange.setStart(currentBlock.childNodes[0], 2);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
            return;
          }
        }
      }
    }
    if (e.key === "Enter") {
      const item = startNode.nodeType === 3 ? startNode.parentElement.closest(".checklist-item") : startNode.closest(".checklist-item");
      if (!item && startNode.nodeType === 3) {
        const lineText = startNode.textContent;
        if (lineText.slice(0, startOffset).endsWith("---")) {
          e.preventDefault();
          startNode.textContent = lineText.slice(0, startOffset - 3) + lineText.slice(startOffset);
          document.execCommand("insertHTML", false, '<hr style="border:none; border-top: 1px solid rgba(0,0,0,0.1); margin: 1.5rem 0; width: 100%;" />');
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
          return;
        }
      }
      if (item) {
        e.preventDefault();
        const text = item.textContent.trim();
        if (text === "") {
          const div = document.createElement("div");
          div.innerHTML = "&nbsp;";
          item.parentNode.replaceChild(div, item);
          const newRange = document.createRange();
          newRange.setStart(div, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          const newItem = document.createElement("div");
          newItem.className = "checklist-item";
          newItem.innerHTML = '<span class="checklist-checkbox" contenteditable="false"></span><span>&nbsp;</span>';
          item.insertAdjacentElement("afterend", newItem);
          const newRange = document.createRange();
          const textSpan = newItem.querySelector("span:not(.checklist-checkbox)");
          newRange.setStart(textSpan, 1);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
        return;
      }
      if (!item) {
        const currentBlock = startNode.nodeType === 3 ? startNode.parentElement.closest("div") : startNode.closest("div");
        if (currentBlock && !currentBlock.classList.contains("note-editor-area")) {
          const text = currentBlock.textContent;
          const hasIndentation = currentBlock.style.marginLeft && currentBlock.style.marginLeft !== "0px";
          const isBulletItem = currentBlock.classList.contains("bullet-item");
          const isDashOnly = text.replace(/\s|\u00a0/g, "") === "-" || text.replace(/\s|\u00a0/g, "") === "";
          if (isDashOnly && (isBulletItem || hasIndentation)) {
            e.preventDefault();
            currentBlock.style.marginLeft = "0px";
            currentBlock.className = "";
            currentBlock.innerHTML = "&nbsp;";
            const newRange = document.createRange();
            newRange.setStart(currentBlock.childNodes[0] || currentBlock, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
            return;
          }
          const isAtEnd = startNode.nodeType === 3 ? startOffset === startNode.length : startOffset === startNode.childNodes.length;
          if (isBulletItem && isAtEnd) {
            e.preventDefault();
            const nextDiv = document.createElement("div");
            nextDiv.className = "bullet-item";
            nextDiv.innerHTML = "-&nbsp;";
            currentBlock.insertAdjacentElement("afterend", nextDiv);
            const newRange = document.createRange();
            newRange.setStart(nextDiv.childNodes[0], 2);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
            return;
          } else if (hasIndentation) {
            e.preventDefault();
            const nextDiv = document.createElement("div");
            nextDiv.style.marginLeft = currentBlock.style.marginLeft;
            nextDiv.innerHTML = "&nbsp;";
            currentBlock.insertAdjacentElement("afterend", nextDiv);
            const newRange = document.createRange();
            newRange.setStart(nextDiv, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
            return;
          }
        }
      }
    }
    if (e.key === "Backspace" && range.collapsed) {
      const currentBlock = startNode.nodeType === 3 ? startNode.parentElement.closest("div, li, .checklist-item") : startNode.closest("div, li, .checklist-item");
      if (currentBlock && startOffset === 0) {
        const hasIndentation = currentBlock.style.marginLeft && currentBlock.style.marginLeft !== "0px";
        const isBulletItem = currentBlock.classList.contains("bullet-item");
        const isChecklistItem = currentBlock.classList.contains("checklist-item");
        if (hasIndentation || isBulletItem || isChecklistItem) {
          e.preventDefault();
          if (isChecklistItem) {
            const div = document.createElement("div");
            const contentSpan = currentBlock.querySelector("span:not(.checklist-checkbox)");
            div.innerHTML = contentSpan ? contentSpan.innerHTML : "&nbsp;";
            currentBlock.parentNode.replaceChild(div, currentBlock);
            const newRange = document.createRange();
            newRange.setStart(div, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else if (isBulletItem) {
            currentBlock.classList.remove("bullet-item");
            currentBlock.innerHTML = currentBlock.innerHTML.replace(/^-\s*|^-&nbsp;/, "");
            if (!currentBlock.innerHTML) currentBlock.innerHTML = "&nbsp;";
            const newRange = document.createRange();
            newRange.setStart(currentBlock, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } else if (hasIndentation) {
            const currentML = parseInt(currentBlock.style.marginLeft);
            currentBlock.style.marginLeft = Math.max(0, currentML - 24) + "px";
          }
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
          return;
        }
      }
    }
  };
  const toggleFormat = (marker) => {
    if (marker === "**") document.execCommand("bold", false, null);
    if (marker === "*") document.execCommand("italic", false, null);
    if (marker === "__") document.execCommand("underline", false, null);
    if (marker === "~~") document.execCommand("strikeThrough", false, null);
    setHasChanges(true);
    hasChangesRef.current = true;
  };
  const toggleHighlight = (color) => {
    document.execCommand("hiliteColor", false, color);
    setHasChanges(true);
    hasChangesRef.current = true;
  };
  const applyCase = (caseType) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const fragment = range.extractContents();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.nodeValue;
      if (caseType === "upper") {
        node.nodeValue = text.toUpperCase();
      } else if (caseType === "lower") {
        node.nodeValue = text.toLowerCase();
      } else if (caseType === "cap") {
        node.nodeValue = text.toLowerCase().replace(/\b[a-z\u00c0-\u00ff]/g, (match) => match.toUpperCase());
      }
    }
    const firstChild = fragment.firstChild;
    const lastChild = fragment.lastChild;
    range.insertNode(fragment);
    setHasChanges(true);
    hasChangesRef.current = true;
    saveState();
    if (firstChild && lastChild) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartBefore(firstChild);
      newRange.setEndAfter(lastChild);
      selection.addRange(newRange);
    }
  };
  const parseChartNumericValue = (rawStr) => {
    if (!rawStr) return 0;
    const clean = String(rawStr).trim();
    const match = clean.match(/([+-]?[0-9,.]+)\s*([kKmMbB%]?)/);
    if (!match) return 0;
    let num = parseFloat(match[1].replace(/,/g, "")) || 0;
    const unit = (match[2] || "").toLowerCase();
    if (unit === "k") num *= 1e3;
    else if (unit === "m") num *= 1e6;
    else if (unit === "b") num *= 1e9;
    return num;
  };
  const CHART_PALETTE = ["#8b5cf6", "#f97316", "#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#3b82f6", "#ef4444", "#14b8a6"];
  const recalculateChartWidget = (widget) => {
    if (!widget) return;
    const type = widget.getAttribute("data-chart-type") || (widget.classList.contains("chart-widget-donut") ? "donut" : widget.classList.contains("chart-widget-bar") ? "bar" : "line");
    if (type === "donut") {
      const C = 345.575;
      const rows = widget.querySelectorAll(".chart-donut-items .chart-item-row");
      let total = 0;
      const parsed = Array.from(rows).map((row) => {
        const valEl = row.querySelector(".chart-item-val");
        const colorEl = row.querySelector(".chart-color-swatch");
        const val = parseChartNumericValue(valEl ? valEl.textContent : "0");
        total += val;
        const color = row.getAttribute("data-color") || (colorEl ? colorEl.style.backgroundColor : "#8b5cf6") || "#8b5cf6";
        return { row, val, color };
      });
      const svg = widget.querySelector("svg");
      if (svg) {
        svg.querySelectorAll(".chart-slice").forEach((el) => el.remove());
        let accumulated = 0;
        const centerVal = svg.querySelector(".chart-center-val");
        parsed.forEach(({ val, color }) => {
          if (val <= 0) return;
          const arcLen = val / 100 * C;
          const startAngle = -90 + accumulated / 100 * 360;
          accumulated += val;
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("class", "chart-slice");
          circle.setAttribute("cx", "80");
          circle.setAttribute("cy", "80");
          circle.setAttribute("r", "55");
          circle.setAttribute("fill", "transparent");
          circle.setAttribute("stroke", color);
          circle.setAttribute("stroke-width", "20");
          circle.setAttribute("stroke-dasharray", `${Math.min(C, Math.max(0, arcLen))} ${C}`);
          circle.setAttribute("stroke-dashoffset", "0");
          circle.setAttribute("transform", `rotate(${startAngle} 80 80)`);
          circle.setAttribute("stroke-linecap", "round");
          if (centerVal) {
            svg.insertBefore(circle, centerVal);
          } else {
            svg.appendChild(circle);
          }
        });
        if (centerVal) centerVal.textContent = Math.round(total) + "%";
      }
    } else if (type === "bar") {
      const rows = widget.querySelectorAll(".chart-bar-items .chart-item-row");
      rows.forEach((row) => {
        const valEl = row.querySelector(".chart-item-val");
        const barFill = row.querySelector(".chart-bar-fill");
        const colorEl = row.querySelector(".chart-color-swatch");
        const color = row.getAttribute("data-color") || (colorEl ? colorEl.style.backgroundColor : "#10b981") || "#10b981";
        const val = parseChartNumericValue(valEl ? valEl.textContent : "0");
        const clamped = Math.max(0, Math.min(100, val));
        if (barFill) {
          barFill.style.width = clamped + "%";
          barFill.style.backgroundColor = color;
        }
      });
    } else if (type === "line") {
      const itemsContainer = widget.querySelector(".chart-line-items");
      const cols = widget.querySelectorAll(".chart-line-items .chart-item-col");
      if (!cols.length) {
        const svg2 = widget.querySelector("svg");
        if (svg2) {
          const areaPath = svg2.querySelector(".chart-line-area");
          const strokePath = svg2.querySelector(".chart-line-stroke");
          if (areaPath) areaPath.setAttribute("d", "");
          if (strokePath) strokePath.setAttribute("d", "");
          const dotsG = svg2.querySelector(".chart-line-dots");
          if (dotsG) dotsG.innerHTML = "";
          const labelsG = svg2.querySelector(".chart-line-labels");
          if (labelsG) labelsG.innerHTML = "";
        }
        return;
      }
      if (itemsContainer) {
        itemsContainer.style.gridTemplateColumns = `repeat(${cols.length}, 1fr)`;
      }
      const data = Array.from(cols).map((col, idx) => {
        const labelEl = col.querySelector(".chart-item-label");
        const valEl = col.querySelector(".chart-item-val");
        const label = labelEl ? labelEl.textContent.trim() : `P${idx + 1}`;
        const rawText = valEl ? valEl.textContent.trim() : "0";
        const num = parseChartNumericValue(rawText);
        return { col, label, rawText, num };
      });
      const nums = data.map((d) => d.num);
      let min = Math.min(...nums);
      let max = Math.max(...nums);
      if (min === max) {
        min = 0;
        max = max || 100;
      }
      const N = data.length;
      const startX = 50;
      const endX = 450;
      const spanX = N > 1 ? (endX - startX) / (N - 1) : 0;
      const points = data.map((d, i) => {
        const x = N > 1 ? startX + i * spanX : 250;
        const ratio = (d.num - min) / (max - min || 1);
        const y = 110 - ratio * 90;
        return { x, y, label: d.label, isLast: i === N - 1 };
      });
      let lineD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        lineD += ` L ${points[i].x} ${points[i].y}`;
      }
      const areaD = `${lineD} L ${points[points.length - 1].x} 120 L ${points[0].x} 120 Z`;
      const svg = widget.querySelector("svg");
      if (svg) {
        const areaPath = svg.querySelector(".chart-line-area");
        const strokePath = svg.querySelector(".chart-line-stroke");
        if (areaPath) areaPath.setAttribute("d", areaD);
        if (strokePath) strokePath.setAttribute("d", lineD);
        let dotsG = svg.querySelector(".chart-line-dots");
        if (!dotsG) {
          dotsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          dotsG.setAttribute("class", "chart-line-dots");
          svg.appendChild(dotsG);
        }
        dotsG.innerHTML = points.map(
          (p) => `<circle cx="${p.x}" cy="${p.y}" r="${p.isLast ? 5 : 4}" fill="${p.isLast ? "#fbbf24" : "#f97316"}" stroke="#fff" stroke-width="${p.isLast ? 2 : 1.5}"/>`
        ).join("");
        let labelsG = svg.querySelector(".chart-line-labels");
        if (!labelsG) {
          labelsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          labelsG.setAttribute("class", "chart-line-labels");
          svg.appendChild(labelsG);
        }
        labelsG.innerHTML = points.map(
          (p) => `<text x="${p.x}" y="132" fill="${p.isLast ? "#f97316" : "#64748b"}" font-weight="${p.isLast ? "bold" : "normal"}" font-size="9" text-anchor="middle">${p.label}</text>`
        ).join("");
      }
      cols.forEach((col, idx) => {
        const isLast = idx === cols.length - 1;
        const labelEl = col.querySelector(".chart-item-label");
        const valEl = col.querySelector(".chart-item-val");
        if (labelEl) labelEl.style.color = isLast ? "#f97316" : "#64748b";
        if (valEl) valEl.style.color = isLast ? "#f97316" : "#1e293b";
      });
    }
  };
  const handleEditorClick = (e) => {
    var _a2, _b;
    const target = e.target;
    if (target.classList.contains("checklist-checkbox")) {
      const li = target.closest(".checklist-item");
      if (li) {
        li.classList.toggle("checked");
        const isChecked = li.classList.contains("checked");
        let qtId = li.getAttribute("data-qt-id");
        if (!qtId) {
          const taskText = (li.innerText || li.textContent || "").trim().toLowerCase();
          if (taskText) {
            const matched = (quickTasks2 || []).find((t) => (t.text || "").trim().toLowerCase() === taskText);
            if (matched) {
              qtId = matched.id;
              li.setAttribute("data-qt-id", String(qtId));
            }
          }
        }
        if (qtId) {
          if (typeof onToggleQuickTask === "function") {
            onToggleQuickTask(qtId);
          }
          if (isChecked) {
            if (typeof FaioraNotifications !== "undefined" && (FaioraNotifications == null ? void 0 : FaioraNotifications.cancelForTask)) {
              FaioraNotifications.cancelForTask(qtId);
            }
            if ((_a2 = window.FaioraNativeAlarmBridge) == null ? void 0 : _a2.markTaskCompleted) {
              window.FaioraNativeAlarmBridge.markTaskCompleted(String(qtId), true);
            }
          } else {
            if ((_b = window.FaioraNativeAlarmBridge) == null ? void 0 : _b.markTaskCompleted) {
              window.FaioraNativeAlarmBridge.markTaskCompleted(String(qtId), false);
            }
          }
        }
        if (isQuickTasksNotepad && editorRef.current) {
          const autoProgress = calculateQuickTasksProgress(editorRef.current.innerHTML);
          setProgress(autoProgress);
          if (editingNote) {
            localStorage.setItem(`faiora_draft_progress_${editingNote.id}`, String(autoProgress));
          }
        }
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
      }
      return;
    }
    const chartWidget = target.closest(".chart-widget");
    if (chartWidget) {
      const delBtn = target.closest(".chart-item-del");
      if (delBtn) {
        const row = delBtn.closest(".chart-item-row, .chart-item-col");
        if (row) {
          row.remove();
          recalculateChartWidget(chartWidget);
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
        }
        return;
      }
      const removeBtn = target.closest(".chart-btn-remove");
      if (removeBtn) {
        const chartType = chartWidget.getAttribute("data-chart-type");
        if (chartType === "line") {
          const cols = chartWidget.querySelectorAll(".chart-line-items .chart-item-col");
          if (cols.length > 1) {
            cols[cols.length - 1].remove();
            recalculateChartWidget(chartWidget);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
          }
        } else if (chartType === "bar") {
          const rows = chartWidget.querySelectorAll(".chart-bar-items .chart-item-row");
          if (rows.length > 1) {
            rows[rows.length - 1].remove();
            recalculateChartWidget(chartWidget);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
          }
        } else if (chartType === "donut") {
          const rows = chartWidget.querySelectorAll(".chart-donut-items .chart-item-row");
          if (rows.length > 1) {
            rows[rows.length - 1].remove();
            recalculateChartWidget(chartWidget);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
          }
        }
        return;
      }
      if (target.classList.contains("chart-color-swatch") || target.closest(".chart-color-swatch")) {
        const swatch = target.classList.contains("chart-color-swatch") ? target : target.closest(".chart-color-swatch");
        const row = swatch.closest(".chart-item-row");
        if (row) {
          const curColor = row.getAttribute("data-color") || swatch.style.backgroundColor || "#8b5cf6";
          const curIdx = CHART_PALETTE.indexOf(curColor);
          const nextColor = CHART_PALETTE[(curIdx + 1) % CHART_PALETTE.length];
          row.setAttribute("data-color", nextColor);
          swatch.style.backgroundColor = nextColor;
          const valEl = row.querySelector(".chart-item-val");
          if (valEl && chartWidget.getAttribute("data-chart-type") === "donut") valEl.style.color = nextColor;
          const barFill = row.querySelector(".chart-bar-fill");
          if (barFill) barFill.style.backgroundColor = nextColor;
          recalculateChartWidget(chartWidget);
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
        }
        return;
      }
      if (target.classList.contains("chart-btn-add") || target.closest(".chart-btn-add")) {
        const chartType = chartWidget.getAttribute("data-chart-type");
        if (chartType === "donut") {
          const list = chartWidget.querySelector(".chart-donut-items");
          if (list) {
            const rowCount = list.querySelectorAll(".chart-item-row").length;
            const nextColor = CHART_PALETTE[rowCount % CHART_PALETTE.length];
            const div = document.createElement("div");
            div.className = "chart-item-row";
            div.setAttribute("data-color", nextColor);
            div.style.cssText = "display:flex; align-items:center; gap:0.5rem;";
            div.innerHTML = `<span class="chart-color-swatch" contenteditable="false" style="width:12px; height:12px; border-radius:3px; background:${nextColor}; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="outline:none; flex:1;">Segment ${rowCount + 1}</span><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:${nextColor}; outline:none; min-width:32px; text-align:right;">15%</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button>`;
            list.appendChild(div);
            recalculateChartWidget(chartWidget);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
          }
        } else if (chartType === "bar") {
          const list = chartWidget.querySelector(".chart-bar-items");
          if (list) {
            const rowCount = list.querySelectorAll(".chart-item-row").length;
            const nextColor = CHART_PALETTE[rowCount % CHART_PALETTE.length];
            const div = document.createElement("div");
            div.className = "chart-item-row";
            div.setAttribute("data-color", nextColor);
            div.style.cssText = "display:flex; align-items:center; gap:0.75rem; font-size:11px;";
            div.innerHTML = `<span class="chart-color-swatch" contenteditable="false" style="width:10px; height:10px; border-radius:3px; background:${nextColor}; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="width:80px; color:#64748b; font-weight:bold; outline:none;" title="Click to edit label">Metric ${String.fromCharCode(65 + rowCount)}</span><div class="chart-bar-track" style="flex:1; background:rgba(0,0,0,0.05); height:16px; border-radius:6px; overflow:hidden;"><div class="chart-bar-fill" style="width:50%; height:100%; background:${nextColor}; border-radius:6px; transition:width 0.3s ease;"></div></div><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#1e293b; width:45px; text-align:right; outline:none;" title="Click to edit value">50%</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button>`;
            list.appendChild(div);
            recalculateChartWidget(chartWidget);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
          }
        } else if (chartType === "line") {
          const list = chartWidget.querySelector(".chart-line-items");
          if (list) {
            const colCount = list.querySelectorAll(".chart-item-col").length;
            const div = document.createElement("div");
            div.className = "chart-item-col";
            div.style.cssText = "padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;";
            div.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#64748b; font-weight:bold; outline:none; text-align:center;">P${colCount + 1}</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#1e293b; outline:none; text-align:center;">$20K</span>`;
            list.appendChild(div);
            recalculateChartWidget(chartWidget);
            setHasChanges(true);
            hasChangesRef.current = true;
            saveState();
          }
        }
        return;
      }
      if (target.classList.contains("chart-btn-balance") || target.closest(".chart-btn-balance")) {
        const rows = chartWidget.querySelectorAll(".chart-donut-items .chart-item-row");
        if (rows.length > 0) {
          const each = Math.floor(100 / rows.length);
          const remainder = 100 - each * rows.length;
          rows.forEach((row, i) => {
            const valEl = row.querySelector(".chart-item-val");
            if (valEl) valEl.textContent = each + (i === 0 ? remainder : 0) + "%";
          });
          recalculateChartWidget(chartWidget);
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
        }
        return;
      }
    }
  };
  const insertChartTemplate = (chartType) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    let chartHtml = "";
    if (chartType === "line") {
      chartHtml = `<div class="chart-widget chart-widget-line" data-chart-type="line" contenteditable="false" style="margin:1.5rem 0; padding:1.25rem; background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.08); border-radius:1.25rem; user-select:auto;"><div class="chart-header-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;"><p contenteditable="true" class="chart-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:#f97316; font-weight:bold; outline:none;" title="Click to edit title">Growth Trajectory</p><div class="chart-toolbar" style="display:flex; align-items:center; gap:0.4rem;"><button type="button" class="chart-btn-remove" contenteditable="false" title="Remove last point" style="font-size:10px; font-weight:bold; padding:2px 7px; border-radius:6px; background:rgba(239,68,68,0.12); color:#ef4444; border:none; cursor:pointer;">- Remove Point</button><button type="button" class="chart-btn-add" contenteditable="false" title="Add data point" style="font-size:10px; font-weight:bold; padding:2px 7px; border-radius:6px; background:rgba(249,115,22,0.12); color:#f97316; border:none; cursor:pointer;">+ Add Point</button></div></div><svg viewBox="0 0 500 140" style="width:100%; height:auto; display:block;"><defs><linearGradient id="gradLineChart" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f97316" stop-opacity="0.35"/><stop offset="100%" stop-color="#f97316" stop-opacity="0.0"/></linearGradient></defs><line x1="40" y1="20" x2="460" y2="20" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4"/><line x1="40" y1="65" x2="460" y2="65" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4"/><line x1="40" y1="110" x2="460" y2="110" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4"/><path class="chart-line-area" d="M 50 110 L 130 90 L 210 75 L 290 50 L 370 35 L 450 20 L 450 120 L 50 120 Z" fill="url(#gradLineChart)"/><path class="chart-line-stroke" d="M 50 110 L 130 90 L 210 75 L 290 50 L 370 35 L 450 20" fill="none" stroke="#f97316" stroke-width="3.5" stroke-linecap="round"/><g class="chart-line-dots"><circle cx="50" cy="110" r="4" fill="#f97316" stroke="#fff" stroke-width="1.5"/><circle cx="130" cy="90" r="4" fill="#f97316" stroke="#fff" stroke-width="1.5"/><circle cx="210" cy="75" r="4" fill="#f97316" stroke="#fff" stroke-width="1.5"/><circle cx="290" cy="50" r="4" fill="#f97316" stroke="#fff" stroke-width="1.5"/><circle cx="370" cy="35" r="4" fill="#f97316" stroke="#fff" stroke-width="1.5"/><circle cx="450" cy="20" r="5" fill="#fbbf24" stroke="#fff" stroke-width="2"/></g><g class="chart-line-labels"><text x="50" y="132" fill="#64748b" font-size="9" text-anchor="middle">Jan</text><text x="130" y="132" fill="#64748b" font-size="9" text-anchor="middle">Feb</text><text x="210" y="132" fill="#64748b" font-size="9" text-anchor="middle">Mar</text><text x="290" y="132" fill="#64748b" font-size="9" text-anchor="middle">Apr</text><text x="370" y="132" fill="#64748b" font-size="9" text-anchor="middle">May</text><text x="450" y="132" fill="#f97316" font-weight="bold" font-size="9" text-anchor="middle">Jun</text></g></svg><div class="chart-line-items" style="display:grid; grid-template-columns:repeat(6, 1fr); gap:0.25rem; margin-top:0.75rem; border-top:1px solid rgba(0,0,0,0.06); padding-top:0.6rem; text-align:center;"><div class="chart-item-col" style="padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;"><div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#64748b; font-weight:bold; outline:none; text-align:center;">Jan</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#1e293b; outline:none; text-align:center;">$10K</span></div><div class="chart-item-col" style="padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;"><div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#64748b; font-weight:bold; outline:none; text-align:center;">Feb</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#1e293b; outline:none; text-align:center;">$14K</span></div><div class="chart-item-col" style="padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;"><div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#64748b; font-weight:bold; outline:none; text-align:center;">Mar</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#1e293b; outline:none; text-align:center;">$19K</span></div><div class="chart-item-col" style="padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;"><div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#64748b; font-weight:bold; outline:none; text-align:center;">Apr</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#1e293b; outline:none; text-align:center;">$25K</span></div><div class="chart-item-col" style="padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;"><div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#64748b; font-weight:bold; outline:none; text-align:center;">May</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#1e293b; outline:none; text-align:center;">$32K</span></div><div class="chart-item-col" style="padding:0.25rem; position:relative; display:flex; flex-direction:column; align-items:center; min-width:0;"><div style="display:flex; align-items:center; justify-content:center; gap:2px; width:100%;"><span contenteditable="true" class="chart-item-label" style="font-size:9px; color:#f97316; font-weight:bold; outline:none; text-align:center;">Jun</span><button type="button" class="chart-item-del" contenteditable="false" title="Remove point" style="width:14px; height:14px; line-height:12px; font-size:10px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">\xD7</button></div><span contenteditable="true" class="chart-item-val" style="font-size:11px; font-weight:bold; color:#f97316; outline:none; text-align:center;">$45K</span></div></div></div><p><br/></p>`;
    } else if (chartType === "donut") {
      chartHtml = `<div class="chart-widget chart-widget-donut" data-chart-type="donut" contenteditable="false" style="margin:1.5rem 0; padding:1.25rem; background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.08); border-radius:1.25rem; user-select:auto;"><div class="chart-header-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;"><p contenteditable="true" class="chart-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:#8b5cf6; font-weight:bold; outline:none;" title="Click to edit title">Distribution Breakdown</p><div class="chart-toolbar" style="display:flex; align-items:center; gap:0.4rem;"><button type="button" class="chart-btn-balance" title="Auto-balance to 100%" style="font-size:10px; font-weight:bold; padding:2px 7px; border-radius:6px; background:rgba(139,92,246,0.12); color:#8b5cf6; border:none; cursor:pointer;">100% Auto</button><button type="button" class="chart-btn-add" title="Add segment" style="font-size:10px; font-weight:bold; padding:2px 7px; border-radius:6px; background:rgba(139,92,246,0.12); color:#8b5cf6; border:none; cursor:pointer;">+ Add</button></div></div><div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap; gap:1rem;"><svg viewBox="0 0 160 160" style="width:130px; height:130px; display:block;"><circle class="chart-bg-ring" cx="80" cy="80" r="55" fill="transparent" stroke="#e2e8f0" stroke-width="20"/><circle class="chart-slice" cx="80" cy="80" r="55" fill="transparent" stroke="#8b5cf6" stroke-width="20" stroke-dasharray="190.06 345.575" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 80 80)"/><circle class="chart-slice" cx="80" cy="80" r="55" fill="transparent" stroke="#f97316" stroke-width="20" stroke-dasharray="103.67 345.575" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(108 80 80)"/><circle class="chart-slice" cx="80" cy="80" r="55" fill="transparent" stroke="#10b981" stroke-width="20" stroke-dasharray="51.84 345.575" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(216 80 80)"/><text class="chart-center-val" x="80" y="77" font-size="16" font-weight="bold" fill="#1e293b" text-anchor="middle">100%</text><text class="chart-center-sub" x="80" y="93" font-size="9" fill="#64748b" text-anchor="middle">Total Share</text></svg><div class="chart-donut-items" style="font-size:11px; color:#475569; display:flex; flex-direction:column; gap:0.5rem; flex:1; min-width:140px;"><div class="chart-item-row" style="display:flex; align-items:center; gap:0.5rem;" data-color="#8b5cf6"><span class="chart-color-swatch" style="width:12px; height:12px; border-radius:3px; background:#8b5cf6; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="outline:none; flex:1;">Primary Metric</span><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#8b5cf6; outline:none; min-width:32px; text-align:right;">55%</span><button type="button" class="chart-item-del" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button></div><div class="chart-item-row" style="display:flex; align-items:center; gap:0.5rem;" data-color="#f97316"><span class="chart-color-swatch" style="width:12px; height:12px; border-radius:3px; background:#f97316; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="outline:none; flex:1;">Secondary Segment</span><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#f97316; outline:none; min-width:32px; text-align:right;">30%</span><button type="button" class="chart-item-del" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button></div><div class="chart-item-row" style="display:flex; align-items:center; gap:0.5rem;" data-color="#10b981"><span class="chart-color-swatch" style="width:12px; height:12px; border-radius:3px; background:#10b981; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="outline:none; flex:1;">Growth Reserve</span><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#10b981; outline:none; min-width:32px; text-align:right;">15%</span><button type="button" class="chart-item-del" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button></div></div></div></div><p><br/></p>`;
    } else if (chartType === "bar") {
      chartHtml = `<div class="chart-widget chart-widget-bar" data-chart-type="bar" contenteditable="false" style="margin:1.5rem 0; padding:1.25rem; background:rgba(0,0,0,0.03); border:1px solid rgba(0,0,0,0.08); border-radius:1.25rem; user-select:auto;"><div class="chart-header-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem;"><p contenteditable="true" class="chart-title" style="font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:#10b981; font-weight:bold; margin-bottom:0.75rem; outline:none;" title="Click to edit title">Performance Comparison</p><div class="chart-toolbar" style="display:flex; align-items:center; gap:0.4rem;"><button type="button" class="chart-btn-add" title="Add metric" style="font-size:10px; font-weight:bold; padding:2px 7px; border-radius:6px; background:rgba(16,185,129,0.12); color:#10b981; border:none; cursor:pointer;">+ Add</button></div></div><div class="chart-bar-items" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="chart-item-row" style="display:flex; align-items:center; gap:0.75rem; font-size:11px;" data-color="#10b981"><span class="chart-color-swatch" style="width:10px; height:10px; border-radius:3px; background:#10b981; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="width:80px; color:#64748b; font-weight:bold; outline:none;" title="Click to edit label">Metric A</span><div class="chart-bar-track" style="flex:1; background:rgba(0,0,0,0.05); height:16px; border-radius:6px; overflow:hidden;"><div class="chart-bar-fill" style="width:85%; height:100%; background:#10b981; border-radius:6px; transition:width 0.3s ease;"></div></div><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#1e293b; width:45px; text-align:right; outline:none;" title="Click to edit value">85%</span><button type="button" class="chart-item-del" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button></div><div class="chart-item-row" style="display:flex; align-items:center; gap:0.75rem; font-size:11px;" data-color="#06b6d4"><span class="chart-color-swatch" style="width:10px; height:10px; border-radius:3px; background:#06b6d4; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="width:80px; color:#64748b; font-weight:bold; outline:none;" title="Click to edit label">Metric B</span><div class="chart-bar-track" style="flex:1; background:rgba(0,0,0,0.05); height:16px; border-radius:6px; overflow:hidden;"><div class="chart-bar-fill" style="width:65%; height:100%; background:#06b6d4; border-radius:6px; transition:width 0.3s ease;"></div></div><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#1e293b; width:45px; text-align:right; outline:none;" title="Click to edit value">65%</span><button type="button" class="chart-item-del" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button></div><div class="chart-item-row" style="display:flex; align-items:center; gap:0.75rem; font-size:11px;" data-color="#f59e0b"><span class="chart-color-swatch" style="width:10px; height:10px; border-radius:3px; background:#f59e0b; display:inline-block; flex-shrink:0; cursor:pointer;" title="Click to change color"></span><span contenteditable="true" class="chart-item-label" style="width:80px; color:#64748b; font-weight:bold; outline:none;" title="Click to edit label">Metric C</span><div class="chart-bar-track" style="flex:1; background:rgba(0,0,0,0.05); height:16px; border-radius:6px; overflow:hidden;"><div class="chart-bar-fill" style="width:45%; height:100%; background:#f59e0b; border-radius:6px; transition:width 0.3s ease;"></div></div><span contenteditable="true" class="chart-item-val" style="font-weight:bold; color:#1e293b; width:45px; text-align:right; outline:none;" title="Click to edit value">45%</span><button type="button" class="chart-item-del" title="Remove" style="opacity:0.4; font-size:12px; background:none; border:none; color:#ef4444; cursor:pointer; padding:0 2px;">\xD7</button></div></div></div><p><br/></p>`;
    }
    document.execCommand("insertHTML", false, chartHtml);
    setHasChanges(true);
    hasChangesRef.current = true;
    saveState();
  };
  const handleImageResize = (e, targetImage, handleType) => {
    const isTouch = e.type.startsWith("touch");
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    const initialWidth = targetImage.offsetWidth;
    const initialHeight = targetImage.offsetHeight;
    const aR = initialWidth / initialHeight;
    const editorWidth = editorRef.current ? editorRef.current.offsetWidth : window.innerWidth;
    document.body.classList.add("resizing-active");
    if (handleType === "br" || handleType === "tl") {
      document.body.style.cursor = "nwse-resize";
    } else {
      document.body.style.cursor = "nesw-resize";
    }
    const onMove = (moveEvent) => {
      const currentX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
      let deltaX = 0;
      let deltaY = 0;
      if (handleType === "br") {
        deltaX = currentX - startX;
        deltaY = currentY - startY;
      } else if (handleType === "tl") {
        deltaX = startX - currentX;
        deltaY = startY - currentY;
      } else if (handleType === "tr") {
        deltaX = currentX - startX;
        deltaY = startY - currentY;
      } else if (handleType === "bl") {
        deltaX = startX - currentX;
        deltaY = currentY - startY;
      }
      const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * aR;
      const newWidth = Math.max(80, Math.min(editorWidth - 40, initialWidth + dominantDelta));
      targetImage.style.width = newWidth + "px";
      targetImage.style.height = "auto";
      if (isTouch) moveEvent.preventDefault();
    };
    const onEnd = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onEnd, true);
      document.removeEventListener("touchmove", onMove, { passive: false });
      document.removeEventListener("touchend", onEnd, true);
      document.body.classList.remove("resizing-active");
      document.body.style.cursor = "";
      setHasChanges(true);
      hasChangesRef.current = true;
      saveState();
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onEnd, true);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, true);
  };
  const handleImageMoveStart = (e, container2) => {
    const isTouch = e.type.startsWith("touch");
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    const img = container2.querySelector("img");
    if (!img) return;
    const rect = container2.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    const ghost = container2.cloneNode(true);
    ghost.className = "image-drag-ghost";
    ghost.style.width = rect.width + "px";
    ghost.style.height = rect.height + "px";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    document.body.appendChild(ghost);
    container2.classList.add("dragging-now");
    document.body.classList.add("dragging-image-active");
    const marker = document.createElement("div");
    marker.className = "drop-insertion-marker";
    let currentDropTarget = null;
    const onMove = (moveEvent) => {
      const curX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
      ghost.style.left = curX - offsetX + "px";
      ghost.style.top = curY - offsetY + "px";
      let range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(curX, curY);
      } else if (moveEvent.rangeParent) {
        range = document.createRange();
        range.setStart(moveEvent.rangeParent, moveEvent.rangeOffset);
      }
      if (range && editorRef.current.contains(range.startContainer)) {
        let container3 = range.startContainer;
        if (container3.nodeType === 3) container3 = container3.parentNode;
        const block = container3.closest("div, p, li, h1, h2");
        if (block && editorRef.current.contains(block)) {
          range.insertNode(marker);
          currentDropTarget = range;
        }
      }
      if (isTouch) moveEvent.preventDefault();
    };
    const onEnd = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup", onEnd, true);
      document.removeEventListener("touchmove", onMove, { passive: false });
      document.removeEventListener("touchend", onEnd, true);
      document.body.classList.remove("dragging-image-active");
      container2.classList.remove("dragging-now");
      ghost.remove();
      if (currentDropTarget && editorRef.current.contains(marker)) {
        marker.parentNode.insertBefore(container2, marker);
        marker.remove();
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
      } else {
        marker.remove();
      }
    };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup", onEnd, true);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd, true);
  };
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    const items = clipboardData.items || [];
    const imageItem = Array.from(items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target && event.target.result ? event.target.result : "";
          if (!src) return;
          const imgHtml = `
                                <div class="resizable-image-container selected" contenteditable="false">
                                    <div class="image-toolbar">
                                        <button class="image-action-btn danger" data-action="image-delete">
                                            <span class="material-symbols-outlined text-[16px]">delete</span>
                                            Delete
                                        </button>
                                    </div>
                                    <img src="${src}" class="resizable-image selected" style="width: 250px" />
                                    <div class="resize-handle tl"></div>
                                    <div class="resize-handle tr"></div>
                                    <div class="resize-handle bl"></div>
                                    <div class="resize-handle br"></div>
                                </div>
                            `;
          document.execCommand("insertHTML", false, imgHtml + "<div>&nbsp;</div>");
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
        };
        reader.readAsDataURL(blob);
      }
      return;
    }
    e.preventDefault();
    const text = clipboardData.getData("text");
    document.execCommand("insertText", false, text);
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgHtml = `
                            <div class="resizable-image-container selected" contenteditable="false">
                                <div class="image-toolbar">
                                    <button class="image-action-btn danger" data-action="image-delete">
                                        <span class="material-symbols-outlined text-[16px]">delete</span>
                                        Delete
                                    </button>
                                </div>
                                <img src="${event.target.result}" class="resizable-image selected" style="width: 250px" />
                                <div class="resize-handle tl"></div>
                                <div class="resize-handle tr"></div>
                                <div class="resize-handle bl"></div>
                                <div class="resize-handle br"></div>
                            </div>
                        `;
        document.execCommand("insertHTML", false, imgHtml + "<div>&nbsp;</div>");
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
      };
      reader.readAsDataURL(file);
    }
  };
  useEffect(() => {
    const handleGlobalInteract = (e) => {
      const target = e.target;
      const isTouch = e.type.startsWith("touch");
      const startX = isTouch ? e.touches[0].clientX : e.clientX;
      const startY = isTouch ? e.touches[0].clientY : e.clientY;
      const clearAll = () => {
        document.querySelectorAll(".resizable-image.selected, .resizable-image-container.selected").forEach((el) => el.classList.remove("selected"));
        setSelectedImage(null);
      };
      if (target.classList.contains("resizable-image")) {
        e.stopPropagation();
        if (!isTouch) e.preventDefault();
        clearAll();
        const container2 = target.closest(".resizable-image-container");
        if (container2) container2.classList.add("selected");
        target.classList.add("selected");
        setSelectedImage(target);
        const timer = setTimeout(() => {
          if (container2) handleImageMoveStart(e, container2);
        }, 500);
        const clearTimer = () => clearTimeout(timer);
        document.addEventListener("mouseup", clearTimer, { once: true });
        document.addEventListener("touchend", clearTimer, { once: true });
        document.addEventListener("mousemove", (me) => {
          if (Math.abs(me.clientX - startX) > 10 || Math.abs(me.clientY - startY) > 10) clearTimer();
        }, { once: true });
        return;
      }
      if (target.classList.contains("resize-handle")) {
        e.stopPropagation();
        e.preventDefault();
        const handleType = target.classList.contains("tl") ? "tl" : target.classList.contains("tr") ? "tr" : target.classList.contains("bl") ? "bl" : "br";
        const container2 = target.closest(".resizable-image-container");
        const img = container2 ? container2.querySelector("img") : null;
        if (img) handleImageResize(e, img, handleType);
        return;
      }
      const action = target.closest("[data-action]") ? target.closest("[data-action]").dataset.action : null;
      if (action) {
        e.stopPropagation();
        e.preventDefault();
        const container2 = target.closest(".resizable-image-container");
        if (action === "image-delete" && container2) {
          container2.remove();
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
        }
        return;
      }
      if (selectedImage && !target.closest(".resizable-image-container")) {
        clearAll();
      }
    };
    document.addEventListener("mousedown", handleGlobalInteract, true);
    document.addEventListener("touchstart", handleGlobalInteract, { capture: true, passive: false });
    return () => {
      document.removeEventListener("mousedown", handleGlobalInteract, true);
      document.removeEventListener("touchstart", handleGlobalInteract, true);
    };
  }, [selectedImage]);
  const ownerId = editingNote ? editingNote.ownerId : user == null ? void 0 : user.uid;
  const canEdit = useMemo(() => {
    if (!user) return isPublic && allowPublicEdit;
    if (!ownerId || user.uid === ownerId) return true;
    if (user.email && sharedWith.includes(user.email.toLowerCase())) return true;
    if (isPublic && allowPublicEdit) return true;
    return false;
  }, [user, ownerId, sharedWith, isPublic, allowPublicEdit]);
  const theme = themes.find((t) => t.id === noteTheme);
  const currentThemeClass = theme ? theme.themeClass : "";
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[2000] flex items-center justify-center transition-all duration-300 " + (isFullscreen ? "p-0" : "p-0 md:p-8") + " " + (isClosing ? "opacity-0 scale-95 pointer-events-none" : "animate-in fade-in duration-500") }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300 " + (isClosing ? "opacity-0" : ""), onClick: handleClose }), /* @__PURE__ */ React.createElement("div", { ref: modalRef, style: { transform: "translateY(calc(-1 * var(--faiora-keyboard-offset, 0px)))" }, className: "task-creator-modal w-full max-w-full h-full overflow-hidden flex flex-col relative z-10 shadow-2xl transition-all duration-250 " + (isFullscreen ? "md:max-w-full md:h-[100dvh] md:rounded-none !p-0 !m-0" : "md:max-w-4xl md:h-[85vh] md:rounded-[2rem]") + " " + (isClosing ? "opacity-0 scale-95 translate-y-20 md:translate-y-0 ease-in" : "animate-in zoom-in-95 duration-500 ease-out") + " transition-colors duration-500 " + currentThemeClass }, /* @__PURE__ */ React.createElement("div", { className: "w-full bg-black shrink-0 pointer-events-none md:hidden", style: { height: "env(safe-area-inset-top, 0px)" } }), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "modal-top-progress cursor-pointer group h-4 bg-black/5 hover:bg-black/10 transition-all relative overflow-hidden",
      onClick: handleProgressClick,
      onMouseMove: handleProgressDrag,
      onTouchMove: handleProgressDrag
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-progress-fill h-full transition-all duration-300 relative flex items-center justify-end",
        style: { width: progress + "%" }
      },
      /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-bold text-slate-800 px-2 mb-0.5 select-none transition-opacity ${progress < 15 ? "opacity-0" : "opacity-100"}` }, progress, "%"),
      /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform ring-4 ring-primary/20" })
    ),
    progress < 15 && /* @__PURE__ */ React.createElement("span", { className: "absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-800 opacity-60 select-none" }, progress, "%")
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "task-creator-scroll flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar relative flex flex-col",
      style: { scrollPaddingBottom: `${keyboardSafeSpace}px`, pointerEvents: isOpeningCooldown ? "none" : "auto" }
    },
    noteIcon && /* @__PURE__ */ React.createElement("div", { className: "absolute top-24 right-10 pointer-events-none opacity-[0.07] select-none" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-8xl text-primary animate-in zoom-in-50 duration-700" }, noteIcon)),
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-4 relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleBackClick,
        className: "md:hidden flex items-center justify-center flex-shrink-0 text-slate-500 hover:text-slate-800 transition-colors p-1 -ml-1"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[22px]" }, "arrow_back")
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Main title",
        maxLength: 24,
        readOnly: !canEdit || isOpeningCooldown,
        className: "bg-transparent border-none text-2xl md:text-4xl font-bold text-slate-800 placeholder:text-slate-600 focus:ring-0 w-full tracking-tight px-0 md:px-4 font-display",
        value: title,
        onChange: (e) => {
          if (!canEdit || isOpeningCooldown) return;
          const val = e.target.value;
          setTitle(val);
          setHasChanges(true);
          hasChangesRef.current = true;
          if (debouncedSaveTimer.current) clearTimeout(debouncedSaveTimer.current);
          debouncedSaveTimer.current = setTimeout(() => {
            const html = editorRef.current ? editorRef.current.innerHTML : content;
            saveToFirestore({
              title: val,
              content: html,
              progress,
              isPinned,
              noteTheme,
              noteIcon,
              labels,
              reminderDate,
              sharedWith,
              section: editingNote && editingNote.section ? editingNote.section : ""
            }, true);
          }, 300);
        },
        onBlur: () => {
          if (!canEdit) return;
          const formatted = formatTitle(title);
          setTitle(formatted);
          saveToFirestore({ title: formatted, content: editorRef.current ? editorRef.current.innerHTML : content, progress, isPinned, noteTheme, noteIcon, labels, reminderDate, section: (editingNote ? editingNote.section : "") || "" }, true);
        }
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 px-0 md:px-4" }, labels.map((label) => /* @__PURE__ */ React.createElement("span", { key: label, className: "text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-md flex items-center gap-1 font-montserrat" }, label, canEdit && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      const newLabels = labels.filter((l) => l !== label);
      setLabels(newLabels);
      setHasChanges(true);
      hasChangesRef.current = true;
      saveToFirestore({ title, content: editorRef.current ? editorRef.current.innerHTML : content, progress, isPinned, noteTheme, noteIcon, labels: newLabels, reminderDate, section: (editingNote ? editingNote.section : "") || "" }, true);
    }, className: "hover:text-primary-dark" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "close")))), reminderDate && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 text-[10px] font-bold font-montserrat text-primary bg-primary/10 px-2 py-1 rounded-md" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "notifications_active"), formatReminderDate(reminderDate)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (!canEdit) return;
          setIsPinned(!isPinned);
          setHasChanges(true);
          hasChangesRef.current = true;
          saveState();
        },
        className: "p-2 rounded-full transition-all " + (isPinned ? "text-primary bg-primary/10" : "text-slate-400 hover:text-slate-600"),
        disabled: !canEdit
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[22px] md:text-[24px]", style: isPinned ? { fontVariationSettings: "'FILL' 1" } : {} }, "push_pin")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleClose,
        className: "hidden md:block p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-all"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "close")
    ))),
    isSearchOpen && /* @__PURE__ */ React.createElement("div", { className: "note-search-bar fixed top-4 right-4 md:right-12 z-[200] flex items-center gap-1.5 bg-white/95 backdrop-blur-2xl p-1.5 pr-2 rounded-xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-top-4 zoom-in-95 duration-300 ring-1 ring-black/5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center flex-1 bg-black/[0.03] rounded-lg px-2 py-1" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-slate-400 text-sm" }, "search"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Find...",
        className: "bg-transparent border-none w-24 md:w-40 text-[13px] text-slate-700 placeholder:text-slate-400 focus:ring-0 px-1.5 font-montserrat h-6",
        value: searchQuery,
        onChange: (e) => {
          setSearchQuery(e.target.value);
          setCurrentMatchIndex(0);
        },
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setCurrentMatchIndex((prev) => prev + (e.shiftKey ? -1 : 1));
          }
        },
        autoFocus: true
      }
    ), Boolean(searchQuery) && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          setSearchQuery("");
          setCurrentMatchIndex(0);
        },
        className: "p-0.5 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center ml-auto",
        "aria-label": "Clear search",
        title: "Clear search"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "close")
    )), totalMatches > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-slate-400 font-montserrat flex-shrink-0 px-1" }, (currentMatchIndex % totalMatches + totalMatches) % totalMatches + 1, "/", totalMatches), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 border-l border-black/5 pl-1 ml-0.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentMatchIndex((prev) => prev - 1),
        className: "p-1 hover:bg-black/5 rounded-md text-slate-500 transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "keyboard_arrow_up")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentMatchIndex((prev) => prev + 1),
        className: "p-1 hover:bg-black/5 rounded-md text-slate-500 transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "keyboard_arrow_down")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setIsSearchOpen(false);
          setSearchQuery("");
        },
        className: "p-1 hover:bg-black/5 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "close")
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: editorRef,
        contentEditable: canEdit && !isOpeningCooldown ? "true" : "false",
        className: "note-editor-area px-0",
        style: {
          paddingLeft: 0,
          paddingRight: 0,
          paddingBottom: `${keyboardSafeSpace}px`,
          scrollPaddingBottom: `${keyboardSafeSpace}px`,
          caretColor: isOpeningCooldown ? "transparent" : "auto",
          outline: "none"
        },
        "data-placeholder": "Start typing your notes...",
        onInput: (e) => {
          if (!canEdit || isOpeningCooldown) return;
          setHasChanges(true);
          hasChangesRef.current = true;
          const chartWidget = e.target.closest(".chart-widget");
          if (chartWidget) {
            recalculateChartWidget(chartWidget);
          }
          if (isQuickTasksNotepad && editorRef.current) {
            const autoProg = calculateQuickTasksProgress(editorRef.current.innerHTML);
            setProgress(autoProg);
            if (editingNote) {
              localStorage.setItem(`faiora_draft_progress_${editingNote.id}`, String(autoProg));
            }
          }
          if (typeof onUpdateQuickTask === "function") {
            const activeLi = e.target && e.target.closest ? e.target.closest("li[data-qt-id]") : null;
            if (activeLi) {
              const qtId = activeLi.getAttribute("data-qt-id");
              const textSpan = activeLi.querySelector(".qt-notepad-live-text") || activeLi.querySelector("span:not(.checklist-checkbox)");
              const newText = textSpan ? textSpan.innerText.trim() : activeLi.innerText.trim();
              if (qtId && newText) {
                onUpdateQuickTask(qtId, { text: newText });
              }
            }
          }
          if (debouncedSaveTimer.current) clearTimeout(debouncedSaveTimer.current);
          debouncedSaveTimer.current = setTimeout(() => {
            const html = editorRef.current ? editorRef.current.innerHTML : content;
            const currentProg = isQuickTasksNotepad ? calculateQuickTasksProgress(html) : progress;
            saveToFirestore({
              title,
              content: html,
              progress: currentProg,
              isPinned,
              noteTheme,
              noteIcon,
              labels,
              reminderDate,
              sharedWith,
              section: editingNote && editingNote.section ? editingNote.section : ""
            }, true);
          }, 300);
          if (debouncedHistoryTimer.current) clearTimeout(debouncedHistoryTimer.current);
          debouncedHistoryTimer.current = setTimeout(() => {
            saveState();
          }, 1e3);
        },
        onBlur: saveState,
        onClick: handleEditorClick,
        onPaste: handlePaste,
        onKeyDown: handleEditorKeyDown,
        dangerouslySetInnerHTML: { __html: initialContent }
      }
    ))
  ), /* @__PURE__ */ React.createElement("div", { className: "task-creator-footer mt-auto flex items-center justify-between p-1 md:p-2 bg-white/50 backdrop-blur-xl border-t border-black/5 relative z-[100] gap-1 md:gap-2 overflow-visible" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0 md:gap-1 flex-nowrap overflow-visible" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      id: "notepad_format_btn",
      onClick: () => {
        if (!canEdit) return;
        setActivePopup(activePopup === "format" ? null : "format");
      },
      className: "footer-action-btn h-[32px] w-[32px] flex items-center justify-center transition-all rounded-xl " + (activePopup === "format" ? "bg-black/5 text-secondary" : "text-secondary hover:bg-black/5") + (!canEdit ? " opacity-30 grayscale pointer-events-none" : ""),
      title: "Formatting",
      disabled: !canEdit
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[22px]" }, "format_color_text")
  ), activePopup === "format" && // (2026-07-13) Fix toolbar clipping, overlap & button scaling. Prev: mb-2 overlap
  /* @__PURE__ */ React.createElement("div", { className: "format-popup-bar absolute bottom-[calc(100%+10px)] left-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-black/5 flex flex-nowrap items-center p-1.5 gap-0.5 z-[150] animate-in slide-in-from-bottom-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "relative px-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetActiveSubPopup(activeSubPopup === "style" ? null : "style"),
      className: "h-9 px-2.5 flex items-center justify-center gap-1 rounded-xl text-slate-600 transition-all active:scale-95 " + (activeSubPopup === "style" ? "bg-orange-500/15 text-primary font-bold" : "hover:bg-black/5")
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-[13px] font-bold tracking-tight uppercase font-montserrat" }, "H1"),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_drop_up")
  ), activeSubPopup === "style" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[calc(100%+10px)] left-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-black/10 flex items-center p-1.5 px-2.5 z-[160] animate-in slide-in-from-bottom-2 duration-200 gap-1.5 w-max whitespace-nowrap" }, /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    convertActiveBlock("h1");
  }, className: "h-8 px-2.5 flex items-center hover:bg-orange-50 hover:text-primary active:scale-95 rounded-lg text-sm font-bold text-slate-700 font-montserrat transition-all" }, "H1"), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    convertActiveBlock("h2");
  }, className: "h-8 px-2.5 flex items-center hover:bg-orange-50 hover:text-primary active:scale-95 rounded-lg text-xs font-bold text-slate-600 font-montserrat transition-all" }, "H2"), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    convertActiveBlock("normal");
  }, className: "h-8 px-3 flex items-center text-center justify-center hover:bg-orange-50 hover:text-primary active:scale-95 rounded-lg text-xs text-slate-500 font-montserrat transition-all" }, "Normal"))), /* @__PURE__ */ React.createElement("div", { className: "fmt-divider w-px h-5 bg-black/10 mx-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetActiveSubPopup(activeSubPopup === "case" ? null : "case"),
      className: "w-9 h-9 flex items-center justify-center gap-0.5 rounded-xl text-slate-600 transition-all active:scale-95 " + (activeSubPopup === "case" ? "bg-orange-500/15 text-primary font-bold" : "hover:bg-black/5")
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-[13px] font-bold tracking-tight font-montserrat" }, "Aa"),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_drop_up")
  ), activeSubPopup === "case" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[calc(100%+10px)] left-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-black/10 flex items-center p-1.5 px-2 z-[160] animate-in slide-in-from-bottom-2 duration-200 gap-1" }, /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    applyCase("cap");
  }, className: "h-7 px-2.5 flex items-center hover:bg-orange-50 hover:text-primary active:scale-95 rounded-lg text-xs capitalize font-bold text-slate-700 font-montserrat transition-all" }, "Aa"), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    applyCase("upper");
  }, className: "h-7 px-2.5 flex items-center hover:bg-orange-50 hover:text-primary active:scale-95 rounded-lg text-xs uppercase font-bold text-slate-700 font-montserrat transition-all" }, "AA"), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    applyCase("lower");
  }, className: "h-7 px-2.5 flex items-center hover:bg-orange-50 hover:text-primary active:scale-95 rounded-lg text-xs lowercase font-bold text-slate-700 font-montserrat transition-all" }, "aa"))), /* @__PURE__ */ React.createElement("div", { className: "fmt-divider w-px h-5 bg-black/10 mx-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5" }, /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    toggleFormat("**");
  }, className: "w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 " + (activeFormats.bold ? "bg-orange-500/15 text-primary font-bold" : "hover:bg-black/5 text-slate-600"), title: "Bold" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]", style: activeFormats.bold ? { fontVariationSettings: "'WGHT' 700" } : {} }, "format_bold")), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    toggleFormat("*");
  }, className: "w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 " + (activeFormats.italic ? "bg-orange-500/15 text-primary" : "hover:bg-black/5 text-slate-600"), title: "Italic" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_italic")), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    toggleFormat("__");
  }, className: "w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 " + (activeFormats.underline ? "bg-orange-500/15 text-primary" : "hover:bg-black/5 text-slate-600"), title: "Underline" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_underlined")), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    toggleFormat("~~");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-black/5 active:scale-95 rounded-xl text-slate-600 transition-all", title: "Strikethrough" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "strikethrough_s"))), /* @__PURE__ */ React.createElement("div", { className: "fmt-divider w-px h-5 bg-black/10 mx-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetActiveSubPopup(activeSubPopup === "highlight" ? null : "highlight"),
      className: "w-9 h-9 flex items-center justify-center gap-0.5 rounded-xl text-slate-600 transition-all active:scale-95 " + (activeSubPopup === "highlight" ? "bg-orange-500/15 text-primary font-bold" : "hover:bg-black/5"),
      title: "Highlight Color"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[20px]" }, "ink_highlighter"),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_drop_up")
  ), activeSubPopup === "highlight" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[calc(100%+10px)] right-0 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-black/5 flex items-center z-[160] animate-in slide-in-from-bottom-1 duration-200", style: { minWidth: "130px" } }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onMouseDown: (e) => {
        e.preventDefault();
        toggleHighlight("transparent");
      },
      className: "highlight-option flex items-center justify-center bg-white border-dashed",
      title: "No Highlight"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs text-slate-200" }, "format_color_reset")
  ), ["#fed7aa", "#fef08a", "#bbf7d0", "#bfdbfe", "#ddd6fe", "#fecaca", "#f5f5f5", "#ffedd5", "#fef9c3", "#dcfce7", "#dbeafe", "#f3e8ff", "#ffe4e6", "#ccfbf1", "#fef3c7"].map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c,
      onMouseDown: (e) => {
        e.preventDefault();
        toggleHighlight(c);
      },
      className: "highlight-option",
      style: { backgroundColor: c }
    }
  ))))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetActiveSubPopup(activeSubPopup === "divider" ? null : "divider"),
      className: "w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 transition-colors " + (activeSubPopup === "divider" ? "bg-black/5" : "hover:bg-black/5"),
      title: "Divider Colors"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[20px]", style: { color: "#ea580c" } }, "horizontal_rule"),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_drop_up")
  ), activeSubPopup === "divider" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[calc(100%+10px)] right-0 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-black/5 z-[160] animate-in slide-in-from-bottom-1 duration-200 w-52" }, /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1" }, "Gradient Dividers"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-2.5" }, [
    { name: "Flame", bg: "linear-gradient(to right, #f97316, #fbbf24, transparent)" },
    { name: "Emerald", bg: "linear-gradient(to right, #10b981, #06b6d4, transparent)" },
    { name: "Sunset", bg: "linear-gradient(to right, #8b5cf6, #ec4899, transparent)" },
    { name: "Ocean", bg: "linear-gradient(to right, #3b82f6, #06b6d4, transparent)" },
    { name: "Amber", bg: "linear-gradient(to right, #f59e0b, #eab308, transparent)" },
    { name: "Crimson", bg: "linear-gradient(to right, #ef4444, #f97316, transparent)" },
    { name: "Slate", bg: "linear-gradient(to right, #64748b, #94a3b8, transparent)" },
    { name: "Muted", bg: "linear-gradient(to right, #cbd5e1, #e2e8f0, transparent)" }
  ].map((item) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: item.name,
      title: item.name,
      onMouseDown: (e) => {
        e.preventDefault();
        document.execCommand("insertHTML", false, `<hr style="border:none; height:2px; background:${item.bg}; margin: 1.5rem 0; width: 100%; border-radius: 9999px;" />`);
        setHasChanges(true);
        hasChangesRef.current = true;
        handleSetActiveSubPopup(null);
      },
      className: "w-full h-6 rounded-lg border border-black/5 hover:scale-110 transition-transform shadow-sm",
      style: { background: item.bg }
    }
  ))), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1" }, "Solid Dividers"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-1" }, ["#ea580c", "#334155", "#64748b", "#94a3b8"].map((color) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: color,
      onMouseDown: (e) => {
        e.preventDefault();
        document.execCommand("insertHTML", false, `<hr style="border:none; border-top: 2px solid ${color}; margin: 1.5rem 0; width: 100%;" />`);
        setHasChanges(true);
        hasChangesRef.current = true;
        handleSetActiveSubPopup(null);
      },
      className: "w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform",
      style: { backgroundColor: color }
    }
  ))))))), /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(activePopup === "tools" ? null : "tools"), className: "footer-action-btn flex items-center justify-center transition-all rounded-xl " + (activePopup === "tools" ? "bg-black/5 text-secondary" : "text-secondary hover:bg-black/5"), title: "More Tools" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[26px]" }, "menu")), activePopup === "tools" && // (2026-07-13) Fix tools bar overlap & spacing. Prev: mb overlap
  /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[calc(100%+10px)] left-0 md:left-0 md:translate-x-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-black/5 flex items-center p-1.5 z-[150] animate-in slide-in-from-bottom-2 duration-200 gap-0.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 px-0.5" }, /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    document.execCommand("justifyLeft");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Align Left" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_align_left")), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    document.execCommand("justifyCenter");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Align Center" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_align_center")), /* @__PURE__ */ React.createElement("button", { onMouseDown: (e) => {
    e.preventDefault();
    document.execCommand("justifyRight");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Align Right" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_align_right"))), /* @__PURE__ */ React.createElement("div", { className: "w-px h-5 bg-black/10 mx-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 px-0.5" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    convertActiveBlock("todo");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Checklist" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "checklist")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    convertActiveBlock("bullet");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Bullets" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_list_bulleted")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    convertActiveBlock("number");
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Numbering" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "format_list_numbered"))), /* @__PURE__ */ React.createElement("div", { className: "w-px h-5 bg-black/10 mx-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center px-0.5" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    fileInputRef.current.click();
  }, className: "w-9 h-9 flex items-center justify-center hover:bg-orange-50 hover:text-primary rounded-xl text-slate-600 active:scale-95 transition-all", title: "Add Image" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[19px]" }, "image"))))), /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetActivePopup(activePopup === "charts" ? null : "charts"),
      className: "footer-action-btn flex items-center justify-center transition-all rounded-xl " + (activePopup === "charts" ? "bg-black/5 text-primary" : "text-secondary hover:bg-black/5"),
      title: "Insert Charts"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "insert_chart")
  ), activePopup === "charts" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-[calc(100%+8px)] left-0 md:left-0 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-[150] animate-in slide-in-from-bottom-2 duration-200 flex flex-col gap-1 w-52 text-slate-700" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onMouseDown: (e) => {
        e.preventDefault();
        insertChartTemplate("line");
        handleSetActivePopup(null);
      },
      className: "flex items-center gap-3 p-2.5 hover:bg-orange-50 hover:text-primary rounded-xl transition-all text-left group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "show_chart")),
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, "Line Chart"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, "Growth trajectory curve"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onMouseDown: (e) => {
        e.preventDefault();
        insertChartTemplate("donut");
        handleSetActivePopup(null);
      },
      className: "flex items-center gap-3 p-2.5 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all text-left group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "donut_large")),
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, "Donut Chart"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, "Distribution breakdown"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onMouseDown: (e) => {
        e.preventDefault();
        insertChartTemplate("bar");
        handleSetActivePopup(null);
      },
      className: "flex items-center gap-3 p-2.5 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all text-left group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "bar_chart")),
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, "Bar Graph"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, "Performance metrics"))
  ))), /* @__PURE__ */ React.createElement("div", { className: "footer-divider flex-shrink-0 hidden md:block" }), /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(activePopup === "reminder" ? null : "reminder"), className: "footer-action-btn relative " + (activePopup === "reminder" ? "bg-black/5 text-primary" : ""), title: "Reminders" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "notifications"), reminderDate && /* @__PURE__ */ React.createElement("span", { className: "absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" })), activePopup === "reminder" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full mb-4 left-0 bg-white rounded-xl shadow-2xl border border-black/5 z-[150] w-72 animate-in slide-in-from-bottom-2 duration-300 py-2" }, !showCustomReminder ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "px-5 py-3 border-b border-black/5 mb-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-slate-800 font-montserrat" }, "Remind me later")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const now = /* @__PURE__ */ new Date();
    const hour = now.getHours();
    let target = new Date(now);
    if (hour >= 18 || hour < 6) {
      if (hour >= 18) target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else {
      target = new Date(now.getTime() + 4 * 60 * 60 * 1e3);
    }
    const dateStr = formatDateLocal(target);
    const timeStr = target.getHours().toString().padStart(2, "0") + ":" + target.getMinutes().toString().padStart(2, "0");
    setReminderDate(dateStr + "T" + timeStr);
    setHasChanges(true);
    hasChangesRef.current = true;
    handleSetActivePopup(null);
  }, className: "px-5 py-3 hover:bg-black/5 flex items-center justify-between text-sm text-slate-600 transition-colors font-montserrat" }, /* @__PURE__ */ React.createElement("span", null, "Later"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400 font-montserrat" }, (() => {
    const now = /* @__PURE__ */ new Date();
    const hour = now.getHours();
    if (hour >= 18 || hour < 6) return "Tomorrow, 10:00 AM";
    const future = new Date(now.getTime() + 4 * 60 * 60 * 1e3);
    const h = future.getHours();
    const m = future.getMinutes().toString().padStart(2, "0");
    return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
  })())), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReminderDate(formatDateLocal(tomorrow) + "T08:00");
    setHasChanges(true);
    hasChangesRef.current = true;
    handleSetActivePopup(null);
  }, className: "px-5 py-3 hover:bg-black/5 flex items-center justify-between text-sm text-slate-600 transition-colors font-montserrat" }, /* @__PURE__ */ React.createElement("span", null, "Tomorrow"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400 font-montserrat" }, "8:00 AM")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const nextWeek = /* @__PURE__ */ new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setReminderDate(formatDateLocal(nextWeek) + "T08:00");
    setHasChanges(true);
    hasChangesRef.current = true;
    handleSetActivePopup(null);
  }, className: "px-5 py-3 hover:bg-black/5 flex items-center justify-between text-sm text-slate-600 transition-colors font-montserrat" }, /* @__PURE__ */ React.createElement("span", null, "Next week"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400 font-montserrat" }, "Mon, 8:00 AM")), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-black/5 my-1" }), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    if (!reminderDate) {
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + daysUntilMonday);
      setReminderDate(formatDateLocal(nextMon) + "T10:00");
    }
    setShowCustomReminder(true);
  }, className: "px-5 py-3 hover:bg-black/5 flex items-center gap-3 text-sm text-slate-700 font-semibold transition-colors font-montserrat justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "schedule"), /* @__PURE__ */ React.createElement("span", { className: "font-montserrat" }, "Custom")), reminderDate && /* @__PURE__ */ React.createElement("span", { className: "w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0" }))) : /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-4" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowCustomReminder(false), className: "p-1.5 hover:bg-black/5 rounded-full text-slate-500 transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "arrow_back")), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-700 font-montserrat" }, "Custom")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "relative border-b border-black/10 focus-within:border-primary transition-colors" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      className: "w-full bg-transparent border-none p-2 text-sm focus:ring-0 text-slate-600 font-montserrat",
      value: reminderDate.split("T")[0] || "",
      onChange: (e) => {
        const newDate = e.target.value;
        const currentTime = reminderDate.split("T")[1] || "08:00";
        setReminderDate(`${newDate}T${currentTime}`);
        setHasChanges(true);
        hasChangesRef.current = true;
      }
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "relative border-b border-black/10 focus-within:border-primary transition-colors" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "time",
      className: "w-full bg-transparent border-none p-2 text-sm focus:ring-0 text-slate-600 font-montserrat",
      value: reminderDate.split("T")[1] || "08:00",
      onChange: (e) => {
        const newTime = e.target.value;
        const currentDate = reminderDate.split("T")[0] || formatDateLocal(/* @__PURE__ */ new Date());
        setReminderDate(`${currentDate}T${newTime}`);
        setHasChanges(true);
        hasChangesRef.current = true;
      }
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "relative border-b border-black/10" }, /* @__PURE__ */ React.createElement("select", { className: "w-full bg-transparent border-none p-2 text-sm focus:ring-0 text-slate-600 appearance-none font-montserrat" }, /* @__PURE__ */ React.createElement("option", null, "Does not repeat"), /* @__PURE__ */ React.createElement("option", null, "Daily"), /* @__PURE__ */ React.createElement("option", null, "Weekly"), /* @__PURE__ */ React.createElement("option", null, "Monthly")))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mt-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setHasChanges(true);
    hasChangesRef.current = true;
    handleSetActivePopup(null);
  }, className: "px-6 py-2 text-sm font-bold text-slate-800 hover:bg-black/5 rounded-lg transition-all font-montserrat" }, "Save"))))), /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(activePopup === "palette" ? null : "palette"), className: "footer-action-btn " + (activePopup === "palette" ? "bg-black/5 text-black" : ""), title: "Theme" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "palette")), activePopup === "palette" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full mb-4 left-0 md:left-0 md:translate-x-0 grid grid-cols-6 gap-2 p-3 w-max bg-white rounded-2xl shadow-2xl border border-black/5 z-[150] animate-in slide-in-from-bottom-2 duration-200" }, themes.map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.id,
      onClick: () => {
        setNoteTheme(t.id);
        handleSetActivePopup(null);
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
      },
      className: "w-7 h-7 md:w-8 md:h-8 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0 " + (noteTheme === t.id ? "border-primary" : "border-transparent"),
      style: { backgroundColor: t.id === "glass" ? "rgba(0,0,0,0.05)" : t.color }
    }
  )))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      ref: fileInputRef,
      className: "hidden",
      accept: "image/*",
      onChange: handleImageUpload
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(activePopup === "icon" ? null : "icon"), className: "footer-action-btn " + (activePopup === "icon" ? "bg-black/5 text-primary" : ""), title: "Choose Icon" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "add_reaction")), activePopup === "icon" && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full mb-4 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 flex flex-col p-3 bg-white rounded-2xl shadow-2xl border border-black/5 z-[120] w-72 md:w-80 animate-in slide-in-from-bottom-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "search-bar-container" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-slate-400 text-lg" }, "search"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Search icons...",
      className: "search-input bg-transparent focus:outline-none focus:ring-0",
      style: { caretColor: "#f97316", WebkitTextFillColor: "inherit" },
      value: searchTerm,
      onChange: (e) => setSearchTerm(e.target.value),
      autoFocus: true
    }
  ), Boolean(searchTerm) && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setSearchTerm(""),
      className: "p-0.5 hover:bg-black/5 rounded text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center ml-auto",
      "aria-label": "Clear search",
      title: "Clear search"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "close")
  )), /* @__PURE__ */ React.createElement("div", { className: "max-h-56 overflow-y-auto icon-picker-scroll grid grid-cols-4 gap-2 w-full pr-1 px-1" }, filteredIcons.map((icon) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: icon,
      onClick: () => {
        setNoteIcon(icon);
        handleSetActivePopup(null);
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
      },
      className: "p-2 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center " + (noteIcon === icon ? "text-primary bg-primary/10" : "text-slate-400"),
      title: icon
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[20px]" }, icon)
  )), filteredIcons.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "col-span-4 py-4 text-center text-xs text-slate-400" }, "No icons found")), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-slate-100 my-2 mx-1" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setNoteIcon("");
        handleSetActivePopup(null);
        setHasChanges(true);
        hasChangesRef.current = true;
        saveState();
      },
      className: "mx-1 p-2 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-red-400 hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "block"),
    "Remove Icon"
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 md:gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) setSearchQuery("");
  }, className: "footer-action-btn flex-shrink-0 " + (isSearchOpen ? "text-primary bg-primary/10" : ""), title: "Find (Ctrl+F)" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "search")), /* @__PURE__ */ React.createElement("button", { onClick: () => setIsFullscreen(!isFullscreen), className: "footer-action-btn flex-shrink-0 hidden md:flex " + (isFullscreen ? "text-primary bg-primary/10" : ""), title: "Toggle Fullscreen" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, isFullscreen ? "fullscreen_exit" : "fullscreen")), /* @__PURE__ */ React.createElement("button", { onClick: undo, disabled: historyIndex <= 0, className: "footer-action-btn flex-shrink-0 disabled:opacity-20", title: "Undo" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "undo")), /* @__PURE__ */ React.createElement("button", { onClick: redo, disabled: historyIndex >= history.length - 1, className: "footer-action-btn flex-shrink-0 disabled:opacity-20", title: "Redo" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "redo")), /* @__PURE__ */ React.createElement("div", { className: "relative flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
    e.stopPropagation();
    handleSetActivePopup(activePopup === "more" ? null : "more");
  }, className: "footer-action-btn " + (activePopup === "more" ? "bg-black/5 text-primary" : ""), title: "More Options" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "more_vert")), activePopup === "more" && /* @__PURE__ */ React.createElement("div", { className: "more-menu-dropdown z-[120] animate-in slide-in-from-bottom-2 duration-200" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    handleSetActivePopup("labels");
  }, className: "menu-item font-montserrat" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "label"), "Add Label"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    handleSetActivePopup("share");
  }, className: "menu-item font-montserrat" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "share"), "Share Note"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    if (confirm("Duplicate this note?")) {
      const duplicatedId = "note_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      const duplicated = {
        ...editingNoteRef.current || {},
        id: duplicatedId,
        title: `${title || "Untitled"} (Copy)`,
        content: editorRef.current ? editorRef.current.innerHTML : content,
        isPinned: false,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (onUpdateNote) onUpdateNote(duplicated);
      if (user && activeCollection2) {
        db.collection(activeCollection2).doc(user.uid).set({
          notes: {
            [duplicatedId]: {
              ...duplicated,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
          }
        }, { merge: true }).catch(() => {
        });
      }
      showToast2("Note duplicated");
      handleSetActivePopup(null);
    }
  }, className: "menu-item font-montserrat" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "content_copy"), "Duplicate Note"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    handleSetActivePopup("history");
  }, className: "menu-item font-montserrat" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "history"), "Version History"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        handleSetActivePopup(null);
        if (isLocked) {
          onToggleLock();
        } else {
          onOpenLockSet();
        }
      },
      className: "menu-item font-montserrat"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, isLocked ? "lock_open" : "lock"),
    isLocked ? "Remove Lock" : "Lock Note"
  ), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-slate-100 my-1" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleDeleteNote,
      className: "menu-item danger font-montserrat"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "delete"),
    "Delete Note"
  )), activePopup === "labels" && /* @__PURE__ */ React.createElement("div", { className: "more-menu-dropdown z-[120] w-56 animate-in scale-95 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3 p-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup("more"), className: "p-1 hover:bg-slate-100 rounded-full" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_back")), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold uppercase tracking-widest text-slate-400" }, "Add Label")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1 mb-2 max-h-48 overflow-y-auto no-scrollbar" }, allUsedLabels.map((l) => {
    const isPri = l === "PRIORITY";
    const isSelected = labels.includes(l);
    return /* @__PURE__ */ React.createElement("button", { key: l, onClick: () => {
      const newLabels = labels.includes(l) ? labels.filter((x) => x !== l) : [...labels, l];
      setLabels(newLabels);
      handleSetActivePopup(null);
      setHasChanges(true);
      hasChangesRef.current = true;
      saveToFirestore({ title, content: editorRef.current ? editorRef.current.innerHTML : content, progress, isPinned, noteTheme, noteIcon, labels: newLabels, reminderDate, section: (editingNote ? editingNote.section : "") || "" });
    }, className: `menu-item !py-2 justify-between font-montserrat ${isPri ? "bg-primary/10 text-primary font-bold hover:bg-primary/15" : ""}` }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, isPri && /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm text-primary" }, "local_fire_department"), /* @__PURE__ */ React.createElement("span", null, l), isPri && /* @__PURE__ */ React.createElement("span", { className: "text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold" }, "PIN")), isSelected && /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-sm font-bold" }, "check"));
  })), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-slate-100 my-1" }), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 p-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "Custom label...",
      className: "flex-1 bg-slate-50 border-none rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30 font-montserrat",
      value: newLabelText,
      onChange: (e) => setNewLabelText(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter" && newLabelText.trim()) {
          const cleanLabel = newLabelText.trim().toUpperCase();
          const newLabels = labels.includes(cleanLabel) ? labels : [...labels, cleanLabel];
          setLabels(newLabels);
          setNewLabelText("");
          handleSetActivePopup(null);
          setHasChanges(true);
          hasChangesRef.current = true;
          saveToFirestore({ title, content: editorRef.current ? editorRef.current.innerHTML : content, progress, isPinned, noteTheme, noteIcon, labels: newLabels, reminderDate, section: (editingNote ? editingNote.section : "") || "" });
        }
      }
    }
  ))), activePopup === "share" && /* @__PURE__ */ React.createElement("div", { className: "more-menu-dropdown z-[120] w-80 p-0 overflow-hidden animate-in slide-in-from-bottom-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 border-b border-slate-100 flex items-center justify-between bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup("more"), className: "p-1 hover:bg-slate-100 rounded-full" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_back")), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-800 font-montserrat tracking-tight" }, "Share Note")), /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(null), className: "text-slate-400 hover:text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close"))), /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-5 bg-white" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block" }, "Invite by Email"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "email",
      placeholder: "Enter email...",
      className: "flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-montserrat",
      value: shareEmail,
      onChange: (e) => setShareEmail(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter" && shareEmail.trim()) {
          const email = shareEmail.trim().toLowerCase();
          if (!sharedWith.includes(email)) {
            const nextShared = [...sharedWith, email];
            setSharedWith(nextShared);
            setHasChanges(true);
            hasChangesRef.current = true;
            let token = publicShareToken;
            if (!token) {
              token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              setPublicShareToken(token);
            }
            const url = `https://zeamarae.github.io/Faiora/#/share_note.html#/${token}`;
            saveToFirestore({ sharedWith: nextShared, publicShareToken: token }, true);
            db.collection("shared_access").doc(`${noteId}_${email}`).set({
              noteId,
              ownerId: (user == null ? void 0 : user.uid) || "guest",
              ownerCollection: activeCollection2 || "tasks",
              sharedWith: email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              link: url
            }, { merge: true }).catch(() => {
            });
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("Faiora note invite")}&body=${encodeURIComponent("You were invited to collaborate on a note:\\n\\n" + url)}`;
            window.open(gmailUrl, "_blank");
          }
          setShareEmail("");
        }
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        if (shareEmail.trim()) {
          const email = shareEmail.trim().toLowerCase();
          if (!sharedWith.includes(email)) {
            const nextShared = [...sharedWith, email];
            setSharedWith(nextShared);
            setHasChanges(true);
            hasChangesRef.current = true;
            let token = publicShareToken;
            if (!token) {
              token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
              setPublicShareToken(token);
            }
            const url = `https://zeamarae.github.io/Faiora/#/share_note.html#/${token}`;
            saveToFirestore({ sharedWith: nextShared, publicShareToken: token }, true);
            db.collection("shared_access").doc(`${noteId}_${email}`).set({
              noteId,
              ownerId: (user == null ? void 0 : user.uid) || "guest",
              ownerCollection: activeCollection2 || "tasks",
              sharedWith: email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              link: url
            }, { merge: true }).catch(() => {
            });
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("Faiora note invite")}&body=${encodeURIComponent("You were invited to collaborate on a note:\\n\\n" + url)}`;
            window.open(gmailUrl, "_blank");
          }
          setShareEmail("");
        }
      },
      className: "bg-primary text-white px-3 rounded-xl text-xs font-bold hover:bg-primary-dark transition-colors"
    },
    "Invite"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap gap-2" }, sharedWith.map((email) => /* @__PURE__ */ React.createElement("span", { key: email, className: "inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold" }, email, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const nextShared = sharedWith.filter((e) => e !== email);
    setSharedWith(nextShared);
    setHasChanges(true);
    hasChangesRef.current = true;
    saveToFirestore({ sharedWith: nextShared }, true);
    db.collection("shared_access").doc(`${noteId}_${email}`).delete().catch(() => {
    });
  }, className: "hover:text-red-500" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "close")))))), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-slate-100" }), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-700 font-montserrat" }, "Public Access"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 font-montserrat" }, "Anyone with the link can view")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const newVal = !isPublic;
        let token = publicShareToken;
        if (newVal && !token) {
          token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          setPublicShareToken(token);
        }
        setIsPublic(newVal);
        setHasChanges(true);
        hasChangesRef.current = true;
        saveToFirestore({
          title,
          content: editorRef.current ? editorRef.current.innerHTML : content,
          isPublic: newVal,
          publicShareToken: token,
          allowPublicEdit
        }, true);
      },
      className: `w-10 h-5 rounded-full relative transition-colors ${isPublic ? "bg-primary" : "bg-slate-200"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: `absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isPublic ? "left-6" : "left-1"}` })
  )), isPublic && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-700 font-montserrat" }, "Allow Public Editing"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 font-montserrat" }, "Anyone can edit this note")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const newVal = !allowPublicEdit;
        setAllowPublicEdit(newVal);
        setHasChanges(true);
        saveToFirestore({
          title,
          content: editorRef.current ? editorRef.current.innerHTML : content,
          allowPublicEdit: newVal,
          isPublic,
          publicShareToken
        }, true);
      },
      className: `w-10 h-5 rounded-full relative transition-colors ${allowPublicEdit ? "bg-primary" : "bg-slate-200"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: `absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${allowPublicEdit ? "left-6" : "left-1"}` })
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        var _a2;
        const activeToken = publicShareToken || ((_a2 = editingNoteRef.current) == null ? void 0 : _a2.publicShareToken);
        const url = `https://zeamarae.github.io/Faiora/#/share_note.html#/${activeToken}`;
        navigator.clipboard.writeText(url);
        showToast2("Public link copied!");
      },
      className: "w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold font-montserrat transition-all flex items-center justify-center gap-2"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "link"),
    "Copy Public Link"
  ))))), activePopup === "history" && /* @__PURE__ */ React.createElement("div", { className: "more-menu-dropdown z-[120] w-72 p-0 overflow-hidden animate-in slide-in-from-bottom-2 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup("more"), className: "p-1 hover:bg-slate-200 rounded-full" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "arrow_back")), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-slate-800 font-montserrat tracking-tight" }, "Version history")), /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(null), className: "text-slate-400 hover:text-slate-600" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close"))), /* @__PURE__ */ React.createElement("div", { className: "max-h-64 overflow-y-auto no-scrollbar p-1" }, Object.entries(((_a = editingNoteRef.current) == null ? void 0 : _a.versions) || {}).sort((a, b) => b[0].localeCompare(a[0])).map(([dayId, version]) => /* @__PURE__ */ React.createElement("div", { key: dayId, className: "p-3 hover:bg-slate-50 rounded-xl flex items-center justify-between group" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-slate-400 text-sm" }, "event"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-slate-700" }, dayId)), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400 ml-6 uppercase tracking-wider font-bold" }, "Daily Snapshot")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        const blob = new Blob([version.content.replace(/<[^>]*>/g, "")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (version.title || "Note") + "_" + dayId + ".txt";
        a.click();
      },
      className: "text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
    },
    "Download"
  )))), /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-slate-50 flex justify-end" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetActivePopup(null), className: "text-xs font-bold text-slate-800 hover:text-primary" }, "Dismiss")))))), showConfirm.show && /* @__PURE__ */ React.createElement(
    ConfirmationModal,
    {
      title: showConfirm.title,
      message: showConfirm.message,
      onConfirm: showConfirm.onConfirm,
      onCancel: () => setShowConfirm({ show: false }),
      type: showConfirm.type
    }
  ), showDeleteConfirm && /* @__PURE__ */ React.createElement(
    ConfirmationModal,
    {
      title: "Delete Note?",
      message: "Are you sure you want to delete this note? This cannot be undone.",
      onConfirm: confirmDeleteNote,
      onCancel: () => setShowDeleteConfirm(false),
      confirmText: "Delete",
      type: "danger"
    }
  )));
};
const LoginModal = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const handleLogin = () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    signInWithGoogle().then(() => {
      setLoginSuccess(true);
      localStorage.setItem("faiora_logged_in", "true");
    }).catch((e) => {
      console.error("Login failed or cancelled", e);
      const msg = (e == null ? void 0 : e.message) || "";
      if (!msg.includes("cancelled") && !msg.includes("closed") && !msg.includes("popup-closed-by-user")) {
        alert("Google login failed: " + msg);
      }
    }).finally(() => {
      setIsLoggingIn(false);
    });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "faiora-auth-screen fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-hidden bg-[#0c0502]" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "pointer-events-none auth-glow-primary",
      style: {
        background: "radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.2) 0%, rgba(194, 65, 12, 0.09) 32%, rgba(124, 45, 18, 0.03) 52%, transparent 70%)"
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "pointer-events-none auth-glow-secondary",
      style: {
        background: "radial-gradient(circle at 50% 46%, rgba(234, 88, 12, 0.14) 0%, rgba(154, 52, 18, 0.05) 30%, transparent 62%)"
      }
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "faiora-auth-panel max-w-sm sm:max-w-md w-full p-8 sm:p-10 rounded-3xl flex flex-col items-center text-center relative z-10 shadow-2xl border border-white/10 bg-[#160b07]/85 backdrop-blur-md transform-gpu" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6 relative" }, /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 relative flex items-center justify-center" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: "assets/icon-only.png",
      alt: "Faiora Logo",
      draggable: false,
      onDragStart: (e) => e.preventDefault(),
      className: "w-full h-full object-contain drop-shadow-[0_0_18px_rgba(249,115,22,0.65)] select-none pointer-events-none"
    }
  )), /* @__PURE__ */ React.createElement("h2", { className: "faiora-auth-title text-5xl sm:text-6xl font-black text-cream-light italic tracking-tighter drop-shadow-[0_0_24px_rgba(249,115,22,0.4)]", style: { fontFamily: "inherit" } }, "Faiora"), /* @__PURE__ */ React.createElement("p", { className: "faiora-auth-eyebrow text-primary font-bold uppercase tracking-[0.4em] text-xs mt-3" }, "Ignite your productivity")), /* @__PURE__ */ React.createElement("p", { className: "faiora-auth-copy text-cream-light/70 text-sm sm:text-base mb-8 max-w-xs font-sans leading-relaxed" }, "Experience a fiery approach to digital planning. Sync your lists, tasks, and goals with Google and light up your potential."), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleLogin,
      disabled: isLoggingIn || loginSuccess,
      className: `faiora-auth-button bg-white text-black rounded-2xl font-bold flex items-center justify-center flex-nowrap gap-3 hover:bg-primary hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 group mb-4 w-[220px] sm:w-[260px] h-[54px] ${isLoggingIn ? "opacity-70 cursor-not-allowed !scale-100" : ""}`
    },
    isLoggingIn ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5 shrink-0 animate-spin", viewBox: "0 0 24 24", fill: "none" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "3" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" })), /* @__PURE__ */ React.createElement("span", { className: "text-sm sm:text-base whitespace-nowrap leading-none font-bold" }, "Connecting...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5 shrink-0", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), /* @__PURE__ */ React.createElement("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), /* @__PURE__ */ React.createElement("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" }), /* @__PURE__ */ React.createElement("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" })), /* @__PURE__ */ React.createElement("span", { className: "text-sm sm:text-base whitespace-nowrap leading-none font-bold" }, "Login with Google"))
  ), loginSuccess && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-emerald-400 text-sm font-bold font-montserrat uppercase tracking-wider mb-4 animate-pulse" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "check_circle"), /* @__PURE__ */ React.createElement("span", null, "Successful Login")), /* @__PURE__ */ React.createElement("div", { className: "faiora-auth-links flex gap-6 text-[10px] uppercase tracking-widest font-bold text-cream-light/40 mt-2" }, /* @__PURE__ */ React.createElement("a", { href: "privacy.html", className: "hover:text-primary transition-colors" }, "Privacy"), /* @__PURE__ */ React.createElement("a", { href: "terms.html", className: "hover:text-primary transition-colors" }, "Terms"))));
};
const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) => {
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animation-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-xs sm:max-w-sm glass-panel bg-[#160d08]/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-5 text-center space-y-4 transform scale-up-center font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: `w-12 h-12 mx-auto rounded-full flex items-center justify-center ${type === "danger" ? "bg-rose-500/15 text-rose-400 border border-rose-500/25" : "bg-primary/15 text-primary border border-primary/25"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-2xl" }, type === "danger" ? "warning" : "info")), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-cream-light tracking-tight" }, title), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-cream-light/60 leading-relaxed font-medium" }, message)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2.5 pt-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onCancel,
      className: "w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
    },
    cancelText
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onConfirm,
      className: `w-full py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all ${type === "danger" ? "bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-500/20" : "bg-primary hover:bg-primary-dark shadow-md shadow-primary/20"} text-white`
    },
    confirmText
  ))));
};
const getThemeClasses = (themeId) => {
  const maps = {
    "amber": { bg: "bg-amber-50", border: "border-amber-200/60", icon: "text-amber-600/60", text: "text-amber-950", sub: "text-amber-900/60", label: "text-amber-800", labelBg: "bg-amber-200/50", chipBg: "bg-amber-100", chipBorder: "border-amber-300/40" },
    "orange": { bg: "bg-orange-50", border: "border-orange-200/60", icon: "text-orange-600/60", text: "text-orange-950", sub: "text-orange-900/60", label: "text-orange-800", labelBg: "bg-orange-200/50", chipBg: "bg-orange-100", chipBorder: "border-orange-300/40" },
    "peach": { bg: "bg-orange-50", border: "border-orange-200/60", icon: "text-orange-500/60", text: "text-orange-950", sub: "text-orange-900/60", label: "text-orange-800", labelBg: "bg-orange-100/60", chipBg: "bg-orange-100", chipBorder: "border-orange-200/50" },
    "yellow": { bg: "bg-yellow-50", border: "border-yellow-200/60", icon: "text-yellow-700/60", text: "text-yellow-950", sub: "text-yellow-900/60", label: "text-yellow-800", labelBg: "bg-yellow-200/50", chipBg: "bg-yellow-100", chipBorder: "border-yellow-300/40" },
    "glass": { bg: "bg-white/5", border: "border-white/10", icon: "text-primary/60", text: "text-cream-light", sub: "text-cream-light/50", label: "text-cream-light/80", labelBg: "bg-white/10", chipBg: "bg-white/10", chipBorder: "border-white/15" },
    "sage": { bg: "bg-emerald-50", border: "border-emerald-200/60", icon: "text-emerald-600/60", text: "text-emerald-950", sub: "text-emerald-900/60", label: "text-emerald-800", labelBg: "bg-emerald-200/50", chipBg: "bg-emerald-100", chipBorder: "border-emerald-300/40" },
    "sky": { bg: "bg-sky-50", border: "border-sky-200/60", icon: "text-sky-600/60", text: "text-sky-950", sub: "text-sky-900/60", label: "text-sky-800", labelBg: "bg-sky-200/50", chipBg: "bg-sky-100", chipBorder: "border-sky-300/40" },
    "lavender": { bg: "bg-indigo-50", border: "border-indigo-200/60", icon: "text-indigo-600/60", text: "text-indigo-950", sub: "text-indigo-900/60", label: "text-indigo-800", labelBg: "bg-indigo-200/50", chipBg: "bg-indigo-100", chipBorder: "border-indigo-300/40" },
    "rose": { bg: "bg-rose-50", border: "border-rose-200/60", icon: "text-rose-600/60", text: "text-rose-950", sub: "text-rose-900/60", label: "text-rose-800", labelBg: "bg-rose-200/50", chipBg: "bg-rose-100", chipBorder: "border-rose-300/40" },
    "slate": { bg: "bg-slate-100", border: "border-slate-300/60", icon: "text-slate-600/60", text: "text-slate-950", sub: "text-slate-700/60", label: "text-slate-700", labelBg: "bg-slate-200/50", chipBg: "bg-slate-200", chipBorder: "border-slate-300/40" },
    "teal": { bg: "bg-teal-50", border: "border-teal-200/60", icon: "text-teal-600/60", text: "text-teal-950", sub: "text-teal-900/60", label: "text-teal-800", labelBg: "bg-teal-200/50", chipBg: "bg-teal-100", chipBorder: "border-teal-300/40" },
    "indigo": { bg: "bg-violet-50", border: "border-violet-200/60", icon: "text-violet-600/60", text: "text-violet-950", sub: "text-violet-900/60", label: "text-violet-800", labelBg: "bg-violet-200/50", chipBg: "bg-violet-100", chipBorder: "border-violet-300/40" },
    "warm1": { bg: "bg-[#e9d9c4]", border: "border-[#c4a882]/60", icon: "text-[#8b6914]/60", text: "text-[#4a3520]", sub: "text-[#6b5240]/70", label: "text-[#7a5c3a]", labelBg: "bg-[#d4c0a4]/50", chipBg: "bg-[#dccdb5]", chipBorder: "border-[#c4a882]/40" },
    "warm2": { bg: "bg-[#e9e5d8]", border: "border-[#c8c3b2]/60", icon: "text-[#7a7260]/60", text: "text-[#3d3a2e]", sub: "text-[#6b6758]/70", label: "text-[#6b6250]", labelBg: "bg-[#d5d0c2]/50", chipBg: "bg-[#ddd8cb]", chipBorder: "border-[#c8c3b2]/40" },
    "warm3": { bg: "bg-[#e9e2da]", border: "border-[#c8bdb2]/60", icon: "text-[#8b7060]/60", text: "text-[#3d352e]", sub: "text-[#6b5f55]/70", label: "text-[#7a6555]", labelBg: "bg-[#d5ccc2]/50", chipBg: "bg-[#ddd6cd]", chipBorder: "border-[#c8bdb2]/40" },
    "warm4": { bg: "bg-[#e8c59d]", border: "border-[#c4a06a]/60", icon: "text-[#8b6914]/60", text: "text-[#4a3520]", sub: "text-[#6b5030]/70", label: "text-[#7a5520]", labelBg: "bg-[#d4ae80]/50", chipBg: "bg-[#ddb888]", chipBorder: "border-[#c4a06a]/40" },
    "warm5": { bg: "bg-[#e9e6d5]", border: "border-[#c8c4aa]/60", icon: "text-[#7a7250]/60", text: "text-[#3d3a2a]", sub: "text-[#6b6548]/70", label: "text-[#6b6040]", labelBg: "bg-[#d5d1bb]/50", chipBg: "bg-[#dddac5]", chipBorder: "border-[#c8c4aa]/40" }
  };
  return maps[themeId] || maps["peach"];
};
const formatReminderDate = (dateStr) => {
  try {
    const d = parseDateString(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${month} ${day} \u2022 ${time}`;
  } catch (e) {
    return dateStr;
  }
};
const formatDateMinimal = (dateStr) => {
  try {
    const d = parseDateString(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
  } catch (e) {
    return dateStr;
  }
};
const stripHtml = (html) => {
  if (!html) return "";
  const tmp = document.createElement("div");
  const clean = html.replace(/<hr[^>]*>/gi, " ");
  const formatted = clean.replace(/<\/div>| <\/p>|<\/h1>|<\/h2>|<\/h3>|<\/li>|<\/br>|<br\/?>/gi, " ");
  tmp.innerHTML = formatted;
  return (tmp.textContent || tmp.innerText || "").trim().replace(/\s+/g, " ");
};
const formatTitle = (text) => {
  if (!text) return "";
  const t = text.trim();
  if (t.length === 0) return "";
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) {
    return t;
  }
  return t.split(" ").map(
    (word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""
  ).join(" ");
};
const formatTaskText = (text) => {
  if (!text) return "";
  const t = String(text).trim();
  if (t.length === 0) return "";
  return t.replace(/\b[a-zA-Z]/g, (match) => match.toUpperCase());
};
const hashPIN = async (pin) => {
  const utf8 = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((bytes) => bytes.toString(16).padStart(2, "0")).join("");
};
const SkeletonNoteCard = ({ variant = "full", index = 0 }) => {
  const isPriority = variant === "priority";
  const isCompact = variant === "compact";
  return (
    // (2026-08-24) Use aspect-square for compact cards. Prev: h-[140px] broke 2-col square
    /* @__PURE__ */ React.createElement("div", { className: `skeleton-priority-card rounded-[1.75rem] md:rounded-[2rem] border-b-4 border-orange-500/25 relative overflow-hidden flex flex-col justify-between ${isPriority || isCompact ? "aspect-square p-4 md:p-5" : "h-[220px] p-6"}` }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-xl shimmer mb-auto shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5 mt-auto w-full" }, /* @__PURE__ */ React.createElement("div", { className: "h-2.5 shimmer rounded w-1/3" }), /* @__PURE__ */ React.createElement("div", { className: "h-5 shimmer rounded-lg w-4/5" })))
  );
};
const SkeletonQuickTask = () => /* @__PURE__ */ React.createElement("div", { className: "skeleton-quick-task flex items-center gap-4 p-4 rounded-2xl border border-orange-500/20 bg-orange-950/15 relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "w-6 h-6 rounded-lg shimmer shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "h-4 shimmer rounded w-2/3" }), /* @__PURE__ */ React.createElement("div", { className: "h-2.5 shimmer rounded w-1/4" })));
const PriorityNoteSkeleton = ({ index = 0 }) => {
  return /* @__PURE__ */ React.createElement("div", { className: "skeleton-priority-card aspect-square rounded-[1.75rem] md:rounded-[2rem] p-4 md:p-5 flex flex-col justify-between overflow-hidden shadow-lg border-b-4 border-orange-500/25" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-xl shimmer mb-auto shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "mt-auto space-y-1.5 w-full" }, /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-extrabold uppercase tracking-[0.2em] font-montserrat text-orange-400/60" }, "PINNED"), /* @__PURE__ */ React.createElement("div", { className: "w-4/5 h-5 rounded-lg shimmer" })));
};
const NoteCard = React.memo(({ note, onClick, index, variant = "full", onRemoveReminder, isSelected = false }) => {
  const theme = getThemeClasses(note.noteTheme);
  const isLocked = !!note.isLocked;
  const preview = isLocked ? "" : stripHtml(note.content);
  if (variant === "priority") {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick,
        className: `card-glow sticky-note-${index % 5 + 1} rounded-[1.5rem] md:rounded-[1.75rem] p-3.5 md:p-4 aspect-square flex flex-col justify-between border-b-4 group cursor-pointer relative overflow-hidden font-montserrat ${theme.bg} ${theme.border}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-start items-start" }, /* @__PURE__ */ React.createElement("span", { className: `material-symbols-outlined text-xl md:text-2xl ${theme.icon}`, style: note.isPinned ? { fontVariationSettings: "'FILL' 1" } : {} }, note.noteIcon || "push_pin")),
      /* @__PURE__ */ React.createElement("div", { className: "mt-auto w-full flex flex-col gap-0.5 text-left min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: `homepage-note-card-badge text-[10px] sm:text-[11px] md:text-[10px] font-extrabold uppercase tracking-[0.2em] font-montserrat ${theme.label}` }, note.isPinned ? "PINNED" : "PRIORITY"), /* @__PURE__ */ React.createElement("h3", { className: `homepage-note-card-title text-xl sm:text-xl md:text-lg lg:text-base xl:text-lg font-bold tracking-tight font-display line-clamp-2 leading-snug w-full ${theme.text}` }, formatTitle(note.title) || "Untitled"))
    );
  }
  const isCompact = variant === "compact";
  const displayLabels = React.useMemo(() => {
    if (!note.labels || !note.labels.length) return [];
    const sorted = [...note.labels].sort((a, b) => {
      const aPri = a.toLowerCase() === "priority" || a.toLowerCase() === "pinned" ? -1 : 1;
      const bPri = b.toLowerCase() === "priority" || b.toLowerCase() === "pinned" ? -1 : 1;
      return aPri - bPri;
    });
    return sorted.slice(0, 2);
  }, [note.labels]);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick,
      className: `card-glow sticky-note-${index % 5 + 1} ${isCompact ? "rounded-[1.75rem] md:rounded-[2rem] p-3.5 md:p-5 min-h-[130px] md:min-h-[140px]" : "rounded-[1.75rem] md:rounded-[2.2rem] p-3.5 md:p-6 min-h-[170px] md:min-h-[220px] h-auto"} flex flex-col justify-between border-b-4 group cursor-pointer relative overflow-hidden font-montserrat ${theme.bg} ${theme.border} ${isSelected ? "scale-[0.97]" : ""}`,
      style: isSelected ? { boxShadow: "0 0 0 3px #f97316, 0 0 20px rgba(249, 115, 22, 0.3)", transition: "all 0.3s ease" } : {}
    },
    /* @__PURE__ */ React.createElement("div", { className: "absolute top-3.5 md:top-4 right-3.5 md:right-4 text-right" }, /* @__PURE__ */ React.createElement("span", { className: `material-symbols-outlined text-lg md:text-xl ${theme.icon} transition-opacity`, style: note.isPinned ? { fontVariationSettings: "'FILL' 1" } : {} }, note.noteIcon || "push_pin")),
    /* @__PURE__ */ React.createElement("div", { className: "pr-6 md:pr-8 mb-2" }, /* @__PURE__ */ React.createElement("h3", { className: `${isCompact ? "text-sm md:text-lg line-clamp-2" : "text-sm md:text-xl line-clamp-2"} font-bold tracking-tight font-display leading-snug md:leading-tight mb-1 md:mb-1.5 ${theme.text}` }, formatTitle(note.title) || "Untitled"), isLocked ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 md:gap-2 mt-1 md:mt-2 text-slate-400/50" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs md:text-sm" }, "lock"), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] md:text-[10px] font-bold uppercase tracking-widest" }, "Protected Note")) : preview && /* @__PURE__ */ React.createElement("p", { className: `${isCompact ? "text-[10.5px] md:text-xs line-clamp-3 mt-1" : "text-[11px] md:text-sm line-clamp-4 mt-1 md:mt-2"} leading-relaxed font-sans ${theme.sub}` }, preview)),
    /* @__PURE__ */ React.createElement("div", { className: "mt-auto pt-0 flex flex-col gap-1" }, note.reminderDate && /* @__PURE__ */ React.createElement("div", { className: `inline-flex items-center gap-1 text-[8px] md:text-[9.5px] font-bold font-montserrat ${theme.chipBg} ${theme.label} px-1.5 md:px-2 py-0.5 rounded-md w-max border ${theme.chipBorder} relative group/rem leading-none` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[10px] md:text-xs" }, "notifications_active"), /* @__PURE__ */ React.createElement("span", null, formatReminderDate(note.reminderDate)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onRemoveReminder && onRemoveReminder(note.id);
        },
        className: "ml-0.5 hover:text-primary transition-colors opacity-0 group-hover/rem:opacity-100"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[9px]" }, "close")
    )), displayLabels.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, displayLabels.map((l) => /* @__PURE__ */ React.createElement("span", { key: l, className: `text-[8px] md:text-[9.5px] font-bold uppercase tracking-wider font-montserrat ${theme.labelBg} ${theme.label} px-1.5 md:px-2 py-0.5 rounded-md truncate max-w-full leading-none` }, l)))),
    isSelected && /* @__PURE__ */ React.createElement("div", { className: "absolute top-2.5 left-2.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg z-10 animate-in zoom-in-50 duration-200 border-2 border-white" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base font-bold" }, "check"))
  );
});
const getTaskPrioTarget = (targetTask) => {
  const todayStr = formatDateLocal(/* @__PURE__ */ new Date());
  let allToday = [];
  try {
    const cachedUser = JSON.parse(localStorage.getItem("faiora_cached_user") || "null");
    const uid = (cachedUser == null ? void 0 : cachedUser.uid) || localStorage.getItem("faiora_last_uid") || "";
    const saved = localStorage.getItem(uid ? "faiora_quick_tasks_" + uid : "faiora_quick_tasks");
    const list = saved ? JSON.parse(saved) : [];
    allToday = list.filter((t) => t && t.dueDate === todayStr && t.dueTime && t.id !== targetTask.id && !t.completed);
  } catch (e) {
  }
  if (allToday.length > 0) {
    allToday.sort((a, b) => a.dueTime.localeCompare(b.dueTime));
    const [h, m] = allToday[0].dueTime.split(":").map(Number);
    let totalMins = Math.max(0, Math.round((h * 60 + m - 10) / 10) * 10);
    return { date: todayStr, time: `${String(Math.floor(totalMins / 60)).padStart(2, "0")}:${String(totalMins % 60).padStart(2, "0")}` };
  }
  const now = /* @__PURE__ */ new Date();
  const nowMins = Math.max(0, Math.round((now.getHours() * 60 + now.getMinutes() - 10) / 10) * 10);
  return { date: todayStr, time: `${String(Math.floor(nowMins / 60)).padStart(2, "0")}:${String(nowMins % 60).padStart(2, "0")}` };
};
const QuickTaskItem = React.memo(({ task, onToggle, onDelete, onEdit, onUpdateQuickTask, showToast: showToast2, hideDateSubtitle = false, isSelectionMode = false, isSelected = false, onSelectToggle = null, viewMode = "standard" }) => {
  const { label: dueDateStr, isOverdue, isNearDeadline, isDueTomorrow, isDueToday } = formatDueDate(task.dueDate, task.dueTime);
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwipingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isPointerDownRef = useRef(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isOptimisticCompleted, setIsOptimisticCompleted] = useState(task.completed);
  useEffect(() => {
    setIsOptimisticCompleted(task.completed);
  }, [task.completed]);
  const isCompletedState = isOptimisticCompleted;
  const handlePointerDown = (e) => {
    if (isSelectionMode) return;
    if (e.button && e.button !== 0) return;
    isPointerDownRef.current = true;
    isLongPressRef.current = false;
    isSwipingRef.current = false;
    setIsPressed(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isSwipingRef.current && Math.abs(swipeOffset) < 10) {
        isLongPressRef.current = true;
        setIsLongPressing(true);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {
          }
        }
        if (onEdit) onEdit(task);
        setTimeout(() => setIsLongPressing(false), 350);
      }
    }, 450);
  };
  const handlePointerMove = (e) => {
    if (isSelectionMode || !isPointerDownRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (Math.abs(dx) > 8 || dy > 8) {
      setIsPressed(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    if (dy > Math.abs(dx) && !isSwipingRef.current) {
      return;
    }
    if (dx > 8 && onUpdateQuickTask) {
      isSwipingRef.current = true;
      setSwipeOffset(Math.min(dx, 140));
    } else if (dx < -8 && onDelete) {
      isSwipingRef.current = true;
      setSwipeOffset(Math.max(dx, -130));
    }
  };
  const handlePointerUp = () => {
    if (isSelectionMode) return;
    isPointerDownRef.current = false;
    setIsPressed(false);
    setIsLongPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isSwipingRef.current) {
      const raw = (task.text || "Task").trim();
      const displayName = raw.length > 8 ? raw.slice(0, 4) + "\u2026" + raw.slice(-3) : raw;
      if (swipeOffset >= 75 && onUpdateQuickTask) {
        const now = /* @__PURE__ */ new Date();
        const todayStr = formatDateLocal(now);
        window._faioraLastSwipe = window._faioraLastSwipe || /* @__PURE__ */ new Map();
        const lastSwipe = window._faioraLastSwipe.get(task.id);
        const nowMs = Date.now();
        const isWithin3s = lastSwipe && lastSwipe.action === "later" && nowMs - lastSwipe.timestamp <= 3e3;
        let targetDate = getTomorrow();
        let targetTime = "10:00";
        let toastLabel = `Moved "${displayName}" to Tomorrow`;
        const isPastDueTask = Boolean(isOverdue || task.dueDate && task.dueDate < todayStr);
        if (isPastDueTask) {
          let baseTimeMs = now.getTime();
          const laterDate = new Date(baseTimeMs + 2 * 60 * 60 * 1e3);
          laterDate.setMinutes(Math.round(laterDate.getMinutes() / 10) * 10, 0, 0);
          targetDate = todayStr;
          targetTime = "23:59";
          if (formatDateLocal(laterDate) === todayStr) {
            const h = String(laterDate.getHours()).padStart(2, "0");
            const m = String(laterDate.getMinutes()).padStart(2, "0");
            targetTime = `${h}:${m}`;
          }
          toastLabel = `Moved "${displayName}" to Today (${formatTime(targetTime)})`;
          window._faioraLastSwipe.set(task.id, { timestamp: nowMs, action: "today" });
        } else if (isWithin3s) {
          const prioTarget = getTaskPrioTarget(task);
          targetDate = prioTarget.date;
          targetTime = prioTarget.time;
          toastLabel = `Prioritized "${displayName}" (${formatTime(targetTime)})`;
          window._faioraLastSwipe.set(task.id, { timestamp: nowMs, action: "prio" });
        } else if (task.dueDate === getTomorrow()) {
          targetDate = getDayAfterTomorrow();
          targetTime = "10:00";
          toastLabel = `Moved "${displayName}" to Tomorrow`;
          window._faioraLastSwipe.delete(task.id);
        } else {
          const hour = now.getHours();
          const minute = now.getMinutes();
          const isNight1h = hour >= 20 && hour < 22 || hour === 0 && minute <= 30;
          const isToTomorrow = hour >= 22 || hour === 0 && minute > 30 || hour > 0 && hour < 6;
          if (isToTomorrow) {
            targetDate = getTomorrow();
            targetTime = "10:00";
            toastLabel = `Moved "${displayName}" to Tomorrow`;
            window._faioraLastSwipe.delete(task.id);
          } else {
            let baseTimeMs = now.getTime();
            if (task.dueDate === todayStr && task.dueTime) {
              const [th, tm] = task.dueTime.split(":").map(Number);
              const tDate = new Date(now);
              tDate.setHours(th, tm, 0, 0);
              if (tDate.getTime() > baseTimeMs) baseTimeMs = tDate.getTime();
            }
            const laterDate = new Date(baseTimeMs + (isNight1h ? 1 : 4) * 60 * 60 * 1e3);
            laterDate.setMinutes(Math.round(laterDate.getMinutes() / 10) * 10, 0, 0);
            if (formatDateLocal(laterDate) === todayStr && laterDate.getHours() < 22) {
              const h = String(laterDate.getHours()).padStart(2, "0");
              const m = String(laterDate.getMinutes()).padStart(2, "0");
              targetDate = formatDateLocal(laterDate);
              targetTime = `${h}:${m}`;
              toastLabel = `Moved "${displayName}" to Later (${formatTime(targetTime)})`;
              window._faioraLastSwipe.set(task.id, { timestamp: nowMs, action: "later" });
            } else {
              targetDate = getTomorrow();
              targetTime = "10:00";
              toastLabel = `Moved "${displayName}" to Tomorrow`;
              window._faioraLastSwipe.delete(task.id);
            }
          }
        }
        const prevDueDate = task.dueDate;
        const prevDueTime = task.dueTime;
        onUpdateQuickTask(task.id, task.text, targetDate, targetTime, task.categories, task.progress);
        if (navigator.vibrate) try {
          navigator.vibrate([40, 60, 40]);
        } catch {
        }
        if (showToast2) {
          showToast2(toastLabel, {
            label: "UNDO",
            onClick: () => onUpdateQuickTask(task.id, task.text, prevDueDate, prevDueTime, task.categories, task.progress)
          });
        }
      } else if (swipeOffset <= -75 && onDelete) {
        if (navigator.vibrate) try {
          navigator.vibrate([40, 80]);
        } catch {
        }
        onDelete(task.id);
      }
      setSwipeOffset(0);
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 150);
    }
  };
  const handleClick = (e) => {
    console.log("[QUICKTASK] handleClick called", { isSelectionMode, viewMode, isCompletedState, nextState: !isCompletedState });
    if (isSelectionMode) {
      if (onSelectToggle) onSelectToggle(task.id);
      return;
    }
    if (isLongPressRef.current || isSwipingRef.current || Math.abs(swipeOffset) > 10) {
      isLongPressRef.current = false;
      console.log("[QUICKTASK] Click blocked by guard condition");
      return;
    }
    const nextState = !isCompletedState;
    setIsOptimisticCompleted(nextState);
    if (nextState) {
      try {
        if (typeof FaioraNotifications !== "undefined" && (FaioraNotifications == null ? void 0 : FaioraNotifications.playCheckSFX)) {
          FaioraNotifications.playCheckSFX();
        }
      } catch (err) {
      }
      if (viewMode === "notepad" || viewMode === "categories") {
        onToggle(task.id);
      } else {
        const taskElement = e.currentTarget;
        const outerContainer = taskElement.closest(".quick-task-card");
        if (outerContainer) {
          outerContainer.classList.add("task-completing");
        }
        setTimeout(() => {
          if (outerContainer) {
            outerContainer.classList.remove("task-completing");
          }
          onToggle(task.id);
        }, 300);
      }
    } else {
      onToggle(task.id);
    }
  };
  const swipeRescheduleInfo = swipeOffset > 0 ? (() => {
    var _a;
    const now = /* @__PURE__ */ new Date();
    const todayStr = formatDateLocal(now);
    if (isOverdue || task.dueDate && task.dueDate < todayStr) {
      return { label: "TODAY", icon: "today" };
    }
    const lastSwipe = (_a = window._faioraLastSwipe) == null ? void 0 : _a.get(task.id);
    if (lastSwipe && lastSwipe.action === "later" && Date.now() - lastSwipe.timestamp <= 3e3) {
      return { label: "PRIO", icon: "priority_high" };
    }
    if (task.dueDate === getTomorrow()) {
      return { label: "TOMORROW", icon: "event_upcoming" };
    }
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour >= 22 || hour === 0 && minute > 30 || hour > 0 && hour < 6) {
      return { label: "TOMORROW", icon: "event_upcoming" };
    }
    const isNight1h = hour >= 20 && hour < 22 || hour === 0 && minute <= 30;
    let baseTimeMs = now.getTime();
    if (task.dueDate === todayStr && task.dueTime) {
      const [th, tm] = task.dueTime.split(":").map(Number);
      const tDate = new Date(now);
      tDate.setHours(th, tm, 0, 0);
      if (tDate.getTime() > baseTimeMs) baseTimeMs = tDate.getTime();
    }
    const laterDate = new Date(baseTimeMs + (isNight1h ? 1 : 4) * 60 * 60 * 1e3);
    laterDate.setMinutes(Math.round(laterDate.getMinutes() / 10) * 10, 0, 0);
    if (formatDateLocal(laterDate) === todayStr && laterDate.getHours() < 22) {
      return { label: "LATER", icon: "schedule" };
    }
    return { label: "TOMORROW", icon: "event_upcoming" };
  })() : null;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "quick-task-card relative rounded-2xl select-none",
      style: {
        minHeight: hideDateSubtitle && !task.dueTime ? "38px" : window.innerWidth < 768 ? "46px" : "auto",
        maxHeight: "300px",
        opacity: 1,
        transform: "scale(1) translateY(0)",
        transition: "opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease"
      }
    },
    swipeOffset > 0 && swipeRescheduleInfo && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "absolute inset-y-0 left-0 flex items-center pl-3.5 gap-1.5 z-0 pointer-events-none",
        style: { opacity: Math.min(swipeOffset / 20, 1), width: `${Math.max(0, swipeOffset)}px`, overflow: "hidden" }
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg text-primary drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" }, swipeRescheduleInfo.icon),
      /* @__PURE__ */ React.createElement("span", { className: `text-[11px] md:text-xs font-black font-montserrat uppercase tracking-wider ${swipeOffset >= 75 ? "text-amber-300 drop-shadow-[0_0_12px_rgba(249,115,22,1)]" : "text-primary drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]"}` }, swipeRescheduleInfo.label)
    ),
    swipeOffset < 0 && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "absolute inset-y-0 right-0 flex items-center justify-end pr-3.5 gap-1.5 z-0 pointer-events-none",
        style: { opacity: Math.min(Math.abs(swipeOffset) / 20, 1), width: `${Math.max(0, -swipeOffset)}px`, overflow: "hidden" }
      },
      /* @__PURE__ */ React.createElement("span", { className: `text-[11px] md:text-xs font-black font-montserrat uppercase tracking-wider ${swipeOffset <= -75 ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,1)]" : "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"}` }, "DELETE"),
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" }, "delete")
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `glass-panel rounded-2xl ${hideDateSubtitle ? "py-1.5 px-3 md:py-2 md:px-3.5" : "py-2 px-3 md:py-2.5 md:px-4"} flex items-center justify-between group hover:bg-white/[0.07] hover:border-primary/30 active:bg-white/[0.08] active:border-primary/40 transition-all duration-200 cursor-pointer border shadow-lg hover:shadow-primary/5 select-none relative z-10 ${isSelectionMode && isSelected ? "!border-primary !bg-primary/15 shadow-md shadow-primary/20 scale-[0.99]" : ""} ${(isCompletedState || isCompleting) && !isSelectionMode ? "opacity-40 grayscale-[0.5]" : ""} ${isLongPressing ? "border-primary/80 shadow-[0_0_0_2px_rgba(249,115,22,0.4)] bg-primary/10 scale-[0.98]" : isPressed && !isSelectionMode ? "border-primary/50 bg-white/[0.08] shadow-md shadow-primary/15 scale-[0.99]" : isOverdue && !(isCompletedState || isCompleting) && !isSelectionMode ? "border-red-500/30" : isNearDeadline && !(isCompletedState || isCompleting) && !isSelectionMode ? "border-primary/60" : isDueToday && !(isCompletedState || isCompleting) && !isSelectionMode ? "border-primary/40" : "border-white/5"} ${isDueToday && !isNearDeadline && !(isCompletedState || isCompleting) && !isSelectionMode ? "today-task-glow" : ""} ${isNearDeadline && !(isCompletedState || isCompleting) && !isSelectionMode ? "near-deadline-glow" : ""} ${isDueTomorrow && !(isCompletedState || isCompleting) && !isSelectionMode ? "tomorrow-glow" : ""}`,
        style: {
          minHeight: hideDateSubtitle && !task.dueTime ? "38px" : window.innerWidth < 768 ? "46px" : "auto",
          touchAction: "pan-y",
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipingRef.current ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        },
        onClick: handleClick,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onContextMenu: (e) => {
          e.preventDefault();
          if (!isSelectionMode && onEdit) onEdit(task);
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5 md:gap-3 pointer-events-none flex-1 min-w-0 pr-2" }, /* @__PURE__ */ React.createElement("div", { className: `w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isSelectionMode ? isSelected ? "bg-primary border-primary text-white scale-105 shadow-sm shadow-primary/30" : "border-white/40 text-transparent group-hover:border-white/70" : isCompletedState || isCompleting ? "bg-primary border-primary text-white scale-105" : "border-white/30 text-transparent group-hover:border-white/60"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "check")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col justify-center flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("h4", { className: `${hideDateSubtitle ? "text-[10.5px] md:text-[11.5px]" : "text-xs md:text-[13px]"} text-cream-light font-montserrat font-semibold tracking-wide leading-snug transition-all duration-300 line-clamp-2 overflow-hidden ${isCompletedState || isCompleting ? "line-through decoration-primary/50 opacity-60" : isPressed || isLongPressing ? "text-primary" : "group-hover:text-primary"} ${isOverdue && !(isCompletedState || isCompleting) ? "text-red-400" : ""}` }, formatTaskText(task.text)), hideDateSubtitle ? task.dueTime && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mt-0.5" }, /* @__PURE__ */ React.createElement("p", { className: `text-[8.5px] md:text-[9.5px] font-montserrat font-bold uppercase tracking-[0.15em] flex items-center gap-1 transition-opacity ${isOverdue && !(isCompletedState || isCompleting) ? "text-red-500" : "text-primary/80 opacity-60 group-hover:opacity-100"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[9px] md:text-[10px]" }, "schedule"), formatTime(task.dueTime))) : dueDateStr && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mt-0.5" }, /* @__PURE__ */ React.createElement("p", { className: `text-[8.5px] md:text-[9.5px] font-montserrat font-bold uppercase tracking-[0.15em] flex items-center gap-1 transition-opacity ${isOverdue && !(isCompletedState || isCompleting) ? "text-red-500" : "text-primary/80 opacity-60 group-hover:opacity-100"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[9px] md:text-[10px]" }, "event"), dueDateStr)))),
      task.progress > 0 && !(isCompletedState || isCompleting) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-0.5 shrink-0 px-2 pointer-events-none" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-montserrat font-bold text-white/50" }, task.progress, "%"), /* @__PURE__ */ React.createElement("div", { className: "w-12 md:w-14 h-1 bg-white/10 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
          style: { width: `${task.progress}%` }
        }
      ))),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            onDelete(task.id);
          },
          className: "opacity-60 md:opacity-0 group-hover:opacity-100 p-1.5 md:p-2 -mr-1 text-white/40 hover:text-red-400 transition-all duration-200 pointer-events-auto transform hover:scale-110 flex-shrink-0 self-center",
          style: { opacity: Math.abs(swipeOffset) > 10 ? 0 : void 0 },
          title: "Delete Task"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg md:text-xl" }, "delete")
      )
    )
  );
});
const QuickTaskNotepadItem = React.memo(({
  task,
  secKey,
  onToggle,
  onDelete,
  onEditQuickTask,
  onUpdateQuickTask,
  showToast: showToast2,
  isSelectionMode,
  isSelected,
  onSelectToggle,
  isDuplicate,
  handleItemTouchStart,
  handleItemTouchEnd,
  handleItemTouchMove,
  longPressingId,
  groupBy
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwipingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isPointerDownRef = useRef(false);
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const taskProgress = task.progress !== void 0 ? task.progress : task.completed ? 100 : 0;
  const isInProgress = taskProgress > 0 && taskProgress < 100;
  const { isOverdue } = formatDueDate(task.dueDate, task.dueTime);
  const isPastDue = !task.completed && (isOverdue || Boolean(secKey && (secKey.startsWith("pastDue") || secKey === "yesterday")));
  const handlePointerDown = (e) => {
    if (isSelectionMode) return;
    if (e.button && e.button !== 0) return;
    isPointerDownRef.current = true;
    isLongPressRef.current = false;
    isSwipingRef.current = false;
    setIsPressed(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isSwipingRef.current && Math.abs(swipeOffset) < 10) {
        isLongPressRef.current = true;
        setIsLongPressing(true);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {
          }
        }
        if (onEditQuickTask) onEditQuickTask(task);
        setTimeout(() => setIsLongPressing(false), 350);
      }
    }, 450);
  };
  const handlePointerMove = (e) => {
    if (isSelectionMode || !isPointerDownRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (Math.abs(dx) > 8 || dy > 8) {
      setIsPressed(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    if (dy > Math.abs(dx) && !isSwipingRef.current) {
      return;
    }
    if (dx > 8 && onUpdateQuickTask) {
      isSwipingRef.current = true;
      setSwipeOffset(Math.min(dx, 140));
    } else if (dx < -8 && onDelete) {
      isSwipingRef.current = true;
      setSwipeOffset(Math.max(dx, -130));
    }
  };
  const handlePointerUp = () => {
    if (isSelectionMode) return;
    isPointerDownRef.current = false;
    setIsPressed(false);
    setIsLongPressing(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isSwipingRef.current) {
      const raw = (task.text || "Task").trim();
      const displayName = raw.length > 8 ? raw.slice(0, 4) + "\u2026" + raw.slice(-3) : raw;
      if (swipeOffset >= 75 && onUpdateQuickTask) {
        const now = /* @__PURE__ */ new Date();
        const todayStr = formatDateLocal(now);
        window._faioraLastSwipe = window._faioraLastSwipe || /* @__PURE__ */ new Map();
        const nowMs = Date.now();
        let baseTimeMs = now.getTime();
        if (task.dueDate === todayStr && task.dueTime) {
          const [th, tm] = task.dueTime.split(":").map(Number);
          const tDate = new Date(now);
          tDate.setHours(th, tm, 0, 0);
          if (tDate.getTime() > baseTimeMs) baseTimeMs = tDate.getTime();
        }
        const laterDate = new Date(baseTimeMs + 2 * 60 * 60 * 1e3);
        laterDate.setMinutes(Math.round(laterDate.getMinutes() / 10) * 10, 0, 0);
        const targetDate = todayStr;
        let targetTime = "23:59";
        if (formatDateLocal(laterDate) === todayStr) {
          const h = String(laterDate.getHours()).padStart(2, "0");
          const m = String(laterDate.getMinutes()).padStart(2, "0");
          targetTime = `${h}:${m}`;
        }
        const toastLabel = `Moved "${displayName}" to Today (${formatTime(targetTime)})`;
        window._faioraLastSwipe.set(task.id, { timestamp: nowMs, action: "today" });
        const prevDueDate = task.dueDate;
        const prevDueTime = task.dueTime;
        onUpdateQuickTask(task.id, task.text, targetDate, targetTime, task.categories, task.progress);
        if (navigator.vibrate) try {
          navigator.vibrate([40, 60, 40]);
        } catch {
        }
        if (showToast2) {
          showToast2(toastLabel, {
            label: "UNDO",
            onClick: () => onUpdateQuickTask(task.id, task.text, prevDueDate, prevDueTime, task.categories, task.progress)
          });
        }
      } else if (swipeOffset <= -75 && onDelete) {
        if (navigator.vibrate) try {
          navigator.vibrate([40, 80]);
        } catch {
        }
        onDelete(task.id);
      }
      setSwipeOffset(0);
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 150);
    }
  };
  const handleClick = (e) => {
    console.log("[NOTEPAD] handleClick called", {
      isSelectionMode,
      isLongPress: isLongPressRef.current,
      isSwiping: isSwipingRef.current,
      swipeOffset,
      swipeOffsetAbs: Math.abs(swipeOffset),
      completed: task.completed,
      taskId: task.id
    });
    if (isSelectionMode) {
      console.log("[NOTEPAD] Selection mode - toggling selection");
      if (onSelectToggle) onSelectToggle(task.id);
      return;
    }
    if (isLongPressRef.current) {
      console.log("[NOTEPAD] Blocked by long press guard");
      isLongPressRef.current = false;
      return;
    }
    if (isSwipingRef.current) {
      console.log("[NOTEPAD] Blocked by swiping guard");
      return;
    }
    if (Math.abs(swipeOffset) > 10) {
      console.log("[NOTEPAD] Blocked by swipe offset guard:", swipeOffset);
      return;
    }
    const isCompleting = !task.completed;
    console.log("[NOTEPAD] isCompleting:", isCompleting, "groupBy:", groupBy);
    if (isCompleting) {
      const taskElement = e.currentTarget;
      const rect = taskElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
    }
    if (isCompleting) {
      try {
        if (typeof FaioraNotifications !== "undefined" && (FaioraNotifications == null ? void 0 : FaioraNotifications.playCheckSFX)) {
          FaioraNotifications.playCheckSFX();
        }
      } catch (err) {
        console.warn("[NOTEPAD] Error playing SFX:", err);
      }
    }
    console.log("[NOTEPAD] Calling onToggle with task.id:", task.id, "onToggle exists:", !!onToggle);
    if (onToggle) {
      onToggle(task.id);
      console.log("[NOTEPAD] onToggle called successfully");
    } else {
      console.error("[NOTEPAD] onToggle is not defined!");
    }
  };
  const swipeRescheduleInfo = swipeOffset > 0 ? { label: "TODAY", icon: "today" } : null;
  return /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden rounded-lg select-none" }, swipeOffset > 0 && swipeRescheduleInfo && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute inset-y-0 left-0 flex items-center pl-2.5 gap-1.5 z-0 pointer-events-none",
      style: { opacity: Math.min(swipeOffset / 20, 1), width: `${Math.max(0, swipeOffset)}px`, overflow: "hidden" }
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base text-primary drop-shadow-[0_0_3px_rgba(249,115,22,0.5)]" }, swipeRescheduleInfo.icon),
    /* @__PURE__ */ React.createElement("span", { className: `text-[10px] font-black font-montserrat uppercase tracking-wider ${swipeOffset >= 75 ? "text-amber-300 drop-shadow-[0_0_4px_rgba(249,115,22,0.6)]" : "text-primary drop-shadow-[0_0_3px_rgba(249,115,22,0.4)]"}` }, swipeRescheduleInfo.label)
  ), swipeOffset < 0 && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute inset-y-0 right-0 flex items-center justify-end pr-2.5 gap-1.5 z-0 pointer-events-none",
      style: { opacity: Math.min(Math.abs(swipeOffset) / 20, 1), width: `${Math.max(0, -swipeOffset)}px`, overflow: "hidden" }
    },
    /* @__PURE__ */ React.createElement("span", { className: `text-[10px] font-black font-montserrat uppercase tracking-wider ${swipeOffset <= -75 ? "text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]" : "text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]"}` }, "DELETE"),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base text-red-500 drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]" }, "delete")
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      "data-task-id": task.id,
      onTouchStart: isSelectionMode ? (e) => handleItemTouchStart(task, e) : void 0,
      onTouchEnd: isSelectionMode ? handleItemTouchEnd : void 0,
      onTouchMove: isSelectionMode ? handleItemTouchMove : void 0,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onClick: handleClick,
      onContextMenu: (e) => {
        e.preventDefault();
        if (!isSelectionMode && onEditQuickTask) onEditQuickTask(task);
      },
      className: `qt-notepad-item relative z-10 flex items-start justify-between gap-2.5 py-0.5 px-1.5 rounded-lg hover:bg-white/[0.05] active:bg-white/[0.08] cursor-pointer select-none group transition-all duration-150 ${isLongPressing || longPressingId === task.id ? "bg-primary/10" : isPressed ? "bg-white/[0.06]" : ""} ${isSelected ? "!bg-primary/15 !border border-primary/40 shadow-sm shadow-primary/20" : ""}`,
      style: {
        // (2026-07-13) Transparent bg on swiping item. Prev: rgba(20, 20, 24, 0.95)
        opacity: task.completed && !isSelectionMode ? 0.4 : 1,
        touchAction: "pan-y",
        transform: `translateX(${swipeOffset}px)`,
        transition: isSwipingRef.current ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease"
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2.5 min-w-0 flex-1 pointer-events-none" }, isSelectionMode ? /* @__PURE__ */ React.createElement("div", { className: `w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-primary border-primary text-white shadow-sm shadow-primary/40 scale-105" : "border-white/35 bg-white/5 hover:border-primary/50"}` }, isSelected && /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "check")) : /* @__PURE__ */ React.createElement("div", { className: `qt-notepad-checkbox w-5 h-5 flex items-center justify-center flex-shrink-0 transition-all group-hover:border-primary/80 ${task.completed ? "checked" : isInProgress ? "in-progress" : ""}` }, task.completed ? /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-white text-xs font-bold" }, "check") : isInProgress ? /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 rounded-sm bg-primary shadow-[0_0_6px_rgba(249,115,22,0.8)]" }) : null), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: `qt-notepad-item-text text-xs md:text-sm font-montserrat leading-5 transition-all duration-150 ${(task.text || "").length <= (taskProgress > 0 && !task.completed ? task.dueTime ? 18 : 22 : task.dueTime ? 30 : 38) ? "clamp-1" : "clamp-2"} ${isLongPressing || longPressingId === task.id ? task.completed ? "text-primary/40 line-through" : "text-primary font-semibold" : isPressed ? "text-primary font-semibold" : task.completed ? "line-through text-white/50 group-hover:text-white/70" : isPastDue ? "text-red-300/80 group-hover:text-red-200" : "text-cream-light group-hover:text-primary"}` }, formatTaskText(task.text), task.dueTime && (secKey === "today" || secKey === "tomorrow" || secKey === "yesterday") && !task.completed && /* @__PURE__ */ React.createElement("span", { className: "ml-1.5 text-[10px] font-bold text-orange-500/50 align-baseline whitespace-nowrap", style: { fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" } }, formatTime(task.dueTime).replace(/\s+([AP]M)/i, "$1"))), isDuplicate && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-bold font-montserrat uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0", title: "Duplicate task" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[10px]" }, "content_copy"), "DUP")))),
    taskProgress > 0 && !task.completed && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 shrink-0 pl-2 pointer-events-none self-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-montserrat font-bold text-primary/90" }, taskProgress, "%"), /* @__PURE__ */ React.createElement("div", { className: "w-12 md:w-14 h-1 bg-white/10 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
        style: { width: `${taskProgress}%` }
      }
    )))
  ));
});
const QuickTasksNotepadView = ({ tasks = [], onToggle, onSaveToNotes, onEditQuickTask, onDelete, onUpdateQuickTask, showToast: showToast2, groupBy = "date", categoriesOrder = [], isSelectionMode = false, selectedTasks = [], onSelectToggle, onToggleSelectionMode }) => {
  const [showCheckedTasks, setShowCheckedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_qt_notepad_show_checked");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [completingIds, setCompletingIds] = useState(/* @__PURE__ */ new Set());
  const [categoryVersion, setCategoryVersion] = useState(0);
  React.useEffect(() => {
    const handleUpdate = () => setCategoryVersion((v) => v + 1);
    window.addEventListener("faiora_qt_categories_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("faiora_qt_categories_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);
  const toggleShowChecked = () => {
    setShowCheckedTasks((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("faiora_qt_notepad_show_checked", String(next));
      } catch {
      }
      return next;
    });
  };
  const dailyData = useMemo(() => groupQuickTasksDaily(tasks, showCheckedTasks), [tasks, showCheckedTasks]);
  const categoryData = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const sortedList = typeof sortQuickTasksList === "function" ? sortQuickTasksList(list) : list;
    const filtered = showCheckedTasks ? sortedList : sortedList.filter((t) => !t.completed);
    const catMap = /* @__PURE__ */ new Map();
    filtered.forEach((task) => {
      const rawCats = Array.isArray(task.categories) && task.categories.length > 0 ? task.categories : task.category ? [task.category] : ["UNCATEGORIZED"];
      rawCats.forEach((c) => {
        const clean = (c || "UNCATEGORIZED").toUpperCase().trim();
        if (!catMap.has(clean)) catMap.set(clean, []);
        catMap.get(clean).push(task);
      });
    });
    let savedCats = [];
    try {
      const saved = localStorage.getItem("faiora_qt_categories");
      if (saved !== null) savedCats = JSON.parse(saved);
    } catch {
    }
    if ((!savedCats || savedCats.length === 0) && Array.isArray(categoriesOrder) && categoriesOrder.length > 0) {
      savedCats = categoriesOrder;
    }
    const orderMap = /* @__PURE__ */ new Map();
    (savedCats || []).forEach((c, idx) => {
      if (c && typeof c === "string") {
        orderMap.set(c.trim().toUpperCase(), idx);
      }
    });
    const sortedCats = Array.from(catMap.keys()).sort((a, b) => {
      if (a === "UNCATEGORIZED") return 1;
      if (b === "UNCATEGORIZED") return -1;
      const indexA = orderMap.has(a) ? orderMap.get(a) : 9999;
      const indexB = orderMap.has(b) ? orderMap.get(b) : 9999;
      if (indexA !== indexB) return indexA - indexB;
      return a.localeCompare(b);
    });
    const sections = sortedCats.map((cat) => ({
      key: `cat_${cat}`,
      label: cat,
      shortLabel: cat,
      items: typeof sortQuickTasksList === "function" ? sortQuickTasksList(catMap.get(cat)) : catMap.get(cat),
      totalCount: catMap.get(cat).length
    }));
    return {
      sections,
      completed: []
    };
  }, [tasks, showCheckedTasks, categoriesOrder, categoryVersion]);
  const duplicateTextCounts = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    const visible = showCheckedTasks ? tasks || [] : (tasks || []).filter((t) => !t.completed);
    visible.forEach((t) => {
      const text = (t.text || "").trim().toLowerCase();
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        map.set(text, (map.get(text) || 0) + 1);
      }
    });
    return map;
  }, [tasks, showCheckedTasks]);
  const viewData = groupBy === "category" ? categoryData : dailyData;
  const [isSaving, setIsSaving] = useState(false);
  const longPressTimer = useRef(null);
  const isLongPressTriggered = useRef(false);
  const [longPressingId, setLongPressingId] = useState(null);
  const [finishedPage, setFinishedPage] = useState(1);
  const FINISHED_PAGE_SIZE = 15;
  const selectedTasksRef = useRef(selectedTasks);
  useEffect(() => {
    selectedTasksRef.current = selectedTasks;
  }, [selectedTasks]);
  const isSelectionModeRef = useRef(isSelectionMode);
  useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);
  const dragSelectRef = useRef({
    timer: null,
    isSelecting: false,
    dragAction: null,
    startX: 0,
    startY: 0,
    touchedIds: /* @__PURE__ */ new Set()
  });
  const cleanupDragSelectListeners = useRef(null);
  const stopDragSelection = useCallback(() => {
    if (dragSelectRef.current.timer) {
      clearTimeout(dragSelectRef.current.timer);
      dragSelectRef.current.timer = null;
    }
    dragSelectRef.current.isSelecting = false;
    dragSelectRef.current.dragAction = null;
    dragSelectRef.current.touchedIds.clear();
    setLongPressingId(null);
    if (cleanupDragSelectListeners.current) {
      cleanupDragSelectListeners.current();
      cleanupDragSelectListeners.current = null;
    }
  }, []);
  useEffect(() => {
    return () => stopDragSelection();
  }, [stopDragSelection]);
  const handleItemTouchStart = (task, e) => {
    isLongPressTriggered.current = false;
    setLongPressingId(task.id);
    const touch = e.touches ? e.touches[0] : e;
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    if (dragSelectRef.current.timer) clearTimeout(dragSelectRef.current.timer);
    dragSelectRef.current.isSelecting = false;
    dragSelectRef.current.startX = clientX;
    dragSelectRef.current.startY = clientY;
    dragSelectRef.current.touchedIds = /* @__PURE__ */ new Set();
    dragSelectRef.current.timer = setTimeout(() => {
      isLongPressTriggered.current = true;
      if (navigator.vibrate) try {
        navigator.vibrate(40);
      } catch (err) {
      }
      if (!isSelectionModeRef.current) {
        if (onEditQuickTask) onEditQuickTask(task);
        setTimeout(() => setLongPressingId(null), 300);
        return;
      }
      dragSelectRef.current.isSelecting = true;
      const isCurrentlySelected = selectedTasksRef.current.includes(task.id);
      const action = isCurrentlySelected ? "unselect" : "select";
      dragSelectRef.current.dragAction = action;
      dragSelectRef.current.touchedIds.add(task.id);
      if (onSelectToggle) onSelectToggle(task.id);
      const handleWindowTouchMove = (moveEvt) => {
        if (!dragSelectRef.current.isSelecting) return;
        if (moveEvt.cancelable) moveEvt.preventDefault();
        const t = moveEvt.touches ? moveEvt.touches[0] : moveEvt;
        const elem = document.elementFromPoint(t.clientX, t.clientY);
        const taskElem = elem == null ? void 0 : elem.closest("[data-task-id]");
        if (taskElem) {
          const targetId = taskElem.getAttribute("data-task-id");
          if (targetId && !dragSelectRef.current.touchedIds.has(targetId)) {
            dragSelectRef.current.touchedIds.add(targetId);
            const isSel = selectedTasksRef.current.includes(targetId);
            const act = dragSelectRef.current.dragAction;
            if (act === "select" && !isSel) {
              if (onSelectToggle) onSelectToggle(targetId);
            } else if (act === "unselect" && isSel) {
              if (onSelectToggle) onSelectToggle(targetId);
            }
          }
        }
      };
      const handleWindowTouchEnd = () => {
        stopDragSelection();
      };
      window.addEventListener("touchmove", handleWindowTouchMove, { passive: false });
      window.addEventListener("touchend", handleWindowTouchEnd);
      window.addEventListener("touchcancel", handleWindowTouchEnd);
      cleanupDragSelectListeners.current = () => {
        window.removeEventListener("touchmove", handleWindowTouchMove);
        window.removeEventListener("touchend", handleWindowTouchEnd);
        window.removeEventListener("touchcancel", handleWindowTouchEnd);
      };
    }, 320);
  };
  const handleItemTouchMove = (e) => {
    if (!dragSelectRef.current.isSelecting) {
      const touch = e.touches ? e.touches[0] : e;
      const dx = Math.abs(touch.clientX - dragSelectRef.current.startX);
      const dy = Math.abs(touch.clientY - dragSelectRef.current.startY);
      if (dx > 8 || dy > 8) {
        if (dragSelectRef.current.timer) {
          clearTimeout(dragSelectRef.current.timer);
          dragSelectRef.current.timer = null;
        }
        setLongPressingId(null);
      }
    }
  };
  const handleItemTouchEnd = () => {
    if (!dragSelectRef.current.isSelecting) {
      stopDragSelection();
    }
  };
  const handleSave = () => {
    setIsSaving(true);
    if (typeof onSaveToNotes === "function") {
      onSaveToNotes(tasks, true);
    }
    setTimeout(() => setIsSaving(false), 1e3);
  };
  const activeCount = viewData.sections.reduce((sum, sec) => sum + sec.items.length, 0);
  return /* @__PURE__ */ React.createElement("div", { className: "qt-notepad-card p-4 md:p-5 space-y-4 animate-in fade-in duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "qt-notepad-header flex items-center justify-between gap-2 pb-3 border-b border-white/10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-lg shrink-0" }, groupBy === "category" ? "category" : "edit_note"), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement(
    "h3",
    {
      onClick: toggleShowChecked,
      className: "qt-notepad-title text-sm sm:text-base md:text-lg font-bold text-cream-light hover:text-primary font-montserrat tracking-wide uppercase cursor-pointer select-none transition-colors flex items-center gap-1.5 truncate",
      title: "Click to toggle showing or hiding checked tasks"
    },
    groupBy === "category" ? "By Category" : "NOTEPAD",
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px] text-primary/70" }, showCheckedTasks ? "visibility" : "visibility_off")
  ), /* @__PURE__ */ React.createElement("p", { className: "qt-notepad-subtitle text-[9px] text-white/40 font-montserrat truncate" }, activeCount, " tasks ready to sync"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 shrink-0" }, onToggleSelectionMode && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: onToggleSelectionMode,
      className: `qt-notepad-select-btn w-8 h-8 rounded-xl transition-all flex items-center justify-center shrink-0 active:scale-95 border ${isSelectionMode ? "bg-primary text-white border-primary shadow-sm shadow-primary/30" : "bg-white/5 hover:bg-white/10 text-white/60 border-white/10"}`,
      title: isSelectionMode ? "Exit Selection Mode" : "Select Multiple Tasks"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, isSelectionMode ? "close" : "checklist")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleSave,
      disabled: isSaving,
      className: `qt-notepad-save-btn w-8 h-8 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm ${isSaving ? "animate-pulse" : ""}`,
      title: isSaving ? "Saved!" : "Save or sync this notepad to your Notes"
    },
    /* @__PURE__ */ React.createElement("span", { className: `material-symbols-outlined text-base ${isSaving ? "animate-spin" : ""}` }, isSaving ? "sync" : "bookmark")
  ))), viewData.sections.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "py-8 text-center text-white/30 text-xs font-montserrat" }, "No active quick tasks on this notepad") : /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, viewData.sections.map((sec) => {
    const isFinishedSec = sec.isFinished || sec.key === "finished";
    const totalFinished = sec.items.length;
    const totalPages = isFinishedSec ? Math.ceil(totalFinished / FINISHED_PAGE_SIZE) || 1 : 1;
    const currentPage = isFinishedSec ? Math.min(Math.max(1, finishedPage), totalPages) : 1;
    const displayItems = isFinishedSec ? sec.items.slice((currentPage - 1) * FINISHED_PAGE_SIZE, currentPage * FINISHED_PAGE_SIZE) : sec.items;
    return /* @__PURE__ */ React.createElement("div", { key: sec.key, className: "qt-notepad-section space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, sec.isPinned && /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-[13px]" }, "push_pin"), /* @__PURE__ */ React.createElement("h4", { className: `qt-notepad-section-title text-[11px] font-bold uppercase tracking-wider font-montserrat ${sec.isPastDue ? "text-red-400" : "text-primary"}` }, sec.shortLabel || sec.label), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/5" }), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-white/30 font-bold font-montserrat" }, "(", sec.items.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "qt-notepad-section-list space-y-1 pl-0.5" }, displayItems.map((task, idx) => {
      const cleanTaskText = (task.text || "").trim().toLowerCase();
      const isDuplicate = cleanTaskText && (duplicateTextCounts.get(cleanTaskText) || 0) > 1;
      const isSelected = isSelectionMode && selectedTasks.includes(task.id);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: task.id,
          className: "animate-in fade-in slide-in-from-top-2 duration-200",
          style: { animationDelay: `${idx * 30}ms`, animationFillMode: "backwards" }
        },
        /* @__PURE__ */ React.createElement(
          QuickTaskNotepadItem,
          {
            task,
            secKey: sec.key,
            onToggle,
            onDelete,
            onEditQuickTask,
            onUpdateQuickTask,
            showToast: showToast2,
            isSelectionMode,
            isSelected,
            onSelectToggle,
            isDuplicate,
            handleItemTouchStart,
            handleItemTouchEnd,
            handleItemTouchMove,
            longPressingId,
            groupBy
          }
        )
      );
    })), isFinishedSec && totalPages > 1 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pt-2.5 px-1 font-montserrat select-none opacity-60 hover:opacity-90 transition-opacity" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] text-white/30 font-medium tracking-widest uppercase" }, "Page ", currentPage, " of ", totalPages), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: currentPage <= 1,
        onClick: (e) => {
          e.stopPropagation();
          setFinishedPage((p) => Math.max(1, p - 1));
        },
        className: `flex items-center justify-center w-6 h-6 rounded-md text-xs transition-all active:scale-90 ${currentPage <= 1 ? "opacity-20 text-white/20 cursor-not-allowed" : "text-white/40 hover:text-cream-light hover:bg-white/[0.05] cursor-pointer"}`,
        title: "Previous Page"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, "chevron_left")
    ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5" }, (() => {
      const items = (() => {
        if (totalPages <= 6) {
          return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 4) {
          return [1, 2, 3, 4, 5, "...", totalPages];
        }
        if (currentPage >= totalPages - 3) {
          return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
      })();
      return items.map((item, idx) => item === "..." ? /* @__PURE__ */ React.createElement("span", { key: `dots_${idx}`, className: "px-0.5 text-[9px] text-white/30 select-none" }, "...") : /* @__PURE__ */ React.createElement(
        "button",
        {
          key: `page_${item}`,
          type: "button",
          onClick: (e) => {
            e.stopPropagation();
            setFinishedPage(item);
          },
          className: `min-w-[22px] h-6 px-1 rounded-md text-[10px] font-medium font-montserrat transition-all active:scale-90 cursor-pointer ${item === currentPage ? "bg-primary/20 text-primary border border-primary/30 font-semibold" : "text-white/35 hover:text-white/70 hover:bg-white/[0.04]"}`
        },
        item
      ));
    })()), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: currentPage >= totalPages,
        onClick: (e) => {
          e.stopPropagation();
          setFinishedPage((p) => Math.min(totalPages, p + 1));
        },
        className: `flex items-center justify-center w-6 h-6 rounded-md text-xs transition-all active:scale-90 ${currentPage >= totalPages ? "opacity-20 text-white/20 cursor-not-allowed" : "text-white/40 hover:text-cream-light hover:bg-white/[0.05] cursor-pointer"}`,
        title: "Next Page"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, "chevron_right")
    ))));
  })));
};
const ManageQuickTaskCategoriesModal = ({ categories, quickTasks: quickTasks2, onClose, onDeleteCategory, onAddCategory, onReorderCategories, onRenameCategory, visibleSections = {}, onToggleVisibleSection, showToast: showToast2 }) => {
  const [activeTab, setActiveTab] = useState("sections");
  const [newCat, setNewCat] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [orderedCats, setOrderedCats] = useState(() => [...categories || []]);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragHandleTimer = useRef(null);
  const dragStartIdx = useRef(null);
  const isDraggingRef = useRef(false);
  const [pendingDeleteCat, setPendingDeleteCat] = useState(null);
  const listRef = useRef(null);
  React.useEffect(() => {
    const incoming = categories || [];
    setOrderedCats((prev) => {
      const prevJoined = prev.join("||");
      const incJoined = incoming.join("||");
      if (prevJoined !== incJoined && incoming.length !== prev.length) {
        return [...incoming];
      }
      return prev;
    });
  }, [categories]);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };
  const handleAdd = (e) => {
    e.preventDefault();
    const clean = newCat.trim().toUpperCase();
    if (!clean) return;
    onAddCategory(clean);
    setNewCat("");
    if (showToast2) showToast2(`Category "${clean}" added`);
  };
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragHandleRef = useRef(null);
  const overIdxRef = useRef(null);
  const autoScrollTimer = useRef(null);
  const ROW_HEIGHT = 56;
  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };
  const handlePointerDown = (e, idx) => {
    if (e.target.closest("button, input")) return;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
    }
    isDraggingRef.current = true;
    dragStartIdx.current = idx;
    overIdxRef.current = idx;
    dragHandleRef.current = { pointerId: e.pointerId, startY: e.clientY, initialScrollTop: listRef.current ? listRef.current.scrollTop : 0, target };
    setDraggingIdx(idx);
    setOverIdx(idx);
    setDragOffsetY(0);
    if (navigator.vibrate) try {
      navigator.vibrate(35);
    } catch {
    }
  };
  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || !dragHandleRef.current || !listRef.current) return;
    const list = listRef.current;
    const scrollDiff = list.scrollTop - dragHandleRef.current.initialScrollTop;
    const dy = e.clientY - dragHandleRef.current.startY + scrollDiff;
    setDragOffsetY(dy);
    const listRect = list.getBoundingClientRect();
    const topZone = listRect.top + 45;
    const bottomZone = listRect.bottom - 45;
    if (e.clientY < topZone) {
      if (!autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(() => {
          if (listRef.current) listRef.current.scrollTop -= 6;
        }, 16);
      }
    } else if (e.clientY > bottomZone) {
      if (!autoScrollTimer.current) {
        autoScrollTimer.current = setInterval(() => {
          if (listRef.current) listRef.current.scrollTop += 6;
        }, 16);
      }
    } else {
      stopAutoScroll();
    }
    const currentIdx = dragStartIdx.current;
    const step = Math.round(dy / ROW_HEIGHT);
    const targetIdx = Math.max(0, Math.min(orderedCats.length - 1, currentIdx + step));
    if (targetIdx !== overIdxRef.current) {
      overIdxRef.current = targetIdx;
      setOverIdx(targetIdx);
      if (navigator.vibrate) try {
        navigator.vibrate(15);
      } catch {
      }
    }
  };
  const handlePointerUp = (e) => {
    stopAutoScroll();
    if (!isDraggingRef.current) return;
    const currentDrag = dragStartIdx.current;
    const currentOver = overIdxRef.current;
    if (dragHandleRef.current && dragHandleRef.current.target) {
      try {
        dragHandleRef.current.target.releasePointerCapture(dragHandleRef.current.pointerId);
      } catch {
      }
    }
    isDraggingRef.current = false;
    dragStartIdx.current = null;
    overIdxRef.current = null;
    dragHandleRef.current = null;
    setDraggingIdx(null);
    setOverIdx(null);
    setDragOffsetY(0);
    if (currentDrag !== null && currentOver !== null && currentOver !== currentDrag) {
      const next = [...orderedCats];
      const [moved] = next.splice(currentDrag, 1);
      next.splice(currentOver, 0, moved);
      setOrderedCats(next);
      if (onReorderCategories) onReorderCategories(next);
    }
  };
  const startEdit = (cat) => {
    setEditingCat(cat);
    setEditValue(cat);
  };
  const commitEdit = (oldCat) => {
    const clean = editValue.trim().toUpperCase();
    if (clean && clean !== oldCat) {
      if (onRenameCategory) onRenameCategory(oldCat, clean);
      if (showToast2) showToast2(`Renamed to "${clean}"`);
    }
    setEditingCat(null);
    setEditValue("");
  };
  const sectionOptions = [
    { key: "pastDue", label: "Past Due", sub: "Overdue quick tasks", alwaysOn: true },
    { key: "today", label: "Today", sub: "Tasks due today", alwaysOn: true },
    { key: "tomorrow", label: "Tomorrow", sub: "Tomorrow's tasks", alwaysOn: false },
    { key: "thisWeek", label: "This Week", sub: "Tasks due this week", alwaysOn: false },
    { key: "nextWeek", label: "Next Week", sub: "Tasks due next week", alwaysOn: false },
    { key: "upcoming", label: "Upcoming", sub: "Next 2 weeks after next week", alwaysOn: false },
    { key: "noDate", label: "No Deadline", sub: "Tasks without set dates", alwaysOn: false }
  ];
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[950] flex items-center justify-center p-4 transition-all duration-200 " + (isClosing ? "opacity-0 scale-95" : "animate-in fade-in duration-300") }, /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md", onClick: handleClose }), /* @__PURE__ */ React.createElement("div", { className: "bg-[#0f172a] w-full max-w-sm rounded-[2rem] p-5 md:p-6 relative z-10 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 flex flex-col h-[520px] max-h-[85vh]" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pb-3 border-b border-white/5 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-xl" }, "tune"), /* @__PURE__ */ React.createElement("h3", { className: "text-base md:text-lg font-bold text-cream-light font-montserrat tracking-wide" }, "Quick Task Settings")), /* @__PURE__ */ React.createElement("button", { onClick: handleClose, className: "text-white/30 hover:text-primary transition-colors p-1 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close"))), /* @__PURE__ */ React.createElement("div", { className: "flex rounded-2xl bg-white/[0.03] p-1 border border-white/5 my-3 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setActiveTab("sections"),
      className: `flex-1 py-1.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider font-montserrat transition-all ${activeTab === "sections" ? "bg-primary/20 text-primary border border-primary/30 shadow-sm" : "text-cream-light/40 hover:text-cream-light/80"}`
    },
    "Sections"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setActiveTab("categories"),
      className: `flex-1 py-1.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider font-montserrat transition-all ${activeTab === "categories" ? "bg-primary/20 text-primary border border-primary/30 shadow-sm" : "text-cream-light/40 hover:text-cream-light/80"}`
    },
    "Categories"
  )), activeTab === "sections" && /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 pb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[9px] md:text-[10px] text-cream-light/40 font-montserrat font-bold uppercase tracking-widest px-1 pb-1" }, "Visible on Homepage"), sectionOptions.map((sec) => {
    const isEnabled = sec.alwaysOn || visibleSections[sec.key] !== false;
    return /* @__PURE__ */ React.createElement("div", { key: sec.key, className: "flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col min-w-0 pr-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-cream-light font-montserrat uppercase tracking-wider" }, sec.label), sec.alwaysOn && /* @__PURE__ */ React.createElement("span", { className: "text-[8px] md:text-[9px] text-primary/90 bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat" }, "Always On")), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-white/30 font-montserrat mt-0.5" }, sec.sub)), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: sec.alwaysOn,
        onClick: () => onToggleVisibleSection && onToggleVisibleSection(sec.key),
        className: `w-10 h-6 rounded-full p-0.5 transition-all duration-200 flex items-center flex-shrink-0 ${isEnabled ? "bg-primary justify-end" : "bg-white/10 justify-start"} ${sec.alwaysOn ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "w-5 h-5 rounded-full bg-white shadow-md" })
    ));
  })), activeTab === "categories" && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col flex-1 min-h-0 space-y-3" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: listRef,
      className: "flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-1 pb-2 qt-categories-scrollbar"
    },
    orderedCats.map((cat, idx) => {
      const count = (quickTasks2 || []).filter((t) => {
        const cats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
        return cats.some((c) => c.toLowerCase() === cat.toLowerCase());
      }).length;
      const isDragging = draggingIdx === idx;
      const isOver = overIdx === idx && draggingIdx !== null && draggingIdx !== idx;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: cat,
          "data-cat-row": idx,
          style: {
            transition: "none",
            transform: isDragging ? `translateY(${dragOffsetY}px)` : draggingIdx !== null && idx > draggingIdx && idx <= (overIdx ?? draggingIdx) ? "translateY(-56px)" : draggingIdx !== null && idx < draggingIdx && idx >= (overIdx ?? draggingIdx) ? "translateY(56px)" : "none",
            zIndex: isDragging ? 100 : 1,
            position: "relative",
            touchAction: isDragging ? "none" : "pan-y"
          },
          className: `flex items-center gap-2.5 p-3 rounded-2xl border select-none ${isDragging ? "bg-[#1e130c] border-primary shadow-[0_12px_30px_rgba(249,115,22,0.35)] ring-2 ring-primary/60 cursor-grabbing" : "bg-white/[0.03] border-white/5 hover:border-white/10"}`
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            onPointerDown: (e) => handlePointerDown(e, idx),
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
            className: `p-1.5 rounded-xl transition-all flex items-center justify-center touch-none flex-shrink-0 cursor-grab active:cursor-grabbing ${isDragging ? "bg-primary text-white shadow-md" : "text-white/40 hover:text-primary hover:bg-white/5"}`,
            title: "Hold and drag to reorder"
          },
          /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "drag_handle")
        ),
        /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-full bg-primary flex-shrink-0" }),
        editingCat === cat ? (
          // (2026-07-13) Inline edit input. Prev: no edit
          /* @__PURE__ */ React.createElement(
            "input",
            {
              autoFocus: true,
              value: editValue,
              onChange: (e) => setEditValue(e.target.value.toUpperCase()),
              onBlur: () => commitEdit(cat),
              onKeyDown: (e) => {
                if (e.key === "Enter") commitEdit(cat);
                if (e.key === "Escape") setEditingCat(null);
              },
              className: "flex-1 bg-white/10 border border-primary/40 rounded-lg px-2 py-0.5 text-xs text-cream-light font-montserrat uppercase tracking-wider focus:outline-none"
            }
          )
        ) : /* @__PURE__ */ React.createElement("span", { className: "flex-1 text-xs font-bold text-cream-light truncate font-montserrat uppercase tracking-wider" }, cat),
        /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-white/30 font-montserrat font-bold flex-shrink-0" }, "(", count, ")"),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => editingCat === cat ? commitEdit(cat) : startEdit(cat),
            className: "p-1.5 text-white/20 hover:text-primary transition-colors rounded-lg hover:bg-white/5 flex-shrink-0",
            title: "Edit category name"
          },
          /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, editingCat === cat ? "check" : "edit")
        ),
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              if (count > 0) {
                setPendingDeleteCat({ name: cat, count });
              } else {
                onDeleteCategory(cat);
              }
            },
            className: "p-1.5 text-white/30 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5 flex-shrink-0",
            title: "Delete category"
          },
          /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "delete")
        )
      );
    }),
    orderedCats.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "py-8 text-center text-white/30 text-xs font-montserrat" }, "No categories yet")
  ), /* @__PURE__ */ React.createElement("form", { onSubmit: handleAdd, className: "flex items-center gap-2 pt-3 border-t border-white/5 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: newCat,
      onChange: (e) => setNewCat(e.target.value.toUpperCase()),
      placeholder: "New category...",
      className: "flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-cream-light font-montserrat placeholder:text-white/20 focus:outline-none focus:border-primary/40"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      className: "px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold font-montserrat uppercase tracking-wider hover:bg-primary-dark transition-all flex items-center gap-1 shadow-sm shadow-primary/20"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm font-bold" }, "add"),
    "Add"
  )))), pendingDeleteCat && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md z-[2050] flex items-center justify-center p-6 animate-in fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 text-center animate-in zoom-in-95 duration-300 font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-red-400 text-3xl" }, "warning")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light mb-3" }, "Delete Category?"), /* @__PURE__ */ React.createElement("p", { className: "text-white/60 text-xs leading-relaxed mb-8" }, "Category ", /* @__PURE__ */ React.createElement("span", { className: "text-primary font-bold" }, '"', pendingDeleteCat.name, '"'), " has ", /* @__PURE__ */ React.createElement("span", { className: "text-white font-bold" }, pendingDeleteCat.count), " ", pendingDeleteCat.count === 1 ? "task" : "tasks", ". Deleting it will remove the category tag from these tasks."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        onDeleteCategory(pendingDeleteCat.name);
        setPendingDeleteCat(null);
      },
      className: "w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-500/20"
    },
    "Delete Category"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingDeleteCat(null),
      className: "w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all"
    },
    "Cancel"
  )))));
};
const BatchDeadlineModal = ({ isOpen, onClose, onApply, count = 0 }) => {
  if (!isOpen) return null;
  const [dateVal, setDateVal] = useState("");
  const [timeVal, setTimeVal] = useState("23:59");
  const setPreset = (daysOffset) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + daysOffset);
    setDateVal(d.toLocaleDateString("en-CA"));
  };
  const todayStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
  const tommStr = (() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA");
  })();
  const nextWeekStr = (() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-CA");
  })();
  const isToday = dateVal === todayStr;
  const isTomorrow = dateVal === tommStr;
  const isNextWeek = dateVal === nextWeekStr;
  const isCleared = dateVal === "" && timeVal === "";
  return (
    // (2026-07-13) Full-width deadline popup with no side margins. Prev: max-w-sm
    /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-[2050] flex items-end justify-center p-0 m-0 animate-in fade-in duration-200", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-none m-0 mx-0 bg-[#120804] border-t border-b-0 border-x-0 border-white/10 rounded-t-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 font-montserrat", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-cream-light" }, "Change Deadline"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-white/50" }, count, " ", count === 1 ? "task" : "tasks", " selected")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onClose, className: "w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/50 hover:text-white transition-all duration-150 active:scale-90 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "close"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPreset(0), className: `px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer select-none border ${isToday ? "bg-primary text-white border-primary shadow-md shadow-primary/30" : "bg-white/5 hover:bg-primary/20 hover:text-primary active:bg-primary/30 text-white/70 border-white/10"}` }, "Today"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPreset(1), className: `px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer select-none border ${isTomorrow ? "bg-primary text-white border-primary shadow-md shadow-primary/30" : "bg-white/5 hover:bg-primary/20 hover:text-primary active:bg-primary/30 text-white/70 border-white/10"}` }, "Tomorrow"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setPreset(7), className: `px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer select-none border ${isNextWeek ? "bg-primary text-white border-primary shadow-md shadow-primary/30" : "bg-white/5 hover:bg-primary/20 hover:text-primary active:bg-primary/30 text-white/70 border-white/10"}` }, "Next Week"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setDateVal("");
      setTimeVal("");
    }, className: `px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 cursor-pointer select-none border ${isCleared ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/30" : "bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border-red-500/20"}` }, "Clear")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-bold uppercase tracking-widest text-primary mb-1" }, "Due Date"), /* @__PURE__ */ React.createElement("input", { type: "date", value: dateVal, onChange: (e) => setDateVal(e.target.value), className: "w-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 hover:border-primary/40 rounded-xl px-3 py-2.5 text-xs text-cream-light focus:outline-none focus:border-primary transition-all duration-150 cursor-pointer" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-bold uppercase tracking-widest text-primary mb-1" }, "Due Time"), /* @__PURE__ */ React.createElement("input", { type: "time", value: timeVal, onChange: (e) => setTimeVal(e.target.value), className: "w-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/10 border border-white/10 hover:border-primary/40 rounded-xl px-3 py-2.5 text-xs text-cream-light focus:outline-none focus:border-primary transition-all duration-150 cursor-pointer" }))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: onClose, className: "flex-1 py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white/60 active:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150 active:scale-95 cursor-pointer select-none" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => onApply(dateVal, timeVal), className: "flex-1 py-3 bg-primary hover:bg-primary-dark active:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/30 active:shadow-none transition-all duration-150 active:scale-95 cursor-pointer select-none" }, "Apply"))))
  );
};
const DashboardPage = ({ user, notes: notes2, quickTasks: quickTasks2, alarms: alarms2 = [], onOpenCreator, onEditNote, onReorderPriorityNote, onToggleQuickTask, onAddQuickTaskClick, onDeleteQuickTask, onUpdateQuickTask, onUpdateQuickTasks, onEditQuickTask, editingQuickTask, setEditingQuickTask, isQuickTaskModalOpen, setIsQuickTaskModalOpen, onRemoveReminder, isProbing, isFirstSyncDone, pomodoroTime, isPomodoroActive, setIsPomodoroActive, showToast: showToast2, onUpdateNote, activeCollection: activeCollection2 }) => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const searchQuery = (queryParams.get("search") || "").trim();
  const noteMatchesSearch = useCallback((note, q) => {
    if (!q) return true;
    const query = q.toLowerCase();
    const searchableText = [
      note.title,
      note.content,
      (note.labels || []).join(" "),
      note.section,
      note.reminderDate,
      note.noteIcon
    ].filter(Boolean).join(" ").toLowerCase();
    return searchableText.includes(query);
  }, []);
  const dragStateRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const lastUpdateRef = useRef(0);
  const dragRef = useRef(null);
  const gestureRef = useRef({ active: false, activated: false, scrolling: false });
  const longPressTimer = useRef(null);
  const isScrollMoveRef = useRef(false);
  const docMoveRef = useRef(null);
  const docEndRef = useRef(null);
  const docTouchRef = useRef(null);
  const removeDocListeners = () => {
    if (docMoveRef.current) document.removeEventListener("pointermove", docMoveRef.current);
    if (docEndRef.current) {
      document.removeEventListener("pointerup", docEndRef.current);
      document.removeEventListener("pointercancel", docEndRef.current);
    }
    if (docTouchRef.current) document.removeEventListener("touchmove", docTouchRef.current);
    docMoveRef.current = null;
    docEndRef.current = null;
    docTouchRef.current = null;
  };
  const [localNotes, setLocalNotes] = useState(
    () => notes2.filter((n) => n.isPinned).sort((a, b) => {
      const orderA = a.homeOrder || 0;
      const orderB = b.homeOrder || 0;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.updatedAt ? a.updatedAt.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? b.updatedAt.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    })
  );
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_qt_categories");
      return saved !== null ? JSON.parse(saved) : ["Sample"];
    } catch {
      return ["Sample"];
    }
  });
  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem("faiora_qt_categories");
        if (saved !== null) setCustomCategories(JSON.parse(saved));
      } catch {
      }
    };
    window.addEventListener("faiora_qt_categories_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("faiora_qt_categories_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);
  const syncCategoriesToCloud = (cats) => {
    if (!user || user.isAnonymous) return;
    const uid = user.uid;
    const coll = activeCollection2 || window._faiora_active_collection || "users";
    try {
      db.collection(coll).doc(uid).set({ quickTaskCategories: cats }, { merge: true }).catch(() => {
      });
    } catch {
    }
  };
  const syncVisibleSectionsToCloud = (sections) => {
    if (!user || user.isAnonymous) return;
    const uid = user.uid;
    const coll = activeCollection2 || window._faiora_active_collection || "users";
    try {
      db.collection(coll).doc(uid).set({ quickTaskVisibleSections: sections }, { merge: true }).catch(() => {
      });
    } catch {
    }
  };
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const allCategories = useMemo(() => {
    const orderedList = [];
    const seen = /* @__PURE__ */ new Set();
    (customCategories || []).forEach((c) => {
      if (c && c.trim() && c.trim().toUpperCase() !== "ALL") {
        const val = c.trim();
        if (!seen.has(val.toLowerCase())) {
          seen.add(val.toLowerCase());
          orderedList.push(val);
        }
      }
    });
    (quickTasks2 || []).forEach((t) => {
      const taskCats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
      taskCats.forEach((c) => {
        if (c && c.trim() && c.trim().toUpperCase() !== "ALL") {
          const val = c.trim();
          if (!seen.has(val.toLowerCase())) {
            seen.add(val.toLowerCase());
            orderedList.push(val);
          }
        }
      });
    });
    return orderedList;
  }, [quickTasks2, customCategories]);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const handleDeleteCategory = (catName) => {
    const clean = (catName || "").trim();
    if (!clean) return;
    const updatedCustom = customCategories.filter((c) => c.toLowerCase() !== clean.toLowerCase());
    setCustomCategories(updatedCustom);
    try {
      localStorage.setItem("faiora_qt_categories", JSON.stringify(updatedCustom));
    } catch {
    }
    syncCategoriesToCloud(updatedCustom);
    if (selectedCategory.toLowerCase() === clean.toLowerCase()) {
      setSelectedCategory("ALL");
    }
    if (typeof onUpdateQuickTasks === "function" && Array.isArray(quickTasks2)) {
      const updatedTasks = quickTasks2.map((t) => {
        const currentCats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
        const newCats = currentCats.filter((c) => c.toLowerCase() !== clean.toLowerCase());
        return {
          ...t,
          categories: newCats,
          category: newCats[0] || ""
        };
      });
      onUpdateQuickTasks(updatedTasks);
    }
    if (showToast2) showToast2(`Category "${clean}" deleted`);
  };
  const handleCreateCategory = (catName) => {
    const clean = (catName || newCategoryName).trim();
    if (!clean) return;
    if (!allCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      const updated = [...customCategories, clean];
      setCustomCategories(updated);
      try {
        localStorage.setItem("faiora_qt_categories", JSON.stringify(updated));
      } catch {
      }
      syncCategoriesToCloud(updated);
    }
    setSelectedCategory(clean);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };
  const handleReorderCategories = (newOrder) => {
    setCustomCategories(newOrder);
    try {
      localStorage.setItem("faiora_qt_categories", JSON.stringify(newOrder));
    } catch {
    }
    try {
      window.dispatchEvent(new Event("faiora_qt_categories_updated"));
    } catch {
    }
    syncCategoriesToCloud(newOrder);
  };
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [pendingDeleteBatch, setPendingDeleteBatch] = useState(false);
  const [showAssignCategorySheet, setShowAssignCategorySheet] = useState(false);
  const [showBatchDeadlineModal, setShowBatchDeadlineModal] = useState(false);
  const handleBatchChangeDeadline = (newDate, newTime) => {
    if (typeof onUpdateQuickTasks === "function") {
      let dueTimestamp = null;
      if (newDate) {
        const dt = /* @__PURE__ */ new Date(`${newDate}T${newTime || "23:59"}`);
        if (!isNaN(dt.getTime())) dueTimestamp = dt.getTime();
      }
      onUpdateQuickTasks((quickTasks2 || []).map((t) => {
        if (!selectedTasks.includes(t.id)) return t;
        return {
          ...t,
          dueDate: newDate || "",
          dueTime: newTime || "",
          dueTimestamp,
          updatedAt: Date.now()
        };
      }));
    }
    setShowBatchDeadlineModal(false);
    setSelectedTasks([]);
    setIsSelectionMode(false);
    if (showToast2) showToast2(`Deadline updated for ${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`);
  };
  const handleToggleSelectTask = (taskId) => {
    setSelectedTasks(
      (prev) => prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };
  const handleSelectAll = () => {
    setSelectedTasks(
      (prev) => prev.length === filteredQuickTasks.length ? [] : filteredQuickTasks.map((t) => t.id)
    );
  };
  const handleConfirmBatchDelete = () => {
    if (typeof onUpdateQuickTasks === "function") {
      onUpdateQuickTasks((quickTasks2 || []).filter((t) => !selectedTasks.includes(t.id)));
    }
    setSelectedTasks([]);
    setIsSelectionMode(false);
    setPendingDeleteBatch(false);
    if (showToast2) showToast2(`${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""} deleted`);
  };
  const handleAssignCategory = (cat) => {
    if (typeof onUpdateQuickTasks === "function") {
      onUpdateQuickTasks((quickTasks2 || []).map((t) => {
        if (!selectedTasks.includes(t.id)) return t;
        return { ...t, categories: [cat], category: cat };
      }));
    }
    setShowAssignCategorySheet(false);
    setSelectedTasks([]);
    setIsSelectionMode(false);
    if (showToast2) showToast2(`Category "${cat}" assigned to ${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`);
  };
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("faiora_home_qt_view_mode") || "standard";
    } catch {
      return "standard";
    }
  });
  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("faiora_home_qt_view_mode", mode);
    } catch {
    }
  };
  const [visibleSections, setVisibleSections] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_qt_visible_sections");
      return saved ? { pastDue: true, today: true, tomorrow: true, thisWeek: true, nextWeek: false, upcoming: false, ...JSON.parse(saved) } : { pastDue: true, today: true, tomorrow: true, thisWeek: true, nextWeek: false, upcoming: false };
    } catch {
      return { pastDue: true, today: true, tomorrow: true, thisWeek: true, nextWeek: false, upcoming: false };
    }
  });
  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem("faiora_qt_visible_sections");
        if (saved) setVisibleSections((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
      }
    };
    window.addEventListener("faiora_qt_visible_sections_updated", handleUpdate);
    return () => window.removeEventListener("faiora_qt_visible_sections_updated", handleUpdate);
  }, []);
  const handleToggleVisibleSection = (key) => {
    if (key === "pastDue" || key === "today") return;
    setVisibleSections((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("faiora_qt_visible_sections", JSON.stringify(updated));
      } catch {
      }
      syncVisibleSectionsToCloud(updated);
      return updated;
    });
  };
  const filteredQuickTasks = useMemo(() => {
    let list = quickTasks2 || [];
    if (selectedCategory !== "ALL") {
      list = list.filter((t) => {
        const cats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
        return cats.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => (t.text || t.title || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [quickTasks2, selectedCategory, searchQuery]);
  const sortedQuickTasks = useMemo(() => sortQuickTasksList(filteredQuickTasks), [filteredQuickTasks]);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const hasEverHadDataRef = useRef(false);
  useEffect(() => {
    if (notes2.length > 0 || quickTasks2.length > 0 || isFirstSyncDone) {
      hasEverHadDataRef.current = true;
      const timer = setTimeout(() => {
        setShowInitialLoader(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [notes2.length, quickTasks2.length, isFirstSyncDone]);
  const shouldShowSkeleton = showInitialLoader || !hasEverHadDataRef.current && !isFirstSyncDone;
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const isLoading = shouldShowSkeleton || isPullRefreshing;
  const groupedQuickTasks = useMemo(() => groupQuickTasksBySchedule(sortedQuickTasks), [sortedQuickTasks]);
  const dailyQuickTasks = useMemo(() => groupQuickTasksDaily(sortedQuickTasks), [sortedQuickTasks]);
  const handleSaveQuickTasksToNotes = (tasksToSave, isManual = false) => {
    const list = Array.isArray(tasksToSave) ? tasksToSave : sortedQuickTasks;
    const dailyData = groupQuickTasksDaily(list);
    let noteHtml = `<div class="qt-notepad-live-wrapper" style="font-family: 'Montserrat', sans-serif; line-height: 1.35;">`;
    dailyData.sections.forEach((sec) => {
      noteHtml += `<h3 class="qt-notepad-live-section-title" style="font-size: 11px; font-weight: bold; color: #f97316; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 10px; margin-bottom: 3px;">${sec.shortLabel || sec.label}</h3>`;
      noteHtml += `<ul class="checklist-items qt-notepad-live-section-list" style="list-style: none; padding-left: 0; margin-bottom: 8px;">`;
      sec.items.forEach((item) => {
        noteHtml += `<li class="checklist-item qt-notepad-live-item ${item.completed ? "checked" : ""}" data-qt-id="${item.id}" style="margin-bottom: 2px; display: flex; align-items: flex-start; gap: 8px;"><span class="checklist-checkbox qt-notepad-live-checkbox" contenteditable="false" style="margin-top: 2px; flex-shrink: 0;"></span><span class="qt-notepad-live-text" style="${item.completed ? "text-decoration: line-through; opacity: 0.5;" : ""}">${item.text || "Untitled"}</span></li>`;
      });
      noteHtml += `</ul>`;
    });
    if (dailyData.completed && dailyData.completed.length > 0) {
      noteHtml += `<h3 class="qt-notepad-live-finished-title" style="font-size: 11px; font-weight: bold; color: #888888; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 14px; margin-bottom: 3px;">FINISHED (${dailyData.completed.length})</h3>`;
      noteHtml += `<ul class="checklist-items qt-notepad-live-finished-list" style="list-style: none; padding-left: 0; margin-bottom: 8px;">`;
      dailyData.completed.forEach((item) => {
        noteHtml += `<li class="checklist-item qt-notepad-live-item checked" data-qt-id="${item.id}" style="margin-bottom: 2px; display: flex; align-items: flex-start; gap: 8px;"><span class="checklist-checkbox qt-notepad-live-checkbox" contenteditable="false" style="margin-top: 2px; flex-shrink: 0;"></span><span class="qt-notepad-live-text" style="text-decoration: line-through; opacity: 0.45;">${item.text || "Untitled"}</span></li>`;
      });
      noteHtml += `</ul>`;
    }
    noteHtml += `</div>`;
    const existingNote = (notes2 || []).find((n) => (n.labels || []).includes("QUICK-TASKS") || n.id === "qt_live_notepad" || n.title === "Quick Tasks Notepad");
    let noteToSave;
    if (existingNote) {
      noteToSave = {
        ...existingNote,
        title: "Quick Tasks Notepad",
        content: noteHtml,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } else {
      const newId = "qt_live_notepad_" + Date.now();
      noteToSave = {
        id: newId,
        title: "Quick Tasks Notepad",
        content: noteHtml,
        labels: ["QUICK-TASKS", "PRIORITY"],
        isPinned: true,
        noteTheme: "amber",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (typeof onUpdateNote === "function") {
      onUpdateNote(noteToSave);
    }
    if (user && activeCollection2) {
      try {
        db.collection(activeCollection2).doc(user.uid).set({
          notes: {
            [noteToSave.id]: {
              ...noteToSave,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
          }
        }, { merge: true });
      } catch (e) {
      }
    }
    if (isManual && showToast2) showToast2("Quick tasks saved to Notes!");
  };
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    if (!(user == null ? void 0 : user.uid) || hasAutoSavedRef.current) return;
    const storageKey = "faiora_qt_auto_saved_initial_" + user.uid;
    if (localStorage.getItem(storageKey)) return;
    if ((quickTasks2 || []).length >= 3) {
      hasAutoSavedRef.current = true;
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
      }
      handleSaveQuickTasksToNotes(quickTasks2, false);
    }
  }, [user == null ? void 0 : user.uid, (quickTasks2 || []).length]);
  const activeHomepageSections = useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayDay = today.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    const list = [
      { key: "pastDue", label: "Past Due", items: groupedQuickTasks.pastDue || [] },
      { key: "today", label: `Today (${todayDay})`, items: groupedQuickTasks.today || [] },
      { key: "tomorrow", label: `Tomorrow (${tomorrowDay})`, items: groupedQuickTasks.tomorrow || [] },
      { key: "thisWeek", label: "This Week", items: groupedQuickTasks.thisWeek || [] },
      { key: "nextWeek", label: "Next Week", items: groupedQuickTasks.nextWeek || [] },
      { key: "upcoming", label: "Upcoming", items: groupedQuickTasks.upcoming || [] }
    ];
    return list.filter((sec) => visibleSections[sec.key] !== false && sec.items.length > 0);
  }, [groupedQuickTasks, visibleSections]);
  const todayAlarms = useMemo(() => getTodayEnabledAlarms(alarms2), [alarms2]);
  const lastSyncRef = useRef("");
  useEffect(() => {
    const currentSync = JSON.stringify(notes2.map((n) => ({ id: n.id, updatedAt: n.updatedAt, homeOrder: n.homeOrder, labels: n.labels })));
    if (!dragState && currentSync !== lastSyncRef.current) {
      lastSyncRef.current = currentSync;
      const priorities = notes2.filter((n) => n.isPinned).sort((a, b) => {
        const orderA = a.homeOrder || 0;
        const orderB = b.homeOrder || 0;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.updatedAt ? a.updatedAt.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? b.updatedAt.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      setLocalNotes(priorities);
    }
  }, [notes2, dragState]);
  const handlePointerDown = (noteId, e) => {
    const cardEl = e.currentTarget;
    const { clientX, clientY, pointerId } = e;
    isScrollMoveRef.current = false;
    gestureRef.current = {
      active: true,
      activated: false,
      scrolling: false,
      pointerId,
      cardEl,
      noteId,
      startX: clientX,
      startY: clientY,
      lastY: clientY
    };
    const onMove = (ev) => {
      const gs = gestureRef.current;
      if (!gs.active) return;
      const { clientX: mx, clientY: my } = ev;
      if (gs.scrolling) return;
      if (!gs.activated) {
        if (Math.abs(mx - gs.startX) > 8 || Math.abs(my - gs.startY) > 8) {
          isScrollMoveRef.current = true;
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          gs.scrolling = true;
          gs.active = false;
          try {
            gs.cardEl.releasePointerCapture(gs.pointerId);
          } catch (err) {
          }
          removeDocListeners();
        }
        return;
      }
      if (ev.cancelable) ev.preventDefault();
      handlePointerMoveCore(mx, my);
    };
    const onEnd = (ev) => {
      handlePointerEndCore(ev);
      removeDocListeners();
    };
    const onTouch = (ev) => {
      var _a;
      if (((_a = gestureRef.current) == null ? void 0 : _a.activated) && ev.cancelable) ev.preventDefault();
    };
    removeDocListeners();
    docMoveRef.current = onMove;
    docEndRef.current = onEnd;
    docTouchRef.current = onTouch;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
    document.addEventListener("touchmove", onTouch, { passive: false });
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) try {
        navigator.vibrate(50);
      } catch (err) {
      }
      gestureRef.current.activated = true;
      try {
        cardEl.setPointerCapture(pointerId);
      } catch (err) {
      }
      const rect = cardEl.getBoundingClientRect();
      const clone = cardEl.cloneNode(true);
      clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:9999;pointer-events:none;opacity:0.9;transform:scale(1.05) rotate(2deg);box-shadow:0 25px 60px rgba(0,0,0,0.5), 0 0 30px rgba(249, 115, 22, 0.3);transition:none;will-change:left,top;border-radius:1.5rem;`;
      document.body.appendChild(clone);
      document.body.style.cursor = "grabbing";
      cardEl.style.opacity = "0.3";
      cardEl.style.transform = "scale(0.95)";
      dragRef.current = {
        noteId,
        cloneEl: clone,
        originalEl: cardEl,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
        startX: clientX,
        startY: clientY,
        didMove: false
      };
      setDragState(dragRef.current);
    }, 350);
  };
  const findScrollParent = (el) => {
    let node = el ? el.parentElement : null;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return document.documentElement;
  };
  const handlePointerMoveCore = (mx, my) => {
    const s = dragRef.current;
    if (!s) return;
    s.didMove = true;
    if (s.cloneEl) {
      s.cloneEl.style.left = `${mx - s.offsetX}px`;
      s.cloneEl.style.top = `${my - s.offsetY}px`;
      s.cloneEl.style.transform = `scale(1.05) rotate(2deg)`;
    }
    const scrollSpeed = 15;
    const edgeThreshold = 80;
    if (my < edgeThreshold) {
      window.scrollBy(0, -scrollSpeed);
    } else if (my > window.innerHeight - edgeThreshold) {
      window.scrollBy(0, scrollSpeed);
    }
    const now = Date.now();
    if (now - lastUpdateRef.current < 32) return;
    lastUpdateRef.current = now;
    let hoveredNoteId = null;
    document.querySelectorAll("[data-priority-note-id]").forEach((el) => {
      const nid = el.getAttribute("data-priority-note-id");
      if (nid === s.noteId) return;
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      if (Math.abs(mx - centerX) < 80 && Math.abs(my - centerY) < 80) hoveredNoteId = nid;
    });
    if (hoveredNoteId) {
      setLocalNotes((prev) => {
        const si = prev.findIndex((n2) => n2.id === s.noteId);
        const ti = prev.findIndex((n2) => n2.id === hoveredNoteId);
        if (si === -1 || ti === -1) return prev;
        const n = [...prev];
        const [rm] = n.splice(si, 1);
        n.splice(ti, 0, rm);
        return n;
      });
    }
  };
  const handlePointerEndCore = (e) => {
    const gs = gestureRef.current;
    if (!gs.active) return;
    try {
      gs.cardEl.releasePointerCapture(gs.pointerId);
    } catch (err) {
    }
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (gs.scrolling) {
      setDragState(null);
      dragRef.current = null;
      return;
    }
    const s = dragRef.current;
    if (s && gs.activated && s.didMove) {
      setLocalNotes((currentLocal) => {
        const fi = currentLocal.findIndex((n) => n.id === s.noteId);
        let tid = s.noteId;
        if (currentLocal.length > 1) {
          const ti = fi > 0 ? fi - 1 : 1;
          tid = currentLocal[ti].id;
        }
        if (tid !== s.noteId) onReorderPriorityNote(s.noteId, tid);
        return currentLocal;
      });
    } else if (!gs.activated && !gs.scrolling && !isScrollMoveRef.current) {
      const note = localNotes.find((n) => n.id === gs.noteId);
      if (note) onEditNote(note);
    }
    if (s) {
      if (s.cloneEl) s.cloneEl.remove();
      if (s.originalEl) {
        s.originalEl.style.opacity = "1";
        s.originalEl.style.transform = "";
      }
    }
    document.body.style.cursor = "";
    setDragState(null);
    dragRef.current = null;
    gs.active = false;
    setTimeout(() => {
      isScrollMoveRef.current = false;
    }, 150);
  };
  useEffect(() => {
    return () => removeDocListeners();
  }, []);
  const sortedPriorityNotes = useMemo(() => {
    if (searchQuery) {
      return (notes2 || []).filter((n) => noteMatchesSearch(n, searchQuery)).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const timeA = a.updatedAt ? a.updatedAt.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? b.updatedAt.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
    }
    return localNotes.slice(0, 6);
  }, [notes2, localNotes, searchQuery, noteMatchesSearch]);
  const handleRefresh = async () => {
    if (navigator.vibrate) try {
      navigator.vibrate([10, 30, 10]);
    } catch (err) {
    }
    setIsPullRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 750));
    setIsPullRefreshing(false);
  };
  const handleFabClick = () => {
    const categoryToPass = selectedCategory !== "ALL" ? selectedCategory : null;
    onAddQuickTaskClick(categoryToPass);
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, onFabClick: handleFabClick, onRefresh: handleRefresh, pomodoroTime, isPomodoroActive, disablePullToRefresh: !!dragState }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto w-full px-0 md:px-12 pt-0 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "md:py-4 md:px-0 md:mb-6" }, /* @__PURE__ */ React.createElement(Header, { user })), /* @__PURE__ */ React.createElement("section", { className: "mt-[calc(72px+env(safe-area-inset-top,0px))] md:mt-8 mb-10 md:mb-12 px-4 md:px-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-4 pt-2 md:mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "hidden md:block text-2xl font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display" }, "PINNED NOTES"), /* @__PURE__ */ React.createElement("h2", { className: "md:hidden text-lg font-bold text-cream-light/90 uppercase tracking-[0.2em] font-display" }, "PINNED"), /* @__PURE__ */ React.createElement("div", { className: "h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" }), /* @__PURE__ */ React.createElement(Link, { to: searchQuery ? `/notes?search=${encodeURIComponent(searchQuery)}` : "/notes", className: "text-[9px] md:text-[10px] font-bold text-primary/60 uppercase tracking-widest hover:text-primary transition-colors" }, "view all (", searchQuery ? sortedPriorityNotes.length : notes2.length, ")")), isLoading ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-6 px-0 md:px-2 mb-0" }, [...Array(6)].map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: i >= 4 ? "hidden md:block" : "" }, /* @__PURE__ */ React.createElement(PriorityNoteSkeleton, { index: i })))) : sortedPriorityNotes.length === 0 ? searchQuery ? /* @__PURE__ */ React.createElement("div", { className: "col-span-full py-16 text-center glass-panel rounded-3xl border border-white/5" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-4xl text-white/10 mb-2" }, "search_off"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest font-bold text-white/30" }, "No matching notes found")) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center p-20 glass-panel rounded-3xl border-dashed border-white/10 text-center animate-pulse" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-6xl text-white/5 mb-4" }, "star"), /* @__PURE__ */ React.createElement("p", { className: "text-white/40 font-medium mb-4 font-montserrat" }, "No priority notes found"), /* @__PURE__ */ React.createElement("p", { className: "text-white/20 text-xs mb-8 uppercase tracking-widest font-bold" }, 'Tag a note with "PRIORITY" to see it here'), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onOpenCreator,
      className: "px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all font-montserrat"
    },
    "Add New Note"
  )) : /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 px-0 md:px-2 mb-0 skeleton-fade-in" }, sortedPriorityNotes.slice(0, searchQuery ? 12 : 6).map((note, index) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: note.id,
      onPointerDown: (e) => !searchQuery && handlePointerDown(note.id, e),
      onContextMenu: (e) => e.preventDefault(),
      style: { touchAction: !searchQuery && dragState && dragState.noteId === note.id ? "none" : "pan-y" },
      className: `transition-transform duration-300 ${!searchQuery && dragState && dragState.noteId === note.id ? "z-[1000] scale-105" : "z-10"}`
    },
    /* @__PURE__ */ React.createElement(
      NoteCard,
      {
        id: `note_card_${note.id}`,
        note,
        onClick: (e) => {
          var _a, _b;
          if (isScrollMoveRef.current) {
            (_a = e == null ? void 0 : e.preventDefault) == null ? void 0 : _a.call(e);
            (_b = e == null ? void 0 : e.stopPropagation) == null ? void 0 : _b.call(e);
            return;
          }
          onEditNote(note);
        },
        index,
        variant: "priority",
        onRemoveReminder
      }
    )
  )), !searchQuery && sortedPriorityNotes.length < 6 && (sortedPriorityNotes.length === 2 || sortedPriorityNotes.length === 4 ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onOpenCreator,
      className: "md:hidden col-span-2 h-10 border border-dashed border-primary/40 hover:border-orange-400 active:border-orange-400 rounded-xl flex items-center justify-center gap-2 group cursor-pointer hover:bg-orange-500/15 active:bg-orange-500/25 hover:shadow-[0_0_20px_rgba(249,115,22,0.35)] active:shadow-[0_0_20px_rgba(249,115,22,0.35)] active:scale-95 transition-all duration-200 px-4 select-none"
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/10 group-hover:bg-orange-500/30 group-active:bg-orange-500/35 flex items-center justify-center text-primary group-hover:text-orange-200 group-active:text-orange-200 transition-all shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm md:text-base group-hover:rotate-90 transition-transform duration-300" }, "add")),
    /* @__PURE__ */ React.createElement("p", { className: "text-[11px] md:text-xs font-bold text-primary/80 group-hover:text-orange-200 group-active:text-orange-200 uppercase tracking-widest transition-colors" }, "Add Note")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onOpenCreator,
      className: "hidden md:flex sticky-note-add aspect-square border-2 border-dashed border-primary/40 rounded-[1.5rem] md:rounded-[1.75rem] flex-col items-center justify-center group cursor-pointer hover:bg-orange-500/15 active:bg-orange-500/25 hover:border-orange-400 active:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.35)] active:shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:scale-[1.01] active:scale-95 transition-all duration-200 p-3.5 md:p-4 select-none"
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 md:w-9 md:h-9 mb-1.5 md:mb-2 rounded-full bg-primary/10 group-hover:bg-orange-500/30 group-active:bg-orange-500/35 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.4)] group-hover:scale-110 flex items-center justify-center text-primary group-hover:text-orange-200 group-active:text-orange-200 transition-all shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-xl group-hover:rotate-90 transition-transform duration-300" }, "add")),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] md:text-[11px] font-bold text-primary/80 group-hover:text-orange-200 group-active:text-orange-200 uppercase tracking-widest text-center px-1 transition-colors" }, "Add Note")
  )) : /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onOpenCreator,
      className: "sticky-note-add aspect-square border-2 border-dashed border-primary/40 rounded-[1.5rem] md:rounded-[1.75rem] flex flex-col items-center justify-center group cursor-pointer hover:bg-orange-500/15 active:bg-orange-500/25 hover:border-orange-400 active:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.35)] active:shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:scale-[1.01] active:scale-95 transition-all duration-200 p-3.5 md:p-4 select-none"
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 md:w-9 md:h-9 mb-1.5 md:mb-2 rounded-full bg-primary/10 group-hover:bg-orange-500/30 group-active:bg-orange-500/35 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.4)] group-hover:scale-110 flex items-center justify-center text-primary group-hover:text-orange-200 group-active:text-orange-200 transition-all shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-xl group-hover:rotate-90 transition-transform duration-300" }, "add")),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] md:text-[11px] font-bold text-primary/80 group-hover:text-orange-200 group-active:text-orange-200 uppercase tracking-widest text-center px-1 transition-colors" }, "Add Note")
  )))), /* @__PURE__ */ React.createElement("div", { className: "px-4 md:px-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 md:gap-3 mb-2 md:mb-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 leading-none" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base sm:text-lg md:text-2xl font-bold text-cream-light/90 uppercase tracking-[0.12em] sm:tracking-[0.2em] md:tracking-[0.3em] font-display whitespace-nowrap leading-none" }, "QUICK TASKS"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setIsManageCategoriesOpen(true),
      className: "text-cream-light/35 hover:text-primary transition-colors flex items-center justify-center p-0.5",
      title: "Manage Categories"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm md:text-base leading-none" }, "tune")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        setIsSelectionMode((prev) => !prev);
        setSelectedTasks([]);
      },
      className: `text-cream-light/35 hover:text-primary transition-colors flex items-center justify-center p-0.5 ${isSelectionMode ? "text-primary" : ""}`,
      title: isSelectionMode ? "Exit Selection" : "Select Tasks"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm md:text-base leading-none" }, isSelectionMode ? "close" : "checklist")
  )), /* @__PURE__ */ React.createElement("div", { id: "quick_tasks_view_mode_bar", className: "quick-tasks-view-mode-bar flex items-center gap-1.5 mt-1 leading-none" }, /* @__PURE__ */ React.createElement("span", { className: "text-[8px] md:text-[9px] font-bold text-cream-light/45 uppercase tracking-widest leading-none" }, viewMode === "daily" ? "Daily Breakdown View" : viewMode === "notepad" ? "Date Notepad View" : viewMode === "categories" ? "Category Notepad View" : "Standard View"), /* @__PURE__ */ React.createElement("span", { className: "text-white/20 text-[8px] md:text-[9px] leading-none select-none" }, "\u2022"), /* @__PURE__ */ React.createElement(
    Link,
    {
      to: searchQuery ? `/quick-tasks?search=${encodeURIComponent(searchQuery)}` : "/quick-tasks",
      className: "text-[8px] md:text-[9px] font-bold text-primary/70 uppercase tracking-widest hover:text-primary transition-colors inline-flex items-center gap-0.5 w-max active:scale-95 leading-none"
    },
    /* @__PURE__ */ React.createElement("span", null, "View All"),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[10px] leading-none" }, "chevron_right")
  ))), /* @__PURE__ */ React.createElement("div", { className: "h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent min-w-[8px]" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 md:gap-3 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center bg-white/[0.03] p-1 rounded-full border border-white/10 backdrop-blur-md shadow-inner gap-0.5 shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("standard"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "standard" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Standard Grouped View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "format_list_bulleted")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("daily"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "daily" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Daily Breakdown View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "calendar_month")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("notepad"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "notepad" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Date Notepad View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "sticky_note_2")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("categories"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "categories" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Category Notepad View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "category")
  )))), isLoading ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4 md:mb-5 -mx-4 px-4 md:mx-0 md:px-0" }, /* @__PURE__ */ React.createElement("div", { className: "h-8 w-14 rounded-full shimmer border border-white/5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "h-8 w-20 rounded-full shimmer border border-white/5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "h-8 w-16 rounded-full shimmer border border-white/5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "h-8 w-14 rounded-full shimmer border border-white/5 flex-shrink-0" })) : /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4 md:mb-5 -mx-4 px-4 md:mx-0 md:px-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedCategory("ALL"),
      className: `h-8 px-3.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] font-montserrat transition-all duration-200 whitespace-nowrap flex items-center justify-center active:scale-95 ${selectedCategory === "ALL" ? "bg-primary/20 text-primary border border-primary/40 shadow-sm shadow-primary/10 active:bg-primary/30" : "bg-white/[0.04] hover:bg-white/[0.08] hover:border-primary/30 hover:text-primary text-cream-light/50 border border-white/[0.08] active:bg-white/[0.1] active:border-primary/40 active:text-primary"}`
    },
    "All"
  ), allCategories.map((cat) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: cat,
      onClick: () => setSelectedCategory(cat),
      className: `h-8 px-3.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] font-montserrat transition-all duration-200 whitespace-nowrap flex items-center justify-center active:scale-95 ${selectedCategory === cat ? "bg-primary/20 text-primary border border-primary/40 shadow-sm shadow-primary/10 active:bg-primary/30" : "bg-white/[0.04] hover:bg-white/[0.08] hover:border-primary/30 hover:text-primary text-cream-light/50 border border-white/[0.08] active:bg-white/[0.1] active:border-primary/40 active:text-primary"}`
    },
    cat
  )), isAddingCategory ? /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: (el) => {
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
            if (el.parentElement) el.parentElement.scrollTo({ left: el.parentElement.scrollWidth, behavior: "smooth" });
          }, 30);
        }
      },
      className: "h-8 px-3 rounded-full bg-white/[0.04] border border-primary/40 flex items-center gap-1.5 flex-shrink-0"
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        autoFocus: true,
        value: newCategoryName,
        onChange: (e) => setNewCategoryName(e.target.value.toUpperCase()),
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCreateCategory();
          }
          if (e.key === "Escape") setIsAddingCategory(false);
        },
        placeholder: "Category...",
        className: "bg-transparent border-none text-[10px] md:text-xs text-cream-light focus:ring-0 w-20 md:w-24 p-0 font-montserrat placeholder:text-white/30 leading-none outline-none"
      }
    ),
    /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleCreateCategory(), className: "text-primary hover:text-primary-light flex items-center justify-center p-0.5", title: "Save" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm font-bold" }, "check")),
    /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsAddingCategory(false), className: "text-white/40 hover:text-white flex items-center justify-center p-0.5", title: "Cancel" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "close"))
  ) : /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        var _a;
        const parent = (_a = e.currentTarget) == null ? void 0 : _a.parentElement;
        setIsAddingCategory(true);
        setTimeout(() => {
          if (parent) parent.scrollTo({ left: parent.scrollWidth, behavior: "smooth" });
        }, 30);
      },
      className: "h-8 px-3 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] font-montserrat text-primary/70 hover:text-primary bg-white/[0.02] hover:bg-primary/15 border border-white/10 hover:border-primary/30 transition-all duration-200 whitespace-nowrap flex items-center gap-1",
      title: "Add Category"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "add"),
    "New"
  )), /* @__PURE__ */ React.createElement("section", { className: "space-y-8 mb-10 md:mb-12" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, isLoading ? /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "h-3 w-16 shimmer rounded-full" }), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/10" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [...Array(3)].map((_, i) => /* @__PURE__ */ React.createElement(SkeletonQuickTask, { key: i })))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "h-3 w-20 shimmer rounded-full" }), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/10" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [...Array(2)].map((_, i) => /* @__PURE__ */ React.createElement(SkeletonQuickTask, { key: i }))))) : filteredQuickTasks.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass-panel p-10 rounded-3xl text-center border-dashed border-white/5" }, /* @__PURE__ */ React.createElement("p", { className: "text-white/20 text-sm font-bold uppercase tracking-widest" }, searchQuery ? "No matching quick tasks found" : selectedCategory !== "ALL" ? `No tasks in ${selectedCategory}` : "No quick tasks yet")) : /* @__PURE__ */ React.createElement("div", { className: "skeleton-fade-in" }, viewMode === "notepad" || viewMode === "categories" ? /* @__PURE__ */ React.createElement(
    QuickTasksNotepadView,
    {
      tasks: sortedQuickTasks,
      onToggle: onToggleQuickTask,
      onSaveToNotes: handleSaveQuickTasksToNotes,
      onAddQuickTask: onAddQuickTaskClick,
      onEditQuickTask,
      onDelete: onDeleteQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      groupBy: viewMode === "categories" ? "category" : "date",
      categoriesOrder: allCategories,
      isSelectionMode,
      selectedTasks,
      onSelectToggle: handleToggleSelectTask,
      onToggleSelectionMode: () => {
        setIsSelectionMode((prev) => {
          if (prev) setSelectedTasks([]);
          return !prev;
        });
      }
    }
  ) : viewMode === "daily" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, dailyQuickTasks.sections.map((section) => /* @__PURE__ */ React.createElement("div", { key: section.key, className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: `text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] ${section.isPastDue ? "text-red-400" : "text-primary/70"}` }, section.label), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/10" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-white/30 font-bold font-montserrat" }, "(", section.items.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, section.items.map((task) => /* @__PURE__ */ React.createElement(
    QuickTaskItem,
    {
      key: task.id,
      task,
      onToggle: isSelectionMode ? null : onToggleQuickTask,
      onDelete: onDeleteQuickTask,
      onEdit: onEditQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      hideDateSubtitle: true,
      isSelectionMode,
      isSelected: selectedTasks.includes(task.id),
      onSelectToggle: handleToggleSelectTask,
      viewMode: "daily"
    }
  )))))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, activeHomepageSections.map((section) => /* @__PURE__ */ React.createElement("div", { key: section.key, className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h3", { className: `text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] ${section.key === "pastDue" ? "text-red-400" : "text-primary/70"}` }, section.label), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/10" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-white/30 font-bold font-montserrat" }, "(", section.items.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, section.items.map((task) => /* @__PURE__ */ React.createElement(
    QuickTaskItem,
    {
      key: task.id,
      task,
      onToggle: isSelectionMode ? null : onToggleQuickTask,
      onDelete: onDeleteQuickTask,
      onEdit: onEditQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      isSelectionMode,
      isSelected: selectedTasks.includes(task.id),
      onSelectToggle: handleToggleSelectTask,
      viewMode: "standard"
    }
  )))))))), /* @__PURE__ */ React.createElement("div", { className: "px-0 md:px-0 mt-8 md:mt-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-6 md:mb-10" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg md:text-2xl font-bold text-cream-light/90 uppercase tracking-[0.2em] md:tracking-[0.3em] font-display" }, "ALARMS"), /* @__PURE__ */ React.createElement("div", { className: "h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/alarms"),
      className: "text-[10px] font-bold text-primary/60 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
    },
    "View All",
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "chevron_right")
  )), /* @__PURE__ */ React.createElement("section", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8 mb-20 md:mb-24" }, todayAlarms.length > 0 ? todayAlarms.slice(0, 3).map(({ alarm, date }) => {
    var _a;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: alarm.id,
        className: "glass-panel-dark rounded-[1.75rem] md:rounded-[2rem] p-6 flex flex-col justify-between group hover:border-primary/20 transition-all border border-white/5 shadow-2xl"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-2xl", style: { fontVariationSettings: '"FILL" 1' } }, "alarm")), /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline gap-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-3xl md:text-4xl font-display font-medium text-cream-light tracking-tighter tabular-nums leading-none" }, formatTime(alarm.time)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary uppercase tracking-widest leading-none opacity-80" }, ((_a = alarm.time) == null ? void 0 : _a.includes("PM")) ? "PM" : "AM"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end shrink-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary/50 uppercase tracking-widest" }, alarm.label || "Alarm"), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold text-cream-light/30 uppercase tracking-widest mt-1" }, "Today")))
    );
  }) : /* @__PURE__ */ React.createElement("div", { className: "col-span-full rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-16 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-cream-light/55" }, "No enabled alarms left for today."), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-primary/55 uppercase tracking-[0.2em] mt-2" }, "Manage your schedule in Alarms page"))))))), isManageCategoriesOpen && /* @__PURE__ */ React.createElement(
    ManageQuickTaskCategoriesModal,
    {
      categories: allCategories,
      quickTasks: quickTasks2,
      onClose: () => setIsManageCategoriesOpen(false),
      onDeleteCategory: handleDeleteCategory,
      onAddCategory: handleCreateCategory,
      onReorderCategories: handleReorderCategories,
      visibleSections,
      onToggleVisibleSection: handleToggleVisibleSection
    }
  ), isSelectionMode && /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-lg bg-[#0e0603]/95 border border-primary/30 rounded-3xl p-3 md:p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300 font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 pl-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs md:text-sm font-bold text-cream-light" }, selectedTasks.length, " ", /* @__PURE__ */ React.createElement("span", { className: "text-white/40 font-normal" }, "selected")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleSelectAll,
      className: "text-[11px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider underline"
    },
    selectedTasks.length === filteredQuickTasks.length ? "Deselect All" : "Select All"
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: selectedTasks.length === 0,
      onClick: () => setShowBatchDeadlineModal(true),
      className: `w-9 h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition-all ${selectedTasks.length > 0 ? "bg-white/10 hover:bg-white/15 text-cream-light active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"}`,
      title: "Change deadline of selected"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "calendar_today")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: selectedTasks.length === 0,
      onClick: () => setShowAssignCategorySheet(true),
      className: `w-9 h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition-all ${selectedTasks.length > 0 ? "bg-white/10 hover:bg-white/15 text-cream-light active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"}`,
      title: "Assign category to selected"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "label")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: selectedTasks.length === 0,
      onClick: () => setPendingDeleteBatch(true),
      className: `w-9 h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition-all ${selectedTasks.length > 0 ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"}`,
      title: "Delete selected"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "delete")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        setIsSelectionMode(false);
        setSelectedTasks([]);
      },
      className: "w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 flex items-center justify-center transition-all active:scale-95",
      title: "Exit selection"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "close")
  ))), pendingDeleteBatch && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md z-[2050] flex items-center justify-center p-6 animate-in fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 text-center animate-in zoom-in-95 duration-300 font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-red-400 text-3xl" }, "warning")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light mb-3" }, "Delete ", selectedTasks.length, " ", selectedTasks.length === 1 ? "Task" : "Tasks", "?"), /* @__PURE__ */ React.createElement("p", { className: "text-white/60 text-xs leading-relaxed mb-8" }, "Are you sure you want to delete ", selectedTasks.length, " selected quick ", selectedTasks.length === 1 ? "task" : "tasks", "?"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleConfirmBatchDelete,
      className: "w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-500/20"
    },
    "Delete ",
    selectedTasks.length,
    " ",
    selectedTasks.length === 1 ? "Task" : "Tasks"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingDeleteBatch(false),
      className: "w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all"
    },
    "Cancel"
  )))), showAssignCategorySheet && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-[2050] flex items-end justify-center animate-in fade-in duration-200",
      onClick: () => setShowAssignCategorySheet(false)
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-full max-w-lg bg-[#120804] border border-white/10 rounded-t-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 font-montserrat",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: "w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" }),
      /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-4" }, "Assign category to ", selectedTasks.length, " task", selectedTasks.length !== 1 ? "s" : ""),
      /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, allCategories.map((cat) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: cat,
          onClick: () => handleAssignCategory(cat),
          className: "h-9 px-4 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] bg-white/[0.04] hover:bg-primary/20 hover:text-primary border border-white/10 hover:border-primary/40 text-cream-light/70 transition-all active:scale-95"
        },
        cat
      ))),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowAssignCategorySheet(false),
          className: "mt-5 w-full py-3 bg-white/5 hover:bg-white/10 text-white/50 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
        },
        "Cancel"
      )
    )
  ), /* @__PURE__ */ React.createElement(
    BatchDeadlineModal,
    {
      isOpen: showBatchDeadlineModal,
      onClose: () => setShowBatchDeadlineModal(false),
      onApply: handleBatchChangeDeadline,
      count: selectedTasks.length
    }
  ));
};
const NotesPage = React.memo(({ user, notes: notes2, onOpenCreator, onEditNote, noteSections, onAddSection, onDeleteSection, onMoveNote, onReorderNote, onRemoveReminder, onBulkUpdate, onBulkDelete, isProbing, isFirstSyncDone, pomodoroTime, isPomodoroActive }) => {
  const navigate = useNavigate();
  const pinnedNotes = notes2.filter((n) => n.isPinned);
  const [labelFilter, setLabelFilter] = useState("");
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [pendingDeleteSection, setPendingDeleteSection] = useState(null);
  const [pendingDeleteNotes, setPendingDeleteNotes] = useState([]);
  const longPressTimer = useRef(null);
  const dropdownRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [localNotes, setLocalNotes] = useState(notes2);
  const dragRef = useRef(null);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const selectionMode = selectedNotes.length > 0;
  useEffect(() => {
    if (selectedNotes.length > 0) {
      window.__faioraClearNotesSelection = () => setSelectedNotes([]);
    } else {
      window.__faioraClearNotesSelection = null;
    }
    return () => {
      window.__faioraClearNotesSelection = null;
    };
  }, [selectedNotes.length]);
  const pointerHandledRef = useRef(false);
  const geometryRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const [selectionPopup, setSelectionPopup] = useState(null);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [newLabelText, setNewLabelText] = useState("");
  const isLoading = isProbing || !isFirstSyncDone || isPullRefreshing;
  const handleRefresh = async () => {
    if (navigator.vibrate) try {
      navigator.vibrate([10, 30, 10]);
    } catch (err) {
    }
    setIsPullRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 750));
    setIsPullRefreshing(false);
  };
  useEffect(() => {
    const handleCloseInternal = () => {
      setShowLabelDropdown(false);
      setShowAddSection(false);
      setPendingDeleteSection(null);
      setPendingDeleteNotes([]);
      setSelectionPopup(null);
    };
    window.addEventListener("faiora-close-popups", handleCloseInternal);
    return () => window.removeEventListener("faiora-close-popups", handleCloseInternal);
  }, []);
  const handleSetShowLabelDropdown = (val) => {
    if (val) window.history.pushState({ modal: "notes", popup: "label" }, "");
    setShowLabelDropdown(val);
  };
  const handleSetShowAddSection = (val) => {
    if (val) window.history.pushState({ modal: "notes", popup: "section" }, "");
    setShowAddSection(val);
  };
  const handleSetPendingDeleteSection = (val) => {
    if (val) window.history.pushState({ modal: "notes", popup: "delete" }, "");
    setPendingDeleteSection(val);
  };
  const handleSetPendingDeleteNotes = (noteIds) => {
    if (noteIds && noteIds.length > 0) window.history.pushState({ modal: "notes", popup: "delete-notes" }, "");
    setPendingDeleteNotes(noteIds || []);
  };
  const handleSetSelectionPopup = (val) => {
    if (val) window.history.pushState({ modal: "notes", popup: "selection" }, "");
    setSelectionPopup(val);
  };
  const lastSyncRef = useRef("");
  useEffect(() => {
    const currentSync = JSON.stringify(notes2.map((n) => ({ id: n.id, updatedAt: n.updatedAt, section: n.section, labels: n.labels })));
    if (!dragState && currentSync !== lastSyncRef.current) {
      lastSyncRef.current = currentSync;
      setLocalNotes(notes2);
    }
  }, [notes2, dragState]);
  const allLabels = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    notes2.forEach((n) => (n.labels || []).forEach((l) => set.add(l)));
    if (set.size === 0) {
      set.add("PERSONAL");
      set.add("WORK");
    }
    return Array.from(set).sort();
  }, [notes2]);
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const searchQuery = queryParams.get("search") || "";
  const matchesFilter = (note) => {
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = parseDateString(dateStr);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${shortMonths[d.getMonth()]}`;
    };
    const searchableText = [
      note.title,
      note.content,
      (note.labels || []).join(" "),
      note.section,
      note.reminderDate,
      formatDate(note.reminderDate),
      note.noteIcon
    ].filter(Boolean).join(" ").toLowerCase();
    if (searchQuery && !searchableText.includes(searchQuery.toLowerCase())) return false;
    if (!labelFilter) return true;
    return (note.labels || []).includes(labelFilter);
  };
  const unpinnedNotes = notes2.filter((n) => !n.isPinned);
  const sectionNotes = (sectionName) => unpinnedNotes.filter((n) => (n.section || "") === sectionName && matchesFilter(n));
  const allNotesUnsectioned = unpinnedNotes.filter((n) => !n.section && matchesFilter(n));
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) handleSetShowLabelDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.closest('[contenteditable="true"]')) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);
  const gestureRef = useRef({ active: false, activated: false, scrolling: false });
  const findScrollParent = (el) => {
    let node = el ? el.parentElement : null;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      if ((style.overflowY === "auto" || style.overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return document.documentElement;
  };
  useEffect(() => {
    return () => {
      if (dragRef.current && dragRef.current.cloneEl) dragRef.current.cloneEl.remove();
    };
  }, []);
  const docMoveRef = useRef(null);
  const docEndRef = useRef(null);
  const docTouchRef = useRef(null);
  const removeDocListeners = () => {
    if (docMoveRef.current) document.removeEventListener("pointermove", docMoveRef.current);
    if (docEndRef.current) {
      document.removeEventListener("pointerup", docEndRef.current);
      document.removeEventListener("pointercancel", docEndRef.current);
    }
    if (docTouchRef.current) document.removeEventListener("touchmove", docTouchRef.current);
    docMoveRef.current = null;
    docEndRef.current = null;
    docTouchRef.current = null;
  };
  const handlePointerDown = (noteId, e) => {
    const cardEl = e.currentTarget;
    const { clientX, clientY, pointerId } = e;
    gestureRef.current = {
      active: true,
      activated: false,
      scrolling: false,
      pointerId,
      cardEl,
      noteId,
      startX: clientX,
      startY: clientY,
      lastY: clientY
    };
    const onMove = (ev) => {
      const gs = gestureRef.current;
      if (!gs.active) return;
      const { clientX: mx, clientY: my } = ev;
      if (gs.scrolling) return;
      if (!gs.activated) {
        if (Math.abs(mx - gs.startX) > 15 || Math.abs(my - gs.startY) > 15) {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          gs.scrolling = true;
          gs.active = false;
          try {
            gs.cardEl.releasePointerCapture(gs.pointerId);
          } catch (err) {
          }
          removeDocListeners();
        }
        return;
      }
      if (ev.cancelable) ev.preventDefault();
      handlePointerMoveCore(mx, my);
    };
    const onEnd = (ev) => {
      handlePointerEndCore(ev);
      removeDocListeners();
    };
    const onTouch = (ev) => {
      var _a;
      if (((_a = gestureRef.current) == null ? void 0 : _a.activated) && ev.cancelable) ev.preventDefault();
    };
    removeDocListeners();
    docMoveRef.current = onMove;
    docEndRef.current = onEnd;
    docTouchRef.current = onTouch;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
    document.addEventListener("touchmove", onTouch, { passive: false });
    if (selectionMode) return;
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) try {
        navigator.vibrate(50);
      } catch (err) {
      }
      gestureRef.current.activated = true;
      try {
        cardEl.setPointerCapture(pointerId);
      } catch (err) {
      }
      const initialNote = notes2.find((n) => n.id === noteId);
      const initialSection = initialNote ? initialNote.isPinned ? "__pinned" : initialNote.section || "" : "";
      const scrollParent = findScrollParent(cardEl);
      const currentScroll = scrollParent.scrollTop;
      const sections = [];
      document.querySelectorAll("[data-drop-section]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        sections.push({
          el,
          sect: el.getAttribute("data-drop-section"),
          absTop: rect.top + currentScroll,
          absBottom: rect.bottom + currentScroll,
          absLeft: rect.left,
          absRight: rect.right
        });
      });
      const noteElements = [];
      document.querySelectorAll("[data-note-id]").forEach((el) => {
        const nid = el.getAttribute("data-note-id");
        if (nid !== noteId) {
          const rect = el.getBoundingClientRect();
          const sectEl = el.closest("[data-drop-section]");
          noteElements.push({
            nid,
            sect: sectEl ? sectEl.getAttribute("data-drop-section") : "",
            absCenterX: rect.left + rect.width / 2,
            absCenterY: rect.top + rect.height / 2 + currentScroll
          });
        }
      });
      geometryRef.current = { sections, noteElements, scrollParent };
      dragRef.current = {
        noteId,
        initialSection,
        cardEl,
        startX: clientX,
        startY: clientY,
        cloneCreated: false,
        cloneEl: null,
        originalEl: cardEl,
        offsetX: 0,
        offsetY: 0,
        didMove: false
      };
      cardEl.style.transform = "scale(0.97)";
      cardEl.style.transition = "transform 0.15s ease";
    }, 350);
  };
  const handlePointerMoveCore = (mx, my) => {
    const state = dragRef.current;
    if (!state) return;
    if (!state.cloneCreated && (Math.abs(mx - state.startX) > 5 || Math.abs(my - state.startY) > 5)) {
      state.cloneCreated = true;
      state.didMove = true;
      const gs = gestureRef.current;
      const rect = gs.cardEl.getBoundingClientRect();
      const cloneEl = gs.cardEl.cloneNode(true);
      document.body.style.cursor = "grabbing";
      cloneEl.className = "drag-clone fixed z-[9999] pointer-events-none transition-transform duration-100 ease-out";
      cloneEl.style.width = rect.width + "px";
      cloneEl.style.height = rect.height + "px";
      cloneEl.style.opacity = "0.9";
      cloneEl.style.filter = "drop-shadow(0 20px 40px rgba(0,0,0,0.4))";
      cloneEl.style.left = mx - (mx - rect.left) + "px";
      cloneEl.style.top = my - (my - rect.top) + "px";
      cloneEl.style.borderRadius = "24px";
      cloneEl.style.pointerEvents = "none";
      cloneEl.style.transform = "scale(0.95)";
      document.body.appendChild(cloneEl);
      state.cloneEl = cloneEl;
      state.offsetX = mx - rect.left;
      state.offsetY = my - rect.top;
      gs.cardEl.style.opacity = "0.3";
      gs.cardEl.style.transform = "scale(0.95)";
      document.querySelectorAll("[data-drop-section]").forEach((el) => {
        el.style.outline = "2px dashed rgba(249, 115, 22, 0.4)";
        el.style.outlineOffset = "4px";
        el.style.borderRadius = "1.5rem";
        el.style.transition = "outline 0.2s, background 0.2s";
      });
    }
    if (!state.cloneCreated) return;
    requestAnimationFrame(() => {
      if (state.cloneEl) {
        state.cloneEl.style.left = mx - state.offsetX + "px";
        state.cloneEl.style.top = my - state.offsetY + "px";
        state.cloneEl.style.transform = "scale(1.05) rotate(1deg)";
      }
    });
    const geo = geometryRef.current;
    if (geo && geo.scrollParent) {
      const threshold = 120;
      const viewHeight = window.innerHeight;
      if (my < threshold) {
        geo.scrollParent.scrollTop -= 15;
      } else if (my > viewHeight - threshold) {
        geo.scrollParent.scrollTop += 15;
      }
    }
    const currentScroll = geo ? geo.scrollParent.scrollTop : 0;
    const absoluteMy = my + currentScroll;
    const absoluteMx = mx;
    let hoveredSect = null;
    const isDraggingPinned = state.initialSection === "__pinned";
    if (geo && geo.sections) {
      geo.sections.forEach((s) => {
        const isTargetPinned = s.sect === "__pinned";
        if (isDraggingPinned !== isTargetPinned) return;
        if (absoluteMx >= s.absLeft && absoluteMx <= s.absRight && absoluteMy >= s.absTop && absoluteMy <= s.absBottom) {
          hoveredSect = s.sect;
          s.el.style.background = "rgba(249, 115, 22, 0.05)";
          s.el.style.outline = "2px dashed rgba(249, 115, 22, 0.4)";
        } else {
          s.el.style.background = "";
          s.el.style.outline = "";
        }
      });
    }
    let hoveredNoteId = null;
    if (hoveredSect !== null && geo && geo.noteElements) {
      geo.noteElements.forEach((n) => {
        if (n.sect !== hoveredSect) return;
        const dx = absoluteMx - n.absCenterX;
        const dy = absoluteMy - n.absCenterY;
        if (Math.sqrt(dx * dx + dy * dy) < 90) hoveredNoteId = n.nid;
      });
    }
    const now = Date.now();
    if (now - lastUpdateRef.current > 60 && (hoveredNoteId || hoveredSect !== null)) {
      lastUpdateRef.current = now;
      setLocalNotes((prev) => {
        let next = [...prev];
        let changed = false;
        const ni = next.findIndex((n) => n.id === state.noteId);
        if (ni === -1) return prev;
        if (hoveredNoteId) {
          const ti = next.findIndex((n) => n.id === hoveredNoteId);
          if (ti !== -1 && ni !== ti) {
            const [rm] = next.splice(ni, 1);
            next.splice(ti, 0, rm);
            changed = true;
          }
        }
        const curIdx = next.findIndex((n) => n.id === state.noteId);
        if (curIdx > -1 && hoveredSect !== null) {
          const note = next[curIdx];
          const targetIsPinned = hoveredSect === "__pinned";
          const targetSect = targetIsPinned ? note.section || "" : hoveredSect;
          if ((note.section || "") !== targetSect || !!note.isPinned !== targetIsPinned) {
            next[curIdx] = { ...note, section: targetSect, isPinned: targetIsPinned };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  };
  const cleanupDrag = () => {
    const state = dragRef.current;
    const gs = gestureRef.current;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.body.classList.remove("dragging-active");
    document.querySelectorAll(".drag-clone").forEach((el) => el.remove());
    if (state && state.cloneEl) state.cloneEl.remove();
    if (state && state.originalEl) {
      state.originalEl.style.opacity = "";
      state.originalEl.style.transform = "";
      state.originalEl.style.transition = "";
      state.originalEl.classList.remove("dragging-source");
    }
    document.querySelectorAll("[data-drop-section]").forEach((el) => {
      el.style.background = "";
      el.style.outline = "";
    });
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    gs.active = false;
    gs.activated = false;
    gs.scrolling = false;
    dragRef.current = null;
    setDragState(null);
    removeDocListeners();
  };
  const handlePointerEndCore = (e) => {
    const gs = gestureRef.current;
    if (!gs.active) return;
    try {
      gs.cardEl.releasePointerCapture(gs.pointerId);
    } catch (err) {
    }
    const state = dragRef.current;
    if (state && state.cloneCreated && state.didMove) {
      setLocalNotes((currentLocal) => {
        const finalNote = currentLocal.find((n) => n.id === state.noteId);
        const originalNote = notes2.find((n) => n.id === state.noteId);
        if (finalNote && originalNote && ((finalNote.section || "") !== (originalNote.section || "") || !!finalNote.isPinned !== !!originalNote.isPinned)) {
          onBulkUpdate(state.noteId, { section: finalNote.section || "", isPinned: !!finalNote.isPinned });
        }
        const finalIdx = currentLocal.findIndex((n) => n.id === state.noteId);
        if (finalIdx > -1) {
          const targetIdx = finalIdx > 0 ? finalIdx - 1 : 0;
          const targetId = currentLocal[targetIdx].id;
          if (targetId !== state.noteId) {
            onReorderNote(state.noteId, targetId);
          } else if (currentLocal.length > 1) {
            onReorderNote(state.noteId, currentLocal[1].id);
          }
        }
        return currentLocal;
      });
    } else if (!gs.scrolling) {
      if (selectionMode || gs.activated) {
        pointerHandledRef.current = true;
        toggleNoteSelection(gs.noteId);
      }
    }
    cleanupDrag();
  };
  useEffect(() => {
    return () => {
      cleanupDrag();
      removeDocListeners();
    };
  }, []);
  const handleAddSectionSubmit = () => {
    if (newSectionName.trim()) {
      onAddSection(newSectionName);
      setNewSectionName("");
      handleSetShowAddSection(false);
    }
  };
  const toggleNoteSelection = (noteId) => {
    setSelectedNotes((prev) => {
      const next = prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      if (next.length > 0) {
        window.dispatchEvent(new CustomEvent("faiora-close-popups"));
      }
      return next;
    });
  };
  const bulkTogglePin = () => {
    const allPinned = selectedNotes.every((id) => {
      const n = notes2.find((note) => note.id === id);
      return n && n.isPinned;
    });
    selectedNotes.forEach((id) => {
      const n = notes2.find((note) => note.id === id);
      if (n) onBulkUpdate(id, { isPinned: !allPinned });
    });
    setSelectedNotes([]);
  };
  const bulkDelete = () => {
    if (!selectedNotes.length) return;
    handleSetSelectionPopup(null);
    handleSetPendingDeleteNotes([...selectedNotes]);
  };
  const confirmBulkDelete = () => {
    if (!pendingDeleteNotes.length) return;
    pendingDeleteNotes.forEach((id) => onBulkDelete(id));
    setSelectedNotes([]);
    handleSetPendingDeleteNotes([]);
  };
  const bulkDuplicate = () => {
    selectedNotes.forEach((id) => {
      const n = notes2.find((note) => note.id === id);
      if (n) {
        const dup = { ...n, id: "note_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5), title: n.title + " (Copy)", isPinned: false };
        onBulkUpdate(dup.id, dup, true);
      }
    });
    if (showToast && selectedNotes.length > 0) {
      showToast(selectedNotes.length === 1 ? "Note duplicated" : `${selectedNotes.length} notes duplicated`);
    }
    setSelectedNotes([]);
  };
  const bulkApplyPalette = (themeId) => {
    selectedNotes.forEach((id) => {
      onBulkUpdate(id, { noteTheme: themeId });
    });
    handleSetSelectionPopup(null);
    setSelectedNotes([]);
  };
  const bulkShare = () => {
    if (selectedNotes.length !== 1) {
      if (showToast) showToast("Select exactly one note to share.");
      return;
    }
    const noteId = selectedNotes[0];
    const note = (notes2 || []).find((n) => n.id === noteId);
    if (note) {
      window.dispatchEvent(new CustomEvent("faiora-close-popups"));
      const updates = { publicView: true };
      if (!(note.publicView && note.allowPublicEdit)) {
        updates.allowPublicEdit = false;
      }
      onBulkUpdate(noteId, updates);
      const shareLink = `https://zeamarae.github.io/Faiora/#/share_note.html?id=${noteId}`;
      navigator.clipboard.writeText(shareLink).then(() => {
        if (showToast) showToast("Public link copied to clipboard!");
        setSelectedNotes([]);
      });
    }
  };
  const bulkApplyLabel = (label) => {
    selectedNotes.forEach((id) => {
      const n = notes2.find((note) => note.id === id);
      if (n) {
        const newLabels = (n.labels || []).includes(label) ? n.labels : [...n.labels || [], label];
        onBulkUpdate(id, { labels: newLabels });
      }
    });
    handleSetSelectionPopup(null);
    setNewLabelText("");
    setSelectedNotes([]);
  };
  const bulkSetReminder = () => {
    const dateStr = prompt("Enter reminder date (YYYY-MM-DD):");
    if (dateStr) {
      selectedNotes.forEach((id) => {
        onBulkUpdate(id, { reminderDate: dateStr + "T08:00" });
      });
      setSelectedNotes([]);
    }
  };
  const themes = [
    { id: "glass", color: "rgba(255,255,255,0.05)" },
    { id: "peach", color: "#ffedd5" },
    { id: "amber", color: "#fef3c7" },
    { id: "orange", color: "#ffedd5" },
    { id: "yellow", color: "#fef9c3" },
    { id: "warm1", color: "#e9d9c4" },
    { id: "warm2", color: "#e9e5d8" },
    { id: "warm3", color: "#e9e2da" },
    { id: "warm4", color: "#e8c59d" },
    { id: "warm5", color: "#e9e6d5" },
    { id: "sage", color: "#ecfdf5" },
    { id: "sky", color: "#e0f2fe" },
    { id: "lavender", color: "#eef2ff" },
    { id: "rose", color: "#fff1f2" },
    { id: "slate", color: "#f1f5f9" },
    { id: "teal", color: "#f0fdfa" },
    { id: "indigo", color: "#f5f3ff" }
  ];
  const renderNoteSkeletonGrid = (count = 4) => {
    const isSingleOnly = count === 1;
    const gridClass = isSingleOnly ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8" : "grid grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-8";
    const numSkeletons = isSingleOnly ? 1 : 4;
    return /* @__PURE__ */ React.createElement("div", { className: gridClass }, [...Array(numSkeletons)].map((_, i) => /* @__PURE__ */ React.createElement(SkeletonNoteCard, { key: i, index: i, variant: isSingleOnly ? "full" : "compact" })));
  };
  const renderNoteGrid = (notesList, gridClass, currentSection = null) => {
    const count = notesList.length;
    const activeGridClass = gridClass || (count >= 2 ? "grid grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-8" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8");
    const sourceNoteId = dragState ? dragState.noteId : null;
    return /* @__PURE__ */ React.createElement("div", { className: `${activeGridClass} skeleton-fade-in` }, notesList.map((note, index) => {
      const isDragged = note.id === sourceNoteId;
      if (isDragged) {
        const isHomeSection = currentSection === (dragState.initialSection || "");
        const isTargetSection = note.isPinned ? currentSection === "__pinned" : currentSection === (note.section || "");
        return /* @__PURE__ */ React.createElement(React.Fragment, { key: note.id }, isHomeSection && /* @__PURE__ */ React.createElement(
          "div",
          {
            "data-note-id": note.id,
            onPointerDown: (e) => handlePointerDown(note.id, e),
            className: "opacity-0 w-0 h-0 pointer-events-none overflow-hidden absolute"
          }
        ), isTargetSection && /* @__PURE__ */ React.createElement("div", { className: `border-2 border-dashed border-primary/20 rounded-3xl flex flex-col items-center justify-center bg-primary/5 transition-all animate-pulse overflow-hidden relative group/placeholder min-h-[190px]` }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" }), /* @__PURE__ */ React.createElement("span", { className: `material-symbols-outlined text-primary/30 relative z-10 transition-transform text-4xl mb-2 scale-110 group-hover/placeholder:scale-125` }, "add_circle"), /* @__PURE__ */ React.createElement("p", { className: "text-primary/20 text-[10px] uppercase tracking-[0.2em] font-bold relative z-10" }, "Land Here")));
      }
      const isSelected = selectedNotes.includes(note.id);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: note.id,
          "data-note-id": note.id,
          onPointerDown: (e) => handlePointerDown(note.id, e),
          onContextMenu: (e) => e.preventDefault(),
          onClick: () => {
            if (pointerHandledRef.current) {
              pointerHandledRef.current = false;
              return;
            }
            if (selectedNotes.length > 0) {
              toggleNoteSelection(note.id);
            } else if (!dragRef.current || !dragRef.current.didMove) {
              onEditNote(note);
            }
          },
          style: {
            touchAction: dragState && dragState.noteId === note.id ? "none" : "pan-y",
            cursor: selectionMode ? "pointer" : dragState ? "grabbing" : "pointer"
          },
          className: "transition-all duration-300 " + (dragState && dragState.noteId === note.id ? "z-[1000] scale-105" : "z-10")
        },
        /* @__PURE__ */ React.createElement(
          NoteCard,
          {
            note,
            index,
            onRemoveReminder,
            variant: "default",
            isSelected
          }
        )
      );
    }));
  };
  const LabelFilterDropdown = () => /* @__PURE__ */ React.createElement("div", { className: "relative", ref: dropdownRef }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetShowLabelDropdown(!showLabelDropdown),
      className: "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all " + (labelFilter ? "bg-primary/20 text-primary border-primary/30" : "text-cream-light/40 border-white/10 hover:border-white/20 hover:text-cream-light/60")
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "filter_list"),
    labelFilter || "Filter",
    labelFilter && /* @__PURE__ */ React.createElement("span", { role: "button", tabIndex: 0, onClick: (e) => {
      e.stopPropagation();
      setLabelFilter("");
      handleSetShowLabelDropdown(false);
    }, className: "ml-1 hover:text-primary-dark flex items-center cursor-pointer" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "close"))
  ), showLabelDropdown && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full mt-2 w-48 bg-slate-950/95 backdrop-blur-2xl rounded-xl border border-white/10 shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setLabelFilter("");
        handleSetShowLabelDropdown(false);
      },
      className: "w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors " + (!labelFilter ? "text-primary bg-primary/20" : "text-cream-light/40 hover:bg-white/5 hover:text-cream-light")
    },
    "All Labels"
  ), allLabels.map((label) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: label,
      onClick: () => {
        setLabelFilter(label);
        handleSetShowLabelDropdown(false);
      },
      className: "w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors " + (labelFilter === label ? "text-primary bg-primary/20" : "text-cream-light/40 hover:bg-white/5 hover:text-cream-light")
    },
    label
  )), allLabels.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "px-4 py-2 text-xs text-white/20" }, "No labels yet")));
  const handleExport = () => {
    const payload = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1,
      notes: notes2 || [],
      quickTasks: quickTasks || [],
      alarms: alarms || [],
      settings: settingsData || {},
      profile: profileData || {}
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faiora-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded!");
  };
  const handleImport = async (e) => {
    var _a, _b, _c, _d, _e;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !Array.isArray(data.notes)) {
        showToast("Invalid backup file.");
        return;
      }
      if (!window.confirm(`Import backup from ${((_b = data.exportedAt) == null ? void 0 : _b.slice(0, 10)) || "unknown date"}? This will overwrite your current data.`)) return;
      const uid = user == null ? void 0 : user.uid;
      if (!uid) {
        showToast("Not signed in.");
        return;
      }
      const coll = activeCollection || window._faiora_active_collection || `users`;
      const batch = db.batch();
      const ref = db.collection(coll).doc(uid);
      if ((_c = data.notes) == null ? void 0 : _c.length) batch.set(ref, { notes: data.notes }, { merge: true });
      if ((_d = data.quickTasks) == null ? void 0 : _d.length) batch.set(ref, { quickTasks: data.quickTasks }, { merge: true });
      if ((_e = data.alarms) == null ? void 0 : _e.length) batch.set(ref, { alarms: data.alarms }, { merge: true });
      if (data.settings) batch.set(ref, { settings: data.settings }, { merge: true });
      await batch.commit();
      showToast("Import successful! Reloading\u2026");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast("Import failed: " + (err.message || err));
    }
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, onRefresh: handleRefresh, pomodoroTime, isPomodoroActive, disablePullToRefresh: !!dragState }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto w-full px-0 md:px-16 pt-[calc(72px+env(safe-area-inset-top,0px))] md:pt-12 pb-12" }, selectionMode ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { id: "faiora_notes_selection_header", className: "faiora-notes-selection-header fixed top-0 left-0 right-0 z-[200] bg-black/95 backdrop-blur-2xl border-b border-white/10 px-4 md:px-8 flex items-center justify-center animate-mobile-header font-montserrat shadow-xl", style: { paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(54px + env(safe-area-inset-top, 0px))" } }, /* @__PURE__ */ React.createElement("div", { className: "h-[54px] flex items-center justify-between w-full max-w-7xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSelectedNotes([]), className: "text-cream-light/60 hover:text-cream-light transition-colors p-1 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5", title: "Clear selection" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xl" }, "close")), /* @__PURE__ */ React.createElement("span", { className: "text-cream-light font-bold text-base font-montserrat" }, selectedNotes.length)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5" }, (() => {
    const allPinned = selectedNotes.every((id) => {
      const n = localNotes.find((note) => note.id === id);
      return n && n.isPinned;
    });
    return /* @__PURE__ */ React.createElement("button", { onClick: bulkTogglePin, className: "w-8 h-8 rounded-lg flex items-center justify-center transition-colors " + (allPinned ? "bg-primary/20" : "hover:bg-white/10"), title: allPinned ? "Unpin" : "Pin" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg " + (allPinned ? "text-primary" : "text-cream-light/70"), style: { fontVariationSettings: allPinned ? "'FILL' 1" : "'FILL' 0" } }, "push_pin"));
  })(), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetSelectionPopup(selectionPopup === "reminder" ? null : "reminder"), className: "w-8 h-8 rounded-lg flex items-center justify-center transition-colors " + (selectionPopup === "reminder" ? "bg-white/10" : "hover:bg-white/10"), title: "Reminder" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/70 text-lg" }, "notifications")), selectionPopup === "reminder" && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full mt-2 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-widest text-cream-light/40 mb-3" }, "Set Reminder"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "datetime-local",
      className: "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-cream-light focus:outline-none focus:border-primary/40 mb-3",
      style: { colorScheme: "dark" },
      onChange: (e) => {
        if (e.target.value) {
          selectedNotes.forEach((id) => {
            onBulkUpdate(id, { reminderDate: e.target.value });
          });
          handleSetSelectionPopup(null);
          setSelectedNotes([]);
        }
      }
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const val = tomorrow.toISOString().slice(0, 16);
    selectedNotes.forEach((id) => onBulkUpdate(id, { reminderDate: val }));
    handleSetSelectionPopup(null);
    setSelectedNotes([]);
  }, className: "flex-1 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-xl py-2 hover:bg-primary/25 transition-colors" }, "Tomorrow"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    const next = /* @__PURE__ */ new Date();
    next.setDate(next.getDate() + 7);
    next.setHours(8, 0, 0, 0);
    const val = next.toISOString().slice(0, 16);
    selectedNotes.forEach((id) => onBulkUpdate(id, { reminderDate: val }));
    handleSetSelectionPopup(null);
    setSelectedNotes([]);
  }, className: "flex-1 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-xl py-2 hover:bg-primary/25 transition-colors" }, "Next Week")))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetSelectionPopup(selectionPopup === "palette" ? null : "palette"), className: "w-8 h-8 rounded-lg flex items-center justify-center transition-colors " + (selectionPopup === "palette" ? "bg-white/10" : "hover:bg-white/10"), title: "Theme" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/70 text-lg" }, "palette")), selectionPopup === "palette" && /* @__PURE__ */ React.createElement("div", { className: "absolute left-1/2 top-full mt-2 w-[min(14rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] p-4 box-border animate-in fade-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-widest text-cream-light/40 mb-3" }, "Choose Theme"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 gap-2.5" }, themes.map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.id,
      onClick: () => bulkApplyPalette(t.id),
      className: "w-9 h-9 rounded-xl border-2 border-white/10 hover:scale-110 hover:border-primary/50 transition-all shadow-md",
      style: { backgroundColor: t.color },
      title: t.id
    }
  ))))), selectedNotes.length === 1 && /* @__PURE__ */ React.createElement("button", { onClick: bulkShare, className: "w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10", title: "Share" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/70 text-lg" }, "share")), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetSelectionPopup(selectionPopup === "label" ? null : "label"), className: "w-8 h-8 rounded-lg flex items-center justify-center transition-colors " + (selectionPopup === "label" ? "bg-white/10" : "hover:bg-white/10"), title: "Label" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/70 text-lg" }, "label")), selectionPopup === "label" && /* @__PURE__ */ React.createElement("div", { className: "absolute left-1/2 top-full mt-2 w-[min(14rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] p-4 box-border animate-in fade-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-widest text-cream-light/40 mb-3" }, "Add Label"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: newLabelText,
      onChange: (e) => setNewLabelText(e.target.value.toUpperCase()),
      onKeyDown: (e) => {
        if (e.key === "Enter" && newLabelText.trim()) {
          bulkApplyLabel(newLabelText.trim());
        }
      },
      placeholder: "Type label...",
      className: "flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-cream-light placeholder:text-white/20 focus:outline-none focus:border-primary/40 uppercase tracking-wider font-bold",
      style: { caretColor: "#f97316" },
      autoFocus: true
    }
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    if (newLabelText.trim()) bulkApplyLabel(newLabelText.trim());
  }, className: "p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "add_circle"))), allLabels.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "border-t border-white/5 pt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold uppercase tracking-widest text-cream-light/25 mb-2" }, "Existing Labels"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, allLabels.map((l) => /* @__PURE__ */ React.createElement("button", { key: l, onClick: () => bulkApplyLabel(l), className: "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-colors border border-primary/20" }, l)))))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetSelectionPopup(selectionPopup === "more" ? null : "more"), className: "w-8 h-8 rounded-lg flex items-center justify-center transition-colors " + (selectionPopup === "more" ? "bg-white/10" : "hover:bg-white/10"), title: "More" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/70 text-lg" }, "more_vert")), selectionPopup === "more" && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full mt-2 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] py-2 w-48 animate-in fade-in slide-in-from-top-2 duration-200" }, /* @__PURE__ */ React.createElement("button", { onClick: bulkDuplicate, className: "w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-cream-light/60 hover:bg-white/5 hover:text-cream-light transition-colors flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "content_copy"), " Duplicate"), /* @__PURE__ */ React.createElement("div", { className: "h-px bg-white/5 mx-3 my-1" }), /* @__PURE__ */ React.createElement("button", { onClick: bulkDelete, className: "w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "delete"), " Delete"))))))) : /* @__PURE__ */ React.createElement(Header, { user, title: "Faiora", subtitle: "Notes Archive" }), /* @__PURE__ */ React.createElement("div", { className: "px-4 md:px-0 pt-4" }, (searchQuery || labelFilter) && localNotes.filter(matchesFilter).length === 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-5xl text-primary/40" }, "search_off")), /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold text-cream-light mb-2 italic tracking-tight uppercase" }, "No matches found"), /* @__PURE__ */ React.createElement("p", { className: "text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold max-w-xs mx-auto" }, "We couldn't find any notes matching your search criteria."), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setLabelFilter("");
    navigate("/notes", { replace: true });
  }, className: "mt-8 px-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all" }, "Clear Search")), (() => {
    let labelFilterShown = false;
    const pinnedFiltered = localNotes.filter((n) => {
      const matches = matchesFilter(n);
      if (n.isPinned) return matches;
      if (dragState && dragState.noteId === n.id && dragState.initialSection === "__pinned") return true;
      return false;
    });
    const pinnedSection = pinnedFiltered.length === 0 ? null : /* @__PURE__ */ React.createElement("section", { key: "__pinned", className: "mb-12 scale-in", "data-drop-section": "__pinned" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-8" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary/60 text-lg", style: { fontVariationSettings: "'FILL' 1" } }, "push_pin"), /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display" }, "PINNED"), /* @__PURE__ */ React.createElement("div", { className: "h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" }), (() => {
      labelFilterShown = true;
      return /* @__PURE__ */ React.createElement(LabelFilterDropdown, null);
    })()), isLoading ? renderNoteSkeletonGrid(pinnedFiltered.length || 2) : renderNoteGrid(pinnedFiltered, null, "__pinned"));
    const customSections = (noteSections || []).map((sectionName) => {
      const sNotes = localNotes.filter((n) => {
        if (n.isPinned) return false;
        const matches = matchesFilter(n);
        if (n.section === sectionName) return matches;
        if (dragState && dragState.noteId === n.id && (dragState.initialSection || "") === sectionName) return true;
        return false;
      });
      if ((searchQuery || labelFilter) && sNotes.length === 0) return null;
      const showDropdownHere = !labelFilterShown;
      if (showDropdownHere) labelFilterShown = true;
      return /* @__PURE__ */ React.createElement("section", { key: sectionName, className: "mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500", "data-drop-section": sectionName }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-8" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary/60 text-lg" }, "folder"), /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display" }, sectionName), /* @__PURE__ */ React.createElement("div", { className: "h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" }), showDropdownHere && /* @__PURE__ */ React.createElement(LabelFilterDropdown, null), /* @__PURE__ */ React.createElement("button", { onClick: () => handleSetPendingDeleteSection(sectionName), className: "text-white/20 hover:text-red-400 transition-colors", title: "Delete section" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "delete"))), isLoading ? renderNoteSkeletonGrid(sNotes.length || 2) : sNotes.length > 0 ? renderNoteGrid(sNotes, null, sectionName) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/5 rounded-2xl" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl text-white/5 mb-2" }, "note_stack"), /* @__PURE__ */ React.createElement("p", { className: "text-white/20 text-xs" }, "Long-press a note to move it here")));
    });
    const addSectionButton = !searchQuery && !labelFilter ? /* @__PURE__ */ React.createElement("div", { className: "mb-8" }, showAddSection ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newSectionName,
        onChange: (e) => setNewSectionName(e.target.value),
        onKeyDown: (e) => e.key === "Enter" && handleAddSectionSubmit(),
        placeholder: "Section name...",
        className: "bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-cream-light placeholder:text-white/20 focus:outline-none focus:ring-0 focus:border-primary/40 font-montserrat uppercase tracking-widest",
        style: { caretColor: "#f97316" },
        autoFocus: true
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleAddSectionSubmit,
        className: "p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "check")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          handleSetShowAddSection(false);
          setNewSectionName("");
        },
        className: "p-2 text-white/30 hover:text-white/60 rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close")
    )) : /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleSetShowAddSection(true),
        className: "inline-flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest hover:text-primary/70 transition-colors"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "add"),
      "Add Section"
    )) : null;
    const allNotesFiltered = localNotes.filter((n) => {
      if (n.isPinned) return false;
      if (noteSections.includes(n.section)) {
        if (dragState && dragState.noteId === n.id && (dragState.initialSection || "") === "") return true;
        return false;
      }
      const matches = matchesFilter(n);
      if (!n.section || !noteSections.includes(n.section)) return matches;
      return false;
    });
    const showDropdownOnAll = !labelFilterShown;
    const allNotesSection = (searchQuery || labelFilter) && allNotesFiltered.length === 0 ? null : /* @__PURE__ */ React.createElement("section", { key: "__allnotes", className: "mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500", "data-drop-section": "" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-8" }, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display" }, "ALL NOTES"), /* @__PURE__ */ React.createElement("div", { className: "h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" }), showDropdownOnAll && /* @__PURE__ */ React.createElement(LabelFilterDropdown, null)), isLoading ? /* @__PURE__ */ React.createElement("div", { className: "pb-32" }, renderNoteSkeletonGrid(allNotesFiltered.length || localNotes.length || 4)) : allNotesFiltered.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "pb-32" }, renderNoteGrid(allNotesFiltered, null, "")) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center animate-pulse" }, !isFirstSyncDone || isProbing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "loading-spinner mb-4" }), /* @__PURE__ */ React.createElement("p", { className: "text-white/40 font-medium font-montserrat uppercase tracking-widest text-[10px]" }, "Syncing your life...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-5xl text-white/5 mb-3" }, "note_stack"), /* @__PURE__ */ React.createElement("p", { className: "text-white/30 text-sm" }, labelFilter ? "No notes match this filter" : "No notes here"))));
    return /* @__PURE__ */ React.createElement(React.Fragment, null, pinnedSection, customSections, addSectionButton, allNotesSection);
  })(), pendingDeleteSection && /* (2026-07-13) Compact delete section modal with side buttons. Prev: stacked */
  /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md z-[950] flex items-center justify-center p-4 animate-in fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel w-full max-w-xs sm:max-w-sm rounded-2xl border border-white/10 bg-[#160d08]/95 backdrop-blur-xl p-5 text-center animate-in zoom-in-95 duration-300 font-montserrat space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-red-400 text-2xl" }, "warning")), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-cream-light tracking-tight" }, "Delete Section?"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-cream-light/60 leading-relaxed font-medium" }, "Are you sure you want to delete ", /* @__PURE__ */ React.createElement("span", { className: "text-primary font-bold" }, '"', pendingDeleteSection, '"'), "? Its notes will be automatically moved to ", /* @__PURE__ */ React.createElement("span", { className: "text-white/80 font-semibold" }, "ALL NOTES"), ".")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2.5 pt-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetPendingDeleteSection(null),
      className: "w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all border border-white/10"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        onDeleteSection(pendingDeleteSection, false);
        handleSetPendingDeleteSection(null);
      },
      className: "w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all shadow-md shadow-rose-500/20"
    },
    "Delete"
  )))), pendingDeleteNotes.length > 0 && /* @__PURE__ */ React.createElement(
    ConfirmationModal,
    {
      title: pendingDeleteNotes.length === 1 ? "Delete Note?" : `Delete ${pendingDeleteNotes.length} Notes?`,
      message: pendingDeleteNotes.length === 1 ? "Are you sure you want to delete this note? This cannot be undone." : `Are you sure you want to delete these ${pendingDeleteNotes.length} notes? This cannot be undone.`,
      onConfirm: confirmBulkDelete,
      onCancel: () => handleSetPendingDeleteNotes([]),
      confirmText: pendingDeleteNotes.length === 1 ? "Delete Note" : "Delete Notes",
      type: "danger"
    }
  ))));
});
const CalendarPage = ({ user, notes: notes2, quickTasks: quickTasks2 = [], onOpenCreator, onEditNote, onToggleQuickTask, onEditQuickTask, onAddQuickTask, pomodoroTime, isPomodoroActive }) => {
  const [currentDate, setCurrentDate] = useState(/* @__PURE__ */ new Date());
  const [selectedDate, setSelectedDate] = useState(/* @__PURE__ */ new Date());
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [upcomingPage, setUpcomingPage] = useState(0);
  const UPCOMING_PAGE_SIZE = 5;
  const quickTaskMatchesRef = useRef(null);
  const today = /* @__PURE__ */ new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("en-US", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    setCurrentDate(/* @__PURE__ */ new Date());
    setSelectedDate(/* @__PURE__ */ new Date());
  };
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d) => d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  const remindersByDate = useMemo(() => {
    const map = {};
    (notes2 || []).forEach((note) => {
      if (!note.reminderDate) return;
      const d = parseDateString(note.reminderDate);
      if (d) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push({ ...note, type: "note" });
      }
    });
    (quickTasks2 || []).forEach((task) => {
      if (!task.dueDate) return;
      const d = parseDateString(task.dueDate);
      if (d) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push({ ...task, type: "quickTask" });
      }
    });
    return map;
  }, [notes2, quickTasks2]);
  const getRemindersForDay = (day) => {
    const key = `${year}-${month}-${day}`;
    return remindersByDate[key] || [];
  };
  const selectedDayLabel = selectedDate.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const dayReminders = getRemindersForDay(selectedDate.getDate());
  const upcomingReminders = useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    const allItems = [
      ...(notes2 || []).filter((n) => n.reminderDate).map((n) => ({ ...n, type: "note", sortDate: parseDateString(n.reminderDate) })),
      ...(quickTasks2 || []).filter((t) => t.dueDate).map((t) => ({ ...t, type: "quickTask", sortDate: parseDateString(t.dueDate) }))
    ];
    return allItems.filter((item) => item.sortDate >= now).sort((a, b) => a.sortDate - b.sortDate);
  }, [notes2, quickTasks2]);
  const upcomingTotal = upcomingReminders.length;
  const upcomingMaxPage = Math.max(0, Math.ceil(upcomingTotal / UPCOMING_PAGE_SIZE) - 1);
  const upcomingPagedItems = upcomingReminders.slice(upcomingPage * UPCOMING_PAGE_SIZE, (upcomingPage + 1) * UPCOMING_PAGE_SIZE);
  const normalizedTaskSearch = taskSearchQuery.trim().toLowerCase();
  const quickTaskSearchResults = useMemo(() => {
    if (!normalizedTaskSearch) return [];
    const todayIso = formatDateLocal();
    const tomorrowDate = /* @__PURE__ */ new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowIso = formatDateLocal(tomorrowDate);
    const getTaskSortTime = (task) => {
      if (!(task == null ? void 0 : task.dueDate)) return Number.MAX_SAFE_INTEGER;
      const parsed = (/* @__PURE__ */ new Date(`${task.dueDate}T${task.dueTime || "23:59"}`)).getTime();
      return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
    };
    return (quickTasks2 || []).filter((task) => {
      if (!(task == null ? void 0 : task.dueDate)) return false;
      const dueDateObj = parseDateString(task.dueDate);
      const dueLabels = [
        task.dueDate,
        formatReminderDate(task.dueDate),
        formatDateMinimal(task.dueDate)
      ];
      if (dueDateObj && !Number.isNaN(dueDateObj.getTime())) {
        dueLabels.push(dueDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
        dueLabels.push(dueDateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
      }
      if (task.dueDate === todayIso) dueLabels.push("today");
      if (task.dueDate === tomorrowIso) dueLabels.push("tomorrow");
      const haystack = [
        formatTaskText(task.text),
        dueLabels.join(" ")
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedTaskSearch);
    }).sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b)).slice(0, 12);
  }, [normalizedTaskSearch, quickTasks2]);
  const jumpToQuickTaskDate = useCallback((task) => {
    if (!(task == null ? void 0 : task.dueDate)) return;
    const nextDate = parseDateString(task.dueDate);
    if (!nextDate || Number.isNaN(nextDate.getTime())) return;
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setSelectedDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
    setTaskSearchQuery("");
  }, []);
  useEffect(() => {
    setUpcomingPage(0);
  }, [selectedDate.getTime()]);
  const handleQuickTaskSearchSubmit = useCallback((query) => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return;
    if (quickTaskSearchResults.length > 0) {
      jumpToQuickTaskDate(quickTaskSearchResults[0]);
    }
  }, [jumpToQuickTaskDate, quickTaskSearchResults]);
  useEffect(() => {
    if (!normalizedTaskSearch || !quickTaskMatchesRef.current) return;
    const timer = setTimeout(() => {
      var _a;
      (_a = quickTaskMatchesRef.current) == null ? void 0 : _a.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [normalizedTaskSearch, quickTaskSearchResults.length]);
  const cells = useMemo(() => {
    const arr = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      arr.push({ day: prevMonthDays - i, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push({ day: d, current: true });
    }
    const remaining = 7 - arr.length % 7;
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        arr.push({ day: i, current: false });
      }
    }
    return arr;
  }, [year, month, firstDay, daysInMonth, prevMonthDays]);
  return (
    /* 2026-04-15: Ensured FAB is enabled for CalendarPage */
    /* @__PURE__ */ React.createElement(
      Layout,
      {
        onFabClick: () => onAddQuickTask && onAddQuickTask(formatDateLocal(selectedDate)),
        noPadding: true,
        pomodoroTime,
        isPomodoroActive
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col md:flex-row md:h-full md:overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col min-w-0 md:overflow-y-auto no-scrollbar" }, /* @__PURE__ */ React.createElement("div", { className: "md:sticky md:top-0 md:z-[100] md:py-4 md:px-12 md:mb-2" }, /* @__PURE__ */ React.createElement(
        Header,
        {
          user,
          searchValue: taskSearchQuery,
          onSearchChange: setTaskSearchQuery,
          onSearchSubmit: handleQuickTaskSearchSubmit,
          searchPlaceholder: "Search quick task"
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "px-4 md:px-0 mx-0 mt-[calc(72px+env(safe-area-inset-top,0px))] md:mt-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 md:mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between w-full" }, /* @__PURE__ */ React.createElement("button", { onClick: prevMonth, className: "w-10 h-10 bg-white/5 rounded-full text-cream-light/60 hover:text-primary transition-all flex items-center justify-center border border-white/5 hover:border-primary/20" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "chevron_left")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl md:text-3xl font-display font-bold text-cream-light tracking-[0.10em] md:tracking-[0.20em] uppercase" }, monthName, " ", year)), /* @__PURE__ */ React.createElement("button", { onClick: nextMonth, className: "w-10 h-10 bg-white/5 rounded-full text-cream-light/60 hover:text-primary transition-all flex items-center justify-center border border-white/5 hover:border-primary/20" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "chevron_right")))), /* @__PURE__ */ React.createElement("div", { className: "bg-[#18110c]/90 rounded-xl md:rounded-2xl overflow-hidden border border-white/10 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 bg-white/5 text-center border-b border-white/5 py-2.5" }, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => /* @__PURE__ */ React.createElement("div", { key: day, className: "text-[9px] font-bold text-primary/60 uppercase tracking-widest" }, day))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7" }, cells.map((cell, i) => {
        const reminders = cell.current ? getRemindersForDay(cell.day) : [];
        const todayMatch = cell.current && isToday(cell.day);
        const selectedMatch = cell.current && isSelected(cell.day);
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: i,
            onClick: () => cell.current && (setSelectedDate(new Date(year, month, cell.day)), setUpcomingPage(0)),
            className: `border-r border-b border-white/5 pt-1 px-1 pb-1 h-[108px] md:h-[120px] overflow-hidden relative cursor-pointer ${cell.current ? "hover:bg-white/5" : "opacity-25"} ${todayMatch ? "bg-primary/10" : ""} ${selectedMatch && !todayMatch ? "bg-white/5" : ""}`
          },
          /* @__PURE__ */ React.createElement("span", { className: `text-xs font-sans ${todayMatch ? "font-bold text-primary" : ""} ${selectedMatch && !todayMatch ? "font-semibold text-cream-light" : ""}` }, cell.day),
          todayMatch && /* @__PURE__ */ React.createElement("div", { className: "absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary glow-orange" }),
          reminders.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-0.5 mt-0.5" }, reminders.slice(0, 4).map((r, ri) => /* @__PURE__ */ React.createElement(
            "div",
            {
              key: ri,
              title: r.type === "quickTask" ? formatTaskText(r.text) : r.title || "Note",
              className: `w-full truncate text-[7px] leading-none font-semibold rounded px-1 flex-shrink-0 h-[14px] flex items-center ${r.type === "quickTask" ? "bg-white/10 text-cream-light/90" : "bg-primary/20 text-primary"} border border-white/5`
            },
            r.type === "quickTask" ? formatTaskText(r.text) : r.title || "Note"
          )), reminders.length > 4 && /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-bold text-primary truncate pl-0.5 leading-none flex-shrink-0 block mt-0.5" }, "+", reminders.length - 4, " more"))
        );
      }))))), /* @__PURE__ */ React.createElement("aside", { className: "w-full md:w-96 border-t md:border-t-0 md:border-l border-white/5 bg-[#140e0a]/90 p-6 pb-28 overflow-y-auto no-scrollbar flex-shrink-0 md:rounded-none rounded-[2.5rem] mt-6 md:mt-0" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-1.5 justify-between" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-display font-bold text-cream-light" }, "Daily Agenda"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => onAddQuickTask && onAddQuickTask(formatDateLocal(selectedDate)),
          className: "w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95",
          title: "Add Task for this day"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xl" }, "add")
      )), /* @__PURE__ */ React.createElement("div", { className: "h-px w-full bg-gradient-to-r from-primary/30 to-transparent mb-4" }), /* @__PURE__ */ React.createElement("p", { className: "text-cream-light/40 text-[10px] font-sans uppercase tracking-[0.2em] font-bold" }, selectedDayLabel)), dayReminders.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3 mb-8" }, dayReminders.map((item, idx) => {
        if (item.type === "note") {
          return /* @__PURE__ */ React.createElement("div", { key: idx, onClick: () => onEditNote && onEditNote(item), className: "card-glow bg-orange-100/95 rounded-[2rem] p-5 border-b-4 border-orange-300/50 cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "text-base font-bold text-orange-950/90 leading-tight truncate flex-1" }, item.title || "Untitled"), item.isLocked && /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-orange-950/40 text-sm" }, "lock")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-orange-900/60 mt-1.5 font-sans font-medium capitalize" }, formatReminderDate(item.reminderDate), item.labels && item.labels[0] ? ` \u2022 ${item.labels[0]}` : ""));
        } else {
          const dueDateInfo = formatDueDate(item.dueDate, item.dueTime);
          const isOverdue = dueDateInfo.isOverdue && !item.completed;
          const isNearDeadline = dueDateInfo.isNearDeadline && !item.completed;
          const isDueToday = dueDateInfo.isDueToday && !item.completed;
          const isDueTomorrow = dueDateInfo.isDueTomorrow && !item.completed;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: idx,
              className: "quick-task-card relative rounded-2xl select-none"
            },
            /* @__PURE__ */ React.createElement(
              "div",
              {
                className: `glass-panel rounded-2xl py-2.5 px-3 md:py-3 md:px-4 flex items-center justify-between group hover:bg-white/[0.07] hover:border-primary/30 active:bg-white/[0.08] active:border-primary/40 transition-all duration-200 cursor-pointer border shadow-lg hover:shadow-primary/5 select-none relative z-10 ${item.completed ? "opacity-40 grayscale-[0.5]" : ""} ${isOverdue ? "border-red-500/30" : isNearDeadline ? "border-primary/60" : isDueToday ? "border-primary/40" : "border-white/5"} ${isDueToday && !isNearDeadline && !item.completed ? "today-task-glow" : ""} ${isNearDeadline && !item.completed ? "near-deadline-glow" : ""} ${isDueTomorrow && !item.completed ? "tomorrow-glow" : ""}`,
                onClick: () => onEditQuickTask && onEditQuickTask(item)
              },
              /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5 md:gap-3 pointer-events-none flex-1 min-w-0 pr-2" }, /* @__PURE__ */ React.createElement(
                "div",
                {
                  className: `w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${item.completed ? "bg-primary border-primary text-white scale-105" : "border-white/30 text-transparent group-hover:border-white/60"}`,
                  onClick: (e) => {
                    e.stopPropagation();
                    if (!item.completed) {
                      const taskElement = e.currentTarget.closest(".quick-task-card");
                      if (taskElement) {
                        const rect = taskElement.getBoundingClientRect();
                        const checkmarkX = rect.left + 20;
                        const checkmarkY = rect.top + rect.height / 2;
                        if (window.createFireSparks) {
                          window.createFireSparks(checkmarkX, checkmarkY, rect.width, false);
                        }
                        if (window.playWhooshSound) {
                          window.playWhooshSound();
                        }
                      }
                    }
                    onToggleQuickTask && onToggleQuickTask(item.id);
                  },
                  style: { pointerEvents: "auto" }
                },
                /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "check")
              ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col justify-center flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("h4", { className: `text-xs md:text-[13px] text-cream-light font-montserrat font-semibold tracking-wide leading-snug transition-all duration-300 line-clamp-2 overflow-hidden ${item.completed ? "line-through decoration-primary/50 opacity-60" : "group-hover:text-primary"} ${isOverdue && !item.completed ? "text-red-400" : ""}` }, formatTaskText(item.text)), (item.dueDate || item.dueTime) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mt-0.5" }, /* @__PURE__ */ React.createElement("p", { className: `text-[8.5px] md:text-[9.5px] font-montserrat font-bold uppercase tracking-[0.15em] flex items-center gap-1 transition-opacity ${isOverdue && !item.completed ? "text-red-500" : "text-primary/80 opacity-60 group-hover:opacity-100"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[9px] md:text-[10px]" }, item.dueTime ? "schedule" : "event"), item.dueTime ? formatTime(item.dueTime) : dueDateInfo.label)))),
              item.progress > 0 && !item.completed && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-0.5 shrink-0 px-2 pointer-events-none" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-montserrat font-bold text-white/50" }, item.progress, "%"), /* @__PURE__ */ React.createElement("div", { className: "w-12 md:w-14 h-1 bg-white/10 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
                "div",
                {
                  className: "h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
                  style: { width: `${item.progress}%` }
                }
              )))
            )
          );
        }
      })) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 mb-8" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl text-white/5 mb-2" }, "event_available"), /* @__PURE__ */ React.createElement("p", { className: "text-white/20 text-xs font-sans" }, "No reminders this day")), upcomingReminders.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-cream-light/60 uppercase tracking-[0.2em]" }, "Upcoming"), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, upcomingPagedItems.map((item, idx) => {
        if (item.type === "note") {
          return /* @__PURE__ */ React.createElement("div", { key: idx, onClick: () => onEditNote && onEditNote(item), className: "card-glow bg-orange-100/95 rounded-[2rem] p-4 border-b-4 border-orange-300/50 cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-bold text-orange-950/90 leading-tight truncate flex-1" }, item.title || "Untitled"), item.isLocked && /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-orange-950/40 text-xs" }, "lock")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-orange-900/60 font-sans font-medium capitalize" }, formatReminderDate(item.reminderDate), item.labels && item.labels[0] ? ` \u2022 ${item.labels[0]}` : ""));
        }
        const dueDateInfo = formatDueDate(item.dueDate, item.dueTime);
        const isOverdue = dueDateInfo.isOverdue && !item.completed;
        const isNearDeadline = dueDateInfo.isNearDeadline && !item.completed;
        const isDueToday = dueDateInfo.isDueToday && !item.completed;
        const isDueTomorrow = dueDateInfo.isDueTomorrow && !item.completed;
        return /* @__PURE__ */ React.createElement("div", { key: idx, className: "quick-task-card relative rounded-2xl select-none" }, /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `glass-panel rounded-2xl py-2.5 px-3 md:py-3 md:px-4 flex items-center justify-between group hover:bg-white/[0.07] hover:border-primary/30 active:bg-white/[0.08] active:border-primary/40 transition-all duration-200 cursor-pointer border shadow-lg hover:shadow-primary/5 select-none relative z-10 ${item.completed ? "opacity-40 grayscale-[0.5]" : ""} ${isOverdue ? "border-red-500/30" : isNearDeadline ? "border-primary/60" : isDueToday ? "border-primary/40" : "border-white/5"} ${isDueToday && !isNearDeadline && !item.completed ? "today-task-glow" : ""} ${isNearDeadline && !item.completed ? "near-deadline-glow" : ""} ${isDueTomorrow && !item.completed ? "tomorrow-glow" : ""}`,
            onClick: () => onEditQuickTask && onEditQuickTask(item)
          },
          /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5 md:gap-3 pointer-events-none flex-1 min-w-0 pr-2" }, /* @__PURE__ */ React.createElement(
            "div",
            {
              className: `w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${item.completed ? "bg-primary border-primary text-white scale-105" : "border-white/30 text-transparent group-hover:border-white/60"}`,
              onClick: (e) => {
                e.stopPropagation();
                if (!item.completed) {
                  const taskElement = e.currentTarget.closest(".quick-task-card");
                  if (taskElement) {
                    const rect = taskElement.getBoundingClientRect();
                    const checkmarkX = rect.left + 20;
                    const checkmarkY = rect.top + rect.height / 2;
                    if (window.createFireSparks) {
                      window.createFireSparks(checkmarkX, checkmarkY, rect.width, false);
                    }
                    if (window.playWhooshSound) {
                      window.playWhooshSound();
                    }
                  }
                }
                onToggleQuickTask && onToggleQuickTask(item.id);
              },
              style: { pointerEvents: "auto" }
            },
            /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "check")
          ), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col justify-center flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("h4", { className: `text-xs md:text-[13px] text-cream-light font-montserrat font-semibold tracking-wide leading-snug transition-all duration-300 line-clamp-2 overflow-hidden ${item.completed ? "line-through decoration-primary/50 opacity-60" : "group-hover:text-primary"} ${isOverdue && !item.completed ? "text-red-400" : ""}` }, formatTaskText(item.text)), (item.dueDate || item.dueTime) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mt-0.5" }, /* @__PURE__ */ React.createElement("p", { className: `text-[8.5px] md:text-[9.5px] font-montserrat font-bold uppercase tracking-[0.15em] flex items-center gap-1 transition-opacity ${isOverdue && !item.completed ? "text-red-500" : "text-primary/80 opacity-60 group-hover:opacity-100"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[9px] md:text-[10px]" }, item.dueTime ? "schedule" : "event"), item.dueTime ? formatTime(item.dueTime) : dueDateInfo.label || item.dueDate)))),
          item.progress > 0 && !item.completed && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-end gap-0.5 shrink-0 px-2 pointer-events-none" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-montserrat font-bold text-white/50" }, item.progress, "%"), /* @__PURE__ */ React.createElement("div", { className: "w-12 md:w-14 h-1 bg-white/10 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
            "div",
            {
              className: "h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
              style: { width: `${item.progress}%` }
            }
          )))
        ));
      }), upcomingTotal > UPCOMING_PAGE_SIZE && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pt-2 pb-1" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setUpcomingPage((p) => Math.max(0, p - 1)),
          disabled: upcomingPage === 0,
          className: "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10 text-cream-light/50 hover:border-primary/40 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[12px]" }, "chevron_left"),
        "Prev"
      ), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-white/30 tracking-wider" }, upcomingPage + 1, " / ", upcomingMaxPage + 1, " \xA0\xB7\xA0 ", upcomingTotal, " upcoming"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setUpcomingPage((p) => Math.min(upcomingMaxPage, p + 1)),
          disabled: upcomingPage >= upcomingMaxPage,
          className: "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10 text-cream-light/50 hover:border-primary/40 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        },
        "Next",
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[12px]" }, "chevron_right")
      ))))))
    )
  );
};
const QuickTasksPage = ({ user, quickTasks: quickTasks2 = [], onOpenCreator, onToggleQuickTask, onAddQuickTaskClick, onDeleteQuickTask, onUpdateQuickTasks, onUpdateQuickTask, onEditQuickTask, isProbing, isFirstSyncDone, pomodoroTime, isPomodoroActive, showToast: showToast2, notes: notes2 = [], onUpdateNote, activeCollection: activeCollection2 }) => {
  const location2 = useLocation();
  const queryParams = new URLSearchParams(location2.search);
  const searchQuery = (queryParams.get("search") || "").toLowerCase();
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("faiora_qt_view_mode") || "standard";
    } catch {
      return "standard";
    }
  });
  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    if (mode !== "standard" && mode !== "daily") {
      setIsSelectionMode(false);
      setSelectedTasks([]);
    }
    try {
      localStorage.setItem("faiora_qt_view_mode", mode);
    } catch {
    }
  };
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_qt_categories");
      return saved !== null ? JSON.parse(saved) : ["Sample"];
    } catch {
      return ["Sample"];
    }
  });
  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem("faiora_qt_categories");
        if (saved !== null) setCustomCategories(JSON.parse(saved));
      } catch {
      }
    };
    window.addEventListener("faiora_qt_categories_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("faiora_qt_categories_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);
  const syncCategoriesToCloud = (cats) => {
    if (!user || user.isAnonymous) return;
    const uid = user.uid;
    const coll = activeCollection2 || window._faiora_active_collection || "users";
    try {
      db.collection(coll).doc(uid).set({ quickTaskCategories: cats }, { merge: true }).catch(() => {
      });
    } catch {
    }
  };
  const syncVisibleSectionsToCloud = (sections2) => {
    if (!user || user.isAnonymous) return;
    const uid = user.uid;
    const coll = activeCollection2 || window._faiora_active_collection || "users";
    try {
      db.collection(coll).doc(uid).set({ quickTaskVisibleSections: sections2 }, { merge: true }).catch(() => {
      });
    } catch {
    }
  };
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const allCategories = useMemo(() => {
    const orderedList = [];
    const seen = /* @__PURE__ */ new Set();
    (customCategories || []).forEach((c) => {
      if (c && c.trim() && c.trim().toUpperCase() !== "ALL") {
        const val = c.trim();
        if (!seen.has(val.toLowerCase())) {
          seen.add(val.toLowerCase());
          orderedList.push(val);
        }
      }
    });
    (quickTasks2 || []).forEach((t) => {
      const taskCats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
      taskCats.forEach((c) => {
        if (c && c.trim() && c.trim().toUpperCase() !== "ALL") {
          const val = c.trim();
          if (!seen.has(val.toLowerCase())) {
            seen.add(val.toLowerCase());
            orderedList.push(val);
          }
        }
      });
    });
    return orderedList;
  }, [quickTasks2, customCategories]);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const handleDeleteCategory = (catName) => {
    const clean = (catName || "").trim();
    if (!clean) return;
    const updatedCustom = customCategories.filter((c) => c.toLowerCase() !== clean.toLowerCase());
    setCustomCategories(updatedCustom);
    try {
      localStorage.setItem("faiora_qt_categories", JSON.stringify(updatedCustom));
    } catch {
    }
    syncCategoriesToCloud(updatedCustom);
    if (selectedCategory.toLowerCase() === clean.toLowerCase()) {
      setSelectedCategory("ALL");
    }
    if (typeof onUpdateQuickTasks === "function" && Array.isArray(quickTasks2)) {
      const updatedTasks = quickTasks2.map((t) => {
        const currentCats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
        const newCats = currentCats.filter((c) => c.toLowerCase() !== clean.toLowerCase());
        return {
          ...t,
          categories: newCats,
          category: newCats[0] || ""
        };
      });
      onUpdateQuickTasks(updatedTasks);
    }
    if (showToast2) showToast2(`Category "${clean}" deleted`);
  };
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [pendingDeleteBatch, setPendingDeleteBatch] = useState(false);
  const [showAssignCategorySheet, setShowAssignCategorySheet] = useState(false);
  const [showBatchDeadlineModal, setShowBatchDeadlineModal] = useState(false);
  const handleBatchChangeDeadline = (newDate, newTime) => {
    if (typeof onUpdateQuickTasks === "function") {
      let dueTimestamp = null;
      if (newDate) {
        const dt = /* @__PURE__ */ new Date(`${newDate}T${newTime || "23:59"}`);
        if (!isNaN(dt.getTime())) dueTimestamp = dt.getTime();
      }
      onUpdateQuickTasks((quickTasks2 || []).map((t) => {
        if (!selectedTasks.includes(t.id)) return t;
        return {
          ...t,
          dueDate: newDate || "",
          dueTime: newTime || "",
          dueTimestamp,
          updatedAt: Date.now()
        };
      }));
    }
    setShowBatchDeadlineModal(false);
    setSelectedTasks([]);
    setIsSelectionMode(false);
    if (showToast2) showToast2(`Deadline updated for ${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`);
  };
  const handleToggleSelectTask = (taskId) => {
    setSelectedTasks(
      (prev) => prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };
  const handleSelectAll = () => {
    setSelectedTasks(
      (prev) => prev.length === filteredTasks.length ? [] : filteredTasks.map((t) => t.id)
    );
  };
  const handleConfirmBatchDelete = () => {
    if (typeof onUpdateQuickTasks === "function") {
      onUpdateQuickTasks((quickTasks2 || []).filter((t) => !selectedTasks.includes(t.id)));
    }
    setSelectedTasks([]);
    setIsSelectionMode(false);
    setPendingDeleteBatch(false);
    if (showToast2) showToast2(`${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""} deleted`);
  };
  const handleAssignCategory = (cat) => {
    if (typeof onUpdateQuickTasks === "function") {
      onUpdateQuickTasks((quickTasks2 || []).map((t) => {
        if (!selectedTasks.includes(t.id)) return t;
        return { ...t, categories: [cat], category: cat };
      }));
    }
    setShowAssignCategorySheet(false);
    setSelectedTasks([]);
    setIsSelectionMode(false);
    if (showToast2) showToast2(`Category "${cat}" assigned to ${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`);
  };
  const [visibleSections, setVisibleSections] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_qt_visible_sections");
      return saved ? { pastDue: true, today: true, tomorrow: true, thisWeek: true, nextWeek: false, upcoming: false, ...JSON.parse(saved) } : { pastDue: true, today: true, tomorrow: true, thisWeek: true, nextWeek: false, upcoming: false };
    } catch {
      return { pastDue: true, today: true, tomorrow: true, thisWeek: true, nextWeek: false, upcoming: false };
    }
  });
  React.useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem("faiora_qt_visible_sections");
        if (saved) setVisibleSections((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
      }
    };
    window.addEventListener("faiora_qt_visible_sections_updated", handleUpdate);
    return () => window.removeEventListener("faiora_qt_visible_sections_updated", handleUpdate);
  }, []);
  const handleToggleVisibleSection = (key) => {
    if (key === "pastDue" || key === "today") return;
    setVisibleSections((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("faiora_qt_visible_sections", JSON.stringify(updated));
      } catch {
      }
      syncVisibleSectionsToCloud(updated);
      return updated;
    });
  };
  const handleCreateCategory = (catName) => {
    const clean = (catName || newCategoryName).trim();
    if (!clean) return;
    if (!allCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      const updated = [...customCategories, clean];
      setCustomCategories(updated);
      try {
        localStorage.setItem("faiora_qt_categories", JSON.stringify(updated));
      } catch {
      }
      syncCategoriesToCloud(updated);
    }
    setSelectedCategory(clean);
    setNewCategoryName("");
    setIsAddingCategory(false);
  };
  const handleReorderCategories = (newOrder) => {
    setCustomCategories(newOrder);
    try {
      localStorage.setItem("faiora_qt_categories", JSON.stringify(newOrder));
    } catch {
    }
    try {
      window.dispatchEvent(new Event("faiora_qt_categories_updated"));
    } catch {
    }
    syncCategoriesToCloud(newOrder);
  };
  const filteredTasks = useMemo(() => {
    let list = quickTasks2 || [];
    if (selectedCategory !== "ALL") {
      list = list.filter((t) => {
        const cats = Array.isArray(t.categories) ? t.categories : t.category ? [t.category] : [];
        return cats.some((c) => c.toLowerCase() === selectedCategory.toLowerCase());
      });
    }
    if (searchQuery) {
      list = list.filter(
        (t) => (t.text || t.title || "").toLowerCase().includes(searchQuery)
      );
    }
    return typeof sortQuickTasksList === "function" ? sortQuickTasksList(list) : list;
  }, [quickTasks2, selectedCategory, searchQuery]);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const hasEverHadDataRef = useRef(false);
  useEffect(() => {
    if (quickTasks2.length > 0 || isFirstSyncDone) {
      hasEverHadDataRef.current = true;
      const timer = setTimeout(() => {
        setShowInitialLoader(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [quickTasks2.length, isFirstSyncDone]);
  const handleRefresh = async () => {
    if (navigator.vibrate) try {
      navigator.vibrate([10, 30, 10]);
    } catch (err) {
    }
    setIsPullRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 750));
    setIsPullRefreshing(false);
  };
  const groupedQuickTasks = useMemo(() => groupQuickTasksBySchedule(filteredTasks), [filteredTasks]);
  const dailyQuickTasks = useMemo(() => groupQuickTasksDaily(filteredTasks), [filteredTasks]);
  const handleSaveQuickTasksToNotes = (tasksToSave, isManual = false) => {
    const list = Array.isArray(tasksToSave) ? tasksToSave : filteredTasks;
    const dailyData = groupQuickTasksDaily(list);
    let noteHtml = `<div class="qt-notepad-live-wrapper" style="font-family: 'Montserrat', sans-serif; line-height: 1.35;">`;
    dailyData.sections.forEach((sec) => {
      noteHtml += `<h3 class="qt-notepad-live-section-title" style="font-size: 11px; font-weight: bold; color: #f97316; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 10px; margin-bottom: 3px;">${sec.shortLabel || sec.label}</h3>`;
      noteHtml += `<ul class="checklist-items qt-notepad-live-section-list" style="list-style: none; padding-left: 0; margin-bottom: 8px;">`;
      sec.items.forEach((item) => {
        noteHtml += `<li class="checklist-item qt-notepad-live-item ${item.completed ? "checked" : ""}" data-qt-id="${item.id}" style="margin-bottom: 2px; display: flex; align-items: flex-start; gap: 8px;"><span class="checklist-checkbox qt-notepad-live-checkbox" contenteditable="false" style="margin-top: 2px; flex-shrink: 0;"></span><span class="qt-notepad-live-text" style="${item.completed ? "text-decoration: line-through; opacity: 0.5;" : ""}">${item.text || "Untitled"}</span></li>`;
      });
      noteHtml += `</ul>`;
    });
    if (dailyData.completed && dailyData.completed.length > 0) {
      noteHtml += `<h3 class="qt-notepad-live-finished-title" style="font-size: 11px; font-weight: bold; color: #888888; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 14px; margin-bottom: 3px;">FINISHED (${dailyData.completed.length})</h3>`;
      noteHtml += `<ul class="checklist-items qt-notepad-live-finished-list" style="list-style: none; padding-left: 0; margin-bottom: 8px;">`;
      dailyData.completed.forEach((item) => {
        noteHtml += `<li class="checklist-item qt-notepad-live-item checked" data-qt-id="${item.id}" style="margin-bottom: 2px; display: flex; align-items: flex-start; gap: 8px;"><span class="checklist-checkbox qt-notepad-live-checkbox" contenteditable="false" style="margin-top: 2px; flex-shrink: 0;"></span><span class="qt-notepad-live-text" style="text-decoration: line-through; opacity: 0.45;">${item.text || "Untitled"}</span></li>`;
      });
      noteHtml += `</ul>`;
    }
    noteHtml += `</div>`;
    const existingNote = (notes2 || []).find((n) => (n.labels || []).includes("QUICK-TASKS") || n.id === "qt_live_notepad" || n.title === "Quick Tasks Notepad");
    let noteToSave;
    if (existingNote) {
      noteToSave = {
        ...existingNote,
        title: "Quick Tasks Notepad",
        content: noteHtml,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } else {
      const newId = "qt_live_notepad_" + Date.now();
      noteToSave = {
        id: newId,
        title: "Quick Tasks Notepad",
        content: noteHtml,
        labels: ["QUICK-TASKS", "PRIORITY"],
        isPinned: true,
        noteTheme: "amber",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (typeof onUpdateNote === "function") {
      onUpdateNote(noteToSave);
    }
    if (user && activeCollection2) {
      try {
        db.collection(activeCollection2).doc(user.uid).set({
          notes: {
            [noteToSave.id]: {
              ...noteToSave,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
          }
        }, { merge: true });
      } catch (e) {
      }
    }
    if (isManual && showToast2) showToast2("Quick tasks saved to Notes!");
  };
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    if (!(user == null ? void 0 : user.uid) || hasAutoSavedRef.current) return;
    const storageKey = "faiora_qt_auto_saved_initial_" + user.uid;
    if (localStorage.getItem(storageKey)) return;
    if ((quickTasks2 || []).length >= 3) {
      hasAutoSavedRef.current = true;
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
      }
      handleSaveQuickTasksToNotes(quickTasks2, false);
    }
  }, [user == null ? void 0 : user.uid, (quickTasks2 || []).length]);
  const [finishedLimit, setFinishedLimit] = useState(20);
  const finishedSentinelRef = useRef(null);
  useEffect(() => {
    setFinishedLimit(20);
  }, [searchQuery, filteredTasks.length]);
  const completedTasksSorted = useMemo(() => {
    const list = [...groupedQuickTasks.completed || []];
    return list.sort((a, b) => {
      const timeA = a.completedAt || a.createdAt || 0;
      const timeB = b.completedAt || b.createdAt || 0;
      return timeB - timeA;
    });
  }, [groupedQuickTasks.completed]);
  useEffect(() => {
    const el = finishedSentinelRef.current;
    if (!el) return;
    const total = completedTasksSorted.length;
    if (finishedLimit >= total) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setFinishedLimit((prev) => Math.min(prev + 20, total));
      }
    }, { rootMargin: "250px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [finishedLimit, completedTasksSorted.length]);
  const noDateSections = useMemo(() => {
    const list = groupedQuickTasks.noDate || [];
    if (list.length === 0) return [];
    const map = /* @__PURE__ */ new Map();
    list.forEach((t) => {
      const cats = Array.isArray(t.categories) && t.categories.length > 0 ? t.categories : t.category ? [t.category] : ["UNCATEGORIZED"];
      const primaryCat = (cats[0] || "UNCATEGORIZED").toUpperCase();
      if (!map.has(primaryCat)) map.set(primaryCat, []);
      map.get(primaryCat).push(t);
    });
    const sortedCats = Array.from(map.keys()).sort();
    return sortedCats.map((cat) => ({
      key: `noDate_${cat}`,
      label: `No Deadline \u2014 ${cat}`,
      shortLabel: `${cat}`,
      items: map.get(cat),
      totalCount: map.get(cat).length,
      isNoDate: true
    }));
  }, [groupedQuickTasks.noDate]);
  const now = /* @__PURE__ */ new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayDay = today.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const sections = [
    { key: "pastDue", label: "Past Due", items: groupedQuickTasks.pastDue || [], totalCount: (groupedQuickTasks.pastDue || []).length },
    { key: "today", label: `Today (${todayDay})`, items: groupedQuickTasks.today, totalCount: groupedQuickTasks.today.length },
    { key: "tomorrow", label: `Tomorrow (${tomorrowDay})`, items: groupedQuickTasks.tomorrow, totalCount: groupedQuickTasks.tomorrow.length },
    { key: "thisWeek", label: "This Week", items: groupedQuickTasks.thisWeek || [], totalCount: (groupedQuickTasks.thisWeek || []).length },
    { key: "nextWeek", label: "Next Week", items: groupedQuickTasks.nextWeek || [], totalCount: (groupedQuickTasks.nextWeek || []).length },
    { key: "upcoming", label: "Upcoming", items: groupedQuickTasks.upcoming || [], totalCount: (groupedQuickTasks.upcoming || []).length },
    { key: "completed", label: "Finished", items: completedTasksSorted.slice(0, finishedLimit), totalCount: completedTasksSorted.length }
  ];
  const handleFabClick = () => {
    const categoryToPass = selectedCategory !== "ALL" ? selectedCategory : null;
    onAddQuickTaskClick(categoryToPass);
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, onFabClick: handleFabClick, onRefresh: handleRefresh, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto w-full px-4 md:px-8 pt-0 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "md:py-4 md:px-8 md:mb-6" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "All quick tasks", showSearch: true, desktopSearchPlaceholder: "Search tasks...", mobileSearchPlaceholder: "Search tasks..." })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-4 mt-[calc(72px+env(safe-area-inset-top,0px))] md:mt-10 mb-2 md:mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h1", { className: "text-xl md:text-3xl font-display font-bold text-cream-light tracking-[0.15em] md:tracking-[0.25em] uppercase whitespace-nowrap" }, "Quick Tasks"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setIsManageCategoriesOpen(true),
      className: "text-cream-light/35 hover:text-primary transition-colors flex items-center justify-center p-0.5",
      title: "Manage Categories"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-lg" }, "tune")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        setIsSelectionMode((prev) => {
          if (prev) setSelectedTasks([]);
          return !prev;
        });
      },
      className: `transition-colors flex items-center justify-center p-0.5 ${isSelectionMode ? "text-primary" : "text-cream-light/35 hover:text-primary"}`,
      title: isSelectionMode ? "Exit selection" : "Select multiple tasks"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base md:text-lg" }, isSelectionMode ? "close" : "checklist")
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center bg-white/[0.03] p-1 rounded-full border border-white/10 backdrop-blur-md shadow-inner gap-0.5 shrink-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("standard"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "standard" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Standard Grouped View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "format_list_bulleted")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("daily"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "daily" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Daily Breakdown View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "calendar_month")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("notepad"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "notepad" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Date Notepad View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "sticky_note_2")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleSetViewMode("categories"),
      className: `viewmode-btn w-7 h-7 rounded-full border transition-all duration-150 flex items-center justify-center select-none ${viewMode === "categories" ? "active bg-primary/20 text-primary border-primary/40" : "border-transparent text-cream-light/40 hover:text-cream-light/90 hover:bg-white/5"}`,
      title: "Category Notepad View"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[15px]" }, "category")
  ))), showInitialLoader || !hasEverHadDataRef.current && quickTasks2.length === 0 && !isFirstSyncDone ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4 md:mb-5 -mx-4 px-4 md:mx-0 md:px-0" }, /* @__PURE__ */ React.createElement("div", { className: "h-8 w-14 rounded-full shimmer border border-white/5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "h-8 w-20 rounded-full shimmer border border-white/5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "h-8 w-16 rounded-full shimmer border border-white/5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "h-8 w-14 rounded-full shimmer border border-white/5 flex-shrink-0" })) : /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4 md:mb-5 -mx-4 px-4 md:mx-0 md:px-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedCategory("ALL"),
      className: `h-8 px-3.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] font-montserrat transition-all duration-200 whitespace-nowrap flex items-center justify-center active:scale-95 ${selectedCategory === "ALL" ? "bg-primary/20 text-primary border border-primary/40 shadow-sm shadow-primary/10 active:bg-primary/30" : "bg-white/[0.04] hover:bg-white/[0.08] hover:border-primary/30 hover:text-primary text-cream-light/50 border border-white/[0.08] active:bg-white/[0.1] active:border-primary/40 active:text-primary"}`
    },
    "All"
  ), allCategories.map((cat) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: cat,
      onClick: () => setSelectedCategory(cat),
      className: `h-8 px-3.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] font-montserrat transition-all duration-200 whitespace-nowrap flex items-center justify-center active:scale-95 ${selectedCategory === cat ? "bg-primary/20 text-primary border border-primary/40 shadow-sm shadow-primary/10 active:bg-primary/30" : "bg-white/[0.04] hover:bg-white/[0.08] hover:border-primary/30 hover:text-primary text-cream-light/50 border border-white/[0.08] active:bg-white/[0.1] active:border-primary/40 active:text-primary"}`
    },
    cat
  )), isAddingCategory ? /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: (el) => {
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
            if (el.parentElement) el.parentElement.scrollTo({ left: el.parentElement.scrollWidth, behavior: "smooth" });
          }, 30);
        }
      },
      className: "h-8 px-3 rounded-full bg-white/[0.04] border border-primary/40 flex items-center gap-1.5 flex-shrink-0"
    },
    /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        autoFocus: true,
        value: newCategoryName,
        onChange: (e) => setNewCategoryName(e.target.value.toUpperCase()),
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCreateCategory();
          }
          if (e.key === "Escape") setIsAddingCategory(false);
        },
        placeholder: "Category...",
        className: "bg-transparent border-none text-[10px] md:text-xs text-cream-light focus:ring-0 w-20 md:w-24 p-0 font-montserrat placeholder:text-white/30 leading-none outline-none"
      }
    ),
    /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => handleCreateCategory(), className: "text-primary hover:text-primary-light flex items-center justify-center p-0.5", title: "Save" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm font-bold" }, "check")),
    /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsAddingCategory(false), className: "text-white/40 hover:text-white flex items-center justify-center p-0.5", title: "Cancel" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "close"))
  ) : /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        var _a;
        const parent = (_a = e.currentTarget) == null ? void 0 : _a.parentElement;
        setIsAddingCategory(true);
        setTimeout(() => {
          if (parent) parent.scrollTo({ left: parent.scrollWidth, behavior: "smooth" });
        }, 30);
      },
      className: "h-8 px-3 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] font-montserrat text-primary/70 hover:text-primary bg-white/[0.02] hover:bg-primary/15 border border-white/10 hover:border-primary/30 transition-all duration-200 whitespace-nowrap flex items-center gap-1",
      title: "Add Category"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "add"),
    "New"
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, showInitialLoader || !hasEverHadDataRef.current && quickTasks2.length === 0 && !isFirstSyncDone ? /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "h-3 w-16 bg-white/10 rounded-full animate-pulse" }), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/10" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [...Array(3)].map((_, i) => /* @__PURE__ */ React.createElement(SkeletonQuickTask, { key: i })))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "h-3 w-20 bg-white/10 rounded-full animate-pulse" }), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-white/10" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [...Array(2)].map((_, i) => /* @__PURE__ */ React.createElement(SkeletonQuickTask, { key: i }))))) : filteredTasks.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass-panel p-10 rounded-3xl text-center border-dashed border-white/5" }, /* @__PURE__ */ React.createElement("p", { className: "text-white/20 text-sm font-bold uppercase tracking-widest" }, searchQuery ? "No tasks match your search" : "No quick tasks yet")) : /* @__PURE__ */ React.createElement("div", { className: "skeleton-fade-in" }, viewMode === "notepad" || viewMode === "categories" ? /* @__PURE__ */ React.createElement(
    QuickTasksNotepadView,
    {
      tasks: filteredTasks,
      onToggle: onToggleQuickTask,
      onSaveToNotes: handleSaveQuickTasksToNotes,
      onAddQuickTask: onAddQuickTaskClick,
      onEditQuickTask,
      onDelete: onDeleteQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      groupBy: viewMode === "categories" ? "category" : "date",
      categoriesOrder: allCategories,
      isSelectionMode,
      selectedTasks,
      onSelectToggle: handleToggleSelectTask,
      onToggleSelectionMode: () => {
        setIsSelectionMode((prev) => {
          if (prev) setSelectedTasks([]);
          return !prev;
        });
      }
    }
  ) : viewMode === "daily" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, dailyQuickTasks.sections.map((section) => /* @__PURE__ */ React.createElement("section", { key: section.key, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h2", { className: `text-xs md:text-sm font-bold uppercase tracking-[0.28em] ${section.isPastDue ? "text-red-400" : "text-primary/75"}` }, section.label), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" }), /* @__PURE__ */ React.createElement("span", { className: "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35" }, section.totalCount || section.items.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, section.items.map((task) => /* @__PURE__ */ React.createElement(
    QuickTaskItem,
    {
      key: task.id,
      task,
      onToggle: onToggleQuickTask,
      onDelete: onDeleteQuickTask,
      onEdit: onEditQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      hideDateSubtitle: true,
      isSelectionMode,
      isSelected: selectedTasks.includes(task.id),
      onSelectToggle: handleToggleSelectTask,
      viewMode: "daily"
    }
  ))))), dailyQuickTasks.completed.length > 0 && /* @__PURE__ */ React.createElement("section", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xs md:text-sm font-bold uppercase tracking-[0.28em] text-primary/75" }, "Finished"), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" }), /* @__PURE__ */ React.createElement("span", { className: "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35" }, dailyQuickTasks.completed.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, dailyQuickTasks.completed.slice(0, finishedLimit).map((task) => /* @__PURE__ */ React.createElement(
    QuickTaskItem,
    {
      key: task.id,
      task,
      onToggle: onToggleQuickTask,
      onDelete: onDeleteQuickTask,
      onEdit: onEditQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      hideDateSubtitle: true,
      isSelectionMode,
      isSelected: selectedTasks.includes(task.id),
      onSelectToggle: handleToggleSelectTask,
      viewMode: "daily"
    }
  ))))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, sections.map((section) => section.items.length > 0 && /* @__PURE__ */ React.createElement("section", { key: section.key, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h2", { className: `text-xs md:text-sm font-bold uppercase tracking-[0.28em] ${section.key === "pastDue" ? "text-red-400" : "text-primary/75"}` }, section.label), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" }), /* @__PURE__ */ React.createElement("span", { className: "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35" }, section.totalCount || section.items.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, section.items.map((task) => /* @__PURE__ */ React.createElement(
    QuickTaskItem,
    {
      key: task.id,
      task,
      onToggle: onToggleQuickTask,
      onDelete: onDeleteQuickTask,
      onEdit: onEditQuickTask,
      onUpdateQuickTask,
      showToast: showToast2,
      isSelectionMode,
      isSelected: selectedTasks.includes(task.id),
      onSelectToggle: handleToggleSelectTask,
      viewMode: "standard"
    }
  )), section.key === "completed" && section.totalCount > section.items.length && /* @__PURE__ */ React.createElement("div", { ref: finishedSentinelRef, className: "flex flex-col items-center gap-2 py-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5" }, [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "w-2 h-2 rounded-full bg-primary/50 animate-pulse", style: { animationDelay: `${i * 0.15}s` } }))), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-widest text-white/30" }, "Loading more (", section.items.length, " of ", section.totalCount, ")..."))))))))), isSelectionMode && /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-lg bg-[#0e0603]/95 border border-primary/30 rounded-3xl p-3 md:p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300 font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 pl-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs md:text-sm font-bold text-cream-light" }, selectedTasks.length, " ", /* @__PURE__ */ React.createElement("span", { className: "text-white/40 font-normal" }, "selected")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleSelectAll,
      className: "text-[11px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider underline"
    },
    selectedTasks.length === filteredTasks.length ? "Deselect All" : "Select All"
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: selectedTasks.length === 0,
      onClick: () => setShowBatchDeadlineModal(true),
      className: `w-9 h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition-all ${selectedTasks.length > 0 ? "bg-white/10 hover:bg-white/15 text-cream-light active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"}`,
      title: "Change deadline of selected"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "calendar_today")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: selectedTasks.length === 0,
      onClick: () => setShowAssignCategorySheet(true),
      className: `w-9 h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition-all ${selectedTasks.length > 0 ? "bg-white/10 hover:bg-white/15 text-cream-light active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"}`,
      title: "Assign category to selected"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "label")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      disabled: selectedTasks.length === 0,
      onClick: () => setPendingDeleteBatch(true),
      className: `w-9 h-9 rounded-2xl text-xs font-bold flex items-center justify-center transition-all ${selectedTasks.length > 0 ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 active:scale-95" : "bg-white/5 text-white/20 cursor-not-allowed"}`,
      title: "Delete selected"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, "delete")
  ))), pendingDeleteBatch && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md z-[2050] flex items-center justify-center p-6 animate-in fade-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 text-center animate-in zoom-in-95 duration-300 font-montserrat" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-red-400 text-3xl" }, "warning")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light mb-3" }, "Delete ", selectedTasks.length, " ", selectedTasks.length === 1 ? "Task" : "Tasks", "?"), /* @__PURE__ */ React.createElement("p", { className: "text-white/60 text-xs leading-relaxed mb-8" }, "Are you sure you want to delete ", selectedTasks.length, " selected quick ", selectedTasks.length === 1 ? "task" : "tasks", "?"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleConfirmBatchDelete,
      className: "w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-500/20"
    },
    "Delete ",
    selectedTasks.length,
    " ",
    selectedTasks.length === 1 ? "Task" : "Tasks"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingDeleteBatch(false),
      className: "w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all"
    },
    "Cancel"
  )))), showAssignCategorySheet && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-[2050] flex items-end justify-center animate-in fade-in duration-200",
      onClick: () => setShowAssignCategorySheet(false)
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-full max-w-lg bg-[#120804] border border-white/10 rounded-t-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 font-montserrat",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: "w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" }),
      /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-4" }, "Assign category to ", selectedTasks.length, " task", selectedTasks.length !== 1 ? "s" : ""),
      /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, allCategories.map((cat) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: cat,
          onClick: () => handleAssignCategory(cat),
          className: "h-9 px-4 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] bg-white/[0.04] hover:bg-primary/20 hover:text-primary border border-white/10 hover:border-primary/40 text-cream-light/70 transition-all active:scale-95"
        },
        cat
      ))),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowAssignCategorySheet(false),
          className: "mt-5 w-full py-3 bg-white/5 hover:bg-white/10 text-white/50 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
        },
        "Cancel"
      )
    )
  ), /* @__PURE__ */ React.createElement(
    BatchDeadlineModal,
    {
      isOpen: showBatchDeadlineModal,
      onClose: () => setShowBatchDeadlineModal(false),
      onApply: handleBatchChangeDeadline,
      count: selectedTasks.length
    }
  ), isManageCategoriesOpen && /* @__PURE__ */ React.createElement(
    ManageQuickTaskCategoriesModal,
    {
      categories: allCategories,
      quickTasks: quickTasks2,
      onClose: () => setIsManageCategoriesOpen(false),
      onDeleteCategory: handleDeleteCategory,
      onAddCategory: handleCreateCategory,
      onReorderCategories: handleReorderCategories,
      visibleSections,
      onToggleVisibleSection: handleToggleVisibleSection
    }
  ));
};
const StatsPage = ({ user, onOpenCreator, quickTasks: quickTasks2 = [], pomodoroTime, isPomodoroActive }) => {
  const stats = useMemo(() => {
    const all = Array.isArray(quickTasks2) ? quickTasks2 : [];
    const completed = all.filter((t) => t.completed);
    const pending = all.filter((t) => !t.completed);
    const total = all.length;
    const completionRate = total ? Math.round(completed.length / total * 100) : 0;
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const doneToday = completed.filter((t) => t.completedAt && t.completedAt >= startOfToday.getTime() && t.completedAt < endOfToday.getTime()).length;
    const overdue = pending.filter((t) => {
      if (!t.dueDate) return false;
      const due = (/* @__PURE__ */ new Date(`${t.dueDate}T${t.dueTime || "23:59"}`)).getTime();
      return !isNaN(due) && due < Date.now();
    }).length;
    const weekBuckets = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - (6 - idx));
      const key = d.toLocaleDateString("en-US", { weekday: "short" });
      return { key, done: 0 };
    });
    completed.forEach((t) => {
      if (!t.completedAt) return;
      const d = new Date(t.completedAt);
      d.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((startOfToday.getTime() - d.getTime()) / (24 * 60 * 60 * 1e3));
      if (diffDays >= 0 && diffDays < 7) {
        const idx = 6 - diffDays;
        weekBuckets[idx].done += 1;
      }
    });
    return { total, completed: completed.length, pending: pending.length, completionRate, doneToday, overdue, weekBuckets };
  }, [quickTasks2]);
  const ringCirc = 2 * Math.PI * 42;
  const ringProgress = ringCirc * stats.completionRate / 100;
  const weeklyMax = Math.max(1, ...stats.weekBuckets.map((b) => b.done));
  return (
    /* FIX 2026-04-15: Added showFab={false} and removed noPadding for StatsPage display */
    /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, showFab: false, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto w-full px-0 md:px-12 pt-[110px] md:pt-10 pb-24" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "Productivity Statistics", showSearch: false }), /* @__PURE__ */ React.createElement("div", { className: "px-4 md:px-0 space-y-6 md:space-y-8" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/40 font-bold" }, "Total Tasks"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl md:text-3xl font-display text-cream-light mt-2" }, stats.total)), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/40 font-bold" }, "Completed"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl md:text-3xl font-display text-green-300 mt-2" }, stats.completed)), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/40 font-bold" }, "Done Today"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl md:text-3xl font-display text-primary mt-2" }, stats.doneToday)), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/40 font-bold" }, "Overdue"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl md:text-3xl font-display text-red-300 mt-2" }, stats.overdue))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-4 glass-panel rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center card-glow" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-display font-bold text-cream-light italic mb-6 w-full" }, "Overall Progress"), /* @__PURE__ */ React.createElement("div", { className: "relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement("circle", { cx: "50", cy: "50", fill: "transparent", r: "42", stroke: "rgba(255,255,255,0.08)", strokeWidth: "8" }), /* @__PURE__ */ React.createElement("circle", { cx: "50", cy: "50", fill: "transparent", r: "42", stroke: "#f97316", strokeDasharray: `${ringProgress} ${ringCirc}`, strokeLinecap: "round", strokeWidth: "8" })), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl font-display font-bold text-cream-light" }, stats.completionRate, "%"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1" }, "Completed")))), /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-8 glass-panel rounded-3xl p-6 md:p-8 card-glow" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-display font-bold text-cream-light italic mb-6" }, "Weekly Momentum"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 gap-2 md:gap-3 items-end h-44 md:h-52" }, stats.weekBuckets.map((bucket) => {
      const pct = Math.max(8, Math.round(bucket.done / weeklyMax * 100));
      return /* @__PURE__ */ React.createElement("div", { key: bucket.key, className: "flex flex-col items-center justify-end h-full" }, /* @__PURE__ */ React.createElement("div", { className: "w-full rounded-xl bg-white/5 border border-white/5 overflow-hidden h-full flex items-end" }, /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gradient-to-t from-primary to-orange-300/80 rounded-xl transition-all duration-300", style: { height: `${pct}%` } })), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] md:text-[10px] text-cream-light/50 mt-2 uppercase tracking-wider font-bold" }, bucket.key), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-cream-light/70 font-bold" }, bucket.done));
    })))), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-3xl p-6 md:p-8" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg md:text-xl font-display font-bold text-cream-light italic mb-4" }, "Insight"), /* @__PURE__ */ React.createElement("p", { className: "text-sm md:text-base text-cream-light/70 font-sans leading-relaxed" }, stats.total === 0 ? "Start by adding your first quick task. Your progress analytics will appear here automatically." : stats.completionRate >= 80 ? "Excellent consistency. Keep your momentum by clearing overdue tasks first to maintain high completion." : stats.completionRate >= 50 ? "Good pace. A quick win is finishing 2-3 pending tasks today to push your completion above 70%." : "You have room to recover. Focus on completing today's tasks first before adding new ones.")))))
  );
};
const StreakPage = ({ user, onOpenCreator, gamification, pomodoroTime, isPomodoroActive }) => {
  const rewards = (gamification == null ? void 0 : gamification.rewards) || [];
  const currentStreak = (gamification == null ? void 0 : gamification.currentStreak) || 0;
  const streakUnit = currentStreak === 1 ? "DAY" : "DAYS";
  return (
    /* FIX 2026-04-15: Added showFab={false} to disable Floating Action Button on StreakPage as requested */
    /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, showFab: false, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto w-full pt-[108px] pb-28 px-5 md:px-0" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "Streak & Achievements", showSearch: false }), /* @__PURE__ */ React.createElement("div", { className: "px-0 md:px-0 space-y-6" }, /* @__PURE__ */ React.createElement("section", { className: "glass-panel rounded-[2.25rem] p-6 md:p-8 flex flex-col items-center text-center" }, /* @__PURE__ */ React.createElement("div", { className: "relative mb-6" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[120px] text-primary glow-orange leading-none relative z-10", style: { fontVariationSettings: "'FILL' 1" } }, "local_fire_department")), /* @__PURE__ */ React.createElement("h2", { className: "text-8xl font-black text-primary italic glow-orange tracking-tighter mb-2" }, currentStreak, " ", streakUnit), /* @__PURE__ */ React.createElement("p", { className: "text-cream-light/40 text-lg uppercase tracking-[0.5em] font-sans font-bold" }, "Current Streak"), /* @__PURE__ */ React.createElement("p", { className: "text-cream-light/30 text-xs mt-2 uppercase tracking-wider" }, "Best: ", (gamification == null ? void 0 : gamification.longestStreak) || 0, " days")), /* @__PURE__ */ React.createElement("section", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-20" }, (rewards.length ? rewards : ["Login Starter Reward"]).map((reward, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "glass-panel card-glow rounded-3xl p-6 md:p-8 flex flex-col items-center text-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 border border-amber-400/30" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl", style: { fontVariationSettings: "'FILL' 1" } }, "military_tech")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light" }, typeof reward === "string" ? reward : reward.name), /* @__PURE__ */ React.createElement("p", { className: "text-cream-light/40 text-sm font-sans" }, "Daily login reward unlocked.")))))))
  );
};
const ALARM_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const ALARM_MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const ALARM_AMPM = ["AM", "PM"];
const AlarmWheelColumn = React.memo(({ values, selected, onChange, label, infinite = false }) => {
  const scrollRef = useRef(null);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const isManualScroll = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const isJumping = useRef(false);
  const scrollTimeout = useRef(null);
  const lastSentValue = useRef(selected);
  const itemHeight = 60;
  const momentumRef = useRef(null);
  const dragRef = useRef({ isDragging: false, startY: 0, scrollTop: 0, lastY: 0, lastTime: 0, velocity: 0, lastIdx: -1 });
  const offset = infinite ? values.length : 0;
  const displayValues = infinite ? [...values, ...values, ...values] : values;
  const stopMomentum = () => {
    if (momentumRef.current) cancelAnimationFrame(momentumRef.current);
    momentumRef.current = null;
  };
  const snapToCenter = (currentTop) => {
    if (!scrollRef.current) return;
    const totalOffset = infinite ? 1 : 0;
    const finalIdx = Math.round(currentTop / itemHeight) + totalOffset;
    const finalBaseIdx = infinite ? finalIdx % values.length : finalIdx;
    if (finalBaseIdx >= 0 && finalBaseIdx < values.length) {
      const targetTop = (finalIdx - totalOffset) * itemHeight;
      scrollRef.current.scrollTo({ top: targetTop, behavior: "smooth" });
      const newVal = values[finalBaseIdx];
      if (newVal !== selected && newVal !== lastSentValue.current) {
        lastSentValue.current = newVal;
        onChange(newVal);
      }
    }
  };
  const runMomentum = (velocity) => {
    if (!scrollRef.current || Math.abs(velocity) < 0.5) {
      snapToCenter(scrollRef.current.scrollTop);
      return;
    }
    scrollRef.current.scrollTop += velocity;
    isManualScroll.current = true;
    if (infinite) {
      const threshold = values.length * itemHeight;
      if (scrollRef.current.scrollTop < threshold * 0.5) scrollRef.current.scrollTop += threshold;
      else if (scrollRef.current.scrollTop > threshold * 1.5) scrollRef.current.scrollTop -= threshold;
    }
    const cIdx = Math.round(scrollRef.current.scrollTop / itemHeight) + (infinite ? 1 : 0);
    if (cIdx !== dragRef.current.lastIdx) {
      dragRef.current.lastIdx = cIdx;
      setCurrentIdx(cIdx);
      if (navigator.vibrate) try {
        navigator.vibrate(1);
      } catch (e) {
      }
    }
    momentumRef.current = requestAnimationFrame(() => runMomentum(velocity * 0.95));
  };
  useEffect(() => {
    if (!scrollRef.current || isManualScroll.current || isJumping.current || momentumRef.current) return;
    const initTimer = setTimeout(() => {
      if (!scrollRef.current) return;
      const baseIdx = values.findIndex((v) => String(v) === String(selected));
      if (baseIdx === -1) return;
      const targetPos = infinite ? (baseIdx + offset) * itemHeight : baseIdx * itemHeight;
      const finalScrollTop = infinite ? targetPos - itemHeight : targetPos;
      const cIdx = Math.round(finalScrollTop / itemHeight) + (infinite ? 1 : 0);
      setCurrentIdx(cIdx);
      lastSentValue.current = selected;
      if (Math.abs(scrollRef.current.scrollTop - finalScrollTop) > 1) {
        isProgrammaticScroll.current = true;
        scrollRef.current.scrollTop = finalScrollTop;
        setTimeout(() => {
          isProgrammaticScroll.current = false;
        }, 150);
      }
    }, 100);
    return () => clearTimeout(initTimer);
  }, [selected, values, offset, infinite]);
  const handleScroll = () => {
    if (!scrollRef.current || isProgrammaticScroll.current) return;
    const top = scrollRef.current.scrollTop;
    const cIdx = Math.round(top / itemHeight) + (infinite ? 1 : 0);
    if (cIdx !== currentIdx) setCurrentIdx(cIdx);
  };
  const handlePointerDown = (e) => {
    stopMomentum();
    dragRef.current = {
      isDragging: true,
      startY: e.clientY,
      scrollTop: scrollRef.current.scrollTop,
      lastY: e.clientY,
      lastTime: Date.now(),
      velocity: 0,
      lastIdx: Math.round(scrollRef.current.scrollTop / itemHeight) + (infinite ? 1 : 0)
    };
    if (scrollRef.current.setPointerCapture) try {
      scrollRef.current.setPointerCapture(e.pointerId);
    } catch (err) {
    }
    isManualScroll.current = true;
  };
  const handlePointerMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const now = Date.now();
    const dt = Math.max(1, now - dragRef.current.lastTime);
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.velocity = -dy / dt * 16;
    scrollRef.current.scrollTop -= dy;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = now;
    if (infinite) {
      const threshold = values.length * itemHeight;
      if (scrollRef.current.scrollTop < threshold * 0.5) scrollRef.current.scrollTop += threshold;
      else if (scrollRef.current.scrollTop > threshold * 1.5) scrollRef.current.scrollTop -= threshold;
    }
  };
  const handlePointerUp = (e) => {
    dragRef.current.isDragging = false;
    if (scrollRef.current.releasePointerCapture) try {
      scrollRef.current.releasePointerCapture(e.pointerId);
    } catch (err) {
    }
    if (Math.abs(dragRef.current.velocity) > 2) runMomentum(dragRef.current.velocity);
    else snapToCenter(scrollRef.current.scrollTop);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center relative overflow-hidden" }, label && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-primary/40 mb-2" }, label), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: scrollRef,
      onScroll: handleScroll,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      className: "h-[180px] w-full overflow-y-hidden no-scrollbar select-none relative z-10 touch-none pointer-events-auto",
      style: { scrollbarWidth: "none", perspective: "800px" }
    },
    !infinite && /* @__PURE__ */ React.createElement("div", { className: "h-[60px] pointer-events-none" }),
    displayValues.map((v, i) => {
      const isActive = i === currentIdx;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: `item-${v}-${i}`,
          className: `h-[60px] flex items-center justify-center text-4xl font-display select-none transition-[color,transform,opacity] duration-200 ${isActive ? "text-primary" : "text-cream-light/30"}`,
          style: {
            transformStyle: "preserve-3d",
            transform: isActive ? "scale(1.1) translateZ(40px)" : "scale(0.85) translateZ(0px)",
            opacity: isActive ? 1 : 0.45
          }
        },
        v
      );
    }),
    !infinite && /* @__PURE__ */ React.createElement("div", { className: "h-[60px] pointer-events-none" })
  ));
});
const AlarmDayCircle = ({ day, active, onToggle }) => {
  const label = ["S", "M", "T", "W", "T", "F", "S"][day];
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => onToggle(day),
      className: `w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black transition-all border ${active ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" : "bg-white/5 text-cream-light/40 border-white/5 hover:bg-white/10"}`
    },
    label
  );
};
const ClockPage = ({ user, onOpenCreator, alarms: alarms2 = [], onAddAlarm, onToggleAlarm, onDeleteAlarm, pomodoroTime, setPomodoroTime, isPomodoroActive, setIsPomodoroActive, pomodoroSessions, alarmOverlayPermission = false, onRequestAlarmOverlayPermission, onRefreshAlarmOverlayPermission, hasNativeAlarmBridge = false, alarmsOnly = false }) => {
  const location2 = useLocation();
  const queryParams = new URLSearchParams(location2.search);
  const searchQuery = (queryParams.get("search") || "").toLowerCase();
  const [now, setNow] = useState(/* @__PURE__ */ new Date());
  const filteredAlarms = useMemo(() => {
    if (!searchQuery) return alarms2;
    return alarms2.filter(
      (a) => (a.label || "Alarm").toLowerCase().includes(searchQuery) || (a.time || "").toLowerCase().includes(searchQuery)
    );
  }, [alarms2, searchQuery]);
  const [label, setLabel] = useState("");
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [selectedDays, setSelectedDays] = useState([]);
  const [snoozeTime, setSnoozeTime] = useState(5);
  const [editingAlarmId, setEditingAlarmId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const hoursArr = Array.from({ length: 12 }, (_, i) => i + 1);
  const minsArr = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const ampmArr = ["AM", "PM"];
  const DayCircle = ({ day, active, onToggle }) => {
    const label2 = ["S", "M", "T", "W", "T", "F", "S"][day];
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onToggle(day),
        className: `w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black transition-all border ${active ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" : "bg-white/5 text-cream-light/40 border-white/5 hover:bg-white/10"}`
      },
      label2
    );
  };
  const pomodoroSectionRef = useRef(null);
  const sortedAlarms = useMemo(() => [...alarms2].sort((a, b) => {
    if (!!a.enabled !== !!b.enabled) return a.enabled ? -1 : 1;
    return String(a.time || "").localeCompare(String(b.time || ""));
  }), [alarms2]);
  useEffect(() => {
    const timer = setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      onRefreshAlarmOverlayPermission == null ? void 0 : onRefreshAlarmOverlayPermission();
    }, 0);
    return () => clearTimeout(timer);
  }, [onRefreshAlarmOverlayPermission]);
  useEffect(() => {
    const params = new URLSearchParams(location2.search);
    if (params.get("focus") !== "pomodoro") return;
    const timer = setTimeout(() => {
      var _a;
      (_a = pomodoroSectionRef.current) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
    return () => clearTimeout(timer);
  }, [location2.search]);
  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();
  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours % 12 * 30 + minutes * 0.5;
  const handleStartAdd = () => {
    setEditingAlarmId(null);
    setLabel("");
    setAlarmTime("07:00");
    setSelectedDays([]);
    setSnoozeTime(5);
    setIsFormOpen(true);
  };
  const handleStartEdit = (a) => {
    setEditingAlarmId(a.id);
    setLabel(a.label || "");
    setAlarmTime(a.time || "07:00");
    setSelectedDays(a.days || []);
    setSnoozeTime(a.snooze ?? 5);
    setIsFormOpen(true);
  };
  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingAlarmId(null);
  };
  const handleSubmitAlarm = (e) => {
    e.preventDefault();
    if (!alarmTime) return;
    onAddAlarm({
      id: editingAlarmId,
      label: (label || "Alarm").trim(),
      time: alarmTime,
      days: selectedDays,
      snooze: snoozeTime,
      repeatDaily: selectedDays.length > 0
      // if any days selected, it's a repeat alarm
    });
    handleCancelForm();
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, showFab: true, onFabClick: handleStartAdd, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: `${alarmsOnly ? "max-w-4xl" : "max-w-7xl"} mx-auto w-full px-4 md:px-16 pt-0 pb-96` }, /* @__PURE__ */ React.createElement("div", { className: "md:sticky md:top-0 md:z-[100] md:py-4 md:px-16 md:mb-6" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: alarmsOnly ? "Manage every alarm" : "Manage your alarms", showSearch: true, desktopSearchPlaceholder: "Search alarms...", mobileSearchPlaceholder: "Search alarms..." })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center mt-[calc(72px+env(safe-area-inset-top,0px))] md:mt-10 mb-10 gap-4" }, /* @__PURE__ */ React.createElement("h1", { className: "text-xl md:text-3xl font-display font-bold text-cream-light tracking-[0.15em] md:tracking-[0.25em] uppercase" }, alarmsOnly ? "Alarms" : "Clock"), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" })), /* @__PURE__ */ React.createElement("div", { id: "faiora_clock_grid", className: alarmsOnly ? "grid grid-cols-1 gap-10 items-start" : "grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-start" }, !alarmsOnly && /* @__PURE__ */ React.createElement("div", { id: "faiora_clock_section", className: "space-y-8" }, /* @__PURE__ */ React.createElement("div", { id: "faiora_clock_card", className: "faiora-clock-card glass-panel rounded-[2.5rem] p-6 md:p-10 flex flex-col items-center justify-center space-y-10" }, /* @__PURE__ */ React.createElement("div", { id: "faiora_analog_clock", className: "analog-clock flex items-center justify-center relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute w-[2px] h-[108px] bg-white origin-bottom rounded-full bottom-[50%]", style: { transform: `rotate(${minuteDeg}deg)` } }), /* @__PURE__ */ React.createElement("div", { className: "absolute w-[4px] h-[72px] bg-white origin-bottom rounded-full bottom-[50%]", style: { transform: `rotate(${hourDeg}deg)` } }), /* @__PURE__ */ React.createElement("div", { className: "absolute w-[1px] h-[117px] bg-primary origin-bottom rounded-full bottom-[50%] glow-orange", style: { transform: `rotate(${secondDeg}deg)` } }), /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-primary border-2 border-white rounded-full z-10" })), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("h2", { className: "text-6xl font-display text-cream-light mb-2" }, now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), /* @__PURE__ */ React.createElement("p", { className: "text-primary/60 font-sans tracking-[0.2em] uppercase text-sm font-bold" }, now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })))), /* @__PURE__ */ React.createElement("div", { id: "faiora_pomodoro_header", className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-cream-light/90 uppercase tracking-[0.25em]" }, "Focus Mode"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20" }, pomodoroSessions, " Sessions"))), /* @__PURE__ */ React.createElement("div", { id: "faiora_pomodoro_card", ref: pomodoroSectionRef, className: "faiora-pomodoro-card glass-panel p-6 md:p-10 rounded-[2.5rem] flex flex-col items-center justify-center space-y-8 relative overflow-hidden group" }, /* @__PURE__ */ React.createElement("div", { id: "faiora_pomodoro_timer_circle", className: "relative w-64 h-64 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement("circle", { cx: "50", cy: "50", r: "46", fill: "none", stroke: "currentColor", strokeWidth: "4", className: "text-white/[0.03]" }), /* @__PURE__ */ React.createElement("circle", { cx: "50", cy: "50", r: "46", fill: "none", stroke: "url(#pomoGradient)", strokeWidth: "4", strokeLinecap: "round", strokeDasharray: "289.027", strokeDashoffset: 289.027 - 289.027 * ((1500 - pomodoroTime) / 1500), className: "transition-all duration-1000 ease-linear" }), /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "pomoGradient", x1: "0%", y1: "0%", x2: "100%", y2: "100%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#f97316" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#ef4444" })))), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-center" }, /* @__PURE__ */ React.createElement("div", { className: `text-6xl font-display font-bold text-cream-light tracking-tighter ${isPomodoroActive ? "animate-pulse" : ""}` }, Math.floor(pomodoroTime / 60), ":", String(pomodoroTime % 60).padStart(2, "0")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/30 uppercase tracking-[0.2em] mt-2" }, "Focus Mode"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-6 relative z-10" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setIsPomodoroActive(!isPomodoroActive), className: `w-16 h-16 flex items-center justify-center rounded-full transition-all duration-300 shadow-xl ${isPomodoroActive ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-primary/20 text-primary border border-primary/30"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-4xl font-bold" }, isPomodoroActive ? "pause" : "play_arrow")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setIsPomodoroActive(false);
    setPomodoroTime(25 * 60);
  }, className: "w-16 h-16 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-slate-200 transition-all border border-white/5 hover:bg-white/10" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl" }, "refresh"))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, searchQuery ? /* @__PURE__ */ React.createElement("h2", { className: "text-xs md:text-sm font-bold uppercase tracking-[0.28em] text-primary/75" }, "Search Results (", filteredAlarms.length, ")") : /* @__PURE__ */ React.createElement("h2", { className: "text-xs md:text-sm font-bold uppercase tracking-[0.28em] text-primary/75" }, "Your Alarms")), isFormOpen && (() => {
    const [h24, m] = alarmTime.split(":").map(Number);
    const ampmVal = h24 >= 12 ? "PM" : "AM";
    const h12Val = h24 % 12 || 12;
    const updateTimeFromWheels = (h12, min, ampm) => {
      let finalH = parseInt(h12);
      if (ampm === "PM" && finalH < 12) finalH += 12;
      if (ampm === "AM" && finalH === 12) finalH = 0;
      setAlarmTime(`${String(finalH).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    };
    const toggleDay = (d) => {
      setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300",
        onClick: handleCancelForm
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          id: "alarm_form_modal_samsung",
          className: "glass-panel-dark rounded-[3rem] p-8 max-w-[380px] w-full border border-white/10 bg-[#121212] animate-in zoom-in-95 duration-300 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]",
          onClick: (e) => e.stopPropagation()
        },
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmitAlarm, className: "space-y-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("h3", { className: "text-[11px] font-black text-primary tracking-[0.3em] uppercase" }, editingAlarmId ? "Edit Alarm" : "New Alarm"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleCancelForm, className: "w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-cream-light/20 hover:text-white transition-all" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-4 py-4 relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-1/2 left-0 right-0 h-[70px] -translate-y-1/2 bg-white/[0.03] border-y border-white/5 pointer-events-none rounded-xl" }), /* @__PURE__ */ React.createElement("div", { className: "w-20" }, /* @__PURE__ */ React.createElement(
          AlarmWheelColumn,
          {
            values: ALARM_HOURS,
            selected: h12Val,
            onChange: (v) => updateTimeFromWheels(v, m, ampmVal),
            infinite: true
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-display text-primary/40 mt-1" }, ":"), /* @__PURE__ */ React.createElement("div", { className: "w-20" }, /* @__PURE__ */ React.createElement(
          AlarmWheelColumn,
          {
            values: ALARM_MINUTES,
            selected: String(m).padStart(2, "0"),
            onChange: (v) => updateTimeFromWheels(h12Val, v, ampmVal),
            infinite: true
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "w-2" }), " ", /* @__PURE__ */ React.createElement("div", { className: "w-20" }, /* @__PURE__ */ React.createElement(
          AlarmWheelColumn,
          {
            values: ALARM_AMPM,
            selected: ampmVal,
            onChange: (v) => updateTimeFromWheels(h12Val, m, v)
          }
        ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-cream-light/30" }, "Repeat Days"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold text-primary tracking-widest uppercase" }, selectedDays.length === 0 ? "Once" : selectedDays.length === 7 ? "Everyday" : `${selectedDays.length} Days`)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-1" }, [0, 1, 2, 3, 4, 5, 6].map((d) => /* @__PURE__ */ React.createElement(AlarmDayCircle, { key: d, day: d, active: selectedDays.includes(d), onToggle: toggleDay })))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-cream-light/30 px-1" }, "Title"), /* @__PURE__ */ React.createElement("div", { className: "px-1" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            value: label,
            onChange: (e) => setLabel(e.target.value),
            placeholder: "Add Title",
            className: "w-full bg-transparent text-lg font-medium text-cream-light placeholder:text-white/10 outline-none border-b border-white/5 pb-2 focus:border-primary/40 transition-colors"
          }
        ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-primary/60 mt-2 uppercase tracking-widest px-1" }, (() => {
          try {
            const target = getAlarmScheduleDate(alarmTime, selectedDays);
            return `Will ring on ${target.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}`;
          } catch (e) {
            return "";
          }
        })()))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between glass-panel p-5 rounded-[1.75rem] border-white/5 bg-white/[0.02]" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.2em] text-cream-light/30" }, "Snooze"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-primary tracking-widest uppercase mt-1" }, "Fixed 5 mins")), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => setSnoozeTime(snoozeTime > 0 ? 0 : 5),
            className: `w-14 h-8 rounded-full transition-all relative ${snoozeTime > 0 ? "bg-primary/40" : "bg-white/10"}`
          },
          /* @__PURE__ */ React.createElement("div", { className: `absolute top-1.5 w-5 h-5 rounded-full transition-all shadow-md ${snoozeTime > 0 ? "left-8 bg-primary shadow-primary/40" : "left-1.5 bg-white/20"}` })
        ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-4 pt-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleCancelForm, className: "flex-1 py-5 rounded-[1.75rem] bg-white/5 text-cream-light/30 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all border border-white/5" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "flex-1 py-5 rounded-[1.75rem] bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 hover:bg-primary-dark transition-all active:scale-95" }, "Save")))
      )
    );
  })(), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, (() => {
    const enabledAlarms = sortedAlarms.filter((a) => a.enabled);
    if (enabledAlarms.length === 0 || isFormOpen) return null;
    const alarmDates = enabledAlarms.map((a) => ({
      label: a.label,
      date: getAlarmScheduleDate(a.time, a.days)
    })).sort((a, b) => a.date - b.date);
    const next = alarmDates[0];
    return /* @__PURE__ */ React.createElement("div", { className: "text-center py-4 animate-in fade-in slide-in-from-top-2 duration-500" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-black text-primary uppercase tracking-[0.4em] glow-orange" }, getWaitTimeText(next.date)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/30 uppercase tracking-widest mt-1" }, next.label || "TITLE", " \u2022 ", next.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })));
  })(), sortedAlarms.length === 0 && !isFormOpen && /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 text-cream-light/20" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-5xl mb-4" }, "notifications_off"), /* @__PURE__ */ React.createElement("p", { className: "text-sm tracking-widest uppercase" }, "No alarms set")), sortedAlarms.map((a) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: a.id,
      id: `alarm_item_${a.id}`,
      className: `glass-panel rounded-[2rem] p-6 flex items-center justify-between transition-all group hover:bg-white/[0.04] cursor-pointer ${!a.enabled ? "opacity-60 grayscale-[0.5]" : ""}`,
      onClick: () => handleStartEdit(a)
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-display tracking-tight text-cream-light group-hover:text-primary transition-colors" }, formatTime(a.time)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-cream-light/40 uppercase tracking-widest" }, a.label || "TITLE"), /* @__PURE__ */ React.createElement("span", { className: "w-1 h-1 rounded-full bg-white/10" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-primary/60 uppercase tracking-widest" }, a.days && a.days.length > 0 ? a.days.length === 7 ? "Everyday" : a.days.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ") : "Once"))),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onDeleteAlarm(a.id);
        },
        className: "w-10 h-10 rounded-xl bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all flex items-center justify-center hover:bg-red-500/20"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "delete")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onToggleAlarm(a.id);
        },
        className: `w-14 h-8 rounded-full transition-all relative ${a.enabled ? "bg-primary/40" : "bg-white/10"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: `absolute top-1.5 w-5 h-5 rounded-full transition-all shadow-md ${a.enabled ? "left-8 bg-primary shadow-primary/40" : "left-1.5 bg-white/20"}` })
    ))
  ))), hasNativeAlarmBridge && /* @__PURE__ */ React.createElement("div", { className: "pt-6" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onRequestAlarmOverlayPermission,
      className: `w-full py-4 rounded-2xl border flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${alarmOverlayPermission ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-primary/20 bg-primary/5 text-primary"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, alarmOverlayPermission ? "verified" : "error"),
    alarmOverlayPermission ? "Overlay Access Active" : "Enable Overlay Access"
  ))))));
};
const EnhancedProfilePage = ({ user, onOpenCreator, profileData: profileData2, onSaveProfile, quickTasks: quickTasks2 = [], gamification, pomodoroTime, setPomodoroTime, isPomodoroActive, setIsPomodoroActive, pomodoroSessions, activeCollection: activeCollection2, cloudFieldsCount, showToast: showToast2, isSyncHealthy: isSyncHealthy2 }) => {
  var _a, _b, _c;
  const [name, setName] = useState((profileData2 == null ? void 0 : profileData2.name) || (user == null ? void 0 : user.displayName) || "");
  const [bio, setBio] = useState((profileData2 == null ? void 0 : profileData2.bio) || "");
  const [status, setStatus] = useState((profileData2 == null ? void 0 : profileData2.status) || "");
  const [imgError, setImgError] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [now, setNow] = useState(/* @__PURE__ */ new Date());
  useEffect(() => {
    setName((profileData2 == null ? void 0 : profileData2.name) || (user == null ? void 0 : user.displayName) || "");
    setBio((profileData2 == null ? void 0 : profileData2.bio) || "");
    setStatus((profileData2 == null ? void 0 : profileData2.status) || "");
  }, [profileData2, user]);
  const normalizeAvatarUrl = useCallback((value) => {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return "";
    if (!/(googleusercontent\.com|googleapis\.com)/i.test(raw)) return raw;
    let next = raw.replace(/=s\d+-c$/i, "=s256-c").replace(/=s\d+$/i, "=s256-c").replace(/([?&])sz=\d+/i, "$1sz=256");
    if (!/[?&]sz=\d+/i.test(next)) {
      next += next.includes("?") ? "&sz=256" : "?sz=256";
    }
    return next;
  }, []);
  const avatarSources = useMemo(() => {
    var _a2, _b2, _c2;
    const providerPhoto = Array.isArray(user == null ? void 0 : user.providerData) ? (_a2 = user.providerData.find((entry) => entry == null ? void 0 : entry.photoURL)) == null ? void 0 : _a2.photoURL : "";
    const rawSources = [
      user == null ? void 0 : user.photoURL,
      providerPhoto,
      (_b2 = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _b2.photoUrl,
      (_c2 = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _c2.photoURL
    ].filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
    const expandedSources = rawSources.flatMap((src) => {
      const normalized = normalizeAvatarUrl(src);
      return normalized && normalized !== src ? [normalized, src] : [src];
    });
    return Array.from(new Set(expandedSources));
  }, [normalizeAvatarUrl, user == null ? void 0 : user.photoURL, user == null ? void 0 : user.providerData, (_a = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _a.photoURL, (_b = user == null ? void 0 : user.reloadUserInfo) == null ? void 0 : _b.photoUrl]);
  useEffect(() => {
    setAvatarIndex(0);
    setImgError(false);
  }, [avatarSources.join("|")]);
  useEffect(() => {
    const timer = setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
    return () => clearInterval(timer);
  }, []);
  const activeAvatarSrc = avatarSources[avatarIndex] || "";
  const stats = useMemo(() => buildQuickTaskStats(quickTasks2), [quickTasks2]);
  const rewards = ((_c = gamification == null ? void 0 : gamification.rewards) == null ? void 0 : _c.length) ? gamification.rewards : ["Login Starter Reward"];
  const currentStreak = (gamification == null ? void 0 : gamification.currentStreak) || 0;
  const longestStreak = (gamification == null ? void 0 : gamification.longestStreak) || 0;
  const pomodoroProgress = Math.max(0, Math.min(1, (25 * 60 - pomodoroTime) / (25 * 60)));
  const pomodoroCirc = 2 * Math.PI * 44;
  const nextDueLabel = stats.nextDueTask ? formatDueDate(stats.nextDueTask.dueDate, stats.nextDueTask.dueTime).label : "Nothing urgent";
  const handleToggleEdit = () => {
    if (isEditing) {
      onSaveProfile({ name: name.trim(), bio: bio.trim(), status: status.trim() });
    }
    setIsEditing(!isEditing);
  };
  const handleExport = () => {
    const payload = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1,
      notes: notes || [],
      quickTasks: quickTasks2 || [],
      alarms: alarms || [],
      settings: settingsData || {},
      profile: profileData2 || {}
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faiora-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast2("Backup downloaded!");
  };
  const handleImport = async (e) => {
    var _a2, _b2, _c2, _d, _e;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !Array.isArray(data.notes)) {
        showToast2("Invalid backup file.");
        return;
      }
      if (!window.confirm(`Import backup from ${((_b2 = data.exportedAt) == null ? void 0 : _b2.slice(0, 10)) || "unknown date"}? This will overwrite your current data.`)) return;
      const uid = user == null ? void 0 : user.uid;
      if (!uid) {
        showToast2("Not signed in.");
        return;
      }
      const coll = activeCollection2 || window._faiora_active_collection || `users`;
      const batch = db.batch();
      const ref = db.collection(coll).doc(uid);
      if ((_c2 = data.notes) == null ? void 0 : _c2.length) batch.set(ref, { notes: data.notes }, { merge: true });
      if ((_d = data.quickTasks) == null ? void 0 : _d.length) batch.set(ref, { quickTasks: data.quickTasks }, { merge: true });
      if ((_e = data.alarms) == null ? void 0 : _e.length) batch.set(ref, { alarms: data.alarms }, { merge: true });
      if (data.settings) batch.set(ref, { settings: data.settings }, { merge: true });
      await batch.commit();
      showToast2("Import successful! Reloading\u2026");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast2("Import failed: " + (err.message || err));
    }
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-charcoal/50" }, /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 z-[100] bg-charcoal/80 backdrop-blur-xl border-b border-white/5 py-4 px-4 md:px-12" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "Profile Dashboard", showSearch: false })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto no-scrollbar pt-12 md:pt-20 px-4 md:px-12 pb-24" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto w-full space-y-8" }, /* @__PURE__ */ React.createElement("section", { className: "grid grid-cols-1 xl:grid-cols-[1.5fr_0.5fr] gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-[2.75rem] overflow-hidden relative border-white/5 shadow-2xl bg-charcoal/40 backdrop-blur-3xl" }, /* @__PURE__ */ React.createElement("div", { className: "h-20 md:h-24 bg-gradient-to-r from-primary/40 via-primary/20 to-orange-500/10 relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" })), /* @__PURE__ */ React.createElement("div", { className: "px-6 md:px-8 pb-8 -mt-12 md:-mt-14" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row items-center md:items-end justify-between gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row items-center md:items-end gap-6 flex-1 w-full" }, /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 md:w-32 md:h-32 rounded-[2rem] overflow-hidden border-4 border-charcoal bg-zinc-900 shadow-2xl shrink-0 group relative cursor-pointer", onClick: handleToggleEdit }, activeAvatarSrc && !imgError ? /* @__PURE__ */ React.createElement(
    "img",
    {
      key: activeAvatarSrc,
      src: activeAvatarSrc,
      alt: (user == null ? void 0 : user.displayName) || "User",
      className: "w-full h-full object-cover group-hover:scale-110 transition-transform duration-500",
      referrerPolicy: "no-referrer",
      onError: () => {
        setTimeout(() => {
          if (avatarIndex < avatarSources.length - 1) {
            setAvatarIndex((prev) => prev + 1);
          } else {
            setImgError(true);
          }
        }, 0);
      }
    }
  ) : /* @__PURE__ */ React.createElement("div", { className: "w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-burnt-orange shadow-inner text-white font-black text-3xl" }, (name || (user == null ? void 0 : user.displayName) || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-white text-xl" }, "edit"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center md:text-left space-y-2 pb-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary tracking-[0.32em] uppercase" }, "Level 12 Focus Master"), isEditing ? /* @__PURE__ */ React.createElement(
    "input",
    {
      value: name,
      onChange: (e) => setName(e.target.value),
      className: "text-2xl md:text-4xl font-display text-cream-light bg-white/5 border-b border-primary/40 outline-none w-full pb-1 focus:bg-white/10 transition-all rounded-t-xl px-2"
    }
  ) : /* @__PURE__ */ React.createElement("h1", { className: "text-2xl md:text-4xl font-display text-cream-light tracking-tight truncate max-w-[300px]" }, name || (user == null ? void 0 : user.displayName) || "Adventurer"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center md:justify-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[14px] text-primary" }, "bolt"), isEditing ? /* @__PURE__ */ React.createElement("input", { value: status, onChange: (e) => setStatus(e.target.value), className: "bg-white/5 border-b border-white/10 text-[10px] uppercase font-bold tracking-widest text-cream-light/60 outline-none" }) : /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.2em] text-cream-light/40 truncate" }, status || "Stay in Motion")), isEditing ? /* @__PURE__ */ React.createElement("textarea", { value: bio, onChange: (e) => setBio(e.target.value), className: "w-full mt-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-cream-light/60 outline-none" }) : bio && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-cream-light/30 italic line-clamp-1 mt-1 font-medium" }, bio))), /* @__PURE__ */ React.createElement("div", { className: "hidden lg:flex flex-col items-center gap-3 glass-panel-dark p-4 rounded-3xl border-white/5 shadow-inner" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-20 h-20" }, /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "currentColor", strokeWidth: "8", className: "text-white/5" }), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: "50",
      cy: "50",
      r: "42",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "8",
      strokeLinecap: "round",
      strokeDasharray: 2 * Math.PI * 42,
      strokeDashoffset: 2 * Math.PI * 42 * (1 - stats.completionRate / 100),
      className: "text-primary transition-all duration-1000 ease-out"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-display text-cream-light" }, Math.round(stats.completionRate), "%"))), /* @__PURE__ */ React.createElement("p", { className: "text-[8px] font-black uppercase tracking-[0.2em] text-cream-light/30" }, "Daily Focus")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleToggleEdit,
      className: `p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isEditing ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-white/5 text-white/40 hover:text-white border border-white/5"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, isEditing ? "check" : "settings")
  ))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 pt-8 border-t border-white/5 grid grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-center md:text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-[8px] font-black uppercase tracking-[0.24em] text-cream-light/35 mb-1" }, "Total Tasks"), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-display text-cream-light" }, stats.total)), /* @__PURE__ */ React.createElement("div", { className: "text-center md:text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-[8px] font-black uppercase tracking-[0.24em] text-cream-light/35 mb-1" }, "Completed"), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-display text-primary" }, stats.completed)), /* @__PURE__ */ React.createElement("div", { className: "text-center md:text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-[8px] font-black uppercase tracking-[0.24em] text-cream-light/35 mb-1" }, "Efficiency"), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-display text-orange-400" }, stats.completionRate, "%"))))), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-[2.75rem] p-6 md:p-8 space-y-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary tracking-[0.32em] uppercase" }, "Live Clock"), /* @__PURE__ */ React.createElement("h2", { className: "text-4xl font-display text-cream-light mt-2" }, now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-[0.18em] text-cream-light/35 mt-2" }, now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }))), /* @__PURE__ */ React.createElement("div", { className: "pt-2 border-t border-white/5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary tracking-[0.32em] uppercase" }, "Next Focus"), /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-display text-cream-light mt-2" }, nextDueLabel)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.75rem] border border-white/5 bg-white/[0.03] p-4 relative overflow-hidden group" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-cream-light/35" }, "Streak"), /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-xl animate-pulse", style: { fontVariationSettings: '"FILL" 1' } }, "local_fire_department")), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-primary mt-2" }, currentStreak)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.75rem] border border-white/5 bg-white/[0.03] p-4 relative overflow-hidden group" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-cream-light/35" }, "Best"), /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/20 text-xl", style: { fontVariationSettings: '"FILL" 1' } }, "local_fire_department")), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-cream-light mt-2" }, longestStreak)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.75rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-cream-light/35" }, "Pomodoro"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-primary mt-2" }, pomodoroSessions)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.75rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.18em] text-cream-light/35" }, "Rewards"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-cream-light mt-2" }, rewards.length))))), /* @__PURE__ */ React.createElement("section", { className: "glass-panel rounded-[2.75rem] p-6 md:p-8 space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row md:items-end justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary tracking-[0.32em] uppercase" }, "Detailed Stats"), /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-display text-cream-light mt-2" }, "Your productivity snapshot")), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-[0.18em] text-cream-light/35" }, "Completion rate ", stats.completionRate, "%")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/35 font-bold" }, "Total"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-cream-light mt-2" }, stats.total)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/35 font-bold" }, "Pending"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-cream-light mt-2" }, stats.pending)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/35 font-bold" }, "Completed"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-primary mt-2" }, stats.completed)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/35 font-bold" }, "Done Today"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-primary mt-2" }, stats.doneToday)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/35 font-bold" }, "Due Today"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-cream-light mt-2" }, stats.dueToday)), /* @__PURE__ */ React.createElement("div", { className: "rounded-[1.8rem] border border-white/5 bg-white/[0.03] p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-widest text-cream-light/35 font-bold" }, "Overdue"), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-display text-rose-400 mt-2" }, stats.overdue))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-[2.75rem] border border-white/5 bg-white/[0.03] p-6 lg:p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -mr-16 -mt-16" }), /* @__PURE__ */ React.createElement("div", { className: "relative w-40 h-40 shrink-0" }, /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(249,115,22,0.1)]", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement("circle", { cx: "50", cy: "50", r: "42", fill: "none", stroke: "currentColor", strokeWidth: "12", className: "text-white/5" }), /* @__PURE__ */ React.createElement(
    "circle",
    {
      cx: "50",
      cy: "50",
      r: "42",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "12",
      strokeLinecap: "round",
      strokeDasharray: 2 * Math.PI * 42,
      strokeDashoffset: 2 * Math.PI * 42 * (1 - stats.completionRate / 100),
      className: "text-primary transition-all duration-1000 ease-out"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl font-display text-cream-light" }, Math.round(stats.completionRate), "%"), /* @__PURE__ */ React.createElement("p", { className: "text-[8px] font-black uppercase tracking-[0.2em] text-primary/60 mt-1" }, "Efficiency"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 w-full space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-4 border-b border-white/5 pb-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-black uppercase tracking-[0.24em] text-cream-light/60" }, "Completion Breakdown"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0" }, stats.noDate, " No-Date Tasks")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/30 uppercase tracking-widest" }, "Next Target"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-cream-light truncate max-w-[150px]" }, stats.nextDueTask ? formatTaskText(stats.nextDueTask.text) : "None")), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/30 uppercase tracking-widest" }, "Active Streak"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs text-primary", style: { fontVariationSettings: '"FILL" 1' } }, "local_fire_department"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-primary" }, currentStreak, " Days"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/30 uppercase tracking-widest" }, "Upcoming"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-cream-light" }, stats.dueTomorrow, " Tasks")), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/30 uppercase tracking-widest" }, "Personal Best"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-cream-light/60" }, longestStreak, " Days"))))), /* @__PURE__ */ React.createElement("div", { className: "rounded-[2rem] border border-white/5 bg-white/[0.03] p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold uppercase tracking-[0.24em] text-cream-light/55" }, "Last 7 Days"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold uppercase tracking-[0.18em] text-primary/60" }, "Completed tasks")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-7 gap-3 items-end h-36" }, stats.weekBuckets.map((bucket) => {
    const weeklyMax = Math.max(1, ...stats.weekBuckets.map((b) => b.done));
    const height = `${Math.max(10, bucket.done / weeklyMax * 100)}%`;
    return /* @__PURE__ */ React.createElement("div", { key: bucket.key, className: "flex flex-col items-center gap-3 h-full justify-end" }, /* @__PURE__ */ React.createElement("div", { className: "w-full rounded-t-2xl bg-gradient-to-t from-primary to-orange-300/80", style: { height } }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold uppercase tracking-[0.16em] text-cream-light/35" }, bucket.key));
  }))))), /* @__PURE__ */ React.createElement("section", { className: "grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-[2.75rem] p-6 md:p-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary tracking-[0.32em] uppercase" }, "Pomodoro"), /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-display text-cream-light mt-2" }, "Stay in motion")), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-primary/20" }, pomodoroSessions, " Sessions")), /* @__PURE__ */ React.createElement("div", { className: "mt-8 flex flex-col items-center text-center" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-56 h-56" }, /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full -rotate-90", viewBox: "0 0 120 120" }, /* @__PURE__ */ React.createElement("circle", { cx: "60", cy: "60", r: "44", fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: "8" }), /* @__PURE__ */ React.createElement("circle", { cx: "60", cy: "60", r: "44", fill: "none", stroke: "url(#profilePomoGradient)", strokeWidth: "8", strokeLinecap: "round", strokeDasharray: pomodoroCirc, strokeDashoffset: pomodoroCirc - pomodoroCirc * pomodoroProgress }), /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "profilePomoGradient", x1: "0%", y1: "0%", x2: "100%", y2: "100%" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#f97316" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#fdba74" })))), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: `text-5xl font-display text-cream-light tracking-tight ${isPomodoroActive ? "animate-pulse" : ""}` }, Math.floor(pomodoroTime / 60), ":", String(pomodoroTime % 60).padStart(2, "0")), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/35 uppercase tracking-[0.24em] mt-2" }, "Focus Timer"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mt-8" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setIsPomodoroActive(!isPomodoroActive), className: `w-16 h-16 rounded-full flex items-center justify-center border transition-all ${isPomodoroActive ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-primary/10 border-primary/30 text-primary"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl" }, isPomodoroActive ? "pause" : "play_arrow")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setIsPomodoroActive(false);
    setPomodoroTime(25 * 60);
    localStorage.setItem("faiora_pomo_time", String(25 * 60));
  }, className: "w-16 h-16 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-cream-light/45 hover:text-cream-light transition-all" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl" }, "refresh"))))), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-[2.75rem] p-6 md:p-8 space-y-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-black text-primary tracking-[0.32em] uppercase" }, "Achievements"), /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-display text-cream-light mt-2" }, "Streaks and rewards")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, rewards.map((reward, idx) => /* @__PURE__ */ React.createElement("div", { key: `${reward}-${idx}`, className: "rounded-[1.6rem] border border-white/5 bg-white/[0.03] px-4 py-4 flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined", style: { fontVariationSettings: '"FILL" 1' } }, "military_tech")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-cream-light" }, typeof reward === "string" ? reward : reward.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-[0.18em] text-primary/60 mt-1" }, "Unlocked reward")))))))))));
};
const ProfilePage = ({ user, onOpenCreator, profileData: profileData2, onSaveProfile, pomodoroTime, isPomodoroActive, activeCollection: activeCollection2, cloudFieldsCount }) => {
  const [name, setName] = useState((profileData2 == null ? void 0 : profileData2.name) || (user == null ? void 0 : user.displayName) || "");
  useEffect(() => {
    setName((profileData2 == null ? void 0 : profileData2.name) || (user == null ? void 0 : user.displayName) || "");
  }, [profileData2, user]);
  const handleExport = () => {
    const payload = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1,
      notes: notes || [],
      quickTasks: quickTasks || [],
      alarms: alarms || [],
      settings: settingsData || {},
      profile: profileData2 || {}
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faiora-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded!");
  };
  const handleImport = async (e) => {
    var _a, _b, _c, _d, _e;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !Array.isArray(data.notes)) {
        showToast("Invalid backup file.");
        return;
      }
      if (!window.confirm(`Import backup from ${((_b = data.exportedAt) == null ? void 0 : _b.slice(0, 10)) || "unknown date"}? This will overwrite your current data.`)) return;
      const uid = user == null ? void 0 : user.uid;
      if (!uid) {
        showToast("Not signed in.");
        return;
      }
      const coll = activeCollection2 || window._faiora_active_collection || `users`;
      const batch = db.batch();
      const ref = db.collection(coll).doc(uid);
      if ((_c = data.notes) == null ? void 0 : _c.length) batch.set(ref, { notes: data.notes }, { merge: true });
      if ((_d = data.quickTasks) == null ? void 0 : _d.length) batch.set(ref, { quickTasks: data.quickTasks }, { merge: true });
      if ((_e = data.alarms) == null ? void 0 : _e.length) batch.set(ref, { alarms: data.alarms }, { merge: true });
      if (data.settings) batch.set(ref, { settings: data.settings }, { merge: true });
      await batch.commit();
      showToast("Import successful! Reloading\u2026");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast("Import failed: " + (err.message || err));
    }
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto w-full px-4 md:px-8 pt-20 md:pt-12 pb-12" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "Profile" }), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-3xl p-6 space-y-4" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs uppercase tracking-widest text-cream-light/40" }, "Display Name"), /* @__PURE__ */ React.createElement("input", { value: name, onChange: (e) => setName(e.target.value), className: "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-cream-light" }), /* @__PURE__ */ React.createElement("button", { onClick: () => onSaveProfile({ name: name.trim() }), className: "bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider" }, "Save Profile"), /* @__PURE__ */ React.createElement("div", { className: "pt-6 border-t border-white/5 flex flex-col items-center gap-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/20 uppercase tracking-[0.2em] font-montserrat" }, "Account UID"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 justify-center w-full mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-mono text-white/30 truncate max-w-[200px]" }, user == null ? void 0 : user.uid), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        navigator.clipboard.writeText(user == null ? void 0 : user.uid);
        showToast("UID Copied");
      },
      className: "p-2 bg-white/5 hover:bg-white/10 rounded-lg text-primary/50 hover:text-primary transition-colors",
      title: "Copy UID"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "content_copy")
  )), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/20 uppercase tracking-[0.2em] font-montserrat" }, "Active Database"), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-primary font-montserrat tracking-widest uppercase" }, activeCollection2 || "Not Connected"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/20 uppercase tracking-[0.2em] font-montserrat mt-4" }, "Database Structure"), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-primary/60 font-montserrat tracking-widest uppercase mb-4" }, cloudFieldsCount || 0, " Fields Found"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-col items-center gap-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/20 uppercase tracking-[0.2em] font-montserrat" }, "Consensus Sync"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        localStorage.removeItem("faiora_active_collection");
        db.collection("faiora_metadata").doc(user.uid).delete().catch(() => {
        });
        showToast("Resetting discovery... reload app");
        setTimeout(() => window.location.reload(), 1500);
      },
      className: "px-3 py-1 bg-white/5 hover:bg-white/10 text-[9px] text-white/40 hover:text-white font-bold uppercase rounded-lg border border-white/5 transition-all"
    },
    "Re-Discovery"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        if (confirm("NUCLEAR RESET: This will wipe ALL local caches and force a fresh Google reload. Proceed?")) {
          try {
            localStorage.clear();
            await db.clearPersistence();
            showToast("Nuclear Reset Successful. Reloading...");
            setTimeout(() => window.location.reload(), 2e3);
          } catch (e) {
            alert("Wipe failed: " + e.message);
          }
        }
      },
      className: "px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-[9px] text-red-400 font-bold uppercase rounded-lg border border-red-500/20 transition-all"
    },
    "Nuclear Persistence Wipe"
  )), /* @__PURE__ */ React.createElement("p", { className: `text-[8px] font-bold uppercase tracking-widest mt-2 ${isSyncHealthy ? "text-green-500/50" : "text-red-500"}` }, "Network Health: ", isSyncHealthy ? "HEALTHY" : "UNSTABLE / STUCK")), /* @__PURE__ */ React.createElement("div", { className: "mt-8 flex flex-col items-center gap-1 opacity-50" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-cream-light/20 uppercase tracking-[0.2em] font-montserrat" }, "Faiora Version"), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-primary/40 font-montserrat tracking-widest" }, "v1.1.0-APK_STABLE"))))));
};
const DEFAULT_CATEGORY_KEYWORDS = {
  Development: [
    "fix",
    "fixes",
    "fixed",
    "fixing",
    "bug",
    "bugs",
    "debug",
    "debugging",
    "app",
    "apps",
    "apk",
    "apks",
    "software",
    "build",
    "version",
    "code",
    "coding",
    "developer",
    "dev",
    "develop",
    "programming",
    "program",
    "script",
    "scripts",
    "repo",
    "git",
    "github",
    "commit",
    "pr",
    "branch",
    "merge",
    "frontend",
    "backend",
    "fullstack",
    "api",
    "apis",
    "endpoint",
    "database",
    "db",
    "sql",
    "firestore",
    "firebase",
    "server",
    "deploy",
    "deployment",
    "feature",
    "refactor",
    "component",
    "algorithm",
    "logic",
    "integration",
    "webhook",
    "crash",
    "patch",
    "hotfix",
    "issue",
    "issues",
    "npm",
    "node",
    "react",
    "python",
    "ai",
    "model",
    "prompt",
    "kimi",
    "chatgpt",
    "gemini",
    "workflow",
    "automate"
  ],
  Design: [
    "design",
    "designs",
    "designer",
    "ui",
    "ux",
    "figma",
    "layout",
    "mockup",
    "wireframe",
    "prototype",
    "theme",
    "logo",
    "logos",
    "banner",
    "graphic",
    "graphics",
    "illustration",
    "svg",
    "icon",
    "icons",
    "typography",
    "font",
    "fonts",
    "color",
    "palette",
    "animation",
    "css",
    "styling",
    "style",
    "poster",
    "photoshop",
    "canva",
    "render",
    "asset",
    "assets"
  ],
  Maintenance: [
    "maintenance",
    "maintain",
    "clean",
    "cleaning",
    "cleanup",
    "tidy",
    "wash",
    "repair",
    "repairs",
    "repairing",
    "service",
    "servicing",
    "inspect",
    "inspection",
    "checkup",
    "organize",
    "declutter",
    "backup",
    "restore",
    "renew",
    "charge",
    "battery",
    "reboot",
    "restart",
    "hardware",
    "drill",
    "gate",
    "light",
    "wire",
    "bulb",
    "tire",
    "tires",
    "bulkit",
    "bag",
    "tahi",
    "sew",
    "assemble",
    "replace"
  ],
  Trading: [
    "trading",
    "trade",
    "trader",
    "forex",
    "crypto",
    "bitcoin",
    "btc",
    "eth",
    "stock",
    "stocks",
    "shares",
    "market",
    "chart",
    "charts",
    "indicator",
    "indicators",
    "signal",
    "signals",
    "broker",
    "mt4",
    "mt5",
    "binance",
    "bybit",
    "vt markets",
    "pnl",
    "loss",
    "profit",
    "leverage",
    "exchange",
    "candlestick",
    "ea forex",
    "migs"
  ],
  Career: [
    "career",
    "job",
    "jobs",
    "work",
    "resume",
    "cv",
    "interview",
    "interviews",
    "hr",
    "ceo",
    "manager",
    "intern",
    "internship",
    "junior",
    "senior",
    "promotion",
    "salary",
    "apply",
    "applying",
    "application",
    "linkedin",
    "contract",
    "portfolio",
    "proposal",
    "pitch",
    "client",
    "clients",
    "freelance",
    "status",
    "role"
  ],
  Events: [
    "event",
    "events",
    "party",
    "birthday",
    "wedding",
    "anniversary",
    "ceremony",
    "concert",
    "festival",
    "gathering",
    "seminar",
    "webinar",
    "conference",
    "dinner",
    "lunch",
    "breakfast",
    "celebration",
    "call",
    "zoom",
    "appointment",
    "meetup",
    "meeting"
  ],
  Shopping: [
    "shopping",
    "shop",
    "buy",
    "buying",
    "purchase",
    "order",
    "ordering",
    "groceries",
    "grocery",
    "store",
    "mall",
    "supermarket",
    "cart",
    "checkout",
    "delivery",
    "shopee",
    "lazada",
    "amazon",
    "parcel",
    "package"
  ],
  Playstore: [
    "playstore",
    "play store",
    "google play",
    "app store",
    "appstore",
    "publish",
    "listing",
    "bundle",
    "aab",
    "console",
    "store listing",
    "internal test",
    "closed test",
    "production release"
  ],
  Music: [
    "music",
    "song",
    "songs",
    "sing",
    "singing",
    "choir",
    "choirbook",
    "rehearsal",
    "practice",
    "audio",
    "beat",
    "track",
    "playlist",
    "guitar",
    "piano",
    "chords",
    "lyrics",
    "record",
    "recording",
    "speaker",
    "sound",
    "headphone",
    "instrument"
  ],
  Finance: [
    "finance",
    "money",
    "bill",
    "bills",
    "billing",
    "pay",
    "paying",
    "payment",
    "paid",
    "bank",
    "banking",
    "maribank",
    "gcash",
    "bdo",
    "bpi",
    "loan",
    "debt",
    "tax",
    "taxes",
    "receipt",
    "invoice",
    "budget",
    "expense",
    "expenses",
    "transfer",
    "wallet",
    "fund",
    "funds",
    "cash"
  ],
  Health: [
    "health",
    "doctor",
    "dentist",
    "dental",
    "clinic",
    "hospital",
    "medicine",
    "meds",
    "medication",
    "pill",
    "pills",
    "vitamin",
    "vitamins",
    "gym",
    "workout",
    "fitness",
    "exercise",
    "diet",
    "water",
    "sleep",
    "therapy"
  ],
  Study: [
    "study",
    "studying",
    "homework",
    "assignment",
    "exam",
    "quiz",
    "course",
    "lecture",
    "class",
    "lesson",
    "reading",
    "book",
    "books",
    "learn",
    "learning",
    "school",
    "college",
    "university"
  ],
  Errands: [
    "errand",
    "errands",
    "lto",
    "license",
    "plate",
    "galleria",
    "registration",
    "pick up",
    "pickup",
    "drop off",
    "dropoff",
    "deliver",
    "laundry",
    "cleaners",
    "pharmacy",
    "gas",
    "refuel",
    "hardware",
    "lost 500",
    "lost phone",
    "claim"
  ]
};
const BackupManagementSection = ({ user, activeCollection: activeCollection2, quickTasks: quickTasks2, showToast: showToast2 }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchBackups = useCallback(async (isLoadMore = false) => {
    if (!user) return;
    if (!isLoadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const taskCollection = localStorage.getItem("faiora_quick_tasks_collection") || activeCollection2 || "tasks";
      let query = db.collection(taskCollection).doc(user.uid).collection("quickTaskBackups").orderBy("timestamp", "desc").limit(10);
      if (isLoadMore && lastDoc) {
        query = query.startAfter(lastDoc);
      }
      const snapshot = await query.get();
      const backupList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 10);
      if (isLoadMore) {
        setBackups((prev) => [...prev, ...backupList]);
      } else {
        setBackups(backupList);
      }
    } catch (error) {
      console.error("Failed to fetch backups:", error);
      showToast2 == null ? void 0 : showToast2("Failed to load backups: " + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, activeCollection2, showToast2, lastDoc]);
  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);
  const handleRestore = async (backupId) => {
    setRestoring(true);
    try {
      const taskCollection = localStorage.getItem("faiora_quick_tasks_collection") || activeCollection2 || "tasks";
      const backupDoc = await db.collection(taskCollection).doc(user.uid).collection("quickTaskBackups").doc(backupId).get();
      if (!backupDoc.exists) {
        throw new Error("Backup not found");
      }
      const backup = backupDoc.data();
      if (!Array.isArray(backup.tasks)) {
        throw new Error("Invalid backup data");
      }
      const count = backup.tasks.length;
      sessionStorage.setItem("faiora_restore_backup", backupId);
      showToast2 == null ? void 0 : showToast2(`Restored ${count} tasks from backup`);
      setShowConfirm(false);
      setSelectedBackup(null);
      setTimeout(() => window.location.reload(), 1e3);
    } catch (error) {
      console.error("Restore failed:", error);
      showToast2 == null ? void 0 : showToast2("Failed to restore backup: " + error.message);
    } finally {
      setRestoring(false);
    }
  };
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };
  return /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-3xl p-6 md:p-8 space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "backup")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-bold text-primary uppercase tracking-widest" }, "Quick Task Backups"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-cream-light/40 mt-0.5" }, "Automated daily backups with 30-day retention"))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: async () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            showToast2 == null ? void 0 : showToast2("Please sign in to create a backup");
            return;
          }
          const tasks = quickTasks2 || [];
          const tasksJson = JSON.stringify(tasks);
          const backup = {
            timestamp: Date.now(),
            date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            tasks,
            count: tasks.length,
            size: tasksJson.length
          };
          const taskCollection = localStorage.getItem("faiora_quick_tasks_collection") || activeCollection2 || "tasks";
          const backupRef = db.collection(taskCollection).doc(currentUser.uid).collection("quickTaskBackups").doc(`backup_${backup.date}`);
          await backupRef.set(backup);
          showToast2 == null ? void 0 : showToast2(`Backup created: ${backup.count} tasks`);
          setLastDoc(null);
          setHasMore(true);
          fetchBackups(false);
        } catch (error) {
          console.error("Manual backup failed:", error);
          showToast2 == null ? void 0 : showToast2("Failed to create backup: " + error.message);
        }
      },
      className: "text-[10px] font-bold text-white hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/30",
      title: "Create backup now"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "add"),
    "Backup Now"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => {
        setLastDoc(null);
        setHasMore(true);
        fetchBackups(false);
      },
      className: "text-[10px] font-bold text-white/40 hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10",
      title: "Refresh backup list"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "refresh"),
    "Refresh"
  ))), loading ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, [...Array(3)].map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "h-16 bg-white/5 animate-pulse rounded-2xl" }))) : backups.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "p-6 text-center space-y-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-3xl text-white/20" }, "cloud_off"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-cream-light/40" }, "No backups available yet."), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-cream-light/30" }, "Backups are created automatically at midnight each day.")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, backups.map((backup) => /* @__PURE__ */ React.createElement("div", { key: backup.id, className: "flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-2xl transition-all group" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "folder_zip")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-cream-light group-hover:text-white transition-colors" }, formatDate(backup.date)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-cream-light/40" }, backup.count, " tasks \u2022 ", formatSize(backup.size)))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setSelectedBackup(backup);
        setShowPreview(true);
      },
      className: "px-3 py-1.5 text-xs font-bold border border-white/20 text-cream-light/80 hover:text-white hover:border-white/40 rounded-xl transition-all"
    },
    "Preview"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setSelectedBackup(backup);
        setShowConfirm(true);
      },
      className: "px-3 py-1.5 text-xs font-bold bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-xl transition-all"
    },
    "Restore"
  )))), hasMore && /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => fetchBackups(true),
      disabled: loadingMore,
      className: "w-full py-3 text-sm font-bold text-cream-light/80 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    },
    loadingMore ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base animate-spin" }, "refresh"), "Loading...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-base" }, "expand_more"), "Load More Backups")
  ))), showPreview && selectedBackup && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm", onClick: () => setShowPreview(false) }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#0a0f1d] border border-white/10 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-white" }, "Backup Preview"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-cream-light/40 mt-1" }, formatDate(selectedBackup.date), " \u2022 ", selectedBackup.count, " tasks")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowPreview(false),
      className: "w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined" }, "close")
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto space-y-2 custom-scrollbar" }, selectedBackup.tasks.slice(0, 50).map((task, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-cream-light" }, task.text)), selectedBackup.count > 50 && /* @__PURE__ */ React.createElement("p", { className: "text-center text-cream-light/40 text-sm py-2" }, "...and ", selectedBackup.count - 50, " more tasks")))), showConfirm && selectedBackup && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm", onClick: () => setShowConfirm(false) }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#0a0f1d] border border-white/10 rounded-3xl p-6 max-w-md w-full", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-white mb-4" }, "Confirm Restore"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-cream-light/80 mb-2" }, "This will replace your current ", /* @__PURE__ */ React.createElement("strong", null, (quickTasks2 == null ? void 0 : quickTasks2.length) || 0, " tasks"), " with ", /* @__PURE__ */ React.createElement("strong", null, selectedBackup.count, " tasks"), " from ", formatDate(selectedBackup.date), "."), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-yellow-500/90 mb-6 flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg mt-0.5" }, "warning"), /* @__PURE__ */ React.createElement("span", null, "This action cannot be undone. Your current tasks will be replaced.")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowConfirm(false),
      className: "px-4 py-2 border border-white/20 text-cream-light hover:bg-white/5 rounded-xl transition-all",
      disabled: restoring
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleRestore(selectedBackup.id),
      className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
      disabled: restoring
    },
    restoring ? "Restoring..." : "Restore Backup"
  )))));
};
const SettingsPage = ({ user, onOpenCreator, settingsData: settingsData2, onSaveSettings, pomodoroTime, isPomodoroActive, showToast: showToast2, notes: notes2, quickTasks: quickTasks2, alarms: alarms2, profileData: profileData2, activeCollection: activeCollection2 }) => {
  const [compactMode, setCompactMode] = useState(!!(settingsData2 == null ? void 0 : settingsData2.compactMode));
  const [dailyReminders, setDailyReminders] = useState((settingsData2 == null ? void 0 : settingsData2.dailyReminders) !== false);
  const [bgVideoEnabled, setBgVideoEnabled] = useState((settingsData2 == null ? void 0 : settingsData2.bgVideoEnabled) !== false);
  const [defaultCategory, setDefaultCategory] = useState((settingsData2 == null ? void 0 : settingsData2.defaultCategory) || "Errands");
  const [prioOffset, setPrioOffset] = useState(Number(settingsData2 == null ? void 0 : settingsData2.prioOffsetMinutes) || 10);
  const [autoCatEnabled, setAutoCatEnabled] = useState((settingsData2 == null ? void 0 : settingsData2.autoCategorizeEnabled) !== false);
  const [categoryKeywords, setCategoryKeywords] = useState(() => {
    if ((settingsData2 == null ? void 0 : settingsData2.categoryKeywords) && typeof settingsData2.categoryKeywords === "object" && Object.keys(settingsData2.categoryKeywords).length > 0) {
      return settingsData2.categoryKeywords;
    }
    return DEFAULT_CATEGORY_KEYWORDS;
  });
  const [selectedCat, setSelectedCat] = useState("Development");
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [newCatRuleName, setNewCatRuleName] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    setCompactMode(!!(settingsData2 == null ? void 0 : settingsData2.compactMode));
    setDailyReminders((settingsData2 == null ? void 0 : settingsData2.dailyReminders) !== false);
    setBgVideoEnabled((settingsData2 == null ? void 0 : settingsData2.bgVideoEnabled) !== false);
    if (settingsData2 == null ? void 0 : settingsData2.defaultCategory) setDefaultCategory(settingsData2.defaultCategory);
    if (settingsData2 == null ? void 0 : settingsData2.prioOffsetMinutes) setPrioOffset(Number(settingsData2.prioOffsetMinutes));
    if ((settingsData2 == null ? void 0 : settingsData2.autoCategorizeEnabled) !== void 0) setAutoCatEnabled(settingsData2.autoCategorizeEnabled !== false);
    if ((settingsData2 == null ? void 0 : settingsData2.categoryKeywords) && typeof settingsData2.categoryKeywords === "object" && Object.keys(settingsData2.categoryKeywords).length > 0) {
      setCategoryKeywords(settingsData2.categoryKeywords);
    }
  }, [settingsData2]);
  const saveCategorizationSettings = (patch) => {
    const nextDefault = patch.defaultCategory !== void 0 ? patch.defaultCategory : defaultCategory;
    const nextPrio = patch.prioOffsetMinutes !== void 0 ? patch.prioOffsetMinutes : prioOffset;
    const nextAuto = patch.autoCategorizeEnabled !== void 0 ? patch.autoCategorizeEnabled : autoCatEnabled;
    const nextKeywords = patch.categoryKeywords !== void 0 ? patch.categoryKeywords : categoryKeywords;
    if (patch.defaultCategory !== void 0) setDefaultCategory(patch.defaultCategory);
    if (patch.prioOffsetMinutes !== void 0) setPrioOffset(patch.prioOffsetMinutes);
    if (patch.autoCategorizeEnabled !== void 0) setAutoCatEnabled(patch.autoCategorizeEnabled);
    if (patch.categoryKeywords !== void 0) setCategoryKeywords(patch.categoryKeywords);
    onSaveSettings({
      compactMode,
      dailyReminders,
      bgVideoEnabled,
      defaultCategory: nextDefault,
      prioOffsetMinutes: nextPrio,
      autoCategorizeEnabled: nextAuto,
      categoryKeywords: nextKeywords
    });
  };
  const handleAddKeyword = (cat, text) => {
    const clean = (text || "").trim().toLowerCase();
    if (!clean || !cat) return;
    const existing = categoryKeywords[cat] || [];
    if (!existing.includes(clean)) {
      const updated = {
        ...categoryKeywords,
        [cat]: [...existing, clean]
      };
      saveCategorizationSettings({ categoryKeywords: updated });
      if (showToast2) showToast2(`Added "${clean}" to ${cat}`);
    }
    setNewKeywordInput("");
  };
  const handleRemoveKeyword = (cat, text) => {
    if (!cat) return;
    const existing = categoryKeywords[cat] || [];
    const updated = {
      ...categoryKeywords,
      [cat]: existing.filter((k) => k !== text)
    };
    saveCategorizationSettings({ categoryKeywords: updated });
    if (showToast2) showToast2(`Removed "${text}"`);
  };
  const handleAddCategoryRule = () => {
    const clean = (newCatRuleName || "").trim();
    if (!clean) return;
    const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (categoryKeywords[capitalized]) {
      if (showToast2) showToast2(`Category "${capitalized}" already exists`);
      setSelectedCat(capitalized);
      setNewCatRuleName("");
      return;
    }
    const updated = {
      ...categoryKeywords,
      [capitalized]: []
    };
    saveCategorizationSettings({ categoryKeywords: updated });
    setSelectedCat(capitalized);
    setNewCatRuleName("");
    if (showToast2) showToast2(`Created category "${capitalized}"`);
  };
  const handleDeleteCategoryRule = (cat) => {
    const copy = { ...categoryKeywords };
    delete copy[cat];
    const remaining = Object.keys(copy);
    if (remaining.length > 0) setSelectedCat(remaining[0]);
    saveCategorizationSettings({ categoryKeywords: copy });
    if (showToast2) showToast2(`Deleted ${cat} rules`);
  };
  const handleResetKeywords = () => {
    saveCategorizationSettings({
      categoryKeywords: DEFAULT_CATEGORY_KEYWORDS,
      defaultCategory: "Errands",
      prioOffsetMinutes: 10,
      autoCategorizeEnabled: true
    });
    setDefaultCategory("Errands");
    setPrioOffset(10);
    setAutoCatEnabled(true);
    setCategoryKeywords(DEFAULT_CATEGORY_KEYWORDS);
    setSelectedCat("Development");
    if (showToast2) showToast2("Keywords reset to defaults");
  };
  const updateSetting = (key, value) => {
    if (key === "compactMode") setCompactMode(value);
    if (key === "dailyReminders") setDailyReminders(value);
    if (key === "bgVideoEnabled") setBgVideoEnabled(value);
    onSaveSettings({
      compactMode: key === "compactMode" ? value : compactMode,
      dailyReminders: key === "dailyReminders" ? value : dailyReminders,
      bgVideoEnabled: key === "bgVideoEnabled" ? value : bgVideoEnabled,
      defaultCategory,
      prioOffsetMinutes: prioOffset,
      autoCategorizeEnabled: autoCatEnabled,
      categoryKeywords
    });
  };
  const handleExport = () => {
    let sections = [];
    let categories = [];
    let trashNotes = [];
    let trashTasks = [];
    let pomoSessions = 0;
    let visibleSections = null;
    let reminderMarks = {};
    try {
      sections = JSON.parse(localStorage.getItem("faiora_sections") || "[]");
    } catch {
    }
    try {
      categories = JSON.parse(localStorage.getItem("faiora_qt_categories") || "[]");
    } catch {
    }
    try {
      visibleSections = JSON.parse(localStorage.getItem("faiora_qt_visible_sections") || "null");
    } catch {
    }
    try {
      pomoSessions = parseInt(localStorage.getItem("faiora_pomo_sessions") || "0", 10);
    } catch {
    }
    try {
      const uid = user == null ? void 0 : user.uid;
      if (uid) {
        trashNotes = JSON.parse(localStorage.getItem("faiora_trash_notes_" + uid) || "[]");
        trashTasks = JSON.parse(localStorage.getItem("faiora_quick_task_trash_" + uid) || "[]");
        reminderMarks = JSON.parse(localStorage.getItem("faiora_reminder_marks_" + uid) || "{}");
      }
    } catch {
    }
    const payload = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: 1,
      notes: notes2 || [],
      quickTasks: quickTasks2 || [],
      alarms: alarms2 || [],
      settings: settingsData2 || {},
      profile: profileData2 || {},
      categories,
      sections,
      trashNotes,
      trashTasks,
      pomoSessions,
      visibleSections,
      reminderMarks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faiora-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast2("Backup downloaded!");
  };
  const handleImport = async (e) => {
    var _a, _b, _c;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !Array.isArray(data.notes)) {
        showToast2("Invalid backup file.");
        return;
      }
      const noteCount = ((_b = data.notes) == null ? void 0 : _b.length) || 0;
      const taskCount = ((_c = data.quickTasks) == null ? void 0 : _c.length) || 0;
      if (!window.confirm(`Import and merge backup (${noteCount} notes, ${taskCount} quick tasks)? Existing items will be preserved and updated.`)) return;
      const uid = user == null ? void 0 : user.uid;
      if (!uid) {
        showToast2("Not signed in.");
        return;
      }
      const coll = activeCollection2 || window._faiora_active_collection || `users`;
      const existingNotes = Array.isArray(notes2) ? [...notes2] : [];
      const mergedNotesMap = /* @__PURE__ */ new Map();
      existingNotes.forEach((n) => {
        if (n == null ? void 0 : n.id) mergedNotesMap.set(n.id, n);
      });
      (data.notes || []).forEach((n) => {
        if (n == null ? void 0 : n.id) {
          mergedNotesMap.set(n.id, { ...mergedNotesMap.get(n.id) || {}, ...n, updatedAt: n.updatedAt || Date.now() });
        }
      });
      const finalNotes = Array.from(mergedNotesMap.values());
      const existingTasks = Array.isArray(quickTasks2) ? [...quickTasks2] : [];
      const mergedTasksMap = /* @__PURE__ */ new Map();
      existingTasks.forEach((t) => {
        if (t == null ? void 0 : t.id) mergedTasksMap.set(t.id, t);
      });
      (data.quickTasks || []).forEach((t) => {
        if (t == null ? void 0 : t.id) {
          mergedTasksMap.set(t.id, { ...mergedTasksMap.get(t.id) || {}, ...t, updatedAt: t.updatedAt || Date.now() });
        }
      });
      const finalTasks = Array.from(mergedTasksMap.values());
      const existingAlarms = Array.isArray(alarms2) ? [...alarms2] : [];
      const mergedAlarmsMap = /* @__PURE__ */ new Map();
      existingAlarms.forEach((a) => {
        if (a == null ? void 0 : a.id) mergedAlarmsMap.set(a.id, a);
      });
      (data.alarms || []).forEach((a) => {
        if (a == null ? void 0 : a.id) mergedAlarmsMap.set(a.id, { ...mergedAlarmsMap.get(a.id) || {}, ...a });
      });
      const finalAlarms = Array.from(mergedAlarmsMap.values());
      const finalSettings = { ...settingsData2 || {}, ...data.settings || {} };
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        try {
          const existingCats = JSON.parse(localStorage.getItem("faiora_qt_categories") || "[]");
          const mergedCats = Array.from(/* @__PURE__ */ new Set([...existingCats, ...data.categories]));
          localStorage.setItem("faiora_qt_categories", JSON.stringify(mergedCats));
        } catch {
        }
      }
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        try {
          const existingSecs = JSON.parse(localStorage.getItem("faiora_sections") || "[]");
          const mergedSecs = Array.from(/* @__PURE__ */ new Set([...existingSecs, ...data.sections]));
          localStorage.setItem("faiora_sections", JSON.stringify(mergedSecs));
        } catch {
        }
      }
      if (data.visibleSections) {
        try {
          localStorage.setItem("faiora_qt_visible_sections", JSON.stringify(data.visibleSections));
        } catch {
        }
      }
      if (typeof data.pomoSessions === "number") {
        try {
          localStorage.setItem("faiora_pomo_sessions", String(data.pomoSessions));
        } catch {
        }
      }
      if (data.reminderMarks && typeof data.reminderMarks === "object") {
        try {
          const existingMarks = JSON.parse(localStorage.getItem("faiora_reminder_marks_" + uid) || "{}");
          const mergedMarks = { ...existingMarks, ...data.reminderMarks };
          localStorage.setItem("faiora_reminder_marks_" + uid, JSON.stringify(mergedMarks));
        } catch {
        }
      }
      if (Array.isArray(data.trashNotes)) {
        try {
          localStorage.setItem("faiora_trash_notes_" + uid, JSON.stringify(data.trashNotes));
        } catch {
        }
      }
      if (Array.isArray(data.trashTasks)) {
        try {
          localStorage.setItem("faiora_quick_task_trash_" + uid, JSON.stringify(data.trashTasks));
        } catch {
        }
      }
      const notesMap = {};
      finalNotes.forEach((n) => {
        if (n == null ? void 0 : n.id) notesMap[n.id] = n;
      });
      const tasksMap = {};
      finalTasks.forEach((t) => {
        if (t == null ? void 0 : t.id) tasksMap[t.id] = t;
      });
      const targetColls = Array.from(/* @__PURE__ */ new Set([coll, "tasks", "users", "userdata", "notes", "faiora_data"])).filter(Boolean);
      for (const targetColl of targetColls) {
        try {
          await db.collection(targetColl).doc(uid).set({
            notes: notesMap,
            quickTasks: tasksMap,
            alarms: finalAlarms,
            settings: finalSettings
          }, { merge: true });
        } catch (writeErr) {
          console.warn("Import write to collection failed:", targetColl, writeErr);
        }
      }
      try {
        localStorage.setItem("faiora_notes_" + uid, JSON.stringify(finalNotes));
        localStorage.setItem("faiora_quick_tasks_" + uid, JSON.stringify(finalTasks));
        localStorage.setItem("faiora_alarms_" + uid, JSON.stringify(finalAlarms));
        localStorage.setItem("faiora_settings_" + uid, JSON.stringify(finalSettings));
      } catch (cacheErr) {
        console.warn("Cache write failed:", cacheErr);
      }
      showToast2("Import & merge successful! Reloading\u2026");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast2("Import failed: " + (err.message || err));
    }
  };
  const ToggleSwitch = ({ checked, onChange, label, description, icon }) => /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => onChange(!checked),
      className: "flex items-center justify-between p-3.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer group select-none"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 pr-3" }, icon && /* @__PURE__ */ React.createElement("div", { className: `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${checked ? "bg-primary/25 text-primary" : "bg-white/5 text-cream-light/50 group-hover:text-cream-light/80"}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[18px]" }, icon)), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-[13px] font-semibold text-cream-light group-hover:text-white transition-colors leading-tight" }, label), description && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-cream-light/45 mt-0.5 leading-snug" }, description))),
    /* @__PURE__ */ React.createElement("div", { className: `w-11 h-6 flex items-center rounded-full p-0.5 transition-all duration-200 shrink-0 ${checked ? "bg-primary shadow-[0_0_12px_rgba(249,115,22,0.4)]" : "bg-white/20"}` }, /* @__PURE__ */ React.createElement("div", { className: `bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}` }))
  );
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto w-full px-3 md:px-6 pt-[88px] md:pt-16 pb-24" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "Settings" }), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-base" }, "tune"), /* @__PURE__ */ React.createElement("h3", { className: "text-[10px] font-bold text-primary uppercase tracking-[0.1em]" }, "Preferences & Display")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, /* @__PURE__ */ React.createElement(
    ToggleSwitch,
    {
      checked: bgVideoEnabled,
      onChange: (val) => updateSetting("bgVideoEnabled", val),
      label: "Background Ember Video",
      description: "Play the ambient fiery embers video background",
      icon: "videocam"
    }
  ), /* @__PURE__ */ React.createElement(
    ToggleSwitch,
    {
      checked: compactMode,
      onChange: (val) => updateSetting("compactMode", val),
      label: "Compact Task Cards",
      description: "Display quick tasks in a condensed minimal layout",
      icon: "density_medium"
    }
  ), /* @__PURE__ */ React.createElement(
    ToggleSwitch,
    {
      checked: dailyReminders,
      onChange: (val) => updateSetting("dailyReminders", val),
      label: "Daily Reminder Nudges",
      description: "Receive daily notifications and streak reminders",
      icon: "notifications_active"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-base" }, "auto_awesome"), /* @__PURE__ */ React.createElement("h3", { className: "text-[10px] font-bold text-primary uppercase tracking-[0.1em]" }, "Auto-Categorization")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleResetKeywords,
      className: "text-[9px] font-bold text-white/40 hover:text-primary transition-colors flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10",
      title: "Reset keywords to defaults"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[11px]" }, "restart_alt"),
    "Reset"
  )), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, /* @__PURE__ */ React.createElement(
    ToggleSwitch,
    {
      checked: autoCatEnabled,
      onChange: (val) => saveCategorizationSettings({ autoCategorizeEnabled: val }),
      label: "Smart Keyword Categorization",
      description: "Automatically tag categories while typing task titles",
      icon: "label"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-white/[0.03] rounded-xl border border-white/5 space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-cream-light/70 uppercase tracking-wider block" }, "Default Category"), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-cream-light/40 leading-snug" }, "Fallback when no keywords match"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: defaultCategory,
      onChange: (e) => setDefaultCategory(e.target.value),
      onBlur: () => saveCategorizationSettings({ defaultCategory }),
      placeholder: "e.g. Errands",
      className: "w-full bg-[#0a0f1d] text-white text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-primary/50 outline-none font-montserrat mt-1"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-white/[0.03] rounded-xl border border-white/5 space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[10px] font-bold text-cream-light/70 uppercase tracking-wider block" }, "Priority Offset"), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] text-cream-light/40 leading-snug" }, "Minutes before earliest task"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 mt-1" }, [5, 10, 15, 20, 30].map((mins) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: mins,
      type: "button",
      onClick: () => saveCategorizationSettings({ prioOffsetMinutes: mins }),
      className: `flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${prioOffset === mins ? "bg-primary text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`
    },
    mins,
    "m"
  ))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 pt-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-cream-light/70 uppercase tracking-wider" }, "Category Keywords & Synonyms"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-primary/70" }, Object.keys(categoryKeywords).length, " categories")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-black/20 rounded-2xl border border-white/5" }, Object.keys(categoryKeywords).map((catName) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: catName,
      type: "button",
      onClick: () => setSelectedCat(catName),
      className: `px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all ${selectedCat.toLowerCase() === catName.toLowerCase() ? "bg-primary text-white shadow-sm" : "bg-white/5 text-cream-light/60 hover:text-white hover:bg-white/10"}`
    },
    catName
  ))), selectedCat && /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-[#0a0f1d]/80 rounded-2xl border border-white/10 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-full bg-primary animate-pulse" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-white font-montserrat tracking-wide uppercase" }, selectedCat, " Keywords"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-cream-light/40" }, "(", (categoryKeywords[selectedCat] || []).length, " keywords)")), Object.keys(categoryKeywords).length > 1 && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleDeleteCategoryRule(selectedCat),
      className: "text-white/30 hover:text-rose-400 text-xs transition-colors p-1 rounded-lg",
      title: `Delete ${selectedCat} category rule`
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "delete")
  )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1" }, (categoryKeywords[selectedCat] || []).map((keyword, kidx) => /* @__PURE__ */ React.createElement(
    "span",
    {
      key: kidx,
      className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-[11px] hover:border-rose-400/40"
    },
    /* @__PURE__ */ React.createElement("span", null, keyword),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => handleRemoveKeyword(selectedCat, keyword),
        className: "text-white/30 hover:text-rose-400 transition-colors ml-0.5"
      },
      /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[12px]" }, "close")
    )
  )), (categoryKeywords[selectedCat] || []).length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-white/30 italic py-1" }, "No keywords yet. Add keywords or synonyms below.")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 pt-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: newKeywordInput,
      onChange: (e) => setNewKeywordInput(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          handleAddKeyword(selectedCat, newKeywordInput);
        }
      },
      placeholder: `Add keyword for ${selectedCat} (Enter to add)...`,
      className: "flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-xl border border-white/10 focus:border-primary/50 outline-none"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => handleAddKeyword(selectedCat, newKeywordInput),
      className: "px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-xs rounded-xl transition-all"
    },
    "Add"
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 pt-2 border-t border-white/5" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: newCatRuleName,
      onChange: (e) => setNewCatRuleName(e.target.value),
      placeholder: "Add new category name...",
      className: "flex-1 bg-white/5 text-white text-xs px-3 py-1.5 rounded-xl border border-white/10 focus:border-primary/50 outline-none"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleAddCategoryRule,
      className: "px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all"
    },
    "+ Category"
  ))))), /* @__PURE__ */ React.createElement(
    BackupManagementSection,
    {
      user,
      activeCollection: activeCollection2,
      quickTasks: quickTasks2,
      showToast: showToast2
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-4 md:p-5 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-base" }, "database"), /* @__PURE__ */ React.createElement("h3", { className: "text-[10px] font-bold text-primary uppercase tracking-[0.1em]" }, "Data Management")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/trash"),
      className: "flex items-center justify-between w-full p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-xl transition-all group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[16px]" }, "delete")), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-[13px] font-semibold text-cream-light group-hover:text-white transition-colors" }, "Trash Folder"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-cream-light/40 mt-0.5" }, "View and restore deleted items"))),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-slate-500 text-[18px] group-hover:translate-x-1 transition-transform" }, "chevron_right")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        if (window.confirm("Deep Scan will thoroughly verify all backup collections for missing notes. This may take a few moments. Proceed?")) {
          if (window.faiora_deep_scan) await window.faiora_deep_scan();
          showToast2("Deep scan complete. Restarting sync...");
          window.location.reload();
        }
      },
      className: "flex items-center justify-between w-full p-3 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all group border border-primary/20",
      id: "settings-repair-sync-button"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[16px] animate-pulse" }, "terminal")), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-[13px] font-bold text-primary" }, "Repair Sync & Deep Scan"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-primary/60 mt-0.5" }, "Recover missing notes"))),
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-[18px] group-hover:rotate-180 transition-transform duration-500" }, "sync")
  )), /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t border-white/10 space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-cream-light/50 font-semibold uppercase tracking-wider" }, "Backup & Restore"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      id: "settings-export-btn",
      onClick: handleExport,
      className: "flex items-center justify-center gap-1.5 p-2.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 rounded-xl transition-all group"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-[16px] group-hover:-translate-y-0.5 transition-transform" }, "download"),
    /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-primary" }, "Export")
  ), /* @__PURE__ */ React.createElement(
    "label",
    {
      id: "settings-import-label",
      htmlFor: "settings-import-input",
      className: "flex items-center justify-center gap-1.5 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group cursor-pointer"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-cream-light/70 text-[16px] group-hover:-translate-y-0.5 transition-transform" }, "upload"),
    /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-cream-light/90" }, "Import"),
    /* @__PURE__ */ React.createElement("input", { id: "settings-import-input", type: "file", accept: ".json", className: "hidden", onChange: handleImport })
  )))))));
};
const TrashPage = ({
  user,
  onOpenCreator,
  trashNotes,
  trashQuickTasks = [],
  onRestoreNote,
  onRestoreQuickTask,
  onPermanentDelete,
  onPermanentDeleteQuickTask,
  onEmptyTrash,
  onEmptyQuickTaskTrash,
  pomodoroTime,
  isPomodoroActive
}) => {
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const dayMs = 24 * 60 * 60 * 1e3;
  const retentionMs = 30 * dayMs;
  const totalTrashCount = ((trashNotes == null ? void 0 : trashNotes.length) || 0) + ((trashQuickTasks == null ? void 0 : trashQuickTasks.length) || 0);
  const getDaysLeft = useCallback((item) => {
    const deletedAt = (item == null ? void 0 : item.deletedAt) ? new Date(item.deletedAt).getTime() : Date.now();
    const remaining = retentionMs - (Date.now() - deletedAt);
    return Math.max(0, Math.ceil(remaining / dayMs));
  }, [dayMs, retentionMs]);
  const sortedTrashNotes = useMemo(() => [...trashNotes || []].sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)), [trashNotes]);
  const sortedTrashQuickTasks = useMemo(() => [...trashQuickTasks || []].sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)), [trashQuickTasks]);
  const renderCountdownChip = (item, accent = "text-amber-300 border-amber-300/20 bg-amber-500/10") => /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${accent}` }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[12px]" }, "timer"), getDaysLeft(item), "d left");
  const emptyAllTrash = () => {
    onEmptyTrash && onEmptyTrash();
    onEmptyQuickTaskTrash && onEmptyQuickTaskTrash();
    setShowConfirmEmpty(false);
  };
  return /* @__PURE__ */ React.createElement(Layout, { onOpenCreator, showFab: false, pomodoroTime, isPomodoroActive }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto w-full px-4 md:px-16 pt-[110px] md:pt-12 pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8" }, /* @__PURE__ */ React.createElement(Header, { user, subtitle: "Trash" }), totalTrashCount > 0 && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowConfirmEmpty(true),
      className: "flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-rose-500/20 self-start"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm" }, "delete_forever"),
    "Empty All"
  )), totalTrashCount === 0 ? /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-4xl text-slate-600" }, "delete_outline")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light mb-2" }, "Trash is empty"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500 max-w-xs" }, "Deleted notes and quick tasks stay here for 30 days before they are permanently removed.")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-12" }, /* @__PURE__ */ React.createElement("section", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary" }, "description"), /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em]" }, "Notes"), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/40 uppercase tracking-[0.18em]" }, sortedTrashNotes.length), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" })), sortedTrashNotes.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-6 text-sm text-white/35 border-dashed border-white/10" }, "No deleted notes right now.") : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, sortedTrashNotes.map((note) => /* @__PURE__ */ React.createElement("div", { key: note.id, className: "glass-panel p-4 rounded-2xl flex items-center justify-between gap-4 group border border-white/5 hover:border-primary/20 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xl" }, note.noteIcon || "description")), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-cream-light/90 truncate leading-tight" }, note.title || "Untitled"), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold text-white/20 uppercase tracking-[0.15em] mt-1 text-slate-500" }, "Deleted ", new Date(note.deletedAt).toLocaleDateString()))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-6 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "hidden sm:block" }, renderCountdownChip(note)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 border-l border-white/10 pl-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingAction({ type: "restore", itemType: "note", id: note.id, title: note.title || "Untitled" }),
      className: "w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all shadow-lg",
      title: "Restore Note"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "restore")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingAction({ type: "delete", itemType: "note", id: note.id, title: note.title || "Untitled" }),
      className: "w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all",
      title: "Delete Forever"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "delete_forever")
  ))))))), /* @__PURE__ */ React.createElement("section", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-amber-300" }, "checklist"), /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em]" }, "Quick Tasks"), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/40 uppercase tracking-[0.18em]" }, sortedTrashQuickTasks.length), /* @__PURE__ */ React.createElement("div", { className: "h-px flex-1 bg-gradient-to-r from-amber-400/20 to-transparent" })), sortedTrashQuickTasks.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass-panel rounded-2xl p-6 text-sm text-white/35 border-dashed border-amber-300/10" }, "No deleted quick tasks right now.") : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, sortedTrashQuickTasks.map((task) => /* @__PURE__ */ React.createElement("div", { key: task.id, className: "glass-panel p-4 rounded-2xl flex items-center justify-between gap-4 group border border-white/5 hover:border-amber-300/20 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-300 shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xl" }, "checklist")), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-cream-light/90 truncate leading-tight" }, formatTaskText(task.text)), /* @__PURE__ */ React.createElement("p", { className: "text-[9px] font-bold text-white/20 uppercase tracking-[0.15em] mt-1 text-slate-500" }, "Deleted ", new Date(task.deletedAt).toLocaleDateString(), task.dueDate ? ` \u2022 Due ${task.dueTime ? formatDateMinimal(task.dueDate) : formatReminderDate(task.dueDate)}` : ""))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-6 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "hidden sm:block" }, renderCountdownChip(task, "text-amber-300 border-amber-300/20 bg-amber-500/10")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 border-l border-white/10 pl-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingAction({ type: "restore", itemType: "task", id: task.id, title: task.text }),
      className: "w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-black transition-all shadow-lg",
      title: "Restore Task"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "restore")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPendingAction({ type: "delete", itemType: "task", id: task.id, title: task.text }),
      className: "w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-all",
      title: "Delete Forever"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "delete_forever")
  )))))))), pendingAction && /* @__PURE__ */ React.createElement(
    ConfirmationModal,
    {
      title: pendingAction.type === "restore" ? `Restore ${pendingAction.itemType === "note" ? "Note" : "Task"}?` : `Delete ${pendingAction.itemType === "note" ? "Note" : "Task"}?`,
      message: pendingAction.type === "restore" ? `Are you sure you want to restore "${pendingAction.title}"? It will be moved back to your main collection.` : `Are you sure you want to permanently delete "${pendingAction.title}"? This action cannot be undone.`,
      onConfirm: () => {
        if (pendingAction.type === "restore") {
          pendingAction.itemType === "note" ? onRestoreNote(pendingAction.id) : onRestoreQuickTask(pendingAction.id);
        } else {
          pendingAction.itemType === "note" ? onPermanentDelete(pendingAction.id) : onPermanentDeleteQuickTask(pendingAction.id);
        }
        setPendingAction(null);
      },
      onCancel: () => setPendingAction(null),
      confirmText: pendingAction.type === "restore" ? "Restore" : "Delete Forever",
      danger: pendingAction.type === "delete"
    }
  ), showConfirmEmpty && /* @__PURE__ */ React.createElement(
    ConfirmationModal,
    {
      title: "Empty Trash?",
      message: "This will permanently delete all notes and quick tasks in the trash. This action cannot be undone.",
      onConfirm: emptyAllTrash,
      onCancel: () => setShowConfirmEmpty(false),
      confirmText: "Empty All",
      danger: true
    }
  )));
};
const LoadingPage = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 200);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return /* @__PURE__ */ React.createElement("div", { className: "faiora-loading-screen fixed inset-0 z-50 blur-overlay flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "loading-arc-container relative flex items-center justify-center w-[252px] h-[252px]" }, /* @__PURE__ */ React.createElement("div", { className: "loading-arc" }), /* @__PURE__ */ React.createElement("div", { className: "faiora-loading-brand absolute flex flex-col items-center text-center z-10" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "flame-container" }, [...Array(5)].map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flame-tongue", style: { animationDelay: i * 0.15 + "s" } }))), /* @__PURE__ */ React.createElement("h1", { className: "faiora-loading-title text-7xl font-display font-bold tracking-tight text-cream-light italic leading-none drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]" }, "Faiora")), /* @__PURE__ */ React.createElement("div", { className: "faiora-loading-copy mt-8" }, /* @__PURE__ */ React.createElement("p", { className: "text-primary text-[10px] uppercase tracking-[0.8em] font-sans font-bold" }, "Fallo ora")))), /* @__PURE__ */ React.createElement("div", { className: "faiora-loading-progress-wrap absolute bottom-24 w-full px-12 max-w-md" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-end mb-4 px-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-sans font-medium uppercase tracking-[0.2em] text-white/40" }, "Awakening Systems"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-sans font-bold text-primary tracking-tighter" }, "100%")), /* @__PURE__ */ React.createElement("div", { className: "relative h-[4px] w-full bg-white/5 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 h-full bg-primary w-full rounded-full transition-all duration-[2000ms] ease-out" }))));
};
const NotificationBanner = ({ user }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const evaluateVisibility = async () => {
      var _a, _b, _c;
      const dismissed = localStorage.getItem("faiora_notif_banner_dismissed");
      if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        const sevenDays = 7 * 24 * 60 * 60 * 1e3;
        if (Date.now() - dismissedAt < sevenDays) return;
      }
      let shouldPrompt = false;
      if (FaioraNotifications.hasNativeLocalNotifications()) {
        try {
          const plugin = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.LocalNotifications;
          const current = await ((_c = plugin == null ? void 0 : plugin.checkPermissions) == null ? void 0 : _c.call(plugin));
          shouldPrompt = (current == null ? void 0 : current.display) === "prompt";
        } catch (error) {
          console.warn("Native notification banner check failed", error);
        }
      } else if ("Notification" in window) {
        shouldPrompt = Notification.permission !== "granted" && Notification.permission !== "denied";
      }
      if (!shouldPrompt || !isMounted) return;
      const timer = setTimeout(() => {
        if (isMounted) setVisible(true);
      }, 2e3);
      return () => clearTimeout(timer);
    };
    let cleanup = null;
    evaluateVisibility().then((fn) => {
      cleanup = fn;
    });
    return () => {
      isMounted = false;
      if (typeof cleanup === "function") cleanup();
    };
  }, [user]);
  const handleEnable = async () => {
    var _a, _b, _c, _d;
    const result = await FaioraNotifications.requestPermission();
    if (result === "granted" && FaioraNotifications.hasNativeLocalNotifications()) {
      try {
        const plugin = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.LocalNotifications;
        const exact = await ((_c = plugin == null ? void 0 : plugin.checkExactNotificationSetting) == null ? void 0 : _c.call(plugin));
        if ((exact == null ? void 0 : exact.exact_alarm) && exact.exact_alarm !== "granted") {
          await ((_d = plugin == null ? void 0 : plugin.changeExactNotificationSetting) == null ? void 0 : _d.call(plugin));
        }
      } catch (error) {
        console.warn("Exact alarm settings prompt failed", error);
      }
    }
    setVisible(false);
    if (result !== "granted") {
      localStorage.setItem("faiora_notif_banner_dismissed", String(Date.now()));
    }
  };
  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("faiora_notif_banner_dismissed", String(Date.now()));
  };
  if (!visible) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "faiora-mobile-banner fixed top-0 left-0 right-0 z-[300] px-4 pt-3 pb-0 md:flex md:justify-center pointer-events-none", style: { paddingTop: "env(safe-area-inset-top, 12px)" } }, /* @__PURE__ */ React.createElement("div", { className: "pointer-events-auto w-full md:max-w-lg bg-gradient-to-r from-orange-950/95 via-black/95 to-orange-950/95 backdrop-blur-2xl border border-orange-500/30 rounded-2xl p-4 shadow-[0_8px_40px_rgba(249,115,22,0.25)] flex items-center gap-3 animate-in slide-in-from-top-4 duration-500" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-orange-400 text-xl", style: { fontVariationSettings: '"FILL" 1' } }, "notifications_active")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-cream-light text-sm font-bold leading-tight" }, "Enable Notifications"), /* @__PURE__ */ React.createElement("p", { className: "text-white/50 text-[11px] font-sans mt-0.5 leading-snug" }, "Get task reminders and alarm alerts on this device")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleEnable,
      className: "shrink-0 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/30"
    },
    "Enable"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleDismiss,
      className: "shrink-0 w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors rounded-full hover:bg-white/5"
    },
    /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close")
  )));
};
const TransitionManager = ({ children, onTransitionStart, onTransitionEnd }) => {
  const FIRE_WIPE_DURATION_MS = 1200;
  const location2 = useLocation();
  const [displayLocation, setDisplayLocation] = useState(() => normalizeRouteLocation(location2));
  const [isWiping, setIsWiping] = useState(false);
  const [isDissolving, setIsDissolving] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const playFireSFX = () => {
    const audio = new Audio("fire_transition_sfx.mp3");
    audio.volume = 0.6;
    audio.play().catch((e) => {
    });
    setTimeout(() => {
      const fadeDuration = 500;
      const step = 0.05;
      const interval = fadeDuration / (0.4 / step);
      const fadeInterval = setInterval(() => {
        if (audio.volume > step) {
          audio.volume -= step;
        } else {
          audio.volume = 0;
          clearInterval(fadeInterval);
          audio.pause();
        }
      }, interval);
    }, 1e3);
  };
  const lastPath = useRef(location2.pathname || "/");
  const timers = useRef([]);
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const startTransition = (newLoc) => {
    clearTimers();
    setIsDissolving(true);
    setIsFadingIn(false);
    if (onTransitionStart) setTimeout(() => onTransitionStart(), 0);
    const t0 = setTimeout(() => {
      setIsWiping(true);
      setTransitionKey((prev) => prev + 1);
      playFireSFX();
    }, 220);
    const t1 = setTimeout(() => {
      setDisplayLocation(normalizeRouteLocation(newLoc));
    }, 450);
    const t2 = setTimeout(() => {
      setIsDissolving(false);
      setIsFadingIn(true);
    }, 700);
    const t3 = setTimeout(() => {
      if (onTransitionEnd) setTimeout(() => onTransitionEnd(), 0);
    }, 780);
    const t4 = setTimeout(() => {
      setIsWiping(false);
    }, 1350);
    const t5 = setTimeout(() => {
      setIsFadingIn(false);
    }, 1600);
    timers.current = [t0, t1, t2, t3, t4, t5];
  };
  useEffect(() => {
    setDisplayLocation(normalizeRouteLocation(location2));
    lastPath.current = location2.pathname || "/";
  }, []);
  useEffect(() => {
    const safety = setTimeout(() => {
      setIsDissolving(false);
      setIsWiping(false);
      setIsFadingIn(false);
    }, 1600);
    return () => clearTimeout(safety);
  }, []);
  useEffect(() => {
    const path = location2.pathname || "/";
    if (path !== lastPath.current) {
      const params = new URLSearchParams(location2.search);
      if (params.has("search")) {
        setDisplayLocation(normalizeRouteLocation(location2));
        lastPath.current = path;
        return;
      }
      lastPath.current = path;
      startTransition(location2);
    }
  }, [location2.pathname]);
  const dissolveClass = isDissolving ? "route-dissolve-out" : isFadingIn ? "route-dissolve-in" : "";
  return /* @__PURE__ */ React.createElement("div", { className: "relative w-full h-full overflow-hidden" }, isWiping && /* @__PURE__ */ React.createElement("div", { key: transitionKey, className: "fire-wipe-overlay fire-wipe-active pointer-events-none" }, /* @__PURE__ */ React.createElement("div", { className: "relative z-10 w-full flex items-center justify-center pointer-events-none" }, /* @__PURE__ */ React.createElement("div", { className: "fire-wipe-sprite" }))), /* @__PURE__ */ React.createElement("div", { key: displayLocation.pathname || "/", className: "app-route-shell w-full h-full min-h-0 flex flex-col " + dissolveClass }, /* @__PURE__ */ React.createElement(Routes, { location: normalizeRouteLocation(displayLocation) }, children, /* @__PURE__ */ React.createElement(Route, { path: "*", element: /* @__PURE__ */ React.createElement(Navigate, { to: "/", replace: true }) }))));
};
const QuickTaskModal = ({ onClose, onAdd, onDelete = null, initialData = null, showToast: showToast2, prefillDate = null, prefillCategory = null, quickTasks: quickTasks2 = [], settingsData: settingsData2 = null }) => {
  var _a;
  const getTomorrow2 = () => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 1);
    return formatDateLocal(d);
  };
  const getNextMonday = () => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7 || 7);
    return formatDateLocal(d);
  };
  const getPrioTarget = () => {
    const prioOffset = Number(settingsData2 == null ? void 0 : settingsData2.prioOffsetMinutes) || 10;
    const todayStr = formatDateLocal(/* @__PURE__ */ new Date());
    const now = /* @__PURE__ */ new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const allToday = (quickTasks2 || []).filter((t) => t && t.dueDate === todayStr && t.dueTime && (!initialData || t.id !== initialData.id));
    const nonPastDue = allToday.filter((t) => {
      const [h, m] = t.dueTime.split(":").map(Number);
      const taskMins = h * 60 + m;
      return taskMins > nowMins;
    });
    const activeNonPastDue = nonPastDue.filter((t) => !t.completed);
    const candidates = activeNonPastDue.length > 0 ? activeNonPastDue : nonPastDue;
    if (candidates.length > 0) {
      const sorted = [...candidates].sort((a, b) => a.dueTime.localeCompare(b.dueTime));
      const earliest = sorted[0].dueTime;
      const [h, m] = earliest.split(":").map(Number);
      let totalMins = Math.round((h * 60 + m - prioOffset) / 10) * 10;
      if (totalMins < 0) totalMins = 0;
      if (totalMins >= 24 * 60) totalMins = 23 * 60 + 50;
      const prioH2 = String(Math.floor(totalMins / 60)).padStart(2, "0");
      const prioM2 = String(totalMins % 60).padStart(2, "0");
      return { date: todayStr, time: `${prioH2}:${prioM2}` };
    }
    if (initialData && initialData.dueTime) {
      const [h, m] = initialData.dueTime.split(":").map(Number);
      let totalMins = Math.max(0, Math.round((h * 60 + m - prioOffset) / 10) * 10);
      if (totalMins >= 24 * 60) totalMins = 23 * 60 + 50;
      const prioH2 = String(Math.floor(totalMins / 60)).padStart(2, "0");
      const prioM2 = String(totalMins % 60).padStart(2, "0");
      return { date: todayStr, time: `${prioH2}:${prioM2}` };
    }
    const nowMinsRounded = Math.round(nowMins / 10) * 10;
    const clamped = Math.min(23 * 60 + 50, Math.max(0, nowMinsRounded));
    const prioH = String(Math.floor(clamped / 60)).padStart(2, "0");
    const prioM = String(clamped % 60).padStart(2, "0");
    return { date: todayStr, time: `${prioH}:${prioM}` };
  };
  const extractDateFromText = (input) => {
    let lower = input.toLowerCase();
    let cleanText = input;
    const now = /* @__PURE__ */ new Date();
    let newDate = null;
    let newTime = null;
    const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]\d|2[0-3]):([0-5]\d)\b/gi;
    let timeMatch;
    if ((timeMatch = timeRegex.exec(lower)) !== null) {
      let h, m = "00";
      if (timeMatch[1]) {
        h = parseInt(timeMatch[1]);
        if (timeMatch[2]) m = timeMatch[2];
        const ampm = timeMatch[3].toLowerCase();
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
      } else {
        h = parseInt(timeMatch[4]);
        m = timeMatch[5];
      }
      newTime = `${h.toString().padStart(2, "0")}:${m}`;
      cleanText = cleanText.replace(timeMatch[0], "");
      lower = cleanText.toLowerCase();
    }
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const fullMonthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const dateRegex = new RegExp(`\\b(${monthNames.join("|")}|${fullMonthNames.join("|")})\\s*(\\d{1,2})\\b`, "i");
    let dateMatch = dateRegex.exec(lower);
    const thisDateRegex = /\bthis\s+(\d{1,2})\b/i;
    let thisDateMatch = thisDateRegex.exec(lower);
    if (dateMatch) {
      const monthText = dateMatch[1].toLowerCase();
      let monthIdx = monthNames.findIndex((m) => monthText.startsWith(m));
      if (monthIdx === -1) monthIdx = fullMonthNames.findIndex((m) => m.startsWith(monthText));
      const day = parseInt(dateMatch[2]);
      const targetDate = new Date(now.getFullYear(), monthIdx, day);
      const matchIdx = dateMatch.index;
      const fullMatch = dateMatch[0];
      const nextChar = lower[matchIdx + fullMatch.length];
      if (day >= 1 && day <= 31) {
        const targetDateStr = formatDateLocal(targetDate);
        const tempCleanText = cleanText.replace(dateMatch[0], "");
        if (nextChar || day > 3) {
          if (targetDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
          newDate = formatDateLocal(targetDate);
          cleanText = tempCleanText;
          lower = cleanText.toLowerCase();
        } else {
          return { date: targetDateStr, time: newTime || "10:00", cleanText: tempCleanText, isPending: true };
        }
      }
    } else if (thisDateMatch) {
      const day = parseInt(thisDateMatch[1]);
      let targetDate = new Date(now.getFullYear(), now.getMonth(), day);
      if (targetDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
      }
      newDate = formatDateLocal(targetDate);
      cleanText = cleanText.replace(thisDateMatch[0], "");
      lower = cleanText.toLowerCase();
    }
    const relativePatterns = [
      { regex: /\b(tomorrow|ugma)\b/i, offset: 1 },
      { regex: /\b(next week|this week)\b/i, offset: 7 },
      { regex: /\b(now|karon|unya)\b/i, offset: 0 },
      // Today
      { regex: /\b(?:next\s+)?(monday|mon|lunes|tuesday|tue|martes|wednesday|wed|merkules|thursday|thu|thur|thurs|huybes|friday|fri|birnes|saturday|sat|sabado|sunday|sun|domingo)\b/i }
    ];
    for (const p of relativePatterns) {
      let match = p.regex.exec(lower);
      if (match) {
        const target = /* @__PURE__ */ new Date();
        if (p.offset !== void 0) {
          target.setDate(now.getDate() + p.offset);
        } else {
          const weekdays = {
            sun: 0,
            domingo: 0,
            mon: 1,
            lunes: 1,
            tue: 2,
            martes: 2,
            wed: 3,
            merkules: 3,
            thu: 4,
            thur: 4,
            thurs: 4,
            huybes: 4,
            fri: 5,
            birnes: 5,
            sat: 6,
            sabado: 6,
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6
          };
          const dayName = match[1].toLowerCase();
          const targetDay = weekdays[dayName];
          let diff = (targetDay + 7 - now.getDay()) % 7;
          if (diff === 0) diff = 7;
          target.setDate(now.getDate() + diff);
        }
        newDate = formatDateLocal(target);
        cleanText = cleanText.replace(match[0], "");
        lower = cleanText.toLowerCase();
        break;
      }
    }
    const relativeTimeRegex = /\b(?:in\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/i;
    let relTimeMatch;
    if ((relTimeMatch = relativeTimeRegex.exec(lower)) !== null) {
      const value = parseInt(relTimeMatch[1]);
      const unit = relTimeMatch[2].toLowerCase();
      const target = new Date(now);
      if (unit.startsWith("m")) {
        target.setMinutes(now.getMinutes() + value);
      } else if (unit.startsWith("h")) {
        target.setHours(now.getHours() + value);
      }
      newDate = formatDateLocal(target);
      newTime = target.getHours().toString().padStart(2, "0") + ":" + target.getMinutes().toString().padStart(2, "0");
      cleanText = cleanText.replace(relTimeMatch[0], "");
      lower = cleanText.toLowerCase();
    }
    if (newDate && !newTime) newTime = "10:00";
    return { date: newDate, time: newTime, cleanText, isPending: false };
  };
  const getLaterTiming = () => {
    const now = /* @__PURE__ */ new Date();
    const todayStr = formatDateLocal(now);
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour >= 22 || hour === 0 && minute > 30 || hour > 0 && hour < 6) {
      return { date: getTomorrow2(), time: "10:00" };
    }
    const isNight1h = hour >= 20 && hour < 22 || hour === 0 && minute <= 30;
    const laterDate = new Date(now.getTime() + (isNight1h ? 1 : 4) * 60 * 60 * 1e3);
    laterDate.setMinutes(Math.round(laterDate.getMinutes() / 10) * 10, 0, 0);
    if (formatDateLocal(laterDate) === todayStr && laterDate.getHours() < 22) {
      const h = String(laterDate.getHours()).padStart(2, "0");
      const m = String(laterDate.getMinutes()).padStart(2, "0");
      return {
        date: todayStr,
        time: `${h}:${m}`
      };
    }
    return {
      date: getTomorrow2(),
      time: "10:00"
    };
  };
  const initialLater = getLaterTiming();
  const [categories, setCategories] = useState(() => {
    if (initialData) {
      if (Array.isArray(initialData.categories) && initialData.categories.length) return initialData.categories;
      if (initialData.category) return [initialData.category];
    }
    if (prefillCategory) return [prefillCategory];
    return [];
  });
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_qt_categories");
      return saved !== null ? JSON.parse(saved) : ["Sample"];
    } catch {
      return ["Sample"];
    }
  });
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatText, setNewCatText] = useState("");
  const availableCategories = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    (customCategories || []).forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    if (initialData) {
      if (Array.isArray(initialData.categories)) initialData.categories.forEach((c) => {
        if (c && c.trim()) set.add(c.trim());
      });
      if (initialData.category && initialData.category.trim()) set.add(initialData.category.trim());
    }
    categories.forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set);
  }, [customCategories, initialData, categories]);
  const isManualCategoryRef = useRef(false);
  const handleToggleCategory = (cat) => {
    isManualCategoryRef.current = true;
    setCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };
  const handleCreateNewCat = () => {
    isManualCategoryRef.current = true;
    const clean = newCatText.trim();
    if (!clean) return;
    if (!availableCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      const updated = [...customCategories, clean];
      setCustomCategories(updated);
      try {
        localStorage.setItem("faiora_qt_categories", JSON.stringify(updated));
      } catch {
      }
    }
    if (!categories.includes(clean)) {
      setCategories((prev) => [...prev, clean]);
    }
    setNewCatText("");
    setIsAddingNewCat(false);
  };
  const categoryKeywordMap = useMemo(() => {
    const source = settingsData2 && settingsData2.categoryKeywords && typeof settingsData2.categoryKeywords === "object" && Object.keys(settingsData2.categoryKeywords).length > 0 ? settingsData2.categoryKeywords : DEFAULT_CATEGORY_KEYWORDS;
    if (Array.isArray(source)) return source;
    return Object.entries(source).map(([name, keys]) => ({
      name,
      keys: Array.isArray(keys) ? keys : typeof keys === "string" ? keys.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : []
    }));
  }, [settingsData2]);
  const autoCategorizeFromText = useCallback((str) => {
    if (isManualCategoryRef.current) return;
    if (!str || !str.trim()) return;
    if ((settingsData2 == null ? void 0 : settingsData2.autoCategorizeEnabled) === false) return;
    const lower = str.toLowerCase();
    const matched = [];
    (availableCategories || []).forEach((cat) => {
      const clean = (cat || "").trim();
      if (!clean) return;
      const catLower = clean.toLowerCase();
      const escaped = catLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-zA-Z0-9_#])#?${escaped}([^a-zA-Z0-9_]|$)`, "i");
      if (regex.test(lower)) {
        matched.push(clean);
      }
    });
    categoryKeywordMap.forEach(({ name, keys }) => {
      const hasKey = (keys || []).some((k) => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-zA-Z0-9_#])#?${escaped}([^a-zA-Z0-9_]|$)`, "i").test(lower);
      });
      if (hasKey) {
        const target = (availableCategories || []).find((c) => c.toLowerCase() === name.toLowerCase()) || name;
        matched.push(target);
      }
    });
    if (matched.length > 0) {
      setCategories((prev) => {
        const next = [];
        matched.forEach((m) => {
          if (!next.some((c) => c.toLowerCase() === m.toLowerCase())) {
            next.push(m);
          }
        });
        return next;
      });
    }
  }, [availableCategories, categoryKeywordMap, settingsData2]);
  const [reminders, setReminders] = useState(() => {
    if (initialData && initialData.reminders) {
      if (Array.isArray(initialData.reminders)) {
        return {
          "24h": initialData.reminders.includes("24h"),
          "1h": initialData.reminders.includes("1h"),
          "due": initialData.reminders.includes("due")
        };
      }
      return {
        "24h": initialData.reminders["24h"] !== false,
        "1h": initialData.reminders["1h"] !== false,
        "due": initialData.reminders["due"] !== false
      };
    }
    return { "24h": false, "1h": true, "due": true };
  });
  const toggleReminder = (stage) => {
    setReminders((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };
  const [showReminders, setShowReminders] = useState(false);
  const [text, setText] = useState(initialData && initialData.text || "");
  const [pinned, setPinned] = useState(() => !!(initialData && initialData.pinned));
  const [dueDate, setDueDate] = useState(initialData && initialData.dueDate !== void 0 ? initialData.dueDate : prefillDate || (pinned ? "" : initialLater.date));
  const [dueTime, setDueTime] = useState(initialData && initialData.dueTime !== void 0 ? initialData.dueTime : prefillDate ? "10:00" : pinned ? "" : initialLater.time);
  const [progress, setProgress] = useState(() => {
    if (initialData) {
      if (initialData.progress !== void 0) return initialData.progress;
      if (initialData.completed) return 100;
    }
    return 0;
  });
  const [progressHistory, setProgressHistory] = useState(() => {
    let history = [];
    if (initialData && Array.isArray(initialData.progressHistory)) {
      history = [...initialData.progressHistory];
    }
    const isCompleted = initialData && (initialData.completed || initialData.progress === 100);
    if (isCompleted && !history.some((h) => Number(h.percentage) === 100)) {
      history.push({
        id: "log_100_" + (initialData.id || Date.now()),
        percentage: 100,
        note: "Completed",
        timestamp: initialData.completedAt || Date.now()
      });
    }
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  });
  const [newLogNote, setNewLogNote] = useState("");
  const handleAddProgressLog = (customNote, customProg) => {
    const rawNote = (customNote !== void 0 ? customNote : newLogNote).trim();
    const noteText = formatTaskText(rawNote);
    if (!noteText) return;
    const targetProg = customProg !== void 0 ? customProg : progress;
    const newEntry = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      percentage: targetProg,
      note: noteText,
      timestamp: Date.now()
    };
    setProgressHistory((prev) => [newEntry, ...prev]);
    setNewLogNote("");
  };
  const handleRemoveProgressLog = (logId) => {
    setProgressHistory((prev) => prev.filter((item) => item.id !== logId));
  };
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCustom, setShowCustom] = useState(!!prefillDate || !!(initialData && (initialData.dueDate || initialData.dueTime)));
  const [selectedPreset, setSelectedPreset] = useState(() => {
    if (showCustom) return "custom";
    if (prefillDate) return "custom";
    return "later";
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState(null);
  const dropdownRef = useRef(null);
  const historyPushedRef = useRef(false);
  useEffect(() => {
    var _a2;
    if (!isClosing) {
      if (((_a2 = window.history.state) == null ? void 0 : _a2.modal) !== "quickTask") {
        window.history.pushState({ modal: "quickTask" }, "");
      }
      historyPushedRef.current = true;
    } else if (historyPushedRef.current) {
      if (window.history.state && window.history.state.modal === "quickTask") {
        window.history.back();
      }
      historyPushedRef.current = false;
    }
  }, [isClosing]);
  const [viewportHeight, setViewportHeight] = useState(() => typeof window !== "undefined" && window.visualViewport ? window.visualViewport.height : typeof window !== "undefined" ? window.innerHeight : 800);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  useEffect(() => {
    const updateViewport = () => {
      var _a2;
      if (typeof window === "undefined") return;
      const curHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setViewportHeight(curHeight);
      const isKb = ((_a2 = window.screen) == null ? void 0 : _a2.height) && window.screen.height - curHeight > 180 || window.innerHeight - curHeight > 140 || curHeight < 560;
      setIsKeyboardOpen(Boolean(isKb));
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewport);
      window.visualViewport.addEventListener("scroll", updateViewport);
    }
    window.addEventListener("resize", updateViewport);
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateViewport);
        window.visualViewport.removeEventListener("scroll", updateViewport);
      }
      window.removeEventListener("resize", updateViewport);
    };
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const extractDebounceRef = React.useRef(null);
  const handleTextChange = (val) => {
    if (error && val.trim()) setError("");
    setText(val);
    autoCategorizeFromText(val);
    if (extractDebounceRef.current) clearTimeout(extractDebounceRef.current);
    extractDebounceRef.current = setTimeout(() => {
      const { date, time, cleanText, isPending } = extractDateFromText(val);
      if (isPending) {
        setPendingExtraction({ date, time, cleanText });
      } else {
        setText(cleanText);
        autoCategorizeFromText(cleanText);
        setPendingExtraction(null);
        if (date) {
          setDueDate(date);
          setShowCustom(true);
          setSelectedPreset("custom");
        }
        if (time) {
          setDueTime(time);
          setShowCustom(true);
          setSelectedPreset("custom");
        }
      }
    }, 800);
  };
  useEffect(() => {
    if (pendingExtraction) {
      const timer = setTimeout(() => {
        const { date, time, cleanText } = pendingExtraction;
        setText(cleanText);
        autoCategorizeFromText(cleanText);
        if (date) {
          setDueDate(date);
          setShowCustom(true);
          setSelectedPreset("custom");
        }
        if (time) {
          setDueTime(time);
          setShowCustom(true);
          setSelectedPreset("custom");
        }
        setPendingExtraction(null);
      }, 2e3);
      return () => clearTimeout(timer);
    }
  }, [pendingExtraction, dueDate, dueTime, autoCategorizeFromText]);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 180);
  };
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speechBaseTextRef = useRef("");
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
        }
      }
      setIsListening(false);
      setIsSpeaking(false);
    }, 3e3);
  };
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
        }
      }
    };
  }, []);
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (showToast2) showToast2("Speech recognition not supported in this browser");
      return;
    }
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
        }
      }
      setIsListening(false);
      setIsSpeaking(false);
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onstart = () => {
        speechBaseTextRef.current = text ? text.trim() : "";
        setIsListening(true);
        setIsSpeaking(false);
        resetSilenceTimer();
        if (showToast2) showToast2("Listening...");
      };
      rec.onspeechstart = () => {
        setIsSpeaking(true);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };
      rec.onspeechend = () => {
        setIsSpeaking(false);
        resetSilenceTimer();
      };
      rec.onresult = (event) => {
        setIsSpeaking(true);
        resetSilenceTimer();
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interimTranscript += res[0].transcript;
          }
        }
        const currentTranscript = finalTranscript || interimTranscript;
        if (currentTranscript) {
          const prefix = speechBaseTextRef.current ? speechBaseTextRef.current + " " : "";
          const assembled = (prefix + currentTranscript.trimStart()).slice(0, 150);
          if (error) setError("");
          setText(assembled);
          if (extractDebounceRef.current) clearTimeout(extractDebounceRef.current);
          extractDebounceRef.current = setTimeout(() => {
            const { date, time, cleanText, isPending } = extractDateFromText(assembled);
            if (!isPending) {
              setText(cleanText);
              autoCategorizeFromText(cleanText);
              if (date) {
                setDueDate(date);
                setShowCustom(true);
                setSelectedPreset("custom");
              }
              if (time) {
                setDueTime(time);
                setShowCustom(true);
                setSelectedPreset("custom");
              }
            }
          }, 1200);
        }
      };
      rec.onerror = (e) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        setIsSpeaking(false);
        if (e.error !== "no-speech" && showToast2) {
          showToast2("Mic error: " + (e.error || "Check permission"));
        }
      };
      rec.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        setIsSpeaking(false);
      };
      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      setIsSpeaking(false);
      if (showToast2) showToast2("Could not start microphone");
    }
  };
  const initialSnapshotRef = useRef(null);
  if (!initialSnapshotRef.current && initialData) {
    const initCats = Array.isArray(initialData.categories) && initialData.categories.length ? [...initialData.categories].sort() : initialData.category ? [initialData.category] : [];
    const initReminders = initialData.reminders ? Array.isArray(initialData.reminders) ? { "24h": initialData.reminders.includes("24h"), "1h": initialData.reminders.includes("1h"), "due": initialData.reminders.includes("due") } : { "24h": initialData.reminders["24h"] !== false, "1h": initialData.reminders["1h"] !== false, "due": initialData.reminders["due"] !== false } : { "24h": false, "1h": true, "due": true };
    initialSnapshotRef.current = {
      text: (initialData.text || "").trim(),
      dueDate: initialData.dueDate || "",
      dueTime: initialData.dueTime || "",
      categories: initCats,
      progress: initialData.progress !== void 0 ? initialData.progress : initialData.completed ? 100 : 0,
      reminders: initReminders,
      historyCount: Array.isArray(initialData.progressHistory) ? initialData.progressHistory.length : 0,
      pinned: initialData.pinned || false
    };
  }
  const checkIfChanged = () => {
    if (!initialData || !initialSnapshotRef.current) return true;
    const snap = initialSnapshotRef.current;
    if (text.trim() !== snap.text) return true;
    if ((dueDate || "") !== snap.dueDate) return true;
    if ((dueTime || "") !== snap.dueTime) return true;
    if (Number(progress) !== Number(snap.progress)) return true;
    if (newLogNote.trim().length > 0) return true;
    if (progressHistory.length !== snap.historyCount) return true;
    if (Boolean(pinned) !== Boolean(snap.pinned)) return true;
    const currentCats = [...categories].sort();
    if (currentCats.length !== snap.categories.length) return true;
    for (let i = 0; i < currentCats.length; i++) {
      if (currentCats[i] !== snap.categories[i]) return true;
    }
    if (reminders["24h"] !== snap.reminders["24h"] || reminders["1h"] !== snap.reminders["1h"] || reminders["due"] !== snap.reminders["due"]) {
      return true;
    }
    return false;
  };
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!text.trim()) {
      setError("Please enter a task name");
      return;
    }
    if (initialData && !checkIfChanged()) {
      handleClose();
      return;
    }
    if (!isSubmitting) {
      setIsSubmitting(true);
      let finalHistory = [...progressHistory];
      if (newLogNote.trim()) {
        finalHistory.unshift({
          id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          percentage: progress,
          note: formatTaskText(newLogNote.trim()),
          timestamp: Date.now()
        });
      }
      if (progress === 100 && !finalHistory.some((h) => Number(h.percentage) === 100)) {
        finalHistory.unshift({
          id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          percentage: 100,
          note: "Completed",
          timestamp: Date.now()
        });
      }
      const taskName = formatTaskText(text.trim());
      onAdd(taskName, dueDate, dueTime, categories, progress, finalHistory, reminders, pinned);
      if (showToast2) {
        showToast2(initialData ? `Task "${taskName}" updated!` : "Quick task added!", null, (initialData == null ? void 0 : initialData.id) ? `task-${initialData.id}` : null);
      }
      setIsClosing(true);
      setTimeout(() => {
        if (typeof onClose === "function") onClose();
      }, 180);
    }
  };
  const handleBackdropClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (initialData) {
      if (checkIfChanged() && !isSubmitting) {
        if (!text.trim() && initialData.text) {
          setText(initialData.text);
        }
        handleSubmit(e);
      } else {
        handleClose();
      }
    } else {
      if (text.trim() && !isSubmitting) {
        handleSubmit(e);
      } else {
        handleClose();
      }
    }
  };
  const getSelectedLabel = () => {
    const todayStr = formatDateLocal();
    const tomorrowStr = getTomorrow2();
    const nextMonStr = getNextMonday();
    const formatD = (d) => {
      if (d === todayStr) return "Today";
      if (d === tomorrowStr) return "Tomorrow";
      const parts = (d || "").split("-");
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : "";
    };
    if (selectedPreset === "later") {
      const currentLater = getLaterTiming();
      const isLaterMatch = dueDate === currentLater.date && dueTime === currentLater.time || dueDate === initialLater.date && dueTime === initialLater.time;
      if (isLaterMatch) {
        return { label: "Later", sub: (dueDate === todayStr ? "Today, " : "Tomorrow, ") + formatTime(dueTime), icon: "wb_twilight" };
      }
    }
    if (selectedPreset === "tomorrow") {
      if (dueDate === tomorrowStr && dueTime === "10:00") {
        return { label: "Tomorrow", sub: "Tomorrow, 10:00 AM", icon: "event" };
      }
    }
    if (selectedPreset === "monday") {
      if (dueDate === nextMonStr && dueTime === "08:00") {
        return { label: "Next Monday", sub: "Monday, 8:00 AM", icon: "calendar_month" };
      }
    }
    if (showCustom || selectedPreset === "custom") {
      return { label: "Custom", sub: `${formatD(dueDate)}, ${formatTime(dueTime)}`, icon: "schedule" };
    }
    if (!dueDate && !dueTime) {
      return { label: "No Deadline", sub: "No due date set", icon: "event_busy" };
    }
    const fallbackLater = getLaterTiming();
    if (dueDate === fallbackLater.date && dueTime === fallbackLater.time || dueDate === initialLater.date && dueTime === initialLater.time) return { label: "Later", sub: (dueDate === todayStr ? "Today, " : "Tomorrow, ") + formatTime(dueTime), icon: "wb_twilight" };
    if (dueDate === tomorrowStr && dueTime === "10:00") return { label: "Tomorrow", sub: "Tomorrow, 10:00 AM", icon: "event" };
    if (dueDate === nextMonStr && dueTime === "08:00") return { label: "Next Monday", sub: "Monday, 8:00 AM", icon: "calendar_month" };
    return { label: "Custom", sub: `${formatD(dueDate)}, ${formatTime(dueTime)}`, icon: "schedule" };
  };
  const selected = getSelectedLabel();
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: handleBackdropClick,
      style: isKeyboardOpen ? { height: `${viewportHeight}px`, top: `${((_a = window.visualViewport) == null ? void 0 : _a.offsetTop) || 0}px` } : void 0,
      className: `fixed inset-0 z-[2000] flex items-center justify-center px-4 py-2 sm:px-6 sm:py-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 sm:pb-4 ${isKeyboardOpen ? "!py-1" : ""}`
    },
    /* @__PURE__ */ React.createElement("style", null, `
                        /* (2026-07-13) Invert picker indicator to white for dark inputs. Prev: black */
                        .quick-task-input:focus {
                            border-color: #f97316 !important;
                            box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2) !important;
                        }
                        .quick-task-input::-webkit-calendar-picker-indicator {
                            filter: invert(1) brightness(1.2) !important;
                            cursor: pointer;
                            opacity: 0.75;
                            transition: opacity 0.2s;
                        }
                        .quick-task-input::-webkit-calendar-picker-indicator:hover {
                            opacity: 1;
                        }
                        .quick-option-btn {
                            width: 100%;
                            padding: 1rem 1.25rem;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            color: #cbd5e1;
                            font-size: 0.9rem;
                            transition: all 0.2s;
                            border-radius: 1rem;
                        }
                        .quick-option-btn:hover {
                            background: rgba(255,255,255,0.05);
                            color: #f97316;
                        }
                        /* (2026-07-13) Custom scrollbar for modal card. Prev: default native */
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 5px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: #0f172a;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(249, 115, 22, 0.4);
                            border-radius: 9999px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(249, 115, 22, 0.7);
                        }
                        .custom-scrollbar {
                            scrollbar-width: thin;
                            scrollbar-color: rgba(249, 115, 22, 0.4) #0f172a;
                        }
                    `),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `fixed inset-0 bg-black/85 backdrop-blur-md ${isClosing ? "qt-modal-backdrop-out" : "qt-modal-backdrop-in"}`,
        onClick: handleBackdropClick
      }
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: (e) => e.stopPropagation(),
        style: isKeyboardOpen ? { maxHeight: `${Math.max(220, viewportHeight - 24)}px` } : void 0,
        className: `bg-[#0f172a] w-full max-w-md max-h-[96vh] sm:max-h-[96vh] overflow-y-auto rounded-3xl p-4 sm:p-6 pb-3.5 sm:pb-4 relative z-10 shadow-2xl border border-white/5 custom-scrollbar ${isClosing ? "qt-modal-card-out" : "qt-modal-card-in"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-lg" }, "edit_note"), /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-cream-light font-montserrat tracking-wide" }, initialData ? "Edit Task" : "New Quick Task")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setPinned((prev) => !prev),
          className: `w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95 ${pinned ? "bg-primary/25 text-primary border border-primary/50" : "text-white/30 hover:text-white/60 hover:bg-white/5"}`,
          title: pinned ? "Pinned as recurring task" : "Pin as recurring task"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[17px]" }, pinned ? "push_pin" : "keep_off")
      ), /* @__PURE__ */ React.createElement("button", { onClick: handleClose, className: "text-white/20 hover:text-primary transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "close")))),
      /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-cream-light/40 uppercase tracking-[0.2em] font-montserrat" }, "Task Name"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, error && /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-bold text-red-400 font-montserrat animate-pulse" }, error), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-montserrat font-bold ${text.length >= 150 ? "text-amber-400" : "text-white/30"}` }, text.length, "/150"))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
        "textarea",
        {
          autoFocus: true,
          value: text,
          onChange: (e) => handleTextChange(e.target.value.slice(0, 150)),
          onKeyDown: (e) => {
            if (initialData && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          },
          maxLength: 150,
          placeholder: initialData ? "Task name" : "What needs to be done? (Each new line creates a new quick task)",
          className: `w-full bg-white/5 border rounded-xl p-2.5 pr-10 text-cream-light placeholder:text-white/10 focus:ring-2 transition-all font-montserrat text-xs quick-task-input ${error ? "border-red-500/60 focus:ring-red-500/20" : "border-white/10 focus:ring-primary/20"}`,
          rows: 2,
          style: { textTransform: "capitalize", resize: "none" },
          disabled: isSubmitting
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: toggleSpeechRecognition,
          title: isListening ? isSpeaking ? "Speaking... listening" : "Listening... Tap to stop" : "Speech to text",
          className: `absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isListening ? isSpeaking ? "bg-red-500 text-white shadow-lg shadow-red-500/60 ring-2 ring-red-400/70 scale-105" : "bg-red-500/90 text-white shadow-md shadow-red-500/40 ring-1 ring-red-400/50 animate-pulse" : "bg-white/5 hover:bg-white/15 text-white/50 hover:text-primary active:scale-95"}`
        },
        isListening ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-0.5 h-4 px-0.5" }, /* @__PURE__ */ React.createElement("span", { className: `w-0.5 rounded-full bg-white transition-all ${isSpeaking ? "h-3.5 mic-wave-bar" : "h-1.5"}` }), /* @__PURE__ */ React.createElement("span", { className: `w-0.5 rounded-full bg-white transition-all ${isSpeaking ? "h-4 mic-wave-bar" : "h-3"}` }), /* @__PURE__ */ React.createElement("span", { className: `w-0.5 rounded-full bg-white transition-all ${isSpeaking ? "h-2.5 mic-wave-bar" : "h-2"}` }), /* @__PURE__ */ React.createElement("span", { className: `w-0.5 rounded-full bg-white transition-all ${isSpeaking ? "h-3.5 mic-wave-bar" : "h-1.5"}` })) : /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[17px]" }, "mic")
      ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-cream-light/40 uppercase tracking-[0.2em] font-montserrat" }, "Schedule"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setShowReminders((prev) => !prev),
          className: `p-0.5 rounded transition-all cursor-pointer ${showReminders ? "text-primary" : "text-white/30 hover:text-white/60"}`,
          title: "Toggle reminder alert settings"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, showReminders ? "notifications_active" : "notifications")
      )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, [
        { id: "prio", label: "Prio", getTarget: getPrioTarget },
        // (2026-07-13) Use dynamic getLaterTiming for Later. Prev: initialLater
        { id: "later", label: "Later", getTarget: getLaterTiming },
        { id: "tomorrow", label: "Tomm", getTarget: () => ({ date: getTomorrow2(), time: "10:00" }) },
        { id: "monday", label: "Mon", getTarget: () => ({ date: getNextMonday(), time: "08:00" }) }
      ].map((preset) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: preset.id,
          type: "button",
          onClick: () => {
            const tgt = preset.getTarget();
            setDueDate(tgt.date);
            setDueTime(tgt.time);
            setSelectedPreset(preset.id);
            if (initialData) {
              let finalHistory = [...progressHistory];
              if (newLogNote.trim()) {
                finalHistory.unshift({
                  id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                  percentage: progress,
                  note: newLogNote.trim(),
                  timestamp: Date.now()
                });
              }
              const taskName = formatTaskText(text.trim()) || initialData.text;
              onAdd(taskName, tgt.date, tgt.time, categories, progress, finalHistory, reminders, pinned);
              if (showToast2) showToast2(`Task "${taskName}" updated!`, null, (initialData == null ? void 0 : initialData.id) ? `task-${initialData.id}` : null);
              setIsClosing(true);
              setTimeout(() => {
                if (typeof onClose === "function") onClose();
              }, 180);
            }
          },
          className: "text-[8.5px] font-bold font-montserrat uppercase px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/10 hover:text-cream-light hover:border-white/20 border border-white/5 text-white/50 transition-all duration-150 active:scale-95 active:bg-primary/20 active:text-primary shadow-sm"
        },
        preset.label
      )), (dueDate || dueTime) && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setDueDate("");
            setDueTime("");
          },
          className: "text-[8.5px] font-bold font-montserrat uppercase px-1.5 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-300 border border-red-500/20 transition-all duration-150 active:scale-95 shadow-sm",
          title: "Clear schedule"
        },
        "Clear"
      ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "date",
          value: dueDate,
          onChange: (e) => setDueDate(e.target.value),
          style: { colorScheme: "dark" },
          className: "w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 text-cream-light placeholder:text-white/10 focus:ring-1 focus:ring-primary/40 transition-all font-montserrat text-xs quick-task-input h-9 [color-scheme:dark]"
        }
      ), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "time",
          value: dueTime,
          onChange: (e) => setDueTime(e.target.value),
          style: { colorScheme: "dark" },
          className: "w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 text-cream-light placeholder:text-white/10 focus:ring-1 focus:ring-primary/40 transition-all font-montserrat text-xs quick-task-input h-9 [color-scheme:dark]"
        }
      ))), showReminders && /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-cream-light/40 uppercase tracking-[0.2em] font-montserrat" }, "Reminders"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setShowReminders(false), className: "text-[8.5px] text-white/30 hover:text-white font-montserrat" }, "Hide")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1.5" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => toggleReminder("24h"),
          className: `h-7 px-1.5 rounded-xl text-[9.5px] font-bold font-montserrat uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95 border ${reminders["24h"] ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/20" : "bg-white/[0.03] text-white/35 hover:text-white/70 border-white/5"}`
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, reminders["24h"] ? "notifications_active" : "notifications_off"),
        /* @__PURE__ */ React.createElement("span", null, "24h Before")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => toggleReminder("1h"),
          className: `h-7 px-1.5 rounded-xl text-[9.5px] font-bold font-montserrat uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95 border ${reminders["1h"] ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/20" : "bg-white/[0.03] text-white/35 hover:text-white/70 border-white/5"}`
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, reminders["1h"] ? "notifications_active" : "notifications_off"),
        /* @__PURE__ */ React.createElement("span", null, "1h Before")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => toggleReminder("due"),
          className: `h-7 px-1.5 rounded-xl text-[9.5px] font-bold font-montserrat uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95 border ${reminders["due"] ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/20" : "bg-white/[0.03] text-white/35 hover:text-white/70 border-white/5"}`
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, reminders["due"] ? "notifications_active" : "notifications_off"),
        /* @__PURE__ */ React.createElement("span", null, "Due Now")
      ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-cream-light/40 uppercase tracking-[0.2em] px-1 font-montserrat" }, "Status"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1.5" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setProgress(0),
          className: `h-7 rounded-xl text-[9.5px] font-bold font-montserrat uppercase tracking-wider transition-all duration-200 flex items-center justify-center ${progress === 0 ? "bg-white/10 text-cream-light border border-white/20 shadow-sm" : "bg-white/[0.03] text-white/40 hover:text-white/70 border border-white/5"}`
        },
        "Not Started"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setProgress((prev) => prev > 0 && prev < 100 ? prev : (initialData == null ? void 0 : initialData.lastProgress) || 50),
          className: `h-7 rounded-xl text-[9.5px] font-bold font-montserrat uppercase tracking-wider transition-all duration-200 flex items-center justify-center ${progress > 0 && progress < 100 ? "bg-[#ea580c]/25 text-[#f97316] border border-[#f97316]/50 shadow-[0_0_10px_rgba(249,115,22,0.3)] font-extrabold" : "bg-white/[0.03] text-white/40 hover:text-white/70 border border-white/5"}`
        },
        "In Progress"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setProgress(100);
            setProgressHistory((prev) => {
              if (prev.some((h) => Number(h.percentage) === 100)) return prev;
              return [{
                id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                percentage: 100,
                note: "Completed",
                timestamp: Date.now()
              }, ...prev];
            });
          },
          className: `h-7 rounded-xl text-[9.5px] font-bold font-montserrat uppercase tracking-wider transition-all duration-200 flex items-center justify-center ${progress === 100 ? "bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "bg-white/[0.03] text-white/40 hover:text-white/70 border border-white/5"}`
        },
        "Completed"
      )), /* @__PURE__ */ React.createElement("div", { className: "bg-white/[0.03] border border-white/5 rounded-xl p-2 space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-[9px] font-bold font-montserrat uppercase tracking-wider" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 text-white/50" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "\u{1F525}"), /* @__PURE__ */ React.createElement("span", null, "Completion Progress")), /* @__PURE__ */ React.createElement("span", { className: "text-primary font-extrabold" }, progress, "%")), /* @__PURE__ */ React.createElement("div", { className: "relative py-1 flex items-center" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-x-0 h-1.5 rounded-full bg-white/[0.08] overflow-hidden pointer-events-none shadow-inner border border-white/5" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full rounded-full transition-all duration-75",
          style: {
            width: `${progress}%`,
            background: "linear-gradient(90deg, #dc2626 0%, #ea580c 35%, #f97316 70%, #facc15 100%)",
            boxShadow: "0 0 10px rgba(249, 115, 22, 0.8), 0 0 16px rgba(234, 88, 12, 0.5)"
          }
        }
      )), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "100",
          step: "5",
          value: progress,
          onChange: (e) => setProgress(parseInt(e.target.value, 10)),
          className: "w-full faiora-range-slider relative z-10",
          style: {
            WebkitAppearance: "none",
            background: "transparent"
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-0.5 text-[8.5px] font-bold font-montserrat text-white/25" }, [0, 25, 50, 75, 100].map((pt) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: pt,
          type: "button",
          onClick: () => setProgress(pt),
          className: `transition-colors hover:text-primary ${progress === pt ? "text-primary font-bold" : ""}`
        },
        pt,
        "%"
      ))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 pt-1 border-t border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs text-primary" }, "history"), /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-cream-light/40 uppercase tracking-[0.2em] font-montserrat" }, "Progress History")), progressHistory.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-[8.5px] font-bold font-montserrat text-primary/90 bg-primary/10 px-1.5 py-0.5 rounded leading-none" }, progressHistory.length, " ", progressHistory.length === 1 ? "log" : "logs")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-lg p-1 focus-within:border-primary/40 transition-colors" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black text-primary px-1.5 font-montserrat shrink-0" }, progress, "%"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: newLogNote,
          onChange: (e) => setNewLogNote(e.target.value.replace(/\b[a-zA-Z]/g, (m) => m.toUpperCase())),
          style: { textTransform: "capitalize" },
          onKeyDown: (e) => {
            if (e.key === "Enter" && newLogNote.trim()) {
              e.preventDefault();
              handleAddProgressLog();
            }
          },
          placeholder: `Add note for ${progress}%...`,
          className: "flex-1 bg-transparent border-none text-[11px] text-cream-light placeholder:text-white/25 focus:outline-none focus:ring-0 py-0.5 font-montserrat"
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => handleAddProgressLog(),
          disabled: !newLogNote.trim(),
          className: "h-6 px-2 bg-primary/15 hover:bg-primary/25 disabled:opacity-25 disabled:pointer-events-none text-primary rounded-md text-[9px] font-bold uppercase tracking-wider font-montserrat transition-all flex items-center gap-0.5 shrink-0"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[13px]" }, "add"),
        "Log"
      )), progressHistory.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "progress-logs-scroll max-h-24 task-progress-timeline space-y-2 pr-1 py-1" }, progressHistory.map((item) => /* @__PURE__ */ React.createElement("div", { key: item.id, className: "relative flex flex-col gap-0.5 group pl-1" }, /* @__PURE__ */ React.createElement("div", { className: "task-progress-dot" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "text-[9px] font-black text-primary bg-primary/15 border border-primary/25 px-1.5 py-0.5 rounded leading-none shrink-0 font-montserrat" }, item.percentage, "%"), /* @__PURE__ */ React.createElement("span", { className: "text-[8.5px] font-medium text-white/40 font-montserrat truncate" }, (() => {
        if (!item.timestamp) return "";
        const d = new Date(item.timestamp);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " \xB7 " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      })())), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => handleRemoveProgressLog(item.id),
          className: "opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 p-0.5 transition-all shrink-0",
          title: "Delete log"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "close")
      )), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-cream-light/85 font-montserrat break-words pl-0.5 leading-snug" }, formatTaskText(item.note)))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-[9px] font-bold text-cream-light/40 uppercase tracking-[0.2em] font-montserrat" }, "Categories"), categories.length > 0 && /* (2026-07-13) Set manual category flag on clear. Prev: setCategories([]) */
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            isManualCategoryRef.current = true;
            setCategories([]);
          },
          className: "text-[9px] text-white/40 hover:text-red-400 font-montserrat font-bold"
        },
        "Clear (",
        categories.length,
        ")"
      )), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 max-h-[88px] overflow-y-auto progress-logs-scroll pr-0.5 pb-1" }, availableCategories.map((cat) => {
        const isSelected = categories.includes(cat);
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: cat,
            type: "button",
            onClick: () => handleToggleCategory(cat),
            className: `h-6 px-2.5 rounded-full text-[9.5px] font-bold font-montserrat uppercase tracking-[0.1em] transition-all duration-200 flex items-center justify-center ${isSelected ? "bg-primary/20 text-primary border border-primary/40" : "bg-white/[0.04] hover:bg-white/[0.08] text-cream-light/60 hover:text-cream-light border border-white/[0.08]"}`
          },
          cat
        );
      }), isAddingNewCat ? /* @__PURE__ */ React.createElement("div", { className: "h-6 px-2 rounded-full bg-white/[0.04] border border-primary/40 flex items-center gap-1 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          autoFocus: true,
          value: newCatText,
          onChange: (e) => setNewCatText(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateNewCat();
            }
            if (e.key === "Escape") setIsAddingNewCat(false);
          },
          placeholder: "Category...",
          className: "bg-transparent border-none text-[9.5px] text-cream-light focus:ring-0 w-16 p-0 font-montserrat placeholder:text-white/30 leading-none outline-none"
        }
      ), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: handleCreateNewCat, className: "text-primary hover:text-primary-light flex items-center justify-center p-0.5", title: "Save" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "check")), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsAddingNewCat(false), className: "text-white/40 hover:text-white flex items-center justify-center p-0.5", title: "Cancel" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs" }, "close"))) : /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setIsAddingNewCat(true),
          className: "h-6 px-2 rounded-full text-[9.5px] font-bold uppercase tracking-[0.1em] font-montserrat text-primary/70 hover:text-primary bg-white/[0.02] hover:bg-primary/15 border border-white/10 hover:border-primary/30 transition-all duration-200 flex items-center gap-0.5"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-xs font-bold" }, "add"),
        "New"
      )), /* @__PURE__ */ React.createElement("div", { className: "pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/80 to-transparent" }))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-2 pb-1" }, initialData && onDelete && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            onDelete(initialData.id);
            if (typeof onClose === "function") onClose();
          },
          className: "h-10 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all flex items-center justify-center flex-shrink-0",
          title: "Delete Task"
        },
        /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-lg" }, "delete")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          className: "flex-1 bg-primary text-white py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        },
        initialData ? "Update Task" : "Add Task"
      )))
    )
  );
};
const SetLockModal = ({ onSet, onClose, showToast: showToast2 }) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState(1);
  const [hint, setHint] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (step === 3) return;
      if (e.key >= "0" && e.key <= "9") {
        const key = parseInt(e.key);
        if (step === 1 && pin.length < 6) {
          const newVal = pin + key;
          setPin(newVal);
          if (newVal.length === 6) {
            setTimeout(() => handleSubmit(null, newVal), 200);
          }
        } else if (step === 2 && confirmPin.length < 6) {
          const newVal = confirmPin + key;
          setConfirmPin(newVal);
          if (newVal.length === 6) {
            setTimeout(() => handleSubmit(null, newVal), 200);
          }
        }
      } else if (e.key === "Backspace") {
        if (step === 1) setPin((prev) => prev.slice(0, -1));
        else setConfirmPin((prev) => prev.slice(0, -1));
      } else if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, confirmPin, step]);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };
  const handleSubmit = async (e, finalPin) => {
    if (e && e.preventDefault) e.preventDefault();
    const currentPin = finalPin || (step === 1 ? pin : confirmPin);
    if (step === 1) {
      if (currentPin.length !== 6) return;
      setStep(2);
    } else if (step === 2) {
      if (pin !== currentPin) {
        showToast2("PINs do not match");
        setConfirmPin("");
        return;
      }
      setStep(3);
    } else {
      const hash = await hashPIN(pin);
      onSet(hash, hint);
      handleClose();
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[2000] flex items-center justify-center p-4 transition-all duration-200 " + (isClosing ? "opacity-0 scale-95" : "animate-in fade-in zoom-in-95 duration-300") }, /* @__PURE__ */ React.createElement("style", null, `
                        @keyframes shake {
                            0%, 100% { transform: translateX(0); }
                            25% { transform: translateX(-10px); }
                            75% { transform: translateX(10px); }
                        }
                    `), /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md", onClick: handleClose }), /* @__PURE__ */ React.createElement("div", { className: "bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-8 relative z-[210] shadow-2xl border border-white/5" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-3xl" }, "lock")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light font-montserrat tracking-tight" }, step === 1 ? "Set Note PIN" : step === 2 ? "Confirm PIN" : "Security Hint"), /* @__PURE__ */ React.createElement("p", { className: "text-slate-400 text-sm mt-2" }, step === 1 ? "Choose a 6-digit PIN for this note." : step === 2 ? "Re-enter your PIN to confirm." : "Add a hint to help you remember.")), step < 3 ? /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-2 mb-8" }, [...Array(6)].map((_, i) => {
    const val = step === 1 ? pin[i] : confirmPin[i];
    return /* @__PURE__ */ React.createElement("div", { key: i, className: `w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${val ? "border-primary bg-primary/10" : "border-white/10 bg-white/5"}` }, val && /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 bg-primary rounded-full" }));
  })) : /* @__PURE__ */ React.createElement("div", { className: "mb-8" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      autoFocus: true,
      type: "text",
      placeholder: "e.g. My birthday, Favorite year...",
      className: "w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-cream-light placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 transition-all font-montserrat text-sm",
      value: hint,
      onChange: (e) => setHint(e.target.value)
    }
  )), step < 3 ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-8" }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "back"].map((key, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      disabled: key === "",
      onClick: () => {
        if (key === "back") {
          if (step === 1) setPin((prev) => prev.slice(0, -1));
          else setConfirmPin((prev) => prev.slice(0, -1));
        } else if (typeof key === "number") {
          if (step === 1 && pin.length < 6) {
            const newVal = pin + key;
            setPin(newVal);
            if (newVal.length === 6) {
              setTimeout(() => handleSubmit(null, newVal), 200);
            }
          } else if (step === 2 && confirmPin.length < 6) {
            const newVal = confirmPin + key;
            setConfirmPin(newVal);
            if (newVal.length === 6) {
              setTimeout(() => handleSubmit(null, newVal), 200);
            }
          }
        }
      },
      className: `h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-montserrat transition-all ${typeof key === "number" ? "bg-white/5 text-cream-light hover:bg-white/10 active:scale-90" : "text-slate-500"}`
    },
    key === "back" ? /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "backspace") : key
  ))) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: handleSubmit, className: "w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary-dark transition-all" }, "Set Lock"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setHint("");
    setStep(3);
    handleSubmit();
  }, className: "w-full bg-white/5 text-slate-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all" }, "Skip Hint"))));
};
const UnlockModal = ({ hint, onUnlock, onClose, showToast: showToast2 }) => {
  const [pin, setPin] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isError, setIsError] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        const key = parseInt(e.key);
        if (pin.length < 6) {
          const newVal = pin + key;
          setPin(newVal);
          if (newVal.length === 6) {
            handlePinSubmit(newVal);
          }
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin]);
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };
  const handlePinSubmit = async (p) => {
    const isValid = await onUnlock(p);
    if (isValid) {
      handleClose();
    } else {
      setIsError(true);
      setPin("");
      showToast2("Incorrect PIN");
      setTimeout(() => setIsError(false), 500);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[2000] flex items-center justify-center p-4 transition-all duration-200 " + (isClosing ? "opacity-0 scale-95" : "animate-in fade-in zoom-in-95 duration-300") }, /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/85 backdrop-blur-md", onClick: handleClose }), /* @__PURE__ */ React.createElement("div", { className: `bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-8 relative z-[210] shadow-2xl border border-white/5 ${isError ? "animate-[shake_0.5s_ease-in-out]" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-3xl" }, "lock_open")), /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-cream-light font-montserrat tracking-tight" }, "Enter PIN"), /* @__PURE__ */ React.createElement("p", { className: "text-slate-400 text-sm mt-2" }, "This note is protected."), hint && /* @__PURE__ */ React.createElement("p", { className: "text-primary/60 text-[10px] font-bold uppercase tracking-widest mt-4" }, "Hint: ", hint)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-2 mb-8" }, [...Array(6)].map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${pin[i] ? "border-primary bg-primary/10" : "border-white/10 bg-white/5"}` }, pin[i] && /* @__PURE__ */ React.createElement("div", { className: "w-2 h-2 bg-primary rounded-full" })))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-3" }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "back"].map((key, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      disabled: key === "",
      onClick: () => {
        if (key === "back") setPin((prev) => prev.slice(0, -1));
        else if (typeof key === "number" && pin.length < 6) {
          const newVal = pin + key;
          setPin(newVal);
          if (newVal.length === 6) {
            handlePinSubmit(newVal);
          }
        }
      },
      className: `h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-montserrat transition-all ${typeof key === "number" ? "bg-white/5 text-cream-light hover:bg-white/10 active:scale-90" : "text-slate-500"}`
    },
    key === "back" ? /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-[24px]" }, "backspace") : key
  )))));
};
const SamsungAlarmOverlay = ({ alarm, onDismiss }) => {
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const threshold = 140;
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches && e.touches[0].clientX;
    const clientY = e.clientY || e.touches && e.touches[0].clientY;
    if (clientX === void 0) return;
    const dx = clientX - window.innerWidth / 2;
    const dy = clientY - window.innerHeight * 0.75;
    setDragPos({ x: dx, y: dy });
  };
  const handlePointerUp = () => {
    const dist2 = Math.sqrt(dragPos.x ** 2 + dragPos.y ** 2);
    if (dist2 > threshold) {
      onDismiss();
    } else {
      setDragPos({ x: 0, y: 0 });
    }
    setIsDragging(false);
  };
  const dist = Math.sqrt(dragPos.x ** 2 + dragPos.y ** 2);
  const isTargetReached = dist > threshold;
  const currentFillScale = Math.min(dist, threshold) / threshold * 3.5;
  return /* @__PURE__ */ React.createElement("div", { id: "faiora_alarm_ringing_overlay", className: "fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-start overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-primary/15 to-transparent blur-[120px] pointer-events-none opacity-50" }), /* @__PURE__ */ React.createElement("div", { className: "relative text-center mt-32 z-10" }, /* @__PURE__ */ React.createElement("p", { id: "alarm_overlay_status", className: "text-primary font-black uppercase tracking-[0.4em] text-[12px] mb-6 animate-pulse" }, "Alarm Ringing"), /* @__PURE__ */ React.createElement("h1", { id: "alarm_overlay_time", className: "text-8xl font-display font-light text-cream-light tracking-tight mb-4 scale-x-105" }, alarm.time || "00:00"), /* @__PURE__ */ React.createElement("h2", { id: "alarm_overlay_label", className: "text-3xl font-display italic text-white/50 tracking-wide" }, alarm.label || "Alarm")), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-24 left-0 right-0 flex flex-col items-center z-20" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex items-center justify-center h-72 w-full" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `absolute rounded-full border-2 transition-all duration-500 ease-out ${isDragging ? "border-primary/50 scale-110" : "border-white/5 scale-100"}`,
      style: { width: threshold * 2.2, height: threshold * 2.2 }
    }
  ), isDragging && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `absolute rounded-full transition-shadow duration-100 ${isTargetReached ? "bg-primary/80 shadow-[0_0_80px_rgba(249,115,22,1)]" : "bg-primary/20"}`,
      style: {
        width: "80px",
        height: "80px",
        transform: `scale(${currentFillScale})`,
        opacity: 0.8
      }
    }
  ), !isDragging && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "alarm-ripple-ring !border-primary/20 !w-24 !h-24", style: { animationDelay: "0s" } }), /* @__PURE__ */ React.createElement("div", { className: "alarm-ripple-ring !border-primary/10 !w-24 !h-24", style: { animationDelay: "0.8s" } })), /* @__PURE__ */ React.createElement(
    "div",
    {
      onPointerDown: () => setIsDragging(true),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      className: `relative h-28 w-28 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-30 ${isTargetReached ? "border-white bg-primary scale-125" : isDragging ? "border-primary bg-primary/20" : "border-white/10 bg-white/5"} backdrop-blur-xl cursor-grab active:cursor-grabbing touch-none`
    },
    /* @__PURE__ */ React.createElement("span", { className: `material-symbols-outlined text-5xl transition-all duration-300 ${isTargetReached ? "text-white" : "text-primary"}` }, isTargetReached ? "check" : "close")
  ), !isDragging && /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-12 flex flex-col items-center gap-2 opacity-30" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-sm animate-bounce" }, "keyboard_double_arrow_up"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-white uppercase tracking-[0.3em]" }, "Swipe to Stop")))));
};
const PermissionModal = ({ onGrant, onSkip }) => /* @__PURE__ */ React.createElement("div", { className: "permission-sheet-overlay" }, /* @__PURE__ */ React.createElement("div", { className: "permission-sheet" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" }), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center text-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20" }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-2xl" }, "notification_important")), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-display font-medium text-cream-light mb-2 italic" }, "Enable Overlay Access"), /* @__PURE__ */ React.createElement("p", { className: "text-[13px] text-white/40 leading-relaxed mb-6 max-w-[280px]" }, 'Faiora needs permission to "Display over other apps" to ensure your alarms ring reliably.')), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, /* @__PURE__ */ React.createElement(
  "button",
  {
    onClick: onGrant,
    className: "w-full py-3.5 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
  },
  "Configure Now"
), /* @__PURE__ */ React.createElement(
  "button",
  {
    onClick: onSkip,
    className: "w-full py-3 text-white/20 font-black uppercase tracking-widest text-[9px] hover:text-white/40 transition-colors"
  },
  "Maybe Later"
))));
const ToastPill = ({ toast, onDismiss }) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isAutoFading, setIsAutoFading] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isExitToast = toast.isExitToast || toast.message && toast.message.toLowerCase().includes("exit");
  const isSyncToast = toast.message && toast.message.toLowerCase() === "synced";
  const duration = toast.duration || (isSyncToast ? 2e3 : isExitToast ? 2e3 : 5e3);
  const remainingMs = Math.max(100, (toast.createdAt || Date.now()) + duration - Date.now());
  useEffect(() => {
    const now = Date.now();
    const elapsed = now - (toast.createdAt || now);
    const currentRemaining = Math.max(100, duration - elapsed);
    const fadeDelay = Math.max(0, currentRemaining - 400);
    const fadeTimer = setTimeout(() => {
      setIsAutoFading(true);
    }, fadeDelay);
    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, currentRemaining);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss, duration]);
  const handleStart = (e) => {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    currentYRef.current = clientY;
    setIsDragging(true);
  };
  const handleMove = (e) => {
    if (!startYRef.current) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };
  const handleEnd = () => {
    const diff = currentYRef.current - startYRef.current;
    if (diff > 40) {
      setIsDragging(false);
      setIsDismissing(true);
      setTimeout(() => {
        setDragY(250);
        setTimeout(() => {
          onDismiss(toast.id);
        }, 400);
      }, 10);
    } else {
      setDragY(0);
      setIsDragging(false);
    }
    startYRef.current = 0;
    currentYRef.current = 0;
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
      onMouseDown: handleStart,
      onMouseMove: (e) => {
        if (isDragging) handleMove(e);
      },
      onMouseUp: handleEnd,
      className: `toast-pill flex items-center justify-between select-none cursor-grab active:cursor-grabbing ${isAutoFading || isDismissing ? "toast-pill-fading" : ""} ${isSyncToast ? "!py-1 !px-3 !max-w-fit !mx-auto !rounded-full !bg-zinc-900/90 !border !border-white/10 !shadow-md !gap-1.5" : isExitToast ? "!py-2 !px-4 !max-w-fit !mx-auto !rounded-full !bg-zinc-900/95 !border !border-white/15 !shadow-xl" : ""}`,
      style: {
        pointerEvents: "auto",
        touchAction: "none",
        transform: dragY > 0 || isDismissing ? `translateY(${dragY}px) scale(${Math.max(0.93, 1 - dragY / 300)})` : isAutoFading ? "translateY(24px) scale(0.94)" : "translateY(0) scale(1)",
        opacity: (() => {
          if (isAutoFading) return 0;
          if (dragY > 0 || isDismissing) {
            return Math.max(0, 1 - dragY / 250);
          }
          return 1;
        })(),
        transition: isDragging ? "none" : isDismissing ? "transform 0.8s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.8s cubic-bezier(0.4, 0, 0.6, 1)" : isAutoFading ? "transform 1s cubic-bezier(0.4, 0, 0.6, 1), opacity 1s cubic-bezier(0.4, 0, 0.6, 1)" : "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0 flex-1 pointer-events-none", style: { overflow: "hidden" } }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined flex-shrink-0", style: { color: isSyncToast ? "#22c55e" : "#f97316", fontSize: isSyncToast ? "14px" : isExitToast ? "16px" : "20px", fontWeight: "400" } }, isSyncToast ? "cloud_done" : isExitToast ? "arrow_back" : toast.message && (toast.message.toLowerCase().includes("trash") || toast.message.toLowerCase().includes("delete")) ? "delete" : "check_circle"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: isSyncToast ? "11px" : isExitToast ? "12px" : "13.5px", fontWeight: isSyncToast ? "600" : "500", color: isSyncToast ? "rgba(255,255,255,0.85)" : "#fff", letterSpacing: isSyncToast ? "0.04em" : "0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", minWidth: 0, textTransform: isSyncToast ? "uppercase" : "none" } }, toast.message)),
    toast.action && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.stopPropagation();
          try {
            toast.action.onClick();
          } catch (err) {
            console.error(err);
          }
          onDismiss(toast.id);
        },
        className: "font-montserrat uppercase tracking-wider flex-shrink-0 pointer-events-auto transition-opacity active:opacity-70",
        style: {
          padding: "0",
          fontSize: "12px",
          fontWeight: "700",
          color: "#f97316",
          background: "transparent",
          border: "none",
          cursor: "pointer"
        }
      },
      toast.action.label || "UNDO"
    ),
    !isExitToast && !isSyncToast && !toast.hideProgress && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: "2.5px", background: "rgba(255,255,255,0.06)", overflow: "hidden" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          height: "100%",
          background: "linear-gradient(90deg, #f97316, #fb923c)",
          boxShadow: "0 0 6px rgba(249,115,22,0.8)",
          animation: `toast-progress ${remainingMs}ms linear forwards`
        }
      }
    ))
  );
};
const TaskSnackbarItem = ({ snack, onDismiss }) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const handleStart = (e) => {
    if (isDismissing) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    currentYRef.current = clientY;
    setIsDragging(true);
  };
  const handleMove = (e) => {
    if (!startYRef.current || isDismissing) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };
  const handleEnd = () => {
    const diff = currentYRef.current - startYRef.current;
    if (diff > 25) {
      setIsDismissing(true);
      setDragY(150);
      setTimeout(() => onDismiss(snack.id), 600);
    } else {
      setDragY(0);
    }
    setIsDragging(false);
    startYRef.current = 0;
    currentYRef.current = 0;
  };
  const truncateMsg = (msg) => {
    if (!msg) return "";
    if (msg.length <= 40) return msg;
    return msg.slice(0, 22) + "..." + msg.slice(-10);
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
      onMouseDown: handleStart,
      onMouseMove: (e) => {
        if (isDragging) handleMove(e);
      },
      onMouseUp: handleEnd,
      className: "task-snackbar group select-none cursor-grab active:cursor-grabbing",
      style: {
        pointerEvents: isDismissing ? "none" : "auto",
        touchAction: "none",
        transform: dragY > 0 ? `translateY(${dragY}px) scale(${Math.max(0.93, 1 - dragY / 500)})` : void 0,
        opacity: isDismissing ? 0 : dragY > 0 ? Math.max(0, 1 - dragY / 150) : void 0,
        transition: isDragging ? "none" : isDismissing ? "transform 0.6s cubic-bezier(0.4,0,1,1), opacity 0.6s cubic-bezier(0.4,0,0.6,1)" : "transform 0.2s ease, opacity 0.2s ease"
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 pointer-events-none flex-1", style: { overflow: "hidden", minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { className: "material-symbols-outlined text-primary text-xl flex-shrink-0" }, snack.message && snack.message.includes("deleted") ? "delete" : "check_circle"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", minWidth: 0 } }, snack.message)),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: (e) => {
          e.stopPropagation();
          if (snack.onUndo) snack.onUndo();
          onDismiss(snack.id);
        },
        className: "text-primary text-xs font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-primary/10 rounded-lg transition-colors active:scale-95 pointer-events-auto flex-shrink-0"
      },
      "Undo"
    )
  );
};
const App = () => {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isTimerDone, setIsTimerDone] = useState(false);
  const [activeCollection2, setActiveCollection] = useState(() => localStorage.getItem("faiora_active_collection") || "tasks");
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" ? !navigator.onLine : false);
  const [isProbing, setIsProbing] = useState(() => typeof navigator !== "undefined" && !navigator.onLine ? false : true);
  const [isFirstSyncDone, setIsFirstSyncDone] = useState(() => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem("faiora_cached_user") || "null");
      const uid = (cachedUser == null ? void 0 : cachedUser.uid) || localStorage.getItem("faiora_last_uid") || "";
      const savedNotes = JSON.parse(localStorage.getItem(uid ? "faiora_notes_" + uid : "faiora_notes") || "[]");
      const savedTasks = JSON.parse(localStorage.getItem(uid ? "faiora_quick_tasks_" + uid : "faiora_quick_tasks") || "[]");
      return savedNotes.length > 0 || savedTasks.length > 0;
    } catch {
      return false;
    }
  });
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(() => typeof navigator !== "undefined" && !navigator.onLine || !!localStorage.getItem("faiora_cached_user"));
  const [cloudFieldsCount, setCloudFieldsCount] = useState(0);
  const [isSyncHealthy2, setIsSyncHealthy] = useState(true);
  const [masterUidOverride, setMasterUidOverride] = useState(() => localStorage.getItem("faiora_uid_override") || "");
  const [lastDeepScan, setLastDeepScan] = useState(0);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("faiora_cached_user");
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [notes2, setNotes] = useState(() => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem("faiora_cached_user") || "null");
      const uid = (cachedUser == null ? void 0 : cachedUser.uid) || localStorage.getItem("faiora_last_uid") || "";
      const saved = localStorage.getItem(uid ? "faiora_notes_" + uid : "faiora_notes");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [trashNotes, setTrashNotes] = useState([]);
  const [trashQuickTasks, setTrashQuickTasks] = useState([]);
  const [noteSections, setNoteSections] = useState(() => {
    try {
      const saved = localStorage.getItem("faiora_sections");
      return saved !== null ? JSON.parse(saved) : ["PERSONAL", "WORK"];
    } catch (e) {
      return ["PERSONAL", "WORK"];
    }
  });
  const [quickTasks2, setQuickTasks] = useState(() => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem("faiora_cached_user") || "null");
      const uid = (cachedUser == null ? void 0 : cachedUser.uid) || localStorage.getItem("faiora_last_uid") || "";
      const saved = localStorage.getItem(uid ? "faiora_quick_tasks_" + uid : "faiora_quick_tasks");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [alarms2, setAlarms] = useState(() => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem("faiora_cached_user") || "null");
      const uid = (cachedUser == null ? void 0 : cachedUser.uid) || localStorage.getItem("faiora_last_uid") || "";
      const saved = localStorage.getItem(uid ? "faiora_alarms_" + uid : "faiora_alarms");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [quickTasksCollection, setQuickTasksCollection] = useState(() => localStorage.getItem("faiora_quick_tasks_collection") || localStorage.getItem("faiora_active_collection") || "tasks");
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  const [editingQuickTask, setEditingQuickTask] = useState(null);
  const [prefillDate, setPrefillDate] = useState(null);
  const [prefillCategory, setPrefillCategory] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [publicNote, setPublicNote] = useState(null);
  const [profileData2, setProfileData] = useState({});
  const [settingsData2, setSettingsData] = useState({});
  const [videoSrc, setVideoSrc] = useState(null);
  useEffect(() => {
    if ((settingsData2 == null ? void 0 : settingsData2.bgVideoEnabled) === false) {
      setVideoSrc(null);
      setIsVideoReady(false);
      return;
    }
    const isMobileDevice = typeof window !== "undefined" && (window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    const targetSrc = isMobileDevice ? "fire_bg_video_hd_mobile.mp4" : "fire_bg_video_hd_desktop_tablet.mp4";
    const timer = setTimeout(() => {
      setVideoSrc(targetSrc);
    }, 5e3);
    return () => clearTimeout(timer);
  }, [settingsData2 == null ? void 0 : settingsData2.bgVideoEnabled]);
  const [gamification, setGamification] = useState({ currentStreak: 0, longestStreak: 0, lastLoginDate: null, rewards: [] });
  const [alarmOverlayPermission, setAlarmOverlayPermission] = useState(() => FaioraNotifications.hasAlarmOverlayPermission ? FaioraNotifications.hasAlarmOverlayPermission() : false);
  const migrationDoneRef = useRef(false);
  const isStreakCheckedRef = useRef(false);
  const alarmTimersRef = useRef(/* @__PURE__ */ new Map());
  const activeCollectionRef = useRef(activeCollection2);
  const trashNotesRef = useRef(trashNotes || []);
  const trashQuickTasksRef = useRef(trashQuickTasks || []);
  const notesRef = useRef(notes2 || []);
  const quickTasksRef = useRef(quickTasks2 || []);
  const alarmsRef = useRef(alarms2 || []);
  const isProbingRef = useRef(isProbing);
  const coldBootNeedsUnifiedHydrationRef = useRef(true);
  const quickTasksCollectionRef = useRef(quickTasksCollection);
  const reminderMarksRef = useRef({});
  useEffect(() => {
    activeCollectionRef.current = activeCollection2;
  }, [activeCollection2]);
  useEffect(() => {
    trashNotesRef.current = trashNotes;
  }, [trashNotes]);
  useEffect(() => {
    trashQuickTasksRef.current = trashQuickTasks;
  }, [trashQuickTasks]);
  useEffect(() => {
    notesRef.current = notes2;
  }, [notes2]);
  useEffect(() => {
    quickTasksRef.current = quickTasks2;
  }, [quickTasks2]);
  useEffect(() => {
    alarmsRef.current = alarms2;
  }, [alarms2]);
  useEffect(() => {
    isProbingRef.current = isProbing;
  }, [isProbing]);
  useEffect(() => {
    quickTasksCollectionRef.current = quickTasksCollection;
  }, [quickTasksCollection]);
  useEffect(() => {
    if (!(user == null ? void 0 : user.uid)) {
      reminderMarksRef.current = {};
      return;
    }
    try {
      reminderMarksRef.current = JSON.parse(localStorage.getItem("faiora_reminder_marks_" + user.uid) || "{}");
    } catch (error) {
      reminderMarksRef.current = {};
    }
  }, [user == null ? void 0 : user.uid]);
  useEffect(() => {
    isStreakCheckedRef.current = false;
  }, [user == null ? void 0 : user.uid]);
  const [toasts, setToasts] = useState([]);
  const [activeAlarmAlert, setActiveAlarmAlert] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  useEffect(() => {
    if (toasts.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => {
        const active = prev.filter((t) => now - (t.createdAt || 0) < (t.duration || 5e3));
        return active.length !== prev.length ? active : prev;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [toasts.length]);
  const showToast2 = useCallback((message, action = null, key = null) => {
    var _a;
    if (!message) return;
    const id = Date.now() + Math.random();
    const createdAt = Date.now();
    const isSync = typeof message === "string" && message.toLowerCase() === "synced";
    const duration = isSync ? 2e3 : 5e3;
    const taskKey = key || (action == null ? void 0 : action.key) || (action == null ? void 0 : action.taskId) || (typeof message === "string" && message.startsWith('Task "') ? ((_a = message.match(/^Task "([^"]+)"/)) == null ? void 0 : _a[1]) || null : null);
    setToasts((prev) => {
      const now = Date.now();
      const active = prev.filter((t) => {
        if (now - (t.createdAt || 0) >= (t.duration || 5e3)) return false;
        if (taskKey && t.taskKey && t.taskKey === taskKey) return false;
        if (t.message === message) return false;
        return true;
      });
      return [...active, { id, message, action, createdAt, duration, hideProgress: isSync, taskKey }];
    });
  }, []);
  const triggerAutoSync = useCallback(async () => {
    var _a;
    const targetUid = ((_a = auth.currentUser) == null ? void 0 : _a.uid) || (user == null ? void 0 : user.uid);
    if (!targetUid) return;
    const taskColl = quickTasksCollectionRef.current || activeCollectionRef.current || "tasks";
    const noteColl = activeCollectionRef.current || "tasks";
    try {
      console.log("\u{1F310} [SYNC] Back online \u2014 fetching server state first...");
      const serverDoc = await db.collection(taskColl).doc(targetUid).get({ source: "server" });
      const serverData = serverDoc.exists ? serverDoc.data() : {};
      const localTasks = JSON.parse(localStorage.getItem("faiora_quick_tasks_" + targetUid) || "[]");
      const localTrash = JSON.parse(localStorage.getItem("faiora_quick_task_trash_" + targetUid) || "[]");
      const lastSyncedTasks = JSON.parse(localStorage.getItem("faiora_last_synced_tasks_" + targetUid) || "[]");
      const serverTasks = Array.isArray(serverData.quickTasks) ? serverData.quickTasks : Object.values(serverData.quickTasks || {});
      const serverTrash = Array.isArray(serverData.quickTaskTrash) ? serverData.quickTaskTrash : Object.values(serverData.quickTaskTrash || {});
      const smartMergeById = (local, server, baseline) => {
        const map = {};
        const conflicts = [];
        const baselineMap = {};
        baseline.forEach((t) => {
          baselineMap[t.id] = t;
        });
        server.forEach((t) => {
          map[t.id] = { ...t, _source: "server" };
        });
        local.forEach((localItem) => {
          var _a2, _b, _c, _d, _e, _f;
          const servItem = map[localItem.id];
          const baseItem = baselineMap[localItem.id];
          if (!servItem && !baseItem) {
            map[localItem.id] = { ...localItem, _source: "local-new" };
            return;
          }
          if (!servItem && baseItem) {
            delete map[localItem.id];
            return;
          }
          const localChanged = !baseItem || JSON.stringify(localItem) !== JSON.stringify(baseItem);
          const serverChanged = !baseItem || JSON.stringify(servItem) !== JSON.stringify(baseItem);
          if (localChanged && !serverChanged) {
            map[localItem.id] = { ...localItem, _source: "local-modified" };
            return;
          }
          if (!localChanged && serverChanged) {
            map[localItem.id] = { ...servItem, _source: "server-modified" };
            return;
          }
          if (localChanged && serverChanged) {
            const merged = { ...servItem };
            const localTS = localItem.updatedAt || localItem.createdAt || 0;
            const serverTS = servItem.updatedAt || servItem.createdAt || 0;
            if (localTS > serverTS && localItem.text !== servItem.text) {
              merged.text = localItem.text;
            }
            if (localItem.completed || servItem.completed) {
              merged.completed = true;
              merged.completedAt = Math.max(localItem.completedAt || 0, servItem.completedAt || 0);
            }
            merged.progress = Math.max(localItem.progress || 0, servItem.progress || 0);
            const localHistory = Array.isArray(localItem.progressHistory) ? localItem.progressHistory : [];
            const serverHistory = Array.isArray(servItem.progressHistory) ? servItem.progressHistory : [];
            const historyMap = {};
            [...serverHistory, ...localHistory].forEach((h) => {
              if (h.timestamp) historyMap[h.timestamp] = h;
            });
            merged.progressHistory = Object.values(historyMap).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const localCats = Array.isArray(localItem.categories) ? localItem.categories : [];
            const serverCats = Array.isArray(servItem.categories) ? servItem.categories : [];
            merged.categories = [.../* @__PURE__ */ new Set([...serverCats, ...localCats])];
            merged.category = merged.categories[0] || "";
            merged.reminders = {
              "24h": ((_a2 = localItem.reminders) == null ? void 0 : _a2["24h"]) || ((_b = servItem.reminders) == null ? void 0 : _b["24h"]) || false,
              "1h": ((_c = localItem.reminders) == null ? void 0 : _c["1h"]) || ((_d = servItem.reminders) == null ? void 0 : _d["1h"]) || false,
              "due": ((_e = localItem.reminders) == null ? void 0 : _e["due"]) || ((_f = servItem.reminders) == null ? void 0 : _f["due"]) || false
            };
            merged.pinned = localItem.pinned || servItem.pinned || false;
            if (localTS > serverTS && (localItem.dueDate !== servItem.dueDate || localItem.dueTime !== servItem.dueTime)) {
              merged.dueDate = localItem.dueDate;
              merged.dueTime = localItem.dueTime;
              merged.dueTimestamp = localItem.dueTimestamp;
            }
            merged.updatedAt = Date.now();
            merged._source = "conflict-merged";
            conflicts.push({
              id: localItem.id,
              text: localItem.text || servItem.text,
              local: localItem,
              server: servItem,
              merged
            });
            map[localItem.id] = merged;
            return;
          }
          map[localItem.id] = { ...servItem, _source: "unchanged" };
        });
        const result = Object.values(map).map((item) => {
          const clean = { ...item };
          delete clean._source;
          return clean;
        });
        return { merged: result, conflicts };
      };
      const taskMergeResult = smartMergeById(localTasks, serverTasks, lastSyncedTasks);
      const trashMergeResult = smartMergeById(localTrash, serverTrash, []);
      const mergedTasks = taskMergeResult.merged;
      const mergedTrash = trashMergeResult.merged;
      const allConflicts = [...taskMergeResult.conflicts, ...trashMergeResult.conflicts];
      const localNotes = JSON.parse(localStorage.getItem("faiora_notes_" + targetUid) || "[]");
      const serverNotesRaw = serverData.notes || {};
      const serverNotes = Object.values(serverNotesRaw);
      const lastSyncedNotes = JSON.parse(localStorage.getItem("faiora_last_synced_notes_" + targetUid) || "[]");
      const noteMergeResult = smartMergeById(localNotes, serverNotes, lastSyncedNotes);
      const mergedNotesArr = noteMergeResult.merged;
      const mergedNotesMap = {};
      mergedNotesArr.forEach((n) => {
        mergedNotesMap[n.id] = n;
      });
      await db.collection(taskColl).doc(targetUid).set({
        quickTasks: JSON.parse(JSON.stringify(mergedTasks)),
        quickTaskTrash: JSON.parse(JSON.stringify(mergedTrash)),
        notes: mergedNotesMap
      }, { merge: true });
      localStorage.setItem("faiora_last_synced_tasks_" + targetUid, JSON.stringify(mergedTasks));
      localStorage.setItem("faiora_last_synced_notes_" + targetUid, JSON.stringify(mergedNotesArr));
      setQuickTasks(mergedTasks);
      localStorage.setItem("faiora_quick_tasks_" + targetUid, JSON.stringify(mergedTasks));
      localStorage.removeItem("faiora_sync_queue");
      if (allConflicts.length > 0) {
        console.log("\u26A0\uFE0F [SYNC] Resolved conflicts:", allConflicts);
        showToast2(`Synced (${allConflicts.length} conflict${allConflicts.length > 1 ? "s" : ""} auto-merged)`);
      } else {
        showToast2("Synced");
      }
      console.log("\u2705 [SYNC] Merge complete. Tasks:", mergedTasks.length, "Conflicts:", allConflicts.length);
    } catch (e) {
      console.warn("\u26A0\uFE0F [SYNC] Auto-sync attempt error:", e.message);
    }
  }, [user == null ? void 0 : user.uid, showToast2]);
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      triggerAutoSync();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setIsProbing(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerAutoSync]);
  const refreshAlarmOverlayPermission = useCallback(() => {
    if (!FaioraNotifications.hasAlarmOverlayPermission) return false;
    const granted = !!FaioraNotifications.hasAlarmOverlayPermission();
    setAlarmOverlayPermission((prev) => prev === granted ? prev : granted);
    return granted;
  }, []);
  const requestAlarmOverlayPermission = useCallback(() => {
    if (!FaioraNotifications.requestAlarmOverlayPermission) return;
    FaioraNotifications.requestAlarmOverlayPermission();
  }, []);
  const clearAlarmTimers = useCallback((alarmId = null) => {
    if (alarmId) {
      const timers = alarmTimersRef.current.get(alarmId) || [];
      timers.forEach((id) => clearTimeout(id));
      alarmTimersRef.current.delete(alarmId);
      FaioraNotifications.cancelAlarmNotification(alarmId);
      return;
    }
    const alarmIds = Array.from(alarmTimersRef.current.keys());
    alarmTimersRef.current.forEach((timers) => timers.forEach((id) => clearTimeout(id)));
    alarmTimersRef.current.clear();
    alarmIds.forEach((id) => FaioraNotifications.cancelAlarmNotification(id));
  }, []);
  const scheduleAlarm = useCallback((alarm) => {
    if (!alarm || !alarm.enabled || !alarm.time) return;
    clearAlarmTimers(alarm.id);
    const [h, m] = String(alarm.time).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const now = /* @__PURE__ */ new Date();
    const target = /* @__PURE__ */ new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    Promise.resolve().then(async () => {
      await FaioraNotifications.cancelAlarmNotification(alarm.id);
      await FaioraNotifications.scheduleAlarmNotification(alarm);
    });
    const delay = target.getTime() - now.getTime();
    const timeoutId = setTimeout(() => {
      const alertPayload = {
        type: "alarm",
        tag: `faiora-alarm-${alarm.id}`,
        alarmId: alarm.id,
        label: alarm.label || "Alarm",
        time: alarm.time,
        title: "Alarm Ringing",
        body: `${alarm.label || "Alarm"} \u2022 ${alarm.time}`
      };
      FaioraNotifications.cancelAlarmNotification(alarm.id);
      FaioraNotifications.emitInAppAlert(alertPayload);
      const updatedAlarm = { ...alarm, lastTriggeredAt: Date.now() };
      const nextAlarms = (alarmsRef.current || []).map((a) => a.id === alarm.id ? updatedAlarm : a);
      setAlarms(nextAlarms);
      if (auth.currentUser) {
        localStorage.setItem("faiora_alarms_" + auth.currentUser.uid, JSON.stringify(nextAlarms));
        if (activeCollection2) {
          db.collection(activeCollection2).doc(auth.currentUser.uid).set({ alarms: nextAlarms }, { merge: true }).catch(() => {
          });
        }
      }
      if (alarm.repeatDaily && alarm.enabled) {
        scheduleAlarm(updatedAlarm);
      } else {
        const disabled = { ...updatedAlarm, enabled: false };
        const disabledList = (alarmsRef.current || []).map((a) => a.id === alarm.id ? disabled : a);
        setAlarms(disabledList);
        if (auth.currentUser) {
          localStorage.setItem("faiora_alarms_" + auth.currentUser.uid, JSON.stringify(disabledList));
          if (activeCollection2) {
            db.collection(activeCollection2).doc(auth.currentUser.uid).set({ alarms: disabledList }, { merge: true }).catch(() => {
            });
          }
        }
      }
    }, delay);
    alarmTimersRef.current.set(alarm.id, [timeoutId]);
  }, [activeCollection2, clearAlarmTimers]);
  const rescheduleAlarms = useCallback((list) => {
    clearAlarmTimers();
    (list || []).forEach((a) => scheduleAlarm(a));
  }, [clearAlarmTimers, scheduleAlarm]);
  const applyNativeAlarmEvents = useCallback((events = []) => {
    if (!Array.isArray(events) || !events.length) return;
    const eventMap = /* @__PURE__ */ new Map();
    events.forEach((event) => {
      if (!(event == null ? void 0 : event.alarmId)) return;
      eventMap.set(String(event.alarmId), event);
    });
    if (!eventMap.size) return;
    const nextAlarms = (alarmsRef.current || []).map((alarm) => {
      const event = eventMap.get(String(alarm.id));
      if (!event) return alarm;
      const updatedAt = event.triggeredAt || Date.now();
      if (event.type === "triggered" && !event.repeatDaily) {
        return { ...alarm, enabled: false, lastTriggeredAt: updatedAt, updatedAt };
      }
      if (event.type === "triggered") {
        return { ...alarm, lastTriggeredAt: updatedAt, updatedAt };
      }
      return alarm;
    });
    if (JSON.stringify(nextAlarms) !== JSON.stringify(alarmsRef.current || [])) {
      setAlarms(nextAlarms);
      alarmsRef.current = nextAlarms;
      const currentUser = auth.currentUser;
      if (currentUser) {
        localStorage.setItem("faiora_alarms_" + currentUser.uid, JSON.stringify(nextAlarms));
        const alarmCollection = quickTasksCollectionRef.current || activeCollectionRef.current;
        if (!isProbingRef.current && alarmCollection) {
          db.collection(alarmCollection).doc(currentUser.uid).set({ alarms: nextAlarms }, { merge: true }).catch(() => {
          });
        }
      }
      rescheduleAlarms(nextAlarms);
    }
  }, [rescheduleAlarms]);
  useEffect(() => {
    return FaioraNotifications.subscribeInApp((alert2) => {
      if (!alert2) return;
      const normalized = {
        id: alert2.id || Date.now() + Math.random(),
        title: alert2.title || "Faiora Alert",
        body: alert2.body || "",
        type: alert2.type || "generic",
        tag: alert2.tag || "",
        taskId: alert2.taskId || "",
        alarmId: alert2.alarmId || "",
        time: alert2.time || "",
        label: alert2.label || ""
      };
      if (normalized.type === "alarm") {
        setActiveAlarmAlert((prev) => prev && prev.alarmId === normalized.alarmId ? prev : normalized);
      }
    });
  }, []);
  const handleSnoozeAlarm = useCallback((alarmId) => {
    const alarm = (alarmsRef.current || []).find((a) => a.id === alarmId);
    if (!alarm) return;
    const snoozeTime = 5;
    const target = new Date(Date.now() + snoozeTime * 6e4);
    const snoozePayload = {
      ...alarm,
      id: alarm.id + "_snooze",
      isSnoozeEntry: true,
      time: target.getHours().toString().padStart(2, "0") + ":" + target.getMinutes().toString().padStart(2, "0")
    };
    const tid = setTimeout(() => {
      FaioraNotifications.emitInAppAlert({
        type: "alarm",
        alarmId: alarm.id,
        isSnoozedCycle: true,
        // Marker for 'Missed' logic on next timeout
        label: alarm.label || "Alarm",
        time: snoozePayload.time,
        title: "Alarm Ringing (Snoozed)",
        body: `Snooze finished: ${alarm.label || "Alarm"}`
      });
    }, snoozeTime * 6e4);
    alarmTimersRef.current.set(alarm.id + "_snooze", [tid]);
    showToast2("Snoozed for 5 minutes");
  }, [showToast2]);
  const handleMissedAlarm = useCallback((alarmId) => {
    const alarm = (alarmsRef.current || []).find((a) => a.id === alarmId);
    const nextAlarms = (alarmsRef.current || []).map(
      (a) => a.id === alarmId ? { ...a, status: "missed", updatedAt: Date.now() } : a
    );
    setAlarms(nextAlarms);
    showToast2(`Missed alarm: ${(alarm == null ? void 0 : alarm.label) || "Alarm"}`);
    if (auth.currentUser) {
      const coll = quickTasksCollectionRef.current || activeCollectionRef.current;
      db.collection(coll).doc(auth.currentUser.uid).set({ alarms: nextAlarms }, { merge: true }).catch(() => {
      });
    }
  }, [showToast2]);
  const dismissAlarmAlert = useCallback((alarmId = "") => {
    setActiveAlarmAlert((current) => {
      if (!current) return null;
      if (alarmId && current.alarmId !== alarmId) return current;
      return null;
    });
    if (FaioraNotifications.stopAlarmSFX) {
      FaioraNotifications.stopAlarmSFX();
    }
    if (navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch (error) {
      }
    }
    FaioraNotifications.removeDeliveredAlarmNotifications(alarmId);
  }, []);
  useEffect(() => {
    var _a, _b, _c, _d;
    if (!activeAlarmAlert) {
      if ((_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.StatusBar) {
        try {
          window.Capacitor.Plugins.StatusBar.show();
        } catch (e) {
        }
      }
      return;
    }
    if ((_d = (_c = window.Capacitor) == null ? void 0 : _c.Plugins) == null ? void 0 : _d.StatusBar) {
      try {
        window.Capacitor.Plugins.StatusBar.hide();
      } catch (e) {
      }
    }
    FaioraNotifications.playAlarmSFX();
    const AUTO_TIMEOUT = 3e4;
    const timeoutTimer = setTimeout(() => {
      const isAlreadySnoozed = activeAlarmAlert.isSnoozedCycle || false;
      if (isAlreadySnoozed) {
        console.log("\u23F0 [ALARM] Auto-timeout reached on snooze cycle. Marking as MISSED.");
        handleMissedAlarm(activeAlarmAlert.alarmId);
      } else {
        console.log("\u23F0 [ALARM] 30s timeout reached. Auto-snoozing...");
        handleSnoozeAlarm(activeAlarmAlert.alarmId);
      }
      dismissAlarmAlert(activeAlarmAlert.alarmId);
    }, AUTO_TIMEOUT);
    if (navigator.vibrate) {
      try {
        navigator.vibrate([500, 180, 500, 180, 800]);
      } catch (error) {
      }
    }
    const vibrateTimer = setInterval(() => {
      if (navigator.vibrate) {
        try {
          navigator.vibrate([500, 180, 500, 180, 800]);
        } catch (error) {
        }
      }
    }, 2200);
    return () => {
      clearTimeout(timeoutTimer);
      clearInterval(vibrateTimer);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(0);
        } catch (error) {
        }
      }
    };
  }, [activeAlarmAlert, dismissAlarmAlert, handleSnoozeAlarm, handleMissedAlarm]);
  const persistReminderMarks = useCallback((nextMarks) => {
    reminderMarksRef.current = nextMarks;
    if (!(user == null ? void 0 : user.uid)) return;
    localStorage.setItem("faiora_reminder_marks_" + user.uid, JSON.stringify(nextMarks));
  }, [user == null ? void 0 : user.uid]);
  const syncDeliveredNativeNotifications = useCallback(async () => {
    if (!FaioraNotifications.hasNativeLocalNotifications()) return;
    const delivered = await FaioraNotifications.getDeliveredNotifications();
    if (!delivered.length) return;
    delivered.forEach((notification) => {
      const payload = (notification == null ? void 0 : notification.data) || (notification == null ? void 0 : notification.extra) || {};
      const normalized = {
        id: (notification == null ? void 0 : notification.id) || Date.now() + Math.random(),
        title: (notification == null ? void 0 : notification.title) || payload.title || "Faiora Alert",
        body: (notification == null ? void 0 : notification.body) || payload.body || "",
        type: payload.type || "generic",
        tag: (notification == null ? void 0 : notification.tag) || payload.tag || "",
        taskId: payload.taskId || "",
        alarmId: payload.alarmId || "",
        time: payload.time || "",
        label: payload.label || ""
      };
      if (normalized.type === "alarm") {
        setActiveAlarmAlert((prev) => prev && prev.alarmId === normalized.alarmId ? prev : normalized);
      }
    });
  }, []);
  useEffect(() => {
    syncDeliveredNativeNotifications();
  }, [syncDeliveredNativeNotifications]);
  useEffect(() => {
    const handleOpenTaskCreator = (e) => {
      var _a, _b;
      setEditingQuickTask(null);
      setPrefillDate(((_a = e == null ? void 0 : e.detail) == null ? void 0 : _a.date) || null);
      setPrefillCategory(((_b = e == null ? void 0 : e.detail) == null ? void 0 : _b.category) || null);
      setIsQuickTaskModalOpen(true);
    };
    window.addEventListener("faiora-open-task-creator", handleOpenTaskCreator);
    const isGranted = refreshAlarmOverlayPermission();
    if (!isGranted && !localStorage.getItem("faiora_overlay_prompt_skipped")) {
      setTimeout(() => setShowPermissionModal(true), 2e3);
    }
    if (FaioraNotifications.consumeNativeAlarmEvents) {
      applyNativeAlarmEvents(FaioraNotifications.consumeNativeAlarmEvents());
    }
    return () => window.removeEventListener("faiora-open-task-creator", handleOpenTaskCreator);
  }, [applyNativeAlarmEvents, refreshAlarmOverlayPermission]);
  useEffect(() => () => clearAlarmTimers(), [clearAlarmTimers]);
  useEffect(() => {
    var _a, _b;
    const appPlugin = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.App;
    if (!(appPlugin == null ? void 0 : appPlugin.addListener)) return;
    let listenerHandle = null;
    const registerStateListener = async () => {
      try {
        listenerHandle = await appPlugin.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) return;
          syncDeliveredNativeNotifications();
          refreshAlarmOverlayPermission();
          if (FaioraNotifications.consumeNativeAlarmEvents) {
            applyNativeAlarmEvents(FaioraNotifications.consumeNativeAlarmEvents());
          }
          FaioraNotifications.rescheduleAll(quickTasksRef.current || []);
          rescheduleAlarms(alarmsRef.current || []);
        });
      } catch (error) {
        console.warn("App state listener failed", error);
      }
    };
    registerStateListener();
    return () => {
      if (listenerHandle == null ? void 0 : listenerHandle.remove) {
        listenerHandle.remove();
      }
    };
  }, [applyNativeAlarmEvents, refreshAlarmOverlayPermission, rescheduleAlarms, syncDeliveredNativeNotifications]);
  useEffect(() => {
    if (!(user == null ? void 0 : user.uid) || !quickTasks2.length) return;
    const evaluateQuickTaskReminderFallbacks = () => {
      const now = Date.now();
      const nextMarks = { ...reminderMarksRef.current || {} };
      let hasChanges = false;
      const activeKeys = /* @__PURE__ */ new Set();
      quickTasks2.forEach((task) => {
        if (!task || !task.dueDate || task.completed) return;
        const dueMs = (/* @__PURE__ */ new Date(`${task.dueDate}T${task.dueTime || "23:59"}`)).getTime();
        if (Number.isNaN(dueMs)) return;
        const taskName = formatTaskText(task.text || task.title || "Task");
        [
          { stage: "24h", offsetMs: 24 * 60 * 60 * 1e3, graceMs: 45 * 60 * 1e3, body: `\u26A1 Due in 24hrs: ${taskName}` },
          { stage: "1h", offsetMs: 60 * 60 * 1e3, graceMs: 20 * 60 * 1e3, body: `\u23F3 Due in 1hr: ${taskName}` },
          { stage: "due", offsetMs: 0, graceMs: 25 * 60 * 1e3, body: `\u{1F4CC} Due Now: ${taskName}` }
        ].forEach((entry) => {
          const reminderKey = `${task.id}:${task.dueDate}:${task.dueTime || "23:59"}:${entry.stage}`;
          activeKeys.add(reminderKey);
          if (nextMarks[reminderKey]) return;
          const triggerAt = dueMs - entry.offsetMs;
          if (now < triggerAt || now > triggerAt + entry.graceMs) return;
          nextMarks[reminderKey] = now;
          hasChanges = true;
          const alertPayload = {
            id: FaioraNotifications.getTaskReminderId ? FaioraNotifications.getTaskReminderId(task.id) : void 0,
            title: "Task Reminder! \u{1F525}",
            body: entry.body,
            type: "quick-task",
            tag: `faiora-task-${task.id}`,
            taskId: task.id
          };
          FaioraNotifications.notifyNow(alertPayload.title, alertPayload.body, alertPayload.tag, {
            type: "quick-task",
            stage: entry.stage,
            taskId: task.id
          }).catch(() => {
          });
        });
      });
      Object.keys(nextMarks).forEach((key) => {
        const stamp = nextMarks[key];
        if (!activeKeys.has(key) || typeof stamp === "number" && now - stamp > 7 * 24 * 60 * 60 * 1e3) {
          delete nextMarks[key];
          hasChanges = true;
        }
      });
      if (hasChanges) {
        persistReminderMarks(nextMarks);
      }
    };
    evaluateQuickTaskReminderFallbacks();
    const interval = setInterval(evaluateQuickTaskReminderFallbacks, 6e4);
    return () => clearInterval(interval);
  }, [persistReminderMarks, quickTasks2, user == null ? void 0 : user.uid]);
  const effectiveUid = useMemo(() => masterUidOverride || (user ? user.uid : null), [user, masterUidOverride]);
  const discoveryCollections = useMemo(() => [
    "tasks",
    "users",
    "userdata",
    "notes",
    "faiora_data",
    "user_metadata",
    "metadata",
    "profiles",
    "faiora",
    "planner",
    "data",
    "my_data",
    "user_notes",
    "planner_data",
    "faiora_v1",
    "cloud_notes"
  ], []);
  const getRichNoteMap = useCallback((data) => (data == null ? void 0 : data.notes) || (data == null ? void 0 : data.allNotes) || (data == null ? void 0 : data.noteList) || (data == null ? void 0 : data.items) || {}, []);
  const getQuickTaskCount = useCallback((data) => {
    if (!data || !data.quickTasks) return 0;
    return Array.isArray(data.quickTasks) ? data.quickTasks.length : Object.keys(data.quickTasks).length;
  }, []);
  const summarizeRemoteDoc = useCallback((data) => {
    const noteCount = Object.keys(getRichNoteMap(data)).length;
    const taskCount = getQuickTaskCount(data);
    return {
      noteCount,
      taskCount,
      score: noteCount * 100 + taskCount
    };
  }, [getQuickTaskCount, getRichNoteMap]);
  const inspectCollectionForUid = useCallback(async (coll, uid) => {
    try {
      let doc;
      try {
        doc = await db.collection(coll).doc(uid).get({ source: "server" });
      } catch (netErr) {
        doc = await db.collection(coll).doc(uid).get();
      }
      if (!doc || !doc.exists) {
        return { coll, exists: false, noteCount: 0, taskCount: 0, score: 0, data: null };
      }
      const data = doc.data() || {};
      return { coll, exists: true, data, ...summarizeRemoteDoc(data) };
    } catch (error) {
      return { coll, exists: false, noteCount: 0, taskCount: 0, score: -1, data: null, error };
    }
  }, [summarizeRemoteDoc]);
  const findRichestCollections = useCallback(async (uid, preferredCollections = []) => {
    const collections = Array.from(/* @__PURE__ */ new Set([...(preferredCollections || []).filter(Boolean), ...discoveryCollections]));
    const results = await Promise.all(collections.map((coll) => inspectCollectionForUid(coll, uid)));
    return results.filter((result) => result.exists && result.score > 0).sort((a, b) => b.score - a.score);
  }, [discoveryCollections, inspectCollectionForUid]);
  const normalizeQuickTasks = useCallback((tasks = []) => {
    const seen = /* @__PURE__ */ new Set();
    return (Array.isArray(tasks) ? tasks : []).map((task, idx) => {
      const baseId = task && task.id ? String(task.id) : `qt_legacy_${Date.now()}_${idx}`;
      let nextId = baseId;
      if (seen.has(nextId)) {
        nextId = `${baseId}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      }
      seen.add(nextId);
      return { ...task, id: nextId };
    });
  }, []);
  const extractQuickTasks = useCallback((data) => {
    if (!data || !data.quickTasks) return [];
    if (Array.isArray(data.quickTasks)) {
      return normalizeQuickTasks(data.quickTasks);
    }
    return normalizeQuickTasks(Object.values(data.quickTasks));
  }, [normalizeQuickTasks]);
  const extractQuickTaskTrash = useCallback((data) => {
    if (!data || !data.quickTaskTrash) return [];
    if (Array.isArray(data.quickTaskTrash)) {
      return normalizeQuickTasks(data.quickTaskTrash);
    }
    return normalizeQuickTasks(Object.values(data.quickTaskTrash));
  }, [normalizeQuickTasks]);
  const toComparableTime = useCallback((value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof (value == null ? void 0 : value.toMillis) === "function") return value.toMillis();
    if (typeof (value == null ? void 0 : value.seconds) === "number") return value.seconds * 1e3;
    return 0;
  }, []);
  const mergeCollectionPayloads = useCallback((summaries = []) => {
    const mergedNotes = {};
    const mergedQuickTasks = {};
    const mergedTrash = {};
    const mergedQuickTaskTrash = {};
    let noteSections2 = [];
    let alarms3 = [];
    let profile = {};
    let settings = {};
    let gamification2 = null;
    (summaries || []).filter(Boolean).forEach((summary) => {
      const data = (summary == null ? void 0 : summary.data) || {};
      Object.entries(getRichNoteMap(data)).forEach(([noteId, note]) => {
        const normalizedNote = { ...note || {}, id: (note == null ? void 0 : note.id) || noteId };
        if (!normalizedNote.id) return;
        const existing = mergedNotes[normalizedNote.id];
        if (!existing || toComparableTime(normalizedNote.updatedAt) >= toComparableTime(existing.updatedAt)) {
          mergedNotes[normalizedNote.id] = normalizedNote;
        }
      });
      extractQuickTasks(data).forEach((task, idx) => {
        const taskId = (task == null ? void 0 : task.id) || `qt_recovered_${summary.coll}_${idx}`;
        const normalizedTask = { ...task || {}, id: taskId };
        const existing = mergedQuickTasks[taskId];
        const incomingStamp = toComparableTime(normalizedTask.updatedAt || normalizedTask.createdAt);
        const existingStamp = toComparableTime((existing == null ? void 0 : existing.updatedAt) || (existing == null ? void 0 : existing.createdAt));
        if (!existing || incomingStamp >= existingStamp) {
          mergedQuickTasks[taskId] = normalizedTask;
        }
      });
      Object.entries(data.trash || {}).forEach(([noteId, note]) => {
        const normalizedNote = { ...note || {}, id: (note == null ? void 0 : note.id) || noteId };
        if (normalizedNote.id) {
          mergedTrash[normalizedNote.id] = normalizedNote;
        }
      });
      extractQuickTaskTrash(data).forEach((task, idx) => {
        const taskId = (task == null ? void 0 : task.id) || `qtt_recovered_${summary.coll}_${idx}`;
        const normalizedTask = { ...task || {}, id: taskId };
        const existing = mergedQuickTaskTrash[taskId];
        const incomingStamp = toComparableTime(normalizedTask.deletedAt || normalizedTask.updatedAt || normalizedTask.createdAt);
        const existingStamp = toComparableTime((existing == null ? void 0 : existing.deletedAt) || (existing == null ? void 0 : existing.updatedAt) || (existing == null ? void 0 : existing.createdAt));
        if (!existing || incomingStamp >= existingStamp) {
          mergedQuickTaskTrash[taskId] = normalizedTask;
        }
      });
      if (!noteSections2.length && Array.isArray(data.noteSections) && data.noteSections.length) {
        noteSections2 = data.noteSections;
      }
      if (!alarms3.length && data.alarms) {
        alarms3 = Array.isArray(data.alarms) ? data.alarms : Object.values(data.alarms);
      }
      if (!Object.keys(profile).length && data.profile && Object.keys(data.profile).length) {
        profile = data.profile;
      }
      if (!Object.keys(settings).length && data.settings && Object.keys(data.settings).length) {
        settings = data.settings;
      }
      if (!gamification2 && data.gamification && Object.keys(data.gamification).length) {
        gamification2 = data.gamification;
      }
    });
    return {
      notes: mergedNotes,
      quickTasks: mergedQuickTasks,
      trash: mergedTrash,
      quickTaskTrash: mergedQuickTaskTrash,
      noteSections: noteSections2,
      alarms: alarms3,
      profile,
      settings,
      gamification: gamification2 || { currentStreak: 0, longestStreak: 0, lastLoginDate: null, rewards: [] }
    };
  }, [extractQuickTaskTrash, extractQuickTasks, getRichNoteMap, toComparableTime]);
  const consolidateCollections = useCallback(async (uid, summaries = [], preferredCollections = []) => {
    const sourceSummaries = (summaries || []).filter((summary) => summary == null ? void 0 : summary.exists);
    if (!uid || !sourceSummaries.length) return null;
    const mergedPayload = mergeCollectionPayloads(sourceSummaries);
    const targetCollections = Array.from(/* @__PURE__ */ new Set([
      ...(preferredCollections || []).filter(Boolean),
      ...sourceSummaries.map((summary) => summary.coll).filter(Boolean),
      ...discoveryCollections
    ]));
    for (const coll of targetCollections) {
      try {
        await db.collection(coll).doc(uid).set({
          ...mergedPayload,
          _lastRecoveryMergeAt: Date.now()
        }, { merge: true });
        return { coll, payload: mergedPayload };
      } catch (error) {
        console.warn(`[SYNC] Consolidation write failed for '${coll}':`, (error == null ? void 0 : error.message) || error);
      }
    }
    return null;
  }, [discoveryCollections, mergeCollectionPayloads]);
  const sortNotesForDisplay = useCallback((list = []) => {
    const nextNotes = Array.isArray(list) ? [...list] : [];
    nextNotes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const sortA = a.sortOrder || 0;
      const sortB = b.sortOrder || 0;
      if (sortA !== sortB) return sortA - sortB;
      return toComparableTime(b.updatedAt) - toComparableTime(a.updatedAt);
    });
    return nextNotes;
  }, [toComparableTime]);
  const scheduleCacheWrite = useCallback((key, value, label = "cache") => {
    const commit = () => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(`[SYNC] ${label} write failed`, error);
      }
    };
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(commit, { timeout: 1200 });
      return;
    }
    setTimeout(commit, 0);
  }, []);
  const buildHydrationPayload = useCallback((noteData = {}, taskData = null) => {
    if (!taskData || taskData === noteData) {
      return noteData || {};
    }
    return {
      ...noteData,
      quickTasks: taskData.quickTasks || {},
      quickTaskTrash: taskData.quickTaskTrash || [],
      alarms: taskData.alarms || [],
      _taskSourceCollection: taskData._sourceCollection || "",
      _noteSourceCollection: noteData._sourceCollection || ""
    };
  }, []);
  const hydrateResolvedPayload = useCallback(({
    uid,
    data,
    sourceCollection = "unknown",
    markReady = true,
    includeNotes = true,
    includeQuickTasks = true
  }) => {
    var _a, _b;
    if (!uid || !data) {
      return { noteCount: 0, taskCount: 0, hasData: false };
    }
    const fetchedNotes = sortNotesForDisplay(
      Object.entries(getRichNoteMap(data)).map(([noteId, note]) => ({ ...note || {}, id: (note == null ? void 0 : note.id) || noteId }))
    );
    const fetchedTrash = Object.entries(data.trash || {}).map(([noteId, note]) => ({ ...note || {}, id: (note == null ? void 0 : note.id) || noteId }));
    const fetchedQuickTaskTrash = extractQuickTaskTrash(data).sort((a, b) => toComparableTime(b.deletedAt || b.updatedAt || b.createdAt) - toComparableTime(a.deletedAt || a.updatedAt || a.createdAt));
    const fetchedQuickTasks = extractQuickTasks(data).sort((a, b) => toComparableTime(b.createdAt || b.updatedAt) - toComparableTime(a.createdAt || a.updatedAt));
    const fetchedAlarms = data.alarms ? Array.isArray(data.alarms) ? data.alarms : Object.values(data.alarms) : [];
    const fetchedSections = Array.isArray(data.noteSections) ? data.noteSections : [];
    const nextGamification = data.gamification || { currentStreak: 0, longestStreak: 0, lastLoginDate: null, rewards: [] };
    if (includeNotes) {
      notesRef.current = fetchedNotes;
      trashNotesRef.current = fetchedTrash;
      setTrashNotes(fetchedTrash);
      setNotes(fetchedNotes);
      setNoteSections(fetchedSections);
      setProfileData(data.profile || {});
      setSettingsData(data.settings || {});
      setCloudFieldsCount(Object.keys(data).length);
      setGamification(nextGamification);
      scheduleCacheWrite("faiora_notes_" + uid, fetchedNotes, "notes cache");
      scheduleCacheWrite("faiora_trash_notes_" + uid, fetchedTrash, "note trash cache");
      try {
        localStorage.setItem("faiora_sections", JSON.stringify(fetchedSections));
      } catch (error) {
        console.warn("[SYNC] section cache fail", error);
      }
    }
    if (includeQuickTasks) {
      quickTasksRef.current = fetchedQuickTasks;
      trashQuickTasksRef.current = fetchedQuickTaskTrash;
      alarmsRef.current = fetchedAlarms;
      setQuickTasks(fetchedQuickTasks);
      setTrashQuickTasks(fetchedQuickTaskTrash);
      FaioraNotifications.rescheduleAll(fetchedQuickTasks);
      setAlarms(fetchedAlarms);
      rescheduleAlarms(fetchedAlarms);
      scheduleCacheWrite("faiora_quick_tasks_" + uid, fetchedQuickTasks, "quick-task cache");
      scheduleCacheWrite("faiora_quick_task_trash_" + uid, fetchedQuickTaskTrash, "quick-task trash cache");
      scheduleCacheWrite("faiora_alarms_" + uid, fetchedAlarms, "alarm cache");
      const cloudCategories = Array.isArray(data.quickTaskCategories) ? data.quickTaskCategories : Array.isArray((_a = data.settings) == null ? void 0 : _a.quickTaskCategories) ? data.settings.quickTaskCategories : null;
      if (cloudCategories && cloudCategories.length > 0) {
        try {
          localStorage.setItem("faiora_qt_categories", JSON.stringify(cloudCategories));
          window.dispatchEvent(new Event("faiora_qt_categories_updated"));
        } catch (e) {
        }
      }
      const cloudVisibleSections = data.quickTaskVisibleSections || ((_b = data.settings) == null ? void 0 : _b.quickTaskVisibleSections);
      if (cloudVisibleSections && typeof cloudVisibleSections === "object") {
        try {
          localStorage.setItem("faiora_qt_visible_sections", JSON.stringify(cloudVisibleSections));
          window.dispatchEvent(new Event("faiora_qt_visible_sections_updated"));
        } catch (e) {
        }
      }
    }
    const hasData = includeNotes && (fetchedNotes.length > 0 || fetchedTrash.length > 0 || fetchedSections.length > 0) || includeQuickTasks && (fetchedQuickTasks.length > 0 || fetchedQuickTaskTrash.length > 0 || fetchedAlarms.length > 0);
    if (markReady && hasData) {
      coldBootNeedsUnifiedHydrationRef.current = false;
      setIsFirstSyncDone(true);
    }
    console.log(`\u2601\uFE0F [SYNC] Hydrated payload from ${sourceCollection}. Tasks: ${includeQuickTasks ? fetchedQuickTasks.length : quickTasksRef.current.length}, Notes: ${includeNotes ? fetchedNotes.length : notesRef.current.length}`);
    return {
      noteCount: fetchedNotes.length,
      taskCount: fetchedQuickTasks.length,
      hasData
    };
  }, [extractQuickTaskTrash, extractQuickTasks, getRichNoteMap, rescheduleAlarms, scheduleCacheWrite, sortNotesForDisplay, toComparableTime]);
  const [lockedNoteId, setLockedNoteId] = useState(null);
  const [unlockCallback, setUnlockCallback] = useState(null);
  const [isSetLockModalOpen, setIsSetLockModalOpen] = useState(false);
  const [noteToLock, setNoteToLock] = useState(null);
  const [unlockingNote, setUnlockingNote] = useState(null);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroSessions, setPomodoroSessions] = useState(0);
  const isQuickTaskEditorOpen = isQuickTaskModalOpen || !!editingQuickTask;
  const isOverlayOpen = isCreatorOpen || isQuickTaskEditorOpen || isSetLockModalOpen || !!unlockingNote || showPermissionModal || !!activeAlarmAlert;
  useEffect(() => {
    document.body.classList.add("faiora-react-ready");
    window.dispatchEvent(new Event("faiora-app-ready"));
  }, []);
  const handleRequestEditNote = useCallback((note) => {
    const freshNote = (notesRef.current || notes2 || []).find((n) => n.id === note.id) || note;
    if (freshNote.isLocked) {
      setUnlockingNote(freshNote);
      window.history.pushState({ modal: "unlock" }, "");
    } else {
      setEditingNote(freshNote);
      setIsCreatorOpen(true);
      window.history.pushState({ modal: "creator" }, "");
    }
  }, [notes2]);
  const handleSetLock = async (hash2, hint) => {
    if (!editingNote || !user) return;
    const updates = { isLocked: true, pinHash: hash2, pinHint: hint };
    handleBulkUpdate(editingNote.id, updates);
    setEditingNote((prev) => ({ ...prev, ...updates }));
    showToast2("Note Locked");
  };
  const handleRemoveLock = async () => {
    if (!editingNote || !user) return;
    const updates = { isLocked: false, pinHash: null, pinHint: null };
    handleBulkUpdate(editingNote.id, updates);
    setEditingNote((prev) => ({ ...prev, ...updates }));
    showToast2("Lock Removed");
  };
  useEffect(() => {
    const savedTime = localStorage.getItem("faiora_pomo_time");
    const savedSessions = localStorage.getItem("faiora_pomo_sessions");
    if (savedTime) setPomodoroTime(parseInt(savedTime));
    if (savedSessions) setPomodoroSessions(parseInt(savedSessions));
  }, []);
  useEffect(() => {
    let interval = null;
    if (isPomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime((prev) => {
          const next = prev - 1;
          localStorage.setItem("faiora_pomo_time", next.toString());
          return next;
        });
      }, 1e3);
    } else if (pomodoroTime === 0 && isPomodoroActive) {
      setIsPomodoroActive(false);
      setPomodoroSessions((s) => {
        const next = s + 1;
        localStorage.setItem("faiora_pomo_sessions", next.toString());
        return next;
      });
      if (FaioraNotifications) {
        FaioraNotifications.show("Pomodoro Finished!", "Great job! Time for a short break.");
        FaioraNotifications.playNotifSFX();
      }
      const defaultTime = 25 * 60;
      setPomodoroTime(defaultTime);
      localStorage.setItem("faiora_pomo_time", defaultTime.toString());
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTime]);
  useEffect(() => {
    const alarmWatchdog = setInterval(() => {
      const now = /* @__PURE__ */ new Date();
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.getDay();
      alarmsRef.current.forEach((alarm) => {
        if (!alarm.enabled || !alarm.time) return;
        if (alarm.time === nowTime) {
          const lastTriggered = alarm.lastTriggeredAt || 0;
          const diffMs = Date.now() - lastTriggered;
          const isScheduledForToday = !alarm.days || alarm.days.length === 0 || alarm.days.includes(today);
          if (isScheduledForToday && diffMs > 12e4) {
            console.log("\u{1F514} [WATCHDOG] Triggering caught missed alarm:", alarm.label);
            scheduleAlarm(alarm);
          }
        }
      });
    }, 15e3);
    return () => clearInterval(alarmWatchdog);
  }, [scheduleAlarm]);
  useEffect(() => {
    const triggerCheck = () => {
      if (FaioraNotifications.isSwReady()) {
        FaioraNotifications.checkMissedNotifications();
      }
    };
    const timer = setTimeout(triggerCheck, 2e3);
    window.addEventListener("online", triggerCheck);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", triggerCheck);
    };
  }, []);
  const videoRef = useRef();
  const prevPopState = useRef(0);
  const lastRoutePathRef = useRef((window.location.hash || "#/").replace(/^#/, "").split("?")[0] || "/");
  const isRedirectingHome = useRef(false);
  const lastHashChangeTime = useRef(0);
  const closingViaCode = useRef(false);
  const appStartTimeRef = useRef(Date.now());
  const prevAuthUidRef = useRef(null);
  const getHashPath = useCallback(() => {
    const rawHash = window.location.hash || "#/";
    const normalizedHash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    const [pathnameOnly] = normalizedHash.split("?");
    return pathnameOnly || "/";
  }, []);
  const scrollHomeToTop = useCallback(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    const main = document.querySelector("main");
    if (main) {
      try {
        main.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch (e) {
        main.scrollTop = 0;
      }
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  const exitApp = useCallback(() => {
    var _a, _b, _c;
    const appPlugin = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.App;
    if (appPlugin && typeof appPlugin.exitApp === "function") {
      try {
        appPlugin.exitApp();
        return;
      } catch (error) {
        console.warn("Capacitor App exit failed:", error);
      }
    }
    if (((_c = window.navigator) == null ? void 0 : _c.app) && typeof window.navigator.app.exitApp === "function") {
      try {
        window.navigator.app.exitApp();
        return;
      } catch (error) {
        console.warn("navigator.app.exitApp failed:", error);
      }
    }
    try {
      window.close();
    } catch (error) {
      console.warn("window.close failed:", error);
    }
  }, []);
  const redirectToHomeFromBack = useCallback((alreadyAtHome = false) => {
    prevPopState.current = 0;
    lastRoutePathRef.current = "/";
    isRedirectingHome.current = true;
    lastHashChangeTime.current = Date.now();
    if (!alreadyAtHome) {
      window.location.hash = "#/";
    }
    const syncToTop = () => scrollHomeToTop();
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(syncToTop);
    } else {
      setTimeout(syncToTop, 0);
    }
    setTimeout(() => {
      isRedirectingHome.current = false;
    }, 500);
  }, [scrollHomeToTop]);
  useEffect(() => {
    const syncRoutePath = () => {
      const path = getHashPath();
      lastRoutePathRef.current = path;
      const state = window.history.state || {};
      if (state.modal || state.popup || state.exitGate || state.stayAlive || state.routeSentinel) {
        return;
      }
      if (path !== "/") {
        window.history.pushState({ routeSentinel: true, path }, "");
      }
    };
    syncRoutePath();
    window.addEventListener("hashchange", syncRoutePath);
    return () => window.removeEventListener("hashchange", syncRoutePath);
  }, [getHashPath]);
  useEffect(() => {
    document.body.classList.toggle("faiora-overlay-open", isOverlayOpen);
    return () => document.body.classList.remove("faiora-overlay-open");
  }, [isOverlayOpen]);
  useEffect(() => {
    const handleBackButton = () => {
      var _a;
      const now = Date.now();
      if (now - lastHashChangeTime.current < 600) {
        return;
      }
      if (window.__faioraLastFabCloseTime && now - window.__faioraLastFabCloseTime < 600) {
        return;
      }
      if (isRedirectingHome.current) {
        return;
      }
      if (closingViaCode.current) {
        closingViaCode.current = false;
        return;
      }
      const state = window.history.state || {};
      window.dispatchEvent(new CustomEvent("faiora-close-popups"));
      if (typeof window.__faioraClearNotesSelection === "function") {
        window.__faioraClearNotesSelection();
        return;
      }
      if (window.__faioraFabMenuOpen) {
        (_a = window.__faioraCloseFabMenu) == null ? void 0 : _a.call(window);
        return;
      }
      if (unlockingNote) {
        setUnlockingNote(null);
        return;
      }
      if (isSetLockModalOpen) {
        setIsSetLockModalOpen(false);
        return;
      }
      if (isCreatorOpen) {
        if (state && state.modal === "creator") {
          return;
        }
        setEditingNote(null);
        setIsCreatorOpen(false);
        return;
      }
      if (isQuickTaskModalOpen || editingQuickTask) {
        if (state && (state.modal === "quickTask" || state.modal === "quicktask")) {
          return;
        }
        setIsQuickTaskModalOpen(false);
        setEditingQuickTask(null);
        setPrefillDate(null);
        return;
      }
      if (state && (state.modal || state.popup)) {
        return;
      }
      const currentHash = window.location.hash || "#/";
      const actualPath = currentHash.startsWith("#") ? currentHash.slice(1).split("?")[0] : "/";
      if (actualPath !== "/" && actualPath !== "") {
        prevPopState.current = 0;
        redirectToHomeFromBack(false);
        return;
      }
      const mainEl = document.getElementById("faiora_main_content_scroll") || document.querySelector("main");
      const scrollY = (mainEl ? mainEl.scrollTop : 0) || window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      if (scrollY > 50) {
        scrollHomeToTop();
        prevPopState.current = 0;
        return;
      }
      if (now - prevPopState.current < 2e3) {
        prevPopState.current = 0;
        exitApp();
      } else {
        showToast2("Press back again to exit");
        prevPopState.current = now;
      }
    };
    window.addEventListener("popstate", handleBackButton);
    return () => window.removeEventListener("popstate", handleBackButton);
  }, [editingQuickTask, exitApp, getHashPath, isCreatorOpen, isQuickTaskModalOpen, isSetLockModalOpen, redirectToHomeFromBack, scrollHomeToTop, showToast2, unlockingNote]);
  useEffect(() => {
    var _a, _b;
    const appPlugin = (_b = (_a = window.Capacitor) == null ? void 0 : _a.Plugins) == null ? void 0 : _b.App;
    if (!appPlugin || typeof appPlugin.addListener !== "function") return;
    let listenerHandle = null;
    let isMounted = true;
    const registerBackListener = async () => {
      try {
        const handle = await appPlugin.addListener("backButton", () => {
          var _a2;
          const currentState = window.history.state;
          if (typeof window.__faioraClearNotesSelection === "function") {
            window.__faioraClearNotesSelection();
            return;
          }
          if (window.__faioraFabMenuOpen) {
            (_a2 = window.__faioraCloseFabMenu) == null ? void 0 : _a2.call(window);
            return;
          }
          if (unlockingNote) {
            setUnlockingNote(null);
            return;
          }
          if (isSetLockModalOpen) {
            setIsSetLockModalOpen(false);
            return;
          }
          if (isCreatorOpen || editingNote) {
            setIsCreatorOpen(false);
            setEditingNote(null);
            return;
          }
          if (isQuickTaskModalOpen || editingQuickTask) {
            setIsQuickTaskModalOpen(false);
            setEditingQuickTask(null);
            setPrefillDate(null);
            return;
          }
          if ((currentState == null ? void 0 : currentState.popup) || (currentState == null ? void 0 : currentState.modal)) {
            window.history.back();
            return;
          }
          if (document.querySelector(".qt-modal-backdrop-in, .animate-in.fade-in")) {
            window.dispatchEvent(new CustomEvent("faiora-close-popups"));
            return;
          }
          const currentHash = window.location.hash || "#/";
          const actualPath = currentHash.startsWith("#") ? currentHash.slice(1).split("?")[0] : "/";
          if (isRedirectingHome.current) {
            return;
          }
          if (actualPath !== "/" && actualPath !== "") {
            prevPopState.current = 0;
            redirectToHomeFromBack(false);
            return;
          }
          const mainEl = document.getElementById("faiora_main_content_scroll") || document.querySelector("main");
          const scrollY = (mainEl ? mainEl.scrollTop : 0) || window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
          if (scrollY > 50) {
            scrollHomeToTop();
            prevPopState.current = 0;
            return;
          }
          const now = Date.now();
          if (now - prevPopState.current < 2e3) {
            prevPopState.current = 0;
            exitApp();
            return;
          }
          showToast2("Press back again to exit");
          prevPopState.current = now;
        });
        if (isMounted) {
          listenerHandle = handle;
        } else if (handle && typeof handle.remove === "function") {
          handle.remove();
        }
      } catch (error) {
        console.warn("Failed to register Android back handler:", error);
      }
    };
    registerBackListener();
    return () => {
      isMounted = false;
      if (listenerHandle && typeof listenerHandle.remove === "function") {
        listenerHandle.remove();
      }
    };
  }, [editingQuickTask, exitApp, getHashPath, isCreatorOpen, isQuickTaskModalOpen, isSetLockModalOpen, redirectToHomeFromBack, showToast2, unlockingNote]);
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const alarmCollection = quickTasksCollection || activeCollection2;
      if (auth.currentUser && alarmCollection) {
        db.collection(alarmCollection).doc(auth.currentUser.uid).set({ alarms: alarmsRef.current }, { merge: true }).catch(() => {
        });
      }
      rescheduleAlarms(alarmsRef.current);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast2, activeCollection2, quickTasksCollection, rescheduleAlarms]);
  useEffect(() => {
    const uid = effectiveUid;
    if (!uid || !activeCollection2) return;
    const hasWarmBootState = notesRef.current.length > 0 || quickTasksRef.current.length > 0 || trashNotesRef.current.length > 0 || trashQuickTasksRef.current.length > 0;
    if (!hasWarmBootState) {
      setIsFirstSyncDone(false);
    }
    const lsKey = "faiora_notes_" + uid;
    const noteTrashKey = "faiora_trash_notes_" + uid;
    const qtKey = "faiora_quick_tasks_" + uid;
    const qtTrashKey = "faiora_quick_task_trash_" + uid;
    const alarmKey = "faiora_alarms_" + uid;
    try {
      const localData = JSON.parse(localStorage.getItem(lsKey) || "[]");
      setNotes(localData);
      notesRef.current = localData;
      const localNoteTrash = JSON.parse(localStorage.getItem(noteTrashKey) || "[]");
      setTrashNotes(localNoteTrash);
      trashNotesRef.current = localNoteTrash;
      const localQT = normalizeQuickTasks(JSON.parse(localStorage.getItem(qtKey) || "[]"));
      setQuickTasks(localQT);
      quickTasksRef.current = localQT;
      localStorage.setItem(qtKey, JSON.stringify(localQT));
      const localQuickTaskTrash = normalizeQuickTasks(JSON.parse(localStorage.getItem(qtTrashKey) || "[]"));
      setTrashQuickTasks(localQuickTaskTrash);
      trashQuickTasksRef.current = localQuickTaskTrash;
      FaioraNotifications.rescheduleAll(localQT);
      const localAlarms = JSON.parse(localStorage.getItem(alarmKey) || "[]");
      setAlarms(localAlarms);
      alarmsRef.current = localAlarms;
      rescheduleAlarms(localAlarms);
      coldBootNeedsUnifiedHydrationRef.current = !(localData.length > 0 || localQT.length > 0 || localNoteTrash.length > 0 || localQuickTaskTrash.length > 0);
      if (localData.length > 0 || localQT.length > 0 || localNoteTrash.length > 0 || localQuickTaskTrash.length > 0) {
        console.log("\u{1F680} [SYNC] Optimistic load success. UID: " + uid);
        setIsFirstSyncDone(true);
      }
    } catch (e) {
      console.warn("LocalStorage load fail", e);
    }
    let watchdogTriggered = false;
    const watchdogTimer = setTimeout(() => {
      if (!isFirstSyncDone && uid && activeCollection2 && !watchdogTriggered) {
        watchdogTriggered = true;
        const fetchDoc = async () => {
          try {
            return await db.collection(activeCollection2).doc(uid).get({ source: "server" });
          } catch (err) {
            return await db.collection(activeCollection2).doc(uid).get();
          }
        };
        fetchDoc().then((snap) => {
          if (snap && snap.exists) {
            console.log("\u2728 [SYNC] Watchdog Force Fetch: Success.");
            setIsSyncHealthy(true);
          } else {
            console.warn("\u{1F4A8} [SYNC] Watchdog Force Fetch: No data found.");
            setIsSyncHealthy(false);
          }
        }).catch((e) => {
          console.error("\u274C [SYNC] Watchdog Force Fetch: Failed.", e.message);
          setIsSyncHealthy(false);
        });
      }
    }, 2500);
    const unsubscribe = db.collection(activeCollection2).doc(uid).onSnapshot((doc) => {
      clearTimeout(watchdogTimer);
      setIsSyncHealthy(true);
      if (doc.exists) {
        const data = doc.data();
        const roughNoteCount = Object.keys(getRichNoteMap(data)).length;
        const roughTaskCount = extractQuickTasks(data).length;
        const roughTrashCount = Object.keys(data.trash || {}).length;
        const roughSectionCount = Array.isArray(data.noteSections) ? data.noteSections.length : 0;
        const hasAnyRemoteContent = roughNoteCount > 0 || roughTaskCount > 0 || roughTrashCount > 0 || roughSectionCount > 0;
        const shouldDeferBlankColdBoot = coldBootNeedsUnifiedHydrationRef.current && isProbingRef.current && !hasAnyRemoteContent;
        const shouldDeferPartialBootSnapshot = coldBootNeedsUnifiedHydrationRef.current && isProbingRef.current && roughTaskCount > 0 && roughNoteCount === 0;
        if (shouldDeferPartialBootSnapshot || shouldDeferBlankColdBoot) {
          console.log(`\u23F8\uFE0F [SYNC] Deferring cold-boot snapshot from ${activeCollection2} until discovery resolves real data sources.`);
          return;
        }
        hydrateResolvedPayload({
          uid,
          data,
          sourceCollection: activeCollection2,
          markReady: true,
          includeQuickTasks: !quickTasksCollection || quickTasksCollection === activeCollection2
        });
        const cloudGamification = data.gamification || { currentStreak: 0, longestStreak: 0, lastLoginDate: null, rewards: [] };
        if (!isStreakCheckedRef.current) {
          isStreakCheckedRef.current = true;
          const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
          const yesterdayDate = /* @__PURE__ */ new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = yesterdayDate.toLocaleDateString("en-CA");
          if (cloudGamification.lastLoginDate !== today) {
            const nextStreak = cloudGamification.lastLoginDate === yesterday ? (cloudGamification.currentStreak || 0) + 1 : 1;
            const nextRewards = Array.isArray(cloudGamification.rewards) ? [...cloudGamification.rewards] : [];
            const milestones = {
              3: "3-Day Spark",
              7: "7-Day Flame",
              14: "14-Day Blaze",
              30: "30-Day Inferno",
              60: "60-Day Supernova",
              100: "100-Day Solar Flare",
              365: "365-Day Eternal Flame"
            };
            if (milestones[nextStreak] && !nextRewards.includes(milestones[nextStreak])) {
              nextRewards.push(milestones[nextStreak]);
              showToast2(`\u{1F3C6} Milestone Unlocked: ${milestones[nextStreak]}!`);
            }
            const updated = {
              currentStreak: nextStreak,
              longestStreak: Math.max(cloudGamification.longestStreak || 0, nextStreak),
              lastLoginDate: today,
              rewards: nextRewards
            };
            console.log("\u{1F525} [GAMIFICATION] Streak calculated:", updated);
            setGamification(updated);
            db.collection(activeCollection2).doc(uid).set({ gamification: updated }, { merge: true }).catch(() => {
            });
            if (nextStreak > (cloudGamification.currentStreak || 0)) {
              setTimeout(() => showToast2(`\u{1F525} Streak Extended! ${nextStreak} Days`), 2e3);
            }
          }
        }
      } else {
        console.warn(`\u26A0\uFE0F [SYNC] Document does not exist in '${activeCollection2}' for UID: ${uid}`);
        if (coldBootNeedsUnifiedHydrationRef.current && isProbingRef.current) {
          console.log(`[SYNC] Holding skeleton because '${activeCollection2}' has no document yet during source discovery.`);
          return;
        }
      }
      if (!coldBootNeedsUnifiedHydrationRef.current || !isProbingRef.current || notesRef.current.length > 0 || quickTasksRef.current.length > 0) {
        setIsFirstSyncDone(true);
      }
    }, (err) => {
      if (err.code === "permission-denied") {
        showToast2("Sync: Permission Denied for UID " + uid);
      } else {
        if (showToast2) showToast2(`Sync Error: ${err.message}`);
      }
      if (!coldBootNeedsUnifiedHydrationRef.current || !isProbingRef.current || notesRef.current.length > 0 || quickTasksRef.current.length > 0) {
        setIsFirstSyncDone(true);
      }
    });
    return () => unsubscribe();
  }, [activeCollection2, effectiveUid, extractQuickTasks, getRichNoteMap, hydrateResolvedPayload, normalizeQuickTasks, quickTasksCollection, rescheduleAlarms]);
  useEffect(() => {
    const uid = effectiveUid;
    if (!uid || !quickTasksCollection || quickTasksCollection === activeCollection2) return;
    const unsubscribe = db.collection(quickTasksCollection).doc(uid).onSnapshot((doc) => {
      if (!doc.exists) return;
      hydrateResolvedPayload({
        uid,
        data: doc.data(),
        sourceCollection: `${quickTasksCollection} (tasks)`,
        markReady: true,
        includeNotes: false,
        includeQuickTasks: true
      });
    }, (err) => {
      console.warn(`Quick-task sync error from ${quickTasksCollection}:`, (err == null ? void 0 : err.message) || err);
    });
    return () => unsubscribe();
  }, [activeCollection2, effectiveUid, hydrateResolvedPayload, quickTasksCollection]);
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const email = user.email ? user.email.toLowerCase() : "";
    if (!email) return;
    const unsubscribe = db.collection("shared_access").where("sharedWith", "==", email).onSnapshot((snapshot) => {
      const sharedDocs = [];
      snapshot.forEach((doc) => {
        sharedDocs.push({ id: doc.id, ...doc.data() });
      });
      setSharedNotes(sharedDocs);
    });
    return () => unsubscribe();
  }, [user]);
  useEffect(() => {
    const handleRoute = async () => {
      const hash2 = window.location.hash;
      setPublicNote(null);
    };
    window.addEventListener("hashchange", handleRoute);
    handleRoute();
    return () => window.removeEventListener("hashchange", handleRoute);
  }, []);
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsubscribe = db.collection("public_shares").where("ownerId", "==", user.uid).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const guestData = change.doc.data();
          const noteId = guestData.id;
          const coll = guestData.ownerCollection || activeCollection2 || "tasks";
          setNotes((currentNotes) => {
            const localNote = currentNotes.find((n) => n.id === noteId);
            if (localNote) {
              const fieldsToCompare = ["title", "content", "progress", "isPinned", "noteTheme", "noteIcon", "labels", "reminderDate"];
              const isDifferent = fieldsToCompare.some((f) => {
                if (f === "labels") return JSON.stringify(localNote[f] || []) !== JSON.stringify(guestData[f] || []);
                return localNote[f] !== guestData[f];
              });
              if (isDifferent) {
                db.collection(coll).doc(user.uid).update({
                  [`notes.${noteId}`]: {
                    ...localNote,
                    ...guestData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                  }
                }).catch((err) => {
                  if (err.code !== "not-found") console.warn("Relay sync failed", err.message);
                });
              }
            }
            return currentNotes;
          });
        }
      });
    }, (err) => {
    });
    return () => unsubscribe();
  }, [user, activeCollection2]);
  const handleUpdateNoteLocal = useCallback((updatedNote) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === updatedNote.id);
      const newNotes = [...prev];
      if (idx > -1) newNotes[idx] = updatedNote;
      else newNotes.push(updatedNote);
      newNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const sortA = a.sortOrder || 0;
        const sortB = b.sortOrder || 0;
        if (sortA !== sortB) return sortA - sortB;
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return timeB - timeA;
      });
      notesRef.current = newNotes;
      if (user) {
        localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      }
      return newNotes;
    });
  }, [user]);
  const handleDeleteNoteLocal = useCallback((noteId) => {
    setNotes((prev) => {
      const newNotes = prev.filter((n) => n.id !== noteId);
      if (user) {
        localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      }
      return newNotes;
    });
  }, [user]);
  useEffect(() => {
    const cleanup = async () => {
      if (!user || !activeCollection2 || trashNotes.length === 0) return;
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1e3;
      const itemsToPurge = trashNotes.filter((n) => {
        const deletedAt = n.deletedAt ? new Date(n.deletedAt).getTime() : 0;
        return now - deletedAt > thirtyDaysInMs;
      });
      if (itemsToPurge.length > 0) {
        console.log(`\u{1F9F9} [TRASH] Purging ${itemsToPurge.length} expired items from Trash...`);
        const updates = {};
        itemsToPurge.forEach((n) => {
          updates[`trash.${n.id}`] = firebase.firestore.FieldValue.delete();
        });
        try {
          await db.collection(activeCollection2).doc(user.uid).update(updates);
        } catch (e) {
          console.warn("Auto-purge sync failed", e.message);
        }
      }
    };
    cleanup();
  }, [user, activeCollection2, trashNotes]);
  useEffect(() => {
    const cleanupQuickTaskTrash = async () => {
      if (!user || trashQuickTasks.length === 0) return;
      const taskCollection = quickTasksCollection || activeCollection2;
      if (!taskCollection) return;
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1e3;
      const expiredQuickTasks = trashQuickTasks.filter((task) => {
        const deletedAt = task.deletedAt ? new Date(task.deletedAt).getTime() : 0;
        return now - deletedAt > thirtyDaysInMs;
      });
      if (expiredQuickTasks.length > 0) {
        const nextTrashTasks = trashQuickTasksRef.current.filter((task) => !expiredQuickTasks.some((expired) => expired.id === task.id));
        setTrashQuickTasks(nextTrashTasks);
        trashQuickTasksRef.current = nextTrashTasks;
        localStorage.setItem("faiora_quick_task_trash_" + user.uid, JSON.stringify(nextTrashTasks));
        try {
          await db.collection(taskCollection).doc(user.uid).set({ quickTaskTrash: nextTrashTasks }, { merge: true });
        } catch (e) {
          console.warn("Quick-task auto-purge sync failed", e.message);
        }
      }
    };
    cleanupQuickTaskTrash();
  }, [user, activeCollection2, quickTasksCollection, trashQuickTasks]);
  const handleBulkUpdate = useCallback((noteId, updates, isNew = false) => {
    setNotes((prev) => {
      let newNotes;
      if (isNew) {
        newNotes = [...prev, { ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }];
      } else {
        newNotes = prev.map((n) => n.id === noteId ? { ...n, ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } : n);
      }
      if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      return newNotes;
    });
    if (!navigator.onLine || isProbing) return;
    if (user && activeCollection2) {
      if (isNew) {
        db.collection(activeCollection2).doc(user.uid).update({
          [`notes.${noteId}`]: { ...updates, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }
        }).catch((e) => console.warn("Bulk create sync fail", e));
      } else {
        const fsUpdates = {};
        Object.keys(updates).forEach((key) => {
          fsUpdates[`notes.${noteId}.${key}`] = updates[key];
        });
        fsUpdates[`notes.${noteId}.updatedAt`] = firebase.firestore.FieldValue.serverTimestamp();
        db.collection(activeCollection2).doc(user.uid).update(fsUpdates).catch((e) => console.warn("Bulk update sync fail", e));
      }
    }
  }, [user, activeCollection2, isProbing]);
  const handleBulkDelete = useCallback((noteId) => {
    const noteToTrash = notes2.find((n) => n.id === noteId);
    handleDeleteNoteLocal(noteId);
    if (noteToTrash && user) {
      const nextTrashNotes = [{ ...noteToTrash, deletedAt: (/* @__PURE__ */ new Date()).toISOString() }, ...trashNotesRef.current.filter((note) => note.id !== noteId)];
      setTrashNotes(nextTrashNotes);
      trashNotesRef.current = nextTrashNotes;
      localStorage.setItem("faiora_trash_notes_" + user.uid, JSON.stringify(nextTrashNotes));
    }
    showToast2("Note moved to Trash");
    if (!navigator.onLine || isProbing) return;
    if (user && activeCollection2) {
      const deletePayload = {
        [`notes.${noteId}`]: firebase.firestore.FieldValue.delete()
      };
      if (noteToTrash) {
        deletePayload[`trash.${noteId}`] = {
          ...noteToTrash,
          deletedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
      }
      db.collection(activeCollection2).doc(user.uid).update(deletePayload).catch((e) => console.warn("Soft-delete sync fail", e));
    }
  }, [user, activeCollection2, handleDeleteNoteLocal, isProbing, notes2, showToast2]);
  const handleRestoreNote = useCallback((noteId) => {
    const noteToRestore = trashNotes.find((n) => n.id === noteId);
    if (!noteToRestore || !user || !activeCollection2) return;
    const { deletedAt, ...restored } = noteToRestore;
    const nextTrashNotes = trashNotesRef.current.filter((note) => note.id !== noteId);
    setTrashNotes(nextTrashNotes);
    trashNotesRef.current = nextTrashNotes;
    localStorage.setItem("faiora_trash_notes_" + user.uid, JSON.stringify(nextTrashNotes));
    db.collection(activeCollection2).doc(user.uid).update({
      [`trash.${noteId}`]: firebase.firestore.FieldValue.delete(),
      [`notes.${noteId}`]: { ...restored, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }
    }).catch((e) => console.warn("Restore sync fail", e));
    showToast2("Note restored");
  }, [user, activeCollection2, trashNotes, showToast2]);
  const handlePermanentDelete = useCallback((noteId) => {
    if (!user || !activeCollection2) return;
    const nextTrashNotes = trashNotesRef.current.filter((note) => note.id !== noteId);
    setTrashNotes(nextTrashNotes);
    trashNotesRef.current = nextTrashNotes;
    localStorage.setItem("faiora_trash_notes_" + user.uid, JSON.stringify(nextTrashNotes));
    db.collection(activeCollection2).doc(user.uid).update({
      [`trash.${noteId}`]: firebase.firestore.FieldValue.delete()
    }).catch((e) => console.warn("Permanent delete sync fail", e));
    showToast2("Permanently deleted");
  }, [user, activeCollection2, showToast2]);
  const handleEmptyTrash = useCallback(() => {
    if (!user || !activeCollection2) return;
    setTrashNotes([]);
    trashNotesRef.current = [];
    localStorage.setItem("faiora_trash_notes_" + user.uid, JSON.stringify([]));
    db.collection(activeCollection2).doc(user.uid).update({
      trash: firebase.firestore.FieldValue.delete()
    }).catch((e) => console.warn("Empty trash fail", e));
    showToast2("Trash emptied");
  }, [user, activeCollection2, showToast2]);
  const handleRemoveReminder = useCallback((noteId) => {
    if (isProbing) return;
    setNotes((prev) => {
      const newNotes = prev.map((n) => n.id === noteId ? { ...n, reminderDate: "", reminderTime: "" } : n);
      if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      return newNotes;
    });
    if (user && activeCollection2) {
      db.collection(activeCollection2).doc(user.uid).update({
        [`notes.${noteId}.reminderDate`]: "",
        [`notes.${noteId}.reminderTime`]: ""
      }).catch((e) => console.warn("Reminder remove sync fail", e));
    }
    showToast2("Reminder removed");
  }, [user, activeCollection2, showToast2, isProbing]);
  const handleReorderNote = useCallback((noteId, targetNoteId) => {
    setNotes((prev) => {
      const sourceIdx = prev.findIndex((n) => n.id === noteId);
      const targetIdx = prev.findIndex((n) => n.id === targetNoteId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const newNotes = [...prev];
      const [removed] = newNotes.splice(sourceIdx, 1);
      newNotes.splice(targetIdx, 0, removed);
      const updatedNotes = newNotes.map((n, i) => ({ ...n, sortOrder: i }));
      if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(updatedNotes));
      if (user && activeCollection2) {
        const updates = {};
        updatedNotes.forEach((n) => {
          updates[`notes.${n.id}.sortOrder`] = n.sortOrder;
        });
        db.collection(activeCollection2).doc(user.uid).update(updates).catch((e) => console.warn("Sort sync fail", e));
      }
      return updatedNotes;
    });
  }, [user, activeCollection2]);
  const handleReorderPriorityNote = useCallback((noteId, targetNoteId) => {
    setNotes((prev) => {
      const priorities = prev.filter((n) => (n.labels || []).includes("PRIORITY") && !n.isPinned);
      const sourceIdx = priorities.findIndex((n) => n.id === noteId);
      const targetIdx = priorities.findIndex((n) => n.id === targetNoteId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const newPriorities = [...priorities];
      const [removed] = newPriorities.splice(sourceIdx, 1);
      newPriorities.splice(targetIdx, 0, removed);
      const priorityUpdates = {};
      newPriorities.forEach((n, i) => {
        priorityUpdates[n.id] = i;
      });
      const newNotes = prev.map((n) => {
        if (priorityUpdates[n.id] !== void 0) {
          return { ...n, homeOrder: priorityUpdates[n.id] };
        }
        return n;
      });
      if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      if (user && activeCollection2) {
        const updates = {};
        newPriorities.forEach((n, i) => {
          updates[`notes.${n.id}.homeOrder`] = i;
        });
        db.collection(activeCollection2).doc(user.uid).update(updates).catch((e) => console.warn("HomeOrder sync fail", e));
      }
      return newNotes;
    });
  }, [user, activeCollection2]);
  const handleSaveVersion = useCallback((noteId, snapshot) => {
    setNotes((prev) => {
      const newNotes = prev.map((n) => {
        if (n.id === noteId) {
          const versions = n.versions || [];
          const newVersion = {
            ...snapshot,
            date: (/* @__PURE__ */ new Date()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
            timestamp: Date.now()
          };
          return { ...n, versions: [newVersion, ...versions].slice(0, 10) };
        }
        return n;
      });
      if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      return newNotes;
    });
    if (user && activeCollection2) {
      const note = notes2.find((n) => n.id === noteId);
      if (note) {
        const versions = note.versions || [];
        const newVersion = {
          ...snapshot,
          date: (/* @__PURE__ */ new Date()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          timestamp: Date.now()
        };
        const updatedVersions = [newVersion, ...versions].slice(0, 10);
        db.collection(activeCollection2).doc(user.uid).update({
          [`notes.${noteId}.versions`]: updatedVersions
        }).catch((e) => console.warn("Version sync fail", e));
      }
    }
    showToast2("Version saved");
  }, [user, activeCollection2, notes2, showToast2]);
  const handleAddSection = useCallback((name) => {
    if (!name.trim() || noteSections.includes(name.trim().toUpperCase())) return;
    const updated = [...noteSections, name.trim().toUpperCase()];
    setNoteSections(updated);
    localStorage.setItem("faiora_sections", JSON.stringify(updated));
    if (user && activeCollection2) {
      db.collection(activeCollection2).doc(user.uid).update({ noteSections: updated }).catch((e) => console.warn("Section add sync fail", e));
    }
  }, [user, activeCollection2, noteSections]);
  const handleDeleteSection = useCallback((name, deleteNotes = false) => {
    const updated = noteSections.filter((s) => s !== name);
    setNoteSections(updated);
    localStorage.setItem("faiora_sections", JSON.stringify(updated));
    let affectedNoteIds = [];
    setNotes((prev) => {
      if (deleteNotes) {
        const newNotes = prev.filter((n) => {
          if (n.section === name) {
            affectedNoteIds.push(n.id);
            return false;
          }
          return true;
        });
        if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
        return newNotes;
      } else {
        const newNotes = prev.map((n) => {
          if (n.section === name) {
            affectedNoteIds.push(n.id);
            return { ...n, section: "" };
          }
          return n;
        });
        if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
        return newNotes;
      }
    });
    if (user && activeCollection2) {
      const updates = { noteSections: updated };
      if (affectedNoteIds.length > 0) {
        affectedNoteIds.forEach((id) => {
          if (deleteNotes) {
            updates[`notes.${id}`] = firebase.firestore.FieldValue.delete();
          } else {
            updates[`notes.${id}.section`] = "";
          }
        });
      }
      db.collection(activeCollection2).doc(user.uid).update(updates).catch((e) => console.warn("Section delete sync fail", e));
    }
  }, [user, activeCollection2, noteSections]);
  const handleMoveNoteToSection = useCallback((noteId, sectionName) => {
    setNotes((prev) => {
      const newNotes = prev.map((n) => n.id === noteId ? { ...n, section: sectionName } : n);
      if (user) localStorage.setItem("faiora_notes_" + user.uid, JSON.stringify(newNotes));
      return newNotes;
    });
    if (user && activeCollection2) {
      db.collection(activeCollection2).doc(user.uid).update({
        [`notes.${noteId}.section`]: sectionName
      }).catch((e) => console.warn("Section move sync fail", e));
    }
    if (showToast2) showToast2("Moved to " + (sectionName || "All Notes"));
  }, [user, activeCollection2, showToast2]);
  const handleUpdateQuickTasksLegacy = useCallback((updatedTasks, specificUpdate = null) => {
    setQuickTasks(updatedTasks);
    quickTasksRef.current = updatedTasks;
    FaioraNotifications.rescheduleAll(updatedTasks);
    const currentUser = auth.currentUser;
    const taskCollection = quickTasksCollection || activeCollection2;
    if (currentUser) {
      if (isProbing) {
        console.warn("\u26A0\uFE0F [SYNC] Modifications paused while discovering writable collection...");
        return;
      }
      console.log(`\u{1F527} Syncing QuickTasks [${activeCollection2}]:`, specificUpdate ? "Partial" : "Full");
      localStorage.setItem("faiora_quick_tasks_" + currentUser.uid, JSON.stringify(updatedTasks));
      if (taskCollection) {
        const docRef = db.collection(taskCollection).doc(currentUser.uid);
        if (specificUpdate) {
          docRef.update(specificUpdate).then(() => console.log("\u2705 QuickTasks partial sync successful")).catch((e) => {
            console.warn("\u26A0\uFE0F Partial sync failed, executing aggressive set(merge:true) fallback:", e.message);
            docRef.set({ quickTasks: updatedTasks }, { merge: true }).then(() => console.log("\u2705 Aggressive fallback: QuickTasks sync successful")).catch((err) => {
              console.error("\u274C QuickTasks WRITE PERMISSION DENIED on", activeCollection2, ":", err.message);
              showToast2("Database error. Please refresh or try again.");
            });
          });
        } else {
          docRef.set({ quickTasks: updatedTasks }, { merge: true }).then(() => console.log("\u2705 QuickTasks full sync successful")).catch((e) => console.error("\u274C QuickTasks full sync FAILED:", e.message));
        }
      } else {
        console.warn("\u26A0\uFE0F activeCollection is falsy - cannot sync quick tasks");
      }
    } else {
      console.warn("\u26A0\uFE0F No currentUser \u2014 cannot save quick tasks");
    }
  }, [activeCollection2, isProbing, quickTasksCollection]);
  const handleUpdateQuickTasks = useCallback((updatedTasks, updatedTrash = trashQuickTasksRef.current) => {
    setQuickTasks(updatedTasks);
    quickTasksRef.current = updatedTasks;
    setTrashQuickTasks(updatedTrash);
    trashQuickTasksRef.current = updatedTrash;
    if (typeof FaioraNotifications !== "undefined" && (FaioraNotifications == null ? void 0 : FaioraNotifications.rescheduleAll)) {
      try {
        FaioraNotifications.rescheduleAll(updatedTasks);
      } catch (e) {
      }
    }
    setTimeout(() => {
      var _a;
      const currentUid = ((_a = auth.currentUser) == null ? void 0 : _a.uid) || (user == null ? void 0 : user.uid);
      if (currentUid) {
        try {
          localStorage.setItem("faiora_quick_tasks_" + currentUid, JSON.stringify(updatedTasks));
          localStorage.setItem("faiora_quick_task_trash_" + currentUid, JSON.stringify(updatedTrash));
        } catch (e) {
        }
      }
      const currentUser = auth.currentUser;
      const taskCollection = quickTasksCollection || activeCollection2;
      if (!navigator.onLine || !currentUser || isProbing || !taskCollection) {
        return;
      }
      try {
        const cleanTasks = JSON.parse(JSON.stringify(updatedTasks));
        const cleanTrash = JSON.parse(JSON.stringify(updatedTrash));
        db.collection(taskCollection).doc(currentUser.uid).set({
          quickTasks: cleanTasks,
          quickTaskTrash: cleanTrash
        }, { merge: true }).then(() => {
          if (currentUser.uid) {
            try {
              localStorage.setItem("faiora_last_synced_tasks_" + currentUser.uid, JSON.stringify(cleanTasks));
            } catch (e) {
            }
          }
        }).catch((err) => {
          console.warn("QuickTasks sync failed on", taskCollection, ":", err.message);
        });
      } catch (e) {
      }
    }, 0);
  }, [activeCollection2, isProbing, quickTasksCollection, user]);
  const handleUpdateAlarms = useCallback((updatedAlarms) => {
    setAlarms(updatedAlarms);
    alarmsRef.current = updatedAlarms;
    rescheduleAlarms(updatedAlarms);
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    localStorage.setItem("faiora_alarms_" + currentUser.uid, JSON.stringify(updatedAlarms));
    const alarmCollection = quickTasksCollection || activeCollection2;
    if (isProbing || !alarmCollection) return;
    db.collection(alarmCollection).doc(currentUser.uid).set({ alarms: updatedAlarms }, { merge: true }).catch(() => {
    });
  }, [activeCollection2, isProbing, quickTasksCollection, rescheduleAlarms]);
  const handleAddAlarm = useCallback((payload) => {
    FaioraNotifications.requestPermission().catch(() => {
    });
    if (payload.id) {
      const updated2 = alarmsRef.current.map((a) => a.id === payload.id ? {
        ...a,
        label: payload.label || a.label,
        time: payload.time || a.time,
        repeatDaily: payload.repeatDaily !== void 0 ? payload.repeatDaily : a.repeatDaily,
        days: payload.days || a.days || [],
        snooze: payload.snooze ?? a.snooze ?? 5,
        enabled: true,
        // Fix 2026-04-22: Always enable alarm after editing
        updatedAt: Date.now()
      } : a);
      handleUpdateAlarms(updated2);
      showToast2("Alarm updated");
      return;
    }
    const alarm = {
      id: "alarm_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      label: payload.label || "Alarm",
      time: payload.time || "07:00",
      repeatDaily: payload.repeatDaily !== false,
      days: payload.days || [],
      snooze: payload.snooze ?? 5,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = [alarm, ...alarmsRef.current];
    handleUpdateAlarms(updated);
    showToast2("Alarm added");
  }, [handleUpdateAlarms, showToast2]);
  const handleToggleAlarm = useCallback((alarmId) => {
    FaioraNotifications.requestPermission().catch(() => {
    });
    const updated = alarmsRef.current.map((a) => a.id === alarmId ? { ...a, enabled: !a.enabled, updatedAt: Date.now() } : a);
    handleUpdateAlarms(updated);
    const next = updated.find((a) => a.id === alarmId);
    showToast2((next == null ? void 0 : next.enabled) ? "Alarm enabled" : "Alarm disabled");
  }, [handleUpdateAlarms, showToast2]);
  const handleDeleteAlarm = useCallback((alarmId) => {
    const updated = alarmsRef.current.filter((a) => a.id !== alarmId);
    handleUpdateAlarms(updated);
    dismissAlarmAlert(alarmId);
    showToast2("Alarm deleted");
  }, [dismissAlarmAlert, handleUpdateAlarms, showToast2]);
  const handleSaveProfile = useCallback((nextProfile) => {
    const mergedProfile = { ...profileData2, ...nextProfile };
    setProfileData(mergedProfile);
    if (user && activeCollection2) {
      db.collection(activeCollection2).doc(user.uid).set({ profile: mergedProfile }, { merge: true }).catch(() => {
      });
    }
    showToast2("Profile saved");
  }, [user, activeCollection2, profileData2, showToast2]);
  const handleSaveSettings = useCallback((nextSettings) => {
    setSettingsData((prev) => {
      const merged = { ...prev, ...nextSettings };
      if (user == null ? void 0 : user.uid) {
        try {
          localStorage.setItem("faiora_settings_" + user.uid, JSON.stringify(merged));
        } catch {
        }
      }
      return merged;
    });
    if (user && activeCollection2) {
      db.collection(activeCollection2).doc(user.uid).set({ settings: { ...settingsData2, ...nextSettings } }, { merge: true }).catch(() => {
      });
    }
    showToast2("Settings saved");
  }, [user, activeCollection2, settingsData2, showToast2]);
  const createDailyBackup = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !navigator.onLine) {
      console.log("\u{1F4E6} Backup skipped: " + (!currentUser ? "no user" : "offline"));
      return;
    }
    try {
      const tasks = quickTasksRef.current || [];
      const tasksJson = JSON.stringify(tasks);
      const backup = {
        timestamp: Date.now(),
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        // YYYY-MM-DD
        tasks,
        count: tasks.length,
        size: tasksJson.length
      };
      if (backup.size > 1024 * 1024) {
        console.warn(`\u26A0\uFE0F Large backup: ${(backup.size / 1024 / 1024).toFixed(2)}MB`);
      }
      const taskCollection = quickTasksCollection || activeCollection2;
      const backupRef = db.collection(taskCollection).doc(currentUser.uid).collection("quickTaskBackups").doc(`backup_${backup.date}`);
      await backupRef.set(backup);
      console.log("\u2713 Daily backup created:", backup.date, `(${backup.count} tasks)`);
      await cleanupOldBackups();
    } catch (error) {
      console.error("\u2717 Backup creation failed:", error.message);
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: { feature: "daily-backup" },
          extra: { userId: currentUser == null ? void 0 : currentUser.uid }
        });
      }
    }
  }, [activeCollection2, quickTasksCollection]);
  const cleanupOldBackups = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const taskCollection = quickTasksCollection || activeCollection2;
      const backupsRef = db.collection(taskCollection).doc(currentUser.uid).collection("quickTaskBackups").orderBy("timestamp", "desc");
      const snapshot = await backupsRef.get();
      const backups = snapshot.docs;
      if (backups.length > 30) {
        const toDelete = backups.slice(30);
        const batch = db.batch();
        toDelete.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`\u{1F5D1}\uFE0F Deleted ${toDelete.length} old backups (30-backup limit)`);
      }
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1e3;
      const recentBackups = backups.slice(0, 7);
      const oldBackups = backups.slice(7).filter((doc) => {
        return doc.data().timestamp < thirtyDaysAgo;
      });
      if (oldBackups.length > 0) {
        const batch = db.batch();
        oldBackups.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`\u{1F5D1}\uFE0F Deleted ${oldBackups.length} backups older than 30 days`);
      }
    } catch (error) {
      console.warn("Backup cleanup failed:", error.message);
    }
  }, [activeCollection2, quickTasksCollection]);
  const restoreBackup = useCallback(async (backupId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated");
    try {
      const taskCollection = quickTasksCollection || activeCollection2;
      const backupDoc = await db.collection(taskCollection).doc(currentUser.uid).collection("quickTaskBackups").doc(backupId).get();
      if (!backupDoc.exists) {
        throw new Error("Backup not found");
      }
      const backup = backupDoc.data();
      if (!Array.isArray(backup.tasks)) {
        throw new Error("Invalid backup data structure");
      }
      const validTasks = backup.tasks.filter((task) => {
        return task.id && typeof task.text === "string";
      });
      if (validTasks.length === 0) {
        throw new Error("Backup contains no valid tasks");
      }
      if (validTasks.length < backup.tasks.length) {
        console.warn(`\u26A0\uFE0F ${backup.tasks.length - validTasks.length} invalid tasks filtered out`);
      }
      handleUpdateQuickTasks(validTasks);
      try {
        localStorage.setItem(
          `faiora_last_synced_tasks_${currentUser.uid}`,
          JSON.stringify(validTasks)
        );
      } catch (e) {
        console.warn("Failed to update baseline:", e);
      }
      return validTasks.length;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }, [activeCollection2, quickTasksCollection, handleUpdateQuickTasks]);
  useEffect(() => {
    if (!user) return;
    const scheduleDailyBackup = () => {
      const now = /* @__PURE__ */ new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      console.log(`\u{1F4C5} Daily backup scheduled for midnight (${(msUntilMidnight / 1e3 / 60).toFixed(0)} minutes)`);
      const timeoutId = setTimeout(() => {
        createDailyBackup();
        const intervalId = setInterval(createDailyBackup, 24 * 60 * 60 * 1e3);
        return () => clearInterval(intervalId);
      }, msUntilMidnight);
      return () => clearTimeout(timeoutId);
    };
    const handleOnlineBackup = () => {
      if (navigator.onLine) {
        createDailyBackup();
        window.removeEventListener("online", handleOnlineBackup);
      }
    };
    const cleanup = scheduleDailyBackup();
    window.addEventListener("online", handleOnlineBackup);
    return () => {
      cleanup();
      window.removeEventListener("online", handleOnlineBackup);
    };
  }, [user, createDailyBackup]);
  const handleAddQuickTask = useCallback((text, dueDate = "", dueTime = "", categories = [], progress = 0, progressHistory = [], reminders = { "24h": false, "1h": true, "due": true }, pinned = false) => {
    if (dueDate) {
      FaioraNotifications.requestPermission().catch(() => {
      });
    }
    const chunks = String(text || "").split(/\r?\n/).map((line) => formatTaskText(line)).map((line) => line.trim()).filter(Boolean);
    if (!chunks.length) return;
    let dueTimestamp = null;
    if (dueDate) {
      const dt = /* @__PURE__ */ new Date(`${dueDate}T${dueTime || "23:59"}`);
      if (!isNaN(dt.getTime())) dueTimestamp = dt.getTime();
    }
    const cats = Array.isArray(categories) ? categories.map((c) => c.trim()).filter(Boolean) : categories ? [String(categories).trim()] : [];
    const now = Date.now();
    const isDone = progress === 100;
    const newTasks = chunks.map((line, idx) => ({
      id: "qt_" + (now + idx) + "_" + Math.random().toString(36).slice(2, 7),
      text: line,
      dueDate,
      dueTime,
      dueTimestamp,
      categories: cats,
      category: cats[0] || "",
      progress: progress || 0,
      progressHistory: Array.isArray(progressHistory) ? progressHistory : [],
      reminders: reminders || { "24h": false, "1h": true, "due": true },
      pinned: pinned || false,
      completed: isDone,
      completedAt: isDone ? now : null,
      createdAt: now + idx
    }));
    const updated = [...newTasks, ...quickTasksRef.current];
    handleUpdateQuickTasks(updated);
  }, [handleUpdateQuickTasks]);
  const handleUpdateQuickTask = (id, text, dueDate, dueTime, categories = [], progress = void 0, progressHistory = void 0, reminders = void 0, pinned = void 0) => {
    if (dueDate) {
      FaioraNotifications.requestPermission().catch(() => {
      });
    }
    let dueTimestamp = null;
    if (dueDate) {
      const dt = /* @__PURE__ */ new Date(`${dueDate}T${dueTime || "23:59"}`);
      if (!isNaN(dt.getTime())) dueTimestamp = dt.getTime();
    }
    const cats = Array.isArray(categories) ? categories.map((c) => c.trim()).filter(Boolean) : categories ? [String(categories).trim()] : [];
    const targetIndex = quickTasks2.findIndex((t) => t.id === id);
    if (targetIndex > -1) {
      const updated = [...quickTasks2];
      const original = updated[targetIndex];
      const taskProg = progress !== void 0 ? progress : original.progress !== void 0 ? original.progress : original.completed ? 100 : 0;
      const isDone = progress !== void 0 ? progress === 100 : original.completed;
      const lastProg = taskProg > 0 && taskProg < 100 ? taskProg : original.lastProgress ?? null;
      const taskHistory = progressHistory !== void 0 ? progressHistory : original.progressHistory || [];
      const updatedTask = {
        ...original,
        text: formatTaskText(text),
        dueDate,
        dueTime,
        dueTimestamp,
        categories: cats,
        category: cats[0] || "",
        progress: taskProg,
        progressHistory: taskHistory,
        reminders: reminders !== void 0 ? reminders : original.reminders || { "24h": true, "1h": true, "due": true },
        pinned: pinned !== void 0 ? pinned : original.pinned || false,
        lastProgress: lastProg ?? null,
        completed: isDone,
        completedAt: isDone && !original.completed ? Date.now() : isDone ? original.completedAt : null,
        updatedAt: Date.now()
      };
      updated[targetIndex] = updatedTask;
      FaioraNotifications.cancelForTask(id);
      if (!isDone && dueDate) {
        setTimeout(() => {
          FaioraNotifications.scheduleForTask(updatedTask);
        }, 100);
      }
      handleUpdateQuickTasks(updated);
    }
  };
  const [taskSnackbars, setTaskSnackbars] = useState([]);
  const addTaskSnackbar = useCallback((message, onUndo) => {
    const id = Date.now() + Math.random();
    setTaskSnackbars((prev) => [...prev, { id, message, onUndo }]);
    setTimeout(() => {
      setTaskSnackbars((prev) => prev.filter((s) => s.id !== id));
    }, 5e3);
  }, []);
  const handleDeleteQuickTask = (id) => {
    const targetIndex = quickTasks2.findIndex((t) => t.id === id);
    const taskToDelete = targetIndex > -1 ? quickTasks2[targetIndex] : null;
    if (!taskToDelete) return;
    FaioraNotifications.cancelForTask(id);
    const updated = [...quickTasks2];
    updated.splice(targetIndex, 1);
    const nextTrashTask = {
      ...taskToDelete,
      deletedAt: (/* @__PURE__ */ new Date()).toISOString(),
      trashType: "quickTask"
    };
    const updatedTrash = [nextTrashTask, ...trashQuickTasksRef.current.filter((task) => task.id !== id)];
    handleUpdateQuickTasks(updated, updatedTrash);
    const taskName = (taskToDelete.text || "Task").trim();
    const displayName = taskName.length > 12 ? `${taskName.slice(0, 12)}...` : taskName;
    showToast2(`"${displayName}" moved to Trash`, {
      label: "UNDO",
      onClick: () => {
        const restored = [taskToDelete, ...quickTasksRef.current];
        const restoredTrash = trashQuickTasksRef.current.filter((task) => task.id !== id);
        handleUpdateQuickTasks(restored, restoredTrash);
      }
    });
  };
  const handleRestoreQuickTask = useCallback((taskId) => {
    const taskToRestore = trashQuickTasksRef.current.find((task) => task.id === taskId);
    if (!taskToRestore) return;
    const { deletedAt, trashType, ...restoredTask } = taskToRestore;
    const updatedTrash = trashQuickTasksRef.current.filter((task) => task.id !== taskId);
    const updatedTasks = [restoredTask, ...quickTasksRef.current.filter((task) => task.id !== taskId)];
    handleUpdateQuickTasks(updatedTasks, updatedTrash);
    showToast2("Quick task restored");
  }, [handleUpdateQuickTasks, showToast2]);
  const handlePermanentDeleteQuickTask = useCallback((taskId) => {
    const updatedTrash = trashQuickTasksRef.current.filter((task) => task.id !== taskId);
    setTrashQuickTasks(updatedTrash);
    trashQuickTasksRef.current = updatedTrash;
    const currentUser = auth.currentUser;
    const taskCollection = quickTasksCollection || activeCollection2;
    if (currentUser) {
      localStorage.setItem("faiora_quick_task_trash_" + currentUser.uid, JSON.stringify(updatedTrash));
    }
    if (!isProbing && currentUser && taskCollection) {
      db.collection(taskCollection).doc(currentUser.uid).set({ quickTaskTrash: updatedTrash }, { merge: true }).catch((e) => console.warn("Quick-task trash delete fail", e));
    }
    showToast2("Quick task permanently deleted");
  }, [activeCollection2, isProbing, quickTasksCollection, showToast2]);
  const handleEmptyQuickTaskTrash = useCallback(() => {
    setTrashQuickTasks([]);
    trashQuickTasksRef.current = [];
    const currentUser = auth.currentUser;
    const taskCollection = quickTasksCollection || activeCollection2;
    if (currentUser) {
      localStorage.setItem("faiora_quick_task_trash_" + currentUser.uid, JSON.stringify([]));
    }
    if (!isProbing && currentUser && taskCollection) {
      db.collection(taskCollection).doc(currentUser.uid).set({ quickTaskTrash: [] }, { merge: true }).catch((e) => console.warn("Quick-task trash clear fail", e));
    }
    showToast2("Quick-task trash emptied");
  }, [activeCollection2, isProbing, quickTasksCollection, showToast2]);
  const syncQuickTaskToNotes = (taskId, isChecked) => {
    try {
      const currentNotes = notesRef.current || notes2 || [];
      const currentTasks = quickTasksRef.current || quickTasks2 || [];
      const taskObj = currentTasks.find((t) => String(t.id) === String(taskId));
      const taskTextClean = taskObj && taskObj.text ? taskObj.text.trim().toLowerCase() : "";
      currentNotes.forEach((note) => {
        if (!note || !note.content) return;
        const isLiveNotepadNote = (note.labels || []).includes("QUICK-TASKS") || note.id.startsWith("qt_live_notepad") || note.title === "Quick Tasks Notepad" || note.content.includes(`data-qt-id="${taskId}"`) || note.content.includes(`data-qt-id='${taskId}'`) || taskTextClean && note.content.toLowerCase().includes(taskTextClean);
        if (isLiveNotepadNote) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = note.content;
          let targetLi = tempDiv.querySelector(`[data-qt-id="${taskId}"]`) || tempDiv.querySelector(`[data-qt-id='${taskId}']`);
          if (!targetLi && taskTextClean) {
            const allLis = tempDiv.querySelectorAll(".checklist-item, li");
            for (const li of allLis) {
              const textSpan = li.querySelector(".qt-notepad-live-text") || li.querySelector("span:not(.checklist-checkbox)") || li;
              const liText = textSpan.textContent.trim().toLowerCase();
              if (liText && (liText === taskTextClean || liText.includes(taskTextClean) || taskTextClean.includes(liText))) {
                targetLi = li;
                li.setAttribute("data-qt-id", String(taskId));
                break;
              }
            }
          }
          if (targetLi) {
            if (isChecked) {
              targetLi.classList.add("checked");
              const spanText = targetLi.querySelector(".qt-notepad-live-text") || targetLi.querySelector("span:not(.checklist-checkbox)");
              if (spanText) {
                spanText.style.textDecoration = "line-through";
                spanText.style.opacity = "0.5";
              }
            } else {
              targetLi.classList.remove("checked");
              const spanText = targetLi.querySelector(".qt-notepad-live-text") || targetLi.querySelector("span:not(.checklist-checkbox)");
              if (spanText) {
                spanText.style.textDecoration = "none";
                spanText.style.opacity = "1";
              }
            }
            const updatedNote = {
              ...note,
              content: tempDiv.innerHTML,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
            handleUpdateNoteLocal(updatedNote);
            if (editingNote && editingNote.id === updatedNote.id) {
              setEditingNote(updatedNote);
            }
            if (user && activeCollection2) {
              try {
                db.collection(activeCollection2).doc(user.uid).set({
                  notes: {
                    [updatedNote.id]: {
                      ...updatedNote,
                      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }
                  }
                }, { merge: true });
              } catch (e) {
              }
            }
          }
        }
      });
    } catch (e) {
      console.warn("Sync to note fail", e);
    }
  };
  const handleToggleQuickTask = (id) => {
    var _a, _b;
    const currentTasks = quickTasksRef.current || quickTasks2 || [];
    const targetIndex = currentTasks.findIndex((t) => String(t.id) === String(id));
    if (targetIndex > -1) {
      const updated = [...currentTasks];
      const original = updated[targetIndex];
      const nextCompleted = !original.completed;
      let nextProgress;
      let nextLastProgress = original.lastProgress;
      let nextProgressHistory = Array.isArray(original.progressHistory) ? [...original.progressHistory] : [];
      if (nextCompleted) {
        if (original.progress > 0 && original.progress < 100) {
          nextLastProgress = original.progress;
        }
        nextProgress = 100;
        if (!nextProgressHistory.some((h) => Number(h.percentage) === 100)) {
          nextProgressHistory.unshift({
            id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            percentage: 100,
            note: "Completed",
            timestamp: Date.now()
          });
        }
      } else {
        nextProgress = original.lastProgress !== void 0 && original.lastProgress > 0 && original.lastProgress < 100 ? original.lastProgress : original.progress > 0 && original.progress < 100 ? original.progress : 0;
        nextProgressHistory = nextProgressHistory.filter((h) => !(Number(h.percentage) === 100 && h.note === "Completed"));
      }
      const updatedTask = {
        ...original,
        completed: nextCompleted,
        progress: nextProgress ?? (nextCompleted ? 100 : 0),
        progressHistory: nextProgressHistory,
        lastProgress: nextLastProgress ?? null,
        completedAt: nextCompleted ? Date.now() : null
      };
      updated[targetIndex] = updatedTask;
      const taskName = (original.text || "Task").trim();
      const displayName = taskName.length > 12 ? `${taskName.slice(0, 12)}...` : taskName;
      if (updatedTask.completed) {
        if ((_a = window.FaioraNativeAlarmBridge) == null ? void 0 : _a.markTaskCompleted) window.FaioraNativeAlarmBridge.markTaskCompleted(String(id), true);
        try {
          if (typeof FaioraNotifications !== "undefined" && FaioraNotifications) {
            if (typeof FaioraNotifications.playCheckSFX === "function") FaioraNotifications.playCheckSFX();
            if (typeof FaioraNotifications.cancelForTask === "function") FaioraNotifications.cancelForTask(id);
          }
        } catch (e) {
          console.warn("Notification/SFX error on task check:", e);
        }
        const originalProgress = original.progress;
        const originalLastProgress = original.lastProgress;
        showToast2(`"${displayName}" completed`, {
          label: "UNDO",
          taskId: id,
          onClick: () => {
            var _a2;
            const reverted = [...quickTasksRef.current || []];
            const undoIndex = reverted.findIndex((t) => String(t.id) === String(id));
            if (undoIndex > -1) {
              reverted[undoIndex] = {
                ...reverted[undoIndex],
                completed: false,
                completedAt: null,
                progress: originalProgress,
                lastProgress: originalLastProgress
              };
              handleUpdateQuickTasks(reverted);
              syncQuickTaskToNotes(id, false);
              if ((_a2 = window.FaioraNativeAlarmBridge) == null ? void 0 : _a2.markTaskCompleted) window.FaioraNativeAlarmBridge.markTaskCompleted(String(id), false);
            }
          }
        }, `task-${id}`);
      } else {
        if ((_b = window.FaioraNativeAlarmBridge) == null ? void 0 : _b.markTaskCompleted) window.FaioraNativeAlarmBridge.markTaskCompleted(String(id), false);
        const wasCompleted = original.completed;
        const beforeProgress = original.progress;
        const beforeLastProgress = original.lastProgress;
        showToast2(`"${displayName}" marked active`, {
          label: "UNDO",
          taskId: id,
          onClick: () => {
            var _a2;
            const reverted = [...quickTasksRef.current || []];
            const undoIndex = reverted.findIndex((t) => String(t.id) === String(id));
            if (undoIndex > -1) {
              reverted[undoIndex] = {
                ...reverted[undoIndex],
                completed: true,
                completedAt: Date.now(),
                progress: 100,
                lastProgress: beforeLastProgress
              };
              handleUpdateQuickTasks(reverted);
              syncQuickTaskToNotes(id, true);
              if ((_a2 = window.FaioraNativeAlarmBridge) == null ? void 0 : _a2.markTaskCompleted) window.FaioraNativeAlarmBridge.markTaskCompleted(String(id), true);
            }
          }
        }, `task-${id}`);
      }
      handleUpdateQuickTasks(updated);
      setTimeout(() => {
        syncQuickTaskToNotes(id, updatedTask.completed);
      }, 0);
    }
  };
  useEffect(() => {
    const onCompleteAction = (e) => {
      var _a;
      const taskId = (_a = e.detail) == null ? void 0 : _a.taskId;
      if (!taskId) return;
      const currentTasks = quickTasksRef.current || [];
      const t = currentTasks.find((item) => String(item.id) === String(taskId));
      if (t && !t.completed) {
        handleToggleQuickTask(taskId);
      }
    };
    const onSnoozeAction = (e) => {
      var _a;
      const taskId = (_a = e.detail) == null ? void 0 : _a.taskId;
      if (!taskId) return;
      const currentTasks = quickTasksRef.current || [];
      const t = currentTasks.find((item) => String(item.id) === String(taskId));
      if (t) {
        const now = /* @__PURE__ */ new Date();
        let baseMs = now.getTime();
        if (t.dueDate) {
          const taskDue = /* @__PURE__ */ new Date(`${t.dueDate}T${t.dueTime || "23:59"}`);
          if (!Number.isNaN(taskDue.getTime()) && taskDue.getTime() > baseMs) {
            baseMs = taskDue.getTime();
          }
        }
        const targetDate = new Date(baseMs + 60 * 60 * 1e3);
        const nextDate = formatDateLocal(targetDate);
        const nextTime = `${String(targetDate.getHours()).padStart(2, "0")}:${String(targetDate.getMinutes()).padStart(2, "0")}`;
        handleUpdateQuickTask(t.id, t.text, nextDate, nextTime, t.categories, t.progress, t.progressHistory);
        showToast2(`Task postponed by 1 hour`);
      }
    };
    const onTomorrowAction = (e) => {
      var _a;
      const taskId = (_a = e.detail) == null ? void 0 : _a.taskId;
      if (!taskId) return;
      const t = (quickTasksRef.current || []).find((item) => item.id === taskId);
      if (t) {
        const nextDate = getTomorrow();
        const nextTime = "10:00";
        handleUpdateQuickTask(t.id, t.text, nextDate, nextTime, t.categories, t.progress, t.progressHistory, t.reminders);
        showToast2("Task moved to tomorrow 10:00 AM");
      }
    };
    const consumeNativeBackgroundActions = () => {
      var _a;
      try {
        if (!((_a = window.FaioraNativeAlarmBridge) == null ? void 0 : _a.consumeTaskActions)) return;
        const raw = window.FaioraNativeAlarmBridge.consumeTaskActions();
        if (!raw || raw === "[]") return;
        const actions = JSON.parse(raw);
        if (!Array.isArray(actions) || !actions.length) return;
        actions.forEach((item) => {
          if (!item.taskId) return;
          if (item.action === "complete_task") {
            onCompleteAction({ detail: { taskId: item.taskId } });
          } else if (item.action === "snooze_1h") {
            onSnoozeAction({ detail: { taskId: item.taskId } });
          } else if (item.action === "tomorrow") {
            onTomorrowAction({ detail: { taskId: item.taskId } });
          }
        });
      } catch (err) {
        console.warn("Native task actions sync failed", err);
      }
    };
    consumeNativeBackgroundActions();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        consumeNativeBackgroundActions();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", consumeNativeBackgroundActions);
    window.addEventListener("faiora-task-action-complete", onCompleteAction);
    window.addEventListener("faiora-task-action-snooze", onSnoozeAction);
    window.addEventListener("faiora-task-action-tomorrow", onTomorrowAction);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", consumeNativeBackgroundActions);
      window.removeEventListener("faiora-task-action-complete", onCompleteAction);
      window.removeEventListener("faiora-task-action-snooze", onSnoozeAction);
      window.removeEventListener("faiora-task-action-tomorrow", onTomorrowAction);
    };
  }, [handleToggleQuickTask, handleUpdateQuickTask]);
  const handleOpenCreator = useCallback(() => {
    setEditingNote(null);
    setIsCreatorOpen(true);
    window.history.pushState({ modal: "creator" }, "");
  }, []);
  const handleEditNote = useCallback((note) => {
    setEditingNote(note);
    setIsCreatorOpen(true);
    window.history.pushState({ modal: "creator" }, "");
  }, []);
  const handleOpenSetLock = useCallback(() => {
    setIsSetLockModalOpen(true);
    window.history.pushState({ modal: "setLock" }, "");
  }, []);
  const handleCloseSetLock = useCallback(() => {
    setIsSetLockModalOpen(false);
    if (window.history.state && window.history.state.modal === "setLock") {
      window.history.back();
    }
  }, []);
  const handleOpenQuickTaskModal = useCallback((date = null, prefillCategory2 = null) => {
    setPrefillDate(date);
    setPrefillCategory(prefillCategory2);
    setEditingQuickTask(null);
    setIsQuickTaskModalOpen(true);
  }, []);
  const handleCloseQuickTaskModal = useCallback(() => {
    setIsQuickTaskModalOpen(false);
    setPrefillDate(null);
    setPrefillCategory(null);
    if (window.history.state && (window.history.state.modal === "quickTask" || window.history.state.modal === "quicktask")) {
      closingViaCode.current = true;
      window.history.back();
    }
  }, []);
  const handleOpenQuickTaskEditor = useCallback((task) => {
    setPrefillDate(null);
    setIsQuickTaskModalOpen(false);
    setEditingQuickTask(task);
  }, []);
  const handleCloseQuickTaskEditor = useCallback(() => {
    setEditingQuickTask(null);
    if (window.history.state && (window.history.state.modal === "quickTask" || window.history.state.modal === "quicktask")) {
      closingViaCode.current = true;
      window.history.back();
    }
  }, []);
  const handleCloseUnlockModal = useCallback(() => {
    setUnlockingNote(null);
    if (window.history.state && window.history.state.modal === "unlock") {
      window.history.back();
    }
  }, []);
  const handleCloseCreator = () => {
    setEditingNote(null);
    setIsCreatorOpen(false);
    if (window.history.state && window.history.state.modal === "creator") {
      closingViaCode.current = true;
      if (window.history.state.editing) {
        window.history.go(-2);
      } else {
        window.history.back();
      }
    }
  };
  useEffect(() => {
    const onSignedIn = (e) => {
      var _a, _b;
      const signedUser = e.detail;
      if (!signedUser) return;
      setNotes([]);
      setQuickTasks([]);
      setUser(signedUser);
      setIsAuthChecked(true);
      setIsTimerDone(true);
      if (!((_a = notesRef.current) == null ? void 0 : _a.length) && !((_b = quickTasksRef.current) == null ? void 0 : _b.length)) {
        setIsProbing(true);
      }
    };
    window.addEventListener("faiora-signed-in", onSignedIn);
    return () => window.removeEventListener("faiora-signed-in", onSignedIn);
  }, []);
  useEffect(() => {
    if (!user) return;
    try {
      const h = window.location.hash;
      if (!h || h === "#" || !h.startsWith("#/")) {
        window.location.hash = "#/";
      }
    } catch (e) {
    }
  }, [user]);
  useEffect(() => {
    const fixHashOnResume = () => {
      if (document.visibilityState !== "visible") return;
      if (!auth.currentUser) return;
      try {
        const h = window.location.hash;
        if (!h || h === "#" || !h.startsWith("#/")) {
          window.location.hash = "#/";
        }
      } catch (e) {
      }
    };
    document.addEventListener("visibilitychange", fixHashOnResume);
    return () => document.removeEventListener("visibilitychange", fixHashOnResume);
  }, []);
  useEffect(() => {
    const offlineFallback = setTimeout(() => {
      if (!navigator.onLine || localStorage.getItem("faiora_cached_user")) {
        setIsAuthChecked(true);
        setIsProbing(false);
        setIsFirstSyncDone(true);
      }
    }, 500);
    const unsubscribe = auth.onAuthStateChanged((u) => {
      var _a, _b, _c, _d;
      clearTimeout(offlineFallback);
      console.log("\u{1F464} [AUTH] State changed. User:", u ? `${u.displayName} (${u.uid})` : "NULL");
      const nextUid = (u == null ? void 0 : u.uid) ?? null;
      const prevUid = prevAuthUidRef.current;
      if (prevUid !== nextUid && prevUid !== null) {
        setNotes([]);
        setQuickTasks([]);
        setQuickTasksCollection(localStorage.getItem("faiora_quick_tasks_collection") || localStorage.getItem("faiora_active_collection") || "tasks");
        prevAuthUidRef.current = nextUid;
      } else if (prevUid === null) {
        prevAuthUidRef.current = nextUid;
      }
      if (u) {
        try {
          localStorage.setItem("faiora_cached_user", JSON.stringify({ uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL }));
          localStorage.setItem("faiora_last_uid", u.uid);
        } catch (e) {
        }
      } else {
        try {
          localStorage.removeItem("faiora_cached_user");
          localStorage.removeItem("faiora_last_uid");
        } catch (e) {
        }
      }
      if (!u) {
        setTimeout(() => {
          initializeGoogleOneTap();
        }, 1e3);
      } else {
        if ((_b = (_a = window.google) == null ? void 0 : _a.accounts) == null ? void 0 : _b.id) {
          window.google.accounts.id.cancel();
        }
      }
      setUser(u);
      setIsAuthChecked(true);
      if (u) {
        if (!((_c = notesRef.current) == null ? void 0 : _c.length) && !((_d = quickTasksRef.current) == null ? void 0 : _d.length)) {
          setIsProbing(true);
        }
        setTimeout(() => {
          const hasRecoveredNotes = notesRef.current.length > 0;
          const hasRecoveredTasks = quickTasksRef.current.length > 0;
          if (navigator.onLine && coldBootNeedsUnifiedHydrationRef.current && !hasRecoveredNotes && !hasRecoveredTasks) {
            console.log("\u23F3 [PROBE] Holding cold-boot reveal because discovery is still unresolved.");
            return;
          }
          if (navigator.onLine && coldBootNeedsUnifiedHydrationRef.current && hasRecoveredTasks && !hasRecoveredNotes) {
            console.log("\u23F3 [PROBE] Holding cold-boot reveal because notes are still unresolved.");
            return;
          }
          setIsProbing(false);
          setIsFirstSyncDone(true);
        }, 500);
        setTimeout(() => {
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              FaioraNotifications.registerFCMToken();
            } else {
              FaioraNotifications.requestPermission().catch(() => {
              });
            }
          } catch (notifErr) {
            console.warn("[Faiora] notification bootstrap:", notifErr);
          }
          console.log("\u{1F464} [AUTH] User logged in, starting writable collection discovery...");
          const applySharedSources = (noteSummary, taskSummary, reason = "probe") => {
            const resolvedNoteCollection = (noteSummary == null ? void 0 : noteSummary.coll) || localStorage.getItem("faiora_active_collection") || "tasks";
            const resolvedTaskCollection = (taskSummary == null ? void 0 : taskSummary.coll) || resolvedNoteCollection;
            const noteData = (noteSummary == null ? void 0 : noteSummary.data) ? { ...noteSummary.data, _sourceCollection: resolvedNoteCollection } : {};
            const taskData = (taskSummary == null ? void 0 : taskSummary.data) ? { ...taskSummary.data, _sourceCollection: resolvedTaskCollection } : null;
            const combinedPayload = buildHydrationPayload(noteData, taskData);
            hydrateResolvedPayload({
              uid: u.uid,
              data: combinedPayload,
              sourceCollection: `${resolvedNoteCollection}${resolvedTaskCollection !== resolvedNoteCollection ? ` + ${resolvedTaskCollection}` : ""}`,
              markReady: true
            });
            setActiveCollection(resolvedNoteCollection);
            setQuickTasksCollection(resolvedTaskCollection);
            localStorage.setItem("faiora_active_collection", resolvedNoteCollection);
            localStorage.setItem("faiora_quick_tasks_collection", resolvedTaskCollection);
            db.collection("faiora_metadata").doc(u.uid).set({
              activeCollection: resolvedNoteCollection,
              notesCollection: resolvedNoteCollection,
              quickTasksCollection: resolvedTaskCollection,
              electedAt: Date.now(),
              electedBy: reason
            }, { merge: true }).catch(() => {
            });
            return resolvedNoteCollection;
          };
          const tryProbe = async () => {
            const lastColl = localStorage.getItem("faiora_active_collection");
            const lastTaskColl = localStorage.getItem("faiora_quick_tasks_collection") || lastColl || "tasks";
            let bestCollection = lastColl || "tasks";
            try {
              const applyDiscoveredSources = (noteSummary, taskSummary, reason = "probe") => {
                const resolvedNoteCollection = (noteSummary == null ? void 0 : noteSummary.coll) || bestCollection;
                const resolvedTaskCollection = (taskSummary == null ? void 0 : taskSummary.coll) || resolvedNoteCollection;
                const noteData = (noteSummary == null ? void 0 : noteSummary.data) ? { ...noteSummary.data, _sourceCollection: resolvedNoteCollection } : {};
                const taskData = (taskSummary == null ? void 0 : taskSummary.data) ? { ...taskSummary.data, _sourceCollection: resolvedTaskCollection } : null;
                const combinedPayload = buildHydrationPayload(noteData, taskData);
                hydrateResolvedPayload({
                  uid: u.uid,
                  data: combinedPayload,
                  sourceCollection: `${resolvedNoteCollection}${resolvedTaskCollection !== resolvedNoteCollection ? ` + ${resolvedTaskCollection}` : ""}`,
                  markReady: true
                });
                setActiveCollection(resolvedNoteCollection);
                setQuickTasksCollection(resolvedTaskCollection);
                localStorage.setItem("faiora_active_collection", resolvedNoteCollection);
                localStorage.setItem("faiora_quick_tasks_collection", resolvedTaskCollection);
                db.collection("faiora_metadata").doc(u.uid).set({
                  activeCollection: resolvedNoteCollection,
                  notesCollection: resolvedNoteCollection,
                  quickTasksCollection: resolvedTaskCollection,
                  electedAt: Date.now(),
                  electedBy: reason
                }, { merge: true }).catch(() => {
                });
                return resolvedNoteCollection;
              };
              setActiveCollection(bestCollection);
              setQuickTasksCollection(lastTaskColl);
              const lsNotes = localStorage.getItem("faiora_notes_" + u.uid);
              const lsTasks = localStorage.getItem("faiora_quick_tasks_" + u.uid);
              if (lsNotes && lsNotes !== "[]" || lsTasks && lsTasks !== "[]") {
                setIsFirstSyncDone(true);
              }
              try {
                const metaSnap = await db.collection("faiora_metadata").doc(u.uid).get({ source: "server" });
                if (metaSnap.exists) {
                  const metadata = metaSnap.data() || {};
                  const masterNoteColl = metadata.notesCollection || metadata.activeCollection;
                  const masterTaskColl = metadata.quickTasksCollection || metadata.activeCollection || lastTaskColl;
                  if (metadata.notesCollection || metadata.quickTasksCollection) {
                    const [masterNoteSummary, masterTaskSummary] = await Promise.all([
                      masterNoteColl ? inspectCollectionForUid(masterNoteColl, u.uid) : Promise.resolve(null),
                      masterTaskColl ? inspectCollectionForUid(masterTaskColl, u.uid) : Promise.resolve(null)
                    ]);
                    if (((masterNoteSummary == null ? void 0 : masterNoteSummary.noteCount) || 0) > 0 && ((masterTaskSummary == null ? void 0 : masterTaskSummary.taskCount) || 0) > 0) {
                      return applyDiscoveredSources(masterNoteSummary, masterTaskSummary, "metadata");
                    }
                  }
                  const masterColl = metaSnap.data().activeCollection;
                  if (masterColl) {
                    const masterSummary = await inspectCollectionForUid(masterColl, u.uid);
                    if (masterSummary.exists) {
                      console.log(`\u{1F4E1} [SYNC] Consensus candidate '${masterColl}' -> ${masterSummary.noteCount} notes, ${masterSummary.taskCount} quick tasks`);
                      bestCollection = masterColl;
                      setActiveCollection(masterColl);
                      localStorage.setItem("faiora_active_collection", masterColl);
                      if (masterSummary.noteCount > 0 && masterSummary.taskCount > 0) {
                        hydrateResolvedPayload({ uid: u.uid, data: masterSummary.data, sourceCollection: masterColl, markReady: true });
                        return masterColl;
                      }
                      console.log(`\u{1F9ED} [SYNC] Consensus collection '${masterColl}' is sparse. Continuing discovery for a richer notes source...`);
                    }
                  }
                }
              } catch (metaErr) {
                console.warn("\u26A0\uFE0F [SYNC] Consensus check failed, falling back to local discovery race.");
              }
              const runProbe = async () => {
                try {
                  const quickSummary = await inspectCollectionForUid(bestCollection, u.uid);
                  const quickTaskSummary = await inspectCollectionForUid(lastTaskColl, u.uid);
                  if (((quickSummary == null ? void 0 : quickSummary.noteCount) || 0) > 0 && ((quickTaskSummary == null ? void 0 : quickTaskSummary.taskCount) || 0) > 0) {
                    console.log("[PROBE] Fast path found split note/task sources.");
                    return applyDiscoveredSources(quickSummary, quickTaskSummary, "fast-path");
                  }
                  if (quickSummary.exists && quickSummary.noteCount > 0 && quickSummary.taskCount > 0) {
                    hydrateResolvedPayload({ uid: u.uid, data: quickSummary.data, sourceCollection: bestCollection, markReady: true });
                    console.log("\u26A1 [PROBE] Fast path valid:", bestCollection);
                    return bestCollection;
                  }
                } catch (e) {
                }
                try {
                  console.log("\u{1F50D} [PROBE] High-Performance Parallel Discovery Start...");
                  const candidates = await findRichestCollections(u.uid, [bestCollection, lastTaskColl]);
                  if (candidates.length > 0) {
                    const richest = candidates[0];
                    const bestNoteSource = candidates.find((candidate) => candidate.noteCount > 0) || null;
                    const bestTaskSource = candidates.find((candidate) => candidate.taskCount > 0) || null;
                    const chosenNoteSource = bestNoteSource || richest;
                    const chosenTaskSource = bestTaskSource || chosenNoteSource;
                    if (((chosenNoteSource == null ? void 0 : chosenNoteSource.noteCount) || 0) > 0 || ((chosenTaskSource == null ? void 0 : chosenTaskSource.taskCount) || 0) > 0) {
                      console.log(`[PROBE] Best sources -> notes: '${chosenNoteSource == null ? void 0 : chosenNoteSource.coll}', quick tasks: '${chosenTaskSource == null ? void 0 : chosenTaskSource.coll}'`);
                      return applyDiscoveredSources(chosenNoteSource, chosenTaskSource, "discovery");
                    }
                    const splitSources = Array.from(new Map(
                      [richest, bestNoteSource, bestTaskSource].filter(Boolean).map((candidate) => [candidate.coll, candidate])
                    ).values());
                    if (splitSources.length > 1 && (bestNoteSource && bestNoteSource.coll !== richest.coll || bestTaskSource && bestTaskSource.coll !== richest.coll)) {
                      console.log(`[\u{1F9E9} PROBE] Split data detected. Notes source: '${bestNoteSource == null ? void 0 : bestNoteSource.coll}', quick-task source: '${bestTaskSource == null ? void 0 : bestTaskSource.coll}'. Consolidating...`);
                      const consolidated = await consolidateCollections(u.uid, splitSources, [bestCollection, lastColl, richest.coll]);
                      if (consolidated == null ? void 0 : consolidated.coll) {
                        hydrateResolvedPayload({ uid: u.uid, data: consolidated.payload, sourceCollection: consolidated.coll, markReady: true });
                        console.log(`\u2705 [PROBE] Consolidated split data into '${consolidated.coll}'.`);
                        return consolidated.coll;
                      }
                    }
                    hydrateResolvedPayload({ uid: u.uid, data: richest.data, sourceCollection: richest.coll, markReady: true });
                    console.log(`\u{1F48E} [PROBE] RACING WINNER: '${richest.coll}' (${richest.noteCount} notes, ${richest.taskCount} quick tasks)`);
                    setActiveCollection(richest.coll);
                    localStorage.setItem("faiora_active_collection", richest.coll);
                    try {
                      await db.collection(richest.coll).doc(u.uid).set({ _lastSync: Date.now() }, { merge: true });
                      return richest.coll;
                    } catch (e) {
                      console.warn(`\u{1F691} [PROBE] '${richest.coll}' is Read-Only. Splitting to writable home...`);
                      for (const coll of discoveryCollections) {
                        if (coll === richest.coll) continue;
                        try {
                          await db.collection(coll).doc(u.uid).set(richest.data, { merge: true });
                          showToast2("Data secured & permissions fixed!");
                          return coll;
                        } catch (e2) {
                        }
                      }
                      return richest.coll;
                    }
                  }
                } catch (err) {
                  console.warn("Full probe failed:", err);
                }
                return bestCollection;
              };
              const found = await runProbe();
              const result = found || bestCollection;
              if (result !== activeCollectionRef.current) {
                console.log(`\u{1F4CD} [PROBE] Redirecting to found collection: '${result}'`);
                setActiveCollection(result);
                localStorage.setItem("faiora_active_collection", result);
                db.collection("faiora_metadata").doc(u.uid).set({
                  activeCollection: result,
                  electedAt: Date.now(),
                  electedBy: isAndroidNative() ? "APK" : "Web"
                }, { merge: true }).catch((e) => console.warn("Failed to broadcast master collection:", e));
              }
              return result;
            } catch (err) {
              console.warn("Collection probe failed:", (err == null ? void 0 : err.message) || err);
              return bestCollection;
            } finally {
              coldBootNeedsUnifiedHydrationRef.current = false;
              setIsProbing(false);
              if (u) setIsFirstSyncDone(true);
            }
          };
          tryProbe().catch((probeErr) => {
            console.warn("Primary collection discovery failed:", (probeErr == null ? void 0 : probeErr.message) || probeErr);
          });
          localStorage.setItem("faiora_logged_in", "true");
          window.faiora_switch_coll = (name) => {
            setActiveCollection(name);
            setQuickTasksCollection(name);
            localStorage.setItem("faiora_active_collection", name);
            localStorage.setItem("faiora_quick_tasks_collection", name);
            console.log(`\u{1F680} Switched active collection to: ${name}. Re-syncing...`);
          };
          window.faiora_deep_scan = async () => {
            var _a2, _b2;
            console.log("\u{1F575}\uFE0F [DEEP SCAN] Starting fast parallel recovery scan...");
            const candidates = await findRichestCollections(u.uid, [activeCollectionRef.current, quickTasksCollectionRef.current]);
            if (!candidates.length) {
              console.log("\u{1F3C1} [DEEP SCAN] No richer collection found.");
              return null;
            }
            const richest = candidates[0];
            const bestNoteSource = candidates.find((candidate) => candidate.noteCount > 0) || null;
            const bestTaskSource = candidates.find((candidate) => candidate.taskCount > 0) || null;
            const chosenNoteSource = bestNoteSource || richest;
            const chosenTaskSource = bestTaskSource || chosenNoteSource;
            if (((chosenNoteSource == null ? void 0 : chosenNoteSource.noteCount) || 0) > 0 || ((chosenTaskSource == null ? void 0 : chosenTaskSource.taskCount) || 0) > 0) {
              console.log(`[DEEP SCAN] Best sources -> notes: '${chosenNoteSource == null ? void 0 : chosenNoteSource.coll}', quick tasks: '${chosenTaskSource == null ? void 0 : chosenTaskSource.coll}'`);
              return applySharedSources(chosenNoteSource, chosenTaskSource, "deep-scan");
            }
            const splitSources = Array.from(new Map(
              [richest, bestNoteSource, bestTaskSource].filter(Boolean).map((candidate) => [candidate.coll, candidate])
            ).values());
            let recoveredCollection = richest.coll;
            let recoveredFieldCount = richest.noteCount + richest.taskCount;
            if (splitSources.length > 1 && (bestNoteSource && bestNoteSource.coll !== richest.coll || bestTaskSource && bestTaskSource.coll !== richest.coll)) {
              const consolidated = await consolidateCollections(u.uid, splitSources, [activeCollection2, richest.coll]);
              if (consolidated == null ? void 0 : consolidated.coll) {
                hydrateResolvedPayload({ uid: u.uid, data: consolidated.payload, sourceCollection: consolidated.coll, markReady: true });
                recoveredCollection = consolidated.coll;
                recoveredFieldCount = Object.keys(((_a2 = consolidated.payload) == null ? void 0 : _a2.notes) || {}).length + Object.keys(((_b2 = consolidated.payload) == null ? void 0 : _b2.quickTasks) || {}).length;
                console.log(`\u{1F9E9} [DEEP SCAN] Consolidated split recovery data into '${recoveredCollection}'.`);
              }
            }
            if (recoveredCollection === richest.coll) {
              hydrateResolvedPayload({ uid: u.uid, data: richest.data, sourceCollection: richest.coll, markReady: true });
            }
            console.log(`\u{1F680} [RECOVERY] Switching to recovered source: ${recoveredCollection}`);
            setActiveCollection(recoveredCollection);
            localStorage.setItem("faiora_active_collection", recoveredCollection);
            setCloudFieldsCount(recoveredFieldCount);
            db.collection("faiora_metadata").doc(u.uid).set({
              activeCollection: recoveredCollection,
              electedAt: Date.now(),
              electedBy: "deep-scan"
            }, { merge: true }).catch(() => {
            });
            console.log("\u{1F3C1} [DEEP SCAN] Scan complete.");
            return recoveredCollection;
          };
          window.faiora_seed_samples = async () => {
            console.log("\u{1F331} [SEED] Planting sample data for a real-app feel...");
            const sampleNotes = {
              "note_seed_1": {
                id: "note_seed_1",
                title: "\u{1F680} Project Faiora",
                content: "<div>Building a powerful productivity suite with React and Firestore. Focus on <b>premium design</b> and <b>fluid UI</b>.</div>",
                noteIcon: "rocket_launch",
                noteTheme: "warm4",
                labels: ["PRIORITY"],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              },
              "note_seed_2": {
                id: "note_seed_2",
                title: "\u{1F6D2} Shopping List",
                content: "<div><ul><li>Coffee beans (Medium Roast)</li><li>Oat milk</li><li>Avocados</li><li>Sourdough bread</li></ul></div>",
                noteIcon: "shopping_cart",
                noteTheme: "cool1",
                labels: ["PERSONAL"],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              },
              "note_seed_3": {
                id: "note_seed_3",
                title: "\u{1F4A1} Morning Routine",
                content: "<div>1. Meditation (10m)<br>2. Journaling<br>3. High-intensity workout<br>4. Cold shower</div>",
                noteIcon: "wb_sunny",
                noteTheme: "warm1",
                labels: ["ROUTINE"],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              }
            };
            const sampleTasks = {
              "task_seed_1": {
                id: "task_seed_1",
                text: "Finalize Trash System UI",
                completed: false,
                priority: "high",
                date: (/* @__PURE__ */ new Date()).toISOString(),
                createdAt: Date.now()
              },
              "task_seed_2": {
                id: "task_seed_2",
                text: "Sync changes to Android build",
                completed: true,
                priority: "medium",
                date: (/* @__PURE__ */ new Date()).toISOString(),
                createdAt: Date.now()
              },
              "task_seed_3": {
                id: "task_seed_3",
                text: "Plan feature roadmap v1.2",
                completed: false,
                priority: "low",
                date: new Date(Date.now() + 864e5).toISOString(),
                createdAt: Date.now()
              }
            };
            try {
              await db.collection(activeCollection2).doc(u.uid).set({
                notes: sampleNotes,
                quickTasks: sampleTasks
              }, { merge: true });
              console.log("\u2728 [SUCCESS] Account seeded with sample data! Please refresh to see changes.");
            } catch (e) {
              console.error("\u274C [ERROR] Seeding failed:", e.message);
            }
          };
        }, 0);
      } else {
        setIsProbing(false);
        console.log("\u{1F464} [AUTH] No user, skipping collection discovery.");
      }
    });
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        setTaskSnackbars((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.onUndo) last.onUndo();
          return prev.slice(0, -1);
        });
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    const authTimeout = setTimeout(() => {
      setIsAuthChecked(true);
    }, 5e3);
    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);
  useEffect(() => {
    const safety = setTimeout(() => setIsTransitioning(false), 1800);
    const forceReady = setTimeout(() => {
      if (user && !isFirstSyncDone) {
        const hasRecoveredNotes = notesRef.current.length > 0;
        const hasRecoveredTasks = quickTasksRef.current.length > 0;
        if (coldBootNeedsUnifiedHydrationRef.current && !hasRecoveredNotes && !hasRecoveredTasks) {
          console.log("\u23F3 [SYNC] Force-ready skipped because discovery is still unresolved.");
          return;
        }
        if (coldBootNeedsUnifiedHydrationRef.current && hasRecoveredTasks && !hasRecoveredNotes) {
          console.log("\u23F3 [SYNC] Force-ready skipped because notes are still being recovered.");
          return;
        }
        console.log("\u{1F6A8} [SYNC] Force Ready Fallback triggered: Hiding skeletons due to slow Firestore response.");
        setIsFirstSyncDone(true);
      }
    }, 2500);
    return () => {
      clearTimeout(safety);
      clearTimeout(forceReady);
    };
  }, [user, isFirstSyncDone]);
  useEffect(() => {
    if (isProbing || !isFirstSyncDone || !user) return;
    const notesEmpty = notes2.length === 0;
    const tasksExist = quickTasks2.length > 0;
    const canRetry = Date.now() - lastDeepScan > 6e4;
    if (notesEmpty && tasksExist && canRetry) {
      setLastDeepScan(Date.now());
      console.log("\u{1F575}\uFE0F [DEEP SEARCH] Notes verified missing. Triggering recovery fallback...");
      if (window.faiora_deep_scan) {
        window.faiora_deep_scan();
        if (showToast2) showToast2("Still finding your notes... performing a deeper scan.");
      }
    }
  }, [isFirstSyncDone, isProbing, notes2.length, quickTasks2.length, user]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimerDone(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const enforceSpeed = () => {
      if (videoRef.current) {
        videoRef.current.playbackRate = 1;
      }
    };
    enforceSpeed();
    if (videoRef.current) {
      videoRef.current.addEventListener("ratechange", enforceSpeed);
      videoRef.current.addEventListener("playing", enforceSpeed);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("ratechange", enforceSpeed);
        videoRef.current.removeEventListener("playing", enforceSpeed);
      }
    };
  }, [user, isTimerDone, isAuthChecked]);
  const handleLoadingComplete = useCallback(() => {
    setIsTimerDone(true);
  }, []);
  useEffect(() => {
    if (!isAuthChecked) return;
    const hasLocalData = () => {
      if (!user) return false;
      const lsNotes = localStorage.getItem("faiora_notes_" + user.uid);
      return lsNotes && lsNotes !== "[]" && lsNotes !== "null";
    };
    const shouldReveal = !user || !isProbing && isFirstSyncDone || hasLocalData();
    if (shouldReveal) {
      window.dispatchEvent(new CustomEvent("faiora-app-ready"));
    }
  }, [isAuthChecked, user, isProbing, isFirstSyncDone]);
  const hash = window.location.hash;
  if (hash.startsWith("#/share/")) {
    const token = hash.replace("#/share/", "");
    window.location.href = `share_note.html#/${token}`;
    return null;
  }
  if (!user) {
    return /* @__PURE__ */ React.createElement(LoginModal, null);
  }
  return /* @__PURE__ */ React.createElement(HashRouter, null, /* @__PURE__ */ React.createElement(FaioraErrorBoundary, null, videoSrc && (settingsData2 == null ? void 0 : settingsData2.bgVideoEnabled) !== false && /* @__PURE__ */ React.createElement(
    "video",
    {
      ref: videoRef,
      className: `fire-bg-video ${isVideoReady ? "is-ready" : ""}`,
      autoPlay: true,
      loop: true,
      muted: true,
      playsInline: true,
      preload: "none",
      loading: "lazy",
      onPlaying: () => setIsVideoReady(true),
      onError: () => setIsVideoReady(false),
      src: videoSrc
    }
  ), /* @__PURE__ */ React.createElement("div", { className: `app-content-fadein ${isTransitioning ? "page-transitioning" : ""}` }, /* @__PURE__ */ React.createElement(
    TransitionManager,
    {
      onTransitionStart: () => setIsTransitioning(true),
      onTransitionEnd: () => setIsTransitioning(false)
    },
    /* @__PURE__ */ React.createElement(Route, { path: "/", element: /* @__PURE__ */ React.createElement(DashboardPage, { user, notes: notes2, quickTasks: quickTasks2, alarms: alarms2, onOpenCreator: handleOpenCreator, onEditNote: handleRequestEditNote, onReorderPriorityNote: handleReorderPriorityNote, onToggleQuickTask: handleToggleQuickTask, onAddQuickTaskClick: (cat) => {
      handleOpenQuickTaskModal(null, typeof cat === "string" ? cat : null);
    }, onDeleteQuickTask: handleDeleteQuickTask, onUpdateQuickTask: handleUpdateQuickTask, onUpdateQuickTasks: handleUpdateQuickTasks, onEditQuickTask: handleOpenQuickTaskEditor, editingQuickTask, setEditingQuickTask, isQuickTaskModalOpen, setIsQuickTaskModalOpen, onRemoveReminder: handleRemoveReminder, isProbing, isFirstSyncDone, pomodoroTime, isPomodoroActive, setIsPomodoroActive, showToast: showToast2, onUpdateNote: handleUpdateNoteLocal, activeCollection: activeCollection2 }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/notes", element: /* @__PURE__ */ React.createElement(NotesPage, { user, notes: notes2, onOpenCreator: handleOpenCreator, onEditNote: handleRequestEditNote, noteSections, onAddSection: handleAddSection, onDeleteSection: handleDeleteSection, onMoveNote: handleMoveNoteToSection, onReorderNote: handleReorderNote, onRemoveReminder: handleRemoveReminder, onBulkUpdate: handleBulkUpdate, onBulkDelete: handleBulkDelete, isProbing, isFirstSyncDone, pomodoroTime, isPomodoroActive }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/quick-tasks", element: /* @__PURE__ */ React.createElement(QuickTasksPage, { user, quickTasks: quickTasks2, onOpenCreator: handleOpenCreator, onToggleQuickTask: handleToggleQuickTask, onAddQuickTaskClick: () => {
      handleOpenQuickTaskModal();
    }, onDeleteQuickTask: handleDeleteQuickTask, onUpdateQuickTasks: handleUpdateQuickTasks, onUpdateQuickTask: handleUpdateQuickTask, onEditQuickTask: handleOpenQuickTaskEditor, isProbing, isFirstSyncDone, pomodoroTime, isPomodoroActive, showToast: showToast2, notes: notes2, onUpdateNote: handleUpdateNoteLocal, activeCollection: activeCollection2 }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/calendar", element: /* @__PURE__ */ React.createElement(
      CalendarPage,
      {
        user,
        notes: notes2,
        quickTasks: quickTasks2,
        onOpenCreator: handleOpenCreator,
        onEditNote: handleRequestEditNote,
        onToggleQuickTask: handleToggleQuickTask,
        onEditQuickTask: handleOpenQuickTaskEditor,
        onAddQuickTask: handleOpenQuickTaskModal,
        pomodoroTime,
        isPomodoroActive
      }
    ) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/stats", element: /* @__PURE__ */ React.createElement(StatsPage, { user, onOpenCreator: handleOpenCreator, quickTasks: quickTasks2, pomodoroTime, isPomodoroActive }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/streak", element: /* @__PURE__ */ React.createElement(StreakPage, { user, onOpenCreator: handleOpenCreator, gamification, pomodoroTime, isPomodoroActive }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/alarms", element: /* @__PURE__ */ React.createElement(ClockPage, { user, onOpenCreator: handleOpenCreator, alarms: alarms2, onAddAlarm: handleAddAlarm, onToggleAlarm: handleToggleAlarm, onDeleteAlarm: handleDeleteAlarm, pomodoroTime, setPomodoroTime, isPomodoroActive, setIsPomodoroActive, pomodoroSessions, alarmOverlayPermission, onRequestAlarmOverlayPermission: requestAlarmOverlayPermission, onRefreshAlarmOverlayPermission: refreshAlarmOverlayPermission, hasNativeAlarmBridge: FaioraNotifications.hasNativeAlarmBridge ? FaioraNotifications.hasNativeAlarmBridge() : false, alarmsOnly: true }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/clock", element: /* @__PURE__ */ React.createElement(Navigate, { to: "/alarms", replace: true }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/profile", element: /* @__PURE__ */ React.createElement(EnhancedProfilePage, { user, onOpenCreator: handleOpenCreator, profileData: profileData2, onSaveProfile: handleSaveProfile, quickTasks: quickTasks2, gamification, pomodoroTime, setPomodoroTime, isPomodoroActive, setIsPomodoroActive, pomodoroSessions, activeCollection: activeCollection2, cloudFieldsCount, showToast: showToast2, isSyncHealthy: isSyncHealthy2 }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/settings", element: /* @__PURE__ */ React.createElement(SettingsPage, { user, onOpenCreator: handleOpenCreator, settingsData: settingsData2, onSaveSettings: handleSaveSettings, pomodoroTime, isPomodoroActive, showToast: showToast2, notes: notes2, quickTasks: quickTasks2, alarms: alarms2, profileData: profileData2, activeCollection: activeCollection2 }) }),
    /* @__PURE__ */ React.createElement(Route, { path: "/trash", element: /* @__PURE__ */ React.createElement(TrashPage, { user, onOpenCreator: handleOpenCreator, trashNotes, trashQuickTasks, onRestoreNote: handleRestoreNote, onRestoreQuickTask: handleRestoreQuickTask, onPermanentDelete: handlePermanentDelete, onPermanentDeleteQuickTask: handlePermanentDeleteQuickTask, onEmptyTrash: handleEmptyTrash, onEmptyQuickTaskTrash: handleEmptyQuickTaskTrash, pomodoroTime, isPomodoroActive }) })
  )), isCreatorOpen && /* @__PURE__ */ React.createElement(TaskCreator, { onClose: handleCloseCreator, user, editingNote, activeCollection: activeCollection2, onUpdateNote: handleUpdateNoteLocal, onDeleteNote: handleDeleteNoteLocal, onSaveVersion: handleSaveVersion, showToast: showToast2, notes: notes2, quickTasks: quickTasks2, onToggleLock: handleRemoveLock, onOpenLockSet: handleOpenSetLock, onToggleQuickTask: handleToggleQuickTask, onUpdateQuickTask: handleUpdateQuickTask }), isSetLockModalOpen && /* @__PURE__ */ React.createElement(SetLockModal, { onClose: handleCloseSetLock, showToast: showToast2, onSet: handleSetLock }), unlockingNote && /* @__PURE__ */ React.createElement(
    UnlockModal,
    {
      hint: unlockingNote.pinHint,
      showToast: showToast2,
      onClose: handleCloseUnlockModal,
      onUnlock: async (p) => {
        const hash2 = await hashPIN(p);
        if (hash2 === unlockingNote.pinHash) {
          const note = unlockingNote;
          setTimeout(() => handleEditNote(note), 220);
          return true;
        }
        return false;
      }
    }
  ), isQuickTaskModalOpen && /* @__PURE__ */ React.createElement(
    QuickTaskModal,
    {
      prefillDate,
      prefillCategory,
      onClose: handleCloseQuickTaskModal,
      onAdd: handleAddQuickTask,
      showToast: showToast2,
      quickTasks: quickTasks2,
      settingsData: settingsData2
    }
  ), editingQuickTask && /* @__PURE__ */ React.createElement(
    QuickTaskModal,
    {
      initialData: editingQuickTask,
      onClose: handleCloseQuickTaskEditor,
      onDelete: handleDeleteQuickTask,
      showToast: showToast2,
      quickTasks: quickTasks2,
      settingsData: settingsData2,
      onAdd: (text, date, time, categories, progress, progressHistory, reminders, pinned) => {
        handleUpdateQuickTask(editingQuickTask.id, text, date, time, categories, progress, progressHistory, reminders, pinned);
      }
    }
  ), activeAlarmAlert && typeof document !== "undefined" && ReactDOM.createPortal(
    /* @__PURE__ */ React.createElement(
      SamsungAlarmOverlay,
      {
        alarm: activeAlarmAlert,
        onDismiss: () => dismissAlarmAlert(activeAlarmAlert.alarmId)
      }
    ),
    document.body
  ), showPermissionModal && typeof document !== "undefined" && ReactDOM.createPortal(
    /* @__PURE__ */ React.createElement(
      PermissionModal,
      {
        onGrant: () => {
          requestAlarmOverlayPermission();
          setShowPermissionModal(false);
        },
        onSkip: () => {
          localStorage.setItem("faiora_overlay_prompt_skipped", "true");
          setShowPermissionModal(false);
        }
      }
    ),
    document.body
  ), typeof document !== "undefined" && ReactDOM.createPortal(
    /* @__PURE__ */ React.createElement("div", { className: "toast-container", style: {
      position: "fixed",
      bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: "10px",
      pointerEvents: "none",
      width: "calc(100% - 32px)",
      maxWidth: "480px",
      boxSizing: "border-box"
    } }, toasts.slice(-2).map((toast) => /* @__PURE__ */ React.createElement(
      ToastPill,
      {
        key: toast.id,
        toast,
        onDismiss: (id) => setToasts((prev) => prev.filter((t) => t.id !== id))
      }
    ))),
    document.body
  ), /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: "calc(96px + env(safe-area-inset-bottom,0px))", left: "50%", transform: "translateX(-50%)", zIndex: 99998, display: "flex", flexDirection: "column-reverse", gap: "12px", pointerEvents: "none", width: "calc(100% - 32px)", maxWidth: "480px", boxSizing: "border-box" } }, /* @__PURE__ */ React.createElement("style", null, `
                            /* (2026-07-13) Reduced inner vertical padding. Prev: 0.85rem */
                            .task-snackbar {
                                background: rgba(15, 23, 42, 0.9);
                                backdrop-filter: blur(12px);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 1.25rem;
                                padding: 0.65rem 1.25rem;
                                display: flex;
                                alignItems: center;
                                justify-content: space-between;
                                color: #f8fafc;
                                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
                                pointer-events: auto;
                                animation: snackbar-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                            }
                            @keyframes snackbar-in {
                                from { opacity: 0; transform: translateY(20px) scale(0.9); }
                                to { opacity: 1; transform: translateY(0) scale(1); }
                            }
                            @keyframes alarm-ripple {
                                0% { transform: scale(1); opacity: 0.5; }
                                100% { transform: scale(2.2); opacity: 0; }
                            }
                            @keyframes slide-up {
                                from { transform: translateY(100%); opacity: 0; }
                                to { transform: translateY(0); opacity: 1; }
                            }
                            .alarm-ripple-ring {
                                position: absolute;
                                inset: -20px;
                                border: 2px solid rgba(249, 115, 22, 0.4);
                                border-radius: 9999px;
                                animation: alarm-ripple 2s infinite;
                            }
                            .samsung-swipe-track {
                                position: relative;
                                width: 280px;
                                height: 80px;
                                background: rgba(255, 255, 255, 0.05);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 9999px;
                                margin: 40px auto 0;
                                overflow: hidden;
                                display: flex;
                                items-center: center;
                                padding: 6px;
                            }
                            .permission-sheet-overlay {
                                position: fixed;
                                inset: 0;
                                z-index: 2000;
                                background: rgba(0, 0, 0, 0.6);
                                backdrop-blur: 4px;
                                animation: fadeIn 0.3s ease-out;
                            }
                            .permission-sheet {
                                position: fixed;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                z-index: 2001;
                                background: #0c0a09;
                                border-top: 1px solid rgba(255, 255, 255, 0.1);
                                border-radius: 32px 32px 0 0;
                                padding: 24px 20px 24px;
                                animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                                box-shadow: 0 -20px 40px rgba(0,0,0,0.4);
                            }
                        `), taskSnackbars.slice(-1).map((snack) => /* @__PURE__ */ React.createElement(
    TaskSnackbarItem,
    {
      key: snack.id,
      snack,
      onDismiss: (id) => setTaskSnackbars((prev) => prev.filter((s) => s.id !== id))
    }
  )))));
};
const container = document.getElementById("root");
const root = createRoot(container);
root.render(/* @__PURE__ */ React.createElement(App, null));
