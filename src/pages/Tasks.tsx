import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, Circle, Trash2, Edit3, Calendar, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import type { Task } from '../types';

export const Tasks: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskStatus } = useApp();

  // Tab & Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete'>('incomplete');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  // Confirmation Delete Alert State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Categories list extracted from existing tasks
  const categories = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategory('General');
    setPriority('medium');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.due_date);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        title,
        description,
        category,
        priority,
        due_date: dueDate
      });
    } else {
      addTask({
        title,
        description,
        category,
        priority,
        due_date: dueDate,
        status: 'incomplete'
      });
    }

    setIsFormOpen(false);
  };

  const handleConfirmDelete = (id: string) => {
    deleteTask(id);
    setConfirmDeleteId(null);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' 
      ? true 
      : filterStatus === 'complete' 
        ? task.status === 'complete' 
        : task.status === 'incomplete';

    const priorityMatch = filterPriority === 'all'
      ? true
      : task.priority === filterPriority;

    const categoryMatch = filterCategory === 'all'
      ? true
      : task.category === filterCategory;

    return statusMatch && priorityMatch && categoryMatch;
  });

  // Sort: Incomplete first, then sort by Priority (high -> medium -> low), then due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'incomplete' ? -1 : 1;
    }
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const getPriorityColor = (p: 'low' | 'medium' | 'high') => {
    switch (p) {
      case 'high': return 'text-[#ff4769] bg-[#ff4769]/10 border-[#ff4769]/25';
      case 'medium': return 'text-[#f6d365] bg-[#f6d365]/10 border-[#f6d365]/25';
      default: return 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]/25';
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-2xl text-slate-100">Task Management</h2>
          <span className="text-xs text-slate-500">Plan milestones, roadmap items, and fitness checklists</span>
        </div>
        <button
          onClick={handleOpenCreate}
          className="py-2.5 px-5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 font-heading font-semibold text-xs rounded-xl flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all duration-300 hover:scale-[1.01] cursor-pointer"
        >
          <Plus size={16} />
          <span>Create Task</span>
        </button>
      </div>

      {/* Filters & Tabs Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/2 border border-white/5 p-4 rounded-2xl">
        {/* Status Filters */}
        <div className="flex bg-white/3 border border-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto shrink-0 scrollbar-none">
          {(['incomplete', 'complete', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`
                flex-1 lg:flex-none py-1.5 px-4 rounded-lg text-[11px] font-bold font-heading uppercase transition-all capitalize whitespace-nowrap cursor-pointer
                ${filterStatus === tab 
                  ? 'bg-[#00f2fe] text-slate-900 shadow-[0_0_10px_rgba(0,242,254,0.2)]' 
                  : 'text-slate-400 hover:text-white'
                }
              `}
            >
              {tab === 'incomplete' ? 'Pending' : tab === 'complete' ? 'Completed' : 'All Tasks'}
            </button>
          ))}
        </div>

        {/* Priority & Category Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white/3 border border-white/5 px-3 py-1.5 rounded-xl flex-grow sm:flex-grow-0">
            <span className="text-[10px] uppercase font-bold text-slate-500">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-transparent border-none text-xs text-slate-200 outline-none pr-4 cursor-pointer"
            >
              <option value="all" className="bg-[#060913]">All Priorities</option>
              <option value="high" className="bg-[#060913]">High</option>
              <option value="medium" className="bg-[#060913]">Medium</option>
              <option value="low" className="bg-[#060913]">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/3 border border-white/5 px-3 py-1.5 rounded-xl flex-grow sm:flex-grow-0">
            <span className="text-[10px] uppercase font-bold text-slate-500">Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 outline-none pr-4 cursor-pointer capitalize"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-[#060913] capitalize">
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid List */}
      {sortedTasks.length === 0 ? (
        <GlassCard className="py-16 text-center flex flex-col items-center justify-center border-dashed border-white/10">
          <AlertCircle size={48} className="text-slate-600 mb-4 stroke-1" />
          <h3 className="font-heading font-bold text-slate-300 text-lg">No tasks found</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm leading-relaxed">
            {filterStatus === 'incomplete' 
              ? "You're all caught up! Create a new task to outline study blocks or exercise roadmaps." 
              : "No tasks match your selected filter options."}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sortedTasks.map(task => {
              const isDone = task.status === 'complete';
              
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`relative ${isDone ? 'opacity-60' : ''}`}
                >
                  <GlassCard 
                    glowColor={task.priority === 'high' && !isDone ? 'accent' : 'none'}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      {/* Task Header Indicators */}
                      <div className="flex justify-between items-center mb-3.5">
                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 py-0.5 px-2 rounded-full capitalize">
                          {task.category}
                        </span>
                        
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Task Info */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`mt-0.5 shrink-0 transition-colors cursor-pointer ${isDone ? 'text-[#00b09b]' : 'text-slate-500 hover:text-white'}`}
                        >
                          {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>

                        <div className="flex-grow min-w-0">
                          <h3 
                            className={`font-heading font-bold text-sm text-slate-100 truncate ${isDone ? 'line-through text-slate-500' : ''}`}
                            title={task.title}
                          >
                            {task.title}
                          </h3>
                          <p 
                            className={`text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed ${isDone ? 'text-slate-600' : ''}`}
                          >
                            {task.description || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Task Footer */}
                    <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                        <Calendar size={12} />
                        <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                          title="Edit Task"
                        >
                          <Edit3 size={14} />
                        </button>
                        
                        {confirmDeleteId === task.id ? (
                          <div className="flex items-center gap-1 bg-red-950/40 border border-red-500/20 px-2 py-0.5 rounded-lg">
                            <span className="text-[8px] text-red-400 font-bold uppercase mr-1">Purge?</span>
                            <button
                              onClick={() => handleConfirmDelete(task.id)}
                              className="text-[9px] text-red-500 font-bold hover:underline"
                            >
                              Yes
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[9px] text-slate-400 font-bold hover:underline"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(task.id)}
                            className="p-1.5 text-slate-500 hover:text-[#ff4769] hover:bg-[#ff4769]/5 rounded-lg transition-all"
                            title="Delete Task"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Form Dialog Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#090e1a]/95 border border-white/10 rounded-2xl p-6 lg:p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)] z-10"
            >
              <h3 className="font-heading font-extrabold text-slate-100 text-lg mb-1">
                {editingTask ? 'Edit Task Details' : 'Configure New Task'}
              </h3>
              <p className="text-xs text-slate-500 mb-6">Outline targets, priority weightings, and deadlines.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Review Context API roadmap"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Add specific checklists or instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <input
                      type="text"
                      placeholder="E.g. Skills, Fitness, DBMS"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40"
                    >
                      <option value="low" className="bg-[#060913]">Low Priority</option>
                      <option value="medium" className="bg-[#060913]">Medium Priority</option>
                      <option value="high" className="bg-[#060913]">High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2.5 px-4 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40"
                  />
                </div>

                <div className="flex gap-3 justify-end mt-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="py-2.5 px-5 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl text-xs font-heading font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 rounded-xl text-xs font-heading font-semibold shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.01]"
                  >
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
