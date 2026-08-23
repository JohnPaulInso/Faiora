import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Layout, Header } from '../components/Common';
import { 
    formatDateLocal, 
    parseDateString, 
    formatReminderDate, 
    formatDateMinimal, 
    formatTaskText, 
    formatTime 
} from '../core/config';

// LABEL: PAGE-CALENDAR — Short Summary: Monthly calendar view with task search, agenda sidebar, and day details
const CalendarPage = ({ 
    user, 
    notes, 
    quickTasks = [], 
    onOpenCreator, 
    onEditNote, 
    onToggleQuickTask, 
    onEditQuickTask, 
    onAddQuickTask, 
    pomodoroTime, 
    isPomodoroActive 
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [taskSearchQuery, setTaskSearchQuery] = useState('');
    const quickTaskMatchesRef = useRef(null);
    const today = new Date();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

    const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelected = (d) => d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

    // Build reminder lookup: date string -> items array (notes + quick tasks)
    const remindersByDate = useMemo(() => {
        const map = {};
        // Note Reminders
        (notes || []).forEach(note => {
            if (!note.reminderDate) return;
            const d = parseDateString(note.reminderDate);
            if (d) {
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!map[key]) map[key] = [];
                map[key].push({ ...note, type: 'note' });
            }
        });
        // Quick Tasks
        (quickTasks || []).forEach(task => {
            if (!task.dueDate) return;
            const d = parseDateString(task.dueDate);
            if (d) {
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                if (!map[key]) map[key] = [];
                map[key].push({ ...task, type: 'quickTask' });
            }
        });
        return map;
    }, [notes, quickTasks]);

    const getRemindersForDay = (day) => {
        const key = `${year}-${month}-${day}`;
        return remindersByDate[key] || [];
    };

    const selectedDayLabel = selectedDate.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const dayReminders = getRemindersForDay(selectedDate.getDate());

    // Upcoming reminders (from today onwards)
    const upcomingReminders = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const allItems = [
            ...(notes || []).filter(n => n.reminderDate).map(n => ({ ...n, type: 'note', sortDate: parseDateString(n.reminderDate) })),
            ...(quickTasks || []).filter(t => t.dueDate).map(t => ({ ...t, type: 'quickTask', sortDate: parseDateString(t.dueDate) }))
        ];
        return allItems
            .filter(item => item.sortDate >= now)
            .sort((a, b) => (a.sortDate || 0) - (b.sortDate || 0))
            .slice(0, 8);
    }, [notes, quickTasks]);

    const normalizedTaskSearch = taskSearchQuery.trim().toLowerCase();
    const quickTaskSearchResults = useMemo(() => {
        if (!normalizedTaskSearch) return [];

        const todayIso = formatDateLocal();
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowIso = formatDateLocal(tomorrowDate);
        const getTaskSortTime = (task) => {
            if (!task?.dueDate) return Number.MAX_SAFE_INTEGER;
            const parsed = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`).getTime();
            return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
        };

        return (quickTasks || [])
            .filter(task => {
                if (!task?.dueDate) return false;
                const dueDateObj = parseDateString(task.dueDate);
                const dueLabels = [
                    task.dueDate,
                    formatReminderDate(task.dueDate),
                    formatDateMinimal(task.dueDate)
                ];
                if (dueDateObj && !Number.isNaN(dueDateObj.getTime())) {
                    dueLabels.push(dueDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
                    dueLabels.push(dueDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                }
                if (task.dueDate === todayIso) dueLabels.push('today');
                if (task.dueDate === tomorrowIso) dueLabels.push('tomorrow');

                const haystack = [
                    formatTaskText(task.text),
                    dueLabels.join(' ')
                ].join(' ').toLowerCase();
                return haystack.includes(normalizedTaskSearch);
            })
            .sort((a, b) => getTaskSortTime(a) - getTaskSortTime(b))
            .slice(0, 12);
    }, [normalizedTaskSearch, quickTasks]);

    const jumpToQuickTaskDate = useCallback((task) => {
        if (!task?.dueDate) return;
        const nextDate = parseDateString(task.dueDate);
        if (!nextDate || Number.isNaN(nextDate.getTime())) return;
        setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
        setSelectedDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
        setTaskSearchQuery('');
    }, []);

    const handleQuickTaskSearchSubmit = useCallback((query) => {
        const trimmed = String(query || '').trim();
        if (!trimmed) return;
        if (quickTaskSearchResults.length > 0) {
            jumpToQuickTaskDate(quickTaskSearchResults[0]);
        }
    }, [jumpToQuickTaskDate, quickTaskSearchResults]);

    useEffect(() => {
        if (!normalizedTaskSearch || !quickTaskMatchesRef.current) return;
        const timer = setTimeout(() => {
            quickTaskMatchesRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 120);
        return () => clearTimeout(timer);
    }, [normalizedTaskSearch, quickTaskSearchResults.length]);

    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: prevMonthDays - i, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, current: true });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
        for (let i = 1; i <= remaining; i++) {
            cells.push({ day: i, current: false });
        }
    }

    return (
        <Layout 
            onFabClick={() => onAddQuickTask && onAddQuickTask(formatDateLocal(selectedDate))} 
            noPadding={true} 
            pomodoroTime={pomodoroTime} 
            isPomodoroActive={isPomodoroActive}
        >
            <div className="flex-1 flex flex-col md:flex-row md:h-full md:overflow-hidden">
                <div className="flex-1 md:overflow-y-auto no-scrollbar px-0 md:px-10 pt-0 pb-8">
                    <div className="sticky top-0 z-[100] py-4 px-4 md:px-12 mb-2">
                        <Header
                            user={user}
                            searchValue={taskSearchQuery}
                            onSearchChange={setTaskSearchQuery}
                            onSearchSubmit={handleQuickTaskSearchSubmit}
                            searchPlaceholder="Search quick task"
                        />
                    </div>
                    <div className="px-4 md:px-0 mt-24 md:mt-10">
                        <div className="flex items-center justify-between mb-8 md:mb-12">
                            <div className="flex items-center justify-between w-full">
                                <button onClick={prevMonth} className="w-10 h-10 glass-panel rounded-full text-cream-light/60 hover:text-primary transition-all flex items-center justify-center border border-white/5 hover:border-primary/20"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                                
                                <div className="flex-1 text-center">
                                    <h2 className="text-xl md:text-3xl font-display font-bold text-cream-light tracking-[0.10em] md:tracking-[0.20em] uppercase">{monthName} {year}</h2>
                                </div>

                                <button onClick={nextMonth} className="w-10 h-10 glass-panel rounded-full text-cream-light/60 hover:text-primary transition-all flex items-center justify-center border border-white/5 hover:border-primary/20"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                            </div>
                        </div>
                        <div className="glass-panel rounded-xl md:rounded-2xl overflow-hidden border-white/5 shadow-2xl">
                            <div className="grid grid-cols-7 bg-white/5 text-center border-b border-white/5 py-2.5">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-[9px] font-bold text-primary/60 uppercase tracking-widest">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {cells.map((cell, i) => {
                                    const reminders = cell.current ? getRemindersForDay(cell.day) : [];
                                    const todayMatch = cell.current && isToday(cell.day);
                                    const selectedMatch = cell.current && isSelected(cell.day);
                                    return (
                                        <div 
                                            key={i} 
                                            onClick={() => cell.current && setSelectedDate(new Date(year, month, cell.day))}
                                            className={`border-r border-b border-white/5 p-2 min-h-[100px] md:min-h-[110px] relative transition-colors cursor-pointer ${cell.current ? 'hover:bg-white/5' : 'opacity-25'} ${todayMatch ? 'bg-primary/10' : ''} ${selectedMatch && !todayMatch ? 'bg-white/5' : ''}`}
                                        >
                                            <span className={`text-xs font-sans ${todayMatch ? 'font-bold text-primary' : ''} ${selectedMatch && !todayMatch ? 'font-semibold text-cream-light' : ''}`}>{cell.day}</span>
                                            {todayMatch && <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-primary glow-orange"></div>}
                                            {reminders.length > 0 && (
                                                <div className="flex flex-col mt-2">
                                                    {reminders.slice(0, 3).map((r, ri) => (
                                                        <div key={ri} className={`w-full line-clamp-2 overflow-hidden text-[8px] md:text-[9px] leading-tight font-bold rounded-md px-1 py-0.5 flex items-center gap-1 ${r.type === 'quickTask' ? 'bg-white/10 text-cream-light/80' : 'bg-primary/15 text-primary/90'} border border-white/5`}>
                                                            <span className="text-white/30"></span>
                                                            {r.type === 'quickTask' ? formatTaskText(r.text) : (r.title || 'Note')}
                                                        </div>
                                                    ))}
                                                    {reminders.length > 3 && <span className="text-[7px] md:text-[8px] font-bold text-primary/45 ml-0.5">+{reminders.length - 3} more</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
                <aside className="w-full md:w-96 border-t md:border-t-0 md:border-l border-white/5 bg-black/20 backdrop-blur-md p-6 overflow-y-auto no-scrollbar flex-shrink-0 md:rounded-none rounded-[2.5rem] mt-6 md:mt-0">
                    <div ref={quickTaskMatchesRef} className="mb-6 glass-panel rounded-[2rem] p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-primary">search</span>
                            <div>
                                <h3 className="text-[11px] font-bold text-cream-light/60 uppercase tracking-[0.24em]">
                                    {normalizedTaskSearch ? 'Matches' : 'Task Search'}
                                </h3>
                                <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.16em] mt-1">
                                    {normalizedTaskSearch ? 'Select a result to jump' : 'Search tasks from the header'}
                                </p>
                            </div>
                        </div>
                        {normalizedTaskSearch ? (
                            <div className="space-y-2">
                                {quickTaskSearchResults.length > 0 ? (
                                    quickTaskSearchResults.map(task => (
                                        <button
                                            key={task.id}
                                            type="button"
                                            onClick={() => jumpToQuickTaskDate(task)}
                                            className="w-full text-left rounded-2xl border border-white/5 bg-white/5 px-4 py-3 hover:bg-white/10 hover:border-primary/20 transition-all"
                                        >
                                            <p className="text-sm font-bold text-cream-light/90 line-clamp-2">{formatTaskText(task.text)}</p>
                                            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.18em] mt-2">
                                                {task.dueTime ? `${formatDateMinimal(task.dueDate)} @ ${task.dueTime}` : formatReminderDate(task.dueDate)}
                                            </p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-4 text-xs text-white/35">
                                        No quick tasks matched that search. Try a task word, `today`, `tomorrow`, or a date like `Apr 24`.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-xs text-white/35 leading-relaxed">
                                Search from the header with a task word or date. Press Enter to jump to the first match.
                            </div>
                        )}
                    </div>
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-1.5 justify-between">
                            <h3 className="text-xl font-display font-bold text-cream-light">Daily Agenda</h3>
                            <button 
                                onClick={() => onAddQuickTask && onAddQuickTask(formatDateLocal(selectedDate))}
                                className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg active:scale-95"
                                title="Add Task for this day"
                            >
                                <span className="material-symbols-outlined text-xl">add</span>
                            </button>
                        </div>
                        <div className="h-px w-full bg-gradient-to-r from-primary/30 to-transparent mb-4"></div>
                        <p className="text-cream-light/40 text-[10px] font-sans uppercase tracking-[0.2em] font-bold">{selectedDayLabel}</p>
                    </div>
                    {dayReminders.length > 0 ? (
                        <div className="space-y-3 mb-8">
                            {dayReminders.map((item, idx) => {
                                if (item.type === 'note') {
                                    return (
                                        <div key={idx} onClick={() => onEditNote && onEditNote(item)} className="card-glow bg-orange-100/95 rounded-[2rem] p-5 border-b-4 border-orange-300/50 cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-base font-bold text-orange-950/90 leading-tight truncate flex-1">{item.title || 'Untitled'}</h4>
                                                {item.isLocked && <span className="material-symbols-outlined text-orange-950/40 text-sm">lock</span>}
                                            </div>
                                            <p className="text-xs text-orange-900/60 mt-1.5 font-sans font-medium capitalize">{formatReminderDate(item.reminderDate)}{item.labels && item.labels[0] ? ` • ${item.labels[0]}` : ''}</p>
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div key={idx} onClick={() => onEditQuickTask && onEditQuickTask(item)} className={`glass-panel rounded-[2rem] p-5 border-l-4 ${item.completed ? 'border-l-green-500/50 opacity-60' : 'border-l-primary shadow-lg shadow-primary/5'} hover:bg-white/5 transition-all cursor-pointer group`}>
                                            <div className="flex items-center gap-4">
                                                <div onClick={(e) => { e.stopPropagation(); onToggleQuickTask && onToggleQuickTask(item.id); }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-white/20 text-transparent group-hover:border-primary/50'}`}>
                                                    {item.completed && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className={`text-sm font-bold transition-all line-clamp-2 overflow-hidden ${item.completed ? 'text-cream-light/40 line-through' : 'text-cream-light'}`}>{formatTaskText(item.text)}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="material-symbols-outlined text-[10px] text-primary/60">schedule</span>
                                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none">
                                                            {item.dueTime ? formatDateMinimal(item.dueDate) : formatReminderDate(item.dueDate)}
                                                            {item.dueTime ? ` @ ${formatTime(item.dueTime)}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 mb-8">
                            <span className="material-symbols-outlined text-3xl text-white/5 mb-2">event_available</span>
                            <p className="text-white/20 text-xs font-sans">No reminders this day</p>
                        </div>
                    )}
                    {upcomingReminders.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-xs font-bold text-cream-light/60 uppercase tracking-[0.2em]">Upcoming</h4>
                                <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent"></div>
                            </div>
                            <div className="space-y-2.5">
                                {upcomingReminders.map((item, idx) => (
                                    <div key={idx} onClick={() => item.type === 'note' ? onEditNote(item) : onEditQuickTask(item)} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === 'quickTask' ? 'bg-cream-light/40' : 'bg-primary'}`}></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-cream-light/80 truncate">{item.type === 'quickTask' ? formatTaskText(item.text) : (item.title || 'Untitled')}</p>
                                            <p className="text-[9px] text-cream-light/30 font-sans mt-0.5">{item.type === 'note' ? formatReminderDate(item.reminderDate) : item.dueDate}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </Layout>
    );
};

export default CalendarPage;
