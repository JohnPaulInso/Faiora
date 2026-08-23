import React, { useMemo } from 'react';
import { Layout, Header } from '../components/Common';

// LABEL: PAGE-STREAK — Short Summary: Gamified streak overview with visual level progress and milestones
const StreakPage = ({ 
    user, 
    onOpenCreator, 
    pomodoroTime, 
    isPomodoroActive 
}) => {
    // Demo data for streak
    const streakData = useMemo(() => ({
        current: 7,
        highest: 14,
        totalTasks: 245,
        level: 8,
        levelProgress: 65,
        nextMilestone: 10
    }), []);

    return (
        <Layout onOpenCreator={onOpenCreator} pomodoroTime={pomodoroTime} isPomodoroActive={isPomodoroActive}>
            <div className="max-w-4xl mx-auto w-full px-0 md:px-12 pt-0 pb-12">
                <div className="sticky top-0 z-[100] py-4 px-4 md:px-12 mb-6">
                    <Header user={user} title="Momentum" subtitle="Your journey" />
                </div>
                
                <div className="px-4 md:px-0 mt-20 md:mt-12 flex flex-col items-center text-center">
                    <div className="relative mb-12">
                        <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-white/5 flex items-center justify-center relative bg-black/20 shadow-2xl overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 group-hover:scale-110 transition-transform duration-700"></div>
                            
                            <div className="flex flex-col items-center relative z-10">
                                <span className="material-symbols-outlined text-6xl md:text-8xl text-primary glow-orange animate-bounce-subtle mb-2">local_fire_department</span>
                                <h3 className="text-5xl md:text-7xl font-display font-bold text-cream-light leading-none">{streakData.current}</h3>
                                <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.3em] mt-3">Day Streak</p>
                            </div>
                            
                            {/* Level Progress Circle */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                                <circle 
                                    cx="50%" cy="50%" r="48%" 
                                    fill="none" 
                                    stroke="rgba(249, 115, 22, 0.15)" 
                                    strokeWidth="4" 
                                />
                                <circle 
                                    cx="50%" cy="50%" r="48%" 
                                    fill="none" 
                                    stroke="#f97316" 
                                    strokeWidth="4" 
                                    strokeDasharray="314%" 
                                    strokeDashoffset={`${314 - (3.14 * streakData.levelProgress)}%`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 whitespace-nowrap">
                            Level {streakData.level}
                        </div>
                    </div>

                    <h2 className="text-2xl md:text-4xl font-display font-bold text-cream-light mb-4 uppercase tracking-tight italic">Radiant Achiever</h2>
                    <p className="text-white/40 text-sm max-w-sm mx-auto mb-16 leading-relaxed">
                        You've been consistently productive for a full week. Your focus is reaching new heights!
                    </p>

                    <div className="grid grid-cols-2 gap-6 w-full mb-20">
                        <div className="glass-panel-dark rounded-3xl p-8 border border-white/5 text-left group">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">All-Time High</p>
                            <div className="flex items-end gap-3">
                                <h4 className="text-4xl font-display font-bold text-cream-light">{streakData.highest}</h4>
                                <span className="text-xs font-bold text-white/20 uppercase tracking-widest mb-2">Days</span>
                            </div>
                        </div>
                        <div className="glass-panel-dark rounded-3xl p-8 border border-white/5 text-left group">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Total Impact</p>
                            <div className="flex items-end gap-3">
                                <h4 className="text-4xl font-display font-bold text-cream-light">{streakData.totalTasks}</h4>
                                <span className="text-xs font-bold text-white/20 uppercase tracking-widest mb-2">Tasks</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full text-left">
                        <div className="flex items-center gap-4 mb-8">
                            <h4 className="text-xs font-bold text-cream-light uppercase tracking-[0.2em]">Next Milestone</h4>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                        </div>
                        
                        <div className="glass-panel rounded-[2.5rem] p-8 border border-white/5 flex items-center justify-between relative overflow-hidden group">
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 border border-white/10 group-hover:border-primary/30 group-hover:text-primary transition-all">
                                    <span className="material-symbols-outlined text-3xl">military_tech</span>
                                </div>
                                <div>
                                    <h5 className="text-lg font-bold text-cream-light mb-1">Decade of Focus</h5>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Reach a 10-day streak</p>
                                </div>
                            </div>
                            <div className="text-right relative z-10">
                                <p className="text-2xl font-display font-bold text-primary">{streakData.current}/10</p>
                                <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest mt-1">Days</p>
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-700" style={{ width: `${(streakData.current/10)*100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default StreakPage;
