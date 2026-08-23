import React, { useState, useMemo } from 'react';
import { Layout, Header, ConfirmationModal } from '../components/Common';
import QuickTaskItem from '../components/QuickTaskItem';
import { groupQuickTasksBySchedule } from '../core/config';

// LABEL: PAGE-QUICKTASKS — Short Summary: Full-page tasks list with filtering, grouping, and completion stats
const QuickTasksPage = ({ 
    user, 
    quickTasks = [], 
    onAddQuickTaskClick, 
    onToggleQuickTask, 
    onDeleteQuickTask, 
    onEditQuickTask, 
    onClearCompletedQuickTasks, 
    onOpenCreator, 
    pomodoroTime, 
    isPomodoroActive 
}) => {
    const [taskFilter, setTaskFilter] = useState('active'); // active, completed, all
    const [pendingClearConfirm, setPendingClearConfirm] = useState(false);

    const filteredTasks = useMemo(() => {
        if (taskFilter === 'active') return quickTasks.filter(t => !t.completed);
        if (taskFilter === 'completed') return quickTasks.filter(t => t.completed);
        return quickTasks;
    }, [quickTasks, taskFilter]);

    const grouped = useMemo(() => groupQuickTasksBySchedule(filteredTasks), [filteredTasks]);
    const completedCount = quickTasks.filter(t => t.completed).length;

    const sections = [
        { id: 'today', label: 'Today', items: grouped.today },
        { id: 'tomorrow', label: 'Tomorrow', items: grouped.tomorrow },
        { id: 'upcoming', label: 'Upcoming', items: grouped.upcoming },
        { id: 'completed', label: 'Completed', items: grouped.completed }
    ];

    return (
        <Layout onOpenCreator={onOpenCreator} onFabClick={onAddQuickTaskClick} pomodoroTime={pomodoroTime} isPomodoroActive={isPomodoroActive}>
            <div className="max-w-4xl mx-auto w-full px-0 md:px-8 pt-0 pb-12">
                <div className="sticky top-0 z-[100] py-4 px-4 md:px-12 mb-6">
                    <Header user={user} title="Quick Tasks" subtitle="Focus on the now" />
                </div>
                
                <div className="px-4 md:px-0 mt-20 md:mt-12 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl w-max">
                        {['active', 'completed', 'all'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setTaskFilter(filter)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${taskFilter === filter ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-cream-light/40 hover:text-cream-light/70'}`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    {completedCount > 0 && taskFilter !== 'active' && (
                        <button 
                            onClick={() => setPendingClearConfirm(true)}
                            className="flex items-center gap-2 text-xs font-bold text-red-400/60 hover:text-red-400 transition-colors uppercase tracking-widest px-2"
                        >
                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                            Clear Completed ({completedCount})
                        </button>
                    )}
                </div>

                <div className="px-4 md:px-0 space-y-12 pb-32">
                    {sections.every(s => s.items.length === 0) ? (
                        <div className="glass-panel p-20 rounded-[3rem] text-center border-dashed border-white/5 animate-in fade-in duration-700">
                            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/5">
                                <span className="material-symbols-outlined text-5xl text-white/10">task_alt</span>
                            </div>
                            <h3 className="text-xl font-bold text-cream-light/60 uppercase tracking-[0.2em] mb-4 italic">No Tasks Found</h3>
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.1em] mb-10 max-w-xs mx-auto">
                                {taskFilter === 'active' ? 'You have cleared all pending tasks!' : 
                                 taskFilter === 'completed' ? 'You haven\'t completed any tasks yet.' : 
                                 'Your task list is empty. Start by adding one!'}
                            </p>
                            <button 
                                onClick={onAddQuickTaskClick}
                                className="px-10 py-4 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all hover:scale-105"
                            >
                                Add Your First Task
                            </button>
                        </div>
                    ) : (
                        sections.map(section => (
                            section.items.length > 0 && (
                                <div key={section.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-primary/70">{section.label}</h3>
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                                        <span className="text-[10px] font-bold text-white/20">{section.items.length}</span>
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
                        ))
                    )}
                </div>

                {pendingClearConfirm && (
                    <ConfirmationModal
                        title="Clear Completed?"
                        message={`This will permanently remove all ${completedCount} completed tasks. Are you sure?`}
                        onConfirm={() => { onClearCompletedQuickTasks(); setPendingClearConfirm(false); }}
                        onCancel={() => setPendingClearConfirm(false)}
                        confirmText="Clear All"
                        type="danger"
                    />
                )}
            </div>
        </Layout>
    );
};

export default QuickTasksPage;
