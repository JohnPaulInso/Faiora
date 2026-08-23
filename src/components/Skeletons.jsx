import React from 'react';

// LABEL: SKEL-PRIO-NT — Short Summary: Skeleton loader for priority note cards
export const PriorityNoteSkeleton = ({ index }) => {
    return (
        <div className={`skeleton-priority-card sticky-note-${(index % 5) + 1} overflow-hidden shadow-lg`}>
            <div className="absolute inset-0 bg-white/5 animate-shimmer"></div>
            <div className="relative h-full p-5 flex flex-col justify-between">
                <div className="w-8 h-8 rounded-lg bg-white/10"></div>
                <div className="space-y-2">
                    <div className="w-12 h-2 rounded bg-white/5"></div>
                    <div className="w-3/4 h-6 rounded bg-white/10"></div>
                </div>
            </div>
        </div>
    );
};

// LABEL: SKEL-QUK-TSK — Short Summary: Skeleton loader for quick task items
export const SkeletonQuickTask = () => {
    return (
        <div className="glass-panel rounded-[2rem] p-5 flex items-center justify-between border border-white/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-white/5 animate-shimmer"></div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="w-7 h-7 rounded-xl bg-white/10"></div>
                <div className="space-y-2">
                    <div className="w-32 h-4 rounded bg-white/10"></div>
                    <div className="w-20 h-2 rounded bg-white/5"></div>
                </div>
            </div>
            <div className="w-6 h-6 rounded-lg bg-white/10 relative z-10"></div>
        </div>
    );
};

// LABEL: SKEL-NT-CRD — Short Summary: Standard skeleton loader for note cards
export const SkeletonNoteCard = ({ index, variant = 'full' }) => {
    const isCompact = variant === 'compact';
    return (
        <div className={`glass-panel rounded-[2rem] overflow-hidden relative ${isCompact ? 'h-[140px]' : 'h-[220px]'} p-6 border border-white/5`}>
            <div className="absolute inset-0 bg-white/5 animate-shimmer"></div>
            <div className="flex flex-col h-full relative z-10">
                <div className="flex justify-between mb-4">
                    <div className="w-2/3 h-6 rounded bg-white/10"></div>
                    <div className="w-6 h-6 rounded bg-white/5"></div>
                </div>
                <div className="space-y-2 mb-6">
                    <div className="w-full h-3 rounded bg-white/5"></div>
                    <div className="w-5/6 h-3 rounded bg-white/5"></div>
                    {!isCompact && <div className="w-4/6 h-3 rounded bg-white/5"></div>}
                </div>
                <div className="mt-auto flex gap-2">
                    <div className="w-16 h-4 rounded bg-white/10"></div>
                    <div className="w-12 h-4 rounded bg-white/5"></div>
                </div>
            </div>
        </div>
    );
};
