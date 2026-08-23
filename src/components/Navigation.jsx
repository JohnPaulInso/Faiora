
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Routes, Route, Navigate } from 'react-router-dom';

const normalizeRouteLocation = (loc) => {
    if (!loc || typeof loc !== 'object') return { pathname: '/', search: '', hash: '', state: null, key: 'default' };
    return { ...loc, pathname: loc.pathname && loc.pathname !== '' ? loc.pathname : '/' };
};

// LABEL: NAVIGATION — Desktop Sidebar & Mobile Bottom Nav
export const ResponsiveNav = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    
    const createSparks = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 10; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            const tx = (Math.random() - 0.5) * 140;
            const ty = -Math.random() * 80 - 40;
            spark.style.setProperty('--tx', `${tx}px`);
            spark.style.setProperty('--ty', `${ty}px`);
            spark.style.left = `${centerX}px`;
            spark.style.top = `${centerY}px`;
            document.body.appendChild(spark);
            setTimeout(() => spark.remove(), 800);
        }
    };

    const NavLink = ({ to, icon, label, fillOnActive = false }) => (
        <Link 
            to={to} 
            onClick={createSparks}
            className={`nav-item-animation flex flex-col items-center justify-center group relative w-16 h-16 md:w-full md:aspect-square ${isActive(to) ? 'text-primary' : 'text-slate-500 hover:text-primary/70 scale-95 hover:scale-100'}`}
        >
            <span className="material-symbols-outlined text-3xl md:text-3xl" style={fillOnActive && isActive(to) ? {fontVariationSettings: '"FILL" 1'} : {}}>{icon}</span>
            <span className="absolute left-full ml-4 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 -translate-x-4 pointer-events-none transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 hidden md:block whitespace-nowrap z-[100] shadow-xl">{label}</span>
        </Link>
    );

    return (
        <React.Fragment>
            {/* Mobile Bottom Nav */}
            <nav className="faiora-mobile-nav fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center py-3 z-50 px-4 md:hidden transition-opacity duration-300">
                <NavLink to="/" icon="home" label="Home" />
                <NavLink to="/notes" icon="grid_view" label="Notes" />
                <NavLink to="/quick-tasks" icon="checklist" label="Quick Tasks" />
                <NavLink to="/alarms" icon="alarm" label="Alarms" />
                <NavLink to="/calendar" icon="calendar_month" label="Calendar" />
            </nav>

            {/* Desktop Left Sidebar */}
            <nav id="faiora_desktop_sidebar" className="faiora-desktop-sidebar hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex-col items-center py-12 gap-8 z-50">
                <div id="faiora_sidebar_logo_container" className="mb-4">
                    <div className="text-primary mb-6"><span className="material-symbols-outlined text-4xl font-light glow-orange" style={{fontVariationSettings: '"FILL" 1'}}>local_fire_department</span></div>
                </div>
                <NavLink to="/" icon="home" label="Home" />
                <NavLink to="/notes" icon="grid_view" label="Notes" />
                <NavLink to="/quick-tasks" icon="checklist" label="Quick Tasks" />
                <NavLink to="/alarms" icon="alarm" label="Alarms" />
                <NavLink to="/calendar" icon="calendar_month" label="Calendar" />
            </nav>
        </React.Fragment>
    );
};

// LABEL: TRANSITION-MANAGER — Handles smooth page transitions with fire wipe effect
export const TransitionManager = ({ children, onTransitionStart, onTransitionEnd }) => {
    const FIRE_WIPE_DURATION_MS = 1400; 
    const location = useLocation();
    const [displayLocation, setDisplayLocation] = useState(() => normalizeRouteLocation(location));
    const [isWiping, setIsWiping] = useState(false);
    const [isDissolving, setIsDissolving] = useState(false);
    const [isFadingIn, setIsFadingIn] = useState(false);
    const [transitionKey, setTransitionKey] = useState(0);

    const playFireSFX = () => {
        const audio = new Audio('fire_transition_sfx.mp3');
        audio.volume = 0.6;
        audio.play().catch(e => {});
        
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
        }, 1000);
    };

    const lastPath = useRef(location.pathname || '/');
    const timers = useRef([]);

    const clearTimers = () => {
        timers.current.forEach(t => clearTimeout(t));
        timers.current = [];
    };

    const startTransition = (newLoc) => {
        clearTimers();
        setIsWiping(true);
        setIsDissolving(true);
        setIsFadingIn(false);
        setTransitionKey(prev => prev + 1);
        if (onTransitionStart) setTimeout(() => onTransitionStart(), 0);
        playFireSFX();

        const t1 = setTimeout(() => {
            setDisplayLocation(normalizeRouteLocation(newLoc));
        }, 450);

        const t2 = setTimeout(() => {
            setIsDissolving(false);
            setIsFadingIn(true);
        }, 750);

        const t3 = setTimeout(() => {
            if (onTransitionEnd) setTimeout(() => onTransitionEnd(), 0);
        }, 600);

        const t4 = setTimeout(() => {
            setIsWiping(false);
        }, FIRE_WIPE_DURATION_MS);

        const t5 = setTimeout(() => {
            setIsFadingIn(false);
        }, 1500);
        
        timers.current = [t1, t2, t3, t4, t5];
    };

    useEffect(() => {
        setDisplayLocation(normalizeRouteLocation(location));
        lastPath.current = location.pathname || '/';
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
        const path = location.pathname || '/';
        if (path !== lastPath.current) {
            const params = new URLSearchParams(location.search);
            if (params.has('search')) {
                setDisplayLocation(normalizeRouteLocation(location));
                lastPath.current = path;
                return;
            }
            lastPath.current = path;
            startTransition(location);
        }
    }, [location.pathname]);

    const dissolveClass = isDissolving ? 'route-dissolve-out' : (isFadingIn ? 'route-dissolve-in' : '');

    return (
        <div className="relative w-full h-full overflow-hidden">
            {isWiping && (
                <div key={transitionKey} className="fire-wipe-overlay fire-wipe-active">
                    <div className="fire-wipe-sprite"></div>
                </div>
            )}
            <div key={displayLocation.pathname || '/'} className={"app-route-shell w-full h-full min-h-0 flex flex-col " + dissolveClass}>
                <Routes location={normalizeRouteLocation(displayLocation)}>
                    {children}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
};

export { ResponsiveNav, TransitionManager };
