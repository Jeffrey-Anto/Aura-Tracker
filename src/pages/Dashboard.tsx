import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, BookOpen, Binary, Dumbbell, Sparkles, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { getLocalDateString } from '../utils/date';

export const Dashboard: React.FC = () => {
  const { 
    logs, 
    streaks, 
    milestones, 
    goals, 
    xp, 
    weeklyGrowth, 
    monthlyGrowth, 
    dailyProductivityScore, 
    goalStatus, 
    aiSuggestions,
    addLog,
    skills
  } = useApp();
 
  // Aggregate stats
  const totalStudy = useMemo(() => logs
    .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!skills[l.type])
    .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0), [logs, skills]);
 
  const totalLeetCode = useMemo(() => logs
    .filter(l => l.type === 'dsa')
    .reduce((sum, l) => sum + l.amount, 0), [logs]);
 
  const totalWorkout = useMemo(() => logs
    .filter(l => l.type === 'workout')
    .reduce((sum, l) => sum + l.amount, 0), [logs]);
 
  // Monthly productivity score average calculation
  const monthlyProductivityScore = useMemo(() => {
    if (logs.length === 0) return 0;
    const now = new Date();
    let totalScoreSum = 0;
    let loggedDaysCount = 0;
    
    const last30DaysDates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      last30DaysDates.push(getLocalDateString(d));
    }
    
    const studyGoal = goals.daily.studyHours || 4;
    const workoutGoal = goals.daily.workoutMins || 30;

    last30DaysDates.forEach(dateStr => {
      const dayLogs = logs.filter(l => l.date === dateStr);
      if (dayLogs.length > 0) {
        const studyLogged = dayLogs
          .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!skills[l.type])
          .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);
        const workoutLogged = dayLogs
          .filter(l => l.type === 'workout')
          .reduce((sum, l) => sum + l.amount, 0);

        const studyPct = studyGoal > 0 ? Math.min(100, (studyLogged / studyGoal) * 100) : 100;
        const workoutPct = workoutGoal > 0 ? Math.min(100, (workoutLogged / workoutGoal) * 100) : 100;
        const goalScore = (studyPct + workoutPct) / 2;
        const studyHoursScore = Math.min(100, (studyLogged / 4) * 100);
        
        const totalScore = Math.round((goalScore * 0.5) + (100 * 0.2) + (studyHoursScore * 0.3));
        totalScoreSum += Math.min(100, Math.max(0, totalScore));
        loggedDaysCount++;
      }
    });
    
    return loggedDaysCount > 0 ? Math.round(totalScoreSum / loggedDaysCount) : 0;
  }, [logs, goals.daily, skills]);

  // Daily statistics for progress calculation
  const todayStr = getLocalDateString();
  const todayLogs = useMemo(() => logs.filter(l => l.date === todayStr), [logs, todayStr]);
 
  const dailyStudyLogged = useMemo(() => todayLogs
    .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!skills[l.type])
    .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0), [todayLogs, skills]);
 
  const dailyWorkoutLogged = useMemo(() => todayLogs
    .filter(l => l.type === 'workout')
    .reduce((sum, l) => sum + l.amount, 0), [todayLogs]);
 
  // Daily Goals Completion Percentage
  const studyGoal = goals.daily.studyHours || 0;
  const workoutGoal = goals.daily.workoutMins || 0;
 
  const studyPercent = useMemo(() => {
    if (studyGoal <= 0) return 0;
    return Math.min(100, Math.round((dailyStudyLogged / studyGoal) * 100));
  }, [dailyStudyLogged, studyGoal]);
 
  const workoutPercent = useMemo(() => {
    if (workoutGoal <= 0) return 0;
    return Math.min(100, Math.round((dailyWorkoutLogged / workoutGoal) * 100));
  }, [dailyWorkoutLogged, workoutGoal]);
 
  const dailyTotalPercent = useMemo(() => {
    if (studyGoal <= 0 && workoutGoal <= 0) return 0;
    const activeGoalsCount = (studyGoal > 0 ? 1 : 0) + (workoutGoal > 0 ? 1 : 0);
    return Math.round((studyPercent + workoutPercent) / activeGoalsCount);
  }, [studyPercent, workoutPercent, studyGoal, workoutGoal]);
 
  // Calculations for remaining targets
  const remainingStudy = useMemo(() => Math.max(0, studyGoal - dailyStudyLogged), [studyGoal, dailyStudyLogged]);
  const remainingWorkout = useMemo(() => Math.max(0, workoutGoal - dailyWorkoutLogged), [workoutGoal, dailyWorkoutLogged]);
 
  // Quick Action Click Handlers
  const handleQuickStudy = () => {
    addLog({
      type: 'study',
      amount: 1,
      notes: 'Quick study hour logged from dashboard',
      unit: 'hrs',
      category: 'General'
    });
  };
 
  const handleQuickDSA = () => {
    addLog({
      type: 'dsa',
      amount: 1,
      notes: 'Quick LeetCode problem logged from dashboard',
      unit: 'solved',
      category: 'Skills'
    });
  };
 
  const handleQuickWorkout = () => {
    addLog({
      type: 'workout',
      amount: 30,
      notes: 'Quick workout session logged from dashboard',
      unit: 'mins',
      category: 'Fitness'
    });
  };

  // Recharts Weekly logs mapping
  const chartData = useMemo(() => {
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getLocalDateString(date);
      const dayLogs = logs.filter(l => l.date === dateStr);

      const study = dayLogs
        .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!skills[l.type])
        .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);

      const workout = dayLogs
        .filter(l => l.type === 'workout')
        .reduce((sum, l) => sum + l.amount, 0);

      weeklyData.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        'Study Hours': parseFloat(study.toFixed(1)),
        'Workout Mins': workout
      });
    }
    return weeklyData;
  }, [logs, skills]);

  // Progress circle computations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (dailyTotalPercent / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      
      {/* Quick Add Actions Console */}
      <GlassCard className="py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4" glowColor="none">
        <div>
          <h3 className="font-heading font-bold text-sm text-slate-200 flex items-center gap-1.5">
            <Sparkles size={16} className="text-[#f6d365]" />
            <span>Dashboard Quick Actions</span>
          </h3>
          <span className="text-[10px] text-slate-500">Record common daily items in a single click</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleQuickStudy}
            className="flex items-center gap-1.5 py-1.5 px-4 bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/15 rounded-xl text-xs font-semibold font-heading transition-all active:scale-[0.98] cursor-pointer"
          >
            <BookOpen size={14} />
            <span>Study +1h</span>
          </button>
          <button
            onClick={handleQuickDSA}
            className="flex items-center gap-1.5 py-1.5 px-4 bg-[#e100ff]/10 hover:bg-[#e100ff]/20 text-[#e100ff] border border-[#e100ff]/15 rounded-xl text-xs font-semibold font-heading transition-all active:scale-[0.98] cursor-pointer"
          >
            <Binary size={14} />
            <span>LeetCode +1</span>
          </button>
          <button
            onClick={handleQuickWorkout}
            className="flex items-center gap-1.5 py-1.5 px-4 bg-[#ff4769]/10 hover:bg-[#ff4769]/20 text-[#ff4769] border border-[#ff4769]/15 rounded-xl text-xs font-semibold font-heading transition-all active:scale-[0.98] cursor-pointer"
          >
            <Dumbbell size={14} />
            <span>Workout +30m</span>
          </button>
        </div>
      </GlassCard>
      
      {/* Row 1: Daily Focus Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Goal completion ring */}
        <GlassCard className="flex flex-col justify-between" glowColor="primary">
          <div className="mb-4 flex justify-between items-start">
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-100">Daily Goal Targets</h3>
              <span className="text-xs text-slate-500">Log study and workouts today</span>
            </div>
            <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border
              ${goalStatus === 'Ahead of Schedule' ? 'bg-[#00b09b]/10 border-[#00b09b]/25 text-[#00b09b] shadow-[0_0_10px_rgba(0,176,155,0.1)]' : ''}
              ${goalStatus === 'Behind Schedule' ? 'bg-[#ff4769]/10 border-[#ff4769]/25 text-[#ff4769] shadow-[0_0_10px_rgba(255,71,105,0.1)]' : ''}
              ${goalStatus === 'On Track' ? 'bg-[#00f2fe]/10 border-[#00f2fe]/25 text-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.1)]' : ''}
            `}>
              {goalStatus}
            </span>
          </div>

          <div className="flex flex-col items-center gap-6 my-2">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="circle-progress-svg w-full h-full" viewBox="0 0 120 120">
                <circle 
                  className="fill-none stroke-white/5 stroke-[8]" 
                  cx="60" 
                  cy="60" 
                  r={radius} 
                />
                <motion.circle 
                  className="fill-none stroke-[8] circle-progress-bar-svg"
                  stroke="url(#cyan-blue-grad-react)"
                  cx="60" 
                  cy="60" 
                  r={radius}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: strokeOffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              
              <svg className="absolute w-0 h-0">
                <defs>
                  <linearGradient id="cyan-blue-grad-react" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2fe" />
                    <stop offset="100%" stopColor="#4facfe" />
                  </linearGradient>
                </defs>
              </svg>

              <span className="absolute font-heading font-extrabold text-2xl text-white">
                {dailyTotalPercent}%
              </span>
            </div>

            {studyGoal === 0 && workoutGoal === 0 ? (
              <div className="w-full text-center border-t border-white/5 pt-4">
                <button
                  onClick={() => {
                    window.location.hash = 'activity';
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                  }}
                  className="text-[10px] font-bold uppercase text-[#00f2fe] hover:underline cursor-pointer"
                >
                  Configure Goal Targets →
                </button>
              </div>
            ) : (
              <div className="w-full flex justify-between gap-4 border-t border-white/5 pt-4 text-center">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Study</span>
                  <span className="text-sm font-bold text-slate-100">{dailyStudyLogged.toFixed(1)}h / {studyGoal}h</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {studyGoal > 0 && remainingStudy > 0 ? `${remainingStudy.toFixed(1)}h left` : studyGoal > 0 ? 'Completed ✓' : 'Not Set'}
                  </span>
                </div>
                <div className="w-[1px] bg-white/5" />
                <div className="flex-grow flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Workout</span>
                  <span className="text-sm font-bold text-slate-100">{dailyWorkoutLogged}m / {workoutGoal}m</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {workoutGoal > 0 && remainingWorkout > 0 ? `${remainingWorkout}m left` : workoutGoal > 0 ? 'Completed ✓' : 'Not Set'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Streak Details Card */}
        <GlassCard className="flex flex-col justify-between" glowColor="accent">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100">Streak Console</h3>
            <span className="text-xs text-slate-500">Gamified consistency metrics</span>
          </div>

          <div className="flex flex-col items-center text-center my-4">
            <div className="relative flex flex-col items-center">
              <motion.div
                animate={streaks.current > 0 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Flame 
                  size={48} 
                  className={`
                    ${streaks.current > 0 
                      ? 'text-[#ff4769] fill-[#ff4769] animate-flame' 
                      : 'text-slate-600'
                    }
                  `} 
                />
              </motion.div>
              <span className="font-heading text-4xl font-extrabold text-white mt-2 leading-none">
                {streaks.current}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Daily Streak</span>
            </div>

            <p className="text-xs text-slate-400 mt-4 max-w-[240px] leading-relaxed">
              {streaks.current > 0
                ? "You're doing great! Keep locking daily activities to extend your streak."
                : "Your streak is currently inactive. Complete any activity today to start!"}
            </p>
          </div>

          <div className="flex justify-between border-t border-white/5 pt-4 text-center text-xs">
            <div className="flex-1">
              <span className="text-slate-500 font-medium block">Weekly Streak</span>
              <span className="font-bold text-slate-200 mt-0.5 block">{streaks.weekly} weeks</span>
            </div>
            <div className="w-[1px] bg-white/5" />
            <div className="flex-grow flex flex-col gap-0.5">
              <span className="text-slate-500 font-medium block">Best Streak</span>
              <span className="font-bold text-[#ff4769] mt-0.5 block">{streaks.best} days</span>
            </div>
          </div>
        </GlassCard>

        {/* Productivity Score card */}
        <GlassCard className="flex flex-col justify-between" glowColor="secondary">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-lg text-slate-100">Productivity index</h3>
            <span className="text-xs text-slate-500">Real-time behavior evaluation</span>
          </div>

          <div className="flex items-center justify-between gap-6 my-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#7f00ff]/10 to-[#e100ff]/10 border border-[#e100ff]/20 flex flex-col justify-center items-center shadow-[0_0_20px_rgba(225,0,255,0.05)] shrink-0">
              <span className="font-heading text-2xl font-extrabold text-[#c92cff]">{dailyProductivityScore}%</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase">Efficiency</span>
            </div>
            <div className="flex flex-col gap-2">
              {logs.length > 0 && weeklyGrowth !== 0 ? (
                <div className={`flex items-center gap-1.5 text-xs font-bold ${weeklyGrowth >= 0 ? 'text-[#00b09b]' : 'text-[#ff4769]'}`}>
                  <TrendingUp size={16} className={weeklyGrowth >= 0 ? '' : 'rotate-180'} />
                  <span>{weeklyGrowth >= 0 ? `+${weeklyGrowth}%` : `${weeklyGrowth}%`} vs last week</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-bold">
                  No weekly growth data yet
                </div>
              )}
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Aggregates completion percentage of targets, milestone checkpoints, and logging frequencies.
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Monthly efficiency rating</span>
              <span className="font-bold text-slate-300">{monthlyProductivityScore}%</span>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* Row 2: Quick Stats Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="flex items-center gap-4 py-4" glowColor="primary" hoverScale>
          <div className="w-12 h-12 rounded-xl bg-[#00f2fe]/10 text-[#00f2fe] flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-medium">Study Logged</span>
            <span className="font-heading text-lg lg:text-xl font-extrabold text-slate-100 mt-0.5">{totalStudy.toFixed(1)}h</span>
            <span className={`text-[9px] font-bold mt-0.5 ${weeklyGrowth >= 0 ? 'text-[#00b09b]' : 'text-[#ff4769]'}`}>
              {weeklyGrowth >= 0 ? `+${weeklyGrowth}%` : `${weeklyGrowth}%`} weekly growth
            </span>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4" glowColor="secondary" hoverScale>
          <div className="w-12 h-12 rounded-xl bg-[#e100ff]/10 text-[#e100ff] flex items-center justify-center shrink-0">
            <Binary size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-medium">DSA Solved</span>
            <span className="font-heading text-lg lg:text-xl font-extrabold text-slate-100 mt-0.5">{totalLeetCode}</span>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4" glowColor="accent" hoverScale>
          <div className="w-12 h-12 rounded-xl bg-[#ff0844]/10 text-[#ff4769] flex items-center justify-center shrink-0">
            <Dumbbell size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-medium">Workouts</span>
            <span className="font-heading text-lg lg:text-xl font-extrabold text-slate-100 mt-0.5">{totalWorkout}m</span>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4 py-4" glowColor="gold" hoverScale>
          <div className="w-12 h-12 rounded-xl bg-[#f6d365]/10 text-[#f6d365] flex items-center justify-center shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-xs font-medium">XP Logged</span>
            <span className="font-heading text-lg lg:text-xl font-extrabold text-slate-100 mt-0.5">{xp}</span>
            <span className={`text-[9px] font-bold mt-0.5 ${monthlyGrowth >= 0 ? 'text-[#00b09b]' : 'text-[#ff4769]'}`}>
              {monthlyGrowth >= 0 ? `+${monthlyGrowth}%` : `${monthlyGrowth}%`} monthly growth
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Row 3: Recharts and Milestone Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts BarChart card */}
        <GlassCard className="lg:col-span-2 flex flex-col justify-between">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-100">Weekly Performance</h3>
              <span className="text-xs text-slate-500">Logged hours vs active workout times</span>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#00f2fe]" /> <span>Study (h)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#ff4769]" /> <span>Workout (m)</span></div>
            </div>
          </div>

          <div className="w-full h-64 mt-2 flex items-center justify-center">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center text-center p-6 text-slate-500">
                <BookOpen size={36} className="text-slate-600 mb-2.5 stroke-1" />
                <span className="font-semibold text-xs text-slate-400">No performance records</span>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Use the quick actions above or record logs in the Tracker page to populate your weekly analysis.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#090e1a', 
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      fontFamily: 'Inter',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar 
                    dataKey="Study Hours" 
                    fill="#00f2fe" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={30}
                  />
                  <Bar 
                    dataKey="Workout Mins" 
                    fill="#ff4769" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Milestone Dashboard checklist */}
        <GlassCard className="flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-lg text-slate-100">Active Milestones</h3>
            <span className="text-xs text-slate-500"> Grinds to finish for major XP checks</span>
          </div>

          <div className="flex flex-col gap-3 my-2 overflow-y-auto max-h-[190px]">
            {milestones.slice(0, 3).map(m => (
              <div 
                key={m.id} 
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-colors
                  ${m.completed 
                    ? 'bg-white/2 border-white/5 opacity-50' 
                    : 'bg-white/1 border-white/5'
                  }
                `}
              >
                <div className={m.completed ? 'text-[#00b09b]' : 'text-slate-600'}>
                  <CheckCircle2 size={18} />
                </div>
                <div className="flex-grow flex flex-col gap-0.5">
                  <span className={`text-xs font-semibold text-slate-200 ${m.completed ? 'line-through text-slate-500' : ''}`}>{m.title}</span>
                  <span className="text-[10px] text-slate-500 uppercase">{m.targetSkill} focus</span>
                </div>
                <span className="text-[10px] font-bold text-[#e100ff] bg-[#e100ff]/10 py-1 px-2 rounded-lg">+{m.xpAward}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              window.location.hash = 'achievements';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
            className="w-full flex items-center justify-between text-xs text-[#00f2fe] font-semibold hover:opacity-85 transition-opacity mt-4 pt-2 border-t border-white/5"
          >
            <span>Explore all achievements & timelines</span>
            <ChevronRight size={16} />
          </button>
        </GlassCard>

      </div>

      {/* AI Coach Suggestion Console Card */}
      <GlassCard glowColor="gold" className="w-full">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-[#f6d365]" size={20} />
          <h3 className="font-heading font-extrabold text-lg text-slate-100">AI Coach suggestions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {aiSuggestions.map((sug, idx) => (
            <div key={idx} className="bg-white/2 border border-white/5 p-4 rounded-xl flex items-start gap-3 relative overflow-hidden group hover:border-white/10 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-white/10 to-transparent" />
              <span className="w-6 h-6 rounded-full bg-[#f6d365]/10 text-[#f6d365] font-heading font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{sug}</p>
            </div>
          ))}
        </div>
      </GlassCard>

    </div>
  );
};
