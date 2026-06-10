import React, { useState } from 'react';
import { Award, Flame, BookOpen, Map, Binary, Sparkles, CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';

export const Achievements: React.FC = () => {
  const { xp, level, badges, milestones, toggleMilestone, addMilestone, deleteMilestone, skills } = useApp();

  // Custom milestone builder states
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneSkill, setNewMilestoneSkill] = useState('general');
  const [newMilestoneXp, setNewMilestoneXp] = useState(250);

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    addMilestone(newMilestoneTitle, newMilestoneSkill, newMilestoneXp);
    setNewMilestoneTitle('');
    setNewMilestoneSkill('general');
    setNewMilestoneXp(250);
  };

  const xpInLevel = xp % 1000;
  const progressPercent = Math.min(100, Math.floor((xpInLevel / 1000) * 100));

  // Helper to map badge icons
  const getBadgeIcon = (iconName: string, size: number = 24) => {
    switch (iconName) {
      case 'flame':
        return <Flame size={size} />;
      case 'book-open':
        return <BookOpen size={size} />;
      case 'map':
        return <Map size={size} />;
      case 'binary':
        return <Binary size={size} />;
      default:
        return <Sparkles size={size} />;
    }
  };

  const badgeGlows = {
    primary: 'bg-[#00f2fe]/10 border-[#00f2fe]/20 text-[#00f2fe] hover:shadow-[0_0_20px_rgba(0,242,254,0.3)]',
    secondary: 'bg-[#e100ff]/10 border-[#e100ff]/20 text-[#e100ff] hover:shadow-[0_0_20px_rgba(225,0,255,0.3)]',
    accent: 'bg-[#ff4769]/10 border-[#ff4769]/20 text-[#ff4769] hover:shadow-[0_0_20px_rgba(255,8,68,0.3)]',
    success: 'bg-[#00b09b]/10 border-[#00b09b]/25 text-[#00b09b] hover:shadow-[0_0_20px_rgba(0,176,155,0.3)]',
    gold: 'bg-[#f6d365]/10 border-[#f6d365]/20 text-[#f6d365] hover:shadow-[0_0_20px_rgba(246,211,101,0.3)]'
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      
      {/* Overall Specialist Rank Showcase Banner */}
      <GlassCard className="bg-gradient-to-r from-[#0f1627]/60 to-[#7f00ff]/5 border-[#7f00ff]/15">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 lg:gap-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#e100ff] uppercase tracking-wider">Current Scholar Rank</span>
            <h2 className="font-heading text-2xl lg:text-3xl font-extrabold text-white mt-1">Level {level} Specialist</h2>
            <span className="text-xs text-slate-400 mt-2 max-w-[340px] leading-relaxed">
              Unlock rank badges and complete milestone grinds to earn XP. Leveling up grants access to special rewards and status multipliers.
            </span>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-tr from-[#7f00ff] to-[#e100ff] shadow-[0_0_20px_rgba(225,0,255,0.4)] flex items-center justify-center font-heading text-3xl font-extrabold text-white shrink-0">
              {level}
            </div>
            
            <div className="flex-grow flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-slate-400">
                <span>{xpInLevel} / 1000 XP</span>
                <span>{progressPercent}% to Lvl {level + 1}</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#7f00ff] to-[#e100ff] rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(225,0,255,0.4)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Grid: Badges (left) & Milestones Checklist (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        
        {/* Badges Gallery Grid */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          <div className="mb-2">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <Award className="text-[#00f2fe]" size={20} />
              <span>Unlocked Achievement Badges</span>
            </h3>
            <span className="text-xs text-slate-500">Earn permanent badges by proving study roadmaps and streaks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {badges.map(badge => {
              const isUnlocked = badge.unlocked;

              return (
                <div
                  key={badge.id}
                  className={`
                    glass-panel rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 border-2 border-transparent
                    ${isUnlocked 
                      ? 'bg-white/3 border-white/5 opacity-100 hover:-translate-y-1' 
                      : 'bg-white/1 border-dashed border-white/5 opacity-30 select-none'
                    }
                  `}
                  title={badge.desc}
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300
                    ${isUnlocked 
                      ? badgeGlows[badge.tier] 
                      : 'bg-white/2 border border-white/5 text-slate-500'
                    }
                  `}>
                    {getBadgeIcon(badge.icon)}
                  </div>
                  <span className="font-heading font-bold text-xs text-slate-100 block truncate w-full">{badge.title}</span>
                  <span className="text-[10px] text-slate-500 leading-normal mt-1.5 line-clamp-2">{badge.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestones Checklist Form & Custom Milestones Builder */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <GlassCard className="flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <h3 className="font-heading font-bold text-lg text-slate-100">Study Milestones</h3>
                <span className="text-xs text-slate-500">Check off items for XP boosts</span>
              </div>

              <div className="flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-1">
                {milestones.map(m => (
                  <div
                    key={m.id}
                    onClick={() => toggleMilestone(m.id)}
                    className={`
                      flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 group
                      ${m.completed
                        ? 'bg-white/2 border-white/5 opacity-55 text-slate-500'
                        : 'bg-white/1 border-white/8 text-slate-200 hover:border-white/15 hover:bg-white/2 hover:scale-[1.01]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={m.completed ? 'text-[#00b09b]' : 'text-slate-500 hover:text-white'}>
                        {m.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div className="flex-grow flex flex-col gap-0.5">
                        <span className={`text-xs font-semibold ${m.completed ? 'line-through text-slate-500' : ''}`}>{m.title}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{m.targetSkill} Skill path</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#e100ff] bg-[#e100ff]/10 py-1 px-2 rounded-lg shrink-0">
                        +{m.xpAward} XP
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete the milestone "${m.title}"?`)) {
                            deleteMilestone(m.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#ff4769] rounded-lg hover:bg-[#ff4769]/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100"
                        title="Delete milestone"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Custom Milestone Creator */}
          <GlassCard className="border-dashed">
            <h4 className="font-heading font-bold text-sm text-slate-200 mb-3 flex items-center gap-1.5">
              <Plus size={16} />
              <span>Create Custom Milestone</span>
            </h4>
            <form onSubmit={handleCreateMilestone} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Milestone Title</label>
                <input 
                  type="text"
                  placeholder="E.g. Complete React intermediate hooks"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Target Skill</label>
                  <select
                    value={newMilestoneSkill}
                    onChange={(e) => setNewMilestoneSkill(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#00f2fe]/40"
                  >
                    <option value="general" className="bg-[#060913]">General</option>
                    {Object.values(skills).map(sk => (
                      <option key={sk.slug} value={sk.slug} className="bg-[#060913]">{sk.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">XP Award</label>
                  <input 
                    type="number"
                    min="50"
                    step="50"
                    value={newMilestoneXp}
                    onChange={(e) => setNewMilestoneXp(parseInt(e.target.value) || 250)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-semibold"
              >
                Create Milestone
              </button>
            </form>
          </GlassCard>
        </div>

      </div>

    </div>
  );
};
