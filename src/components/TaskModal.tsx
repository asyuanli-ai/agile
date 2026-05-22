import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { calculateNPV, calculateIRR } from '../financialUtils';
import GlossaryTooltip from './GlossaryTooltip';
import { X, Trash2, TrendingUp, DollarSign, BarChart2 } from 'lucide-react';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskModal({ task, isOpen, onClose, onSave, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [storyPoints, setStoryPoints] = useState<number>(3);
  
  // Financial fields
  const [enableFinance, setEnableFinance] = useState(false);
  const [initialInvestment, setInitialInvestment] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(8);
  const [cf1, setCf1] = useState<number>(0);
  const [cf2, setCf2] = useState<number>(0);
  const [cf3, setCf3] = useState<number>(0);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'backlog');
      setPriority(task.priority || 'medium');
      setStoryPoints(task.storyPoints || 0);

      const hasFinance = typeof task.initialInvestment === 'number';
      setEnableFinance(hasFinance);
      if (hasFinance) {
        setInitialInvestment(task.initialInvestment || 0);
        setDiscountRate(task.discountRate || 8);
        setCf1(task.cashFlows?.[0] || 0);
        setCf2(task.cashFlows?.[1] || 0);
        setCf3(task.cashFlows?.[2] || 0);
      } else {
        setInitialInvestment(1000);
        setDiscountRate(8);
        setCf1(400);
        setCf2(500);
        setCf3(600);
      }
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    if (!title.trim()) return;

    const updatedTask: Task = {
      ...task,
      title,
      description,
      status,
      priority,
      storyPoints,
      updatedAt: new Date().toISOString(),
    };

    if (enableFinance) {
      updatedTask.initialInvestment = initialInvestment;
      updatedTask.discountRate = discountRate;
      updatedTask.cashFlows = [cf1, cf2, cf3];
    } else {
      delete updatedTask.initialInvestment;
      delete updatedTask.discountRate;
      delete updatedTask.cashFlows;
    }

    onSave(updatedTask);
  };

  // Live Calculations
  const liveNPV = enableFinance ? calculateNPV(initialInvestment, [cf1, cf2, cf3], discountRate) : 0;
  const liveIRR = enableFinance ? calculateIRR(initialInvestment, [cf1, cf2, cf3]) : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            編輯 <GlossaryTooltip termKey="issue">Issue</GlossaryTooltip> 內容
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              任務主題 *
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="請輸入議題主旨（如：重構資料庫結構）"
              className="w-full px-4 py-2 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              詳細規格描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="列出驗收條件或實作方法..."
              className="w-full px-4 py-2 text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Row 1: Status, Priority, Story Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                看板階段 (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring"
              >
                <option value="backlog">待辦 (Backlog)</option>
                <option value="in_progress">進行中 (In Progress)</option>
                <option value="completed">完成 (Completed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                優先級 (Priority)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring"
              >
                <option value="low">低 (Low)</option>
                <option value="medium">中 (Medium)</option>
                <option value="high">高 (High)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                估算值 (<GlossaryTooltip termKey="storypoints">Story Points</GlossaryTooltip>)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={storyPoints}
                onChange={(e) => setStoryPoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring"
              />
            </div>
          </div>

          {/* NPV / IRR Corporate Financial Calculator */}
          <div className="border border-slate-100 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                啟用專案財政分析效益評估
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableFinance}
                  onChange={(e) => setEnableFinance(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></span>
              </label>
            </div>

            {enableFinance ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                <p className="text-xs text-slate-500">
                  此工具協助您計算專案或需求的商業價值。計算出的 
                  <GlossaryTooltip termKey="npv">NPV</GlossaryTooltip> 與 
                  <GlossaryTooltip termKey="irr">IRR</GlossaryTooltip> 資訊將會彙整到全局專案效益看板。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      初始投資 (Initial Cost)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="number"
                        min={0}
                        value={initialInvestment}
                        onChange={(e) => setInitialInvestment(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      折現率 (Discount Rate %)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountRate}
                      onChange={(e) => setDiscountRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                      預期現金收益流 (P1 - P3)
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="期數一"
                        value={cf1}
                        onChange={(e) => setCf1(parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-center text-xs focus:outline-none focus:ring"
                        title="第一期預期現金流入"
                      />
                      <input
                        type="number"
                        placeholder="期數二"
                        value={cf2}
                        onChange={(e) => setCf2(parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-center text-xs focus:outline-none focus:ring"
                        title="第二期預期現金流入"
                      />
                      <input
                        type="number"
                        placeholder="期數三"
                        value={cf3}
                        onChange={(e) => setCf3(parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-center text-xs focus:outline-none focus:ring"
                        title="第三期預期現金流入"
                      />
                    </div>
                  </div>
                </div>

                {/* Direct Live Calculations */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                  <div className="text-center border-r border-slate-100">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      計算淨現值 (NPV)
                    </span>
                    <span className={`text-sm font-bold block mt-0.5 ${liveNPV >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${liveNPV.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {liveNPV >= 0 ? '✅ 獲利大於零，建議投資' : '❌ 虧損，需重估'}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      計算內部報酬率 (IRR)
                    </span>
                    <span className="text-sm font-bold block mt-0.5 text-blue-600">
                      {liveIRR !== null && liveIRR !== -100 ? (
                        `${liveIRR.toFixed(1)}%`
                      ) : (
                        <span className="text-slate-400 text-xs">無法計算 / 負收益</span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {liveIRR !== null && liveIRR > discountRate ? (
                        <span className="text-emerald-500 font-semibold">高於折現率</span>
                      ) : (
                        <span>低於最低回報門檻</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                關閉狀態。若有需要，可以開啟此功能來輸入初期資本以及前三期的產品現金流，以估算財務投報率。
              </p>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition font-medium text-xs"
          >
            <Trash2 className="w-4 h-4" />
            刪除卡片
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-semibold select-none transition"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold select-none shadow shadow-blue-500/15 transition"
            >
              確定儲存變更
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
