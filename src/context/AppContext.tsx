import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Log, CustomActivity, Goals, Skill, SkillLevel, Badge, Milestone, StreakState, AppState, GoalTarget, Task, TaskChecklistItem, TaskCompletionRecord, Profile, Goal } from '../types';
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
  updateTaskChecklist: (taskId: string, checklist: TaskChecklistItem[]) => Promise<void>;
  
  // Goal CRUD
  createGoal: (goal: Omit<Goal, 'id' | 'current_value' | 'is_archived'>) => Promise<void>;
  editGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  updateGoal: (period: 'daily' | 'weekly' | 'monthly', target: keyof GoalTarget, value: number) => void;
  
  // Skill CRUD
  createSkill: (
    name: string, 
    color?: string, 
    templateType?: string, 
    customRoadmap?: { level: number; topic: string }[], 
    customLevels?: { level_number: number; name: string }[]
  ) => Promise<string | undefined>;
  deleteSkill: (slug: string) => Promise<void>;
  editSkillName: (slug: string, newName: string) => Promise<void>;
  addRoadmapTopic: (skillId: string, level: number, topic: string) => Promise<void>;
  editRoadmapTopic: (skillId: string, topicId: string, updatedName: string) => Promise<void>;
  deleteRoadmapTopic: (skillId: string, topicId: string) => Promise<void>;
  toggleRoadmapTopic: (skillId: string, topicId: string) => Promise<void>;
  addRoadmapLevel: (skillId: string, name: string) => Promise<void>;
  editRoadmapLevel: (skillId: string, levelNum: number, updates: { name?: string; display_order?: number }) => Promise<void>;
  deleteRoadmapLevel: (skillId: string, levelNum: number) => Promise<void>;
  reorderRoadmapLevels: (skillId: string, reorderedLevels: SkillLevel[]) => Promise<void>;
  
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

const TEMPLATE_TOPICS: Record<string, { level: number; topic: string }[]> = {
  react: [
    { level: 1, topic: 'HTML & CSS Fundamentals' },
    { level: 1, topic: 'Modern JavaScript (ES6+)' },
    { level: 1, topic: 'Basic Web APIs & DOM manipulation' },
    { level: 2, topic: 'React Components & Props' },
    { level: 2, topic: 'JSX Syntax & Rendering' },
    { level: 2, topic: 'Event Handling' },
    { level: 3, topic: 'State Management (useState/useReducer)' },
    { level: 3, topic: 'Component Lifecycle & useEffect' },
    { level: 3, topic: 'React Router & Navigation' },
    { level: 4, topic: 'Global State (Context API / Redux)' },
    { level: 4, topic: 'Custom Hooks development' },
    { level: 4, topic: 'React Performance (memo, useMemo, useCallback)' },
    { level: 5, topic: 'Unit Testing with Jest & React Testing Library' },
    { level: 5, topic: 'Deployment (Vercel / Netlify)' },
    { level: 5, topic: 'CI/CD Pipelines for Frontend' }
  ],
  dsa: [
    { level: 1, topic: 'Arrays & Array Operations' },
    { level: 1, topic: 'Strings & Basic Algorithms' },
    { level: 1, topic: 'Big O Complexity Analysis' },
    { level: 2, topic: 'Singly & Doubly Linked Lists' },
    { level: 2, topic: 'Stacks & Queues implementation' },
    { level: 2, topic: 'Recursion basics' },
    { level: 3, topic: 'Sorting & Searching (Binary Search)' },
    { level: 3, topic: 'Binary Trees & BST Traversals' },
    { level: 3, topic: 'Hash Tables & Collisions' },
    { level: 4, topic: 'Graphs (BFS & DFS)' },
    { level: 4, topic: 'Greedy Algorithms' },
    { level: 4, topic: 'Introduction to Dynamic Programming' },
    { level: 5, topic: 'Advanced Dynamic Programming' },
    { level: 5, topic: 'Trie Data Structures' },
    { level: 5, topic: 'Segment Trees & Range Queries' }
  ],
  aptitude: [
    { level: 1, topic: 'Number Systems & Divisibility' },
    { level: 1, topic: 'Percentages & Fractions' },
    { level: 1, topic: 'Averages & Ratios' },
    { level: 2, topic: 'Ratio & Proportion' },
    { level: 2, topic: 'Profit, Loss & Discount' },
    { level: 2, topic: 'Simple & Compound Interest' },
    { level: 3, topic: 'Time, Speed & Distance' },
    { level: 3, topic: 'Time & Work' },
    { level: 3, topic: 'Permutations & Combinations' },
    { level: 4, topic: 'Probability Fundamentals' },
    { level: 4, topic: 'Data Interpretation (Bar/Pie Charts)' },
    { level: 4, topic: 'Logical Syllogisms & Venn Diagrams' },
    { level: 5, topic: 'Verbal & Reading Comprehension' },
    { level: 5, topic: 'Critical Thinking Problems' },
    { level: 5, topic: 'Speed Test & Mock Aptitude Exams' }
  ],
  dbms: [
    { level: 1, topic: 'Database Concepts & DBMS Architecture' },
    { level: 1, topic: 'Entity-Relationship (ER) Diagrams' },
    { level: 1, topic: 'Relational Model & Constraints' },
    { level: 2, topic: 'SQL Queries (SELECT, WHERE, JOINs)' },
    { level: 2, topic: 'Aggregation Functions & GROUP BY' },
    { level: 2, topic: 'Primary, Foreign, & Unique Keys' },
    { level: 3, topic: 'Database Normalization (1NF to BCNF)' },
    { level: 3, topic: 'Subqueries & Nested Relational Algebra' },
    { level: 3, topic: 'Database Views & Secondary Indexes' },
    { level: 4, topic: 'Transaction Management (ACID)' },
    { level: 4, topic: 'Concurrency Control & Locking' },
    { level: 4, topic: 'OS Crash Recovery Protocols' },
    { level: 5, topic: 'Query Optimization & Execution Plans' },
    { level: 5, topic: 'NoSQL Databases (MongoDB / Redis)' },
    { level: 5, topic: 'Database Security & Row Level Security' }
  ],
  os: [
    { level: 1, topic: 'OS Architectures & Microkernels' },
    { level: 1, topic: 'System Calls & Process Creation' },
    { level: 1, topic: 'Processes vs Threads' },
    { level: 2, topic: 'CPU Scheduling Algorithms' },
    { level: 2, topic: 'Process Synchronization & Race Conditions' },
    { level: 2, topic: 'Semaphores & Mutex Locks' },
    { level: 3, topic: 'Deadlock Banker\'s Algorithm' },
    { level: 3, topic: 'Memory Paging & Segmentation' },
    { level: 3, topic: 'Virtual Memory & Page Replacement (LRU)' },
    { level: 4, topic: 'File System Directories & Allocations' },
    { level: 4, topic: 'Disk Scheduling (SSTF, SCAN)' },
    { level: 4, topic: 'I/O Hardware & Interrupt Handling' },
    { level: 5, topic: 'Containerization & Docker Concepts' },
    { level: 5, topic: 'OS Security Access Matrix' },
    { level: 5, topic: 'Real-Time Operating Systems (RTOS)' }
  ]
};

const DEFAULT_LEVEL_NAMES: Record<number, string> = {
  1: 'Fundamentals',
  2: 'Basic Core concepts',
  3: 'Intermediate Logic',
  4: 'Advanced Stack',
  5: 'Testing & Operations'
};

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

  // User ID and fetch tracking to prevent unwanted full-screen reloading on tab switches
  const currentLoadedUserId = useRef<string | null>(null);
  const isFetchingData = useRef<boolean>(false);

  // Initialize Auth Sync Listeners
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    // Load active session on initial mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        currentLoadedUserId.current = activeUser.id;
        fetchAllData(activeUser.id, false);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const activeUser = session?.user ?? null;

      // Token refresh or window focus events: do NOT wipe screen or re-fetch all tables
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (activeUser) {
          setUser(activeUser);
        }
        return;
      }

      if (event === 'SIGNED_OUT' || !activeUser) {
        // Clear state on Sign Out
        setUser(null);
        currentLoadedUserId.current = null;
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
        return;
      }

      // If user is already loaded and it's the exact same user, do not trigger a full reloading screen
      if (activeUser.id === currentLoadedUserId.current) {
        setUser(activeUser);
        return;
      }

      // New user signed in
      setUser(activeUser);
      currentLoadedUserId.current = activeUser.id;
      fetchAllData(activeUser.id, false);
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
  const fetchAllData = async (userId: string, isSilent = false) => {
    if (isFetchingData.current) return;
    isFetchingData.current = true;

    // Only display full-screen loading on cold boot before data is loaded
    if (!isSilent && currentLoadedUserId.current !== userId) {
      setAuthLoading(true);
    }
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

      const todayStr = getLocalDateString();
      let hasResets = false;
      const processedTasks: Task[] = (tasksData || []).map((t: any) => {
        const isRecurring = !!t.is_recurring;
        const lastReset = t.last_reset_date || (t.created_at ? t.created_at.split('T')[0] : todayStr);
        let status = t.status || 'incomplete';
        let checklist: TaskChecklistItem[] = Array.isArray(t.checklist) ? t.checklist : [];
        let recurringHistory: TaskCompletionRecord[] = Array.isArray(t.recurring_history) ? t.recurring_history : [];

        // Check if recurring task needs daily reset (new day has arrived)
        if (isRecurring && lastReset < todayStr) {
          hasResets = true;
          // Preserve past day completion in recurring_history if completed
          if (status === 'complete' && !recurringHistory.some(r => r.date === lastReset)) {
            recurringHistory = [...recurringHistory, { date: lastReset, completed: true }];
          }
          // Reset status and checklist for the fresh day
          status = 'incomplete';
          checklist = checklist.map(item => ({ ...item, completed: false }));
          return {
            ...t,
            is_recurring: true,
            status,
            due_date: todayStr,
            last_reset_date: todayStr,
            checklist,
            recurring_history: recurringHistory
          };
        }

        return {
          ...t,
          is_recurring: isRecurring,
          status,
          last_reset_date: lastReset,
          checklist,
          recurring_history: recurringHistory
        };
      });

      setTasks(processedTasks);

      // Asynchronously sync any daily-reset tasks back to Supabase
      if (hasResets) {
        processedTasks.forEach(async (task) => {
          if (task.is_recurring && task.last_reset_date === todayStr && task.status === 'incomplete') {
            try {
              await supabase.from('tasks').update({
                status: 'incomplete',
                due_date: todayStr,
                last_reset_date: todayStr,
                checklist: task.checklist,
                recurring_history: task.recurring_history
              }).eq('id', task.id);
            } catch (syncErr) {
              console.warn('Could not sync daily task reset to cloud:', syncErr);
            }
          }
        });
      }

      // 3. Load goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      let dbGoals = goalsData || [];

      // If user has no goals stored yet and hasn't explicitly initialized, seed the default 4 goals
      if (dbGoals.length === 0 && !localStorage.getItem('aura_goals_initialized_' + userId)) {
        const defaultGoalsToInsert = [
          { user_id: userId, title: 'Study Hours', target_value: 4, unit: 'hrs', period: 'daily', target_field: 'studyHours' },
          { user_id: userId, title: 'Workout Mins', target_value: 30, unit: 'mins', period: 'daily', target_field: 'workoutMins' },
          { user_id: userId, title: 'Reading Mins', target_value: 20, unit: 'mins', period: 'daily', target_field: 'readingMins' },
          { user_id: userId, title: 'LeetCode count', target_value: 3, unit: 'solved', period: 'daily', target_field: 'leetcodeCount' }
        ];
        const { data: insertedGoals } = await supabase
          .from('goals')
          .insert(defaultGoalsToInsert)
          .select();
        if (insertedGoals && insertedGoals.length > 0) {
          dbGoals = insertedGoals;
        }
        localStorage.setItem('aura_goals_initialized_' + userId, 'true');
      }

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

      // 6. Load skills, skill roadmaps, and custom levels
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
      const { data: levelsData } = await supabase
        .from('skill_levels')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
 
      const dbSkills = skillsData || [];
      const dbTopics = topicsData || [];
      const dbLevels = levelsData || [];
      const skillsMap: Record<string, Skill> = {};
 
      dbSkills.forEach(s => {
        const slug = s.slug || s.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Find DB levels for this skill
        const skillLevels = dbLevels
          .filter(l => l.skill_id === s.id)
          .map(l => ({
            id: l.id,
            skill_id: l.skill_id,
            level_number: l.level_number,
            name: l.name,
            display_order: l.display_order
          }));

        // Fallback default levels if none are stored in db yet
        const finalLevels = skillLevels.length > 0 ? skillLevels : [1, 2, 3, 4, 5].map(num => ({
          id: `temp-${s.id}-${num}`,
          skill_id: s.id,
          level_number: num,
          name: DEFAULT_LEVEL_NAMES[num] || `Level ${num}`,
          display_order: num
        }));

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
            })),
          levels: finalLevels
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
      isFetchingData.current = false;
      currentLoadedUserId.current = userId;
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
    const todayStr = getLocalDateString();
    const newTaskPayload = {
      user_id: user.id,
      title: t.title,
      description: t.description || '',
      category: t.category,
      priority: t.priority,
      due_date: t.due_date,
      status: t.status || 'incomplete',
      is_recurring: t.is_recurring ?? false,
      recurring_history: t.recurring_history ?? [],
      last_reset_date: t.last_reset_date ?? todayStr,
      checklist: t.checklist ?? [],
      attachment_name: t.attachment_name ?? null
    };

    let createdTask: Task | null = null;
    const { data, error } = await supabase
      .from('tasks')
      .insert(newTaskPayload)
      .select()
      .single();

    if (error) {
      // Fallback if Supabase table has not had tasks_feature_migration.sql run yet
      if (error.message?.includes('column') || error.code === '42703') {
        console.warn('tasks table missing new columns, storing base columns to database:', error.message);
        const basePayload = {
          user_id: user.id,
          title: t.title,
          description: t.description || '',
          category: t.category,
          priority: t.priority,
          due_date: t.due_date,
          status: t.status || 'incomplete'
        };
        const { data: fbData, error: fbErr } = await supabase
          .from('tasks')
          .insert(basePayload)
          .select()
          .single();
        if (fbErr) throw fbErr;
        createdTask = {
          ...fbData,
          is_recurring: t.is_recurring ?? false,
          recurring_history: t.recurring_history ?? [],
          last_reset_date: t.last_reset_date ?? todayStr,
          checklist: t.checklist ?? [],
          attachment_name: t.attachment_name ?? undefined
        };
      } else {
        throw error;
      }
    } else {
      createdTask = data;
    }

    if (createdTask) {
      setTasks(prev => [createdTask!, ...prev]);
      setToast({
        title: t.is_recurring ? 'Daily Recurring Task Added' : 'Task Created',
        message: `"${t.title}" registered successfully.`,
        type: 'success'
      });
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const baseUpdates: any = {};
      ['title', 'description', 'category', 'priority', 'due_date', 'status'].forEach(k => {
        if (k in updates) baseUpdates[k] = (updates as any)[k];
      });
      await supabase.from('tasks').update(baseUpdates).eq('id', id);
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    setToast({
      title: 'Task Updated',
      message: 'Modifications saved successfully.',
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
    const todayStr = getLocalDateString();
    
    let nextRecurringHistory = [...(target.recurring_history || [])];
    let nextChecklist = target.checklist ? [...target.checklist] : [];

    if (target.is_recurring) {
      const existingIdx = nextRecurringHistory.findIndex(r => r.date === todayStr);
      if (nextStatus === 'complete') {
        if (existingIdx >= 0) {
          nextRecurringHistory[existingIdx] = {
            ...nextRecurringHistory[existingIdx],
            completed: true,
            completed_at: new Date().toISOString()
          };
        } else {
          nextRecurringHistory.push({
            date: todayStr,
            completed: true,
            completed_at: new Date().toISOString()
          });
        }
        // When checking off the whole recurring task, mark all sub-items completed
        nextChecklist = nextChecklist.map(c => ({ ...c, completed: true }));
      } else {
        if (existingIdx >= 0) {
          nextRecurringHistory[existingIdx] = {
            ...nextRecurringHistory[existingIdx],
            completed: false
          };
        }
      }
    }

    const updates: Partial<Task> = {
      status: nextStatus,
      recurring_history: nextRecurringHistory,
      checklist: nextChecklist
    };

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      await supabase.from('tasks').update({ status: nextStatus }).eq('id', id);
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    setToast({
      title: nextStatus === 'complete' ? (target.is_recurring ? 'Daily Habit Completed! 🔥' : 'Task Checked Off! 🎉') : 'Task Reopened',
      message: `"${target.title}" marked as ${nextStatus}.`,
      type: nextStatus === 'complete' ? 'success' : 'info'
    });
  };

  const updateTaskChecklist = async (taskId: string, newChecklist: TaskChecklistItem[]) => {
    if (!user) return;
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const allDone = newChecklist.length > 0 && newChecklist.every(i => i.completed);
    const hasPending = newChecklist.some(i => !i.completed);
    
    let nextStatus = target.status;
    const todayStr = getLocalDateString();
    let nextRecurringHistory = [...(target.recurring_history || [])];

    if (allDone && target.status !== 'complete') {
      nextStatus = 'complete';
      if (target.is_recurring) {
        const existingIdx = nextRecurringHistory.findIndex(r => r.date === todayStr);
        if (existingIdx >= 0) {
          nextRecurringHistory[existingIdx] = { ...nextRecurringHistory[existingIdx], completed: true };
        } else {
          nextRecurringHistory.push({ date: todayStr, completed: true, completed_at: new Date().toISOString() });
        }
      }
    } else if (hasPending && target.status === 'complete') {
      nextStatus = 'incomplete';
      if (target.is_recurring) {
        const existingIdx = nextRecurringHistory.findIndex(r => r.date === todayStr);
        if (existingIdx >= 0) {
          nextRecurringHistory[existingIdx] = { ...nextRecurringHistory[existingIdx], completed: false };
        }
      }
    }

    const updates: Partial<Task> = {
      checklist: newChecklist,
      status: nextStatus,
      recurring_history: nextRecurringHistory
    };

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error && (error.message?.includes('column') || error.code === '42703')) {
      if (nextStatus !== target.status) {
        await supabase.from('tasks').update({ status: nextStatus }).eq('id', taskId);
      }
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  // --- Goal CRUD ---
  const refreshGoalsState = async (userId: string) => {
    const { data: refreshedGoals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    const dbGoals = refreshedGoals || [];
    setGoalsList(dbGoals);

    const mappedGoals: Goals = JSON.parse(JSON.stringify(DEFAULT_GOALS));
    dbGoals.forEach(gItem => {
      if (!gItem.is_archived && (gItem.period === 'daily' || gItem.period === 'weekly' || gItem.period === 'monthly')) {
        const period = gItem.period as 'daily' | 'weekly' | 'monthly';
        const field = gItem.target_field as keyof GoalTarget;
        if (mappedGoals[period] && field in mappedGoals[period]) {
          mappedGoals[period][field] = Number(gItem.target_value);
        }
      }
    });
    setGoals(mappedGoals);
  };

  const createGoal = async (g: Omit<Goal, 'id' | 'current_value' | 'is_archived'>) => {
    if (!user) return;
    const { error } = await supabase
      .from('goals')
      .insert({ ...g, user_id: user.id });

    if (error) throw error;
    await refreshGoalsState(user.id);

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
    await refreshGoalsState(user.id);

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
    await refreshGoalsState(user.id);

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
    await refreshGoalsState(user.id);

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

  const createSkill = async (
    name: string, 
    color: string = 'primary', 
    templateType: string = 'empty',
    customRoadmap?: { level: number; topic: string }[],
    customLevels?: { level_number: number; name: string }[]
  ): Promise<string | undefined> => {
    if (!user) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (skills[slug]) return slug;

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

    // 1. Insert levels into skill_levels
    let levelsToInsert: any[] = [];
    if (customLevels && customLevels.length > 0) {
      levelsToInsert = customLevels.map((lvl, idx) => ({
        skill_id: newSkill.id,
        user_id: user.id,
        level_number: lvl.level_number || idx + 1,
        name: lvl.name || `Level ${idx + 1}`,
        display_order: idx + 1
      }));
    } else {
      levelsToInsert = [1, 2, 3, 4, 5].map(num => ({
        skill_id: newSkill.id,
        user_id: user.id,
        level_number: num,
        name: DEFAULT_LEVEL_NAMES[num] || `Level ${num}`,
        display_order: num
      }));
    }

    const { data: insertedLevels, error: levelsErr } = await supabase
      .from('skill_levels')
      .insert(levelsToInsert)
      .select();

    if (levelsErr) {
      console.error("Error inserting default skill levels:", levelsErr);
    }

    const finalLevels = (insertedLevels || []).map(l => ({
      id: l.id,
      skill_id: l.skill_id,
      level_number: l.level_number,
      name: l.name,
      display_order: l.display_order
    }));

    // 2. Insert topics (custom AI-generated or template)
    let roadmapTopics: any[] = [];
    if (customRoadmap && customRoadmap.length > 0) {
      const topicsToInsert = customRoadmap.map(topic => ({
        skill_id: newSkill.id,
        user_id: user.id,
        level: topic.level,
        topic: topic.topic,
        completed: false
      }));

      const { data: insertedTopics, error: topicsErr } = await supabase
        .from('skill_topics')
        .insert(topicsToInsert)
        .select();

      if (topicsErr) {
        console.error("Error inserting custom roadmap topics:", topicsErr);
      } else {
        roadmapTopics = (insertedTopics || []).map(t => ({
          id: t.id,
          level: t.level,
          topic: t.topic,
          completed: t.completed
        }));
      }
    } else if (templateType && templateType !== 'empty' && TEMPLATE_TOPICS[templateType]) {
      const topicsToInsert = TEMPLATE_TOPICS[templateType].map(topic => ({
        skill_id: newSkill.id,
        user_id: user.id,
        level: topic.level,
        topic: topic.topic,
        completed: false
      }));

      const { data: insertedTopics, error: topicsErr } = await supabase
        .from('skill_topics')
        .insert(topicsToInsert)
        .select();

      if (topicsErr) {
        console.error("Error inserting template topics:", topicsErr);
      } else {
        roadmapTopics = (insertedTopics || []).map(t => ({
          id: t.id,
          level: t.level,
          topic: t.topic,
          completed: t.completed
        }));
      }
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
        roadmap: roadmapTopics,
        levels: finalLevels.length > 0 ? finalLevels : levelsToInsert.map((l) => ({
          id: `temp-${newSkill.id}-${l.level_number}`,
          skill_id: newSkill.id,
          level_number: l.level_number,
          name: l.name,
          display_order: l.display_order
        }))
      }
    }));

    setToast({
      title: 'Skill Roadmap Initialized',
      message: `"${name}" configured with ${roadmapTopics.length} topics across ${finalLevels.length > 0 ? finalLevels.length : levelsToInsert.length} levels.`,
      type: 'success'
    });

    return slug;
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

  const editSkillName = async (slug: string, newName: string) => {
    if (!user || !skills[slug]) return;
    const skillUuid = skills[slug].id;
    const trimmed = newName.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from('skills')
      .update({ name: trimmed })
      .eq('id', skillUuid);

    if (error) throw error;

    setSkills(prev => {
      const skill = prev[slug];
      if (!skill) return prev;
      return {
        ...prev,
        [slug]: {
          ...skill,
          name: trimmed
        }
      };
    });

    setToast({
      title: 'Roadmap Renamed',
      message: `Roadmap name updated to "${trimmed}".`,
      type: 'success'
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

  const editRoadmapTopic = async (skillId: string, topicId: string, updatedName: string) => {
    if (!user || !skills[skillId]) return;

    const { error } = await supabase
      .from('skill_topics')
      .update({ topic: updatedName })
      .eq('id', topicId);

    if (error) throw error;

    setSkills(prev => {
      const skill = prev[skillId];
      return {
        ...prev,
        [skillId]: {
          ...skill,
          roadmap: skill.roadmap.map(t => t.id === topicId ? { ...t, topic: updatedName } : t)
        }
      };
    });

    setToast({
      title: 'Topic Updated',
      message: `Roadmap topic title updated.`,
      type: 'info'
    });
  };

  const addRoadmapLevel = async (skillId: string, name: string) => {
    if (!user || !skills[skillId]) return;
    const skillUuid = skills[skillId].id;

    // Find the next level number and display order
    const currentLevels = skills[skillId].levels;
    const nextLevelNum = currentLevels.length > 0 ? Math.max(...currentLevels.map(l => l.level_number)) + 1 : 1;
    const nextDisplayOrder = currentLevels.length > 0 ? Math.max(...currentLevels.map(l => l.display_order)) + 1 : 1;

    const { data: newLevel, error } = await supabase
      .from('skill_levels')
      .insert({
        skill_id: skillUuid,
        user_id: user.id,
        level_number: nextLevelNum,
        name,
        display_order: nextDisplayOrder
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
          levels: [...skill.levels, {
            id: newLevel.id,
            skill_id: skillUuid,
            level_number: nextLevelNum,
            name,
            display_order: nextDisplayOrder
          }]
        }
      };
    });

    setToast({
      title: 'Level Created',
      message: `"${name}" added as Level ${nextLevelNum}.`,
      type: 'success'
    });
  };

  const editRoadmapLevel = async (skillId: string, levelNum: number, updates: { name?: string; display_order?: number }) => {
    if (!user || !skills[skillId]) return;
    const skillUuid = skills[skillId].id;

    const updatesForDb: any = {};
    if (updates.name !== undefined) updatesForDb.name = updates.name;
    if (updates.display_order !== undefined) updatesForDb.display_order = updates.display_order;

    const { error } = await supabase
      .from('skill_levels')
      .update(updatesForDb)
      .eq('skill_id', skillUuid)
      .eq('level_number', levelNum);

    if (error) throw error;

    setSkills(prev => {
      const skill = prev[skillId];
      return {
        ...prev,
        [skillId]: {
          ...skill,
          levels: skill.levels.map(l => l.level_number === levelNum ? { ...l, ...updates } : l)
        }
      };
    });

    setToast({
      title: 'Level Updated',
      message: `Roadmap level updated.`,
      type: 'info'
    });
  };

  const deleteRoadmapLevel = async (skillId: string, levelNum: number) => {
    if (!user || !skills[skillId]) return;
    const skillUuid = skills[skillId].id;

    // Find all topics at this level
    const lvlTopics = skills[skillId].roadmap.filter(t => t.level === levelNum);
    const completedCount = lvlTopics.filter(t => t.completed).length;

    if (lvlTopics.length > 0) {
      const { error: topicsErr } = await supabase
        .from('skill_topics')
        .delete()
        .eq('skill_id', skillUuid)
        .eq('level', levelNum);

      if (topicsErr) throw topicsErr;
    }

    const { error: levelErr } = await supabase
      .from('skill_levels')
      .delete()
      .eq('skill_id', skillUuid)
      .eq('level_number', levelNum);

    if (levelErr) throw levelErr;

    // Deduct XP for completed topics in this level
    if (completedCount > 0) {
      const changeXp = -(completedCount * 100);
      const nextGlobalXp = Math.max(0, xp + changeXp);
      const nextGlobalLvl = Math.floor(nextGlobalXp / 1000) + 1;
      
      await supabase.from('profiles').update({ xp: nextGlobalXp, level: nextGlobalLvl }).eq('id', user.id);
      setXp(nextGlobalXp);
      setLevel(nextGlobalLvl);

      const nextSkillXp = Math.max(0, skills[skillId].xp + changeXp);
      const nextSkillLvl = Math.floor(nextSkillXp / 1000) + 1;
      await supabase.from('skills').update({ xp: nextSkillXp, level: nextSkillLvl }).eq('id', skillUuid);
    }

    setSkills(prev => {
      const skill = prev[skillId];
      const nextSkillXp = completedCount > 0 ? Math.max(0, skill.xp - (completedCount * 100)) : skill.xp;
      return {
        ...prev,
        [skillId]: {
          ...skill,
          xp: nextSkillXp,
          level: completedCount > 0 ? Math.floor(nextSkillXp / 1000) + 1 : skill.level,
          roadmap: skill.roadmap.filter(t => t.level !== levelNum),
          levels: skill.levels.filter(l => l.level_number !== levelNum)
        }
      };
    });

    setToast({
      title: 'Level Deleted',
      message: `Level ${levelNum} and all its topics removed.`,
      type: 'info'
    });
  };

  const reorderRoadmapLevels = async (skillId: string, reorderedLevels: SkillLevel[]) => {
    if (!user || !skills[skillId]) return;

    for (const lvl of reorderedLevels) {
      await supabase
        .from('skill_levels')
        .update({ display_order: lvl.display_order })
        .eq('id', lvl.id);
    }

    setSkills(prev => {
      const skill = prev[skillId];
      return {
        ...prev,
        [skillId]: {
          ...skill,
          levels: reorderedLevels
        }
      };
    });

    setToast({
      title: 'Roadmap Reordered',
      message: 'Levels order saved.',
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
      updateTaskChecklist,

      // Goals CRUD
      createGoal,
      editGoal,
      deleteGoal,
      archiveGoal,
      updateGoal,

      // Skills CRUD
      createSkill,
      deleteSkill,
      editSkillName,
      addRoadmapTopic,
      editRoadmapTopic,
      deleteRoadmapTopic,
      toggleRoadmapTopic,
      addRoadmapLevel,
      editRoadmapLevel,
      deleteRoadmapLevel,
      reorderRoadmapLevels,

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
