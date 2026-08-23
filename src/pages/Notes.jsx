import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Header, ConfirmationModal } from '../components/Common';
import NoteCard from '../components/NoteCard';
import { SkeletonNoteCard } from '../components/Skeletons';
import { 
    getThemeClasses, 
    formatReminderDate, 
    formatDateMinimal, 
    parseDateString 
} from '../core/config';

// LABEL: PAGE-NOTES — Short Summary: Main notes archive with sections, bulk actions, and drag-and-drop organization
const NotesPage = React.memo(({ 
    user, 
    notes, 
    onOpenCreator, 
    onEditNote, 
    noteSections, 
    onAddSection, 
    onDeleteSection, 
    onMoveNote, 
    onReorderNote, 
    onRemoveReminder, 
    onBulkUpdate, 
    onBulkDelete, 
    isProbing, 
    isFirstSyncDone, 
    pomodoroTime, 
    isPomodoroActive 
}) => {
    const navigate = useNavigate();
    const [labelFilter, setLabelFilter] = useState('');
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [pendingDeleteSection, setPendingDeleteSection] = useState(null);
    const [pendingDeleteNotes, setPendingDeleteNotes] = useState([]);
    const longPressTimer = useRef(null);
    const dropdownRef = useRef(null);
    const [dragState, setDragState] = useState(null);
    const [localNotes, setLocalNotes] = useState(notes);
    const dragRef = useRef(null);
    const [selectedNotes, setSelectedNotes] = useState([]);
    const selectionMode = selectedNotes.length > 0;
    const pointerHandledRef = useRef(false);
    const geometryRef = useRef(null);
    const lastUpdateRef = useRef(0);
    const [selectionPopup, setSelectionPopup] = useState(null);
    const [newLabelText, setNewLabelText] = useState('');
     
    const isLoading = isProbing || !isFirstSyncDone;
     
    // Back button support for popups
    useEffect(() => {
        const handleCloseInternal = () => {
            setShowLabelDropdown(false);
            setShowAddSection(false);
            setPendingDeleteSection(null);
            setPendingDeleteNotes([]);
            setSelectionPopup(null);
        };
        window.addEventListener('faiora-close-popups', handleCloseInternal);
        return () => window.removeEventListener('faiora-close-popups', handleCloseInternal);
    }, []);

    const handleSetShowLabelDropdown = (val) => {
        if (val) window.history.pushState({ modal: 'notes', popup: 'label' }, '');
        setShowLabelDropdown(val);
    };
    const handleSetShowAddSection = (val) => {
        if (val) window.history.pushState({ modal: 'notes', popup: 'section' }, '');
        setShowAddSection(val);
    };
    const handleSetPendingDeleteSection = (val) => {
        if (val) window.history.pushState({ modal: 'notes', popup: 'delete' }, '');
        setPendingDeleteSection(val);
    };
    const handleSetPendingDeleteNotes = (noteIds) => {
        if (noteIds && noteIds.length > 0) window.history.pushState({ modal: 'notes', popup: 'delete-notes' }, '');
        setPendingDeleteNotes(noteIds || []);
    };
    const handleSetSelectionPopup = (val) => {
        if (val) window.history.pushState({ modal: 'notes', popup: 'selection' }, '');
        setSelectionPopup(val);
    };

    // Sync localNotes with prop notes when not dragging
    const lastSyncRef = useRef('');
    useEffect(() => {
        const currentSync = JSON.stringify(notes.map(n => ({ id: n.id, updatedAt: n.updatedAt, section: n.section, labels: n.labels })));
        if (!dragState && currentSync !== lastSyncRef.current) {
            lastSyncRef.current = currentSync;
            setLocalNotes(notes);
        }
    }, [notes, dragState]);

    // Collect all unique labels
    const allLabels = useMemo(() => {
        const set = new Set();
        notes.forEach(n => (n.labels || []).forEach(l => set.add(l)));
        return Array.from(set).sort();
    }, [notes]);

    // Filter function
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const searchQuery = queryParams.get('search') || '';

    const matchesFilter = (note) => {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = parseDateString(dateStr);
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${shortMonths[d.getMonth()]}`;
        };

        const searchableText = [
            note.title,
            note.content,
            (note.labels || []).join(' '),
            note.section,
            note.reminderDate,
            formatDate(note.reminderDate),
            note.noteIcon
        ].filter(Boolean).join(' ').toLowerCase();

        if (searchQuery && !searchableText.includes(searchQuery.toLowerCase())) return false;
        if (!labelFilter) return true;
        return (note.labels || []).includes(labelFilter);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) handleSetShowLabelDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Gesture state ref — shared between pointer event handlers
    const gestureRef = useRef({ active: false, activated: false, scrolling: false });

    // Find nearest scrollable ancestor for manual scroll
    const findScrollParent = (el) => {
        let node = el ? el.parentElement : null;
        while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
            node = node.parentElement;
        }
        return document.documentElement;
    };

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
                if (Math.abs(mx - gs.startX) > 15 || Math.abs(my - gs.startY) > 15) {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    gs.scrolling = true;
                    gs.active = false;
                    try { gs.cardEl.releasePointerCapture(gs.pointerId); } catch(err) {}
                    removeDocListeners();
                }
                return;
            }

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

        if (selectionMode) return;

        longPressTimer.current = setTimeout(() => {
            if (navigator.vibrate) try { navigator.vibrate(50); } catch(err) {}
            gestureRef.current.activated = true;

            try { cardEl.setPointerCapture(pointerId); } catch(err) {}

            const initialNote = notes.find(n => n.id === noteId);
            const initialSection = initialNote ? (initialNote.isPinned ? "__pinned" : (initialNote.section || '')) : '';
            
            const scrollParent = findScrollParent(cardEl);
            const currentScroll = scrollParent.scrollTop;
            
            const sections = [];
            document.querySelectorAll('[data-drop-section]').forEach(el => {
                const rect = el.getBoundingClientRect();
                sections.push({ 
                    el, 
                    sect: el.getAttribute('data-drop-section'),
                    absTop: rect.top + currentScroll,
                    absBottom: rect.bottom + currentScroll,
                    absLeft: rect.left,
                    absRight: rect.right
                });
            });
            
            const noteElements = [];
            document.querySelectorAll('[data-note-id]').forEach(el => {
                const nid = el.getAttribute('data-note-id');
                if (nid !== noteId) {
                   const rect = el.getBoundingClientRect();
                   const sectEl = el.closest('[data-drop-section]');
                   noteElements.push({ 
                       nid, 
                       sect: sectEl ? sectEl.getAttribute('data-drop-section') : '',
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
            cardEl.style.transform = 'scale(0.97)';
            cardEl.style.transition = 'transform 0.15s ease';
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
            document.body.style.cursor = 'grabbing';

            cloneEl.className = 'drag-clone fixed z-[9999] pointer-events-none transition-transform duration-100 ease-out';
            cloneEl.style.width = rect.width + 'px';
            cloneEl.style.height = rect.height + 'px';
            cloneEl.style.opacity = '0.9';
            cloneEl.style.filter = 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))';
            cloneEl.style.left = (mx - (mx - rect.left)) + 'px';
            cloneEl.style.top = (my - (my - rect.top)) + 'px';
            cloneEl.style.borderRadius = '24px';
            cloneEl.style.pointerEvents = 'none';
            cloneEl.style.transform = 'scale(0.95)';
            document.body.appendChild(cloneEl);

            state.cloneEl = cloneEl;
            state.offsetX = mx - rect.left;
            state.offsetY = my - rect.top;

            gs.cardEl.style.opacity = '0.3';
            gs.cardEl.style.transform = 'scale(0.95)';

            document.querySelectorAll('[data-drop-section]').forEach(el => {
                el.style.outline = '2px dashed rgba(249, 115, 22, 0.4)';
                el.style.outlineOffset = '4px';
                el.style.borderRadius = '1.5rem';
                el.style.transition = 'outline 0.2s, background 0.2s';
            });
        }

        if (!state.cloneCreated) return;

        requestAnimationFrame(() => {
            if (state.cloneEl) {
                state.cloneEl.style.left = (mx - state.offsetX) + 'px';
                state.cloneEl.style.top = (my - state.offsetY) + 'px';
                state.cloneEl.style.transform = 'scale(1.05) rotate(1deg)';
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
        const isDraggingPinned = (state.initialSection === "__pinned");
        
        if (geo && geo.sections) {
            geo.sections.forEach(s => {
                const isTargetPinned = (s.sect === "__pinned");
                if (isDraggingPinned !== isTargetPinned) return;
                if (absoluteMx >= s.absLeft && absoluteMx <= s.absRight && absoluteMy >= s.absTop && absoluteMy <= s.absBottom) {
                    hoveredSect = s.sect;
                    s.el.style.background = 'rgba(249, 115, 22, 0.05)';
                    s.el.style.outline = '2px dashed rgba(249, 115, 22, 0.4)';
                } else {
                    s.el.style.background = '';
                    s.el.style.outline = '';
                }
            });
        }

        let hoveredNoteId = null;
        if (hoveredSect !== null && geo && geo.noteElements) {
            geo.noteElements.forEach(n => {
                if (n.sect !== hoveredSect) return;
                const dx = absoluteMx - n.absCenterX;
                const dy = absoluteMy - n.absCenterY;
                if (Math.sqrt(dx*dx + dy*dy) < 90) hoveredNoteId = n.nid;
            });
        }

        const now = Date.now();
        if (now - lastUpdateRef.current > 60 && (hoveredNoteId || hoveredSect !== null)) {
            lastUpdateRef.current = now;
            setLocalNotes(prev => {
                let next = [...prev];
                let changed = false;
                const ni = next.findIndex(n => n.id === state.noteId);
                if (ni === -1) return prev;

                if (hoveredNoteId) {
                    const ti = next.findIndex(n => n.id === hoveredNoteId);
                    if (ti !== -1 && ni !== ti) {
                        const [rm] = next.splice(ni, 1);
                        next.splice(ti, 0, rm);
                        changed = true;
                    }
                }

                const curIdx = next.findIndex(n => n.id === state.noteId);
                if (curIdx > -1 && hoveredSect !== null) {
                    const note = next[curIdx];
                    const targetIsPinned = (hoveredSect === "__pinned");
                    const targetSect = targetIsPinned ? (note.section || "") : hoveredSect;
                    if ((note.section || '') !== targetSect || !!note.isPinned !== targetIsPinned) {
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
        
        document.body.style.cursor = '';
        document.querySelectorAll('.drag-clone').forEach(el => el.remove());
        if (state && state.cloneEl) state.cloneEl.remove();

        if (state && state.originalEl) {
            state.originalEl.style.opacity = '';
            state.originalEl.style.transform = '';
            state.originalEl.style.transition = '';
        }

        document.querySelectorAll('[data-drop-section]').forEach(el => {
            el.style.background = '';
            el.style.outline = '';
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

        try { gs.cardEl.releasePointerCapture(gs.pointerId); } catch(err) {}

        const state = dragRef.current;
        
        if (state && state.cloneCreated && state.didMove) {
            setLocalNotes(currentLocal => {
                const finalNote = currentLocal.find(n => n.id === state.noteId);
                const originalNote = notes.find(n => n.id === state.noteId);
                if (finalNote && originalNote && ((finalNote.section || '') !== (originalNote.section || '') || !!finalNote.isPinned !== !!originalNote.isPinned)) {
                    onBulkUpdate(state.noteId, { section: finalNote.section || '', isPinned: !!finalNote.isPinned });
                }
                const finalIdx = currentLocal.findIndex(n => n.id === state.noteId);
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
        } 
        else if (!gs.scrolling) {
            if (selectionMode || gs.activated) {
                pointerHandledRef.current = true;
                toggleNoteSelection(gs.noteId);
            }
        }

        cleanupDrag();
    };

    useEffect(() => {
        return () => { cleanupDrag(); removeDocListeners(); };
    }, []);

    const handleAddSectionSubmit = () => {
        if (newSectionName.trim()) {
            onAddSection(newSectionName);
            setNewSectionName('');
            handleSetShowAddSection(false);
         }
    };

    const toggleNoteSelection = (noteId) => {
        setSelectedNotes(prev => {
            const next = prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId];
            if (next.length > 0) {
                window.dispatchEvent(new CustomEvent('faiora-close-popups'));
            }
            return next;
        });
    };

    // Bulk actions
    const bulkTogglePin = () => {
        const allPinned = selectedNotes.every(id => {
            const n = notes.find(note => note.id === id);
            return n && n.isPinned;
        });
        selectedNotes.forEach(id => {
            const n = notes.find(note => note.id === id);
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
        pendingDeleteNotes.forEach(id => onBulkDelete(id));
        setSelectedNotes([]);
        handleSetPendingDeleteNotes([]);
    };

    const bulkDuplicate = () => {
        selectedNotes.forEach(id => {
            const n = notes.find(note => note.id === id);
            if (n) {
                const dup = { ...n, id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), title: n.title + ' (Copy)', isPinned: false };
                onBulkUpdate(dup.id, dup, true);
            }
        });
        setSelectedNotes([]);
    };

    const bulkApplyPalette = (themeId) => {
        selectedNotes.forEach(id => onBulkUpdate(id, { noteTheme: themeId }));
        handleSetSelectionPopup(null);
        setSelectedNotes([]);
    };

    const bulkShare = () => {
        if (selectedNotes.length !== 1) return;
        const noteId = selectedNotes[0];
        const note = (notes || []).find(n => n.id === noteId);
        if (note) {
            window.dispatchEvent(new CustomEvent('faiora-close-popups'));
            const updates = { publicView: true };
            if (!(note.publicView && note.allowPublicEdit)) {
                updates.allowPublicEdit = false;
            }
            onBulkUpdate(noteId, updates);
            const shareLink = `https://zeamarae.github.io/Faiora/#/share_note.html?id=${noteId}`;
            navigator.clipboard.writeText(shareLink).then(() => {
                setSelectedNotes([]);
            });
        }
    };

    const bulkApplyLabel = (label) => {
        selectedNotes.forEach(id => {
            const n = notes.find(note => note.id === id);
            if (n) {
                const newLabels = (n.labels || []).includes(label) ? n.labels : [...(n.labels || []), label];
                onBulkUpdate(id, { labels: newLabels });
             }
         });
         handleSetSelectionPopup(null);
         setNewLabelText('');
        setSelectedNotes([]);
    };

    const themes = [
        { id: 'glass', color: 'rgba(255,255,255,0.05)' },
        { id: 'peach', color: '#ffedd5' },
        { id: 'amber', color: '#fef3c7' },
        { id: 'orange', color: '#ffedd5' },
        { id: 'yellow', color: '#fef9c3' },
        { id: 'warm1', color: '#e9d9c4' },
        { id: 'warm2', color: '#e9e5d8' },
        { id: 'warm3', color: '#e9e2da' },
        { id: 'warm4', color: '#e8c59d' },
        { id: 'warm5', color: '#e9e6d5' },
        { id: 'sage', color: '#ecfdf5' },
        { id: 'sky', color: '#e0f2fe' },
        { id: 'lavender', color: '#eef2ff' },
        { id: 'rose', color: '#fff1f2' },
        { id: 'slate', color: '#f1f5f9' },
        { id: 'teal', color: '#f0fdfa' },
        { id: 'indigo', color: '#f5f3ff' }
    ];

    const renderNoteGrid = (notesList, gridClass, currentSection = null) => {
        const activeGridClass = gridClass || "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8";
        const sourceNoteId = dragState ? dragState.noteId : null;

        return (
            <div className={activeGridClass}>
                {notesList.map((note, index) => {
                    const isDragged = note.id === sourceNoteId;
                    
                    if (isDragged) {
                        const isHomeSection = currentSection === (dragState.initialSection || '');
                        const isTargetSection = note.isPinned ? (currentSection === '__pinned') : (currentSection === (note.section || ''));

                        return (
                            <React.Fragment key={note.id}>
                                {isHomeSection && (
                                    <div 
                                        data-note-id={note.id}
                                        onPointerDown={(e) => handlePointerDown(note.id, e)}
                                        className="opacity-0 w-0 h-0 pointer-events-none overflow-hidden absolute" 
                                    />
                                )}
                                {isTargetSection && (
                                    <div className={`border-2 border-dashed border-primary/20 rounded-3xl flex flex-col items-center justify-center bg-primary/5 transition-all animate-pulse overflow-hidden relative group/placeholder min-h-[190px]`}>
                                         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
                                         <span className={`material-symbols-outlined text-primary/30 relative z-10 transition-transform text-4xl mb-2 scale-110 group-hover/placeholder:scale-125`}>add_circle</span>
                                         <p className="text-primary/20 text-[10px] uppercase tracking-[0.2em] font-bold relative z-10">Land Here</p>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    }

                    const isSelected = selectedNotes.includes(note.id);

                    return (
                        <div 
                            key={note.id}
                            data-note-id={note.id}
                            onPointerDown={(e) => handlePointerDown(note.id, e)}
                            onContextMenu={(e) => e.preventDefault()}
                            onClick={() => { 
                                if (pointerHandledRef.current) {
                                    pointerHandledRef.current = false;
                                    return;
                                }
                                if (selectedNotes.length > 0) {
                                    toggleNoteSelection(note.id);
                                } else if (!dragRef.current || !dragRef.current.didMove) {
                                    onEditNote(note); 
                                }
                            }} 
                            style={{ 
                                touchAction: (dragState && dragState.noteId === note.id) ? 'none' : 'pan-y',
                                cursor: selectionMode ? 'pointer' : (dragState ? 'grabbing' : 'pointer')
                            }}
                            className={"transition-all duration-300 " + (dragState && dragState.noteId === note.id ? 'z-[1000] scale-105' : 'z-10')}
                        >
                            <NoteCard 
                                note={note} 
                                index={index} 
                                onRemoveReminder={onRemoveReminder}
                                variant="default"
                                isSelected={isSelected}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

     const LabelFilterDropdown = () => (
         <div className="relative" ref={dropdownRef}>
             <button 
                 onClick={() => handleSetShowLabelDropdown(!showLabelDropdown)}
                 className={"inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all " + (labelFilter ? "bg-primary/20 text-primary border-primary/30" : "text-cream-light/40 border-white/10 hover:border-white/20 hover:text-cream-light/60")}
             >
                 <span className="material-symbols-outlined text-xs">filter_list</span>
                 {labelFilter || 'Filter'}
                 {labelFilter && (
                     <button onClick={(e) => { e.stopPropagation(); setLabelFilter(''); handleSetShowLabelDropdown(false); }} className="ml-1 hover:text-primary-dark">
                         <span className="material-symbols-outlined text-xs">close</span>
                     </button>
                 )}
             </button>
             {showLabelDropdown && (
                 <div className="absolute right-0 top-full mt-2 w-48 bg-slate-950/95 backdrop-blur-2xl rounded-xl border border-white/10 shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                     <button 
                         onClick={() => { setLabelFilter(''); handleSetShowLabelDropdown(false); }}
                         className={"w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors " + (!labelFilter ? "text-primary bg-primary/20" : "text-cream-light/40 hover:bg-white/5 hover:text-cream-light")}
                     >All Labels</button>
                     {allLabels.map(label => (
                         <button 
                             key={label}
                             onClick={() => { setLabelFilter(label); handleSetShowLabelDropdown(false); }}
                             className={"w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors " + (labelFilter === label ? "text-primary bg-primary/20" : "text-cream-light/40 hover:bg-white/5 hover:text-cream-light")}
                         >{label}</button>
                     ))}
                    {allLabels.length === 0 && (
                        <p className="px-4 py-2 text-xs text-white/20">No labels yet</p>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <Layout onOpenCreator={onOpenCreator} pomodoroTime={pomodoroTime} isPomodoroActive={isPomodoroActive}>
            <div className="max-w-7xl mx-auto w-full px-0 md:px-16 pt-20 md:pt-12 pb-12">
                {selectionMode ? (
                    <div className="fixed top-0 left-0 right-0 z-[200] bg-black backdrop-blur-2xl border-b border-white/5 px-8 py-4 flex items-center justify-between animate-mobile-header font-montserrat">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedNotes([])} className="text-cream-light/60 hover:text-cream-light transition-colors p-1">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                            <span className="text-cream-light font-bold text-lg font-montserrat">{selectedNotes.length}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                            {(() => {
                                const allPinned = selectedNotes.every(id => { const n = localNotes.find(note => note.id === id); return n && n.isPinned; });
                                return (
                                    <button onClick={bulkTogglePin} className={"p-2.5 rounded-xl transition-colors " + (allPinned ? "bg-primary/20" : "hover:bg-white/10")} title={allPinned ? "Unpin" : "Pin"}>
                                        <span className={"material-symbols-outlined text-xl " + (allPinned ? "text-primary" : "text-cream-light/70")} style={{fontVariationSettings: allPinned ? "'FILL' 1" : "'FILL' 0"}}>push_pin</span>
                                    </button>
                                );
                            })()}
                             <div className="relative">
                                 <button onClick={() => handleSetSelectionPopup(selectionPopup === 'reminder' ? null : 'reminder')} className={"p-2.5 rounded-xl transition-colors " + (selectionPopup === 'reminder' ? "bg-white/10" : "hover:bg-white/10")} title="Reminder">
                                     <span className="material-symbols-outlined text-cream-light/70 text-xl">notifications</span>
                                 </button>
                                 {selectionPopup === 'reminder' && (
                                     <div className="absolute right-0 top-full mt-2 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] p-4 w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                                         <p className="text-[10px] font-bold uppercase tracking-widest text-cream-light/40 mb-3">Set Reminder</p>
                                         <input 
                                             type="datetime-local" 
                                             className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-cream-light focus:outline-none focus:border-primary/40 mb-3"
                                             style={{ colorScheme: 'dark' }}
                                             onChange={(e) => {
                                                 if (e.target.value) {
                                                     selectedNotes.forEach(id => {
                                                         onBulkUpdate(id, { reminderDate: e.target.value });
                                                     });
                                                     handleSetSelectionPopup(null);
                                                     setSelectedNotes([]);
                                                 }
                                             }}
                                         />
                                         <div className="flex gap-2">
                                             <button onClick={() => {
                                                 const tomorrow = new Date();
                                                 tomorrow.setDate(tomorrow.getDate() + 1);
                                                 tomorrow.setHours(8, 0, 0, 0);
                                                 const val = tomorrow.toISOString().slice(0, 16);
                                                 selectedNotes.forEach(id => onBulkUpdate(id, { reminderDate: val }));
                                                 handleSetSelectionPopup(null); setSelectedNotes([]);
                                             }} className="flex-1 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-xl py-2 hover:bg-primary/25 transition-colors">Tomorrow</button>
                                             <button onClick={() => {
                                                 const next = new Date();
                                                 next.setDate(next.getDate() + 7);
                                                 next.setHours(8, 0, 0, 0);
                                                 const val = next.toISOString().slice(0, 16);
                                                 selectedNotes.forEach(id => onBulkUpdate(id, { reminderDate: val }));
                                                 handleSetSelectionPopup(null); setSelectedNotes([]);
                                             }} className="flex-1 text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-xl py-2 hover:bg-primary/25 transition-colors">Next Week</button>
                                         </div>
                                     </div>
                                 )}
                             </div>
                             <div className="relative">
                                 <button onClick={() => handleSetSelectionPopup(selectionPopup === 'palette' ? null : 'palette')} className={"p-2.5 rounded-xl transition-colors " + (selectionPopup === 'palette' ? "bg-white/10" : "hover:bg-white/10")} title="Theme">
                                     <span className="material-symbols-outlined text-cream-light/70 text-xl">palette</span>
                                 </button>
                                    {selectionPopup === 'palette' && (
                                      <div className="absolute left-1/2 top-full mt-2 w-[min(14rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] p-4 box-border animate-in fade-in slide-in-from-top-2 duration-200">
                                         <p className="text-[10px] font-bold uppercase tracking-widest text-cream-light/40 mb-3">Choose Theme</p>
                                         <div className="grid grid-cols-5 gap-2.5">
                                             {themes.map(t => (
                                                 <button 
                                                     key={t.id} 
                                                     onClick={() => bulkApplyPalette(t.id)} 
                                                     className="w-9 h-9 rounded-xl border-2 border-white/10 hover:scale-110 hover:border-primary/50 transition-all shadow-md" 
                                                     style={{backgroundColor: t.color}} 
                                                     title={t.id} 
                                                 />
                                             ))}
                                         </div>
                                     </div>
                                 )}
                             </div>
                              {selectedNotes.length === 1 && (
                                 <button onClick={bulkShare} className="p-2.5 rounded-xl transition-colors hover:bg-white/10" title="Share">
                                     <span className="material-symbols-outlined text-cream-light/70 text-xl">share</span>
                                 </button>
                              )}
                             <div className="relative">
                                 <button onClick={() => handleSetSelectionPopup(selectionPopup === 'label' ? null : 'label')} className={"p-2.5 rounded-xl transition-colors " + (selectionPopup === 'label' ? "bg-white/10" : "hover:bg-white/10")} title="Label">
                                     <span className="material-symbols-outlined text-cream-light/70 text-xl">label</span>
                                 </button>
                                  {selectionPopup === 'label' && (
                                      <div className="absolute left-1/2 top-full mt-2 w-[min(14rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] p-4 box-border animate-in fade-in slide-in-from-top-2 duration-200">
                                         <p className="text-[10px] font-bold uppercase tracking-widest text-cream-light/40 mb-3">Add Label</p>
                                         <div className="flex items-center gap-2 mb-3">
                                             <input 
                                                 type="text" 
                                                 value={newLabelText} 
                                                 onChange={(e) => setNewLabelText(e.target.value.toUpperCase())}
                                                 onKeyDown={(e) => { if (e.key === 'Enter' && newLabelText.trim()) { bulkApplyLabel(newLabelText.trim()); } }}
                                                 placeholder="Type label..."
                                                 className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-cream-light placeholder:text-white/20 focus:outline-none focus:border-primary/40 uppercase tracking-wider font-bold"
                                                 style={{ caretColor: '#f97316' }}
                                                 autoFocus
                                             />
                                             <button onClick={() => { if (newLabelText.trim()) bulkApplyLabel(newLabelText.trim()); }} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors">
                                                 <span className="material-symbols-outlined text-lg">add_circle</span>
                                             </button>
                                         </div>
                                         {allLabels.length > 0 && (
                                             <div className="border-t border-white/5 pt-3">
                                                 <p className="text-[9px] font-bold uppercase tracking-widest text-cream-light/25 mb-2">Existing Labels</p>
                                                 <div className="flex flex-wrap gap-2">
                                                     {allLabels.map(l => (
                                                         <button key={l} onClick={() => bulkApplyLabel(l)} className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-colors border border-primary/20">{l}</button>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>
                             <div className="relative">
                                 <button onClick={() => handleSetSelectionPopup(selectionPopup === 'more' ? null : 'more')} className={"p-2.5 rounded-xl transition-colors " + (selectionPopup === 'more' ? "bg-white/10" : "hover:bg-white/10")} title="More">
                                     <span className="material-symbols-outlined text-cream-light/70 text-xl">more_vert</span>
                                 </button>
                                 {selectionPopup === 'more' && (
                                     <div className="absolute right-0 top-full mt-2 bg-slate-950/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-[130] py-2 w-48 animate-in fade-in slide-in-from-top-2 duration-200">
                                         <button onClick={bulkDuplicate} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-cream-light/60 hover:bg-white/5 hover:text-cream-light transition-colors flex items-center gap-3">
                                             <span className="material-symbols-outlined text-base">content_copy</span> Duplicate
                                         </button>
                                         <div className="h-px bg-white/5 mx-3 my-1"></div>
                                         <button onClick={bulkDelete} className="w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-3">
                                             <span className="material-symbols-outlined text-base">delete</span> Delete
                                         </button>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                ) : (
                    <Header user={user} title="Faiora" subtitle="Notes Archive" />
                )}
                <div className="px-4 md:px-0 pt-4">
                    {(searchQuery || labelFilter) && localNotes.filter(matchesFilter).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 font-montserrat">
                            <div className="w-24 h-24 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                                <span className="material-symbols-outlined text-5xl text-primary/40">search_off</span>
                            </div>
                            <h3 className="text-2xl font-bold text-cream-light mb-2 italic tracking-tight uppercase">No matches found</h3>
                            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold max-w-xs mx-auto">We couldn't find any notes matching your search criteria.</p>
                            <button onClick={() => { setLabelFilter(''); navigate('/notes', { replace: true }); }} className="mt-8 px-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all">Clear Search</button>
                        </div>
                    )}

                        {(() => {
                            let labelFilterShown = false;
                            const pinnedFiltered = localNotes.filter(n => {
                                const matches = matchesFilter(n);
                                if (n.isPinned) return matches;
                                if (dragState && dragState.noteId === n.id && dragState.initialSection === "__pinned") return true;
                                return false;
                            });
                            const pinnedSection = pinnedFiltered.length === 0 ? null : (
                                <section key="__pinned" className="mb-12 scale-in" data-drop-section="__pinned">
                                    <div className="flex items-center gap-4 mb-8">
                                        <span className="material-symbols-outlined text-primary/60 text-lg" style={{fontVariationSettings: "'FILL' 1"}}>push_pin</span>
                                        <h2 className="text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display">PINNED</h2>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                                        {(() => { labelFilterShown = true; return <LabelFilterDropdown />; })()}
                                    </div>
                                    {isLoading ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {[...Array(3)].map((_, i) => <SkeletonNoteCard key={i} index={i} variant="compact" />)}
                                        </div>
                                    ) : (
                                        renderNoteGrid(pinnedFiltered, null, "__pinned")
                                    )}
                                </section>
                            );

                            const customSections = (noteSections || []).map(sectionName => {
                                const sNotes = localNotes.filter(n => {
                                    if (n.isPinned) return false;
                                    const matches = matchesFilter(n);
                                    if (n.section === sectionName) return matches;
                                    if (dragState && dragState.noteId === n.id && (dragState.initialSection || '') === sectionName) return true;
                                    return false;
                                });
                                if ((searchQuery || labelFilter) && sNotes.length === 0) return null;
                                const showDropdownHere = !labelFilterShown;
                                if (showDropdownHere) labelFilterShown = true;
                                
                                return (
                                    <section key={sectionName} className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500" data-drop-section={sectionName}>
                                         <div className="flex items-center gap-4 mb-8">
                                             <span className="material-symbols-outlined text-primary/60 text-lg">folder</span>
                                             <h2 className="text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display">{sectionName}</h2>
                                             <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                                             {showDropdownHere && <LabelFilterDropdown />}
                                             <button onClick={() => handleSetPendingDeleteSection(sectionName)} className="text-white/20 hover:text-red-400 transition-colors" title="Delete section">
                                                 <span className="material-symbols-outlined text-sm">delete</span>
                                             </button>
                                         </div>
                                        {sNotes.length > 0 ? renderNoteGrid(sNotes, null, sectionName) : (
                                            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/5 rounded-2xl">
                                                <span className="material-symbols-outlined text-3xl text-white/5 mb-2">note_stack</span>
                                                <p className="text-white/20 text-xs">Long-press a note to move it here</p>
                                            </div>
                                        )}
                                    </section>
                                );
                            });

                            const addSectionButton = (!searchQuery && !labelFilter) ? (
                                <div className="mb-8">
                                    {showAddSection ? (
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="text" 
                                                value={newSectionName} 
                                                onChange={(e) => setNewSectionName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSectionSubmit()}
                                                placeholder="Section name..."
                                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-cream-light placeholder:text-white/20 focus:outline-none focus:ring-0 focus:border-primary/40 font-montserrat uppercase tracking-widest"
                                                style={{ caretColor: '#f97316' }}
                                                autoFocus
                                            />
                                             <button 
                                                 onClick={handleAddSectionSubmit}
                                                 className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                             >
                                                 <span className="material-symbols-outlined text-lg">check</span>
                                             </button>
                                             <button 
                                                 onClick={() => { handleSetShowAddSection(false); setNewSectionName(''); }}
                                                 className="p-2 text-white/30 hover:text-white/60 rounded-lg transition-colors"
                                             >
                                                 <span className="material-symbols-outlined text-lg">close</span>
                                             </button>
                                         </div>
                                     ) : (
                                         <button 
                                             onClick={() => handleSetShowAddSection(true)}
                                             className="inline-flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest hover:text-primary/70 transition-colors"
                                         >
                                             <span className="material-symbols-outlined text-sm">add</span>
                                             Add Section
                                         </button>
                                     )}
                                 </div>
                            ) : null;

                            const allNotesFiltered = localNotes.filter(n => {
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
                            const allNotesSection = ((searchQuery || labelFilter) && allNotesFiltered.length === 0) ? null : (
                                <section key="__allnotes" className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500" data-drop-section="">
                                    <div className="flex items-center gap-4 mb-8">
                                        <h2 className="text-sm font-bold text-cream-light/90 uppercase tracking-[0.3em] font-display">ALL NOTES</h2>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                                        {showDropdownOnAll && <LabelFilterDropdown />}
                                    </div>
                                    {isLoading ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                                            {[...Array(6)].map((_, i) => <SkeletonNoteCard key={i} index={i} />)}
                                        </div>
                                    ) : allNotesFiltered.length > 0 ? (
                                        <div className="pb-32">
                                            {renderNoteGrid(allNotesFiltered, null, "")}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                                            {(!isFirstSyncDone || isProbing) ? (
                                                <React.Fragment>
                                                    <div className="loading-spinner mb-4"></div>
                                                    <p className="text-white/40 font-medium font-montserrat uppercase tracking-widest text-[10px]">Syncing your life...</p>
                                                </React.Fragment>
                                            ) : (
                                                <React.Fragment>
                                                    <span className="material-symbols-outlined text-5xl text-white/5 mb-3">note_stack</span>
                                                    <p className="text-white/30 text-sm">{labelFilter ? 'No notes match this filter' : 'No notes here'}</p>
                                                </React.Fragment>
                                            )}
                                        </div>
                                    )}
                                </section>
                            );

                            return <>{pinnedSection}{customSections}{addSectionButton}{allNotesSection}</>;
                        })()}

                {pendingDeleteSection && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="glass-panel w-full max-w-md rounded-[2.5rem] border border-white/10 p-10 text-center animate-in zoom-in-95 duration-300 font-montserrat">
                            <div className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-8">
                                <span className="material-symbols-outlined text-red-400 text-4xl">warning</span>
                            </div>
                            <h3 className="text-2xl font-bold text-cream-light mb-4">Delete Section?</h3>
                            <p className="text-white/50 text-base leading-relaxed mb-10">
                                Are you sure you want to delete <span className="text-primary font-bold">"{pendingDeleteSection}"</span>? Its notes will be automatically moved to <span className="text-white/80 font-semibold">ALL NOTES</span>.
                            </p>
                            <div className="flex flex-col gap-4">
                                 <button 
                                     onClick={() => {
                                         onDeleteSection(pendingDeleteSection, false);
                                         handleSetPendingDeleteSection(null);
                                     }}
                                     className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold uppercase tracking-widest transition-all shadow-xl shadow-red-500/20"
                                 >
                                     Delete Section
                                 </button>
                                 <button 
                                     onClick={() => handleSetPendingDeleteSection(null)}
                                     className="w-full py-3 bg-transparent text-white/50 hover:text-white rounded-2xl font-bold uppercase tracking-widest transition-all mt-2"
                                 >
                                     Cancel
                                 </button>
                            </div>
                        </div>
                    </div>
                )}
                {pendingDeleteNotes.length > 0 && (
                    <ConfirmationModal
                        title={pendingDeleteNotes.length === 1 ? "Delete Note?" : `Delete ${pendingDeleteNotes.length} Notes?`}
                        message={pendingDeleteNotes.length === 1
                            ? "Are you sure you want to delete this note? This cannot be undone."
                            : `Are you sure you want to delete these ${pendingDeleteNotes.length} notes? This cannot be undone.`
                        }
                        onConfirm={confirmBulkDelete}
                        onCancel={() => handleSetPendingDeleteNotes([])}
                        confirmText={pendingDeleteNotes.length === 1 ? "Delete Note" : "Delete Notes"}
                        type="danger"
                    />
                )}
                </div>
            </div>
        </Layout>
    );
});

export default NotesPage;
