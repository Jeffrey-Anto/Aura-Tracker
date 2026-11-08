import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Flame, BookOpen, Binary, Dumbbell, Sparkles, TrendingUp, CheckCircle2, ChevronRight,
  SlidersHorizontal, Target, ClipboardList, Map, LineChart, Activity, Trophy,
  BookMarked, Settings as SettingsIcon, User, Plus, Trash2, ArrowUp, ArrowDown,
  RotateCcw, X
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { getLocalDateString } from '../utils/date';

export interface DashboardShortcutItem {
  id: string;
  label: string;
  category: 'quick-action' | 'navigation';
  description: string;
  icon: string;
  color: 'cyan' | 'magenta' | 'rose' | 'amber' | 'emerald' | 'blue' | 'indigo' | 'slate';
  actionType: 'log' | 'nav';
  navTarget?: string;
  logPayload?: {
    type: string;
    amount: number;
    unit: string;
    category: string;
    notes: string;
  };
}

const ALL_AVAILABLE_SHORTCUTS: DashboardShortcutItem[] = [
  // Original 3 Quick Actions
  {
    id: 'quick-study',
    label: 'Study +1h',
    category: 'quick-action',
    description: 'Quick log 1 hour of general study',
    icon: 'BookOpen',
    color: 'cyan',
    actionType: 'log',
    logPayload: {
      type: 'study',
      amount: 1,
      unit: 'hrs',
      category: 'General',
      notes: 'Quick study hour logged from dashboard'
    }
  },
  {
    id: 'quick-dsa',
    label: 'LeetCode +1',
    category: 'quick-action',
    description: 'Quick log 1 solved LeetCode problem',
    icon: 'Binary',
    color: 'magenta',
    actionType: 'log',
    logPayload: {
      type: 'dsa',
      amount: 1,
      unit: 'solved',
      category: 'Skills',
      notes: 'Quick LeetCode problem logged from dashboard'
    }
  },
  {
    id: 'quick-workout',
    label: 'Workout +30m',
    category: 'quick-action',
    description: 'Quick log 30 minutes of fitness workout',
    icon: 'Dumbbell',
    color: 'rose',
    actionType: 'log',
    logPayload: {
      type: 'workout',
      amount: 30,
      unit: 'mins',
      category: 'Fitness',
      notes: 'Quick workout session logged from dashboard'
    }
  },
  // Additional Quick Action
  {
    id: 'quick-reading',
    label: 'Reading +30m',
    category: 'quick-action',
    description: 'Quick log 30 minutes of book reading',
    icon: 'BookMarked',
    color: 'amber',
    actionType: 'log',
    logPayload: {
      type: 'reading',
      amount: 30,
      unit: 'mins',
      category: 'Reading',
      notes: 'Quick reading session logged from dashboard'
    }
  },
  // Existing App Pages / Navigation Shortcuts
  {
    id: 'nav-goals',
    label: 'Goal Manager',
    category: 'navigation',
    description: 'Manage and track daily and weekly goal targets',
    icon: 'Target',
    color: 'emerald',
    actionType: 'nav',
    navTarget: 'activity'
  },
  {
    id: 'nav-tasks',
    label: 'Task Manager',
    category: 'navigation',
    description: 'Open tasks, daily recurring checklists, and AI plans',
    icon: 'ClipboardList',
    color: 'blue',
    actionType: 'nav',
    navTarget: 'tasks'
  },
  {
    id: 'nav-skills',
    label: 'Roadmaps',
    category: 'navigation',
    description: 'Explore learning roadmaps and skill levels',
    icon: 'Map',
    color: 'cyan',
    actionType: 'nav',
    navTarget: 'skills'
  },
  {
    id: 'nav-analytics',
    label: 'Analytics',
    category: 'navigation',
    description: 'View deep performance metrics and charts',
    icon: 'LineChart',
    color: 'indigo',
    actionType: 'nav',
    navTarget: 'analytics'
  },
  {
    id: 'nav-activity',
    label: 'Activity Tracker',
    category: 'navigation',
    description: 'Log daily hours, workouts, and view activity history',
    icon: 'Activity',
    color: 'magenta',
    actionType: 'nav',
    navTarget: 'activity'
  },
  {
    id: 'nav-achievements',
    label: 'Achievements',
    category: 'navigation',
    description: 'Review trophies, badges, and milestones',
    icon: 'Trophy',
    color: 'amber',
    actionType: 'nav',
    navTarget: 'achievements'
  },
  {
    id: 'nav-profile',
    label: 'Profile',
    category: 'navigation',
    description: 'View level, rank, XP, and profile avatar',
    icon: 'User',
    color: 'blue',
    actionType: 'nav',
    navTarget: 'profile'
  },
  {
    id: 'nav-settings',
    label: 'Settings',
    category: 'navigation',
    description: 'Customize security, themes, and account settings',
    icon: 'Settings',
    color: 'slate',
    actionType: 'nav',
    navTarget: 'settings'
  }
];

const DEFAULT_SHORTCUT_IDS = ['quick-study', 'quick-dsa', 'quick-workout'];

const SHORTCUT_COLOR_CLASSES: Record<string, string> = {
  cyan: 'bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border-[#00f2fe]/15',
  magenta: 'bg-[#e100ff]/10 hover:bg-[#e100ff]/20 text-[#e100ff] border-[#e100ff]/15',
  rose: 'bg-[#ff4769]/10 hover:bg-[#ff4769]/20 text-[#ff4769] border-[#ff4769]/15',
  amber: 'bg-[#f6d365]/10 hover:bg-[#f6d365]/20 text-[#f6d365] border-[#f6d365]/15',
  emerald: 'bg-[#00b09b]/10 hover:bg-[#00b09b]/20 text-[#00b09b] border-[#00b09b]/15',
  blue: 'bg-[#4facfe]/10 hover:bg-[#4facfe]/20 text-[#4facfe] border-[#4facfe]/15',
  indigo: 'bg-[#7f00ff]/10 hover:bg-[#7f00ff]/20 text-[#7f00ff] border-[#7f00ff]/15',
  slate: 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
};

const renderShortcutIcon = (iconName: string, size = 14) => {
  switch (iconName) {
    case 'BookOpen': return <BookOpen size={size} />;
    case 'Binary': return <Binary size={size} />;
    case 'Dumbbell': return <Dumbbell size={size} />;
    case 'Target': return <Target size={size} />;
    case 'ClipboardList': return <ClipboardList size={size} />;
    case 'Map': return <Map size={size} />;
    case 'LineChart': return <LineChart size={size} />;
    case 'Activity': return <Activity size={size} />;
    case 'Trophy': return <Trophy size={size} />;
    case 'BookMarked': return <BookMarked size={size} />;
    case 'Settings': return <SettingsIcon size={size} />;
    case 'User': return <User size={size} />;
    default: return <Sparkles size={size} />;
  }
};

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
    skills,
    user
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
    
    const studyGoal = goals.daily.studyHours || 0;
    const workoutGoal = goals.daily.workoutMins || 0;

    last30DaysDates.forEach(dateStr => {
      const dayLogs = logs.filter(l => l.date === dateStr);
      if (dayLogs.length > 0) {
        const studyLogged = dayLogs
          .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!skills[l.type])
          .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);
        const workoutLogged = dayLogs
          .filter(l => l.type === 'workout')
          .reduce((sum, l) => sum + l.amount, 0);

        const studyPct = studyGoal > 0 ? Math.min(100, (studyLogged / studyGoal) * 100) : 0;
        const workoutPct = workoutGoal > 0 ? Math.min(100, (workoutLogged / workoutGoal) * 100) : 0;
        
        let goalScore = 0;
        let activeGoalsCount = 0;
        if (studyGoal > 0) {
          goalScore += studyPct;
          activeGoalsCount++;
        }
        if (workoutGoal > 0) {
          goalScore += workoutPct;
          activeGoalsCount++;
        }
        
        const finalGoalScore = activeGoalsCount > 0 ? (goalScore / activeGoalsCount) : (studyLogged > 0 || workoutLogged > 0 ? 100 : 0);
        const studyHoursScore = studyGoal > 0 ? Math.min(100, (studyLogged / studyGoal) * 100) : (studyLogged > 0 ? 100 : 0);
        
        const totalScore = Math.round((finalGoalScore * 0.7) + (studyHoursScore * 0.3));
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
 
  // Dashboard Shortcuts State & Persistence
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [activeShortcutIds, setActiveShortcutIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`aura_dashboard_shortcuts_${user?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error reading saved dashboard shortcuts:", e);
    }
    return DEFAULT_SHORTCUT_IDS;
  });

  useEffect(() => {
    const key = `aura_dashboard_shortcuts_${user?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActiveShortcutIds(parsed);
          return;
        }
      } catch {
        // fallback
      }
    }
    setActiveShortcutIds(DEFAULT_SHORTCUT_IDS);
  }, [user?.id]);

  const saveShortcuts = (newIds: string[]) => {
    if (newIds.length === 0) return; // Enforce at least 1
    setActiveShortcutIds(newIds);
    try {
      const key = `aura_dashboard_shortcuts_${user?.id || 'default'}`;
      localStorage.setItem(key, JSON.stringify(newIds));
    } catch (e) {
      console.error("Error saving dashboard shortcuts:", e);
    }
  };

  const handleShortcutClick = (shortcut: DashboardShortcutItem) => {
    if (shortcut.actionType === 'nav' && shortcut.navTarget) {
      window.location.hash = shortcut.navTarget;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else if (shortcut.actionType === 'log' && shortcut.logPayload) {
      addLog({
        type: shortcut.logPayload.type,
        amount: shortcut.logPayload.amount,
        notes: shortcut.logPayload.notes,
        unit: shortcut.logPayload.unit,
        category: shortcut.logPayload.category
      });
    }
  };

  const handleMoveShortcut = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeShortcutIds.length) return;
    const next = [...activeShortcutIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    saveShortcuts(next);
  };

  const handleRemoveShortcut = (id: string) => {
    if (activeShortcutIds.length <= 1) return; // Never allow 0 buttons
    const next = activeShortcutIds.filter(item => item !== id);
    saveShortcuts(next);
  };

  const handleAddShortcut = (id: string) => {
    if (activeShortcutIds.includes(id)) return;
    const next = [...activeShortcutIds, id];
    saveShortcuts(next);
  };

  const handleResetToDefaults = () => {
    saveShortcuts(DEFAULT_SHORTCUT_IDS);
  };

  const activeShortcuts = useMemo(() => {
    const list = activeShortcutIds
      .map(id => ALL_AVAILABLE_SHORTCUTS.find(s => s.id === id))
      .filter(Boolean) as DashboardShortcutItem[];
    return list.length > 0 ? list : DEFAULT_SHORTCUT_IDS.map(id => ALL_AVAILABLE_SHORTCUTS.find(s => s.id === id)!).filter(Boolean);
  }, [activeShortcutIds]);

  const availableToAdd = useMemo(() => {
    return ALL_AVAILABLE_SHORTCUTS.filter(s => !activeShortcutIds.includes(s.id));
  }, [activeShortcutIds]);

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
          {activeShortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => handleShortcutClick(shortcut)}
              className={`flex items-center gap-1.5 py-1.5 px-4 border rounded-xl text-xs font-semibold font-heading transition-all active:scale-[0.98] cursor-pointer ${SHORTCUT_COLOR_CLASSES[shortcut.color] || SHORTCUT_COLOR_CLASSES.cyan}`}
              title={shortcut.actionType === 'nav' ? `Open ${shortcut.label}` : `Quick record ${shortcut.label}`}
            >
              {renderShortcutIcon(shortcut.icon)}
              <span>{shortcut.label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-white/3 hover:bg-white/8 text-slate-400 hover:text-slate-200 border border-white/8 hover:border-white/15 rounded-xl text-xs font-semibold font-heading transition-all cursor-pointer"
            title="Customize dashboard shortcuts"
          >
            <SlidersHorizontal size={13} />
            <span className="text-[11px]">Customize</span>
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

      {/* Customize Shortcuts Modal */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101e] border border-white/10 rounded-2xl w-full max-w-xl shadow-[0_10px_45px_rgba(0,0,0,0.8)] overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
              <div>
                <h4 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-[#00f2fe]" />
                  <span>Customize Dashboard Shortcuts</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Add, remove, or reorder your quick action buttons. At least 1 shortcut is required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Section 1: Active Shortcuts */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Current Shortcuts ({activeShortcuts.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Use arrows to reorder
                  </span>
                </div>
                
                <div className="flex flex-col gap-2">
                  {activeShortcuts.map((item, index) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono font-bold text-slate-500 w-4 text-center">
                          {index + 1}
                        </span>
                        <div className={`p-1.5 rounded-lg border flex items-center justify-center ${SHORTCUT_COLOR_CLASSES[item.color]}`}>
                          {renderShortcutIcon(item.icon, 14)}
                        </div>
                        <div>
                          <span className="font-heading font-semibold text-xs text-slate-100 block">
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveShortcut(index, 'up')}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={index === activeShortcuts.length - 1}
                          onClick={() => handleMoveShortcut(index, 'down')}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors disabled:opacity-20 disabled:hover:text-slate-400 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={activeShortcuts.length <= 1}
                          onClick={() => handleRemoveShortcut(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-20 disabled:hover:text-slate-500 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed ml-1"
                          title={activeShortcuts.length <= 1 ? "At least 1 shortcut required" : "Remove shortcut"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Available Shortcuts to Add */}
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
                  Available Shortcuts to Add ({availableToAdd.length})
                </span>

                {availableToAdd.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-white/2 rounded-xl border border-dashed border-white/5">
                    All available shortcuts have been added to your dashboard!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableToAdd.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${SHORTCUT_COLOR_CLASSES[item.color]}`}>
                            {renderShortcutIcon(item.icon, 13)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-heading font-semibold text-xs text-slate-100 block truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {item.category === 'quick-action' ? 'Quick Action' : 'Navigation Link'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddShortcut(item.id)}
                          className="py-1 px-2.5 bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/20 rounded-lg text-xs font-semibold font-heading flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-white/5 bg-white/1">
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset to Default 3</span>
              </button>
              
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="py-2 px-5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.01] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
