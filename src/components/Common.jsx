import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db, firebase, signInWithGoogle, getThemeClasses, formatDateLocal } from '../core/config';
import { ResponsiveNav } from './Navigation';

// LABEL: FaioraErrorBoundary — Catches React rendering errors and displays a recovery UI
export class FaioraErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, err: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, err: error };
    }
    componentDidCatch(error, info) {
        console.error('FaioraErrorBoundary:', error, info?.componentStack);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div id="faiora_error_crash_screen" className="min-h-[100dvh] flex flex-col items-center justify-center p-8 text-cream-light text-center gap-4">
                    <p className="font-bold">Something went wrong loading the app.</p>
                    <p className="text-white/50 text-sm max-w-sm">{this.state.err?.message || 'Unknown error'}</p>
                    <button id="faiora_error_reload_btn" type="button" onClick={() => window.location.reload()} className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase">Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// LABEL: PullToRefresh — Implements mobile "pull down to refresh" gestures
export const PullToRefresh = ({ children, onRefresh, disabled = false }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [status, setStatus] = useState('idle'); // idle, pulling, ready, refreshing
    const pullDistanceRef = useRef(0);
    const isPulling = useRef(false);
    const startY = useRef(0);
    const statusRef = useRef('idle');
    const contentRef = useRef(null);
    const THRESHOLD = 85;
    const gestureCancelled = useRef(false);

    useEffect(() => {
        if (disabled) return;
        const el = contentRef.current;
        if (!el) return;

        const handleTouchStart = (e) => {
            const scrollContainer = e.target.closest('.overflow-y-auto');
            if (scrollContainer && scrollContainer.scrollTop > 0) return;
            
            isPulling.current = true;
            startY.current = e.touches[0].pageY;
            gestureCancelled.current = false;
        };

        const handleTouchMove = (e) => {
            if (!isPulling.current) return;
            const y = e.touches[0].pageY;
            const diffY = y - startY.current;

            if (diffY < 0) {
                isPulling.current = false;
                return;
            }

            if (diffY > 5) {
                const currentPull = Math.min(180, diffY * 0.4);
                pullDistanceRef.current = currentPull;
                setPullDistance(currentPull);
                
                const newStatus = currentPull > THRESHOLD ? 'ready' : 'pulling';
                statusRef.current = newStatus;
                setStatus(newStatus);

                if (currentPull > 5 && e.cancelable) {
                     e.preventDefault();
                }
            }
        };

        const handleTouchEnd = () => {
            if (!isPulling.current) return;
            const currentDistance = pullDistanceRef.current;
            isPulling.current = false;

            if (currentDistance > THRESHOLD && !gestureCancelled.current) {
                statusRef.current = 'refreshing';
                setStatus('refreshing');
                pullDistanceRef.current = 100;
                setPullDistance(100);
                if (onRefresh) {
                    onRefresh().finally(() => {
                        setTimeout(() => {
                            statusRef.current = 'idle';
                            setStatus('idle');
                            pullDistanceRef.current = 0;
                            setPullDistance(0);
                        }, 500);
                    });
                }
            } else {
                pullDistanceRef.current = 0;
                setPullDistance(0);
                statusRef.current = 'idle';
                setStatus('idle');
            }
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [disabled, onRefresh]);

    return (
        <div id="faiora_pull_to_refresh_wrapper" ref={contentRef} className="flex-1 h-full flex flex-col relative touch-pan-y overflow-x-hidden">
            <div 
                id="faiora_pull_to_refresh_indicator"
                className="absolute left-0 w-full flex flex-col items-center justify-center pointer-events-none z-[150] transition-all duration-200"
                style={{ 
                    height: `${pullDistance}px`,
                    top: '110px',
                    opacity: pullDistance > 30 ? 1 : 0
                }}
            >
                <div className={`p-2.5 bg-slate-950 border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-transform ${status === 'refreshing' ? 'animate-spin' : ''}`}
                     style={{ transform: `rotate(${pullDistance * 2}deg) scale(${Math.min(1.1, pullDistance / 70)})` }}>
                    <span className="material-symbols-outlined text-primary text-3xl font-bold">
                        {status === 'ready' ? 'release_alert' : (status === 'refreshing' ? 'sync' : 'expand_circle_down')}
                    </span>
                </div>
                <p className="text-[10px] font-black text-primary tracking-[0.3em] mt-3 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {status === 'pulling' ? 'Pull' : (status === 'ready' ? 'Release' : 'Syncing')}
                </p>
            </div>
            {children}
        </div>
    );
};

// LABEL: Layout — The main shell of the application including sidebar, navigation, and pull-to-refresh
export const Layout = ({ children, onOpenCreator, onFabClick, onRefresh, noPadding = false, showFab = true, pomodoroTime, isPomodoroActive }) => {
    const handleFabClick = onFabClick || onOpenCreator;
    const location = useLocation();
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const navigate = useNavigate();
    const pomodoroProgress = isPomodoroActive ? ((1500 - pomodoroTime) / 1500) * 100 : 0;

    const handleMainFabClick = () => {
        if (location.pathname === '/notes') {
            onOpenCreator?.();
        } else if (location.pathname === '/quick-tasks') {
            onFabClick?.();
        } else if (location.pathname === '/alarms') {
            onFabClick?.();
        } else {
            setIsFabMenuOpen(!isFabMenuOpen);
        }
    };

    const content = (
        <main id="faiora_main_content_scroll" className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative pt-0 pb-24 md:pb-12 ${noPadding ? 'px-0' : 'px-0 md:px-18'} md:ml-24`}>
            {children}
            {showFab && (
                <div className="relative">
                    <button 
                        id="faiora_mobile_fab"
                        onClick={handleMainFabClick}
                        className={`faiora-mobile-fab fixed bottom-[100px] md:bottom-12 right-6 md:right-12 w-[68px] h-[68px] md:w-20 md:h-20 ${isFabMenuOpen ? 'bg-zinc-800 rotate-45' : 'bg-primary'} text-white rounded-full flex items-center justify-center fab-shadow transition-all duration-300 hover:scale-110 active:scale-95 z-[400] group`}
                    >
                        <span className="material-symbols-outlined text-[32px] md:text-4xl group-hover:rotate-90 transition-transform duration-300">add</span>
                    </button>

                    {isFabMenuOpen && (
                        <React.Fragment>
                            <div 
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] animate-in fade-in duration-300"
                                onClick={() => setIsFabMenuOpen(false)}
                            />
                            <div className="fixed bottom-[180px] md:bottom-36 right-6 md:right-12 flex flex-col items-end gap-5 z-[400] animate-in slide-in-from-bottom-10 fade-in duration-300">
                                {[
                                    { label: 'NEW NOTE', icon: 'description', color: 'bg-primary', onClick: () => { if (location.pathname === '/calendar') navigate('/notes'); else onOpenCreator?.(); setIsFabMenuOpen(false); } },
                                    { label: 'QUICK TASK', icon: 'check_circle', color: 'bg-burnt-orange', onClick: () => { window.dispatchEvent(new CustomEvent('faiora-open-task-creator')); setIsFabMenuOpen(false); } },
                                    { label: 'SET ALARM', icon: 'alarm', color: 'bg-slate-700', onClick: () => { navigate('/alarms'); setIsFabMenuOpen(false); } }
                                ].map((item, i) => (
                                    <button key={i} onClick={item.onClick} className="flex items-center gap-4 group">
                                        <span className="text-[10px] font-black text-white px-4 py-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-[0.25em]">{item.label}</span>
                                        <div className={`w-14 h-14 md:w-16 md:h-16 ${item.color} rounded-[1.25rem] md:rounded-3xl flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform active:scale-95 border border-white/10`}>
                                            <span className="material-symbols-outlined text-2xl md:text-3xl">{item.icon}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </React.Fragment>
                    )}
                </div>
            )}
        </main>
    );

    return (
        <div id="faiora_app_layout_shell" className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-transparent">
            {isPomodoroActive && (
                <div id="global_pomodoro_sync_bar" className="fixed top-0 left-0 right-0 h-[3px] bg-white/5 z-[1000] pointer-events-none">
                    <div className="h-full bg-primary shadow-[0_0_10px_rgba(249,115,22,0.8)] transition-all duration-1000 ease-linear" style={{ width: `${pomodoroProgress}%` }}></div>
                </div>
            )}
            <ResponsiveNav />
            {onRefresh ? (
                <PullToRefresh onRefresh={onRefresh}>
                    {content}
                </PullToRefresh>
            ) : content}
        </div>
    );
};

// LABEL: Header — Premium glassmorphism header with real-time search logic and responsive placeholders
export const Header = ({
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
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';
    const [localQuery, setLocalQuery] = useState(initialSearch);
    const [isSearching, setIsSearching] = useState(false);
    const isControlledSearch = typeof onSearchChange === 'function';
    const queryValue = isControlledSearch ? (searchValue || '') : localQuery;
    const resolvedMobilePlaceholder = mobileSearchPlaceholder || searchPlaceholder || 'Search Faiora...';
    const resolvedDesktopPlaceholder = desktopSearchPlaceholder || searchPlaceholder || 'Search everything...';
    const searchSpinnerActive = !isControlledSearch && isSearching;

    const submitSearch = useCallback(() => {
        const trimmed = queryValue.trim();
        if (isControlledSearch) {
            if (typeof onSearchSubmit === 'function') {
                onSearchSubmit(trimmed);
            }
            return;
        }
        if (trimmed) {
            const targetPath = ['/quick-tasks', '/alarms'].includes(location.pathname) ? location.pathname : '/notes';
            navigate(`${targetPath}?search=${encodeURIComponent(trimmed)}`);
        } else if (['/notes', '/quick-tasks', '/alarms'].includes(location.pathname) && queryParams.has('search')) {
            navigate(location.pathname);
        }
    }, [isControlledSearch, location.pathname, navigate, onSearchSubmit, queryParams, queryValue]);

    // Debounced Search to prevent lag and skip transition manager
    useEffect(() => {
        if (!showSearch || isControlledSearch) return;
        if (localQuery.trim() !== initialSearch) {
            setIsSearching(true);
        }
        
        const timer = setTimeout(() => {
            const trimmed = localQuery.trim();
            if (trimmed && trimmed !== initialSearch) {
                const targetPath = ['/quick-tasks', '/alarms'].includes(location.pathname) ? location.pathname : '/notes';
                navigate(`${targetPath}?search=${encodeURIComponent(trimmed)}`);
            } else if (!trimmed && ['/notes', '/quick-tasks', '/alarms'].includes(location.pathname) && queryParams.has('search')) {
                navigate(location.pathname);
            }
            setIsSearching(false);
        }, 500); // Reduced to 500ms for faster feel
        return () => clearTimeout(timer);
    }, [showSearch, isControlledSearch, localQuery, initialSearch, navigate, location.pathname]);

    // Sync with URL Changes (like Browser Back/Forward)
    useEffect(() => {
        if (isControlledSearch) return;
        const s = queryParams.get('search') || '';
        if (s !== localQuery) setLocalQuery(s);
    }, [location.search, isControlledSearch]);

    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 z-10 relative">
            <div className="flex flex-col group cursor-default">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl md:text-5xl font-black text-cream-light italic tracking-tighter transition-all duration-300 group-hover:text-primary group-hover:scale-[1.02] drop-shadow-2xl">
                        {title}
                    </h1>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 animate-pulse-slow">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(249,115,22,1)]"></span>
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">Live Sync</span>
                    </div>
                </div>
                <p className="text-[10px] md:text-xs font-black text-white/30 uppercase tracking-[0.4em] md:tracking-[0.6em] mt-1 md:mt-2 flex items-center gap-3 transition-all duration-300 group-hover:text-white/50 group-hover:translate-x-1">
                    <span className="w-6 md:w-8 h-[1px] bg-white/20"></span>
                    {subtitle}
                </p>
            </div>
            
            <div className="flex items-center gap-4 md:gap-8">
                {showSearch && (
                    <div className={`relative group/search transition-all duration-500 ${isSearching ? 'scale-[1.02]' : ''}`}>
                        <div className="absolute inset-0 bg-primary/20 blur-[20px] opacity-0 group-focus-within/search:opacity-100 transition-opacity"></div>
                        <input 
                            type="text" 
                            value={queryValue}
                            onChange={(e) => {
                                if (isControlledSearch) onSearchChange(e.target.value);
                                else setLocalQuery(e.target.value);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                            placeholder={window.innerWidth < 768 ? resolvedMobilePlaceholder : resolvedDesktopPlaceholder}
                            className="w-full md:w-[320px] bg-slate-950/40 backdrop-blur-3xl border border-white/5 group-hover/search:border-white/10 group-focus-within/search:border-primary/40 focus:border-primary/40 rounded-2xl md:rounded-3xl px-6 md:px-10 py-3.5 md:py-4 text-sm md:text-base text-cream-light placeholder:text-white/20 focus:outline-none transition-all shadow-2xl relative z-10 font-montserrat"
                            style={{ caretColor: '#f97316' }}
                        />
                        <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 pointer-events-none">
                            {searchSpinnerActive ? (
                                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined text-white/20 group-focus-within/search:text-primary transition-colors text-xl md:text-2xl">search</span>
                            )}
                        </div>
                    </div>
                )}
                <UserMenu user={user} />
            </div>
        </header>
    );
};

// LABEL: UserMenu — Component for displaying the user profile picture and dropdown menu
export const UserMenu = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [avatarIndex, setAvatarIndex] = useState(0);
    const menuRef = useRef();
    const navigate = useNavigate();

    const normalizeAvatarUrl = useCallback((value) => {
        const raw = typeof value === 'string' ? value.trim() : '';
        if (!raw) return '';
        if (!/(googleusercontent\.com|googleapis\.com)/i.test(raw)) return raw;
        let next = raw.replace(/=s\d+(-c)?$/i, '=s256-c').replace(/([?&])sz=\d+/i, '$1sz=256');
        if (!/[?&]sz=\d+/i.test(next)) next += next.includes('?') ? '&sz=256' : '?sz=256';
        return next;
    }, []);

    const avatarSources = useMemo(() => {
        const providerPhoto = Array.isArray(user?.providerData) ? user.providerData.find(entry => entry?.photoURL)?.photoURL : '';
        const raw = [user?.photoURL, providerPhoto, user?.reloadUserInfo?.photoUrl, user?.reloadUserInfo?.photoURL].filter(Boolean).map(v => String(v).trim());
        const expanded = raw.flatMap(src => {
            const norm = normalizeAvatarUrl(src);
            return norm && norm !== src ? [norm, src] : [src];
        });
        return Array.from(new Set(expanded));
    }, [normalizeAvatarUrl, user]);

    useEffect(() => {
        setAvatarIndex(0);
        setImgError(false);
    }, [avatarSources.join('|')]);

    useEffect(() => {
        const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        auth.signOut();
        localStorage.removeItem('faiora_logged_in');
        localStorage.removeItem('faiora_active_collection');
    };

    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-white/10 ring-4 ring-black/20 hover:ring-primary/40 transition-all duration-300 flex items-center justify-center bg-zinc-800">
                {avatarSources[avatarIndex] && !imgError ? (
                    <img alt="User" className="w-full h-full object-cover" src={avatarSources[avatarIndex]} onError={() => avatarIndex < avatarSources.length - 1 ? setAvatarIndex(v => v + 1) : setImgError(true)} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-burnt-orange/30 text-primary font-black text-sm">
                        {(user.displayName || "U").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-4 w-64 bg-slate-900 border border-white/20 rounded-3xl p-2 shadow-2xl z-[250] animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-white/5 mb-2">
                        <p className="text-white font-bold truncate">{user.displayName}</p>
                        <p className="text-white/40 text-xs truncate">{user.email}</p>
                    </div>
                    <button onClick={() => { setIsOpen(false); navigate('/profile'); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-2xl text-white/70 hover:text-primary transition-all text-sm group">
                        <span className="material-symbols-outlined text-xl group-hover:scale-110">person</span> Profile
                    </button>
                    <button onClick={() => { setIsOpen(false); navigate('/settings'); }} className="flex items-center gap-3 w-full p-3 hover:bg-white/10 rounded-2xl text-white/70 hover:text-primary transition-all text-sm group">
                        <span className="material-symbols-outlined text-xl group-hover:scale-110">settings</span> Settings
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 hover:bg-red-500/10 rounded-2xl text-red-400/70 hover:text-red-400 transition-all text-sm group mt-1">
                        <span className="material-symbols-outlined text-xl group-hover:scale-110">logout</span> Logout
                    </button>
                </div>
            )}
        </div>
    );
};

// LABEL: NotificationBanner — Displays a welcome message and cloud field count
const NotificationBanner = ({ user }) => {
    const [cloudFieldsCount, setCloudFieldsCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection(localStorage.getItem('faiora_active_collection') || 'tasks').doc(user.uid)
            .onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const n = Object.keys(data.notes || {}).length;
                    const q = Object.keys(data.quickTasks || {}).length;
                    setCloudFieldsCount(n + q);
                }
                setIsSyncing(false);
            }, () => setIsSyncing(false));
        return () => unsubscribe();
    }, [user]);

    if (!user) return null;

    return (
        <div className="px-6 md:px-12 pt-8 md:pt-12 flex items-center justify-between z-10 relative">
            <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    Welcome, <span className="text-primary">{user.displayName?.split(' ')[0] || 'User'}</span>
                </h1>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mt-1 flex items-center gap-2">
                    {isSyncing ? (
                        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    ) : (
                        <span className="material-symbols-outlined text-xs text-primary">cloud_done</span>
                    )}
                    {isSyncing ? 'Syncing Cloud...' : `${cloudFieldsCount} Items in Cloud`}
                </p>
            </div>
            <UserMenu user={user} />
        </div>
    );
};

// LABEL: LoginModal — Premium full-screen login screen with fiery aesthetics
// MODIFIED: 2026-04-22 - Replaced with premium version from index.html
export const LoginModal = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMode, setAuthMode] = useState('google');
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState('');
    const handleLogin = () => {
        setAuthBusy(true);
        setAuthError('');
        signInWithGoogle()
            .then(() => localStorage.setItem('faiora_logged_in', 'true'))
            .catch(e => {
                console.error("Login failed", e);
                setAuthError("Google login failed: " + (e?.message || "Unknown error"));
            })
            .finally(() => setAuthBusy(false));
    };
    const validateEmailPassword = () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setAuthError('Enter your email and password.');
            return null;
        }
        return trimmedEmail;
    };
    const handleEmailLogin = async (event) => {
        event.preventDefault();
        const trimmedEmail = validateEmailPassword();
        if (!trimmedEmail) {
            return;
        }
        setAuthBusy(true);
        setAuthError('');
        try {
            await auth.signInWithEmailAndPassword(trimmedEmail, password);
            localStorage.setItem('faiora_logged_in', 'true');
        } catch (e) {
            console.error('Email login failed', e);
            setAuthError(e?.code === 'auth/user-not-found' || e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential'
                ? 'Wrong email or password.'
                : (e?.message || 'Email login failed.'));
        } finally {
            setAuthBusy(false);
        }
    };
    const handleEmailRegister = async (event) => {
        event.preventDefault();
        const trimmedEmail = validateEmailPassword();
        if (!trimmedEmail) {
            return;
        }
        setAuthBusy(true);
        setAuthError('');
        try {
            const methods = await auth.fetchSignInMethodsForEmail(trimmedEmail);
            if (methods && methods.length > 0) {
                throw Object.assign(new Error('That email already exists. Please log in instead.'), { code: 'auth/email-already-in-use' });
            }
            await auth.createUserWithEmailAndPassword(trimmedEmail, password);
            localStorage.setItem('faiora_logged_in', 'true');
        } catch (e) {
            console.error('Email registration failed', e);
            setAuthError(
                e?.code === 'auth/email-already-in-use'
                    ? 'That email already exists. Please log in instead.'
                    : e?.code === 'auth/weak-password'
                        ? 'Password is too weak.'
                        : (e?.message || 'Email registration failed.')
            );
        } finally {
            setAuthBusy(false);
        }
    };

    /* welcome-back-modal - z-index raised above header */
    /* welcome-back-modal - raised z-index to 999 */
    /* FIX 2026-04-15: Raised to z-[999] (was 500) */
    return (
        <div id="faiora_auth_screen" className="faiora-auth-screen fixed inset-0 z-[999] flex items-center justify-center p-6 blur-overlay overflow-hidden">
            {/* auth_background_glow — Short Summary: Animated background pulses for visual depth */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-burnt-orange/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>
            
            {/* auth_panel — Short Summary: Glassmorphism container for the login form */}
            <div className="faiora-auth-panel glass-panel max-w-xl w-full p-12 rounded-[3.5rem] flex flex-col items-center text-center relative z-10 shadow-2xl border-white/10">
                <div className="mb-10 relative">
                     {/* flame_container — Short Summary: Animated flame icons above the title */}
                     <div className="flame-container flex justify-center !static h-16 mb-4">
                         {[...Array(3)].map((_, i) => (
                             <div key={i} className="flame-tongue !w-16 !h-24 mx-2" style={{animationDelay: (i * 0.2) + "s"}}></div>
                         ))}
                     </div>
                     <h2 className="faiora-auth-title text-8xl font-black text-cream-light italic tracking-tighter drop-shadow-[0_0_50px_rgba(249,115,22,0.4)]" style={{ fontFamily: 'inherit' }}>Faiora</h2>
                     <p className="faiora-auth-eyebrow text-primary font-bold uppercase tracking-[0.8em] text-sm mt-4">Ignite your productivity</p>
                </div>

                <p className="faiora-auth-copy text-cream-light/60 text-lg mb-8 max-w-md font-sans leading-relaxed">
                    Experience a fiery approach to digital planning. Sync your lists, tasks, and goals with Google or your Faiora password.
                </p>

                <div className="flex gap-2 mb-5 rounded-2xl bg-white/5 p-1 border border-white/10">
                    <button type="button" onClick={() => setAuthMode('google')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'google' ? 'bg-primary text-white' : 'text-white/45 hover:text-white'}`}>Google</button>
                    <button type="button" onClick={() => setAuthMode('email')} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'email' ? 'bg-primary text-white' : 'text-white/45 hover:text-white'}`}>Email</button>
                </div>

                {authMode === 'google' ? (
                    <button 
                        id="faiora_auth_google_btn"
                        onClick={handleLogin}
                        disabled={authBusy}
                        className="faiora-auth-button bg-white text-black py-5 px-8 md:px-10 rounded-3xl font-bold flex items-center justify-center flex-nowrap gap-3 md:gap-4 hover:bg-primary hover:text-white transition-all duration-500 hover:scale-105 active:scale-95 shadow-xl group mb-5 min-w-[260px] md:min-w-[300px] disabled:opacity-60"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 group-hover:invert transition-all" alt="Google" />
                        <span className="text-lg md:text-xl whitespace-nowrap leading-none">{authBusy ? 'Opening...' : 'Login with Google'}</span>
                    </button>
                ) : (
                    <form onSubmit={handleEmailLogin} className="w-full max-w-sm flex flex-col gap-3 mb-5">
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="w-full rounded-2xl bg-white/8 border border-white/10 px-5 py-4 text-black placeholder:text-black/45 caret-black outline-none focus:border-primary/60" autoComplete="email" />
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded-2xl bg-white/8 border border-white/10 px-5 py-4 text-black placeholder:text-black/45 caret-black outline-none focus:border-primary/60" autoComplete="current-password" />
                        <div className="grid grid-cols-2 gap-3">
                            <button disabled={authBusy} className="bg-primary text-white py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-dark transition-all disabled:opacity-60">{authBusy ? 'Working...' : 'Login'}</button>
                            <button type="button" onClick={handleEmailRegister} disabled={authBusy} className="bg-white/10 text-white py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/15 transition-all disabled:opacity-60">{authBusy ? 'Working...' : 'Register'}</button>
                        </div>
                        <p className="text-white/35 text-[11px] leading-relaxed">Google users can add a password after signing in once. New email accounts can register here.</p>
                    </form>
                )}

                {authError && <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-red-100 text-sm max-w-sm">{authError}</div>}

                <div className="faiora-auth-links flex gap-8 text-[10px] uppercase tracking-widest font-bold text-cream-light/20">
                    <a href="https://zeamarae.github.io/Faiora/#/privacy.html" className="hover:text-primary transition-colors">Privacy Policy</a>
                    <a href="https://zeamarae.github.io/Faiora/#/terms.html" className="hover:text-primary transition-colors">Terms of Service</a>
                </div>
            </div>
        </div>
    );
};

export const PasswordSetupPrompt = ({ user, onLinked }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const providerIds = (user?.providerData || []).map(provider => provider.providerId);
    const needsPassword = !!user?.email && providerIds.includes('google.com') && !providerIds.includes('password');
    if (!needsPassword) return null;
    const linkPassword = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');
        if (password.length < 8) {
            setError('Use at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await auth.currentUser.linkWithCredential(credential);
            await auth.currentUser.reload();
            const updatedUser = auth.currentUser;
            const providerIds = (updatedUser.providerData || []).map(provider => provider.providerId);
            const passwordHash = await hashPIN(password);
            await Promise.all([
                db.collection('users_public').doc(updatedUser.uid).set({
                    uid: updatedUser.uid,
                    email: updatedUser.email || '',
                    displayName: updatedUser.displayName || '',
                    photoURL: updatedUser.photoURL || '',
                    providerIds,
                    passwordHash,
                    passwordHashAlgorithm: 'SHA-256',
                    passwordLinkedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }),
                db.collection('faiora_metadata').doc(updatedUser.uid).set({
                    uid: updatedUser.uid,
                    email: updatedUser.email || '',
                    displayName: updatedUser.displayName || '',
                    photoURL: updatedUser.photoURL || '',
                    providerIds,
                    passwordHash,
                    passwordHashAlgorithm: 'SHA-256',
                    passwordLinkedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true })
            ]);
            setMessage('Password added. You can now log in with email and password too.');
            setPassword('');
            setConfirmPassword('');
            if (onLinked) onLinked(updatedUser);
        } catch (e) {
            console.error('Password link failed', e);
            setError(e?.code === 'auth/credential-already-in-use'
                ? 'That email/password credential is already used by another account.'
                : (e?.message || 'Could not add password.'));
        } finally {
            setBusy(false);
        }
    };
    return createPortal(
        <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] md:bottom-2    z-[2147483646] w-[min(92vw,390px)] rounded-[2rem] border border-primary/20 bg-[#120d12]/95 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary grid place-items-center shrink-0">
                    <span className="material-symbols-outlined">key</span>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-cream-light font-black text-sm">Add email password</h3>
                    <p className="text-white/45 text-xs leading-relaxed mt-1">Your Google account must add an email/password login before you can continue using the app.</p>
                </div>
            </div>
            <form onSubmit={linkPassword} className="mt-4 grid gap-3">
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" className="w-full rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-black placeholder:text-black/45 outline-none focus:border-primary/60" autoComplete="new-password" />
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" className="w-full rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-black placeholder:text-black/45 outline-none focus:border-primary/60" autoComplete="new-password" />
                {error && <div className="text-red-200 text-xs">{error}</div>}
                {message && <div className="text-primary text-xs">{message}</div>}
                <button disabled={busy} className="rounded-2xl bg-primary px-4 py-3 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60">{busy ? 'Adding...' : 'Add Password'}</button>
            </form>
        </div>,
        document.body
    );
};

// LABEL: ConfirmationModal — Shared dialog for destructive or critical actions
// ADDED: 2026-04-22 - Extracted from index.html
export const ConfirmationModal = ({ title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) => {
    /* confirmation-modal - z-index raised above header */
    /* confirmation-modal - raised z-index to 999 */
    /* FIX 2026-04-15: Raised to z-[999] (was 500) */
    return (
        <div id="faiora_confirmation_modal" className="fixed inset-0 z-[999] flex items-center justify-center p-6 blur-overlay animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/40" onClick={onCancel}></div>
            {/* confirmation_card — Short Summary: Centered dialog box for confirmations */}
            <div className="faiora-confirmation-card glass-panel max-w-sm w-full p-8 rounded-[2.5rem] relative z-10 shadow-2xl border-white/5 animate-in zoom-in-95 duration-300">
                <h3 className="text-xl font-bold text-cream-light mb-2">{title}</h3>
                <p className="text-cream-light/60 text-sm mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button 
                        id="confirm_cancel_btn"
                        onClick={onCancel} 
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-cream-light/60 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                    >
                        {cancelText}
                    </button>
                    <button 
                        id="confirm_submit_btn"
                        onClick={() => { onConfirm(); onCancel(); }} 
                        className={`flex-1 py-4 ${type === 'danger' ? 'bg-red-500' : 'bg-primary'} text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
