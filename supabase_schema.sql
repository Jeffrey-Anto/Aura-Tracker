-- =========================================================================
-- Aura Personal Analytics Operating System - Supabase Schema DDL
-- Execute this script in your Supabase SQL Editor to set up all tables.
-- =========================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    joined_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    theme TEXT DEFAULT 'dark' NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own profile" 
    ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Streaks Table
CREATE TABLE public.streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    current INTEGER DEFAULT 0 NOT NULL,
    weekly INTEGER DEFAULT 0 NOT NULL,
    best INTEGER DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Streaks
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own streak" 
    ON public.streaks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own streak" 
    ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- 3. Custom Activities Table (Registry)
CREATE TABLE public.custom_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    xp_per_unit INTEGER DEFAULT 50 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Custom Activities
ALTER TABLE public.custom_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own custom activities" 
    ON public.custom_activities FOR ALL USING (auth.uid() = user_id);

-- 4. Tasks Table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'incomplete' NOT NULL CHECK (status IN ('complete', 'incomplete')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own tasks" 
    ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- 5. Goals Table
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    current_value NUMERIC DEFAULT 0 NOT NULL,
    unit TEXT NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'custom')),
    target_field TEXT NOT NULL, -- e.g. 'studyHours', 'workoutMins', 'readingMins', 'leetcodeCount', 'custom'
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own goals" 
    ON public.goals FOR ALL USING (auth.uid() = user_id);

-- 6. Activities Table (Logs)
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- activity type: 'study', 'workout', 'reading', etc.
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT DEFAULT '',
    xp INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Activities (Logs)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own activity logs" 
    ON public.activities FOR ALL USING (auth.uid() = user_id);

-- 7. Skills Table
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    xp INTEGER DEFAULT 0 NOT NULL,
    color TEXT DEFAULT 'primary' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, slug),
    UNIQUE(user_id, name)
);

-- Enable RLS for Skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own skills" 
    ON public.skills FOR ALL USING (auth.uid() = user_id);

-- 8. Skill Topics Table (Roadmap Topics)
CREATE TABLE public.skill_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID REFERENCES public.skills ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    level INTEGER NOT NULL,
    topic TEXT NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Skill Topics
ALTER TABLE public.skill_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own skill topics" 
    ON public.skill_topics FOR ALL USING (auth.uid() = user_id);

-- 9. Achievements Table (Badges)
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    badge_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, badge_id)
);

-- Enable RLS for Achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own achievements" 
    ON public.achievements FOR ALL USING (auth.uid() = user_id);

-- 10. Milestones Table
CREATE TABLE public.milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    target_skill TEXT NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    xp_award INTEGER DEFAULT 250 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own milestones" 
    ON public.milestones FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- Performance Indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON public.skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_topics_skill_id ON public.skill_topics(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_topics_user_id ON public.skill_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON public.milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_activities_user_id ON public.custom_activities(user_id);

-- =========================================================================
-- Automatically Create Profile & Streaks rows for new users signup
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert profile entry
  INSERT INTO public.profiles (id, name, email, avatar_url, joined_date, xp, level, theme)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'https://api.dicebear.com/7.x/adventurer/svg?seed=' || COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    now(),
    0,
    1,
    'dark'
  );
  
  -- Insert streak entry
  INSERT INTO public.streaks (user_id, current, weekly, best, updated_at)
  VALUES (new.id, 0, 0, 0, now());

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger binding
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to allow users to delete their own account completely
-- Using security definer allows bypassing client restriction on auth.users row deletes
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
