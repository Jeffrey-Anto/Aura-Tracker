import React from 'react';
import { Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TopbarProps {
  currentPage: string;
}

export const Topbar: React.FC<TopbarProps> = ({ currentPage }) => {
  const { xp, level, streaks } = useApp();

  // XP level info
  const xpInLevel = xp % 1000;
  const progressPercent = Math.min(100, Math.floor((xpInLevel / 1000) * 100));

  const pageTitles: Record<string, string> = {
    dashboard: 'Personal Insights',
    tasks: 'Task Checklist',
    activity: 'Activity & Goal Tracker',
    skills: 'Skills & Roadmaps',
    analytics: 'Analytics Insights',
    achievements: 'Specialist Rank & Badges',
    profile: 'User Profile',
    settings: 'System Preferences'
  };

  return (
    <header className="h-20 bg-[#060913]/30 border-b border-white/5 backdrop-blur-md flex justify-between items-center px-6 lg:px-10 shrink-0 z-20 mt-16 lg:mt-0">
      <div className="flex flex-col">
        <h1 className="font-heading text-xl lg:text-2xl font-bold text-slate-100">
          {pageTitles[currentPage] || 'Aura'}
        </h1>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* XP Level Widget */}
        <div className="flex items-center gap-3 bg-white/2 border border-white/5 py-1.5 px-3 lg:px-4 rounded-full backdrop-blur-sm">
          <div className="bg-gradient-to-tr from-[#7f00ff] to-[#e100ff] rounded-full w-9 h-9 flex flex-col justify-center items-center shadow-[0_0_10px_rgba(225,0,255,0.3)] shrink-0">
            <span className="text-[7px] font-extrabold text-white/90 leading-none">LVL</span>
            <span className="text-sm font-extrabold text-white leading-none mt-[1px]">{level}</span>
          </div>
          <div className="flex flex-col gap-1 w-20 lg:w-28">
            <div className="flex justify-between text-[9px] font-bold text-slate-400">
              <span>{xpInLevel} / 1000</span>
              <span>XP</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#7f00ff] to-[#e100ff] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(225,0,255,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily Streak Indicator */}
        <div 
          onClick={() => {
            // Scroll or navigate to achievements
            window.location.hash = 'achievements';
          }}
          className={`
            flex items-center gap-2 border py-1.5 px-3 lg:px-4 rounded-full cursor-pointer transition-all duration-300 hover:scale-105 select-none
            ${streaks.current > 0 
              ? 'bg-[#ff4769]/5 border-[#ff4769]/15 hover:shadow-[0_0_15px_rgba(255,71,105,0.25)]' 
              : 'bg-white/2 border-white/5 hover:border-white/10'
            }
          `}
        >
          <Flame 
            size={18} 
            className={`
              ${streaks.current > 0 
                ? 'text-[#ff4769] fill-[#ff4769] animate-flame' 
                : 'text-slate-500'
              }
            `} 
          />
          <span className="font-heading text-sm font-extrabold text-slate-100">{streaks.current}</span>
          <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">days</span>
        </div>
      </div>
    </header>
  );
};
