import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ChevronDown, ChevronUp, CheckSquare, Square, Plus, Award, GitBranch, Map, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';

export const SkillsTracker: React.FC = () => {
  const { skills, createSkill, addRoadmapTopic, toggleRoadmapTopic, deleteSkill, deleteRoadmapTopic } = useApp();
  
  const skillList = Object.values(skills);

  // Selected active skill for roadmap detail
  const [activeSkillId, setActiveSkillId] = useState<string>('');
  
  // Expanded states for roadmap accordions (levels 1-5)
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false
  });

  // Create Skill states
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillColor, setNewSkillColor] = useState('primary');

  // Add Topic states
  const [topicSkillId, setTopicSkillId] = useState('');
  const [topicLevel, setTopicLevel] = useState(1);
  const [topicName, setTopicName] = useState('');

  // Auto-select first skill if none is active
  useEffect(() => {
    if (skillList.length > 0) {
      if (!activeSkillId || !skills[activeSkillId]) {
        setActiveSkillId(skillList[0].id);
        setTopicSkillId(skillList[0].id);
      }
    } else {
      setActiveSkillId('');
      setTopicSkillId('');
    }
  }, [skills, activeSkillId]);

  const activeSkill = activeSkillId ? skills[activeSkillId] : undefined;

  // Helper calculations for skill roadmaps
  const getRoadmapStats = (roadmap: any[]) => {
    const total = roadmap.length;
    const completed = roadmap.filter(t => t.completed).length;
    const remaining = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, remaining, percentage };
  };

  const activeStats = activeSkill ? getRoadmapStats(activeSkill.roadmap) : { completed: 0, total: 0, remaining: 0, percentage: 0 };

  const handleLevelToggle = (lvl: number) => {
    setExpandedLevels(prev => ({
      ...prev,
      [lvl]: !prev[lvl]
    }));
  };

  const handleCreateSkill = (e: React.FormEvent) => {
    e.preventDefault();
    createSkill(newSkillName, newSkillColor);
    setNewSkillName('');
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    addRoadmapTopic(topicSkillId, topicLevel, topicName);
    setTopicName('');
  };

  // Skill colors definitions
  const borderColors: Record<string, string> = {
    primary: 'border-t-[#00f2fe]',
    secondary: 'border-t-[#e100ff]',
    accent: 'border-t-[#ff4769]',
    gold: 'border-t-[#f6d365]',
    success: 'border-t-[#00b09b]',
    custom: 'border-t-slate-400'
  };

  const progressColors: Record<string, string> = {
    primary: 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe]',
    secondary: 'bg-gradient-to-r from-[#7f00ff] to-[#e100ff]',
    accent: 'bg-gradient-to-r from-[#ff0844] to-[#ffb199]',
    gold: 'bg-gradient-to-r from-[#f6d365] to-[#fda085]',
    success: 'bg-gradient-to-r from-[#00b09b] to-[#96c93d]',
    custom: 'bg-gradient-to-r from-[#00f2fe] to-[#7f00ff]'
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      
      {/* Skill System Multipliers Info Alert */}
      <GlassCard className="bg-[#00f2fe]/3 border-[#00f2fe]/10">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-[#00f2fe]/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="text-[#00f2fe] animate-pulse" size={24} />
          </div>
          <div className="flex flex-col">
            <h3 className="font-heading font-bold text-[#00f2fe]">Gamified Roadmap Mechanics</h3>
            <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
              Check off roadmap topics to verify learning milestones. Completing any topic awards **+100 XP** to your rank, levels up the topic skill profile, and progresses you toward achievements.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Grid: Skill Catalog (left) & Roadmap detail (right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Columns: Skill cards & creator */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
            <Award size={20} className="text-[#e100ff]" />
            <span>Skill Matrix Profiles</span>
          </h3>

          <div className="flex flex-col gap-3">
            {Object.values(skills).map(sk => {
              const stats = getRoadmapStats(sk.roadmap);
              const isActive = activeSkillId === sk.id;
              
              return (
                <div
                  key={sk.id}
                  onClick={() => {
                    setActiveSkillId(sk.id);
                    setTopicSkillId(sk.id);
                  }}
                  className={`
                    glass-panel rounded-xl p-4 cursor-pointer border-t-[3px] transition-all duration-300 group
                    ${borderColors[sk.color] || 'border-t-slate-400'}
                    ${isActive 
                      ? 'bg-[#0f1627]/85 border-x-white/10 border-b-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]' 
                      : 'bg-white/2 hover:bg-white/4 border-x-transparent border-b-transparent'
                    }
                  `}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-heading font-bold text-slate-100">{sk.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-white/5 py-0.5 px-2 rounded-full">
                        LVL {sk.level}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete the skill "${sk.name}" and all its roadmap topics?`)) {
                            deleteSkill(sk.slug);
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100"
                        title="Delete skill"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-1">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${progressColors[sk.color]}`}
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{stats.percentage}% complete</span>
                    <span>{stats.completed}/{stats.total} topics</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create custom skill form */}
          <GlassCard className="mt-4 border-dashed">
            <h4 className="font-heading font-bold text-sm text-slate-200 mb-3 flex items-center gap-1.5">
              <Plus size={16} />
              <span>Create Skill Profile</span>
            </h4>
            <form onSubmit={handleCreateSkill} className="flex flex-col gap-3">
              <input 
                type="text"
                placeholder="E.g. System Design, NodeJS"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 w-full"
                required
              />
              <div className="flex gap-2">
                {(['primary', 'secondary', 'accent', 'gold', 'success'] as const).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewSkillColor(color)}
                    className={`
                      w-5 h-5 rounded-full border-2 transition-all
                      ${color === 'primary' ? 'bg-[#00f2fe]' : ''}
                      ${color === 'secondary' ? 'bg-[#e100ff]' : ''}
                      ${color === 'accent' ? 'bg-[#ff4769]' : ''}
                      ${color === 'gold' ? 'bg-[#f6d365]' : ''}
                      ${color === 'success' ? 'bg-[#00b09b]' : ''}
                      ${newSkillColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'border-transparent'}
                    `}
                  />
                ))}
              </div>
              <button 
                type="submit"
                className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-semibold"
              >
                Create Skill
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Right Columns: Active Roadmap Explorer */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {activeSkill ? (
            <div className="flex flex-col gap-6">
              
              {/* Active Skill header with automatic calculations */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Map className="text-[#00f2fe]" size={20} />
                    <h3 className="font-heading font-extrabold text-xl text-slate-100">{activeSkill.name} Learning Roadmap</h3>
                  </div>
                  <span className="text-xs text-slate-500">Structured pathway levels 1 to 5</span>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 md:gap-4 text-center text-xs w-full md:w-auto">
                  <div className="bg-white/2 border border-white/5 p-2 rounded-xl min-w-[70px] flex-grow sm:flex-grow-0">
                    <span className="text-slate-500 block">Complete</span>
                    <span className="font-bold text-slate-100 font-heading block mt-0.5">{activeStats.completed}</span>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-2 rounded-xl min-w-[70px] flex-grow sm:flex-grow-0">
                    <span className="text-slate-500 block">Total</span>
                    <span className="font-bold text-slate-100 font-heading block mt-0.5">{activeStats.total}</span>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-2 rounded-xl min-w-[70px] flex-grow sm:flex-grow-0">
                    <span className="text-slate-500 block">Remaining</span>
                    <span className="font-bold text-[#ff4769] font-heading block mt-0.5">{activeStats.remaining}</span>
                  </div>
                  <div className="bg-[#00f2fe]/5 border border-[#00f2fe]/10 p-2 rounded-xl min-w-[70px] flex-grow sm:flex-grow-0">
                    <span className="text-[#00f2fe] block">Percentage</span>
                    <span className="font-bold text-white font-heading block mt-0.5">{activeStats.percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Levels accordions explorer */}
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4, 5].map(lvl => {
                  const lvlTopics = activeSkill.roadmap.filter(t => t.level === lvl);
                  const isExpanded = expandedLevels[lvl];

                  return (
                    <div 
                      key={lvl} 
                      className="glass-panel rounded-xl overflow-hidden border border-white/5"
                    >
                      <button
                        onClick={() => handleLevelToggle(lvl)}
                        className="w-full flex items-center justify-between p-4 bg-white/2 hover:bg-white/4 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <GitBranch size={16} className="text-[#7f00ff]" />
                          <span className="font-heading font-semibold text-sm text-slate-100">
                            Level {lvl}: {getLevelTierName(lvl)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-500 font-bold bg-white/5 py-0.5 px-2 rounded-full">
                            {lvlTopics.filter(t => t.completed).length}/{lvlTopics.length} done
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden bg-[#090e1a]/30"
                          >
                            <div className="p-4 flex flex-col gap-2.5 border-t border-white/5">
                              {lvlTopics.length === 0 ? (
                                <span className="text-xs text-slate-600 italic">No topics added to this level yet.</span>
                              ) : (
                                lvlTopics.map(topic => (
                                  <div 
                                    key={topic.id}
                                    onClick={() => toggleRoadmapTopic(activeSkillId, topic.id)}
                                    className={`
                                      flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition-all duration-200 group
                                      ${topic.completed 
                                        ? 'bg-white/2 border-white/5 text-slate-500 opacity-60' 
                                        : 'bg-white/1 border-white/8 text-slate-200 hover:border-white/15 hover:bg-white/2'
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={topic.completed ? 'text-[#00b09b]' : 'text-slate-600 hover:text-white'}>
                                        {topic.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                      </div>
                                      <span className={`text-xs font-medium ${topic.completed ? 'line-through' : ''}`}>
                                        {topic.topic}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to delete the roadmap topic "${topic.topic}"?`)) {
                                          deleteRoadmapTopic(activeSkillId, topic.id);
                                        }
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-400/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100"
                                      title="Delete roadmap topic"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Add Topic form */}
              <GlassCard className="border-dashed">
                <h4 className="font-heading font-bold text-sm text-slate-200 mb-3 flex items-center gap-1.5">
                  <Plus size={16} />
                  <span>Add Topic to {activeSkill.name} Roadmap</span>
                </h4>
                <form onSubmit={handleAddTopic} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1 flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-400">Target Level</label>
                    <select
                      value={topicLevel}
                      onChange={(e) => setTopicLevel(parseInt(e.target.value))}
                      className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none"
                    >
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <option key={lvl} value={lvl} className="bg-[#060913]">Level {lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-400">Topic Title</label>
                    <input 
                      type="text"
                      placeholder="E.g. Hooks, Testing Library"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="md:col-span-1 py-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl"
                  >
                    Add Topic
                  </button>
                </form>
              </GlassCard>

            </div>
          ) : (
            <GlassCard className="h-64 flex flex-col items-center justify-center text-center p-6 border-dashed border-white/10" glowColor="none">
              <GitBranch size={40} className="text-slate-600 mb-3 stroke-1" />
              <span className="font-semibold text-xs text-slate-400">No active skill roadmaps</span>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                Create your first skill profile on the left (e.g. "React", "Python") to activate your learning roadmap pathways.
              </p>
            </GlassCard>
          )}
        </div>

      </div>

    </div>
  );
};

function getLevelTierName(level: number) {
  switch (level) {
    case 1: return 'Fundamentals';
    case 2: return 'Basic Core concepts';
    case 3: return 'Intermediate Logic';
    case 4: return 'Advanced Stack';
    case 5: return 'Testing & Operations';
    default: return 'Specialist';
  }
}
