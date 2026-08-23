import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout, Header } from '../components/Common';
import { formatTime, getAlarmScheduleDate, getWaitTimeText, ALARM_HOURS, ALARM_MINUTES, ALARM_AMPM } from '../core/config';

// LABEL: AlarmWheelColumn — Samsung-inspired infinite scroll wheel for time selection
// MODIFIED: 2026-04-22 - Extracted from index.html and added haptic feedback
const AlarmWheelColumn = React.memo(({ values, selected, onChange, label, infinite = false }) => {
    const scrollRef = useRef(null);
    const [currentIdx, setCurrentIdx] = useState(-1);
    const isManualScroll = useRef(false);
    const isProgrammaticScroll = useRef(false);
    const isJumping = useRef(false);
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
            scrollRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
            
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
            if (navigator.vibrate) try { navigator.vibrate(1); } catch(e) {}
        }

        momentumRef.current = requestAnimationFrame(() => runMomentum(velocity * 0.95));
    };

    useEffect(() => {
        if (!scrollRef.current || isManualScroll.current || isJumping.current || momentumRef.current) return;
        
        const initTimer = setTimeout(() => {
            if (!scrollRef.current) return;
            const baseIdx = values.findIndex(v => String(v) === String(selected));
            if (baseIdx === -1) return;
            
            const targetPos = infinite ? (baseIdx + offset) * itemHeight : (baseIdx * itemHeight);
            const finalScrollTop = infinite ? targetPos - itemHeight : targetPos;
            
            const cIdx = Math.round(finalScrollTop / itemHeight) + (infinite ? 1 : 0);
            setCurrentIdx(cIdx);
            lastSentValue.current = selected;

            if (Math.abs(scrollRef.current.scrollTop - finalScrollTop) > 1) {
                isProgrammaticScroll.current = true;
                scrollRef.current.scrollTop = finalScrollTop;
                setTimeout(() => { isProgrammaticScroll.current = false; }, 150);
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
        if (scrollRef.current.setPointerCapture) try { scrollRef.current.setPointerCapture(e.pointerId); } catch(err) {}
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
        if (scrollRef.current.releasePointerCapture) try { scrollRef.current.releasePointerCapture(e.pointerId); } catch(err) {}
        if (Math.abs(dragRef.current.velocity) > 2) runMomentum(dragRef.current.velocity);
        else snapToCenter(scrollRef.current.scrollTop);
    };

    return (
        <div className="flex flex-col items-center relative overflow-hidden">
            {label && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/40 mb-2">{label}</p>}
            {/* wheel_scroll_container — Short Summary: Vertically scrollable area for time digits */}
            <div
                id={`alarm_wheel_${label || 'time'}`}
                ref={scrollRef}
                onScroll={handleScroll}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="h-[180px] w-full overflow-y-hidden no-scrollbar select-none relative z-10 touch-none pointer-events-auto"
                style={{ scrollbarWidth: 'none', perspective: '800px' }}
            >
                {!infinite && <div className="h-[60px] pointer-events-none" />}
                {displayValues.map((v, i) => {
                    const isActive = i === currentIdx;
                    return (
                        <div
                            key={`item-${v}-${i}`}
                            className={`h-[60px] flex items-center justify-center text-4xl font-display select-none transition-[color,transform,opacity] duration-200 ${isActive ? 'text-primary' : 'text-cream-light/30'}`}
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: isActive ? 'scale(1.1) translateZ(40px)' : 'scale(0.85) translateZ(0px)',
                                opacity: isActive ? 1 : 0.45
                            }}
                        >
                            {v}
                        </div>
                    );
                })}
                {!infinite && <div className="h-[60px] pointer-events-none" />}
            </div>
        </div>
    );
});

// LABEL: AlarmDayCircle — Circular button for selecting recurring days of the week
const AlarmDayCircle = ({ day, active, onToggle }) => {
    const label = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day];
    return (
        <button
            type="button"
            onClick={() => onToggle(day)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black transition-all border ${active ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' : 'bg-white/5 text-cream-light/40 border-white/5 hover:bg-white/10'}`}
        >
            {label}
        </button>
    );
};

// LABEL: ClockPage — Minimalist Samsung-style UI for clock, pomodoro, and alarms
// MODIFIED: 2026-04-22 - Extracted from index.html and modularized
const ClockPage = ({ user, onOpenCreator, alarms = [], onAddAlarm, onToggleAlarm, onDeleteAlarm, pomodoroTime, setPomodoroTime, isPomodoroActive, setIsPomodoroActive, pomodoroSessions, alarmOverlayPermission = false, onRequestAlarmOverlayPermission, onRefreshAlarmOverlayPermission, hasNativeAlarmBridge = false, alarmsOnly = false }) => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const searchQuery = (queryParams.get('search') || '').toLowerCase();
    const [now, setNow] = useState(new Date());

    const filteredAlarms = useMemo(() => {
        if (!searchQuery) return alarms;
        return alarms.filter(a => 
            (a.label || 'Alarm').toLowerCase().includes(searchQuery) ||
            (a.time || '').toLowerCase().includes(searchQuery)
        );
    }, [alarms, searchQuery]);
    
    const [label, setLabel] = useState('');
    const [alarmTime, setAlarmTime] = useState('07:00');
    const [selectedDays, setSelectedDays] = useState([]);
    const [snoozeTime, setSnoozeTime] = useState(5);
    const [editingAlarmId, setEditingAlarmId] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const pomodoroSectionRef = useRef(null);
    const sortedAlarms = useMemo(() => (
        [...alarms].sort((a, b) => {
            if (!!a.enabled !== !!b.enabled) return a.enabled ? -1 : 1;
            return String(a.time || '').localeCompare(String(b.time || ''));
        })
    ), [alarms]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        onRefreshAlarmOverlayPermission?.();
    }, [onRefreshAlarmOverlayPermission]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('focus') !== 'pomodoro') return;
        const timer = setTimeout(() => {
            pomodoroSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 180);
        return () => clearTimeout(timer);
    }, [location.search]);

    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();
    const secondDeg = seconds * 6;
    const minuteDeg = minutes * 6 + seconds * 0.1;
    const hourDeg = (hours % 12) * 30 + minutes * 0.5;

    const handleStartAdd = () => {
        setEditingAlarmId(null);
        setLabel('');
        setAlarmTime('07:00');
        setSelectedDays([]);
        setSnoozeTime(5);
        setIsFormOpen(true);
    };

    const handleStartEdit = (a) => {
        setEditingAlarmId(a.id);
        setLabel(a.label || '');
        setAlarmTime(a.time || '07:00');
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
            label: (label || 'Alarm').trim(),
            time: alarmTime,
            days: selectedDays,
            snooze: snoozeTime,
            repeatDaily: selectedDays.length > 0
        });
        handleCancelForm();
    };

    return (
        <Layout onOpenCreator={onOpenCreator} showFab={true} onFabClick={handleStartAdd} pomodoroTime={pomodoroTime} isPomodoroActive={isPomodoroActive}>
            <div className={`${alarmsOnly ? 'max-w-4xl' : 'max-w-7xl'} mx-auto w-full px-4 md:px-16 pt-0 pb-96`}>
                <div className="sticky top-0 z-[100] py-4 px-4 md:px-16 mb-6">
                    <Header user={user} subtitle={alarmsOnly ? 'Manage every alarm' : 'Manage your alarms'} showSearch={true} desktopSearchPlaceholder="Search alarms..." mobileSearchPlaceholder="Search alarms..." />
                </div>
                
                <div className="flex items-center mt-24 md:mt-10 mb-10 gap-4">
                    <h1 className="text-xl md:text-3xl font-display font-bold text-cream-light tracking-[0.15em] md:tracking-[0.25em] uppercase">{alarmsOnly ? 'Alarms' : 'Clock'}</h1>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent"></div>
                    
                    {hasNativeAlarmBridge && (
                        <button 
                            id="alarm_overlay_permission_btn"
                            onClick={onRequestAlarmOverlayPermission}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${alarmOverlayPermission ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-primary/20 bg-primary/5 text-primary'} hover:scale-110 active:scale-95`}
                            title={alarmOverlayPermission ? 'Overlay Active' : 'Enable Overlay Access'}
                        >
                            <span className="material-symbols-outlined text-lg">{alarmOverlayPermission ? 'verified' : 'error'}</span>
                        </button>
                    )}
                </div>
                
                <div id="faiora_clock_grid" className={alarmsOnly ? 'grid grid-cols-1 gap-10 items-start' : 'grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-start'}>
                    {!alarmsOnly && <div id="faiora_clock_section" className="space-y-8">
                        {/* clock_card — Short Summary: Beautiful analog and digital clock display */}
                        <div id="faiora_clock_card" className="faiora-clock-card glass-panel rounded-[2.5rem] p-6 md:p-10 flex flex-col items-center justify-center space-y-10">
                            <div id="faiora_analog_clock" className="analog-clock flex items-center justify-center relative">
                                <div className="absolute w-[2px] h-[108px] bg-white origin-bottom rounded-full bottom-[50%]" style={{ transform: `rotate(${minuteDeg}deg)` }}></div>
                                <div className="absolute w-[4px] h-[72px] bg-white origin-bottom rounded-full bottom-[50%]" style={{ transform: `rotate(${hourDeg}deg)` }}></div>
                                <div className="absolute w-[1px] h-[117px] bg-primary origin-bottom rounded-full bottom-[50%] glow-orange" style={{ transform: `rotate(${secondDeg}deg)` }}></div>
                                <div className="w-3 h-3 bg-primary border-2 border-white rounded-full z-10"></div>
                            </div>
                            <div className="text-center">
                                <h2 id="digital_clock_time" className="text-6xl font-display text-cream-light mb-2">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
                                <p id="digital_clock_date" className="text-primary/60 font-sans tracking-[0.2em] uppercase text-sm font-bold">{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>

                        <div id="faiora_pomodoro_header" className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-cream-light/90 uppercase tracking-[0.25em]">Focus Mode</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">{pomodoroSessions} Sessions</span>
                            </div>
                        </div>
                        {/* pomodoro_card — Short Summary: Interactive circular timer for focused work */}
                        <div id="faiora_pomodoro_card" ref={pomodoroSectionRef} className="faiora-pomodoro-card glass-panel p-6 md:p-10 rounded-[2.5rem] flex flex-col items-center justify-center space-y-8 relative overflow-hidden group">
                            <div id="faiora_pomodoro_timer_circle" className="relative w-64 h-64 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/[0.03]" />
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#pomoGradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray="289.027" strokeDashoffset={289.027 - (289.027 * ((1500 - pomodoroTime) / 1500))} className="transition-all duration-1000 ease-linear" />
                                    <defs><linearGradient id="pomoGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#ef4444" /></linearGradient></defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <div id="pomodoro_time_display" className={`text-6xl font-display font-bold text-cream-light tracking-tighter ${isPomodoroActive ? 'animate-pulse' : ''}`}>{Math.floor(pomodoroTime / 60)}:{String(pomodoroTime % 60).padStart(2, '0')}</div>
                                    <p className="text-[10px] font-bold text-cream-light/30 uppercase tracking-[0.2em] mt-2">Focus Mode</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 relative z-10">
                                <button id="pomodoro_toggle_btn" onClick={() => setIsPomodoroActive(!isPomodoroActive)} className={`w-16 h-16 flex items-center justify-center rounded-full transition-all duration-300 shadow-xl ${isPomodoroActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                                    <span className="material-symbols-outlined text-4xl font-bold">{isPomodoroActive ? 'pause' : 'play_arrow'}</span>
                                </button>
                                <button id="pomodoro_reset_btn" onClick={() => { setIsPomodoroActive(false); setPomodoroTime(25 * 60); }} className="w-16 h-16 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-slate-200 transition-all border border-white/5 hover:bg-white/10">
                                    <span className="material-symbols-outlined text-3xl">refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>}

                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            {searchQuery ? (
                                <h2 className="text-xs md:text-sm font-bold uppercase tracking-[0.28em] text-primary/75">Search Results ({filteredAlarms.length})</h2>
                            ) : (
                                <h2 className="text-xs md:text-sm font-bold uppercase tracking-[0.28em] text-primary/75">Your Alarms</h2>
                            )}
                        </div>

                        {isFormOpen && (() => {
                            const [h24, m] = alarmTime.split(':').map(Number);
                            const ampmVal = h24 >= 12 ? 'PM' : 'AM';
                            const h12Val = h24 % 12 || 12;

                            const updateTimeFromWheels = (h12, min, ampm) => {
                                let finalH = parseInt(h12);
                                if (ampm === 'PM' && finalH < 12) finalH += 12;
                                if (ampm === 'AM' && finalH === 12) finalH = 0;
                                setAlarmTime(`${String(finalH).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
                            };

                            const toggleDay = (d) => {
                                setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
                            };

                            return (
                                <div 
                                    className="fixed -inset-10 bg-black/40 backdrop-blur-3xl z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-500"
                                    onClick={handleCancelForm}
                                >
                                    {/* alarm_form_modal — Short Summary: Samsung-inspired modal for creating/editing alarms */}
                                    <div 
                                        id="alarm_form_modal_samsung"
                                        className="glass-panel-dark rounded-[3rem] p-8 max-w-[380px] w-full border border-white/10 bg-[#121212] animate-in zoom-in-95 duration-300 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <form onSubmit={handleSubmitAlarm} className="space-y-8">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-[11px] font-black text-primary tracking-[0.3em] uppercase">{editingAlarmId ? 'Edit Alarm' : 'New Alarm'}</h3>
                                                <button id="alarm_form_close_btn" type="button" onClick={handleCancelForm} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-cream-light/20 hover:text-white transition-all">
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-center gap-4 py-4 relative">
                                                <div className="absolute top-1/2 left-0 right-0 h-[70px] -translate-y-1/2 bg-white/[0.03] border-y border-white/5 pointer-events-none rounded-xl" />
                                                
                                                <div className="w-20">
                                                    <AlarmWheelColumn 
                                                        values={ALARM_HOURS} 
                                                        selected={h12Val} 
                                                        onChange={(v) => updateTimeFromWheels(v, m, ampmVal)} 
                                                        infinite={true}
                                                        label="Hour"
                                                    />
                                                </div>
                                                <div className="text-4xl font-display text-primary/40 mt-1">:</div>
                                                <div className="w-20">
                                                    <AlarmWheelColumn 
                                                        values={ALARM_MINUTES} 
                                                        selected={String(m).padStart(2, '0')} 
                                                        onChange={(v) => updateTimeFromWheels(h12Val, v, ampmVal)} 
                                                        infinite={true}
                                                        label="Min"
                                                    />
                                                </div>
                                                <div className="w-2" />
                                                <div className="w-20">
                                                    <AlarmWheelColumn 
                                                        values={ALARM_AMPM} 
                                                        selected={ampmVal} 
                                                        onChange={(v) => updateTimeFromWheels(h12Val, m, v)} 
                                                        label="AM/PM"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center px-1">
                                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cream-light/30">Repeat Days</p>
                                                        <p className="text-[11px] font-bold text-primary tracking-widest uppercase">
                                                            {selectedDays.length === 0 ? 'Once' : selectedDays.length === 7 ? 'Everyday' : `${selectedDays.length} Days`}
                                                        </p>
                                                    </div>
                                                    <div id="alarm_days_selector" className="flex justify-between gap-1">
                                                        {[0, 1, 2, 3, 4, 5, 6].map(d => (
                                                            <AlarmDayCircle key={d} day={d} active={selectedDays.includes(d)} onToggle={toggleDay} />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cream-light/30 px-1">Title</p>
                                                    <div className="px-1">
                                                        <input 
                                                            id="alarm_title_input"
                                                            value={label} 
                                                            onChange={(e) => setLabel(e.target.value)} 
                                                            placeholder="Add Title"
                                                            className="w-full bg-transparent text-lg font-medium text-cream-light placeholder:text-white/10 outline-none border-b border-white/5 pb-2 focus:border-primary/40 transition-colors"
                                                        />
                                                        <p className="text-[10px] font-bold text-primary/60 mt-2 uppercase tracking-widest px-1">
                                                            {(() => {
                                                                try {
                                                                    const target = getAlarmScheduleDate(alarmTime, selectedDays);
                                                                    return `Will ring on ${target.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`;
                                                                } catch(e) { return ''; }
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div id="alarm_snooze_toggle" className="flex items-center justify-between glass-panel p-5 rounded-[1.75rem] border-white/5 bg-white/[0.02]">
                                                    <div className="flex flex-col">
                                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cream-light/30">Snooze</p>
                                                        <p className="text-[10px] font-bold text-primary tracking-widest uppercase mt-1">Fixed 5 mins</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setSnoozeTime(snoozeTime > 0 ? 0 : 5)}
                                                        className={`w-14 h-8 rounded-full transition-all relative ${snoozeTime > 0 ? 'bg-primary/40' : 'bg-white/10'}`}
                                                    >
                                                        <div className={`absolute top-1.5 w-5 h-5 rounded-full transition-all shadow-md ${snoozeTime > 0 ? 'left-8 bg-primary shadow-primary/40' : 'left-1.5 bg-white/20'}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-2">
                                                <button id="alarm_form_cancel_btn" type="button" onClick={handleCancelForm} className="flex-1 py-5 rounded-[1.75rem] bg-white/5 text-cream-light/30 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all border border-white/5">Cancel</button>
                                                <button id="alarm_form_save_btn" type="submit" className="flex-1 py-5 rounded-[1.75rem] bg-primary text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 hover:bg-primary-dark transition-all active:scale-95">Save</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            );
                        })()}

                        <div id="faiora_alarm_list" className="space-y-3">
                            {(() => {
                                const enabledAlarms = sortedAlarms.filter(a => a.enabled);
                                if (enabledAlarms.length === 0 || isFormOpen) return null;
                                
                                const alarmDates = enabledAlarms.map(a => ({ 
                                    label: a.label, 
                                    date: getAlarmScheduleDate(a.time, a.days) 
                                })).sort((a, b) => a.date - b.date);
                                
                                const next = alarmDates[0];
                                return (
                                    <div className="text-center py-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <p className="text-sm font-black text-primary uppercase tracking-[0.4em] glow-orange">
                                            {getWaitTimeText(next.date)}
                                        </p>
                                        <p className="text-[10px] font-bold text-cream-light/30 uppercase tracking-widest mt-1">
                                            {next.label || 'TITLE'} • {next.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                );
                            })()}

                            {sortedAlarms.length === 0 && !isFormOpen && (
                                <div id="no_alarms_placeholder" className="text-center py-12 text-cream-light/20">
                                    <span className="material-symbols-outlined text-5xl mb-4">notifications_off</span>
                                    <p className="text-sm tracking-widest uppercase">No alarms set</p>
                                </div>
                            )}
                            {sortedAlarms.map(a => (
                                /* alarm_item_card — Short Summary: List entry for an alarm with quick toggle and delete */
                                <div 
                                    key={a.id} 
                                    id={`alarm_item_${a.id}`}
                                    className={`glass-panel rounded-[2rem] p-6 flex items-center justify-between transition-all group hover:bg-white/[0.04] cursor-pointer ${!a.enabled ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                    onClick={() => handleStartEdit(a)}
                                >
                                    <div className="flex-1">
                                        <div className="text-4xl font-display tracking-tight text-cream-light group-hover:text-primary transition-colors">
                                            {formatTime(a.time)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold text-cream-light/40 uppercase tracking-widest">{a.label || 'TITLE'}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                            <span className="text-xs font-semibold text-primary/60 uppercase tracking-widest">
                                                {a.days && a.days.length > 0 
                                                    ? (a.days.length === 7 ? 'Everyday' : a.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', '))
                                                    : 'Once'
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <button 
                                            id={`delete_alarm_btn_${a.id}`}
                                            onClick={(e) => { e.stopPropagation(); onDeleteAlarm(a.id); }}
                                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all flex items-center justify-center hover:bg-red-500/20"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                        
                                        <button 
                                            id={`toggle_alarm_btn_${a.id}`}
                                            onClick={(e) => { e.stopPropagation(); onToggleAlarm(a.id); }}
                                            className={`w-14 h-8 rounded-full transition-all relative ${a.enabled ? 'bg-primary/40' : 'bg-white/10'}`}
                                        >
                                            <div className={`absolute top-1.5 w-5 h-5 rounded-full transition-all shadow-md ${a.enabled ? 'left-8 bg-primary shadow-primary/40' : 'left-1.5 bg-white/20'}`} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

// LABEL: SamsungAlarmOverlay — Full-screen ringing interface with drag-to-dismiss gesture
// MODIFIED: 2026-04-22 - Extracted from index.html and modularized
const SamsungAlarmOverlay = ({ alarm, onDismiss }) => {
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const threshold = 140; 
    
    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX === undefined) return;

        const dx = clientX - window.innerWidth / 2;
        const dy = clientY - (window.innerHeight * 0.75); 
        setDragPos({ x: dx, y: dy });
    };

    const handlePointerUp = () => {
        const dist = Math.sqrt(dragPos.x ** 2 + dragPos.y ** 2);
        if (dist > threshold) {
            onDismiss();
        } else {
            setDragPos({ x: 0, y: 0 });
        }
        setIsDragging(false);
    };

    const dist = Math.sqrt(dragPos.x ** 2 + dragPos.y ** 2);
    const isTargetReached = dist > threshold;
    const currentFillScale = (Math.min(dist, threshold) / threshold) * 3.5;

    return (
        <div id="faiora_alarm_ringing_overlay" className="fixed inset-0 z-[2000] bg-black flex flex-col items-center justify-start overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-primary/15 to-transparent blur-[120px] pointer-events-none opacity-50" />
            
            <div className="relative text-center mt-32 z-10">
                <p id="alarm_overlay_status" className="text-primary font-black uppercase tracking-[0.4em] text-[12px] mb-6 animate-pulse">Alarm Ringing</p>
                <h1 id="alarm_overlay_time" className="text-8xl font-display font-light text-cream-light tracking-tight mb-4 scale-x-105">
                    {alarm.time || '00:00'}
                </h1>
                <h2 id="alarm_overlay_label" className="text-3xl font-display italic text-white/50 tracking-wide">{alarm.label || 'Alarm'}</h2>
            </div>

            <div id="alarm_interaction_area" className="absolute bottom-24 left-0 right-0 flex flex-col items-center z-20">
                <div className="relative flex items-center justify-center h-72 w-full">
                    {/* Ringing Visualizer (Samsung-style) */}
                    <div className="absolute w-32 h-32 rounded-full border-2 border-primary/20 animate-[ping_2s_infinite]" />
                    <div className="absolute w-32 h-32 rounded-full border-2 border-primary/10 animate-[ping_2s_infinite_0.5s]" />
                    
                    {/* Interaction Button — Short Summary: Draggable circle to dismiss the alarm */}
                    <div 
                        id="alarm_dismiss_drag_btn"
                        onPointerDown={(e) => { setIsDragging(true); if(e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId); }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all cursor-grab active:cursor-grabbing z-30 shadow-[0_0_50px_rgba(249,115,22,0.3)] ${isDragging ? 'scale-110' : 'hover:scale-105'}`}
                        style={{ 
                            transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
                            background: isTargetReached ? '#ef4444' : 'rgba(255,255,255,0.05)',
                            border: `2px solid ${isTargetReached ? '#ef4444' : 'rgba(255,255,255,0.1)'}`
                        }}
                    >
                        <span className={`material-symbols-outlined text-5xl transition-colors ${isTargetReached ? 'text-white' : 'text-primary'}`}>close</span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="w-32 h-32 rounded-full border-2 border-white/10" />
                    </div>
                </div>
                <p id="alarm_drag_hint" className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mt-8">Swipe in any direction to dismiss</p>
            </div>
        </div>
    );
};
export { ClockPage, SamsungAlarmOverlay };
