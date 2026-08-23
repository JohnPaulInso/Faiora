import React from 'react';
import { getThemeClasses, formatTitle, stripHtml, formatReminderDate } from '../core/config';

// LABEL: NOTE-CARD — Short Summary: Individual note card component with theme support and selection state
const NoteCard = React.memo(({ note, onClick, index, variant = 'full', onRemoveReminder, isSelected = false }) => {
    const theme = getThemeClasses(note.noteTheme);
    const isLocked = !!note.isLocked;
    const preview = isLocked ? "" : stripHtml(note.content);

    if (variant === 'priority') {
        return (
            <div 
                onClick={onClick}
                className={`card-glow sticky-note-${(index % 5) + 1} rounded-[2rem] p-5 h-[150px] md:h-[160px] flex flex-col justify-between border-b-4 group cursor-pointer relative overflow-hidden font-montserrat ${theme.bg} ${theme.border}`}
            >
                <div className="flex justify-start">
                    <span className={`material-symbols-outlined text-xl ${theme.icon}`} style={note.isPinned ? {fontVariationSettings: "'FILL' 1"} : {}}>{note.noteIcon || 'push_pin'}</span>
                </div>
                <div className="mt-auto w-full flex flex-col gap-1 text-left">
                    {/* (2026-07-13) Add PINNED/PRIORITY label above title. Prev: static PRIORITY */}
                    <p className={`text-[9px] font-extrabold uppercase tracking-[0.2em] font-montserrat ${theme.label}`}>{note.isPinned ? 'PINNED' : 'PRIORITY'}</p>
                    <h3 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight font-display line-clamp-2 leading-tight w-full ${theme.text}`}>{formatTitle(note.title) || "Untitled"}</h3>
                </div>
            </div>
        );
    }

    // Unifying 'compact' and 'full' styling logic derived directly from backup.html
    const isCompact = variant === 'compact';

    return (
        <div 
            onClick={onClick}
            className={`card-glow sticky-note-${(index % 5) + 1} ${isCompact ? 'rounded-[2rem] p-5 h-[140px]' : 'rounded-[2.2rem] p-6 h-[220px]'} flex flex-col border-b-4 group cursor-pointer relative overflow-hidden font-montserrat ${theme.bg} ${theme.border} ${isSelected ? 'scale-[0.97]' : ''}`}
            style={isSelected ? { boxShadow: '0 0 0 3px #f97316, 0 0 20px rgba(249, 115, 22, 0.3)', transition: 'all 0.3s ease' } : {}}
        >
            <div className="absolute top-4 right-4 text-right">
                <span className={`material-symbols-outlined text-xl ${theme.icon} transition-opacity`} style={note.isPinned ? {fontVariationSettings: "'FILL' 1"} : {}}>{note.noteIcon || 'push_pin'}</span>
            </div>
            
            <div className="pr-8 mb-2">
                <h3 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold tracking-tight font-display leading-tight mb-1.5 ${theme.text}`}>{formatTitle(note.title) || "Untitled"}</h3>
                {isLocked ? (
                    <div className="flex items-center gap-2 mt-2 text-slate-400/50">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Protected Note</span>
                    </div>
                ) : preview && (
                    <p className={`${isCompact ? 'text-xs line-clamp-2 mt-1.5' : 'text-sm line-clamp-3 mt-2'} leading-relaxed font-sans ${theme.sub}`}>{preview}</p>
                )}
            </div>
            
            <div className="mt-auto pt-0 flex flex-col gap-1">
                {note.reminderDate && (
                    <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold font-montserrat ${theme.chipBg} ${theme.label} px-2.5 py-1.5 rounded-lg w-max border ${theme.chipBorder} relative group/rem`}>
                        <span className="material-symbols-outlined text-xs">notifications_active</span>
                        <span>{formatReminderDate(note.reminderDate)}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveReminder && onRemoveReminder(note.id); }}
                            className="ml-1 hover:text-primary transition-colors opacity-0 group-hover/rem:opacity-100"
                        >
                            <span className="material-symbols-outlined text-[10px]">close</span>
                        </button>
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                {(note.labels && note.labels.length > 0) ? (
                    note.labels.map(l => (
                        <span key={l} className={`text-[10px] font-bold uppercase tracking-widest font-montserrat ${theme.labelBg} ${theme.label} px-2.5 py-1 rounded-lg`}>{l}</span>
                    ))
                 ) : null}
                </div>
            </div>
            {isSelected && (
                <div className="absolute top-2.5 left-2.5 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg z-10 animate-in zoom-in-50 duration-200 border-2 border-white">
                    <span className="material-symbols-outlined text-base font-bold">check</span>
                </div>
            )}
        </div>
    );
});

export default NoteCard;
