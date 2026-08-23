import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
    auth, db, firebase, signInWithGoogle, 
    formatTaskText, getAlarmScheduleDate, getWaitTimeText, formatTime,
    isAndroidNative, groupQuickTasksBySchedule
} from './core/config';
import FaioraNotifications from './services/notifications';

// Pages
import DashboardPage from './pages/Dashboard';
import NotesPage from './pages/Notes';
import CalendarPage from './pages/Calendar';
import QuickTasksPage from './pages/QuickTasks';
import StatsPage from './pages/Stats';
import StreakPage from './pages/Streak';
import { ClockPage, SamsungAlarmOverlay } from './pages/Alarms';

// Components
import { FaioraErrorBoundary, LoginModal, ConfirmationModal, PasswordSetupPrompt } from './components/Common';
import { ResponsiveNav, TransitionManager } from './components/Navigation';
import { TaskCreator, QuickTaskModal } from './components/Modals';
import { SkeletonApp } from './components/Skeletons';

// LABEL: APP-SHELL — Short Summary: Root component managing authentication, Firestore synchronization, and global application state
const App = () => {
    const [user, setUser] = useState(null);
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [isProbing, setIsProbing] = useState(true);
    const [isFirstSyncDone, setIsFirstSyncDone] = useState(false);
    const [activeCollection, setActiveCollection] = useState(() => localStorage.getItem('faiora_active_collection') || 'tasks');
    const [quickTasksCollection, setQuickTasksCollection] = useState(() => localStorage.getItem('faiora_quick_tasks_collection') || localStorage.getItem('faiora_active_collection') || 'tasks');
    
    // Data State
    const [notes, setNotes] = useState([]);
    const [trashNotes, setTrashNotes] = useState([]);
    const [quickTasks, setQuickTasks] = useState([]);
    const [trashQuickTasks, setTrashQuickTasks] = useState([]);
    const [alarms, setAlarms] = useState([]);
    const [noteSections, setNoteSections] = useState(() => {
        try { return JSON.parse(localStorage.getItem('faiora_sections') || '[]'); } catch(e) { return []; }
    });
    const [profileData, setProfileData] = useState({});
    const [settingsData, setSettingsData] = useState({});
    const [gamification, setGamification] = useState({ currentStreak: 0, longestStreak: 0, lastLoginDate: null, rewards: [] });
    
    // UI State
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
    const [editingQuickTask, setEditingQuickTask] = useState(null);
    const [prefillDate, setPrefillDate] = useState(null);
    const [activeAlarmAlert, setActiveAlarmAlert] = useState(null);
    const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
    const [isPomodoroActive, setIsPomodoroActive] = useState(false);
    const [pomodoroSessions, setPomodoroSessions] = useState(0);
    const [toasts, setToasts] = useState([]);

    // Refs for sync stability
    const notesRef = useRef([]);
    const quickTasksRef = useRef([]);
    const alarmsRef = useRef([]);
    const trashNotesRef = useRef([]);
    const trashQuickTasksRef = useRef([]);
    const activeCollectionRef = useRef(activeCollection);
    const quickTasksCollectionRef = useRef(quickTasksCollection);
    const isProbingRef = useRef(isProbing);
    const alarmTimersRef = useRef(new Map());
    const liveSyncUnsubscribeRef = useRef(null);

    useEffect(() => { notesRef.current = notes; }, [notes]);
    useEffect(() => { quickTasksRef.current = quickTasks; }, [quickTasks]);
    useEffect(() => { alarmsRef.current = alarms; }, [alarms]);
    useEffect(() => { trashNotesRef.current = trashNotes; }, [trashNotes]);
    useEffect(() => { trashQuickTasksRef.current = trashQuickTasks; }, [trashQuickTasks]);
    useEffect(() => { activeCollectionRef.current = activeCollection; }, [activeCollection]);
    useEffect(() => { quickTasksCollectionRef.current = quickTasksCollection; }, [quickTasksCollection]);
    useEffect(() => { isProbingRef.current = isProbing; }, [isProbing]);

    const showToast = useCallback((message) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    }, []);

    // ------------------------------------------------------------------
    // FIRESTORE SYNC & DISCOVERY
    // ------------------------------------------------------------------
    
    const sortNotes = useCallback((list = []) => {
        return [...list].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const sortA = a.sortOrder || 0;
            const sortB = b.sortOrder || 0;
            if (sortA !== sortB) return sortA - sortB;
            const timeA = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
            const timeB = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
            return timeB - timeA;
        });
    }, []);

    const hydrateFromDoc = useCallback((data, uid, coll) => {
        if (!data) return;
        const fetchedNotes = sortNotes(Object.entries(data.notes || {}).map(([id, n]) => ({ ...n, id: n.id || id })));
        const fetchedTrash = Object.entries(data.trash || {}).map(([id, n]) => ({ ...n, id: n.id || id }));
        const fetchedQuickTasks = (Array.isArray(data.quickTasks) ? data.quickTasks : Object.values(data.quickTasks || {})).map(t => ({ ...t, id: String(t.id) }));
        const fetchedQTTrash = (Array.isArray(data.quickTaskTrash) ? data.quickTaskTrash : Object.values(data.quickTaskTrash || {})).map(t => ({ ...t, id: String(t.id) }));
        const fetchedAlarms = Array.isArray(data.alarms) ? data.alarms : Object.values(data.alarms || {});
        
        setNotes(fetchedNotes);
        setTrashNotes(fetchedTrash);
        setQuickTasks(fetchedQuickTasks);
        setTrashQuickTasks(fetchedQTTrash);
        setAlarms(fetchedAlarms);
        setNoteSections(data.noteSections || []);
        setProfileData(data.profile || {});
        setSettingsData(data.settings || {});
        setGamification(data.gamification || { currentStreak: 0, longestStreak: 0, lastLoginDate: null, rewards: [] });
        
        localStorage.setItem('faiora_notes_' + uid, JSON.stringify(fetchedNotes));
        localStorage.setItem('faiora_quick_tasks_' + uid, JSON.stringify(fetchedQuickTasks));
        localStorage.setItem('faiora_alarms_' + uid, JSON.stringify(fetchedAlarms));
        
        FaioraNotifications.rescheduleAll(fetchedQuickTasks);
        rescheduleAlarms(fetchedAlarms);
        setIsFirstSyncDone(true);
        console.log(`☁️ [SYNC] Hydrated from ${coll}. Notes: ${fetchedNotes.length}, Tasks: ${fetchedQuickTasks.length}`);
    }, [sortNotes]);

    const discoverCollection = useCallback(async (uid) => {
        const collections = ['tasks', 'notes', 'userdata', 'faiora_data', 'data'];
        const lastColl = localStorage.getItem('faiora_active_collection') || 'tasks';
        
        try {
            // Check metadata first
            const meta = await db.collection('faiora_metadata').doc(uid).get({ source: 'server' });
            if (meta.exists && meta.data().activeCollection) {
                const coll = meta.data().activeCollection;
                const doc = await db.collection(coll).doc(uid).get({ source: 'server' });
                if (doc.exists) {
                    setActiveCollection(coll);
                    localStorage.setItem('faiora_active_collection', coll);
                    hydrateFromDoc(doc.data(), uid, coll);
                    return;
                }
            }
            
            // Discovery race
            const results = await Promise.all(collections.map(async (c) => {
                const d = await db.collection(c).doc(uid).get({ source: 'server' });
                return { coll: c, exists: d.exists, data: d.data(), score: Object.keys(d.data()?.notes || {}).length };
            }));
            
            const best = results.filter(r => r.exists).sort((a, b) => b.score - a.score)[0] || { coll: lastColl };
            setActiveCollection(best.coll);
            localStorage.setItem('faiora_active_collection', best.coll);
            if (best.data) hydrateFromDoc(best.data, uid, best.coll);
        } catch (e) {
            console.warn("Probe failed", e);
        } finally {
            setIsProbing(false);
            setIsFirstSyncDone(true);
        }
    }, [hydrateFromDoc]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(u => {
            setUser(u);
            setIsAuthChecked(true);
            if (u) {
                setIsProbing(true);
                db.collection('users_public').doc(u.uid).set({
                    uid: u.uid,
                    email: u.email || '',
                    displayName: u.displayName || '',
                    photoURL: u.photoURL || '',
                    providerIds: (u.providerData || []).map(provider => provider.providerId),
                    lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(error => console.warn('User public mirror failed', error?.message || error));
                db.collection('faiora_metadata').doc(u.uid).set({
                    uid: u.uid,
                    email: u.email || '',
                    displayName: u.displayName || '',
                    photoURL: u.photoURL || '',
                    providerIds: (u.providerData || []).map(provider => provider.providerId),
                    lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).catch(error => console.warn('User metadata mirror failed', error?.message || error));
                discoverCollection(u.uid);
                localStorage.setItem('faiora_logged_in', 'true');
            } else {
                setIsProbing(false);
                localStorage.removeItem('faiora_logged_in');
            }
        });
        return () => unsubscribe();
    }, [discoverCollection]);

    useEffect(() => {
        if (!user?.uid || !activeCollection) return;

        if (liveSyncUnsubscribeRef.current) {
            liveSyncUnsubscribeRef.current();
            liveSyncUnsubscribeRef.current = null;
        }

        const unsubscribe = db.collection(activeCollection).doc(user.uid).onSnapshot(doc => {
            if (!doc.exists) return;
            hydrateFromDoc(doc.data(), user.uid, activeCollection);
        }, error => {
            console.warn('Live sync listener failed', error?.message || error);
        });

        liveSyncUnsubscribeRef.current = unsubscribe;
        return () => {
            unsubscribe();
            if (liveSyncUnsubscribeRef.current === unsubscribe) {
                liveSyncUnsubscribeRef.current = null;
            }
        };
    }, [user?.uid, activeCollection, hydrateFromDoc]);

    // ------------------------------------------------------------------
    // ALARMS LOGIC
    // ------------------------------------------------------------------

    const clearAlarmTimers = useCallback((id = null) => {
        if (id) {
            const ts = alarmTimersRef.current.get(id) || [];
            ts.forEach(clearTimeout);
            alarmTimersRef.current.delete(id);
            FaioraNotifications.cancelAlarmNotification(id);
        } else {
            alarmTimersRef.current.forEach(ts => ts.forEach(clearTimeout));
            alarmTimersRef.current.clear();
            FaioraNotifications.rescheduleAll([]); // clears all
        }
    }, []);

    const scheduleAlarm = useCallback((alarm) => {
        if (!alarm || !alarm.enabled || !alarm.time) return;
        clearAlarmTimers(alarm.id);
        
        const target = getAlarmScheduleDate(alarm.time, alarm.days);
        if (!target) return;
        
        const delay = target.getTime() - Date.now();
        const tid = setTimeout(() => {
            setActiveAlarmAlert({
                alarmId: alarm.id,
                label: alarm.label || 'Alarm',
                time: alarm.time
            });
            
            // Re-schedule if repeating
            if (alarm.repeatDaily) scheduleAlarm(alarm);
            else handleToggleAlarm(alarm.id); // Disable once-off
        }, delay);
        
        alarmTimersRef.current.set(alarm.id, [tid]);
        FaioraNotifications.scheduleAlarmNotification(alarm);
    }, [clearAlarmTimers]);

    const rescheduleAlarms = useCallback((list) => {
        clearAlarmTimers();
        list.filter(a => a.enabled).forEach(scheduleAlarm);
    }, [clearAlarmTimers, scheduleAlarm]);

    const handleUpdateAlarms = useCallback((updated) => {
        setAlarms(updated);
        rescheduleAlarms(updated);
        if (user && !isProbing) {
            db.collection(activeCollection).doc(user.uid).set({ alarms: updated }, { merge: true });
        }
    }, [user, isProbing, activeCollection, rescheduleAlarms]);

    const handleAddAlarm = useCallback((payload) => {
        const isEdit = !!payload.id;
        let next;
        if (isEdit) {
            next = alarmsRef.current.map(a => a.id === payload.id ? { ...a, ...payload, enabled: true, updatedAt: Date.now() } : a);
        } else {
            const newAlarm = {
                id: 'alarm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                enabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                ...payload
            };
            next = [newAlarm, ...alarmsRef.current];
        }
        handleUpdateAlarms(next);
        showToast(isEdit ? "Alarm updated" : "Alarm added");
    }, [handleUpdateAlarms, showToast]);

    const handleToggleAlarm = useCallback((id) => {
        const next = alarmsRef.current.map(a => a.id === id ? { ...a, enabled: !a.enabled, updatedAt: Date.now() } : a);
        handleUpdateAlarms(next);
    }, [handleUpdateAlarms]);

    const handleDeleteAlarm = useCallback((id) => {
        const next = alarmsRef.current.filter(a => a.id !== id);
        handleUpdateAlarms(next);
        clearAlarmTimers(id);
        showToast("Alarm deleted");
    }, [handleUpdateAlarms, clearAlarmTimers, showToast]);

    // ------------------------------------------------------------------
    // QUICK TASKS LOGIC
    // ------------------------------------------------------------------

    const handleUpdateQuickTasks = useCallback((updated, nextTrash = trashQuickTasksRef.current) => {
        setQuickTasks(updated);
        setTrashQuickTasks(nextTrash);
        FaioraNotifications.rescheduleAll(updated);
        if (user && !isProbing) {
            db.collection(activeCollection).doc(user.uid).set({ quickTasks: updated, quickTaskTrash: nextTrash }, { merge: true });
        }
    }, [user, isProbing, activeCollection]);

    const handleAddQuickTask = useCallback((text, dueDate = '', dueTime = '') => {
        const lines = String(text).split('\n').filter(l => l.trim());
        const now = Date.now();
        const newTasks = lines.map((l, i) => ({
            id: 'qt_' + (now + i) + '_' + Math.random().toString(36).slice(2, 7),
            text: formatTaskText(l),
            dueDate, dueTime,
            completed: false,
            createdAt: now + i
        }));
        handleUpdateQuickTasks([...newTasks, ...quickTasksRef.current]);
    }, [handleUpdateQuickTasks]);

    const handleToggleQuickTask = useCallback((id) => {
        const idx = quickTasksRef.current.findIndex(t => t.id === id);
        if (idx === -1) return;
        const next = [...quickTasksRef.current];
        const task = { ...next[idx], completed: !next[idx].completed, completedAt: !next[idx].completed ? Date.now() : null };
        next[idx] = task;
        handleUpdateQuickTasks(next);
        if (task.completed) FaioraNotifications.playCheckSFX();
    }, [handleUpdateQuickTasks]);

    const handleDeleteQuickTask = useCallback((id) => {
        const task = quickTasksRef.current.find(t => t.id === id);
        if (!task) return;
        const next = quickTasksRef.current.filter(t => t.id !== id);
        const nextTrash = [{ ...task, deletedAt: new Date().toISOString() }, ...trashQuickTasksRef.current];
        handleUpdateQuickTasks(next, nextTrash);
        showToast("Task moved to trash");
    }, [handleUpdateQuickTasks, showToast]);

    // ------------------------------------------------------------------
    // NOTES LOGIC
    // ------------------------------------------------------------------

    const handleUpdateNotes = useCallback((updated, nextTrash = trashNotesRef.current) => {
        setNotes(updated);
        setTrashNotes(nextTrash);
        if (user && !isProbing) {
            const noteMap = {};
            updated.forEach(n => noteMap[n.id] = n);
            const trashMap = {};
            nextTrash.forEach(n => trashMap[n.id] = n);
            db.collection(activeCollection).doc(user.uid).set({ notes: noteMap, trash: trashMap }, { merge: true });
        }
    }, [user, isProbing, activeCollection]);

    const handleSaveNote = useCallback((note) => {
        const isEdit = !!editingNote;
        let next;
        if (isEdit) {
            next = notesRef.current.map(n => n.id === editingNote.id ? { ...n, ...note, updatedAt: Date.now() } : n);
        } else {
            const newNote = {
                id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                ...note
            };
            next = [newNote, ...notesRef.current];
        }
        handleUpdateNotes(sortNotes(next));
        setIsCreatorOpen(false);
        setEditingNote(null);
        showToast(isEdit ? "Note updated" : "Note created");
    }, [editingNote, handleUpdateNotes, sortNotes, showToast]);

    const handleDeleteNote = useCallback((id) => {
        const note = notesRef.current.find(n => n.id === id);
        if (!note) return;
        const next = notesRef.current.filter(n => n.id !== id);
        const nextTrash = [{ ...note, deletedAt: Date.now() }, ...trashNotesRef.current];
        handleUpdateNotes(next, nextTrash);
        showToast("Note moved to trash");
    }, [handleUpdateNotes, showToast]);

    // ------------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------------

    if (!isAuthChecked) return <SkeletonApp />;
    if (!user) return <LoginModal />;
    if (isProbing && !isFirstSyncDone) return <SkeletonApp />;

    return (
        <FaioraErrorBoundary>
            <HashRouter>
                <PasswordSetupPrompt user={user} onLinked={(updatedUser) => setUser(updatedUser)} />
                <div id="faiora_app_root" className="faiora-app-root h-[100dvh] overflow-hidden bg-slate-950 text-cream-light font-montserrat">
                    <TransitionManager>
                        <Route path="/" element={
                            <DashboardPage 
                                user={user} 
                                notes={notes} 
                                quickTasks={quickTasks} 
                                onOpenCreator={() => setIsCreatorOpen(true)}
                                onEditNote={(n) => { setEditingNote(n); setIsCreatorOpen(true); }}
                                onToggleQuickTask={handleToggleQuickTask}
                                pomodoroTime={pomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                            />
                        } />
                        <Route path="/notes" element={
                            <NotesPage 
                                user={user} 
                                notes={notes} 
                                onOpenCreator={() => setIsCreatorOpen(true)}
                                onEditNote={(n) => { setEditingNote(n); setIsCreatorOpen(true); }}
                                onDeleteNote={handleDeleteNote}
                                onUpdateNotes={(n) => handleUpdateNotes(sortNotes(n))}
                                pomodoroTime={pomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                            />
                        } />
                        <Route path="/calendar" element={
                            <CalendarPage 
                                user={user} 
                                notes={notes} 
                                quickTasks={quickTasks} 
                                onOpenCreator={() => setIsCreatorOpen(true)}
                                onAddQuickTask={handleOpenQuickTaskModal}
                                pomodoroTime={pomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                            />
                        } />
                        <Route path="/quick-tasks" element={
                            <QuickTasksPage 
                                user={user} 
                                quickTasks={quickTasks} 
                                onAddQuickTaskClick={() => setIsQuickTaskModalOpen(true)}
                                onToggleQuickTask={handleToggleQuickTask}
                                onDeleteQuickTask={handleDeleteQuickTask}
                                onEditQuickTask={(t) => { setEditingQuickTask(t); setIsQuickTaskModalOpen(true); }}
                                onClearCompletedQuickTasks={() => handleUpdateQuickTasks(quickTasksRef.current.filter(t => !t.completed))}
                                onOpenCreator={() => setIsCreatorOpen(true)}
                                pomodoroTime={pomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                            />
                        } />
                        <Route path="/alarms" element={
                            <ClockPage 
                                user={user} 
                                alarms={alarms} 
                                onAddAlarm={handleAddAlarm}
                                onToggleAlarm={handleToggleAlarm}
                                onDeleteAlarm={handleDeleteAlarm}
                                pomodoroTime={pomodoroTime}
                                setPomodoroTime={setPomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                                setIsPomodoroActive={setIsPomodoroActive}
                                pomodoroSessions={pomodoroSessions}
                                alarmsOnly={false}
                                onOpenCreator={() => setIsCreatorOpen(true)}
                            />
                        } />
                        <Route path="/stats" element={
                            <StatsPage 
                                user={user} 
                                notes={notes} 
                                quickTasks={quickTasks} 
                                onOpenCreator={() => setIsCreatorOpen(true)}
                                pomodoroTime={pomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                            />
                        } />
                        <Route path="/momentum" element={
                            <StreakPage 
                                user={user} 
                                onOpenCreator={() => setIsCreatorOpen(true)}
                                pomodoroTime={pomodoroTime}
                                isPomodoroActive={isPomodoroActive}
                            />
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </TransitionManager>
                    
                    {/* Modals */}
                    {isCreatorOpen && (
                        <TaskCreator 
                            editingNote={editingNote}
                            onAdd={handleSaveNote}
                            showToast={showToast}
                            onClose={() => { setIsCreatorOpen(false); setEditingNote(null); }} 
                        />
                    )}
                    {isQuickTaskModalOpen && (
                        <QuickTaskModal 
                            task={editingQuickTask} 
                            prefillDate={prefillDate}
                            onSave={(text, date, time) => {
                                if (editingQuickTask) handleUpdateQuickTask(editingQuickTask.id, text, date, time);
                                else handleAddQuickTask(text, date, time);
                                setIsQuickTaskModalOpen(false);
                            }}
                            onClose={() => { setIsQuickTaskModalOpen(false); setEditingQuickTask(null); }}
                        />
                    )}
                    
                    {/* Alarm Overlay */}
                    {activeAlarmAlert && (
                        <SamsungAlarmOverlay 
                            alarm={activeAlarmAlert} 
                            onDismiss={() => { setActiveAlarmAlert(null); FaioraNotifications.stopAlarmSFX(); }} 
                        />
                    )}
                    
                    {/* Toasts */}
                    <div className="fixed bottom-24 md:bottom-12 left-1/2 -translate-x-1/2 z-[500] flex flex-col items-center gap-3 pointer-events-none">
                        {toasts.map(t => (
                            <div key={t.id} className="px-6 py-3 bg-slate-900 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-primary shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
                                {t.message}
                            </div>
                        ))}
                    </div>
                </div>
            </HashRouter>
        </FaioraErrorBoundary>
    );
};

export default App;
