import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3, 
  Calendar, 
  AlertCircle, 
  Repeat, 
  Flame, 
  Paperclip, 
  Sparkles, 
  Loader2, 
  CheckSquare, 
  Square, 
  ChevronUp, 
  ChevronDown, 
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/GlassCard';
import type { Task, TaskChecklistItem } from '../types';
import { generateChecklistFromDocument } from '../utils/gemini';
import { getLocalDateString } from '../utils/date';

export const Tasks: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, toggleTaskStatus, updateTaskChecklist } = useApp();

  // Tab & Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'incomplete' | 'complete' | 'recurring'>('incomplete');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState(getLocalDateString());
  const [isRecurring, setIsRecurring] = useState(false);
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [attachmentName, setAttachmentName] = useState<string>('');

  // AI Checklist Generation State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Manual checklist input & inline edit state
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');

  // Confirmation Delete Alert State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Expanded task checklist on card
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Categories list extracted from existing tasks
  const categories = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];

  // Calculate streak for recurring daily tasks
  const getRecurringStreak = (task: Task): number => {
    if (!task.is_recurring) return 0;
    const history = task.recurring_history || [];
    const historyMap = new Map(history.map(h => [h.date, h.completed]));
    const todayStr = getLocalDateString();
    
    let streak = 0;
    const checkDate = new Date();

    // If completed today or checked off, count today
    if (task.status === 'complete' || historyMap.get(todayStr)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Pending today: check if yesterday was completed to keep ongoing streak count
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Step backwards through previous consecutive days
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

  const handleOpenCreate = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategory('General');
    setPriority('medium');
    setDueDate(getLocalDateString());
    setIsRecurring(false);
    setChecklist([]);
    setAttachmentName('');
    setAiMessage(null);
    setNewChecklistText('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    setDueDate(task.due_date);
    setIsRecurring(!!task.is_recurring);
    setChecklist(task.checklist || []);
    setAttachmentName(task.attachment_name || '');
    setAiMessage(null);
    setNewChecklistText('');
    setIsFormOpen(true);
  };

  // Document attachment handler with Gemini AI checklist generation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentName(file.name);
    setIsAiLoading(true);
    setAiMessage(null);

    try {
      const res = await generateChecklistFromDocument(file);
      const startOrder = checklist.length;
      const newItems: TaskChecklistItem[] = res.items.map((itemTitle, idx) => ({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `item-${Date.now()}-${idx}`,
        title: itemTitle,
        completed: false,
        order: startOrder + idx
      }));

      setChecklist(prev => [...prev, ...newItems]);

      if (res.source === 'gemini') {
        setAiMessage({
          text: `Extracted ${newItems.length} actionable checklist items using Gemini AI!`,
          type: 'success'
        });
      } else {
        setAiMessage({
          text: res.warning || `Extracted ${newItems.length} items using local parser.`,
          type: 'warning'
        });
      }
    } catch (err: any) {
      setAiMessage({
        text: `Error processing file: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Checklist manipulation inside modal
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: TaskChecklistItem = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `item-${Date.now()}`,
      title: newChecklistText.trim(),
      completed: false,
      order: checklist.length
    };
    setChecklist(prev => [...prev, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklistModal = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleDeleteChecklistItemModal = (id: string) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleMoveChecklistItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= checklist.length) return;
    const nextList = [...checklist];
    const temp = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = temp;
    setChecklist(nextList.map((item, idx) => ({ ...item, order: idx })));
  };

  const handleSaveEditedChecklistItem = (id: string) => {
    if (!editingChecklistText.trim()) return;
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, title: editingChecklistText.trim() } : item));
    setEditingChecklistId(null);
    setEditingChecklistText('');
  };

  // Card checklist toggle
  const handleCardToggleChecklist = (task: Task, itemId: string) => {
    const updated = (task.checklist || []).map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTaskChecklist(task.id, updated);
  };

  // Card checklist delete
  const handleCardDeleteChecklistItem = (task: Task, itemId: string) => {
    const updated = (task.checklist || []).map(item => item).filter(item => item.id !== itemId);
    updateTaskChecklist(task.id, updated);
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
        due_date: dueDate,
        is_recurring: isRecurring,
        checklist,
        attachment_name: attachmentName || undefined
      });
    } else {
      addTask({
        title,
        description,
        category,
        priority,
        due_date: dueDate,
        status: 'incomplete',
        is_recurring: isRecurring,
        checklist,
        attachment_name: attachmentName || undefined,
        recurring_history: []
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
        : filterStatus === 'recurring'
          ? !!task.is_recurring
          : task.status === 'incomplete';

    const priorityMatch = filterPriority === 'all'
      ? true
      : task.priority === filterPriority;

    const categoryMatch = filterCategory === 'all'
      ? true
      : task.category === filterCategory;

    return statusMatch && priorityMatch && categoryMatch;
  });

  // Sort: Incomplete first, then Priority (high -> medium -> low), then due date
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
          <h2 className="font-heading font-extrabold text-2xl text-slate-100 flex items-center gap-2.5">
            <span>Task Management</span>
          </h2>
          <span className="text-xs text-slate-500">
            Smart milestones, document-extracted AI checklists, and daily recurring habits
          </span>
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
          {(['incomplete', 'recurring', 'complete', 'all'] as const).map(tab => (
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
              {tab === 'incomplete' ? 'Pending' : tab === 'recurring' ? 'Daily Habits' : tab === 'complete' ? 'Completed' : 'All Tasks'}
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
              ? "You're all caught up! Create a new task or attach a document to auto-generate checklists." 
              : filterStatus === 'recurring'
                ? "No daily recurring tasks configured yet. Create a task and toggle 'Repeats Daily' to track habits."
                : "No tasks match your selected filter options."}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sortedTasks.map(task => {
              const isDone = task.status === 'complete';
              const streak = getRecurringStreak(task);
              const checklistItems = task.checklist || [];
              const completedCount = checklistItems.filter(i => i.completed).length;
              const hasChecklist = checklistItems.length > 0;
              const checklistPct = hasChecklist ? Math.round((completedCount / checklistItems.length) * 100) : 0;
              const isExpanded = expandedTaskId === task.id;
              
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`relative ${isDone ? 'opacity-70' : ''}`}
                >
                  <GlassCard 
                    glowColor={task.priority === 'high' && !isDone ? 'accent' : task.is_recurring ? 'primary' : 'none'}
                    className="h-full flex flex-col justify-between"
                  >
                    <div>
                      {/* Task Header Indicators */}
                      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 bg-white/5 py-0.5 px-2 rounded-full capitalize">
                            {task.category}
                          </span>
                          {task.is_recurring && (
                            <span className="flex items-center gap-1 text-[9px] font-bold py-0.5 px-2 rounded-full bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30">
                              <Repeat size={10} />
                              <span>Daily Habit</span>
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {task.is_recurring && (
                            <span 
                              className="flex items-center gap-1 text-[9px] font-bold py-0.5 px-2 rounded-full bg-[#ff4769]/10 text-[#ff4769] border border-[#ff4769]/25" 
                              title={`${streak}-day consecutive completion streak`}
                            >
                              <Flame size={10} className="text-[#ff4769]" />
                              <span>{streak}d streak</span>
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      {/* Task Title & Toggle Info */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`mt-0.5 shrink-0 transition-colors cursor-pointer ${isDone ? 'text-[#00b09b]' : 'text-slate-500 hover:text-white'}`}
                          title={isDone ? 'Mark Incomplete' : 'Mark Complete'}
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

                          {/* Attachment Indicator */}
                          {task.attachment_name && (
                            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 bg-white/3 py-1 px-2 rounded-lg border border-white/5 w-fit max-w-full">
                              <Paperclip size={11} className="text-[#00f2fe] shrink-0" />
                              <span className="truncate">{task.attachment_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Checklist Section inside Card */}
                      {hasChecklist && (
                        <div className="mt-3.5 pt-3 border-t border-white/5">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                              className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium cursor-pointer"
                            >
                              <CheckSquare size={13} className="text-[#00f2fe]" />
                              <span>Sub-tasks ({completedCount}/{checklistItems.length})</span>
                              <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {checklistPct}%
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                            <div 
                              className="h-full bg-gradient-to-r from-[#00f2fe] to-[#00b09b] transition-all duration-300"
                              style={{ width: `${checklistPct}%` }}
                            />
                          </div>

                          {/* Expandable Checklist Items List */}
                          {isExpanded && (
                            <div className="flex flex-col gap-1 mt-2.5 bg-black/25 p-2 rounded-xl border border-white/5 max-h-52 overflow-y-auto scrollbar-thin">
                              {checklistItems.map(item => (
                                <div 
                                  key={item.id} 
                                  className="flex items-center justify-between gap-2 group py-1 px-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => handleCardToggleChecklist(task, item.id)}
                                      className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                                    >
                                      {item.completed ? (
                                        <CheckSquare size={13} className="text-[#00b09b]" />
                                      ) : (
                                        <Square size={13} />
                                      )}
                                    </button>
                                    <span className={`text-[11px] truncate ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                      {item.title}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCardDeleteChecklistItem(task, item.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-[#ff4769] transition-opacity p-0.5 cursor-pointer shrink-0"
                                    title="Delete sub-task"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Task Footer */}
                    <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                        <Calendar size={12} />
                        <span>
                          {task.is_recurring ? 'Daily Habit' : new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(task)}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                          title="Edit Task & Checklist"
                        >
                          <Edit3 size={14} />
                        </button>
                        
                        {confirmDeleteId === task.id ? (
                          <div className="flex items-center gap-1 bg-red-950/40 border border-red-500/20 px-2 py-0.5 rounded-lg">
                            <span className="text-[8px] text-red-400 font-bold uppercase mr-1">Purge?</span>
                            <button
                              onClick={() => handleConfirmDelete(task.id)}
                              className="text-[9px] text-red-500 font-bold hover:underline cursor-pointer"
                            >
                              Yes
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[9px] text-slate-400 font-bold hover:underline cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(task.id)}
                            className="p-1.5 text-slate-500 hover:text-[#ff4769] hover:bg-[#ff4769]/5 rounded-lg transition-all cursor-pointer"
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
              className="relative w-full max-w-xl bg-[#090e1a]/95 border border-white/10 rounded-2xl p-6 lg:p-7 shadow-[0_0_40px_rgba(0,0,0,0.7)] z-10 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-heading font-extrabold text-slate-100 text-lg mb-0.5">
                    {editingTask ? 'Edit Task Details' : 'Configure New Task'}
                  </h3>
                  <p className="text-xs text-slate-500">Outline targets, priority weightings, attachments, and recurring habits.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Daily DSA Practice & Roadmap Review"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Add specific instructions, goals or reminders..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600 resize-none"
                  />
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <input
                      type="text"
                      placeholder="E.g. Skills, Fitness, DBMS"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40"
                    >
                      <option value="low" className="bg-[#060913]">Low Priority</option>
                      <option value="medium" className="bg-[#060913]">Medium Priority</option>
                      <option value="high" className="bg-[#060913]">High Priority</option>
                    </select>
                  </div>
                </div>

                {/* Due Date & Recurring Toggle Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isRecurring ? 'First Schedule Date' : 'Due Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40"
                    />
                  </div>

                  {/* Repeats Daily Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/8 mt-auto h-[42px]">
                    <div className="flex items-center gap-1.5">
                      <Repeat size={14} className={isRecurring ? 'text-[#00f2fe]' : 'text-slate-500'} />
                      <span className="text-xs font-heading font-semibold text-slate-200">Repeats Daily</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isRecurring} 
                        onChange={(e) => setIsRecurring(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#00f2fe]"></div>
                    </label>
                  </div>
                </div>

                {/* Document / PDF Attachment for AI Checklist */}
                <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/2 border border-white/8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#f6d365]" />
                      <span className="text-xs font-heading font-bold text-slate-200">AI Checklist from Document / PDF</span>
                    </div>
                    {attachmentName && (
                      <span className="text-[10px] text-slate-400 bg-white/5 py-0.5 px-2 rounded-full truncate max-w-[170px]" title={attachmentName}>
                        {attachmentName}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Attach a syllabus, specification, or document (.pdf, .txt, .md). Gemini AI will parse the content and generate an actionable checklist.
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer transition-all">
                      <Paperclip size={13} className="text-[#00f2fe]" />
                      <span>{attachmentName ? 'Change File' : 'Attach PDF / Document'}</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,.json,.csv,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isAiLoading}
                      />
                    </label>

                    {isAiLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-[#00f2fe] bg-[#00f2fe]/10 px-3 py-2 rounded-xl border border-[#00f2fe]/20">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Analyzing with AI...</span>
                      </div>
                    )}
                  </div>

                  {aiMessage && (
                    <div className={`p-2 rounded-lg text-[11px] mt-1 flex items-start gap-1.5 ${
                      aiMessage.type === 'success' 
                        ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                        : aiMessage.type === 'warning' 
                          ? 'bg-amber-950/40 border border-amber-500/20 text-amber-400' 
                          : 'bg-red-950/40 border border-red-500/20 text-red-400'
                    }`}>
                      <span className="shrink-0">•</span>
                      <span className="leading-snug">{aiMessage.text}</span>
                    </div>
                  )}
                </div>

                {/* Interactive Checklist Manager */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare size={12} className="text-[#00f2fe]" />
                      <span>Sub-Task Checklist ({checklist.length})</span>
                    </label>
                    {checklist.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setChecklist([])}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Checklist items list */}
                  {checklist.length > 0 ? (
                    <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                      {checklist.map((item, idx) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleChecklistModal(item.id)}
                              className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
                            >
                              {item.completed ? (
                                <CheckSquare size={14} className="text-[#00b09b]" />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                            
                            {editingChecklistId === item.id ? (
                              <input
                                type="text"
                                value={editingChecklistText}
                                onChange={(e) => setEditingChecklistText(e.target.value)}
                                onBlur={() => handleSaveEditedChecklistItem(item.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEditedChecklistItem(item.id)}
                                autoFocus
                                className="bg-white/5 border border-white/15 rounded px-2 py-0.5 text-xs text-white outline-none w-full"
                              />
                            ) : (
                              <span 
                                onClick={() => {
                                  setEditingChecklistId(item.id);
                                  setEditingChecklistText(item.title);
                                }}
                                className={`text-xs truncate cursor-pointer hover:text-[#00f2fe] ${item.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}
                                title="Click to edit text"
                              >
                                {item.title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveChecklistItem(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveChecklistItem(idx, 'down')}
                              disabled={idx === checklist.length - 1}
                              className="p-1 text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteChecklistItemModal(item.id)}
                              className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                              title="Delete sub-task"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 bg-white/1 border border-white/5 rounded-xl text-slate-500 text-[11px]">
                      No checklist items yet. Attach a file above or add items manually below.
                    </div>
                  )}

                  {/* Add manual sub-task item */}
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Add sub-task or checklist step..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                      className="flex-1 bg-white/3 border border-white/8 rounded-xl py-2 px-3 text-slate-100 text-xs outline-none focus:border-[#00f2fe]/40 placeholder-slate-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="py-2 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Add Step
                    </button>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 justify-end mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="py-2.5 px-5 bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl text-xs font-heading font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-slate-900 rounded-xl text-xs font-heading font-semibold shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:scale-[1.01] cursor-pointer"
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
