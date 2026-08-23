import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db, auth, firebase, hashPIN, verifyPIN, formatDateLocal, formatTime } from '../core/config';

// LABEL: TaskCreator — The primary note editing and creation interface
// MODIFIED: 2026-04-22 - Extracted from index.html and modularized
export const TaskCreator = ({ onAdd, onSave, onClose, editingNote = null, note: noteData = null, showToast }) => {
    const activeNote = editingNote || noteData;
    const [note, setNote] = useState({
        title: (activeNote && activeNote.title) || '',
        content: (activeNote && activeNote.content) || '',
        pinned: (activeNote && activeNote.pinned) || false,
        label: (activeNote && activeNote.label) || 'Personal',
        createdAt: (activeNote && activeNote.createdAt) || Date.now(),
        color: (activeNote && activeNote.color) || '#0f172a',
        history: (activeNote && activeNote.history) || [],
        locked: (activeNote && activeNote.locked) || false,
        pin: (activeNote && activeNote.pin) || null,
        hint: (activeNote && activeNote.hint) || "",
        shared: (activeNote && activeNote.shared) || false,
        owner: (activeNote && activeNote.owner) || (auth.currentUser ? auth.currentUser.uid : null),
        ownerName: (activeNote && activeNote.ownerName) || (auth.currentUser ? auth.currentUser.displayName : 'Guest'),
        guests: (activeNote && activeNote.guests) || []
    });

    const [isClosing, setIsClosing] = useState(false);
    const [activePopup, setActivePopup] = useState(null);
    const [history, setHistory] = useState(note.history || []);
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(activeNote ? 'saved' : 'idle');
    const [showConfirm, setShowConfirm] = useState({ show: false });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(!note.locked);
    const [showLockModal, setShowLockModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const editorRef = useRef(null);
    const titleRef = useRef(note.title);
    const contentRef = useRef(note.content);
    const autoSaveTimer = useRef(null);
    const saveStatusTimer = useRef(null);
    const lastLocalEditRef = useRef(0);

    const setSaveStatusTimed = useCallback((status) => {
        setSaveStatus(status);
        if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
        if (status === 'saved') {
            saveStatusTimer.current = setTimeout(() => setSaveStatus('idle'), 1600);
        }
    }, []);

    useEffect(() => () => {
        if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
    }, []);

    const toComparableTime = (value) => {
        if (!value) return 0;
        try {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const parsed = Date.parse(value);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            if (typeof value.toMillis === 'function') return value.toMillis();
            if (typeof value.seconds === 'number') return (value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1e6);
        } catch (error) {
            return 0;
        }
        return 0;
    };

    // Sync refs with state for use in event listeners
    useEffect(() => {
        titleRef.current = note.title;
        contentRef.current = note.content;
    }, [note.title, note.content]);

    // Handle back button for mobile
    useEffect(() => {
        const handlePopState = (e) => {
            if (activePopup) {
                setActivePopup(null);
                window.history.pushState(null, "");
            } else {
                handleClose();
            }
        };
        window.history.pushState(null, "");
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activePopup]);

    // Real-time sync for shared notes
    useEffect(() => {
        if (!activeNote || !activeNote.id) return;
        const ownerUid = activeNote.owner || auth.currentUser?.uid;
        if (!ownerUid) return;
        
        const unsubscribe = db.collection(localStorage.getItem('faiora_active_collection') || 'tasks')
            .doc(ownerUid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const updatedNote = data.notes?.[activeNote.id];
                    if (updatedNote) {
                        if (Date.now() - lastLocalEditRef.current < 5000) return;
                        setNote(prev => ({
                            ...prev,
                            ...updatedNote
                        }));
                        if (editorRef.current && updatedNote.content !== undefined && updatedNote.content !== editorRef.current.innerHTML) {
                            editorRef.current.innerHTML = updatedNote.content || '';
                        }
                    }
                }
            });
        return () => unsubscribe();
    }, [activeNote]);

    useEffect(() => {
        if (!editorRef.current) return;
        const nextContent = note.content || '';
        if (editorRef.current.innerHTML !== nextContent) {
            editorRef.current.innerHTML = nextContent;
        }
    }, [note.content]);

    const handleAutoSave = useCallback(() => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            if (activeNote) {
                saveToFirestore();
            }
        }, 5000);
    }, [note, activeNote]);

    const flushAutoSave = useCallback(async () => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        if (activeNote) {
            await saveToFirestore();
        }
    }, [activeNote]);

    const saveToFirestore = async () => {
        if (!auth.currentUser || !activeNote) return;
        setIsSaving(true);
        setSaveStatusTimed('saving');
        try {
            const ownerUid = note.owner || auth.currentUser.uid;
            const noteData = {
                ...note,
                updatedAt: Date.now()
            };
            
            await db.collection(localStorage.getItem('faiora_active_collection') || 'tasks').doc(ownerUid).set({
                notes: {
                    [activeNote.id]: noteData
                }
            }, { merge: true });
            setSaveStatusTimed('saved');
        } catch (e) {
            console.error("Save error:", e);
            setSaveStatusTimed('idle');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = async () => {
        setIsClosing(true);
        await flushAutoSave();
        setTimeout(onClose, 300);
    };

    useEffect(() => {
        const handlePageExit = () => {
            void flushAutoSave();
        };

        window.addEventListener('beforeunload', handlePageExit);
        window.addEventListener('pagehide', handlePageExit);
        document.addEventListener('visibilitychange', handlePageExit);

        return () => {
            window.removeEventListener('beforeunload', handlePageExit);
            window.removeEventListener('pagehide', handlePageExit);
            document.removeEventListener('visibilitychange', handlePageExit);
        };
    }, [flushAutoSave]);

    const handleSave = () => {
        const finalNote = {
            ...note,
            title: titleRef.current,
            content: contentRef.current,
            updatedAt: Date.now()
        };
        (onAdd || onSave)?.(finalNote);
        handleClose();
    };

    const confirmDeleteNote = () => {
        if (!activeNote) return;
        db.collection(localStorage.getItem('faiora_active_collection') || 'tasks').doc(note.owner || auth.currentUser.uid).set({
            notes: {
                [activeNote.id]: firebase.firestore.FieldValue.delete()
            }
        }, { merge: true }).then(() => {
            showToast("Note deleted");
            handleClose();
        });
    };

    const handleSetActivePopup = (p) => setActivePopup(activePopup === p ? null : p);

    const formatText = (cmd, val = null) => {
        document.execCommand(cmd, false, val);
        editorRef.current?.focus();
        handleTextChange();
    };

    const handleTextChange = () => {
        if (!editorRef.current) return;
        lastLocalEditRef.current = Date.now();
        const html = editorRef.current.innerHTML;
        setNote(prev => ({ ...prev, content: html }));
        setSaveStatusTimed('saving');
        handleAutoSave();
    };

    const handleTitleChange = (e) => {
        lastLocalEditRef.current = Date.now();
        const val = e.target.value;
        setNote(prev => ({ ...prev, title: val }));
        setSaveStatusTimed('saving');
        handleAutoSave();
    };

    const toggleChecklist = () => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const li = range.commonAncestorContainer.parentElement.closest('li');
        
        if (li && li.classList.contains('checklist-item')) {
            // Toggle existing
            const checkbox = li.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = !checkbox.checked;
            li.classList.toggle('completed');
        } else {
            // Create new
            const html = `<li class="checklist-item flex items-start gap-3 my-2" contenteditable="false">
                <input type="checkbox" class="mt-1.5 w-5 h-5 rounded-md border-2 border-primary/40 bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer accent-primary" />
                <div class="flex-1 outline-none min-h-[1.5em]" contenteditable="true" placeholder="To-do item..."></div>
            </li>`;
            document.execCommand('insertHTML', false, html);
        }
        handleTextChange();
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const imgHtml = `<div class="my-4 relative group rounded-2xl overflow-hidden border border-white/10" contenteditable="false">
                <img src="${event.target.result}" class="w-full h-auto rounded-2xl" />
                <button onclick="this.parentElement.remove(); window.dispatchEvent(new CustomEvent('faiora-note-changed'))" class="absolute top-4 right-4 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500">
                    <span class="material-symbols-outlined text-xl">delete</span>
                </button>
            </div><p><br></p>`;
            document.execCommand('insertHTML', false, imgHtml);
            handleTextChange();
        };
        reader.readAsDataURL(file);
    };

    const toggleLock = async () => {
        if (note.locked) {
            setShowUnlockModal(true);
        } else {
            setShowLockModal(true);
        }
    };

    const handleSetLock = (hash, hintText) => {
        setNote(prev => ({ ...prev, locked: true, pin: hash, hint: hintText }));
        setIsUnlocked(false);
        showToast("Note locked");
        handleAutoSave();
    };

    const handleUnlock = async (p) => {
        const isValid = await verifyPIN(p, note.pin);
        if (isValid) {
            setIsUnlocked(true);
            return true;
        }
        return false;
    };

    const removeLock = () => {
        setNote(prev => ({ ...prev, locked: false, pin: null, hint: "" }));
        setIsUnlocked(true);
        showToast("Lock removed");
        handleAutoSave();
    };

    const handleShare = async (e) => {
        e.preventDefault();
        if (!shareEmail.trim() || !activeNote) return;
        
        try {
            const snap = await db.collection('users_public').where('email', '==', shareEmail.trim().toLowerCase()).get();
            if (snap.empty) {
                showToast("User not found");
                return;
            }
            
            const guestUser = snap.docs[0].data();
            const newGuests = [...(note.guests || []), { uid: guestUser.uid, email: guestUser.email, name: guestUser.displayName || 'User' }];
            
            setNote(prev => ({ ...prev, shared: true, guests: newGuests }));
            setShareEmail("");
            showToast(`Shared with ${guestUser.displayName || guestUser.email}`);
            handleAutoSave();
        } catch (e) {
            console.error("Share error:", e);
            showToast("Failed to share");
        }
    };

    if (note.locked && !isUnlocked) {
        return (
            <UnlockModal 
                hint={note.hint} 
                onUnlock={handleUnlock} 
                onClose={handleClose} 
                showToast={showToast} 
            />
        );
    }

    return (
        <div id="faiora_task_creator_overlay" className={"fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-3xl transition-all duration-300 flex flex-col " + (isClosing ? 'opacity-0' : 'animate-in fade-in')}>
            <style>{`
                .editor-content:empty:before {
                    content: attr(placeholder);
                    color: rgba(255,255,255,0.2);
                    pointer-events: none;
                }
                .checklist-item.completed div {
                    text-decoration: line-through;
                    opacity: 0.5;
                }
                .checklist-item input:checked + div {
                    text-decoration: line-through;
                    opacity: 0.5;
                }
            `}</style>
            
            {/* creator_header — Short Summary: Top bar with back button, save button, and sync status */}
            <header className="flex items-center justify-between p-6 bg-transparent safe-top">
                <button id="creator_back_btn" onClick={handleClose} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[32px]">arrow_back</span>
                </button>
                <div className="flex items-center gap-3">
                    {saveStatus !== 'idle' && (
                        <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] transition-all ${saveStatus === 'saving' ? 'text-amber-600/70' : 'text-emerald-700/60'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            <span>{saveStatus === 'saving' ? 'saving' : 'saved'}</span>
                        </div>
                    )}
                    <button 
                        id="creator_save_btn"
                        onClick={handleSave} 
                        className="px-6 py-2.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                    >
                        Save Note
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar px-8 pb-32">
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* note_title_input — Short Summary: Large stylized input for the note's heading */}
                    <input 
                        id="note_title_field"
                        type="text"
                        placeholder="Title"
                        value={note.title}
                        onChange={handleTitleChange}
                        className="w-full bg-transparent text-4xl md:text-5xl font-black text-white placeholder:text-white/10 border-none outline-none tracking-tighter"
                    />
                    
                    <div className="flex items-center gap-3">
                         {/* label_badge — Short Summary: Shows the current categorization of the note */}
                        <div id="note_label_badge" className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                            {note.label}
                        </div>
                        {note.shared && (
                             /* shared_badge — Short Summary: Indicator that the note is shared with others */
                            <div id="note_shared_badge" className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-xs">group</span> Shared
                            </div>
                        )}
                    </div>

                    {/* note_editor_area — Short Summary: Rich-text area for the main content of the note */}
                    <div 
                        id="note_editor_content"
                        ref={editorRef}
                        contentEditable
                        placeholder="Write your thoughts..."
                        onInput={handleTextChange}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                        className="editor-content w-full min-h-[50vh] text-lg text-white/80 leading-relaxed outline-none font-sans"
                    />
                </div>
            </main>

            {/* creator_toolbar — Short Summary: Bottom formatting and utility bar */}
            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 safe-bottom z-50">
                <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => formatText('bold')} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-primary transition-all rounded-xl hover:bg-white/5">
                            <span className="material-symbols-outlined">format_bold</span>
                        </button>
                        <button onClick={() => formatText('italic')} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-primary transition-all rounded-xl hover:bg-white/5">
                            <span className="material-symbols-outlined">format_italic</span>
                        </button>
                        <button onClick={toggleChecklist} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-primary transition-all rounded-xl hover:bg-white/5">
                            <span className="material-symbols-outlined">checklist</span>
                        </button>
                        <label className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-primary transition-all rounded-xl hover:bg-white/5 cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            <span className="material-symbols-outlined">image</span>
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsHistoryOpen(true)} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-primary transition-all rounded-xl hover:bg-white/5">
                            <span className="material-symbols-outlined">history</span>
                        </button>
                        <button onClick={() => setShowShareModal(true)} className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-primary transition-all rounded-xl hover:bg-white/5">
                            <span className="material-symbols-outlined">person_add</span>
                        </button>
                        <button onClick={toggleLock} className={`w-12 h-12 flex items-center justify-center transition-all rounded-xl ${note.locked ? 'text-primary bg-primary/10' : 'text-white/40 hover:text-primary hover:bg-white/5'}`}>
                            <span className="material-symbols-outlined">{note.locked ? 'lock' : 'lock_open'}</span>
                        </button>
                        {activeNote && (
                            <button onClick={() => setShowDeleteConfirm(true)} className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-red-500 transition-all rounded-xl hover:bg-red-500/10">
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                    </div>
                </div>
            </footer>

            {/* Sub-modals inside TaskCreator */}
            {showLockModal && (
                <SetLockModal 
                    onSet={handleSetLock} 
                    onClose={() => setShowLockModal(false)} 
                    showToast={showToast} 
                />
            )}
            
            {showUnlockModal && (
                <UnlockModal 
                    hint={note.hint} 
                    onUnlock={async (p) => {
                        const ok = await handleUnlock(p);
                        if (ok) removeLock();
                        return ok;
                    }} 
                    onClose={() => setShowUnlockModal(false)} 
                    showToast={showToast} 
                />
            )}

            {showShareModal && (
                 /* share_modal — Short Summary: Modal for adding guests to a shared note */
                <div id="note_share_modal" className="fixed inset-0 z-[1100] flex items-center justify-center p-6 blur-overlay animate-in fade-in">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowShareModal(false)}></div>
                    <div className="glass-panel max-w-sm w-full p-8 rounded-[2.5rem] relative z-10 shadow-2xl border-white/5 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-cream-light mb-6">Share Note</h3>
                        <form onSubmit={handleShare} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email Address</label>
                                <input 
                                    autoFocus
                                    type="email"
                                    value={shareEmail}
                                    onChange={e => setShareEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105">
                                Send Invitation
                            </button>
                        </form>
                        
                        {note.guests && note.guests.length > 0 && (
                            <div className="mt-8 space-y-3">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Shared with</p>
                                {note.guests.map((g, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{g.name}</span>
                                            <span className="text-[10px] text-white/40">{g.email}</span>
                                        </div>
                                        <button onClick={() => {
                                            const next = note.guests.filter((_, idx) => idx !== i);
                                            setNote(prev => ({ ...prev, guests: next, shared: next.length > 0 }));
                                            handleAutoSave();
                                        }} className="text-white/20 hover:text-red-400">
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isHistoryOpen && (
                 /* history_modal — Short Summary: List of previous versions of the note */
                <div id="note_history_modal" className="fixed inset-0 z-[1100] flex items-center justify-center p-6 blur-overlay animate-in fade-in">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setIsHistoryOpen(false)}></div>
                    <div className="glass-panel max-w-sm w-full h-[60vh] p-8 rounded-[2.5rem] relative z-10 shadow-2xl border-white/5 flex flex-col">
                        <h3 className="text-xl font-bold text-cream-light mb-6">Version History</h3>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                            {history.length === 0 ? (
                                <p className="text-white/20 text-center py-12 italic">No history available yet.</p>
                            ) : (
                                history.slice().reverse().map((h, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => {
                                            setNote(prev => ({ ...prev, title: h.title, content: h.content }));
                                            setIsHistoryOpen(false);
                                            showToast("Version restored");
                                            handleAutoSave();
                                        }}
                                        className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-left hover:bg-white/10 transition-all group"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black text-primary uppercase tracking-widest">{new Date(h.timestamp).toLocaleDateString()}</span>
                                            <span className="text-[10px] text-white/20">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-white font-bold truncate">{h.title || '(Untitled)'}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showConfirm.show && (
                <ConfirmationModal 
                    title={showConfirm.title}
                    message={showConfirm.message}
                    onConfirm={showConfirm.onConfirm}
                    onCancel={() => setShowConfirm({ show: false })}
                    type={showConfirm.type}
                />
            )}
            {showDeleteConfirm && (
                <ConfirmationModal 
                    title="Delete Note?"
                    message="Are you sure you want to delete this note? This cannot be undone."
                    onConfirm={confirmDeleteNote}
                    onCancel={() => setShowDeleteConfirm(false)}
                    confirmText="Delete"
                    type="danger"
                />
            )}
        </div>
    );
};

// LABEL: QuickTaskModal — Semi-automated interface for adding rapid to-do items
// MODIFIED: 2026-04-22 - Extracted from index.html
export const QuickTaskModal = ({ onClose, onAdd, initialData = null, showToast, prefillDate = null }) => {
    const getTomorrow = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return formatDateLocal(d);
    };
    const getNextMonday = () => {
        const d = new Date();
        d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7 || 7);
        return formatDateLocal(d);
    };
     const extractDateFromText = (input) => {
        let lower = input.toLowerCase();
        let cleanText = input;
        const now = new Date();
        let newDate = null;
        let newTime = null;

        // 1. Detect Times first to prevent date parsing interference (e.g. 10am)
        const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]\d|2[0-3]):([0-5]\d)\b/gi;
        let timeMatch;
        if ((timeMatch = timeRegex.exec(lower)) !== null) {
            let h, m = '00';
            if (timeMatch[1]) { // am/pm format
                h = parseInt(timeMatch[1]);
                if (timeMatch[2]) m = timeMatch[2];
                const ampm = timeMatch[3].toLowerCase();
                if (ampm === 'pm' && h < 12) h += 12;
                if (ampm === 'am' && h === 12) h = 0;
            } else { // 24h format
                h = parseInt(timeMatch[4]);
                m = timeMatch[5];
            }
            newTime = `${h.toString().padStart(2, '0')}:${m}`;
            cleanText = cleanText.replace(timeMatch[0], '');
            lower = cleanText.toLowerCase();
        }

         // 2. Detect Specific Dates (e.g. mar 1, march 10, this 15)
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const fullMonthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        
        const dateRegex = new RegExp(`\\b(${monthNames.join('|')}|${fullMonthNames.join('|')})\\s*(\\d{1,2})\\b`, 'i');
        let dateMatch = dateRegex.exec(lower);
        
        const thisDateRegex = /\bthis\s+(\d{1,2})\b/i;
        let thisDateMatch = thisDateRegex.exec(lower);

        if (dateMatch) {
            const monthText = dateMatch[1].toLowerCase();
            let monthIdx = monthNames.findIndex(m => monthText.startsWith(m));
            if (monthIdx === -1) monthIdx = fullMonthNames.findIndex(m => m.startsWith(monthText));
            const day = parseInt(dateMatch[2]);
            
            const targetDate = new Date(now.getFullYear(), monthIdx, day);
            const matchIdx = dateMatch.index;
            const fullMatch = dateMatch[0];
            const nextChar = lower[matchIdx + fullMatch.length];

            if (day >= 1 && day <= 31) {
                const targetDateStr = formatDateLocal(targetDate);
                const tempCleanText = cleanText.replace(dateMatch[0], '');
                if (nextChar || day > 3) {
                   if (targetDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                       targetDate.setFullYear(now.getFullYear() + 1);
                   }
                   newDate = formatDateLocal(targetDate);
                   cleanText = tempCleanText;
                   lower = cleanText.toLowerCase();
                } else {
                   return { date: targetDateStr, time: newTime || '10:00', cleanText: tempCleanText, isPending: true };
                }
            }
        } else if (thisDateMatch) {
            const day = parseInt(thisDateMatch[1]);
            let targetDate = new Date(now.getFullYear(), now.getMonth(), day);
            if (targetDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                targetDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
            }
            newDate = formatDateLocal(targetDate);
            cleanText = cleanText.replace(thisDateMatch[0], '');
            lower = cleanText.toLowerCase();
        }

        // 3. Detect Relative Entities (tomorrow, next week, wed, thu, thur)
        const relativePatterns = [
            { regex: /\btomorrow\b/i, offset: 1 },
            { regex: /\bnext week\b/i, offset: 7 },
            { regex: /\b(?:next\s+)?(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i }
        ];

        for (const p of relativePatterns) {
            let match = p.regex.exec(lower);
            if (match) {
                const target = new Date();
                if (p.offset) {
                    target.setDate(now.getDate() + p.offset);
                } else {
                    const weekdays = { 
                        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6, 
                        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 
                    };
                    const targetDay = weekdays[match[1].toLowerCase()];
                    let diff = (targetDay + 7 - now.getDay()) % 7;
                    if (diff === 0) diff = 7;
                    target.setDate(now.getDate() + diff);
                }
                newDate = formatDateLocal(target);
                cleanText = cleanText.replace(match[0], '');
                lower = cleanText.toLowerCase();
                break;
            }
        }

        // 4. Relative Offsets (e.g. 5 min, 2 hrs, in 10m)
        const relativeTimeRegex = /\b(?:in\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/i;
        let relTimeMatch;
        if ((relTimeMatch = relativeTimeRegex.exec(lower)) !== null) {
            const value = parseInt(relTimeMatch[1]);
            const unit = relTimeMatch[2].toLowerCase();
            const target = new Date(now);
            
            if (unit.startsWith('m')) {
                target.setMinutes(now.getMinutes() + value);
            } else if (unit.startsWith('h')) {
                target.setHours(now.getHours() + value);
            }
            
            newDate = formatDateLocal(target);
            newTime = target.getHours().toString().padStart(2, '0') + ':' + target.getMinutes().toString().padStart(2, '0');
            cleanText = cleanText.replace(relTimeMatch[0], '');
            lower = cleanText.toLowerCase();
        }

        if (newDate && !newTime) newTime = '10:00';
        
        return { date: newDate, time: newTime, cleanText, isPending: false };
    };

     const getLaterTiming = () => {
        const now = new Date();
        const hour = now.getHours();
        
        if (hour >= 18 || hour < 6) {
            const target = new Date(now);
            if (hour >= 18) target.setDate(target.getDate() + 1);
            return { date: formatDateLocal(target), time: '10:00' };
        }
        
        const future = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        return {
            date: formatDateLocal(future),
            time: future.getHours().toString().padStart(2, '0') + ':' + future.getMinutes().toString().padStart(2, '0')
        };
    };

    const initialLater = getLaterTiming();
    const [text, setText] = useState((initialData && initialData.text) || '');
    const [dueDate, setDueDate] = useState((initialData && initialData.dueDate) || prefillDate || initialLater.date);
    const [dueTime, setDueTime] = useState((initialData && initialData.dueTime) || (prefillDate ? '10:00' : initialLater.time));
    const [isClosing, setIsClosing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCustom, setShowCustom] = useState(!!prefillDate || !!(initialData && (initialData.dueDate || initialData.dueTime)));
    const [selectedPreset, setSelectedPreset] = useState(() => {
        if (showCustom) return 'custom';
        return 'later';
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [pendingExtraction, setPendingExtraction] = useState(null);
    const dropdownRef = useRef(null);
    const historyPushedRef = useRef(false);

    useEffect(() => {
        if (!isClosing) {
            window.history.pushState({ modal: 'quickTask' }, '');
            historyPushedRef.current = true;
        } else if (historyPushedRef.current) {
            if (window.history.state && window.history.state.modal === 'quickTask') {
                window.history.back();
            }
            historyPushedRef.current = false;
        }
    }, [isClosing]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleTextChange = (val) => {
        const { date, time, cleanText, isPending } = extractDateFromText(val);
        if (isPending) {
            setText(val);
            setPendingExtraction({ date, time, cleanText });
        } else {
            setText(cleanText);
            setPendingExtraction(null);
            if (date) { setDueDate(date); setShowCustom(true); setSelectedPreset('custom'); }
            if (time) { setDueTime(time); setShowCustom(true); setSelectedPreset('custom'); }
        }
    };

    useEffect(() => {
        if (pendingExtraction) {
            const timer = setTimeout(() => {
                const { date, time, cleanText } = pendingExtraction;
                setText(cleanText);
                if (date) { setDueDate(date); setShowCustom(true); setSelectedPreset('custom'); }
                if (time) { setDueTime(time); setShowCustom(true); setSelectedPreset('custom'); }
                setPendingExtraction(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [pendingExtraction, dueDate, dueTime]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim() && !isSubmitting) {
            setIsSubmitting(true);
            onAdd(text.trim(), dueDate, dueTime);
            if (showToast) showToast(initialData ? "Task updated!" : "Quick task added!");
            if (typeof onClose === 'function') onClose();
        }
    };

    const getSelectedLabel = () => {
        const todayStr = formatDateLocal();
        const tomorrowStr = getTomorrow();
        const nextMonStr = getNextMonday();

        const formatD = (d) => {
            if(d === todayStr) return 'Today';
            if(d === tomorrowStr) return 'Tomorrow';
            const parts = (d || '').split('-');
            return parts.length === 3 ? `${parts[1]}/${parts[2]}` : '';
        };

        if (selectedPreset === 'later') {
            if (dueDate === initialLater.date && dueTime === initialLater.time) {
                return { label: 'Later', sub: (initialLater.date === todayStr ? 'Today, ' : 'Tomorrow, ') + formatTime(initialLater.time), icon: 'wb_twilight' };
            }
        }
        if (selectedPreset === 'tomorrow' && dueDate === tomorrowStr && dueTime === '10:00') return { label: 'Tomorrow', sub: 'Tomorrow, 10:00 AM', icon: 'event' };
        if (selectedPreset === 'monday' && dueDate === nextMonStr && dueTime === '08:00') return { label: 'Next Monday', sub: 'Monday, 8:00 AM', icon: 'calendar_month' };
        return { label: 'Custom', sub: `${formatD(dueDate)}, ${formatTime(dueTime)}`, icon: 'schedule' };
    };

    const selected = getSelectedLabel();

    return (
        <div id="faiora_quick_task_modal" className={"fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-200 " + (isClosing ? 'opacity-0 scale-95' : 'animate-in fade-in duration-300')}>
            <style>{`
                .quick-task-input:focus {
                    border-color: #f97316 !important;
                    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2) !important;
                }
            `}</style>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose}></div>
            {/* quick_task_card — Short Summary: Compact container for rapid task entry */}
            <div className="faiora-quick-task-card bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-6 relative z-10 shadow-2xl border border-white/5 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-cream-light font-montserrat tracking-wide">{initialData ? 'Edit Task' : 'New Quick Task'}</h3>
                    <button id="quick_task_close_btn" onClick={handleClose} className="text-white/20 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-cream-light/40 uppercase tracking-[0.2em] px-1 font-montserrat">Task Description</label>
                        {/* task_input_field — Short Summary: Auto-parsing textarea for task text and dates */}
                        <textarea
                            id="quick_task_input"
                            autoFocus
                            value={text}
                            onChange={(e) => handleTextChange(e.target.value)}
                            placeholder="What needs to be done? (Each new line creates a new quick task)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-cream-light placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 transition-all font-montserrat quick-task-input"
                            rows={4}
                            style={{ textTransform: 'capitalize', resize: 'none' }}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="space-y-3 relative" ref={dropdownRef}>
                        <label className="text-[10px] font-bold text-cream-light/40 uppercase tracking-[0.2em] px-1 font-montserrat">Schedule Task</label>
                        {/* schedule_dropdown_btn — Short Summary: Select predefined or custom timing for the task */}
                        <button 
                            id="quick_task_schedule_btn"
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all font-montserrat"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-xl ${isDropdownOpen ? 'text-primary' : 'text-cream-light/60'}`}>{selected.icon}</span>
                                <div className="flex flex-col items-start translate-y-[-1px]">
                                    <span className="text-sm font-bold text-cream-light">{selected.label}</span>
                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{selected.sub}</span>
                                </div>
                            </div>
                            <span className={`material-symbols-outlined transition-transform ${isDropdownOpen ? 'rotate-180 text-primary' : 'text-cream-light/30'}`}>expand_more</span>
                        </button>

                        {isDropdownOpen && (
                             /* schedule_dropdown_menu — Short Summary: List of timing presets for quick selection */
                            <div id="quick_task_dropdown_menu" className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                 {[
                                    { id: 'later', label: 'Later', time: (() => {
                                        const h = parseInt(initialLater.time.split(':')[0]);
                                        const m = initialLater.time.split(':')[1];
                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                        const h12 = h % 12 || 12;
                                        const day = initialLater.date === formatDateLocal() ? 'Today' : 'Tomorrow';
                                        return `${day}, ${h12}:${m} ${ampm}`;
                                    })(), icon: 'wb_twilight', date: initialLater.date, t: initialLater.time },
                                    { id: 'tomorrow', label: 'Tomorrow', time: 'Tomorrow, 10:00 AM', icon: 'event', date: getTomorrow(), t: '10:00' },
                                    { id: 'monday', label: 'Next Monday', time: 'Monday, 8:00 AM', icon: 'calendar_month', date: getNextMonday(), t: '08:00' },
                                    { id: 'custom', label: 'Custom', time: '', icon: 'schedule', date: null, t: null }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedPreset(opt.id);
                                            setPendingExtraction(null);
                                            if (opt.id === 'custom') {
                                                setShowCustom(true);
                                            } else {
                                                setShowCustom(false);
                                                setDueDate(opt.date);
                                                setDueTime(opt.t);
                                            }
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-lg text-cream-light/40">{opt.icon}</span>
                                            <span className={`text-sm font-bold ${selected.label === opt.label ? 'text-primary' : 'text-cream-light/80'}`}>{opt.label}</span>
                                        </div>
                                        {opt.time && <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{opt.time}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {showCustom && (
                         /* custom_date_inputs — Short Summary: Manual date and time selection fields */
                        <div id="quick_task_custom_fields" className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-cream-light/40 uppercase tracking-[0.2em] px-1 font-montserrat">Due Date</label>
                                <input 
                                    id="quick_task_date_field"
                                    type="date" 
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-cream-light placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 transition-all font-montserrat text-sm quick-task-input"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-cream-light/40 uppercase tracking-[0.2em] px-1 font-montserrat">Due Time</label>
                                <input 
                                    id="quick_task_time_field"
                                    type="time" 
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-cream-light placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 transition-all font-montserrat text-sm quick-task-input"
                                />
                            </div>
                        </div>
                    )}
                    <button 
                        id="quick_task_submit_btn"
                        type="submit" 
                        className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                    >
                        {initialData ? 'Update Task' : 'Add Task'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// LABEL: SetLockModal — Security interface for setting a note PIN
// MODIFIED: 2026-04-22 - Extracted from index.html
export const SetLockModal = ({ onSet, onClose, showToast }) => {
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [step, setStep] = useState(1); // 1: set, 2: confirm, 3: hint
    const [hint, setHint] = useState("");
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (step === 3) return;
            if (e.key >= '0' && e.key <= '9') {
                const key = parseInt(e.key);
                if (step === 1 && pin.length < 6) {
                    const newVal = pin + key;
                    setPin(newVal);
                    if (newVal.length === 6) setTimeout(() => handleSubmit(null, newVal), 200);
                } else if (step === 2 && confirmPin.length < 6) {
                    const newVal = confirmPin + key;
                    setConfirmPin(newVal);
                    if (newVal.length === 6) setTimeout(() => handleSubmit(null, newVal), 200);
                }
            } else if (e.key === 'Backspace') {
                if (step === 1) setPin(prev => prev.slice(0, -1));
                else setConfirmPin(prev => prev.slice(0, -1));
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
                showToast("PINs do not match");
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

    return (
        <div id="faiora_set_lock_modal" className={"fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-200 " + (isClosing ? 'opacity-0 scale-95' : 'animate-in fade-in zoom-in-95 duration-300')}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose}></div>
            {/* set_lock_card — Short Summary: Security dialog for defining a new 6-digit PIN */}
            <div className="bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-8 relative z-[210] shadow-2xl border border-white/5">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-primary text-3xl">lock</span>
                    </div>
                    <h3 className="text-xl font-bold text-cream-light font-montserrat tracking-tight">
                        {step === 1 ? 'Set Note PIN' : step === 2 ? 'Confirm PIN' : 'Security Hint'}
                    </h3>
                    <p className="text-slate-400 text-sm mt-2">
                        {step === 1 ? 'Choose a 6-digit PIN for this note.' : step === 2 ? 'Re-enter your PIN to confirm.' : 'Add a hint to help you remember.'}
                    </p>
                </div>

                {step < 3 ? (
                     /* pin_dots_display — Short Summary: Visual feedback for PIN entry steps */
                    <div id="set_lock_pin_dots" className="flex justify-center gap-2 mb-8">
                        {[...Array(6)].map((_, i) => {
                            const val = step === 1 ? pin[i] : confirmPin[i];
                            return (
                                <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${val ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
                                    {val && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mb-8">
                        {/* hint_input_field — Short Summary: Optional text hint for the set PIN */}
                        <input 
                            id="set_lock_hint_input"
                            autoFocus
                            type="text"
                            placeholder="e.g. My birthday, Favorite year..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-cream-light placeholder:text-white/10 focus:ring-2 focus:ring-primary/20 transition-all font-montserrat text-sm"
                            value={hint}
                            onChange={e => setHint(e.target.value)}
                        />
                    </div>
                )}

                {step < 3 ? (
                     /* numpad_grid — Short Summary: On-screen numeric keyboard for PIN entry */
                    <div id="set_lock_numpad" className="grid grid-cols-3 gap-3 mb-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'].map((key, i) => (
                            <button 
                                key={i}
                                disabled={key === ''}
                                onClick={() => {
                                    if (key === 'back') {
                                        if (step === 1) setPin(prev => prev.slice(0, -1));
                                        else setConfirmPin(prev => prev.slice(0, -1));
                                    } else if (typeof key === 'number') {
                                        if (step === 1 && pin.length < 6) {
                                            const newVal = pin + key;
                                            setPin(newVal);
                                            if (newVal.length === 6) setTimeout(() => handleSubmit(null, newVal), 200);
                                        } else if (step === 2 && confirmPin.length < 6) {
                                            const newVal = confirmPin + key;
                                            setConfirmPin(newVal);
                                            if (newVal.length === 6) setTimeout(() => handleSubmit(null, newVal), 200);
                                        }
                                    }
                                }}
                                className={`h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-montserrat transition-all ${typeof key === 'number' ? 'bg-white/5 text-cream-light hover:bg-white/10 active:scale-90' : 'text-slate-500'}`}
                            >
                                {key === 'back' ? <span className="material-symbols-outlined text-[24px]">backspace</span> : key}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <button id="set_lock_submit_btn" onClick={handleSubmit} className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary-dark transition-all">
                            Set Lock
                        </button>
                        <button id="set_lock_skip_btn" onClick={() => { setHint(""); setStep(3); handleSubmit(); }} className="w-full bg-white/5 text-slate-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
                            Skip Hint
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// LABEL: UnlockModal — Authentication screen for access to protected notes
// MODIFIED: 2026-04-22 - Extracted from index.html
export const UnlockModal = ({ hint, onUnlock, onClose, showToast }) => {
    const [pin, setPin] = useState("");
    const [isClosing, setIsClosing] = useState(false);
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                const key = parseInt(e.key);
                if (pin.length < 6) {
                    const newVal = pin + key;
                    setPin(newVal);
                    if (newVal.length === 6) handlePinSubmit(newVal);
                }
            } else if (e.key === 'Backspace') {
                setPin(prev => prev.slice(0, -1));
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
            showToast("Incorrect PIN");
            setTimeout(() => setIsError(false), 500);
        }
    };

    return (
        <div id="faiora_unlock_modal" className={"fixed inset-0 z-[999] flex items-center justify-center p-4 transition-all duration-200 " + (isClosing ? 'opacity-0 scale-95' : 'animate-in fade-in zoom-in-95 duration-300')}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose}></div>
            {/* unlock_card — Short Summary: Entry form for verifying a note's protection PIN */}
            <div className={`bg-[#0f172a] w-full max-sm:max-w-[90%] max-w-sm rounded-[2.5rem] p-8 relative z-[210] shadow-2xl border border-white/5 ${isError ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-primary text-3xl">lock_open</span>
                    </div>
                    <h3 className="text-xl font-bold text-cream-light font-montserrat tracking-tight">Enter PIN</h3>
                    <p className="text-slate-400 text-sm mt-2">This note is protected.</p>
                    {hint && <p id="unlock_hint_display" className="text-primary/60 text-[10px] font-bold uppercase tracking-widest mt-4">Hint: {hint}</p>}
                </div>

                <div id="unlock_pin_dots" className="flex justify-center gap-2 mb-8">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${pin[i] ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
                            {pin[i] && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                        </div>
                    ))}
                </div>

                <div id="unlock_numpad" className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'back'].map((key, i) => (
                        <button 
                            key={i}
                            disabled={key === ''}
                            onClick={() => {
                                if (key === 'back') setPin(prev => prev.slice(0, -1));
                                else if (typeof key === 'number' && pin.length < 6) {
                                    const newVal = pin + key;
                                    setPin(newVal);
                                    if (newVal.length === 6) handlePinSubmit(newVal);
                                }
                            }}
                            className={`h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-montserrat transition-all ${typeof key === 'number' ? 'bg-white/5 text-cream-light hover:bg-white/10 active:scale-90' : 'text-slate-500'}`}
                        >
                            {key === 'back' ? <span className="material-symbols-outlined text-[24px]">backspace</span> : key}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
