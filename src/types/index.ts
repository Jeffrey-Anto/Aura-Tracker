export interface Log {
  id: string;
  type: string;
  category: string;
  amount: number;
  unit: string;
  date: string;
  xp: number;
  notes: string;
}

export interface CustomActivity {
  id: string;
  name: string;
  category: string;
  unit: string;
  xpPerUnit: number;
}

export interface GoalTarget {
  studyHours: number;
  workoutMins: number;
  readingMins: number;
  leetcodeCount: number;
}

export interface Goals {
  daily: GoalTarget;
  weekly: GoalTarget;
  monthly: GoalTarget;
}

export interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  target_field: string; // 'studyHours' | 'workoutMins' | 'readingMins' | 'leetcodeCount' | 'custom'
  is_archived: boolean;
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  status: 'complete' | 'incomplete';
  created_at?: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  bio: string;
  joined_date: string;
  xp: number;
  level: number;
  theme: string;
}

export interface RoadmapTopic {
  id: string;
  level: number;
  topic: string;
  completed: boolean;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  level: number;
  xp: number;
  color: string;
  roadmap: RoadmapTopic[];
}

export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tier: 'primary' | 'secondary' | 'accent' | 'success' | 'gold';
  unlocked: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  targetSkill: string;
  completed: boolean;
  xpAward: number;
}

export interface StreakState {
  current: number;
  weekly: number;
  best: number;
}

export interface AppState {
  logs: Log[];
  customActivities: CustomActivity[];
  goals: Goals;
  skills: Record<string, Skill>;
  badges: Badge[];
  milestones: Milestone[];
  streaks: StreakState;
  xp: number;
  level: number;
}
