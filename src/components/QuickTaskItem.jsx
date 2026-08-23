import React from 'react';
import { formatDueDate, formatTaskText } from '../core/config';

// LABEL: QUIK-TSK-ITM — Short Summary: Individual task item with completion toggle and overdue styling
const QuickTaskItem = React.memo(({ task, onToggle, onDelete, onEdit }) => {
    const { label: dueDateStr, isOverdue, isNearDeadline, isDueTomorrow } = formatDueDate(task.dueDate, task.dueTime);

    return (
        <div 
            className={`glass-panel rounded-[2rem] p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.07] hover:border-primary/30 transition-all duration-200 cursor-pointer border border-white/5 shadow-lg hover:shadow-primary/5 ${task.completed ? 'opacity-40 grayscale-[0.5]' : ''} ${isOverdue && !task.completed ? 'border-red-500/30' : ''} ${isNearDeadline && !task.completed ? 'near-deadline-glow' : ''} ${isDueTomorrow && !task.completed ? 'tomorrow-glow' : ''}`}
            style={{ minHeight: window.innerWidth < 768 ? '64px' : 'auto', touchAction: 'pan-y' }}
            onClick={() => onToggle(task.id)}
            onContextMenu={(e) => {
                e.preventDefault();
                onEdit(task);
            }}
        >
            <div className="flex items-center gap-5 pointer-events-none">
                <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${task.completed ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20' : 'border-white/10 text-transparent group-hover:border-primary/40'}`}>
                    <span className="material-symbols-outlined text-[1rem] font-bold">check</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <h4 className={`text-sm md:text-base text-cream-light font-montserrat font-bold tracking-wide transition-all duration-300 line-clamp-2 overflow-hidden ${task.completed ? 'line-through decoration-primary/50 opacity-60' : 'group-hover:text-primary'} ${isOverdue && !task.completed ? 'text-red-400' : ''}`}>
                        {formatTaskText(task.text)}
                    </h4>
                    {dueDateStr && (
                        <p className={`text-[9px] md:text-[10px] font-montserrat font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 transition-opacity ${isOverdue && !task.completed ? 'text-red-500' : 'text-primary/80 opacity-60 group-hover:opacity-100'}`}>
                            <span className="material-symbols-outlined text-[9px] md:text-[11px]">event</span>
                            {dueDateStr}
                        </p>
                    )}
                </div>
            </div>
            {/* FIX 2026-04-15: Increased touch target for deletion and made button visible on mobile */}
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-60 md:opacity-0 group-hover:opacity-100 p-4 -m-2 text-white/40 hover:text-red-400 transition-all duration-200 pointer-events-auto transform hover:scale-110"
                title="Delete Task"
            >
                <span className="material-symbols-outlined text-xl">delete</span>
            </button>
        </div>
    );
});

export default QuickTaskItem;
