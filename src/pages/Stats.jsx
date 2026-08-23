import React, { useMemo } from 'react';
import { Layout, Header } from '../components/Common';
import { buildQuickTaskStats, formatTaskText, formatReminderDate, formatDateMinimal } from '../core/config';

// LABEL: PAGE-STATS — Short Summary: Productivity analytics dashboard with task completion rates, weekly history, and upcoming deadlines
const StatsPage = ({ 
    user, 
    notes, 
    quickTasks = [], 
    onOpenCreator, 
    pomodoroTime, 
    isPomodoroActive 
}) => {
    const stats = useMemo(() => buildQuickTaskStats(quickTasks), [quickTasks]);
    
    // Streak logic (simplified for UI demonstration)
    const streakDays = useMemo(() => {
        // In a real app, this would be calculated from history
        return 7; 
    }, []);

    const completionData = [
        { label: 'Completed', value: stats.completed, color: '#f97316' },
        { label: 'Pending', value: stats.pending, color: 'rgba(255,255,255,0.1)' }
    ];

    return (
        <Layout onOpenCreator={onOpenCreator} pomodoroTime={pomodoroTime} isPomodoroActive={isPomodoroActive}>
            <div className="max-w-6xl mx-auto w-full px-0 md:px-12 pt-0 pb-12">
                <div className="sticky top-0 z-[100] py-4 px-4 md:px-12 mb-6">
                    <Header user={user} title="Productivity" subtitle="Track your growth" />
                </div>
                
                <div className="px-4 md:px-0 mt-20 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
                    <div className="glass-panel-dark rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-7xl text-primary">check_circle</span>
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">Completion Rate</p>
                        <h3 className="text-6xl font-display font-bold text-cream-light mb-4">{stats.completionRate}%</h3>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary glow-orange transition-all duration-1000" style={{ width: `${stats.completionRate}%` }}></div>
                        </div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4">Based on {stats.total} total tasks</p>
                    </div>

                    <div className="glass-panel-dark rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-7xl text-primary">local_fire_department</span>
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">Current Streak</p>
                        <h3 className="text-6xl font-display font-bold text-cream-light mb-4">{streakDays} Days</h3>
                        <div className="flex gap-1.5">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className={`flex-1 h-2 rounded-full ${i < streakDays ? 'bg-primary shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4">Keep the momentum going!</p>
                    </div>

                    <div className="glass-panel-dark rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-7xl text-primary">task_alt</span>
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-2">Done Today</p>
                        <h3 className="text-6xl font-display font-bold text-cream-light mb-4">{stats.doneToday}</h3>
                        <p className="text-sm font-bold text-cream-light/40 italic">Tasks completed in last 24h</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-6">Excellent work!</p>
                    </div>
                </div>

                <div className="px-4 md:px-0 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-32">
                    <section className="glass-panel rounded-[2.5rem] p-8 border border-white/5 shadow-xl">
                        <div className="flex items-center justify-between mb-10">
                            <h4 className="text-sm font-bold text-cream-light uppercase tracking-[0.2em]">Activity History</h4>
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Last 7 Days</span>
                        </div>
                        <div className="flex items-end justify-between h-48 px-2">
                            {stats.weekBuckets.map((day, i) => {
                                const max = Math.max(...stats.weekBuckets.map(d => d.done), 5);
                                const height = (day.done / max) * 100;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-4 flex-1">
                                        <div className="relative w-full flex justify-center group">
                                            <div 
                                                className="w-8 md:w-10 bg-primary/20 hover:bg-primary/40 rounded-t-xl transition-all duration-700 relative cursor-pointer"
                                                style={{ height: `${height}%`, minHeight: '4px' }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-[10px] font-bold text-primary px-2 py-1 rounded border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {day.done}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{day.key}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="glass-panel rounded-[2.5rem] p-8 border border-white/5 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-sm font-bold text-cream-light uppercase tracking-[0.2em]">Priority Focus</h4>
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Deadlines</span>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-start gap-5 p-5 bg-red-500/5 rounded-3xl border border-red-500/10">
                                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400">
                                    <span className="material-symbols-outlined text-2xl">error</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Overdue Tasks</p>
                                    <h5 className="text-3xl font-display font-bold text-cream-light mb-1">{stats.overdue}</h5>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider italic">Action required immediately</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-5 p-5 bg-primary/5 rounded-3xl border border-primary/10">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl">notification_important</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Next Deadline</p>
                                    {stats.nextDueTask ? (
                                        <React.Fragment>
                                            <h5 className="text-lg font-bold text-cream-light truncate mb-1">{formatTaskText(stats.nextDueTask.text)}</h5>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{stats.nextDueTask.dueTime ? `${formatDateMinimal(stats.nextDueTask.dueDate)} @ ${stats.nextDueTask.dueTime}` : formatReminderDate(stats.nextDueTask.dueDate)}</p>
                                        </React.Fragment>
                                    ) : (
                                        <p className="text-sm font-bold text-white/20 uppercase tracking-widest py-2">No upcoming deadlines</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
};

export default StatsPage;
