-- =========================================================================
-- Tasks Feature Migration: Checklists, Recurring Tasks, and History
-- Safe to execute in the Supabase SQL Editor
-- =========================================================================

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Create an index to quickly filter recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON public.tasks(is_recurring);

