import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Sparkles, TrendingUp, History, Repeat, Flame } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import { getLocalDateString, parseLocalDate } from '../utils/date';
import type { Task } from '../types';

type StatsTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const Analytics: React.FC = () => {
  const { logs, skills, forecasts, learningInsights, tasks } = useApp();
  const [activeTab, setActiveTab] = useState<StatsTab>('weekly');

  // Heatmap rendering helpers (Last 63 days)
  const heatmapCells = useMemo(() => {
    const totalCells = 63;
    const cells = [];
    const now = new Date();

    const xpByDate: Record<string, number> = {};
    logs.forEach(log => {
      xpByDate[log.date] = (xpByDate[log.date] || 0) + log.xp;
    });

    for (let i = totalCells - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      const dateStr = getLocalDateString(targetDate);

      const xp = xpByDate[dateStr] || 0;
      let level = 0;
      if (xp > 0) {
        if (xp < 100) level = 1;
        else if (xp < 250) level = 2;
        else if (xp < 400) level = 3;
        else level = 4;
      }

      cells.push({
        dateStr,
        dateFormatted: targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        xp,
        level
      });
    }

    return cells;
  }, [logs]);

  // Streak Timeline (last 15 days of active/inactive)
  const streakTimeline = useMemo(() => {
    const timeline = [];
    const now = new Date();
    
    const loggedDates = new Set(logs.map(l => l.date));

    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = getLocalDateString(d);
      const isActive = loggedDates.has(dStr);

      timeline.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isActive
      });
    }
    return timeline;
  }, [logs]);

  // Recharts aggregates based on selected tab (Study vs Workout)
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (activeTab === 'daily') {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = getLocalDateString(d);
        const dayLogs = logs.filter(l => l.date === dStr);

        const study = dayLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : l.amount * 0.1), 0);
        const workout = dayLogs.filter(l => l.type === 'workout').reduce((sum, l) => sum + l.amount, 0);

        data.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          'Study Hours': parseFloat(study.toFixed(1)),
          'Workout Mins': workout
        });
      }
      return data;
    } 
    
    if (activeTab === 'weekly') {
      const data = [];
      for (let i = 3; i >= 0; i--) {
        const start = new Date();
        start.setDate(now.getDate() - (i + 1) * 7);
        const end = new Date();
        end.setDate(now.getDate() - i * 7);

        const weekLogs = logs.filter(l => {
          const lDate = parseLocalDate(l.date);
          return lDate > start && lDate <= end;
        });

        const study = weekLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : l.amount * 0.1), 0);
        const workout = weekLogs.filter(l => l.type === 'workout').reduce((sum, l) => sum + l.amount, 0);

        data.push({
          label: `Wk -${i}`,
          'Study Hours': parseFloat(study.toFixed(1)),
          'Workout Mins': Math.round(workout)
        });
      }
      return data;
    }

    if (activeTab === 'monthly') {
      const data = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();

        const monthLogs = logs.filter(l => {
          const lDate = parseLocalDate(l.date);
          return lDate.getMonth() === month && lDate.getFullYear() === year;
        });

        const study = monthLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : l.amount * 0.1), 0);
        const workout = monthLogs.filter(l => l.type === 'workout').reduce((sum, l) => sum + l.amount, 0);

        data.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          'Study Hours': parseFloat(study.toFixed(1)),
          'Workout Mins': Math.round(workout)
        });
      }
      return data;
    }

    // Yearly
    const data = [];
    const currentYear = now.getFullYear();
    for (let i = 2; i >= 0; i--) {
      const year = currentYear - i;
      const yearLogs = logs.filter(l => parseLocalDate(l.date).getFullYear() === year);

      const study = yearLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : l.amount * 0.1), 0);
      const workout = yearLogs.filter(l => l.type === 'workout').reduce((sum, l) => sum + l.amount, 0);

      data.push({
        label: `${year}`,
        'Study Hours': parseFloat(study.toFixed(1)),
        'Workout Mins': Math.round(workout)
      });
    }
    return data;
  }, [logs, activeTab]);

  // Aggregate roadmap topic completions for Pie Chart
  const pieData = useMemo(() => {
    return Object.values(skills).map(sk => {
      const completed = sk.roadmap.filter(t => t.completed).length;
      return {
        name: sk.name,
        value: completed
      };
    }).filter(sk => sk.value > 0);
  }, [skills]);

  const PIE_COLORS = ['#00f2fe', '#e100ff', '#ff4769', '#f6d365', '#00b09b', '#94a3b8'];

  // Monthly Growth trend (MoM Study Hours)
  const monthlyGrowthData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const month = d.getMonth();
      const year = d.getFullYear();

      const monthLogs = logs.filter(l => {
        const lDate = parseLocalDate(l.date);
        return lDate.getMonth() === month && lDate.getFullYear() === year;
      });

      const study = monthLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : l.amount * 0.1), 0);

      data.push({
        name: d.toLocaleDateString('en-US', { month: 'short' }),
        Hours: parseFloat(study.toFixed(1))
      });
    }
    return data;
  }, [logs]);

  // Weekly comparison (Study vs Workout vs DSA)
  const weeklyComparisonData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setDate(now.getDate() - (i + 1) * 7);
      const end = new Date();
      end.setDate(now.getDate() - i * 7);

      const weekLogs = logs.filter(l => {
        const lDate = parseLocalDate(l.date);
        return lDate > start && lDate <= end;
      });

      const study = weekLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);
      const workout = weekLogs.filter(l => l.type === 'workout').reduce((sum, l) => sum + l.amount, 0) / 60; // to hrs
      const dsa = weekLogs.filter(l => l.type === 'dsa').reduce((sum, l) => sum + l.amount, 0);

      data.push({
        name: `Wk -${i}`,
        'Study (h)': parseFloat(study.toFixed(1)),
        'Workout (h)': parseFloat(workout.toFixed(1)),
        'LeetCode': dsa
      });
    }
    return data;
  }, [logs]);

  // Productivity Trend line
  const trendData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    const logsByDate: Record<string, any[]> = {};
    logs.forEach(l => {
      logsByDate[l.date] = logsByDate[l.date] || [];
      logsByDate[l.date].push(l);
    });

    const samplePoints = activeTab === 'daily' ? 7 : activeTab === 'weekly' ? 14 : 30;
    
    for (let i = samplePoints - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = getLocalDateString(d);
      
      const dayLogs = logsByDate[dStr] || [];
      const study = dayLogs.filter(l => l.type !== 'workout').reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);
      const workout = dayLogs.filter(l => l.type === 'workout').reduce((sum, l) => sum + l.amount, 0);

      const studyGoal = 4;
      const workoutGoal = 30;

      const studyPct = Math.min(100, (study / studyGoal) * 100);
      const workoutPct = Math.min(100, (workout / workoutGoal) * 100);
      const index = Math.round((studyPct + workoutPct) / 2);

      data.push({
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Index: index
      });
    }

    return data;
  }, [logs, activeTab]);

  // Recurring Tasks Analytics Calculations
  const recurringTasks = useMemo(() => {
    return tasks.filter(t => t.is_recurring);
  }, [tasks]);

  const calculateRecurringStreak = (task: Task): number => {
    if (!task.is_recurring) return 0;
    const history = task.recurring_history || [];
    const historyMap = new Map(history.map(h => [h.date, h.completed]));
    const todayStr = getLocalDateString();
    
    let streak = 0;
    const checkDate = new Date();

    if (task.status === 'complete' || historyMap.get(todayStr)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const dStr = getLocalDateString(checkDate);
      if (historyMap.get(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // Completion Rate History over time for Recurring Tasks
  const recurringChartData = useMemo(() => {
    if (recurringTasks.length === 0) return [];

    const daysCount = activeTab === 'daily' ? 7 : activeTab === 'weekly' ? 14 : activeTab === 'monthly' ? 30 : 45;
    const data = [];
    const todayStr = getLocalDateString();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(new Date().getDate() - i);
      const dStr = getLocalDateString(d);

      let completedCount = 0;
      recurringTasks.forEach(t => {
        if (dStr === todayStr) {
          if (t.status === 'complete' || (t.recurring_history || []).some(h => h.date === dStr && h.completed)) {
            completedCount++;
          }
        } else {
          if ((t.recurring_history || []).some(h => h.date === dStr && h.completed)) {
            completedCount++;
          }
        }
      });

      const rate = Math.round((completedCount / recurringTasks.length) * 100);

      data.push({
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shortDay: d.toLocaleDateString('en-US', { weekday: 'short' }),
        'Completion Rate (%)': rate,
        'Completed': completedCount,
        'Total': recurringTasks.length
      });
    }

    return data;
  }, [recurringTasks, activeTab]);

  // Per-task streak comparison data
  const recurringStreaksData = useMemo(() => {
    return recurringTasks.map(t => ({
      name: t.title.length > 12 ? t.title.slice(0, 11) + '…' : t.title,
      fullTitle: t.title,
      Streak: calculateRecurringStreak(t),
      category: t.category
    }));
  }, [recurringTasks]);

  // Summary Metrics
  const todayRecurringCompleted = useMemo(() => {
    const todayStr = getLocalDateString();
    return recurringTasks.filter(t => 
      t.status === 'complete' || (t.recurring_history || []).some(h => h.date === todayStr && h.completed)
    ).length;
  }, [recurringTasks]);

  const bestRecurringStreak = useMemo(() => {
    if (recurringTasks.length === 0) return 0;
    return Math.max(...recurringTasks.map(t => calculateRecurringStreak(t)));
  }, [recurringTasks]);

  // Mini past 7 days history for each recurring task
  const last7DaysDates = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(new Date().getDate() - i);
      list.push({
        dateStr: getLocalDateString(d),
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        fullLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return list;
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      
      {/* Calendar Consistency Heatmap */}
      <GlassCard className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <Calendar className="text-[#00f2fe]" size={20} />
              <span>Aura Consistency Heatmap</span>
            </h3>
            <span className="text-xs text-slate-500">60-day visual representation of active grinds</span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold select-none">
            <span>Less</span>
            <div className="w-3.5 h-3.5 rounded bg-[#121826]" />
            <div className="w-3.5 h-3.5 rounded bg-[#0e4429]" />
            <div className="w-3.5 h-3.5 rounded bg-[#006d32]" />
            <div className="w-3.5 h-3.5 rounded bg-[#26a641]" />
            <div className="w-3.5 h-3.5 rounded bg-[#39d353]" />
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-2 pr-4 scrollbar-thin">
          {heatmapCells.map((cell, idx) => {
            const cellColors = [
              'bg-[#121826]', // 0
              'bg-[#0e4429]', // 1
              'bg-[#006d32]', // 2
              'bg-[#26a641]', // 3
              'bg-[#39d353]'  // 4
            ];
            
            return (
              <div 
                key={idx}
                className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 hover:scale-110 hover:outline hover:outline-white/40 cursor-pointer ${cellColors[cell.level]}`}
                title={`${cell.dateFormatted}: ${cell.xp} XP earned`}
              />
            );
          })}
        </div>

        {/* Streak Timeline overlay inside the Heatmap panel */}
        <div className="border-t border-white/5 pt-4 mt-2">
          <span className="text-xs font-heading font-bold text-slate-300 block mb-3 flex items-center gap-1.5">
            <History size={14} className="text-[#ff4769]" />
            <span>Streak Timeline (Last 15 Days)</span>
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {streakTimeline.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 shrink-0">
                <div 
                  className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all duration-300
                    ${day.isActive 
                      ? 'bg-[#00b09b]/10 border-[#00b09b]/30 text-[#00b09b] shadow-[0_0_10px_rgba(0,176,155,0.15)] font-bold' 
                      : 'bg-white/2 border-white/5 text-slate-500'
                    }
                  `}
                  title={`${day.dateStr} status`}
                >
                  <span className="text-[7px]">{day.isActive ? '✓' : '•'}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-bold">{day.dayName}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Advanced Forecasting & Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Learning Insights Panel */}
        <GlassCard glowColor="secondary">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <Sparkles className="text-[#e100ff]" size={20} />
              <span>Learning Insights</span>
            </h3>
            <span className="text-xs text-slate-500">Intelligent performance evaluation</span>
          </div>
          <div className="flex flex-col gap-3.5 my-2">
            {learningInsights.map((ins, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-white/2 border border-white/5 p-3 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e100ff] shrink-0 mt-1.5" />
                <p className="text-xs text-slate-300 leading-relaxed">{ins}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Forecasting completion dates panel */}
        <GlassCard glowColor="primary">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <TrendingUp className="text-[#00f2fe]" size={20} />
              <span>Predictive Forecasts</span>
            </h3>
            <span className="text-xs text-slate-500">Projected completion dates based on current velocity</span>
          </div>
          <div className="flex flex-col gap-3 my-2">
            <div className="bg-white/2 border border-white/5 p-3 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase">Expected React Roadmap End</span>
                <span className="text-[10px] text-slate-500 block">Requires React hours logged</span>
              </div>
              <span className="font-heading font-bold text-sm text-[#00f2fe]">{forecasts.reactCompletion}</span>
            </div>
            <div className="bg-white/2 border border-white/5 p-3 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase">Expected DSA Roadmap End</span>
                <span className="text-[10px] text-slate-500 block">Requires DSA solved logs</span>
              </div>
              <span className="font-heading font-bold text-sm text-[#e100ff]">{forecasts.dsaCompletion}</span>
            </div>
            <div className="bg-white/2 border border-white/5 p-3 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase">Expected Milestone Achievement</span>
                <span className="text-[10px] text-slate-500 block">Based on Milestone checks</span>
              </div>
              <span className="font-heading font-bold text-sm text-[#00b09b]">{forecasts.goalAchievement}</span>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* Stats Tab filter bar */}
      <div className="flex justify-between items-center bg-white/2 border border-white/5 p-1.5 rounded-2xl w-fit max-w-full overflow-x-auto scrollbar-none shrink-0">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              font-heading font-semibold text-xs py-2 px-5 rounded-xl transition-all duration-300 capitalize
              ${activeTab === tab 
                ? 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 shadow-[0_0_15px_rgba(0,242,254,0.3)]' 
                : 'text-slate-400 hover:text-white'
              }
            `}
          >
            {tab} Stats
          </button>
        ))}
      </div>

      {/* Row 3: Trends Charts Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly trends bar chart */}
        <GlassCard className="flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <BarChart3 size={18} className="text-[#00f2fe]" />
              <span>Study Hours & Workouts</span>
            </h3>
            <span className="text-xs text-slate-500">Bar comparison over selected interval</span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="Study Hours" fill="#00f2fe" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Workout Mins" fill="#ff4769" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Skill completion pie chart */}
        <GlassCard className="flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <PieIcon size={18} className="text-[#e100ff]" />
              <span>Skill Completion Share</span>
            </h3>
            <span className="text-xs text-slate-500">Distribution of topics checked in roadmap paths</span>
          </div>

          <div className="w-full h-64 flex justify-center items-center">
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <PieIcon size={40} className="text-slate-600 mb-3 stroke-1" />
                <span className="font-semibold text-xs text-slate-400">No completion data yet</span>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[220px]">
                  Check off topics in your Skill Roadmaps to visualize your skill completion distribution.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

      </div>

      {/* Row 4: Large Area Chart (Productivity Trend) */}
      <GlassCard className="w-full">
        <div className="mb-6">
          <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
            <LineIcon size={18} className="text-[#00b09b]" />
            <span>Productivity Score Progression</span>
          </h3>
          <span className="text-xs text-slate-500">Calculated on goal completions, study hours, consistency and skill roadmaps</span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="indexGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="Index" 
                stroke="#00f2fe" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#indexGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Row 5: Additional Visualizations: Weekly Comparison & Monthly Growth graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Comparison LineChart */}
        <GlassCard>
          <div className="mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <LineIcon size={18} className="text-[#ff4769]" />
              <span>Weekly Comparison Graph</span>
            </h3>
            <span className="text-xs text-slate-500">Log progression of study, fitness and DSA solved side-by-side</span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Study (h)" stroke="#00f2fe" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Workout (h)" stroke="#ff4769" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="LeetCode" stroke="#e100ff" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Monthly Growth Graph (MoM study hours) */}
        <GlassCard>
          <div className="mb-6">
            <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#00b09b]" />
              <span>Monthly Growth Graph</span>
            </h3>
            <span className="text-xs text-slate-500">Chronological study hours logged over the last 6 months</span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyGrowthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00b09b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00b09b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="Hours" stroke="#00b09b" strokeWidth={2} fillOpacity={1} fill="url(#growthGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

      </div>

      {/* Row 6: Recurring Daily Tasks Analytics & Consistency */}
      <div className="flex flex-col gap-6">
        
        {/* Section Header with KPI summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/2 border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/20 flex items-center justify-center text-[#00f2fe]">
              <Repeat size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                <span>Recurring Daily Habits & Tasks</span>
              </h3>
              <span className="text-xs text-slate-500">Track daily completion rates, streaks, and consistency trends over time</span>
            </div>
          </div>

          {/* Quick KPIs */}
          <div className="flex items-center gap-3">
            <div className="bg-white/3 border border-white/5 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Habits</span>
              <span className="font-heading font-extrabold text-sm text-[#00f2fe]">{recurringTasks.length}</span>
            </div>
            <div className="bg-white/3 border border-white/5 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Today&apos;s Check</span>
              <span className="font-heading font-extrabold text-sm text-[#00b09b]">
                {todayRecurringCompleted} / {recurringTasks.length}
              </span>
            </div>
            <div className="bg-white/3 border border-white/5 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Best Streak</span>
              <span className="font-heading font-extrabold text-sm text-[#ff4769] flex items-center justify-center gap-1">
                <Flame size={13} />
                <span>{bestRecurringStreak}d</span>
              </span>
            </div>
          </div>
        </div>

        {recurringTasks.length === 0 ? (
          <GlassCard className="py-12 text-center flex flex-col items-center justify-center border-dashed border-white/10">
            <Repeat size={44} className="text-slate-600 mb-3 stroke-1" />
            <h4 className="font-heading font-bold text-slate-300 text-base">No recurring tasks configured yet</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-md leading-relaxed mb-4">
              Mark tasks as &ldquo;Repeats Daily&rdquo; in Task Management to start tracking daily habit momentum, streaks, and completion analytics.
            </p>
            <button
              onClick={() => {
                window.location.hash = 'tasks';
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className="py-2 px-4 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
            >
              Configure Recurring Tasks
            </button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Recurring Tasks Daily Completion Rate (%) */}
            <GlassCard className="flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                  <LineIcon size={18} className="text-[#00f2fe]" />
                  <span>Daily Habit Completion Rate</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Percentage of recurring daily tasks checked off over the selected interval
                </span>
              </div>

              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recurringChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="recurringGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00f2fe" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00f2fe" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                    <XAxis dataKey="shortDay" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: any, _name: any, item: any) => [
                        `${val}% (${item.payload.Completed}/${item.payload.Total} completed)`,
                        'Completion Rate'
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.dateLabel || label}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Completion Rate (%)" 
                      stroke="#00f2fe" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#recurringGradient)" 
                      dot={{ r: 3, fill: '#00f2fe', strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#fff', stroke: '#00f2fe', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Chart 2: Per-Task Active Streak & Consistency Matrix */}
            <GlassCard className="flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-heading font-bold text-lg text-slate-100 flex items-center gap-2">
                  <Flame size={18} className="text-[#ff4769]" />
                  <span>Habit Streaks & 7-Day Consistency</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Current consecutive active days and past week status per recurring task
                </span>
              </div>

              {/* Streak Comparison Bar Chart */}
              {recurringStreaksData.length > 0 && (
                <div className="w-full h-28 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recurringStreaksData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#090e1a', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(val: any) => [`${val} days`, 'Streak']}
                      />
                      <Bar dataKey="Streak" fill="#ff4769" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Habit Consistency List */}
              <div className="flex flex-col gap-2.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {recurringTasks.map(t => {
                  const streak = calculateRecurringStreak(t);
                  const history = t.recurring_history || [];
                  const historyMap = new Map(history.map(h => [h.date, h.completed]));
                  const todayStr = getLocalDateString();

                  return (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors gap-3"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-200 truncate" title={t.title}>
                          {t.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="capitalize">{t.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 text-[#ff4769] font-bold">
                            <Flame size={10} />
                            <span>{streak} day streak</span>
                          </span>
                        </div>
                      </div>

                      {/* 7-day mini status indicators */}
                      <div className="flex items-center gap-1 shrink-0">
                        {last7DaysDates.map((day, idx) => {
                          const isToday = day.dateStr === todayStr;
                          const isDone = isToday 
                            ? (t.status === 'complete' || historyMap.get(day.dateStr)) 
                            : historyMap.get(day.dateStr);

                          return (
                            <div 
                              key={idx}
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold border transition-all ${
                                isDone 
                                  ? 'bg-[#00b09b]/20 border-[#00b09b]/40 text-[#00b09b]' 
                                  : 'bg-white/2 border-white/5 text-slate-600'
                              }`}
                              title={`${day.fullLabel}: ${isDone ? 'Completed' : 'Missed / Pending'}`}
                            >
                              {isDone ? '✓' : '•'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

          </div>
        )}

      </div>

    </div>
  );
};
