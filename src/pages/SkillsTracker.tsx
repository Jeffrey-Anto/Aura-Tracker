import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square, 
  Plus, 
  Award, 
  GitBranch, 
  Map, 
  Trash2, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X,
  Sparkles,
  Paperclip,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { generateRoadmapFromPrompt, generateRoadmapFromFile, type GeneratedRoadmapResponse, type GeneratedRoadmapLevel } from '../utils/gemini';

export const SkillsTracker: React.FC = () => {
  const { 
    skills, 
    createSkill, 
    editSkillName,
    addRoadmapTopic, 
    editRoadmapTopic,
    toggleRoadmapTopic, 
    deleteSkill, 
    deleteRoadmapTopic,
    addRoadmapLevel,
    editRoadmapLevel,
    deleteRoadmapLevel,
    reorderRoadmapLevels
  } = useApp();
  
  const skillList = Object.values(skills);

  // Selected active skill for roadmap detail
  const [activeSkillId, setActiveSkillId] = useState<string>('');

  // Editing active roadmap name
  const [isEditingSkillName, setIsEditingSkillName] = useState(false);
  const [editingSkillName, setEditingSkillName] = useState('');
  
  // Expanded states for roadmap accordions (level numbers)
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({});

  // Create Skill states (Manual mode)
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillColor, setNewSkillColor] = useState('primary');
  const [newSkillTemplate, setNewSkillTemplate] = useState('empty');

  // Creation Mode: 'manual' | 'ai-prompt' | 'upload'
  const [creationMode, setCreationMode] = useState<'manual' | 'ai-prompt' | 'upload'>('manual');
  
  // AI Prompt Mode state
  const [aiPrompt, setAiPrompt] = useState('');
  
  // File Upload Mode state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Common AI loading & error state
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Preview Modal state
  const [previewRoadmap, setPreviewRoadmap] = useState<GeneratedRoadmapResponse | null>(null);
  const [previewSkillName, setPreviewSkillName] = useState('');
  const [previewSkillColor, setPreviewSkillColor] = useState('primary');
  const [isSavingRoadmap, setIsSavingRoadmap] = useState(false);

  // Add Level states
  const [isCreatingLevel, setIsCreatingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');

  // Rename Level states
  const [editingLevelNum, setEditingLevelNum] = useState<number | null>(null);
  const [editingLevelName, setEditingLevelName] = useState('');

  // Add Topic states
  const [topicLevel, setTopicLevel] = useState<number>(1);
  const [topicName, setTopicName] = useState('');

  // Edit Topic states
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');

  // Auto-select first skill if none is active
  useEffect(() => {
    if (skillList.length > 0) {
      if (!activeSkillId || !skills[activeSkillId]) {
        setActiveSkillId(skillList[0].slug);
      }
    } else {
      setActiveSkillId('');
    }
  }, [skills, activeSkillId]);

  const activeSkill = activeSkillId ? skills[activeSkillId] : undefined;

  // Auto-update target level for topic insertion when active skill changes
  useEffect(() => {
    if (activeSkill && activeSkill.levels.length > 0) {
      // Find the first level or default to 1
      const sorted = [...activeSkill.levels].sort((a, b) => a.display_order - b.display_order);
      setTopicLevel(sorted[0].level_number);
    }
  }, [activeSkillId, skills]);

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

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const createdSlug = await createSkill(newSkillName.trim(), newSkillColor, newSkillTemplate);
    if (createdSlug) {
      setActiveSkillId(createdSlug);
    }
    setNewSkillName('');
    setNewSkillTemplate('empty');
  };

  const handleGenerateFromPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await generateRoadmapFromPrompt(aiPrompt.trim());
      setPreviewRoadmap(res);
      setPreviewSkillName(res.skillName);
      setPreviewSkillColor(newSkillColor);
    } catch (err: any) {
      setAiError(err.message || 'Error generating roadmap');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleGenerateFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const res = await generateRoadmapFromFile(uploadedFile);
      setPreviewRoadmap(res);
      setPreviewSkillName(res.skillName);
      setPreviewSkillColor(newSkillColor);
    } catch (err: any) {
      setAiError(err.message || 'Error analyzing document');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleRegenerateRoadmap = async () => {
    setIsAiGenerating(true);
    setAiError(null);

    try {
      let res: GeneratedRoadmapResponse;
      if (creationMode === 'upload' && uploadedFile) {
        res = await generateRoadmapFromFile(uploadedFile);
      } else {
        res = await generateRoadmapFromPrompt(aiPrompt.trim() || previewSkillName);
      }
      setPreviewRoadmap(res);
      setPreviewSkillName(res.skillName);
    } catch (err: any) {
      setAiError(err.message || 'Error regenerating roadmap');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleConfirmSaveRoadmap = async () => {
    if (!previewRoadmap || !previewSkillName.trim()) return;
    setIsSavingRoadmap(true);

    try {
      const customLevels = previewRoadmap.levels.map((lvl: GeneratedRoadmapLevel) => ({
        level_number: lvl.levelNumber,
        name: lvl.name
      }));

      const customRoadmap: { level: number; topic: string }[] = [];
      previewRoadmap.levels.forEach((lvl: GeneratedRoadmapLevel) => {
        lvl.topics.forEach((t: string) => {
          customRoadmap.push({
            level: lvl.levelNumber,
            topic: t
          });
        });
      });

      const createdSlug = await createSkill(
        previewSkillName.trim(),
        previewSkillColor,
        'custom',
        customRoadmap,
        customLevels
      );

      if (createdSlug) {
        setActiveSkillId(createdSlug);
      }

      setPreviewRoadmap(null);
      setAiPrompt('');
      setUploadedFile(null);
    } catch (err: any) {
      console.error('Error saving roadmap:', err);
    } finally {
      setIsSavingRoadmap(false);
    }
  };

  const handleAddLevelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill || !newLevelName.trim()) return;
    addRoadmapLevel(activeSkill.slug, newLevelName.trim());
    setNewLevelName('');
    setIsCreatingLevel(false);
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSkill) return;
    addRoadmapTopic(activeSkill.slug, topicLevel, topicName);
    setTopicName('');
  };

  const handleMoveLevel = (index: number, direction: 'up' | 'down') => {
    if (!activeSkill) return;
    const sortedLevels = [...activeSkill.levels].sort((a, b) => a.display_order - b.display_order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= sortedLevels.length) return;

    // Swap elements
    const temp = sortedLevels[index];
    sortedLevels[index] = sortedLevels[targetIndex];
    sortedLevels[targetIndex] = temp;

    // Re-assign display_order values sequentially
    const reordered = sortedLevels.map((lvl, idx) => ({
      ...lvl,
      display_order: idx + 1
    }));

    reorderRoadmapLevels(activeSkill.slug, reordered);
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

  // Memoize sorted levels list
  const sortedLevelsList = useMemo(() => {
    if (!activeSkill) return [];
    return [...activeSkill.levels].sort((a, b) => a.display_order - b.display_order);
  }, [activeSkill]);

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
            {skillList.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No skills created yet. Use the form below to add one.</span>
            ) : (
              skillList.map(sk => {
                const stats = getRoadmapStats(sk.roadmap);
                const isActive = activeSkillId === sk.slug;
                
                return (
                  <div
                    key={sk.id}
                    onClick={() => {
                      setActiveSkillId(sk.slug);
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
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSkillId(sk.slug);
                            setIsEditingSkillName(true);
                            setEditingSkillName(sk.name);
                          }}
                          className="text-slate-500 hover:text-[#00f2fe] p-1 rounded hover:bg-white/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Change roadmap name"
                        >
                          <Edit2 size={13} />
                        </button>
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
              })
            )}
          </div>

          {/* Create skill & roadmap panel */}
          <GlassCard className="mt-4 border-dashed">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <Plus size={16} />
                <span>Create Skill & Roadmap</span>
              </h4>
            </div>

            {/* Creation Mode Tabs */}
            <div className="flex bg-white/4 p-1 rounded-xl gap-1 mb-3.5">
              <button
                type="button"
                onClick={() => { setCreationMode('manual'); setAiError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  creationMode === 'manual' 
                    ? 'bg-[#00f2fe] text-slate-900 shadow-[0_0_10px_rgba(0,242,254,0.3)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => { setCreationMode('ai-prompt'); setAiError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  creationMode === 'ai-prompt' 
                    ? 'bg-gradient-to-r from-[#e100ff] to-[#7f00ff] text-white shadow-[0_0_10px_rgba(225,0,255,0.3)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles size={11} />
                <span>AI Prompt</span>
              </button>
              <button
                type="button"
                onClick={() => { setCreationMode('upload'); setAiError(null); }}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  creationMode === 'upload' 
                    ? 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 shadow-[0_0_10px_rgba(0,242,254,0.3)]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Paperclip size={11} />
                <span>Upload File</span>
              </button>
            </div>

            {/* Mode 1: Manual Creation (Existing Workflow) */}
            {creationMode === 'manual' && (
              <form onSubmit={handleCreateSkill} className="flex flex-col gap-3">
                <input 
                  type="text"
                  placeholder="E.g. System Design, NodeJS"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 w-full"
                  required
                />
                
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-[10px] font-semibold text-slate-400">Roadmap Template</label>
                  <select
                    value={newSkillTemplate}
                    onChange={(e) => setNewSkillTemplate(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-2 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value="empty" className="bg-[#060913]">Empty Roadmap (Add levels later)</option>
                    <option value="react" className="bg-[#060913]">React (15 frontend topics)</option>
                    <option value="dsa" className="bg-[#060913]">DSA (15 algorithmic topics)</option>
                    <option value="aptitude" className="bg-[#060913]">Aptitude (15 math & logic topics)</option>
                    <option value="dbms" className="bg-[#060913]">DBMS (15 database topics)</option>
                    <option value="os" className="bg-[#060913]">Operating Systems (15 hardware topics)</option>
                  </select>
                </div>

                <div className="flex gap-2 my-1.5 items-center">
                  {(['primary', 'secondary', 'accent', 'gold', 'success'] as const).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewSkillColor(color)}
                      className={`
                        w-5 h-5 rounded-full border-2 transition-all cursor-pointer
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
                  className="w-full py-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.01] transition-all cursor-pointer"
                >
                  Create Skill
                </button>
              </form>
            )}

            {/* Mode 2: AI Prompt-Based Creation */}
            {creationMode === 'ai-prompt' && (
              <form onSubmit={handleGenerateFromPrompt} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Describe What You Want to Learn</label>
                  <input 
                    type="text"
                    placeholder="E.g. React roadmap, Golang backend, Kubernetes..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#e100ff]/50 placeholder-slate-600 w-full"
                    required
                  />
                </div>

                <div className="flex gap-2 my-1 items-center">
                  <span className="text-[10px] text-slate-500 mr-1">Color:</span>
                  {(['primary', 'secondary', 'accent', 'gold', 'success'] as const).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewSkillColor(color)}
                      className={`
                        w-5 h-5 rounded-full border-2 transition-all cursor-pointer
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

                {aiError && (
                  <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 text-[11px]">
                    {aiError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="w-full py-2 bg-gradient-to-r from-[#e100ff] to-[#7f00ff] text-white font-heading font-semibold text-xs rounded-xl shadow-[0_0_15px_rgba(225,0,255,0.3)] hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Generating with Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Generate Roadmap with AI</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Mode 3: File-Upload Based Creation */}
            {creationMode === 'upload' && (
              <form onSubmit={handleGenerateFromFile} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-slate-400">Upload Syllabus, Outline, or PDF</label>
                  
                  <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/2 hover:bg-white/4 border border-white/8 hover:border-white/15 border-dashed cursor-pointer transition-all">
                    <Paperclip size={18} className="text-[#00f2fe]" />
                    <span className="text-xs text-slate-300 font-medium text-center">
                      {uploadedFile ? uploadedFile.name : 'Choose a file (PDF, TXT, MD, DOCX)'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {uploadedFile ? `${Math.round(uploadedFile.size / 1024)} KB` : 'Gemini AI will extract structured levels & topics'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.json,.csv,.doc,.docx"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      disabled={isAiGenerating}
                    />
                  </label>
                </div>

                <div className="flex gap-2 my-1 items-center">
                  <span className="text-[10px] text-slate-500 mr-1">Color:</span>
                  {(['primary', 'secondary', 'accent', 'gold', 'success'] as const).map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewSkillColor(color)}
                      className={`
                        w-5 h-5 rounded-full border-2 transition-all cursor-pointer
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

                {aiError && (
                  <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 text-[11px]">
                    {aiError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isAiGenerating || !uploadedFile}
                  className="w-full py-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAiGenerating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Analyzing Document with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Extract Roadmap from File</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </GlassCard>
        </div>

        {/* Right Columns: Active Roadmap Explorer */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {activeSkill ? (
            <div className="flex flex-col gap-6">
              
              {/* Active Skill header with automatic calculations */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  {isEditingSkillName ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (editingSkillName.trim()) {
                          await editSkillName(activeSkill.slug, editingSkillName);
                          setIsEditingSkillName(false);
                        }
                      }}
                      className="flex items-center gap-2 mb-1 flex-wrap"
                    >
                      <Map className="text-[#00f2fe] shrink-0" size={20} />
                      <input
                        type="text"
                        value={editingSkillName}
                        onChange={(e) => setEditingSkillName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setIsEditingSkillName(false);
                        }}
                        className="bg-[#060913] border border-[#00f2fe]/40 rounded-xl px-3 py-1 font-heading font-extrabold text-xl text-slate-100 outline-none w-full sm:w-auto min-w-[280px]"
                        autoFocus
                        required
                      />
                      <button
                        type="submit"
                        className="p-1.5 bg-[#00f2fe]/15 text-[#00f2fe] rounded-lg hover:bg-[#00f2fe]/25 transition-colors cursor-pointer"
                        title="Save roadmap name"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingSkillName(false)}
                        className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 mb-1">
                      <Map className="text-[#00f2fe] shrink-0" size={20} />
                      <h3 className="font-heading font-extrabold text-xl text-slate-100">{activeSkill.name} Learning Roadmap</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSkillName(true);
                          setEditingSkillName(activeSkill.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#00f2fe] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                        title="Change roadmap name"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                  <span className="text-xs text-slate-500">Structured learning levels, synced through Supabase</span>
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
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Levels ({sortedLevelsList.length})</span>
                  
                  {!isCreatingLevel ? (
                    <button 
                      onClick={() => setIsCreatingLevel(true)}
                      className="text-xs font-semibold text-[#00f2fe] hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Level
                    </button>
                  ) : (
                    <form onSubmit={handleAddLevelSubmit} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Level name (e.g. Advanced)"
                        value={newLevelName}
                        onChange={(e) => setNewLevelName(e.target.value)}
                        className="bg-white/3 border border-white/8 rounded-lg py-1 px-2 text-xs text-slate-100 outline-none w-44"
                        required
                        autoFocus
                      />
                      <button type="submit" className="p-1.5 bg-[#00f2fe]/15 text-[#00f2fe] rounded-lg hover:bg-[#00f2fe]/25">
                        <Check size={12} />
                      </button>
                      <button type="button" onClick={() => setIsCreatingLevel(false)} className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10">
                        <X size={12} />
                      </button>
                    </form>
                  )}
                </div>

                {sortedLevelsList.length === 0 ? (
                  <span className="text-xs text-slate-500 italic text-center py-6 bg-white/2 rounded-xl border border-dashed border-white/5">
                    No roadmap levels created. Add a level above to get started.
                  </span>
                ) : (
                  sortedLevelsList.map((lvl, index) => {
                    const lvlTopics = activeSkill.roadmap.filter(t => t.level === lvl.level_number);
                    const isExpanded = expandedLevels[lvl.level_number];

                    return (
                      <div 
                        key={lvl.id} 
                        className="glass-panel rounded-xl overflow-hidden border border-white/5"
                      >
                        <div className="w-full flex items-center justify-between p-4 bg-white/2 hover:bg-white/4 text-left transition-colors">
                          <button
                            onClick={() => handleLevelToggle(lvl.level_number)}
                            className="flex-grow flex items-center gap-2 text-left"
                          >
                            <GitBranch size={16} className="text-[#7f00ff] shrink-0" />
                            
                            {editingLevelNum === lvl.level_number ? (
                              <input
                                type="text"
                                value={editingLevelName}
                                onChange={(e) => setEditingLevelName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    editRoadmapLevel(activeSkill.slug, lvl.level_number, { name: editingLevelName });
                                    setEditingLevelNum(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingLevelNum(null);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#060913] border border-[#00f2fe]/40 rounded px-2 py-0.5 text-xs text-slate-100 outline-none w-48 font-medium"
                                autoFocus
                                required
                              />
                            ) : (
                              <span className="font-heading font-semibold text-sm text-slate-100">
                                Level {lvl.level_number}: {lvl.name}
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-2.5 shrink-0 ml-3">
                            <span className="text-[10px] text-slate-500 font-bold bg-white/5 py-0.5 px-2 rounded-full">
                              {lvlTopics.filter(t => t.completed).length}/{lvlTopics.length} done
                            </span>
                            
                            {/* Reorder Buttons */}
                            <div className="flex items-center gap-0.5 bg-white/3 border border-white/5 rounded-lg p-0.5">
                              <button
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveLevel(index, 'up');
                                }}
                                className={`p-1 rounded ${index === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                title="Move level up"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                disabled={index === sortedLevelsList.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveLevel(index, 'down');
                                }}
                                className={`p-1 rounded ${index === sortedLevelsList.length - 1 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                title="Move level down"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>

                            {/* Edit / Save actions */}
                            {editingLevelNum === lvl.level_number ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editRoadmapLevel(activeSkill.slug, lvl.level_number, { name: editingLevelName });
                                    setEditingLevelNum(null);
                                  }}
                                  className="text-[#00b09b] p-1 rounded hover:bg-white/5"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingLevelNum(null);
                                  }}
                                  className="text-slate-400 p-1 rounded hover:bg-white/5"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLevelNum(lvl.level_number);
                                  setEditingLevelName(lvl.name);
                                }}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5"
                                title="Rename level"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete "${lvl.name}" (Level ${lvl.level_number})? This will delete all its topics and sync to Supabase.`)) {
                                  deleteRoadmapLevel(activeSkill.slug, lvl.level_number);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5"
                              title="Delete level"
                            >
                              <Trash2 size={12} />
                            </button>

                            {/* Collapse Toggle */}
                            <button 
                              onClick={() => handleLevelToggle(lvl.level_number)} 
                              className="text-slate-400 hover:text-white p-0.5"
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </div>
                        </div>

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
                                      onClick={() => {
                                        if (editingTopicId !== topic.id) {
                                          toggleRoadmapTopic(activeSkill.slug, topic.id);
                                        }
                                      }}
                                      className={`
                                        flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition-all duration-200 group
                                        ${topic.completed 
                                          ? 'bg-white/2 border-white/5 text-slate-500 opacity-60' 
                                          : 'bg-white/1 border-white/8 text-slate-200 hover:border-white/15 hover:bg-white/2'
                                        }
                                      `}
                                    >
                                      <div className="flex items-center gap-3 flex-grow mr-4">
                                        <div className={topic.completed ? 'text-[#00b09b] shrink-0' : 'text-slate-600 hover:text-white shrink-0'}>
                                          {topic.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>

                                        {editingTopicId === topic.id ? (
                                          <input
                                            type="text"
                                            value={editingTopicName}
                                            onChange={(e) => setEditingTopicName(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                editRoadmapTopic(activeSkill.slug, topic.id, editingTopicName);
                                                setEditingTopicId(null);
                                              } else if (e.key === 'Escape') {
                                                setEditingTopicId(null);
                                              }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-[#060913] border border-[#00f2fe]/40 rounded px-2 py-0.5 text-xs text-slate-100 outline-none w-full font-medium"
                                            autoFocus
                                            required
                                          />
                                        ) : (
                                          <span className={`text-xs font-medium ${topic.completed ? 'line-through' : ''}`}>
                                            {topic.topic}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Edit topic button */}
                                        {editingTopicId === topic.id ? (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                editRoadmapTopic(activeSkill.slug, topic.id, editingTopicName);
                                                setEditingTopicId(null);
                                              }}
                                              className="p-1 text-[#00b09b] rounded hover:bg-white/5"
                                            >
                                              <Check size={12} />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTopicId(null);
                                              }}
                                              className="p-1 text-slate-400 rounded hover:bg-white/5"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingTopicId(topic.id);
                                              setEditingTopicName(topic.topic);
                                            }}
                                            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100"
                                            title="Rename topic"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                        )}

                                        {/* Delete topic button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Are you sure you want to delete the roadmap topic "${topic.topic}"?`)) {
                                              deleteRoadmapTopic(activeSkill.slug, topic.id);
                                            }
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-400/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100"
                                          title="Delete roadmap topic"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Topic form */}
              {sortedLevelsList.length > 0 && (
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
                        className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none w-full"
                      >
                        {sortedLevelsList.map(lvl => (
                          <option key={lvl.level_number} value={lvl.level_number} className="bg-[#060913]">
                            Level {lvl.level_number}: {lvl.name}
                          </option>
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
                        className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 w-full"
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
              )}

            </div>
          ) : (
            <GlassCard className="h-96 flex flex-col items-center justify-center text-center p-6 border-dashed border-white/10" glowColor="none">
              <GitBranch size={44} className="text-slate-600 mb-4 stroke-1" />
              <span className="font-semibold text-sm text-slate-300">No active skill roadmaps</span>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                Create your first skill profile in the left catalog (e.g. "React", "DSA") to unlock your customized learning roadmaps. 
              </p>
              <div className="mt-4 bg-[#00f2fe]/5 border border-[#00f2fe]/10 p-3.5 rounded-xl max-w-xs">
                <span className="text-[11px] font-bold text-[#00f2fe] uppercase tracking-wider block mb-1">Onboarding Guide:</span>
                <p className="text-[10px] text-slate-400 leading-normal text-left">
                  You can use templates to generate pre-populated roadmaps instantly, or build from scratch using custom levels and topics that sync through Supabase.
                </p>
              </div>
            </GlassCard>
          )}
        </div>

      </div>

      {/* Roadmap Preview & Confirmation Dialog Modal */}
      <AnimatePresence>
        {previewRoadmap && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewRoadmap(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#090e1a]/95 border border-white/10 rounded-2xl p-6 lg:p-7 shadow-[0_0_40px_rgba(0,0,0,0.8)] z-10 max-h-[88vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-[#e100ff]" />
                    <h3 className="font-heading font-extrabold text-slate-100 text-lg">
                      Roadmap Preview & Confirmation
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Review your AI-generated curriculum before adding it to your active skill matrix.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewRoadmap(null)}
                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Skill Title & Color Customization in Preview */}
              <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skill Title</label>
                  <input
                    type="text"
                    value={previewSkillName}
                    onChange={(e) => setPreviewSkillName(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-lg py-1.5 px-3 text-sm font-heading font-bold text-[#00f2fe] outline-none focus:border-[#00f2fe]/40 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Accent Color</label>
                  <div className="flex gap-1.5 items-center">
                    {(['primary', 'secondary', 'accent', 'gold', 'success'] as const).map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPreviewSkillColor(color)}
                        className={`
                          w-5 h-5 rounded-full border-2 transition-all cursor-pointer
                          ${color === 'primary' ? 'bg-[#00f2fe]' : ''}
                          ${color === 'secondary' ? 'bg-[#e100ff]' : ''}
                          ${color === 'accent' ? 'bg-[#ff4769]' : ''}
                          ${color === 'gold' ? 'bg-[#f6d365]' : ''}
                          ${color === 'success' ? 'bg-[#00b09b]' : ''}
                          ${previewSkillColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'border-transparent'}
                        `}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Generated Curriculum Structure Preview */}
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                  <span>Generated Levels & Topics ({previewRoadmap.levels.length} levels)</span>
                  <span>
                    {previewRoadmap.levels.reduce((sum: number, l: GeneratedRoadmapLevel) => sum + l.topics.length, 0)} total topics
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {previewRoadmap.levels.map((lvl: GeneratedRoadmapLevel) => (
                    <div 
                      key={lvl.levelNumber} 
                      className="bg-white/2 border border-white/6 rounded-xl p-3.5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GitBranch size={14} className="text-[#00f2fe]" />
                          <span className="font-heading font-bold text-xs text-slate-200">
                            Level {lvl.levelNumber}: {lvl.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white/5 py-0.5 px-2 rounded-full">
                          {lvl.topics.length} topics
                        </span>
                      </div>

                      <ul className="flex flex-col gap-1.5 pl-5 list-disc text-xs text-slate-400">
                        {lvl.topics.map((t: string, idx: number) => (
                          <li key={idx} className="leading-snug">
                            <span className="text-slate-300">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Question Alert Banner */}
              <div className="p-3.5 rounded-xl bg-[#00f2fe]/5 border border-[#00f2fe]/15 mb-5 flex items-start gap-2.5">
                <Sparkles size={16} className="text-[#00f2fe] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-heading font-bold text-slate-200 block">Looks good? Save this roadmap?</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed block mt-0.5">
                    Once confirmed, this roadmap will be saved to your profile. You can edit, reorder, add, or delete individual topics and levels anytime afterward.
                  </span>
                </div>
              </div>

              {/* Action Buttons: Cancel, Regenerate, Confirm & Save */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPreviewRoadmap(null)}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-heading font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateRoadmap}
                    disabled={isAiGenerating}
                    className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-[#00f2fe] border border-[#00f2fe]/20 rounded-xl text-xs font-heading font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={13} className={isAiGenerating ? 'animate-spin' : ''} />
                    <span>{isAiGenerating ? 'Regenerating...' : 'Regenerate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSaveRoadmap}
                    disabled={isSavingRoadmap || isAiGenerating}
                    className="py-2.5 px-5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 rounded-xl text-xs font-heading font-semibold shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.01] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingRoadmap ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm & Save Roadmap</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
