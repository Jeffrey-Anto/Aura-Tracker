import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Log, CustomActivity, Goals, Skill, Badge, Milestone, StreakState, AppState, GoalTarget, Task, Profile, Goal } from '../types';
import { getLocalDateString, parseLocalDate, getRelativeLocalDateString } from '../utils/date';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface AppContextType extends AppState {
  user: User | null;
  profile: Profile | null;
  authLoading: boolean;
  tasks: Task[];
  goalsList: Goal[];
  toast: { title: string; message: string; type: 'success' | 'info' | 'level-up' | 'badge' | 'milestone' } | null;
  setToast: (toast: any) => void;
  rewardClaimed: boolean;
  claimReward: () => void;
  weeklyGrowth: number;
  monthlyGrowth: number;
  dailyProductivityScore: number;
  goalStatus: 'On Track' | 'Ahead of Schedule' | 'Behind Schedule';
  learningInsights: string[];
  forecasts: { reactCompletion: string; dsaCompletion: string; goalAchievement: string };
  aiSuggestions: string[];
  
  // Auth CRUD
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  
  // Data Backup
  exportUserData: () => Promise<string>;
  importUserData: (jsonStr: string) => Promise<void>;
  
  // Task CRUD
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  
  // Goal CRUD
  createGoal: (goal: Omit<Goal, 'id' | 'current_value' | 'is_archived'>) => Promise<void>;
  editGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  updateGoal: (period: 'daily' | 'weekly' | 'monthly', target: keyof GoalTarget, value: number) => void;
  
  // Skill CRUD
  createSkill: (name: string, color?: string) => Promise<void>;
  deleteSkill: (slug: string) => Promise<void>;
  addRoadmapTopic: (skillId: string, level: number, topic: string) => Promise<void>;
  deleteRoadmapTopic: (skillId: string, topicId: string) => Promise<void>;
  toggleRoadmapTopic: (skillId: string, topicId: string) => Promise<void>;
  
  // Custom Habit CRUD
  createCustomActivity: (name: string, category: string, unit: string, xpPerUnit: number) => Promise<void>;
  deleteCustomActivity: (id: string) => Promise<void>;
  
  // Milestones CRUD
  addMilestone: (title: string, targetSkill: string, xpAward: number) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  toggleMilestone: (id: string) => Promise<void>;
  
  // Logger CRUD
  addLog: (log: { type: string; amount: number; unit?: string; notes?: string; date?: string; category?: string }) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_GOALS: Goals = {
  daily: { studyHours: 0, workoutMins: 0, readingMins: 0, leetcodeCount: 0 },
  weekly: { studyHours: 0, workoutMins: 0, readingMins: 0, leetcodeCount: 0 },
  monthly: { studyHours: 0, workoutMins: 0, readingMins: 0, leetcodeCount: 0 }
};

const INITIAL_BADGES: Badge[] = [
  { id: 'streak_7', title: 'Streak Starter', desc: 'Maintain a 7-day streak', icon: 'flame', tier: 'accent', unlocked: false },
  { id: 'study_50', title: 'Study Marathoner', desc: 'Log first 50 study hours', icon: 'book-open', tier: 'primary', unlocked: false },
  { id: 'roadmap_first', title: 'Roadmap Pioneer', desc: 'Complete your first roadmap', icon: 'map', tier: 'success', unlocked: false },
  { id: 'leetcode_100', title: 'LeetCode Centurion', desc: 'Solve 100 LeetCode problems', icon: 'binary', tier: 'gold', unlocked: false },
  { id: 'level_5', title: 'Aura Master', desc: 'Reach Level 5 overall', icon: 'award', tier: 'gold', unlocked: false }
];

const INITIAL_MILESTONES: Milestone[] = [
  { id: 'milestone-1', title: 'Complete React Basics (HTML/CSS/JS/JSX)', targetSkill: 'react', completed: false, xpAward: 300 },
  { id: 'milestone-2', title: 'Solve 50 Dynamic Programming Topics', targetSkill: 'dsa', completed: false, xpAward: 400 },
  { id: 'milestone-3', title: 'Build a full SQL database schema', targetSkill: 'dbms', completed: false, xpAward: 250 },
  { id: 'milestone-4', title: 'Deliver a presentation to 20+ people', targetSkill: 'communication', completed: false, xpAward: 350 }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App core state (loaded dynamically per user)
  const [logs, setLogs] = useState<Log[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goalsList, setGoalsList] = useState<Goal[]>([]);
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([]);
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES);
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [streaks, setStreaks] = useState<StreakState>({ current: 0, weekly: 0, best: 0 });
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);

  // Notifications
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'level-up' | 'badge' | 'milestone' } | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false);

  // Initialize Auth Sync Listeners
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    // Load active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAllData(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchAllData(activeUser.id);
      } else {
        // Clear state on Sign Out
        setProfile(null);
        setLogs([]);
        setTasks([]);
        setGoalsList([]);
        setCustomActivities([]);
        setGoals(DEFAULT_GOALS);
        setSkills({});
        setBadges(INITIAL_BADGES);
        setMilestones(INITIAL_MILESTONES);
        setStreaks({ current: 0, weekly: 0, best: 0 });
        setXp(0);
        setLevel(1);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync theme changes to DOM
  useEffect(() => {
    if (profile?.theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [profile?.theme]);

  // Load user data from Supabase
  const fetchAllData = async (userId: string) => {
    setAuthLoading(true);
    try {
      // 1. Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let activeProfile = profileData;
      if (!activeProfile) {
        // Create profile if missing (trigger safety fallback)
        const namePart = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Explorer';
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name: namePart,
            email: user?.email || '',
            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${namePart}`,
            xp: 0,
            level: 1,
            theme: 'dark'
          })
          .select()
          .single();
        activeProfile = newProfile;
      }
      setProfile(activeProfile);

      // 2. Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setTasks(tasksData || []);

      // 3. Load goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      const dbGoals = goalsData || [];
      setGoalsList(dbGoals);

      // Map to legacy Goals object format
      const mappedGoals: Goals = JSON.parse(JSON.stringify(DEFAULT_GOALS));
      dbGoals.forEach(g => {
        if (!g.is_archived && (g.period === 'daily' || g.period === 'weekly' || g.period === 'monthly')) {
          const period = g.period as 'daily' | 'weekly' | 'monthly';
          const field = g.target_field as keyof GoalTarget;
          if (mappedGoals[period] && field in mappedGoals[period]) {
            mappedGoals[period][field] = Number(g.target_value);
          }
        }
      });
      setGoals(mappedGoals);

      // 4. Load custom activities
      const { data: customData } = await supabase
        .from('custom_activities')
        .select('*')
        .eq('user_id', userId);
      setCustomActivities(customData?.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        unit: c.unit,
        xpPerUnit: c.xp_per_unit
      })) || []);

      // 5. Load logs (activities)
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      setLogs(activitiesData || []);

      // 6. Load skills & skill roadmaps
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      const { data: topicsData } = await supabase
        .from('skill_topics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const dbSkills = skillsData || [];
      const dbTopics = topicsData || [];
      const skillsMap: Record<string, Skill> = {};

      dbSkills.forEach(s => {
        const slug = s.slug || s.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        skillsMap[slug] = {
          id: s.id,
          name: s.name,
          slug,
          level: s.level,
          xp: s.xp,
          color: s.color,
          roadmap: dbTopics
            .filter(t => t.skill_id === s.id)
            .map(t => ({
              id: t.id,
              level: t.level,
              topic: t.topic,
              completed: t.completed
            }))
        };
      });
      setSkills(skillsMap);

      // 7. Load streaks
      const { data: streaksData } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (streaksData) {
        setStreaks({
          current: streaksData.current,
          weekly: streaksData.weekly,
          best: streaksData.best
        });
      }

      // 8. Load achievements (badges)
      const { data: achievementsData } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId);
      const unlockedIds = new Set((achievementsData || []).map(a => a.badge_id));
      setBadges(prev => prev.map(b => ({ ...b, unlocked: unlockedIds.has(b.id) })));

      // 9. Load database milestones
      const { data: milestonesData } = await supabase
        .from('milestones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!milestonesData || milestonesData.length === 0) {
        const seededMilestones = INITIAL_MILESTONES.map(m => ({
          user_id: userId,
          title: m.title,
          target_skill: m.targetSkill,
          completed: false,
          xp_award: m.xpAward
        }));
        
        const { data: newMilestones } = await supabase
          .from('milestones')
          .insert(seededMilestones)
          .select();
          
        setMilestones((newMilestones || []).map(m => ({
          id: m.id,
          title: m.title,
          targetSkill: m.target_skill,
          completed: m.completed,
          xpAward: m.xp_award
        })));
      } else {
        setMilestones(milestonesData.map(m => ({
          id: m.id,
          title: m.title,
          targetSkill: m.target_skill,
          completed: m.completed,
          xpAward: m.xp_award
        })));
      }

      // Set global XP/level from DB profile row
      setXp(activeProfile?.xp || 0);
      setLevel(activeProfile?.level || 1);

    } catch (err) {
      console.error('Error fetching data from Supabase', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sync streaks to Database
  const syncStreaksToDB = async (current: number, weekly: number, best: number) => {
    if (!user) return;
    await supabase
      .from('streaks')
      .upsert({
        user_id: user.id,
        current,
        weekly,
        best,
        updated_at: new Date().toISOString()
      });
  };

  // Streak & Achievements Checkers
  useEffect(() => {
    if (logs.length === 0 || !user) return;

    // Calculate Streak
    const uniqueDates = Array.from(new Set(logs.map(log => log.date))).sort().reverse();
    const todayStr = getLocalDateString();
    const yesterdayStr = getRelativeLocalDateString(1);

    let current = 0;
    let best = 0;
    
    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      current = 1;
      let prevDate = parseLocalDate(uniqueDates[0]);
      for (let i = 1; i < uniqueDates.length; i++) {
        const currDate = parseLocalDate(uniqueDates[i]);
        const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          current++;
          prevDate = currDate;
        } else if (diffDays > 1) {
          break;
        }
      }
    }

    let tempStreak = 0;
    if (uniqueDates.length > 0) {
      tempStreak = 1;
      let prevDate = parseLocalDate(uniqueDates[0]);
      for (let i = 1; i < uniqueDates.length; i++) {
        const currDate = parseLocalDate(uniqueDates[i]);
        const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          prevDate = currDate;
        } else {
          best = Math.max(best, tempStreak);
          tempStreak = 1;
          prevDate = currDate;
        }
      }
      best = Math.max(best, tempStreak, current);
    }

    const calculatedWeeklyStreak = Math.floor(current / 7);
    setStreaks({ current, weekly: calculatedWeeklyStreak, best });

    // Sync back to Supabase
    syncStreaksToDB(current, calculatedWeeklyStreak, best);

    // Check Badges Unlock
    checkBadgesProgress(current, logs, skills);
  }, [logs]);

  const checkBadgesProgress = async (currentStreak: number, currentLogs: Log[], currentSkills: Record<string, Skill>) => {
    if (!user) return;

    const studyHours = currentLogs
      .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || !!currentSkills[l.type])
      .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);

    const leetcodeSolved = currentLogs
      .filter(l => l.type === 'dsa')
      .reduce((sum, l) => sum + l.amount, 0);

    const hasCompletedRoadmap = Object.values(currentSkills).some(sk => 
      sk.roadmap.length > 0 && sk.roadmap.every(t => t.completed)
    );

    const currentLvl = level;

    // Check badges
    const updatedBadges = badges.map(badge => {
      let isUnlocked = badge.unlocked;

      if (badge.id === 'streak_7' && currentStreak >= 7) isUnlocked = true;
      if (badge.id === 'study_50' && studyHours >= 50) isUnlocked = true;
      if (badge.id === 'roadmap_first' && hasCompletedRoadmap) isUnlocked = true;
      if (badge.id === 'leetcode_100' && leetcodeSolved >= 100) isUnlocked = true;
      if (badge.id === 'level_5' && currentLvl >= 5) isUnlocked = true;

      return { ...badge, unlocked: isUnlocked };
    });

    // Determine newly unlocked badges to sync to Supabase
    const newlyUnlocked = updatedBadges.filter(b => b.unlocked && !badges.find(old => old.id === b.id)?.unlocked);
    
    if (newlyUnlocked.length > 0) {
      const inserts = newlyUnlocked.map(b => ({ user_id: user.id, badge_id: b.id }));
      await supabase.from('achievements').insert(inserts);

      newlyUnlocked.forEach(b => {
        setToast({
          title: 'Achievement Unlocked! 🏆',
          message: `You earned the "${b.title}" badge!`,
          type: 'badge'
        });
      });
      setBadges(updatedBadges);
    }
  };

  // --- Auth & Profile ---
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (changes: Partial<Profile>) => {
    if (!user || !profile) return;
    
    const { error } = await supabase
      .from('profiles')
      .update(changes)
      .eq('id', user.id);

    if (error) throw error;
    setProfile(prev => prev ? { ...prev, ...changes } : null);
  };

  const deleteUserAccount = async () => {
    if (!user) return;
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
    await signOut();
  };

  // --- Backup Console ---
  const exportUserData = async () => {
    if (!user) return '{}';
    
    // Fetch all tables
    const tasksRes = await supabase.from('tasks').select('*').eq('user_id', user.id);
    const goalsRes = await supabase.from('goals').select('*').eq('user_id', user.id);
    const customRes = await supabase.from('custom_activities').select('*').eq('user_id', user.id);
    const activitiesRes = await supabase.from('activities').select('*').eq('user_id', user.id);
    const skillsRes = await supabase.from('skills').select('*').eq('user_id', user.id);
    const topicsRes = await supabase.from('skill_topics').select('*').eq('user_id', user.id);
    const achievementsRes = await supabase.from('achievements').select('*').eq('user_id', user.id);
    const milestonesRes = await supabase.from('milestones').select('*').eq('user_id', user.id);

    return JSON.stringify({
      version: '1.1.0',
      profile: [profile],
      tasks: tasksRes.data || [],
      goals: goalsRes.data || [],
      custom_activities: customRes.data || [],
      activities: activitiesRes.data || [],
      skills: skillsRes.data || [],
      skill_topics: topicsRes.data || [],
      achievements: achievementsRes.data || [],
      milestones: milestonesRes.data || []
    }, null, 2);
  };

  const importUserData = async (jsonStr: string) => {
    if (!user) return;
    const backup = JSON.parse(jsonStr);

    // Overwrite profile details
    if (backup.profile?.[0]) {
      const bProfile = backup.profile[0];
      await updateProfile({
        name: bProfile.name,
        bio: bProfile.bio || '',
        avatar_url: bProfile.avatar_url,
        xp: Number(bProfile.xp) || 0,
        level: Number(bProfile.level) || 1,
        theme: bProfile.theme || 'dark'
      });
    }

    // Wipe and Import Tasks
    await supabase.from('tasks').delete().eq('user_id', user.id);
    if (backup.tasks?.length > 0) {
      await supabase.from('tasks').insert(backup.tasks.map((t: any) => ({
        user_id: user.id,
        title: t.title,
        description: t.description || '',
        category: t.category,
        priority: t.priority,
        due_date: t.due_date,
        status: t.status
      })));
    }

    // Wipe and Import Goals
    await supabase.from('goals').delete().eq('user_id', user.id);
    if (backup.goals?.length > 0) {
      await supabase.from('goals').insert(backup.goals.map((g: any) => ({
        user_id: user.id,
        title: g.title,
        target_value: Number(g.target_value),
        current_value: Number(g.current_value) || 0,
        unit: g.unit,
        period: g.period,
        target_field: g.target_field,
        is_archived: g.is_archived
      })));
    }

    // Wipe and Import Custom activities
    await supabase.from('custom_activities').delete().eq('user_id', user.id);
    if (backup.custom_activities?.length > 0) {
      await supabase.from('custom_activities').insert(backup.custom_activities.map((c: any) => ({
        user_id: user.id,
        name: c.name,
        category: c.category,
        unit: c.unit,
        xp_per_unit: Number(c.xp_per_unit || c.xpPerUnit || 50)
      })));
    }

    // Wipe and Import Logs
    await supabase.from('activities').delete().eq('user_id', user.id);
    if (backup.activities?.length > 0) {
      await supabase.from('activities').insert(backup.activities.map((a: any) => ({
        user_id: user.id,
        type: a.type,
        category: a.category,
        amount: Number(a.amount),
        unit: a.unit,
        date: a.date,
        notes: a.notes || '',
        xp: Number(a.xp)
      })));
    }

    // Wipe and Import Skills
    await supabase.from('skills').delete().eq('user_id', user.id);
    if (backup.skills?.length > 0) {
      await supabase.from('skills').insert(backup.skills.map((s: any) => ({
        id: s.id,
        user_id: user.id,
        name: s.name,
        slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        level: Number(s.level) || 1,
        xp: Number(s.xp) || 0,
        color: s.color
      })));
    }

    // Wipe and Import Roadmap topics
    await supabase.from('skill_topics').delete().eq('user_id', user.id);
    if (backup.skill_topics?.length > 0) {
      await supabase.from('skill_topics').insert(backup.skill_topics.map((st: any) => ({
        skill_id: st.skill_id,
        user_id: user.id,
        level: Number(st.level),
        topic: st.topic,
        completed: st.completed
      })));
    }

    // Wipe and Import Badges / achievements
    await supabase.from('achievements').delete().eq('user_id', user.id);
    if (backup.achievements?.length > 0) {
      await supabase.from('achievements').insert(backup.achievements.map((ac: any) => ({
        user_id: user.id,
        badge_id: ac.badge_id
      })));
    }

    // Wipe and Import Milestones
    await supabase.from('milestones').delete().eq('user_id', user.id);
    if (backup.milestones?.length > 0) {
      await supabase.from('milestones').insert(backup.milestones.map((m: any) => ({
        user_id: user.id,
        title: m.title,
        target_skill: m.targetSkill || m.target_skill,
        completed: m.completed,
        xp_award: Number(m.xpAward || m.xp_award || 250)
      })));
    }

    // Reload State
    await fetchAllData(user.id);
  };

  // --- Task CRUD ---
  const addTask = async (t: Omit<Task, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...t, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setTasks(prev => [data, ...prev]);
    
    setToast({
      title: 'Task Created',
      message: `"${t.title}" registered successfully.`,
      type: 'success'
    });
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    setToast({
      title: 'Task Updated',
      message: 'Modifications saved to cloud database.',
      type: 'info'
    });
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setTasks(prev => prev.filter(t => t.id !== id));

    setToast({
      title: 'Task Deleted',
      message: 'Task successfully removed.',
      type: 'info'
    });
  };

  const toggleTaskStatus = async (id: string) => {
    if (!user) return;
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    const nextStatus = target.status === 'complete' ? 'incomplete' : 'complete';
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) throw error;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));

    setToast({
      title: nextStatus === 'complete' ? 'Task Checked Off! 🎉' : 'Task Reopened',
      message: `"${target.title}" set to ${nextStatus}.`,
      type: nextStatus === 'complete' ? 'success' : 'info'
    });
  };

  // --- Goal CRUD ---
  const createGoal = async (g: Omit<Goal, 'id' | 'current_value' | 'is_archived'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('goals')
      .insert({ ...g, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setGoalsList(prev => [...prev, data]);
    
    // Refresh mapped legacy targets state
    const { data: refreshedGoals } = await supabase.from('goals').select('*').eq('user_id', user.id);
    const mappedGoals: Goals = JSON.parse(JSON.stringify(DEFAULT_GOALS));
    (refreshedGoals || []).forEach(gItem => {
      if (!gItem.is_archived && (gItem.period === 'daily' || gItem.period === 'weekly' || gItem.period === 'monthly')) {
        const period = gItem.period as 'daily' | 'weekly' | 'monthly';
        const field = gItem.target_field as keyof GoalTarget;
        if (mappedGoals[period] && field in mappedGoals[period]) {
          mappedGoals[period][field] = Number(gItem.target_value);
        }
      }
    });
    setGoals(mappedGoals);

    setToast({
      title: 'Goal Registered',
      message: `"${g.title}" target tracking active.`,
      type: 'success'
    });
  };

  const editGoal = async (id: string, updates: Partial<Goal>) => {
    if (!user) return;
    const { error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    setGoalsList(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));

    setToast({
      title: 'Goal Updated',
      message: 'Targets saved.',
      type: 'info'
    });
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setGoalsList(prev => prev.filter(g => g.id !== id));

    setToast({
      title: 'Goal Removed',
      message: 'Goal deleted successfully.',
      type: 'info'
    });
  };

  const archiveGoal = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('goals')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) throw error;
    setGoalsList(prev => prev.map(g => g.id === id ? { ...g, is_archived: true } : g));

    setToast({
      title: 'Goal Archived',
      message: 'Goal archived successfully.',
      type: 'info'
    });
  };

  // Legacy local target adjuster
  const updateGoal = async (period: 'daily' | 'weekly' | 'monthly', target: keyof GoalTarget, value: number) => {
    if (!user) return;
    
    // Look for existing goal matching configuration to update, or create one
    const matchingGoal = goalsList.find(g => g.period === period && g.target_field === target && !g.is_archived);
    
    if (matchingGoal) {
      await editGoal(matchingGoal.id, { target_value: value });
    } else {
      const fieldTitles = { studyHours: 'Study Hours', workoutMins: 'Workout Duration', readingMins: 'Reading Time', leetcodeCount: 'LeetCode Count' };
      await createGoal({
        title: `${period.toUpperCase()} ${fieldTitles[target] || 'Target'}`,
        target_value: value,
        unit: target === 'studyHours' ? 'hrs' : target === 'leetcodeCount' ? 'solved' : 'mins',
        period,
        target_field: target
      });
    }
  };

  // --- Skill CRUD ---
  const createSkill = async (name: string, color: string = 'primary') => {
    if (!user) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (skills[slug]) return;

    const { data: newSkill, error } = await supabase
      .from('skills')
      .insert({
        user_id: user.id,
        name,
        slug,
        level: 1,
        xp: 0,
        color
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setSkills(prev => ({
      ...prev,
      [slug]: {
        id: newSkill.id,
        name,
        slug,
        level: 1,
        xp: 0,
        color,
        roadmap: []
      }
    }));

    setToast({
      title: 'New Skill Profile',
      message: `"${name}" added to skills catalog.`,
      type: 'success'
    });
  };

  const deleteSkill = async (slug: string) => {
    if (!user || !skills[slug]) return;
    const skillUuid = skills[slug].id;

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillUuid);

    if (error) throw error;

    setSkills(prev => {
      const updated = { ...prev };
      delete updated[slug];
      return updated;
    });

    setToast({
      title: 'Skill Deleted',
      message: `Skill profile successfully removed.`,
      type: 'info'
    });
  };

  const addRoadmapTopic = async (skillId: string, levelNum: number, topicName: string) => {
    if (!user || !skills[skillId]) return;
    const skillUuid = skills[skillId].id;

    const { data: newTopic, error } = await supabase
      .from('skill_topics')
      .insert({
        skill_id: skillUuid,
        user_id: user.id,
        level: levelNum,
        topic: topicName,
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    setSkills(prev => {
      const skill = prev[skillId];
      return {
        ...prev,
        [skillId]: {
          ...skill,
          roadmap: [...skill.roadmap, {
            id: newTopic.id,
            level: levelNum,
            topic: topicName,
            completed: false
          }]
        }
      };
    });

    setToast({
      title: 'Topic Added',
      message: `"${topicName}" registered to Level ${levelNum}.`,
      type: 'info'
    });
  };

  const deleteRoadmapTopic = async (skillId: string, topicId: string) => {
    if (!user || !skills[skillId]) return;
    const topic = skills[skillId].roadmap.find(t => t.id === topicId);
    if (!topic) return;

    const { error } = await supabase
      .from('skill_topics')
      .delete()
      .eq('id', topicId);

    if (error) throw error;

    // Adjust XP levels if the deleted topic was completed
    let changeXp = 0;
    if (topic.completed) {
      changeXp = -100;
      const nextGlobalXp = Math.max(0, xp + changeXp);
      const nextGlobalLvl = Math.floor(nextGlobalXp / 1000) + 1;
      
      await supabase.from('profiles').update({ xp: nextGlobalXp, level: nextGlobalLvl }).eq('id', user.id);
      setXp(nextGlobalXp);
      setLevel(nextGlobalLvl);

      const nextSkillXp = Math.max(0, skills[skillId].xp + changeXp);
      const nextSkillLvl = Math.floor(nextSkillXp / 1000) + 1;
      await supabase.from('skills').update({ xp: nextSkillXp, level: nextSkillLvl }).eq('id', skills[skillId].id);
    }

    setSkills(prev => {
      const skill = prev[skillId];
      return {
        ...prev,
        [skillId]: {
          ...skill,
          xp: topic.completed ? Math.max(0, skill.xp - 100) : skill.xp,
          level: topic.completed ? Math.floor(Math.max(0, skill.xp - 100) / 1000) + 1 : skill.level,
          roadmap: skill.roadmap.filter(t => t.id !== topicId)
        }
      };
    });

    setToast({
      title: 'Topic Deleted',
      message: `Roadmap topic removed.`,
      type: 'info'
    });
  };

  const toggleRoadmapTopic = async (skillId: string, topicId: string) => {
    if (!user || !skills[skillId]) return;

    const skill = skills[skillId];
    const targetTopic = skill.roadmap.find(t => t.id === topicId);
    if (!targetTopic) return;

    const wasCompleted = targetTopic.completed;
    const nextCompleted = !wasCompleted;
    const award = 100;

    const { error } = await supabase
      .from('skill_topics')
      .update({ completed: nextCompleted })
      .eq('id', topicId);

    if (error) throw error;

    // Adjust XP levels
    const changeXp = nextCompleted ? award : -award;
    const nextGlobalXp = Math.max(0, xp + changeXp);
    const nextGlobalLvl = Math.floor(nextGlobalXp / 1000) + 1;
    
    // Update global profile XP
    await supabase.from('profiles').update({ xp: nextGlobalXp, level: nextGlobalLvl }).eq('id', user.id);
    setXp(nextGlobalXp);
    setLevel(nextGlobalLvl);

    // Update local skill XP
    const nextSkillXp = Math.max(0, skill.xp + changeXp);
    const nextSkillLvl = Math.floor(nextSkillXp / 1000) + 1;
    
    await supabase.from('skills').update({ xp: nextSkillXp, level: nextSkillLvl }).eq('id', skill.id);

    setSkills(prev => {
      const oldSkill = prev[skillId];
      return {
        ...prev,
        [skillId]: {
          ...oldSkill,
          xp: nextSkillXp,
          level: nextSkillLvl,
          roadmap: oldSkill.roadmap.map(t => t.id === topicId ? { ...t, completed: nextCompleted } : t)
        }
      };
    });

    setToast({
      title: nextCompleted ? 'Roadmap Checked Off!' : 'Roadmap Unchecked',
      message: nextCompleted ? `Completed "${targetTopic.topic}". +100 XP gained.` : `Deducted 100 XP.`,
      type: nextCompleted ? 'success' : 'info'
    });

    // Check Achievements if completed roadmap
    if (nextCompleted) {
      const updatedSkills = {
        ...skills,
        [skillId]: {
          ...skill,
          roadmap: skill.roadmap.map(t => t.id === topicId ? { ...t, completed: true } : t)
        }
      };
      checkBadgesProgress(streaks.current, logs, updatedSkills);
    }
  };

  // --- Custom Activity ---
  const createCustomActivity = async (name: string, category: string, unit: string, xpPerUnit: number) => {
    if (!user) return;
    const { data: newCustom, error } = await supabase
      .from('custom_activities')
      .insert({
        user_id: user.id,
        name,
        category,
        unit,
        xp_per_unit: parseFloat(xpPerUnit.toString()) || 50
      })
      .select()
      .single();

    if (error) throw error;

    setCustomActivities(prev => [
      ...prev,
      {
        id: newCustom.id,
        name,
        category,
        unit,
        xpPerUnit
      }
    ]);

    // Create Skill profile automatically if category is 'Skills'
    if (category === 'Skills') {
      await createSkill(name, 'custom');
    }

    setToast({
      title: 'Habit Defined',
      message: `"${name}" config stored.`,
      type: 'success'
    });
  };

  const deleteCustomActivity = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('custom_activities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setCustomActivities(prev => prev.filter(c => c.id !== id));

    setToast({
      title: 'Habit Removed',
      message: `Custom activity config deleted.`,
      type: 'info'
    });
  };

  // --- Logger CRUD ---
  const addLog = async ({ type, amount, unit, notes, date, category }: { type: string; amount: number; unit?: string; notes?: string; date?: string; category?: string }) => {
    if (!user) return;
    const dateLogged = date || getLocalDateString();

    let xpMultiplier = 50; 
    if (type === 'workout') xpMultiplier = 2; 
    if (type === 'reading') xpMultiplier = 3; 
    if (type === 'dsa') xpMultiplier = 50; 

    const customAct = customActivities.find(act => act.id === type);
    if (customAct) {
      xpMultiplier = customAct.xpPerUnit;
    }

    const calculatedXp = Math.round(amount * xpMultiplier);

    const { data: newLog, error } = await supabase
      .from('activities')
      .insert({
        user_id: user.id,
        type,
        category: category || (type === 'workout' ? 'Fitness' : (skills[type] ? 'Skills' : 'General')),
        amount: parseFloat(amount.toString()),
        unit: unit || (type === 'workout' || type === 'reading' ? 'mins' : (type === 'dsa' ? 'solved' : 'hrs')),
        date: dateLogged,
        xp: calculatedXp,
        notes: notes || ''
      })
      .select()
      .single();

    if (error) throw error;

    setLogs(prev => [newLog, ...prev]);

    // Update profile levels
    const nextXp = xp + calculatedXp;
    const nextLvl = Math.floor(nextXp / 1000) + 1;
    await supabase.from('profiles').update({ xp: nextXp, level: nextLvl }).eq('id', user.id);
    
    setXp(nextXp);
    
    if (nextLvl > level) {
      setLevel(nextLvl);
      setToast({
        title: 'LEVEL UP! 🎉',
        message: `Congratulations! You reached Level ${nextLvl}! ✨`,
        type: 'level-up'
      });
      setRewardClaimed(false);
    } else {
      setToast({
        title: 'Activity Logged',
        message: `+${calculatedXp} XP added to your Aura.`,
        type: 'success'
      });
    }

    // Update skill specific XP
    if (skills[type]) {
      const skill = skills[type];
      const nextSkillXp = skill.xp + calculatedXp;
      const nextSkillLvl = Math.floor(nextSkillXp / 1000) + 1;
      
      await supabase.from('skills').update({ xp: nextSkillXp, level: nextSkillLvl }).eq('id', type);
      setSkills(prev => ({
        ...prev,
        [type]: { ...skill, xp: nextSkillXp, level: nextSkillLvl }
      }));
    }
  };

  const deleteLog = async (id: string) => {
    if (!user) return;
    const target = logs.find(l => l.id === id);
    if (!target) return;

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setLogs(prev => prev.filter(l => l.id !== id));

    const adjustedXp = Math.max(0, xp - target.xp);
    const adjustedLvl = Math.max(1, Math.floor(adjustedXp / 1000) + 1);
    await supabase.from('profiles').update({ xp: adjustedXp, level: adjustedLvl }).eq('id', user.id);
    
    setXp(adjustedXp);
    setLevel(adjustedLvl);

    if (skills[target.type]) {
      const skill = skills[target.type];
      const nextSkillXp = Math.max(0, skill.xp - target.xp);
      const nextSkillLvl = Math.max(1, Math.floor(nextSkillXp / 1000) + 1);
      
      await supabase.from('skills').update({ xp: nextSkillXp, level: nextSkillLvl }).eq('id', target.type);
      setSkills(prev => ({
        ...prev,
        [target.type]: { ...skill, xp: nextSkillXp, level: nextSkillLvl }
      }));
    }

    setToast({
      title: 'Log Deleted',
      message: `${target.xp} XP deducted from Aura.`,
      type: 'info'
    });
  };

  // --- Milestones CRUD ---
  const addMilestone = async (title: string, targetSkill: string, xpAward: number) => {
    if (!user) return;

    const { data: newMilestone, error } = await supabase
      .from('milestones')
      .insert({
        user_id: user.id,
        title,
        target_skill: targetSkill,
        completed: false,
        xp_award: xpAward
      })
      .select()
      .single();

    if (error) throw error;

    setMilestones(prev => [
      ...prev,
      {
        id: newMilestone.id,
        title: newMilestone.title,
        targetSkill: newMilestone.target_skill,
        completed: newMilestone.completed,
        xpAward: newMilestone.xp_award
      }
    ]);

    setToast({
      title: 'Milestone Created',
      message: `"${title}" has been added to your targets.`,
      type: 'success'
    });
  };

  const deleteMilestone = async (id: string) => {
    if (!user) return;
    const target = milestones.find(m => m.id === id);
    if (!target) return;

    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Deduct XP if it was completed
    if (target.completed) {
      const nextXp = Math.max(0, xp - target.xpAward);
      const nextLvl = Math.max(1, Math.floor(nextXp / 1000) + 1);
      await supabase.from('profiles').update({ xp: nextXp, level: nextLvl }).eq('id', user.id);
      setXp(nextXp);
      setLevel(nextLvl);
    }

    setMilestones(prev => prev.filter(m => m.id !== id));

    setToast({
      title: 'Milestone Removed',
      message: `Milestone successfully deleted.`,
      type: 'info'
    });
  };

  const toggleMilestone = async (id: string) => {
    if (!user) return;
    const target = milestones.find(m => m.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;

    const { error } = await supabase
      .from('milestones')
      .update({ completed: nextCompleted })
      .eq('id', id);

    if (error) throw error;

    const changeXp = nextCompleted ? target.xpAward : -target.xpAward;
    const nextXp = Math.max(0, xp + changeXp);
    const nextLvl = Math.max(1, Math.floor(nextXp / 1000) + 1);
    await supabase.from('profiles').update({ xp: nextXp, level: nextLvl }).eq('id', user.id);
    
    setXp(nextXp);
    setLevel(nextLvl);

    setToast({
      title: nextCompleted ? 'Milestone Completed! 🎉' : 'Milestone Unchecked',
      message: nextCompleted 
        ? `+${target.xpAward} XP: "${target.title}" completed.` 
        : `Deducted ${target.xpAward} XP.`,
      type: nextCompleted ? 'milestone' : 'info'
    });

    setMilestones(prev => prev.map(m => m.id === id ? { ...m, completed: nextCompleted } : m));
  };

  const claimReward = () => {
    if (rewardClaimed || !user) return;
    setRewardClaimed(true);
    
    const nextXp = xp + 250;
    const nextLvl = Math.floor(nextXp / 1000) + 1;
    supabase.from('profiles').update({ xp: nextXp, level: nextLvl }).eq('id', user.id).then(() => {
      setXp(nextXp);
      setLevel(nextLvl);
      setToast({
        title: 'Level Reward Claimed! 🎁',
        message: '+250 XP bonus credited to your Aura.',
        type: 'success'
      });
    });
  };

  // --- Real-Time Analytics calculations ---
  const getHoursLogged = (daysStart: number, daysEnd: number) => {
    if (logs.length === 0) return 0;
    const startStr = getRelativeLocalDateString(daysStart);
    const endStr = getRelativeLocalDateString(daysEnd);
    return logs
      .filter(l => l.date >= startStr && l.date <= endStr)
      .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || skills[l.type])
      .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);
  };

  const studyThisWeek = useMemo(() => getHoursLogged(6, 0), [logs, skills]);
  const studyLastWeek = useMemo(() => getHoursLogged(13, 7), [logs, skills]);

  const weeklyGrowth = useMemo(() => {
    if (logs.length === 0 || studyThisWeek === 0) return 0;
    return studyLastWeek === 0 ? studyThisWeek * 100 : Math.round(((studyThisWeek - studyLastWeek) / studyLastWeek) * 100);
  }, [studyThisWeek, studyLastWeek, logs.length]);

  const studyThisMonth = useMemo(() => getHoursLogged(29, 0), [logs, skills]);
  const studyLastMonth = useMemo(() => getHoursLogged(59, 30), [logs, skills]);

  const monthlyGrowth = useMemo(() => {
    if (logs.length === 0 || studyThisMonth === 0) return 0;
    return studyLastMonth === 0 ? studyThisMonth * 100 : Math.round(((studyThisMonth - studyLastMonth) / studyLastMonth) * 100);
  }, [studyThisMonth, studyLastMonth, logs.length]);

  const dailyProductivityScore = useMemo(() => {
    if (logs.length === 0) return 0;
    const todayStr = getLocalDateString();
    const todayLogs = logs.filter(l => l.date === todayStr);
    if (todayLogs.length === 0) return 0;

    const studyLogged = todayLogs
      .filter(l => l.type === 'study' || l.type === 'react' || l.type === 'dsa' || skills[l.type])
      .reduce((sum, l) => sum + (l.unit === 'hrs' ? l.amount : 0), 0);
    const workoutLogged = todayLogs
      .filter(l => l.type === 'workout')
      .reduce((sum, l) => sum + l.amount, 0);

    const studyGoal = goals.daily.studyHours || 4;
    const workoutGoal = goals.daily.workoutMins || 30;

    const studyPct = studyGoal > 0 ? Math.min(100, (studyLogged / studyGoal) * 100) : 100;
    const workoutPct = workoutGoal > 0 ? Math.min(100, (workoutLogged / workoutGoal) * 100) : 100;
    
    const goalScore = (studyPct + workoutPct) / 2;
    const streakScore = streaks.current > 0 ? 100 : 30;
    const studyHoursScore = Math.min(100, (studyLogged / 4) * 100);

    const totalScore = Math.round((goalScore * 0.5) + (streakScore * 0.2) + (studyHoursScore * 0.3));
    return Math.min(100, Math.max(0, totalScore));
  }, [logs, goals.daily, streaks.current, skills]);

  const goalStatus = useMemo((): 'On Track' | 'Ahead of Schedule' | 'Behind Schedule' => {
    const now = new Date();
    let dayOfWeek = now.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;
    
    const currentWeekProgress = getHoursLogged(dayOfWeek - 1, 0);
    const weeklyTarget = goals.weekly.studyHours;
    const expectedProgress = (dayOfWeek / 7) * weeklyTarget;
    
    if (currentWeekProgress > expectedProgress * 1.1) return 'Ahead of Schedule';
    if (currentWeekProgress < expectedProgress * 0.85) return 'Behind Schedule';
    return 'On Track';
  }, [logs, goals.weekly.studyHours, skills]);

  const forecasts = useMemo(() => {
    if (logs.length === 0) {
      return {
        reactCompletion: 'No logs yet',
        dsaCompletion: 'No logs yet',
        goalAchievement: 'No logs yet'
      };
    }

    const reactSkill = skills['react'];
    const reactTotal = reactSkill?.roadmap.length || 0;
    const reactCompleted = reactSkill?.roadmap.filter(t => t.completed).length || 0;
    const reactRemaining = reactTotal - reactCompleted;
    
    const reactHours14 = logs
      .filter(l => l.date >= getRelativeLocalDateString(13) && l.type === 'react')
      .reduce((sum, l) => sum + l.amount, 0);
    let reactVelocity = (reactHours14 / 14) / 3; 
    if (reactVelocity <= 0) reactVelocity = 0.05;
    const reactDays = Math.ceil(reactRemaining / reactVelocity);
    const reactDate = new Date();
    reactDate.setDate(reactDate.getDate() + reactDays);
    const reactDateStr = reactTotal === 0 ? 'No roadmap' : (reactRemaining === 0 ? 'Completed ✓' : reactDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

    const dsaSkill = skills['dsa'];
    const dsaTotal = dsaSkill?.roadmap.length || 0;
    const dsaCompleted = dsaSkill?.roadmap.filter(t => t.completed).length || 0;
    const dsaRemaining = dsaTotal - dsaCompleted;
    
    const dsaSolved14 = logs
      .filter(l => l.date >= getRelativeLocalDateString(13) && l.type === 'dsa')
      .reduce((sum, l) => sum + l.amount, 0);
    let dsaVelocity = (dsaSolved14 / 14) / 4;
    if (dsaVelocity <= 0) dsaVelocity = 0.05;
    const dsaDays = Math.ceil(dsaRemaining / dsaVelocity);
    const dsaDate = new Date();
    dsaDate.setDate(dsaDate.getDate() + dsaDays);
    const dsaDateStr = dsaTotal === 0 ? 'No roadmap' : (dsaRemaining === 0 ? 'Completed ✓' : dsaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

    const remainingMilestones = milestones.filter(m => !m.completed).length;
    const daysMultiplier = goalStatus === 'Ahead of Schedule' ? 7 : goalStatus === 'Behind Schedule' ? 20 : 12;
    const goalDays = remainingMilestones * daysMultiplier;
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + goalDays);
    const goalDateStr = remainingMilestones === 0 ? 'All milestones met!' : goalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      reactCompletion: reactDateStr,
      dsaCompletion: dsaDateStr,
      goalAchievement: goalDateStr
    };
  }, [logs, skills, milestones, goalStatus]);

  const learningInsights = useMemo(() => {
    const insights = [];
    
    if (logs.length === 0) {
      return ['Welcome to Aura! Fill out activity logs or roadmap topics to activate insights engine.'];
    }

    const reactHrsThisWeek = logs
      .filter(l => l.date >= getRelativeLocalDateString(6) && l.type === 'react')
      .reduce((sum, l) => sum + l.amount, 0);
    const reactHrsLastWeek = logs
      .filter(l => l.date >= getRelativeLocalDateString(13) && l.date < getRelativeLocalDateString(6) && l.type === 'react')
      .reduce((sum, l) => sum + l.amount, 0);
    
    if (skills['react'] && (reactHrsThisWeek > 0 || reactHrsLastWeek > 0)) {
      if (reactHrsThisWeek > reactHrsLastWeek) {
        insights.push('React learning rate is improving. Keep logging hours to accelerate your forecast!');
      } else {
        insights.push('React learning hours are stable. Add a small weekend block to speed up completion.');
      }
    }

    const dsaThisWeek = logs
      .filter(l => l.date >= getRelativeLocalDateString(6) && l.type === 'dsa')
      .reduce((sum, l) => sum + l.amount, 0);
    const dsaLastWeek = logs
      .filter(l => l.date >= getRelativeLocalDateString(13) && l.date < getRelativeLocalDateString(6) && l.type === 'dsa')
      .reduce((sum, l) => sum + l.amount, 0);
    
    if (skills['dsa'] && (dsaThisWeek > 0 || dsaLastWeek > 0)) {
      if (dsaThisWeek < dsaLastWeek) {
        insights.push('DSA consistency has dropped compared to last week. Try solving at least 1 LeetCode problem daily.');
      } else {
        insights.push('DSA practice is consistent. Your analytical velocity is matching targets.');
      }
    }

    if (studyLastWeek > 0) {
      const diff = Math.round(((studyThisWeek - studyLastWeek) / studyLastWeek) * 100);
      if (diff > 0) {
        insights.push(`You studied ${diff}% more this week compared to the previous week. Excellent work!`);
      } else if (diff < 0) {
        insights.push(`Your study hours decreased by ${Math.abs(diff)}% this week. Try scheduling 30m blocks.`);
      } else {
        insights.push('Your weekly study pacing is identical to last week. Perfect balance.');
      }
    }

    if (insights.length === 0) {
      insights.push('Consistency is key. Keep recording habits daily to establish strong behavioral analytics.');
    }

    return insights.slice(0, 3);
  }, [logs, studyThisWeek, studyLastWeek, skills]);

  const aiSuggestions = useMemo(() => {
    const suggestions = [];

    if (logs.length === 0) {
      return [
        'Define active milestones to establish initial target pacing.',
        'Add a custom skill profile to track custom topic roadmaps.',
        'Log a workout duration or study hours to establish your daily streak.'
      ];
    }

    const weekendLogs = logs.filter(l => {
      const day = parseLocalDate(l.date).getDay();
      return (day === 0 || day === 6);
    });
    const weekdayLogs = logs.filter(l => {
      const day = parseLocalDate(l.date).getDay();
      return (day > 0 && day < 6);
    });

    const weekendHrs = weekendLogs.filter(l => l.type !== 'workout' && l.unit === 'hrs').reduce((sum, l) => sum + l.amount, 0);
    const weekdayHrs = weekdayLogs.filter(l => l.type !== 'workout' && l.unit === 'hrs').reduce((sum, l) => sum + l.amount, 0);
    const avgWeekend = weekendHrs / 2;
    const avgWeekday = weekdayHrs / 5;

    if (weekendHrs > 0 || weekdayHrs > 0) {
      if (avgWeekend > avgWeekday * 1.3) {
        suggestions.push('You usually study more on weekends. Secure a 2-hour morning block on Saturday for deep focus.');
      } else {
        suggestions.push('Your weekday study habit is strong. Keep consistency high with short evening reviews.');
      }
    }

    const reactSkill = skills['react'];
    const reactTotal = reactSkill?.roadmap.length || 0;
    const reactCompleted = reactSkill?.roadmap.filter(t => t.completed).length || 0;
    const reactRemaining = reactTotal - reactCompleted;
    if (reactRemaining > 0 && reactTotal > 0 && reactCompleted > 0) {
      suggestions.push(`Adding 30 minutes daily to React will finish your roadmap ${Math.max(3, Math.ceil(reactRemaining * 1.5))} days earlier!`);
    }

    const workoutThisWeek = logs.filter(l => l.date >= getRelativeLocalDateString(6) && l.type === 'workout').length;
    const workoutLastWeek = logs.filter(l => l.date >= getRelativeLocalDateString(13) && l.date < getRelativeLocalDateString(6) && l.type === 'workout').length;
    const totalWorkoutLogs = logs.filter(l => l.type === 'workout').length;

    if (totalWorkoutLogs === 0) {
      suggestions.push('No workouts recorded yet. Consider adding a quick workout session to boost your physical energy.');
    } else if (workoutThisWeek < workoutLastWeek) {
      suggestions.push('Your workout consistency is decreasing. Consider doing a quick 15-minute home routine today.');
    } else if (workoutThisWeek > 0) {
      suggestions.push('Workout consistency is solid. Keep up the physical training to stay energized for learning.');
    }

    return suggestions.slice(0, 3);
  }, [logs, skills]);

  return (
    <AppContext.Provider value={{
      user,
      profile,
      authLoading,
      logs,
      tasks,
      goalsList,
      customActivities,
      goals,
      skills,
      badges,
      milestones,
      streaks,
      xp,
      level,
      toast,
      setToast,
      rewardClaimed,
      claimReward,
      weeklyGrowth,
      monthlyGrowth,
      dailyProductivityScore,
      goalStatus,
      learningInsights,
      forecasts,
      aiSuggestions,
      
      // Auth CRUD
      signOut,
      updateProfile,
      deleteUserAccount,

      // Data Sync
      exportUserData,
      importUserData,

      // Tasks CRUD
      addTask,
      updateTask,
      deleteTask,
      toggleTaskStatus,

      // Goals CRUD
      createGoal,
      editGoal,
      deleteGoal,
      archiveGoal,
      updateGoal,

      // Skills CRUD
      createSkill,
      deleteSkill,
      addRoadmapTopic,
      deleteRoadmapTopic,
      toggleRoadmapTopic,

      // Custom habits CRUD
      createCustomActivity,
      deleteCustomActivity,

      // Milestones CRUD
      addMilestone,
      deleteMilestone,
      toggleMilestone,

      // Logger CRUD
      addLog,
      deleteLog
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
