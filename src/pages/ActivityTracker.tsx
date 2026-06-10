import React, { useState, useMemo, useEffect } from 'react';
import { 
  PlusCircle, Settings, Trash2, Calendar, Target, Clock, BookOpen, 
  Binary, Archive, Check, X, Edit2, Plus 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { getLocalDateString, parseLocalDate, formatLocalDateStr } from '../utils/date';
import type { Goal } from '../types';

export const ActivityTracker: React.FC = () => {
  const { 
    logs, 
    customActivities, 
    goals, 
    goalsList,
    addLog, 
    deleteLog, 
    updateGoal, 
    createGoal,
    editGoal,
    deleteGoal,
    archiveGoal,
    createCustomActivity, 
    deleteCustomActivity,
    skills 
  } = useApp();

  // Tab state in the right column
  const [rightTab, setRightTab] = useState<'history' | 'goals'>('history');

  // Form states
  const [logType, setLogType] = useState('study');
  const [logAmount, setLogAmount] = useState(2);
  const [logNotes, setLogNotes] = useState('');
  const [logDate, setLogDate] = useState(getLocalDateString());

  // Goal config states
  const [goalPeriod, setGoalPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Controlled goal values initialized
  const [goalStudy, setGoalStudy] = useState(goals.daily.studyHours);
  const [goalWorkout, setGoalWorkout] = useState(goals.daily.workoutMins);
  const [goalReading, setGoalReading] = useState(goals.daily.readingMins);
  const [goalLeetcode, setGoalLeetcode] = useState(goals.daily.leetcodeCount);

  // Sync controlled state when context goals load or period changes
  useEffect(() => {
    setGoalStudy(goals[goalPeriod].studyHours);
    setGoalWorkout(goals[goalPeriod].workoutMins);
    setGoalReading(goals[goalPeriod].readingMins);
    setGoalLeetcode(goals[goalPeriod].leetcodeCount);
  }, [goals, goalPeriod]);

  // Visual validations bounds feedback
  const goalStudyError = goalStudy < 0 || goalStudy > 24 ? "Must be between 0 and 24 hours" : null;
  const goalWorkoutError = goalWorkout < 0 || goalWorkout > 1440 ? "Must be between 0 and 1440 minutes" : null;
  const goalReadingError = goalReading < 0 || goalReading > 1440 ? "Must be between 0 and 1440 minutes" : null;
  const goalLeetcodeError = goalLeetcode < 0 ? "Must be 0 or more" : null;

  const hasGoalErrors = !!(goalStudyError || goalWorkoutError || goalReadingError || goalLeetcodeError);

  // Custom activity states
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Skills');
  const [customUnit, setCustomUnit] = useState('hrs');
  const [customXp, setCustomXp] = useState(50);

  // Custom goal builder states
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalValue, setNewGoalValue] = useState(10);
  const [newGoalUnit, setNewGoalUnit] = useState('hrs');
  const [newGoalPeriod, setNewGoalPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [newGoalField, setNewGoalField] = useState('studyHours');

  // Inline Goal Editing state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState(0);

  // Helper to determine metric configs based on selected type
  const getSliderConfig = (type: string) => {
    const custom = customActivities.find(act => act.id === type);
    if (custom) {
      if (custom.unit === 'mins') return { min: 5, max: 180, step: 5, unit: 'mins' };
      return { min: 1, max: 100, step: 1, unit: custom.unit };
    }

    switch (type) {
      case 'workout':
      case 'reading':
        return { min: 10, max: 180, step: 5, unit: 'mins' };
      case 'dsa':
        return { min: 1, max: 20, step: 1, unit: 'solved' };
      default:
        return { min: 0.5, max: 12, step: 0.5, unit: 'hrs' };
    }
  };

  const sliderConfig = getSliderConfig(logType);

  const handleLogTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setLogType(type);
    const config = getSliderConfig(type);
    setLogAmount(config.min === 0.5 ? 2 : config.min === 10 ? 30 : 3);
  };

  // Submit logging
  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const custom = customActivities.find(act => act.id === logType);
    addLog({
      type: logType,
      amount: logAmount,
      date: logDate,
      notes: logNotes,
      unit: sliderConfig.unit,
      category: custom ? custom.category : undefined
    });
    setLogNotes('');
  };

  // Submit Goal updates
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasGoalErrors) return;
    updateGoal(goalPeriod, 'studyHours', goalStudy);
    updateGoal(goalPeriod, 'workoutMins', goalWorkout);
    updateGoal(goalPeriod, 'readingMins', goalReading);
    updateGoal(goalPeriod, 'leetcodeCount', goalLeetcode);
  };

  // Toggle Goal periods to populate inputs
  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setGoalPeriod(period);
  };

  // Submit custom activity configuration
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomActivity(customName, customCategory, customUnit, customXp);
    setCustomName('');
    setCustomUnit('hrs');
    setCustomXp(50);
  };

  // Submit custom goal
  const handleCreateCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || newGoalValue <= 0) return;
    createGoal({
      title: newGoalTitle.trim(),
      target_value: newGoalValue,
      unit: newGoalUnit,
      period: newGoalPeriod,
      target_field: newGoalField
    });
    setNewGoalTitle('');
    setNewGoalValue(10);
  };

  // Helper calculations for active goals progression and remaining target computations
  const currentProgression = useMemo(() => {
    const now = new Date();
    let periodLogs = [];

    if (goalPeriod === 'daily') {
      const todayStr = getLocalDateString(now);
      periodLogs = logs.filter(l => l.date === todayStr);
    } else if (goalPeriod === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      periodLogs = logs.filter(l => parseLocalDate(l.date) >= lastWeek);
    } else {
      const lastMonth = new Date();
      lastMonth.setDate(now.getDate() - 30);
      periodLogs = logs.filter(l => parseLocalDate(l.date) >= lastMonth);
    }

    const study = periodLogs
      .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || l.type === 'dbms' || l.type === 'aptitude' || l.type === 'communication' || !!skills[l.type])
      .reduce((sum, l) => sum + (l.unit === 'hrs' ? Number(l.amount) : 0), 0);

    const workout = periodLogs
      .filter(l => l.type === 'workout')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const reading = periodLogs
      .filter(l => l.type === 'reading')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const leetcode = periodLogs
      .filter(l => l.type === 'dsa')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    return { study, workout, reading, leetcode };
  }, [logs, goalPeriod, skills]);

  const targetGoals = goals[goalPeriod];

  // Helper to dynamically calculate current value of ANY goal from user activity logs
  const getGoalProgress = (goal: Goal) => {
    const now = new Date();
    let periodLogs = [];

    if (goal.period === 'daily') {
      const todayStr = getLocalDateString(now);
      periodLogs = logs.filter(l => l.date === todayStr);
    } else if (goal.period === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      periodLogs = logs.filter(l => parseLocalDate(l.date) >= lastWeek);
    } else if (goal.period === 'monthly') {
      const lastMonth = new Date();
      lastMonth.setDate(now.getDate() - 30);
      periodLogs = logs.filter(l => parseLocalDate(l.date) >= lastMonth);
    } else {
      periodLogs = logs;
    }

    if (goal.target_field === 'studyHours') {
      return periodLogs
        .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || l.type === 'dbms' || l.type === 'aptitude' || l.type === 'communication' || !!skills[l.type])
        .reduce((sum, l) => sum + (l.unit === 'hrs' ? Number(l.amount) : 0), 0);
    } else if (goal.target_field === 'workoutMins') {
      return periodLogs
        .filter(l => l.type === 'workout')
        .reduce((sum, l) => sum + Number(l.amount), 0);
    } else if (goal.target_field === 'readingMins') {
      return periodLogs
        .filter(l => l.type === 'reading')
        .reduce((sum, l) => sum + Number(l.amount), 0);
    } else if (goal.target_field === 'leetcodeCount') {
      return periodLogs
        .filter(l => l.type === 'dsa')
        .reduce((sum, l) => sum + Number(l.amount), 0);
    } else {
      // Custom goal matches type ID or name
      const targetId = goal.target_field;
      return periodLogs
        .filter(l => l.type === targetId || l.category === targetId)
        .reduce((sum, l) => sum + Number(l.amount), 0);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 pb-10">
      
      {/* Left Columns: Forms */}
      <div className="xl:col-span-2 flex flex-col gap-6 lg:gap-8">
        
        {/* Logging Card Form */}
        <GlassCard>
          <div className="mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-100">Log Daily Activity</h3>
            <span className="text-xs text-slate-500">Log Study hours, workouts, and solved metrics</span>
          </div>

          <form onSubmit={handleLogSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Activity Category</label>
              <select 
                value={logType} 
                onChange={handleLogTypeChange}
                className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-sm outline-none focus:border-[#00f2fe]/40 transition-colors"
              >
                <option value="study" className="bg-[#060913] text-white">General Study</option>
                <option value="react" className="bg-[#060913] text-white">React Learning</option>
                <option value="dsa" className="bg-[#060913] text-white">DSA Practice</option>
                <option value="dbms" className="bg-[#060913] text-white">DBMS Review</option>
                <option value="aptitude" className="bg-[#060913] text-white">Aptitude Training</option>
                <option value="communication" className="bg-[#060913] text-white">Communication Practice</option>
                <option value="workout" className="bg-[#060913] text-white">Workout Session</option>
                <option value="reading" className="bg-[#060913] text-white">Reading Session</option>
                {customActivities.map(act => (
                  <option key={act.id} value={act.id} className="bg-[#060913] text-white">
                    {act.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-400">Amount / Duration</span>
                <span className="text-[#00f2fe] font-bold font-heading">{logAmount} {sliderConfig.unit}</span>
              </div>
              <input 
                type="range"
                min={sliderConfig.min}
                max={sliderConfig.max}
                step={sliderConfig.step}
                value={logAmount}
                onChange={(e) => setLogAmount(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none accent-[#00f2fe]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Details / Notes</label>
              <input 
                type="text"
                placeholder="E.g. Learned Redux patterns, ran 5k, read page 20"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-sm outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Date</label>
              <div className="relative flex items-center">
                <input 
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-sm outline-none focus:border-[#00f2fe]/40 transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="mt-2 w-full py-3 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-sm rounded-xl hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <PlusCircle size={18} />
              <span>Record Activity Log</span>
            </button>
          </form>
        </GlassCard>

        {/* Goals Configuration Form */}
        <GlassCard>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-100">Goals Manager</h3>
              <span className="text-xs text-slate-500">Configure target metrics and trackers</span>
            </div>
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
              {(['daily', 'weekly', 'monthly'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`
                    text-[10px] font-bold uppercase py-1 px-2.5 rounded-lg transition-colors
                    ${goalPeriod === p ? 'bg-[#00f2fe] text-slate-900' : 'text-slate-400 hover:text-white'}
                  `}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Targets Dashboard progress and Remaining targets calculation */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-white/2 border border-white/5 p-3 rounded-xl">
            <div>
              <span className="text-slate-500 block">Study Remaining</span>
              <span className="text-slate-200 font-semibold font-heading block mt-0.5">
                {Math.max(0, targetGoals.studyHours - currentProgression.study).toFixed(1)} hrs left
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Workout Remaining</span>
              <span className="text-slate-200 font-semibold font-heading block mt-0.5">
                {Math.max(0, targetGoals.workoutMins - currentProgression.workout)} mins left
              </span>
            </div>
            <div className="mt-2">
              <span className="text-slate-500 block">Reading Remaining</span>
              <span className="text-slate-200 font-semibold font-heading block mt-0.5">
                {Math.max(0, targetGoals.readingMins - currentProgression.reading)} mins left
              </span>
            </div>
            <div className="mt-2">
              <span className="text-slate-500 block">LeetCode Target left</span>
              <span className="text-slate-200 font-semibold font-heading block mt-0.5">
                {Math.max(0, targetGoals.leetcodeCount - currentProgression.leetcode)} left
              </span>
            </div>
          </div>

          <form onSubmit={handleGoalSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              
              {/* Study Hours Controlled Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <BookOpen size={12} />
                  <span>Study Hours</span>
                </label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="0"
                  value={goalStudy === 0 ? '' : goalStudy}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGoalStudy(isNaN(val) ? 0 : val);
                  }}
                  className={`bg-white/3 border rounded-xl py-2 px-3 text-slate-100 text-xs outline-none transition-colors ${
                    goalStudyError ? 'border-red-500/50 focus:border-red-500' : 'border-white/8 focus:border-[#00f2fe]/40'
                  }`}
                />
                {goalStudyError && <span className="text-[9px] text-red-400 font-semibold leading-none">{goalStudyError}</span>}
              </div>

              {/* Workout Minutes Controlled Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  <span>Workout Mins</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  max="1440"
                  placeholder="0"
                  value={goalWorkout === 0 ? '' : goalWorkout}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setGoalWorkout(isNaN(val) ? 0 : val);
                  }}
                  className={`bg-white/3 border rounded-xl py-2 px-3 text-slate-100 text-xs outline-none transition-colors ${
                    goalWorkoutError ? 'border-red-500/50 focus:border-red-500' : 'border-white/8 focus:border-[#00f2fe]/40'
                  }`}
                />
                {goalWorkoutError && <span className="text-[9px] text-red-400 font-semibold leading-none">{goalWorkoutError}</span>}
              </div>

              {/* Reading Minutes Controlled Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Target size={12} />
                  <span>Reading Mins</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  max="1440"
                  placeholder="0"
                  value={goalReading === 0 ? '' : goalReading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setGoalReading(isNaN(val) ? 0 : val);
                  }}
                  className={`bg-white/3 border rounded-xl py-2 px-3 text-slate-100 text-xs outline-none transition-colors ${
                    goalReadingError ? 'border-red-500/50 focus:border-red-500' : 'border-white/8 focus:border-[#00f2fe]/40'
                  }`}
                />
                {goalReadingError && <span className="text-[9px] text-red-400 font-semibold leading-none">{goalReadingError}</span>}
              </div>

              {/* LeetCode count Controlled Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Binary size={12} />
                  <span>LeetCode count</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  placeholder="0"
                  value={goalLeetcode === 0 ? '' : goalLeetcode}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setGoalLeetcode(isNaN(val) ? 0 : val);
                  }}
                  className={`bg-white/3 border rounded-xl py-2 px-3 text-slate-100 text-xs outline-none transition-colors ${
                    goalLeetcodeError ? 'border-red-500/50 focus:border-red-500' : 'border-white/8 focus:border-[#00f2fe]/40'
                  }`}
                />
                {goalLeetcodeError && <span className="text-[9px] text-red-400 font-semibold leading-none">{goalLeetcodeError}</span>}
              </div>
            </div>

            <button 
              type="submit"
              disabled={hasGoalErrors}
              className={`mt-2 w-full py-2.5 border text-xs font-heading font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                hasGoalErrors 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              <Settings size={14} />
              <span>Update Targets</span>
            </button>
          </form>
        </GlassCard>

        {/* Custom Activity Registry Form */}
        <GlassCard className="border-dashed">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-base text-slate-100">Define Custom Activity</h3>
            <span className="text-xs text-slate-500">Create new habits and metric units</span>
          </div>

          <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400">Activity Name</label>
              <input 
                type="text"
                placeholder="E.g. System Design, Meditation"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors w-full"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Group Category</label>
                <select 
                  value={customCategory} 
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 w-full"
                >
                  <option value="Skills" className="bg-[#060913]">Skills Profile</option>
                  <option value="Fitness" className="bg-[#060913]">Fitness Session</option>
                  <option value="General" className="bg-[#060913]">General Habit</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Unit Label</label>
                <input 
                  type="text"
                  placeholder="E.g. hrs, mins, pages"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors w-full"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400">XP Reward (Per Unit)</label>
              <input 
                type="number"
                min="1"
                placeholder="50"
                value={customXp === 0 ? '' : customXp}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCustomXp(isNaN(val) ? 0 : val);
                }}
                className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 transition-colors w-full"
                required
              />
            </div>

            <button 
              type="submit"
              className="mt-1 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs rounded-xl transition-all"
            >
              <span>Add Custom Type</span>
            </button>
          </form>
        </GlassCard>

        {/* Active Custom Types List */}
        {customActivities.length > 0 && (
          <GlassCard className="border-dashed">
            <div className="mb-4">
              <h3 className="font-heading font-bold text-base text-slate-100">Active Custom Types</h3>
              <span className="text-xs text-slate-500">Manage defined custom activities</span>
            </div>
            <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
              {customActivities.map(act => (
                <div key={act.id} className="flex justify-between items-center bg-white/2 border border-white/5 p-2.5 rounded-xl text-xs">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200">{act.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {act.category} • {act.xpPerUnit} XP/{act.unit}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete the custom activity "${act.name}"?`)) {
                        deleteCustomActivity(act.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-[#ff4769] rounded-lg hover:bg-[#ff4769]/5 transition-all"
                    title="Delete custom activity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

      </div>

      {/* Right Column: Logging History & Goals Directory Tabbed Panels */}
      <div className="xl:col-span-3 flex flex-col gap-6 bg-[#0f1627]/45 border border-white/5 p-6 rounded-2xl backdrop-blur-2xl">
        
        {/* Navigation Tabs */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setRightTab('history')}
              className={`font-heading font-bold text-base transition-colors flex items-center gap-1.5 pb-1 ${
                rightTab === 'history' ? 'text-white border-b-2 border-[#00f2fe]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Calendar size={16} />
              <span>Activity History</span>
            </button>
            <button
              onClick={() => setRightTab('goals')}
              className={`font-heading font-bold text-base transition-colors flex items-center gap-1.5 pb-1 ${
                rightTab === 'goals' ? 'text-white border-b-2 border-[#00f2fe]' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Target size={16} />
              <span>Goals Directory</span>
            </button>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full">
            {rightTab === 'history' ? `${logs.length} logs` : `${goalsList.length} goals`}
          </span>
        </div>

        {rightTab === 'history' ? (
          /* Tab 1: Logs History Table */
          <div className="flex-grow overflow-x-auto">
            {logs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                <Calendar size={48} className="text-slate-600 mb-4 stroke-1" />
                <span className="font-semibold text-sm">No activity logged yet</span>
                <p className="text-xs text-slate-600 mt-1 max-w-[200px]">Fill out the log form on the left to start tracking your Aura.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-2">Activity</th>
                    <th className="pb-3 px-2">Amount</th>
                    <th className="pb-3 px-2">Date</th>
                    <th className="pb-3 px-2 hidden sm:table-cell">Notes</th>
                    <th className="pb-3 pl-2 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => {
                    const customType = customActivities.find(act => act.id === log.type);
                    const displayName = customType ? customType.name : log.type.toUpperCase();

                    return (
                      <tr key={log.id} className="hover:bg-white/2 text-slate-300 transition-colors">
                        <td className="py-3.5 pr-2 font-medium">
                          <div className="flex flex-col">
                            <span>{displayName}</span>
                            <span className="text-[10px] text-slate-500 font-normal mt-0.5">{log.category || 'General'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-[#00f2fe] font-semibold">
                          {log.amount} {log.unit}
                        </td>
                        <td className="py-3.5 px-2 text-slate-400">{formatLocalDateStr(log.date)}</td>
                        <td className="py-3.5 px-2 text-slate-400 italic max-w-xs truncate hidden sm:table-cell">
                          {log.notes || '—'}
                        </td>
                        <td className="py-3.5 pl-2 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this activity log?')) {
                                deleteLog(log.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                            title="Delete log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Tab 2: Goals Directory list and Create custom Goal builder */
          <div className="flex flex-col gap-6 flex-grow">
            
            {/* List of Goals */}
            <div className="flex-grow overflow-x-auto">
              {goalsList.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
                  <Target size={40} className="text-slate-600 mb-3 stroke-1" />
                  <span className="font-semibold text-xs text-slate-400">No active goals found</span>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Create custom goals below or set standard targets on the left.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {goalsList.map((goal) => {
                    const currentVal = getGoalProgress(goal);
                    const pct = goal.target_value > 0 ? Math.min(100, Math.round((currentVal / goal.target_value) * 100)) : 0;
                    const isEditing = editingGoalId === goal.id;

                    return (
                      <div 
                        key={goal.id} 
                        className={`bg-white/2 border border-white/5 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                          goal.is_archived ? 'opacity-50 hover:opacity-75' : ''
                        }`}
                      >
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-semibold text-slate-100 text-sm font-heading">{goal.title}</span>
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                              {goal.period}
                            </span>
                            {goal.is_archived && (
                              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                                Archived
                              </span>
                            )}
                          </div>
                          
                          {/* Progress bar */}
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex-grow max-w-xs">
                              <div 
                                className="h-full bg-gradient-to-r from-[#00f2fe] to-[#4facfe] rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-slate-300 shrink-0">
                              {currentVal.toFixed(1)} / {goal.target_value} {goal.unit} ({pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-2 justify-end shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="number"
                                value={editingGoalValue === 0 ? '' : editingGoalValue}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setEditingGoalValue(isNaN(val) ? 0 : val);
                                }}
                                className="bg-[#060913] border border-[#00f2fe]/40 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none w-20"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  editGoal(goal.id, { target_value: editingGoalValue });
                                  setEditingGoalId(null);
                                }}
                                className="p-1.5 text-green-400 hover:bg-green-500/5 rounded-lg border border-green-500/20"
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => setEditingGoalId(null)}
                                className="p-1.5 text-slate-400 hover:bg-white/5 rounded-lg border border-white/10"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingGoalId(goal.id);
                                  setEditingGoalValue(Number(goal.target_value));
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                title="Edit target value"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (goal.is_archived) {
                                    editGoal(goal.id, { is_archived: false });
                                  } else {
                                    archiveGoal(goal.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-white/5 rounded-lg transition-colors"
                                title={goal.is_archived ? "Unarchive goal" : "Archive goal"}
                              >
                                <Archive size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete the goal "${goal.title}" permanently?`)) {
                                    deleteGoal(goal.id);
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                                title="Delete goal"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create Custom Goal Builder */}
            <div className="border-t border-white/5 pt-5">
              <h4 className="font-heading font-bold text-sm text-slate-200 mb-3.5 flex items-center gap-1.5">
                <Plus size={16} className="text-[#00f2fe]" />
                <span>Create Custom Goal Tracker</span>
              </h4>
              
              <form onSubmit={handleCreateCustomGoal} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-white/2 border border-white/5 p-4 rounded-2xl">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Goal Title</label>
                  <input 
                    type="text"
                    placeholder="E.g. Study React Hooks, Pushups count"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Metric Source</label>
                  <select
                    value={newGoalField}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewGoalField(val);
                      
                      // Auto-update default units
                      if (val === 'studyHours') setNewGoalUnit('hrs');
                      else if (val === 'leetcodeCount') setNewGoalUnit('solved');
                      else if (val === 'workoutMins' || val === 'readingMins') setNewGoalUnit('mins');
                      else {
                        const cust = customActivities.find(c => c.id === val);
                        if (cust) setNewGoalUnit(cust.unit);
                      }
                    }}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none w-full"
                  >
                    <option value="studyHours" className="bg-[#060913]">General Study (hrs)</option>
                    <option value="leetcodeCount" className="bg-[#060913]">DSA solved (count)</option>
                    <option value="workoutMins" className="bg-[#060913]">Workout duration (mins)</option>
                    <option value="readingMins" className="bg-[#060913]">Reading duration (mins)</option>
                    {customActivities.map(act => (
                      <option key={act.id} value={act.id} className="bg-[#060913]">{act.name} ({act.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Target Value</label>
                  <input 
                    type="number"
                    min="1"
                    placeholder="10"
                    value={newGoalValue === 0 ? '' : newGoalValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNewGoalValue(isNaN(val) ? 0 : val);
                    }}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Period</label>
                  <select
                    value={newGoalPeriod}
                    onChange={(e) => setNewGoalPeriod(e.target.value as any)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none w-full"
                  >
                    <option value="daily" className="bg-[#060913]">Daily</option>
                    <option value="weekly" className="bg-[#060913]">Weekly</option>
                    <option value="monthly" className="bg-[#060913]">Monthly</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Unit</label>
                  <input 
                    type="text"
                    value={newGoalUnit}
                    onChange={(e) => setNewGoalUnit(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 w-full"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <button 
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl"
                  >
                    Create Custom Goal
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
