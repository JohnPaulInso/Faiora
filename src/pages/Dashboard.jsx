import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Header } from '../components/Common';
import NoteCard from '../components/NoteCard';
import QuickTaskItem from '../components/QuickTaskItem';
import { PriorityNoteSkeleton, SkeletonQuickTask } from '../components/Skeletons';
import { 
    sortQuickTasksList, 
    groupQuickTasksBySchedule, 
    getTodayEnabledAlarms, 
    formatTime, 
    formatDateLocal 
} from '../core/config';

// LABEL: PAGE-HOME — Short Summary: Dashboard page with priority notes, quick tasks, and alarm summary
const DashboardPage = ({ 
    user, 
    notes, 
    quickTasks, 
    alarms = [], 
    onOpenCreator, 
    onEditNote, 
    onReorderPriorityNote, 
    onToggleQuickTask, 
    onAddQuickTaskClick, 
    onDeleteQuickTask, 
    onUpdateQuickTask, 
    onEditQuickTask, 
    editingQuickTask, 
    setEditingQuickTask, 
    isQuickTaskModalOpen, 
    setIsQuickTaskModalOpen, 
    onRemoveReminder, 
    isProbing, 
    isFirstSyncDone, 
    pomodoroTime, 
    isPomodoroActive, 
    setIsPomodoroActive 
}) => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const [dragState, setDragState] = useState(null);
    const lastUpdateRef = useRef(0);
    const dragRef = useRef(null);
    const gestureRef = useRef({ active: false, activated: false, scrolling: false });
    const longPressTimer = useRef(null);
    
    // Move/Up/Cancel are added on document ONLY when a gesture starts,
    // to avoid blocking native scroll with per-card handlers.
    const docMoveRef = useRef(null);
    const docEndRef = useRef(null);

    const removeDocListeners = () => {
        if (docMoveRef.current) document.removeEventListener('pointermove', docMoveRef.current);
        if (docEndRef.current) {
            document.removeEventListener('pointerup', docEndRef.current);
            document.removeEventListener('pointercancel', docEndRef.current);
        }
        docMoveRef.current = null;
        docEndRef.current = null;
    };

    const [localNotes, setLocalNotes] = useState(() => 
         notes
             .filter(n => (n.labels || []).some(l => l.toUpperCase() === 'PRIORITY'))
             .sort((a, b) => {
                 const orderA = a.homeOrder || 0;
                 const orderB = b.homeOrder || 0;
                 if (orderA !== orderB) return orderA - orderB;
                 const timeA = a.updatedAt ? (a.updatedAt.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime()) : 0;
                 const timeB = b.updatedAt ? (b.updatedAt.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime()) : 0;
                 return timeB - timeA;
             })
     );
    const sortedQuickTasks = useMemo(() => sortQuickTasksList(quickTasks), [quickTasks]);

    const isLoading = isProbing || !isFirstSyncDone;

    const groupedQuickTasks = useMemo(() => groupQuickTasksBySchedule(sortedQuickTasks), [sortedQuickTasks]);
    const todayAlarms = useMemo(() => getTodayEnabledAlarms(alarms), [alarms]);

    // Sync localNotes with notes prop when not dragging
    // [FIX 2026-04-16] Stabilized with JSON comparison to prevent infinite loop during Pomodoro ticks
    const lastSyncRef = useRef('');
    useEffect(() => {
        const currentSync = JSON.stringify(notes.map(n => ({ id: n.id, updatedAt: n.updatedAt, homeOrder: n.homeOrder, labels: n.labels })));
        if (!dragState && currentSync !== lastSyncRef.current) {
            lastSyncRef.current = currentSync;
            const priorities = notes
                .filter(n => (n.labels || []).some(l => l.toUpperCase() === 'PRIORITY'))
                .sort((a, b) => {
                    const orderA = a.homeOrder || 0;
                    const orderB = b.homeOrder || 0;
                    if (orderA !== orderB) return orderA - orderB;
                    const timeA = a.updatedAt ? (a.updatedAt.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt).getTime()) : 0;
                    const timeB = b.updatedAt ? (b.updatedAt.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt).getTime()) : 0;
                    return timeB - timeA;
                });
            setLocalNotes(priorities);
        }
    }, [notes, dragState]);

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

        // Attach document-level listeners for this gesture
        const onMove = (ev) => {
            const gs = gestureRef.current;
            if (!gs.active) return;
            const { clientX: mx, clientY: my } = ev;

            if (gs.scrolling) return;

            // Before long-press: detect scroll and bail
            if (!gs.activated) {
                // FIX 2026-04-15: Increased movement threshold to 15px (was 8px) to prevent accidental drag triggers during scroll
                if (Math.abs(mx - gs.startX) > 15 || Math.abs(my - gs.startY) > 15) {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    gs.scrolling = true;
                    gs.active = false;
                    try { gs.cardEl.releasePointerCapture(gs.pointerId); } catch(err) {}
                    removeDocListeners();
                }
                return;
            }

            // Drag mode (after long press)
            handlePointerMoveCore(mx, my);
        };

        const onEnd = (ev) => {
            handlePointerEndCore(ev);
            removeDocListeners();
        };

        removeDocListeners();
        docMoveRef.current = onMove;
        docEndRef.current = onEnd;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onEnd);
        document.addEventListener('pointercancel', onEnd);

        longPressTimer.current = setTimeout(() => {
            if (navigator.vibrate) try { navigator.vibrate(50); } catch(err) {}
            gestureRef.current.activated = true;

            try { cardEl.setPointerCapture(pointerId); } catch(err) {}

            const rect = cardEl.getBoundingClientRect();
            const clone = cardEl.cloneNode(true);
            clone.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:9999;pointer-events:none;opacity:0.9;transform:scale(1.05) rotate(2deg);box-shadow:0 25px 60px rgba(0,0,0,0.5), 0 0 30px rgba(249, 115, 22, 0.3);transition:transform 0.15s ease, box-shadow 0.15s ease;border-radius:1.5rem;`;
            document.body.appendChild(clone);
            document.body.style.cursor = 'grabbing';
            cardEl.style.opacity = '0.3';
            cardEl.style.transform = 'scale(0.95)';

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

    const handlePointerMoveCore = (mx, my) => {
        const s = dragRef.current;
        if (!s) return;
        s.didMove = true;
        
        /* FIX 2026-04-16: Clone follows finger correctly using delta from start position */
        if (s.cloneEl) {
            s.cloneEl.style.transform = `translate3d(${mx - s.startX}px, ${my - s.startY}px, 0) scale(1.05) rotate(2deg)`;
        }

        // [FIX 2026-04-16] Edge Autoscrolling for Mobile
        const scrollSpeed = 15;
        const edgeThreshold = 80;
        if (my < edgeThreshold) {
            window.scrollBy(0, -scrollSpeed);
        } else if (my > window.innerHeight - edgeThreshold) {
            window.scrollBy(0, scrollSpeed);
        }

        // Throttle proximity check to every ~32ms (2 frames)
        const now = Date.now();
        if (now - lastUpdateRef.current < 32) return;
        lastUpdateRef.current = now;

        let hoveredNoteId = null;
        document.querySelectorAll('[data-priority-note-id]').forEach(el => {
            const nid = el.getAttribute('data-priority-note-id');
            if (nid === s.noteId) return;
            const r = el.getBoundingClientRect();
            const centerX = r.left + r.width / 2; const centerY = r.top + r.height / 2;
            if (Math.abs(mx - centerX) < 80 && Math.abs(my - centerY) < 80) hoveredNoteId = nid;
        });

        if (hoveredNoteId) {
            setLocalNotes(prev => {
                const si = prev.findIndex(n => n.id === s.noteId);
                const ti = prev.findIndex(n => n.id === hoveredNoteId);
                if (si === -1 || ti === -1) return prev;
                const n = [...prev]; const [rm] = n.splice(si, 1); n.splice(ti, 0, rm); return n;
            });
        }
    };

    /* handlePointerEndCore - cleans up drag state when pointer is released */
    /* FIX 2026-04-15: Added cleanup for activated-but-no-move case where clone and opacity were not restored */
    const handlePointerEndCore = (e) => {
        const gs = gestureRef.current;
        if (!gs.active) return;
        try { gs.cardEl.releasePointerCapture(gs.pointerId); } catch(err) {}
        if (longPressTimer.current) clearTimeout(longPressTimer.current);

        if (gs.scrolling) {
            setDragState(null);
            dragRef.current = null;
            return;
        }

        const s = dragRef.current;
        if (s && gs.activated && s.didMove) {
            /* User dragged and moved - commit reorder */
            setLocalNotes(currentLocal => {
                const fi = currentLocal.findIndex(n => n.id === s.noteId);
                let tid = s.noteId;
                if (currentLocal.length > 1) { const ti = fi > 0 ? fi - 1 : 1; tid = currentLocal[ti].id; }
                if (tid !== s.noteId) onReorderPriorityNote(s.noteId, tid);
                return currentLocal;
            });
        } else if (!gs.activated) {
            /* Short tap: open note */
            const note = localNotes.find(n => n.id === gs.noteId);
            if (note) onEditNote(note);
        }

        /* Always cleanup clone element and restore original card styles */
        if (s) {
            if (s.cloneEl) s.cloneEl.remove();
            if (s.originalEl) {
                s.originalEl.style.opacity = '1';
                s.originalEl.style.transform = '';
            }
        }

        document.body.style.cursor = '';
        setDragState(null);
        dragRef.current = null;
        gs.active = false;
    };

    // Effect cleanup
    useEffect(() => {
        return () => removeDocListeners();
    }, []);

    const sortedPriorityNotes = useMemo(() => localNotes.slice(0, 6), [localNotes]);

    const handleRefresh = async () => {
        if (navigator.vibrate) try { navigator.vibrate([10, 30, 10]); } catch(err) {}
        console.log("🔄 Pull-to-refresh triggered: Re-syncing data...");
        return new Promise(resolve => setTimeout(resolve, 1200));
    };

    return (
        <Layout onOpenCreator={onOpenCreator} onFabClick={onAddQuickTaskClick} onRefresh={handleRefresh} pomodoroTime={pomodoroTime} isPomodoroActive={isPomodoroActive}>
            <div className="max-w-7xl mx-auto w-full px-0 md:px-12 pt-0 pb-12">
                <div className="sticky top-0 z-[100] py-4 px-4 md:px-12 mb-6">
                    <Header user={user} />
                </div>
                <section className="mt-20 md:mt-8 mb-12 md:mb-16 px-4 md:px-0">
                    <div className="flex items-center gap-4 mb-6 pt-2 md:mb-10">
                        <h2 className="hidden md:block text-2xl font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display">PRIORITY NOTES</h2>
                        <h2 className="md:hidden text-lg font-bold text-cream-light/90 uppercase tracking-[0.2em] font-display">PRIORITY</h2>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                        <Link to="/notes" className="text-[9px] md:text-[10px] font-bold text-primary/60 uppercase tracking-widest hover:text-primary transition-colors">
                            view all ({notes.length})
                        </Link>
                    </div>
                    
                    {(isProbing || !isFirstSyncDone) ? (
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-6 px-0 md:px-2 mb-16 md:mb-20">
                            {[...Array(6)].map((_, i) => <div key={i} className={i >= 4 ? 'hidden md:block' : ''}><PriorityNoteSkeleton index={i} /></div>)}
                        </div>
                    ) : sortedPriorityNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 glass-panel rounded-3xl border-dashed border-white/10 text-center animate-pulse">
                            {(!isFirstSyncDone || isProbing) ? (
                                <React.Fragment>
                                    <div className="loading-spinner mb-4"></div>
                                    <p className="text-white/40 font-medium font-montserrat uppercase tracking-widest text-[10px]">Syncing your life...</p>
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <span className="material-symbols-outlined text-6xl text-white/5 mb-4">star</span>
                                    <p className="text-white/40 font-medium mb-4 font-montserrat">No priority notes found</p>
                                    <p className="text-white/20 text-xs mb-8 uppercase tracking-widest font-bold">Tag a note with "PRIORITY" to see it here</p>
                                    <button 
                                        onClick={() => onOpenCreator?.()}
                                        className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl text-xs font-bold uppercase tracking-widest transition-all font-montserrat"
                                    >
                                        Add New Note
                                    </button>
                                </React.Fragment>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-6 px-0 md:px-2 mb-16 md:mb-20">
                            {sortedPriorityNotes.slice(0, 6).map((note, index) => (
                                <div 
                                    key={note.id}
                                    onPointerDown={(e) => handlePointerDown(note.id, e)}
                                    onContextMenu={(e) => e.preventDefault()}
                                    data-priority-note-id={note.id}
                                    style={{ touchAction: (dragState && dragState.noteId === note.id) ? 'none' : 'pan-y' }}
                                    className={`${index >= 4 ? 'hidden md:block ' : ''}transition-transform duration-300 ${dragState && dragState.noteId === note.id ? 'z-[1000] scale-105' : 'z-10'}`}
                                >
                                    <NoteCard 
                                        note={note} 
                                        onClick={() => onEditNote(note)} 
                                        index={index} 
                                        variant="priority"
                                        onRemoveReminder={onRemoveReminder} 
                                    />
                                </div>
                            ))}

                            {sortedPriorityNotes.length < 6 && (
                                <button 
                                    onClick={() => onOpenCreator?.()}
                                    className="sticky-note-add h-[150px] md:h-[160px] border-2 border-dashed border-primary/40 rounded-[2rem] p-6 flex flex-col items-center justify-center group cursor-pointer hover:bg-primary/5 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                        <span className="material-symbols-outlined text-2xl">add</span>
                                    </div>
                                    <p className="text-sm font-bold text-primary/80 uppercase tracking-widest text-center px-2">Add New Note</p>
                                </button>
                            )}
                        </div>
                    )}
                </section>

                <div className="px-4 md:px-0">
                    <div className="flex items-center gap-4 mb-6 md:mb-10">
                        <h2 className="text-lg md:text-2xl font-bold text-cream-light/90 uppercase tracking-[0.2em] md:tracking-[0.3em] font-display">QUICK TASKS</h2>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                        <Link 
                            to="/quick-tasks"
                            className="text-[10px] font-bold text-primary/60 uppercase tracking-widest hover:text-primary transition-colors"
                        >
                            View All
                        </Link>
                    </div>

                    <section className="space-y-16 mb-32">
                        <div className="space-y-4">
                            {(isProbing || !isFirstSyncDone) ? (
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => <SkeletonQuickTask key={i} />)}
                                </div>
                            ) : quickTasks.length === 0 ? (
                                <div className="glass-panel p-10 rounded-3xl text-center border-dashed border-white/5">
                                    <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No quick tasks yet</p>
                                </div>
                            ) : (
                                <React.Fragment>
                                    <div className="space-y-8">
                                        {[
                                            { key: 'today', label: 'Today', items: groupedQuickTasks.today },
                                            { key: 'tomorrow', label: 'Tomorrow', items: groupedQuickTasks.tomorrow }
                                        ].map(section => (
                                            section.items.length > 0 && (
                                                <div key={section.key} className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-primary/70">{section.label}</h3>
                                                        <div className="h-px flex-1 bg-white/10"></div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {section.items.map(task => (
                                                            <QuickTaskItem
                                                                key={task.id}
                                                                task={task}
                                                                onToggle={onToggleQuickTask}
                                                                onDelete={onDeleteQuickTask}
                                                                onEdit={onEditQuickTask}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </React.Fragment>
                            )}
                        </div>
                        
                    <div className="px-4 md:px-0 mt-20">
                        <div className="flex items-center gap-4 mb-6 md:mb-10">
                            <h2 className="text-lg md:text-2xl font-bold text-cream-light/90 uppercase tracking-[0.2em] md:tracking-[0.3em] font-display">ALARMS</h2>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                            <button 
                                onClick={() => navigate('/alarms')}
                                className="text-[10px] font-bold text-primary/60 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
                            >
                                View All
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>

                        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-8 mb-32">
                            {todayAlarms.length > 0 ? (
                                todayAlarms.slice(0, 3).map(({ alarm, date }) => (
                                    <div
                                        key={alarm.id}
                                        className="glass-panel-dark rounded-[1.75rem] md:rounded-[2rem] p-6 flex flex-col justify-between group hover:border-primary/20 transition-all border border-white/5 shadow-2xl"
                                    >
                                        <div className="flex justify-between items-center mb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                                    <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: '"FILL" 1'}}>alarm</span>
                                                </div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className="text-3xl md:text-4xl font-display font-medium text-cream-light tracking-tighter tabular-nums leading-none">{formatTime(alarm.time)}</p>
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none opacity-80">{alarm.time?.includes('PM') ? 'PM' : 'AM'}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <p className="text-[10px] font-black text-primary/50 uppercase tracking-widest">{alarm.label || 'Alarm'}</p>
                                                <p className="text-[9px] font-bold text-cream-light/30 uppercase tracking-widest mt-1">Today</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-16 text-center">
                                    <p className="text-sm font-bold text-cream-light/55">No enabled alarms left for today.</p>
                                    <p className="text-[10px] font-bold text-primary/55 uppercase tracking-[0.2em] mt-2">Manage your schedule in Alarms page</p>
                                </div>
                            )}
                        </section>
                    </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
};

export default DashboardPage;
