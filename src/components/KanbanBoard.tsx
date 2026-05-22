import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import GlossaryTooltip from './GlossaryTooltip';
import { 
  Plus, 
  Layers, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  DollarSign,
  Briefcase
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (id: string, nextStatus: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export default function KanbanBoard({ tasks, onMoveTask, onSelectTask, onAddTask }: KanbanBoardProps) {
  // Drag and drop dropzone highlighting state
  const [activeOverColumn, setActiveOverColumn] = useState<TaskStatus | null>(null);

  // Group columns
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  const backlogTasks = getTasksByStatus('backlog');
  const progressTasks = getTasksByStatus('in_progress');
  const completedTasks = getTasksByStatus('completed');

  // WIP Limit definition
  const WIP_LIMIT = 3;

  // HTML5 Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (activeOverColumn !== status) {
      setActiveOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setActiveOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveTask(taskId, targetStatus);
    }
    setActiveOverColumn(null);
  };

  // Helpers for priority colors
  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const renderTaskCard = (task: Task) => {
    // Check if task has active financial metrics
    const hasFinance = typeof task.initialInvestment === 'number';

    return (
      <div
        key={task.id}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => onSelectTask(task)}
        className="group relative bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-400 cursor-grab active:cursor-grabbing transition-all duration-200 flex flex-col space-y-3"
      >
        {/* Card Header Actions / Badges */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPriorityStyle(task.priority)} uppercase tracking-wider`}>
            {task.priority || 'Medium'}
          </span>
          
          {task.storyPoints !== undefined && task.storyPoints > 0 && (
            <span 
              className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-0.5"
              title="估算故事點數 (Story Points)"
            >
              <span>{task.storyPoints}</span>
              <span className="text-[8px] text-slate-400">SP</span>
            </span>
          )}
        </div>

        {/* Task Title */}
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800 text-xs leading-snug group-hover:text-indigo-600 transition-colors">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Financial metrics preview on card if active (Rich value and tooltip integration) */}
        {hasFinance && (
          <div className="bg-emerald-50/70 rounded-xl p-2 border border-emerald-100 flex items-center justify-between text-[10px] text-emerald-800">
            <span className="flex items-center gap-1 font-semibold">
              <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
              效益估算
            </span>
            <span className="font-mono text-emerald-700 text-[10px] font-bold">
              NPV &gt; 0 ✓
            </span>
          </div>
        )}

        {/* Card Footer Dates */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-slate-300" />
            <span className="font-mono text-[9px]">ID: {task.id.substring(0, 6)}</span>
          </span>
          <span className="font-mono text-[9px]">
            {new Date(task.updatedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
          </span>
        </div>

        {/* Hover Click Action Assist */}
        <span className="absolute bottom-2 right-2 p-1 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 border border-indigo-100">
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Column 1: Backlog */}
      <div 
        onDragOver={(e) => handleDragOver(e, 'backlog')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'backlog')}
        className={`bg-slate-50 rounded-2xl p-5 border transition-all duration-200 min-h-[460px] flex flex-col ${
          activeOverColumn === 'backlog' 
            ? 'border-indigo-500 bg-indigo-50/10 scale-[1.005]' 
            : 'border-slate-100'
        }`}
      >
        {/* Title and stats header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 block shadow-sm"></span>
            <div className="flex items-center gap-1 flex-wrap">
              <h3 className="font-extrabold text-slate-700 text-xs font-sans tracking-wide">
                待辦任務 (<GlossaryTooltip termKey="backlog">Backlog</GlossaryTooltip>)
              </h3>
            </div>
            <span className="bg-slate-200/80 text-slate-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full font-sans">
              {backlogTasks.length}
            </span>
          </div>
          
          <button
            onClick={() => onAddTask('backlog')}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="新增待辦任務"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Task Cards container */}
        <div className="flex-1 space-y-3 pb-4 overflow-y-auto max-h-[500px]">
          {backlogTasks.length > 0 ? (
            backlogTasks.map(renderTaskCard)
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">目前沒有待辦任務。</p>
              <button 
                onClick={() => onAddTask('backlog')}
                className="mt-2.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-center gap-1 mx-auto"
              >
                <Plus className="w-3.5 h-3.5" /> 立即建立
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: In Progress */}
      <div 
        onDragOver={(e) => handleDragOver(e, 'in_progress')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'in_progress')}
        className={`bg-slate-50 rounded-2xl p-5 border transition-all duration-200 min-h-[460px] flex flex-col ${
          activeOverColumn === 'in_progress' 
            ? 'border-indigo-500 bg-indigo-50/10 scale-[1.005]' 
            : 'border-slate-100'
        }`}
      >
        {/* Title and stats header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block shadow-sm animate-pulse"></span>
            <span className="flex items-center font-extrabold text-slate-700 text-xs font-sans tracking-wide">
              進行中 (In Progress)
            </span>
            <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {progressTasks.length}
            </span>
          </div>

          <button
            onClick={() => onAddTask('in_progress')}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="新增進行中任務"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* WIP Limit rule check warning */}
        {progressTasks.length > WIP_LIMIT && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[10px] text-amber-800 leading-normal">
              <strong>已超越 <GlossaryTooltip termKey="wip">WIP Limit 在製品限制</GlossaryTooltip> !</strong><br />
              進行中任務已超過限制量 {WIP_LIMIT} 件。為避免多工心智消耗降低交付速率，建議先合力完成現有任務。
            </div>
          </div>
        )}

        {/* Task Cards container */}
        <div className="flex-1 space-y-3 pb-4 overflow-y-auto max-h-[500px]">
          {progressTasks.length > 0 ? (
            progressTasks.map(renderTaskCard)
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">目前沒有進行中任務。</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Completed */}
      <div 
        onDragOver={(e) => handleDragOver(e, 'completed')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'completed')}
        className={`bg-slate-50 rounded-2xl p-5 border transition-all duration-200 min-h-[460px] flex flex-col ${
          activeOverColumn === 'completed' 
            ? 'border-indigo-500 bg-indigo-50/10 scale-[1.005]' 
            : 'border-slate-100'
        }`}
      >
        {/* Title and stats header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shadow-sm"></span>
            <span className="font-extrabold text-slate-700 text-xs font-sans tracking-wide">
              已完成 (Completed)
            </span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {completedTasks.length}
            </span>
          </div>

          <button
            onClick={() => onAddTask('completed')}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition"
            title="新增已完成任務"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Task Cards container */}
        <div className="flex-1 space-y-3 pb-4 overflow-y-auto max-h-[500px]">
          {completedTasks.length > 0 ? (
            completedTasks.map(renderTaskCard)
          ) : (
            <div className="border border-dashed border-slate-200 rounded-2xl py-12 px-4 text-center">
              <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">目前尚無已完成任務。</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
