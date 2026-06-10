import React, { useState, useMemo } from 'react';
import { PlusCircle, Settings, Trash2, Calendar, Target, Clock, BookOpen, Binary } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { getLocalDateString, parseLocalDate, formatLocalDateStr } from '../utils/date';

export const ActivityTracker: React.FC = () => {
  const { 
    logs, 
    customActivities, 
    goals, 
    addLog, 
    deleteLog, 
    updateGoal, 
    createCustomActivity, 
    deleteCustomActivity,
    skills 
  } = useApp();

  // Form states
  const [logType, setLogType] = useState('study');
  const [logAmount, setLogAmount] = useState(2);
  const [logNotes, setLogNotes] = useState('');
  const [logDate, setLogDate] = useState(getLocalDateString());

  // Goal config states
  const [goalPeriod, setGoalPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [goalStudy, setGoalStudy] = useState(goals.daily.studyHours);
  const [goalWorkout, setGoalWorkout] = useState(goals.daily.workoutMins);
  const [goalReading, setGoalReading] = useState(goals.daily.readingMins);
  const [goalLeetcode, setGoalLeetcode] = useState(goals.daily.leetcodeCount);

  // Custom activity states
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Skills');
  const [customUnit, setCustomUnit] = useState('hrs');
  const [customXp, setCustomXp] = useState(50);

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
    updateGoal(goalPeriod, 'studyHours', goalStudy);
    updateGoal(goalPeriod, 'workoutMins', goalWorkout);
    updateGoal(goalPeriod, 'readingMins', goalReading);
    updateGoal(goalPeriod, 'leetcodeCount', goalLeetcode);
  };

  // Toggle Goal periods to populate inputs
  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setGoalPeriod(period);
    setGoalStudy(goals[period].studyHours);
    setGoalWorkout(goals[period].workoutMins);
    setGoalReading(goals[period].readingMins);
    setGoalLeetcode(goals[period].leetcodeCount);
  };

  // Submit custom activity configuration
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomActivity(customName, customCategory, customUnit, customXp);
    setCustomName('');
    setCustomUnit('hrs');
    setCustomXp(50);
  };

  // Helper calculations for active goals progression and remaining target computations
  const currentProgression = useMemo(() => {
    const now = new Date();
    let periodLogs = [];

    if (goalPeriod === 'daily') {
      const todayStr = getLocalDateString(now);
      periodLogs = logs.filter(l => l.date === todayStr);
    } else if (goalPeriod === 'weekly') {
      // Last 7 days
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      periodLogs = logs.filter(l => parseLocalDate(l.date) >= lastWeek);
    } else {
      // Last 30 days
      const lastMonth = new Date();
      lastMonth.setDate(now.getDate() - 30);
      periodLogs = logs.filter(l => parseLocalDate(l.date) >= lastMonth);
    }

    const study = periodLogs
      .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!skills[l.type])
      .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);

    const workout = periodLogs
      .filter(l => l.type === 'workout')
      .reduce((sum, l) => sum + l.amount, 0);

    const reading = periodLogs
      .filter(l => l.type === 'reading')
      .reduce((sum, l) => sum + l.amount, 0);

    const leetcode = periodLogs
      .filter(l => l.type === 'dsa')
      .reduce((sum, l) => sum + l.amount, 0);

    return { study, workout, reading, leetcode };
  }, [logs, goalPeriod, skills]);

  const targetGoals = goals[goalPeriod];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 pb-10">
      
      {/* Left Columns: Forms */}
      <div className="xl:col-span-2 flex flex-col gap-6 lg:gap-8">
        
        {/* Logging Card Form */}
        <GlassCard>
          <div className="mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-100 font-semibold">Log Daily Activity</h3>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <BookOpen size={12} />
                  <span>Study Hours</span>
                </label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  value={goalStudy}
                  onChange={(e) => setGoalStudy(parseFloat(e.target.value) || 0)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  <span>Workout Mins</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  value={goalWorkout}
                  onChange={(e) => setGoalWorkout(parseInt(e.target.value) || 0)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Target size={12} />
                  <span>Reading Mins</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  value={goalReading}
                  onChange={(e) => setGoalReading(parseInt(e.target.value) || 0)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Binary size={12} />
                  <span>LeetCode count</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  value={goalLeetcode}
                  onChange={(e) => setGoalLeetcode(parseInt(e.target.value) || 0)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="mt-2 w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-heading font-semibold text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
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
                className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400">Group Category</label>
                <select 
                  value={customCategory} 
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40"
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
                  className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400">XP Reward (Per Unit)</label>
              <input 
                type="number"
                min="1"
                value={customXp}
                onChange={(e) => setCustomXp(parseInt(e.target.value) || 0)}
                className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 transition-colors"
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

      {/* Right Column: Logging History */}
      <div className="xl:col-span-3 flex flex-col gap-6 lg:gap-8 bg-[#0f1627]/45 border border-white/5 p-6 rounded-2xl backdrop-blur-2xl">
        <div>
          <h3 className="font-heading font-bold text-lg text-slate-100">Recent Logs History</h3>
          <span className="text-xs text-slate-500">Manage and audit your tracked activities</span>
        </div>

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
                  <th className="pb-3 px-2">Details</th>
                  <th className="pb-3 px-2">XP Award</th>
                  <th className="pb-3 pl-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/2">
                {logs.map(log => {
                  let badgeColor = 'bg-sky-500/10 text-sky-400';
                  if (log.type === 'workout') badgeColor = 'bg-[#ff4769]/10 text-[#ff4769]';
                  else if (skills[log.type]) badgeColor = 'bg-[#e100ff]/10 text-[#e100ff]';

                  return (
                    <tr key={log.id} className="hover:bg-white/1 transition-colors group">
                      <td className="py-3.5 pr-2 font-semibold">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${badgeColor}`}>
                          {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 font-bold font-heading text-slate-200">
                        {log.amount} {log.unit}
                      </td>
                      <td className="py-3.5 px-2 text-slate-400">
                        {formatLocalDateStr(log.date)}
                      </td>
                      <td className="py-3.5 px-2 text-slate-500 max-w-[120px] truncate" title={log.notes}>
                        {log.notes || '—'}
                      </td>
                      <td className="py-3.5 px-2">
                        <span className="font-bold text-[#e100ff] bg-[#e100ff]/5 py-0.5 px-2 rounded-full">
                          +{log.xp} XP
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="p-1.5 text-slate-500 hover:text-[#ff4769] rounded-lg hover:bg-[#ff4769]/5 transition-all opacity-80 lg:opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
