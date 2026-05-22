import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from './types';
import { isFirebaseConfigured, auth, db, loginWithGoogle, logoutUser, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { calculateNPV, calculateIRR } from './financialUtils';

// Subcomponents
import KanbanBoard from './components/KanbanBoard';
import TaskModal from './components/TaskModal';
import GlossarySheet from './components/GlossarySheet';
import GlossaryTooltip from './components/GlossaryTooltip';

// Icons
import { 
  Plus, 
  Database, 
  Sparkles, 
  LogIn, 
  LogOut,
  TrendingUp, 
  Activity, 
  CheckCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

// Default tasks for cold start / fallback
const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'task-1',
    title: '規劃第一期衝刺計畫與核心功能規格',
    description: '召開團隊 Sprint Planning 會議，建立 Product Backlog，並估算各個任務的故事點數與優先級。同時進行市場財務評估。',
    status: 'completed',
    priority: 'high',
    storyPoints: 5,
    createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    initialInvestment: 1500,
    cashFlows: [800, 1000, 1200],
    discountRate: 8,
  },
  {
    id: 'task-2',
    title: '實作使用者資訊安全登入驗證模組',
    description: '串接安全身份模組，限制最高管理權限，並預留 Firebase 雲端資料同步機制。測試在極端高負載下的登入回應速度。',
    status: 'in_progress',
    priority: 'high',
    storyPoints: 8,
    createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  },
  {
    id: 'task-3',
    title: '設計敏捷 Kanban 直觀拖曳操作體驗',
    description: '採用 HTML5 經典原生 Drag and Drop 設計，支援卡片自由排序。加入 WIP limit 機制，讓專案經理隨時掌握產能過載風險。',
    status: 'in_progress',
    priority: 'medium',
    storyPoints: 3,
    createdAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'task-4',
    title: '撰寫專案財務可行性研究 NPV/IRR 估算書',
    description: '研究新功能開發回報，建立內置的財務評估模組。輸入研發投資額、前三期流入現金以及折現率，並得出精確的淨現值與收益率。',
    status: 'backlog',
    priority: 'medium',
    storyPoints: 5,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    initialInvestment: 4000,
    cashFlows: [1500, 2000, 2500],
    discountRate: 10,
  },
  {
    id: 'task-5',
    title: '整合 Firebase 雲端備份並驗證資料寫入',
    description: '部署 firestore.rules 安全防護閘門，綁定 Google 帳戶並開通 real-time snapshot 即時監聽與狀態自動同步儲存機制。',
    status: 'backlog',
    priority: 'high',
    storyPoints: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Modal / Detail state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // View/Filter States matching Sleek design layout
  const [activeTab, setActiveTab] = useState<'kanban' | 'database' | 'financial'>('kanban');
  const [dbSearch, setDbSearch] = useState('');
  const [dbStatusFilter, setDbStatusFilter] = useState<'all' | TaskStatus>('all');
  const [dbPriorityFilter, setDbPriorityFilter] = useState<'all' | TaskPriority>('all');

  // Authenticate & Live DB Listener Setup
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    if (isFirebaseConfigured && auth) {
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(true);

        if (user) {
          // Listen to dynamic firestore updates
          const path = 'tasks';
          const q = query(collection(db, path), where('ownerId', '==', user.uid));
          
          unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            const fetched: Task[] = [];
            snapshot.forEach((doc) => {
              fetched.push({ id: doc.id, ...doc.data() } as Task);
            });
            
            // Sort by updated time
            fetched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setTasks(fetched.length > 0 ? fetched : INITIAL_DEMO_TASKS.map(t => ({ ...t, ownerId: user.uid })));
            setLoading(false);
            setErrorLog(null);
          }, (error) => {
            // Critical handle errors per skill guidelines
            setLoading(false);
            try {
              handleFirestoreError(error, OperationType.LIST, path);
            } catch (err: any) {
              setErrorLog(err.message);
            }
          });
        } else {
          // Logged out: fallback load from localStorage
          loadLocalTasks();
          setLoading(false);
        }
      });

      return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) unsubscribeFirestore();
      };
    } else {
      // Firebase not configured, fallback to standard localStorage
      loadLocalTasks();
      setLoading(false);
    }
  }, []);

  const loadLocalTasks = () => {
    try {
      const stored = localStorage.getItem('agile_kanban_tasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      } else {
        setTasks(INITIAL_DEMO_TASKS);
        localStorage.setItem('agile_kanban_tasks', JSON.stringify(INITIAL_DEMO_TASKS));
      }
    } catch (e) {
      console.error("Local storage decoding failure:", e);
      setTasks(INITIAL_DEMO_TASKS);
    }
  };

  const saveTasksState = async (newTasksList: Task[]) => {
    setTasks(newTasksList);

    // Save based on connection type
    if (currentUser && isFirebaseConfigured) {
      // Wait, we need to locate which items changed or need upserts/deletes.
      // For general reactivity, we can save any modified task directly inside operations. Let's do selective save.
    } else {
      localStorage.setItem('agile_kanban_tasks', JSON.stringify(newTasksList));
    }
  };

  // Create or Update task handler
  const handleSaveTask = async (taskToSave: Task) => {
    const isNew = !tasks.some(t => t.id === taskToSave.id);
    let updatedList: Task[];

    if (isNew) {
      updatedList = [taskToSave, ...tasks];
    } else {
      updatedList = tasks.map(t => t.id === taskToSave.id ? taskToSave : t);
    }

    setTasks(updatedList);
    setIsModalOpen(false);
    setSelectedTask(null);

    // Persist changes
    if (currentUser && isFirebaseConfigured) {
      const taskPath = 'tasks';
      try {
        const payload = {
          ...taskToSave,
          ownerId: currentUser.uid,
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, taskPath, taskToSave.id), payload);
        setErrorLog(null);
      } catch (err) {
        try {
          handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `${taskPath}/${taskToSave.id}`);
        } catch (wrappedErr: any) {
          setErrorLog(wrappedErr.message);
        }
      }
    } else {
      localStorage.setItem('agile_kanban_tasks', JSON.stringify(updatedList));
    }
  };

  // Delete task handler
  const handleDeleteTask = async (taskId: string) => {
    const updatedList = tasks.filter(t => t.id !== taskId);
    setTasks(updatedList);
    setIsModalOpen(false);
    setSelectedTask(null);

    if (currentUser && isFirebaseConfigured) {
      const taskPath = 'tasks';
      try {
        await deleteDoc(doc(db, taskPath, taskId));
        setErrorLog(null);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.DELETE, `${taskPath}/${taskId}`);
        } catch (wrappedErr: any) {
          setErrorLog(wrappedErr.message);
        }
      }
    } else {
      localStorage.setItem('agile_kanban_tasks', JSON.stringify(updatedList));
    }
  };

  // Quick drag and drop column move task
  const handleMoveTask = async (taskId: string, targetStatus: TaskStatus) => {
    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) return;

    const updatedTask = {
      ...taskToMove,
      status: targetStatus,
      updatedAt: new Date().toISOString()
    };

    const updatedList = tasks.map(t => t.id === taskId ? updatedTask : t);
    setTasks(updatedList);

    if (currentUser && isFirebaseConfigured) {
      const taskPath = 'tasks';
      try {
        await setDoc(doc(db, taskPath, taskId), {
          ...updatedTask,
          ownerId: currentUser.uid
        });
        setErrorLog(null);
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.UPDATE, `${taskPath}/${taskId}`);
        } catch (wrappedErr: any) {
          setErrorLog(wrappedErr.message);
        }
      }
    } else {
      localStorage.setItem('agile_kanban_tasks', JSON.stringify(updatedList));
    }
  };

  // Open modal config to add a brand new task
  const handleAddNewTask = (initialColumn: TaskStatus) => {
    const newTask: Task = {
      id: `task-${Math.random().toString(36).substring(2, 9)}`,
      title: '',
      description: '',
      status: initialColumn,
      priority: 'medium',
      storyPoints: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedTask(newTask);
    setIsModalOpen(true);
  };

  // Google Authentication Trigger
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      setErrorLog(null);
    } catch (e: any) {
      setErrorLog("Google Sign-In failed: " + e.message);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    loadLocalTasks();
  };

  // CALCULATING STATISTICS FOR BENTO STATS ROW
  const totalSP = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedSP = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  
  // Velocity = Sum of all completed steps estimation
  const teamVelocity = completedSP;

  // NPV Aggregation
  const activeFinancialTasks = tasks.filter(t => typeof t.initialInvestment === 'number');
  const totalNPV = activeFinancialTasks.reduce((sum, t) => {
    const npv = calculateNPV(t.initialInvestment || 0, t.cashFlows || [], t.discountRate || 8);
    return sum + npv;
  }, 0);

  // IRR Average calculation
  const weightedRates = activeFinancialTasks.map(t => calculateIRR(t.initialInvestment || 0, t.cashFlows || []));
  const validRates = weightedRates.filter((rate): rate is number => rate !== null && rate !== -100);
  const avgIRR = validRates.length > 0 ? (validRates.reduce((sum, r) => sum + r, 0) / validRates.length) : null;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/15 selection:text-blue-900">
      
      {/* Sidebar - Matching the Sleek Interface left aside */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 hidden md:flex text-slate-300 border-r border-slate-800">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-base">A</div>
          <span className="text-white font-semibold text-lg tracking-tight">AgileBoard Pro</span>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          <button 
            onClick={() => setActiveTab('kanban')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition ${
              activeTab === 'kanban' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-450 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
            Kanban Board
          </button>
          
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition ${
              activeTab === 'database' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-450 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Task Database
          </button>
          
          <button 
            onClick={() => setActiveTab('financial')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition ${
              activeTab === 'financial' 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-450 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
            </svg>
            Financial Metrics
          </button>
        </nav>

        {/* Bottom Workspace connection status matching mock exactly */}
        <div className="p-6 border-t border-slate-800 space-y-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-slate-400">
              <div className={`w-2 h-2 rounded-full ${isFirebaseConfigured ? 'bg-green-500' : 'bg-amber-400'}`}></div>
              {isFirebaseConfigured ? 'Firebase Connected' : 'Local Storage Mode'}
            </div>
            {currentUser && (
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-slate-500 text-[10px] font-mono">
                {currentUser.email}
              </div>
            )}
          </div>

          {isFirebaseConfigured && (
            currentUser ? (
              <button 
                onClick={handleSignOut}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold rounded-lg text-[11px] transition text-center"
              >
                Sign Out
              </button>
            ) : (
              <button 
                onClick={handleGoogleLogin}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] transition text-center shadow shadow-blue-600/10"
              >
                Google Auth Login
              </button>
            )
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Header - Matching Sleek layout perfectly */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-base md:text-lg font-bold text-slate-800">
              Alpha Development <span className="text-slate-400 font-normal">/ Q4</span>
            </h2>
            <div className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
              Active <span className="relative inline-block group cursor-help underline decoration-dotted">Sprint
                <span className="absolute top-full left-0 mt-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none normal-case tracking-normal font-normal">
                  Sprint: A set period of time during which specific work has to be completed and made ready for review.
                </span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Avatars */}
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium">JD</div>
              <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-medium text-blue-600">AL</div>
              <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-medium text-purple-600">TK</div>
            </div>
            
            <button 
              onClick={() => handleAddNewTask('backlog')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/15 transition cursor-pointer select-none"
            >
              + New Issue
            </button>
          </div>
        </header>

        {/* Dynamic Inner Layout Body */}
        <div className="flex-1 p-8 space-y-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* Firebase Error Alert block if any permission failure occurs */}
          {errorLog && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                <span>Firestore Security Lock Initiated</span>
              </div>
              <p className="font-mono text-[10px] bg-white/70 p-2 rounded-lg border border-rose-100 overflow-x-auto text-rose-700 leading-relaxed">
                {errorLog}
              </p>
              <p className="text-rose-600">
                Notice: This error indicates the security constraints in <code className="bg-rose-100 px-1 rounded font-semibold">firestore.rules</code> successfully defended and blocked an unauthenticated or invalid database operation.
              </p>
            </div>
          )}

          {/* Interactive view switching warning for mobile (which hides the wide Sidebar) */}
          <div className="flex md:hidden bg-slate-900 text-white p-2 rounded-xl flex-wrap justify-around gap-2 text-xs">
            <button onClick={() => setActiveTab('kanban')} className={`px-3 py-1.5 rounded-lg font-bold ${activeTab === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Kanban Board</button>
            <button onClick={() => setActiveTab('database')} className={`px-3 py-1.5 rounded-lg font-bold ${activeTab === 'database' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Task Database</button>
            <button onClick={() => setActiveTab('financial')} className={`px-3 py-1.5 rounded-lg font-bold ${activeTab === 'financial' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>Financial metrics</button>
          </div>

          {activeTab === 'kanban' && (
            <>
              {/* Bento Statistics Grid Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* SP Status Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      需求點數完成度
                    </span>
                    <span className="text-2xl font-extrabold text-slate-800 block mt-1 font-mono">
                      {completedSP} / {totalSP} <span className="text-xs text-slate-400 font-normal">SP</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${totalSP > 0 ? (completedSP / totalSP) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 block text-right font-medium">
                      已交付 {totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0}% 故事預估容量
                    </span>
                  </div>
                </div>

                {/* Team Velocity Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      當前團隊 Velocity
                    </span>
                    <span className="text-2xl font-extrabold text-blue-600 block mt-1 font-mono">
                      {teamVelocity} <span className="text-xs text-slate-400 font-normal">SP / Sprint</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    本周期團隊已達交付Story Points容量，代表了健康敏捷週期的產值回報。
                  </p>
                </div>

                {/* NPV Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      預期合算淨現值 (NPV)
                    </span>
                    <span className={`text-2xl font-extrabold block mt-1 font-mono ${totalNPV >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ${totalNPV.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    方案之未來現金流入折現減初始成本的加總。專案此處呈現極佳效益。
                  </p>
                </div>

                {/* IRR Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      內部加權收益率 (IRR)
                    </span>
                    <span className="text-2xl font-extrabold text-emerald-600 block mt-1 font-mono">
                      {avgIRR !== null ? `${avgIRR.toFixed(1)}%` : '---'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    啟動效益估算任務的平均收益回報，幫助專案管理排定高效率回報決定。
                  </p>
                </div>

              </div>

              {/* Kanban Column and Glossary Drawer layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch">
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Sprint 交付進度監控</h3>
                      <p className="text-xs text-slate-400 mt-1">拖曳卡片更新階段狀態，點擊卡片細緻管理參數細節</p>
                    </div>
                    <div className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200">
                      WIP LIMIT : 3
                    </div>
                  </div>

                  <KanbanBoard 
                    tasks={tasks}
                    onMoveTask={handleMoveTask}
                    onSelectTask={(task) => {
                      setSelectedTask(task);
                      setIsModalOpen(true);
                    }}
                    onAddTask={handleAddNewTask}
                  />
                </div>

                <div className="lg:col-span-1">
                  <GlossarySheet />
                </div>
              </div>
            </>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                  <input 
                    type="text" 
                    placeholder="搜尋任務名稱、摘要、描述等..." 
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    className="w-full px-4 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <select
                    value={dbStatusFilter}
                    onChange={(e) => setDbStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white"
                  >
                    <option value="all">所有階段狀態</option>
                    <option value="backlog">待辦模組 (Backlog)</option>
                    <option value="in_progress">進行開發 (In Progress)</option>
                    <option value="completed">封裝發行 (Completed)</option>
                  </select>

                  <select
                    value={dbPriorityFilter}
                    onChange={(e) => setDbPriorityFilter(e.target.value as any)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white"
                  >
                    <option value="all">所有優先級</option>
                    <option value="low">低優先級 (Low)</option>
                    <option value="medium">中優先級 (Medium)</option>
                    <option value="high">高優先級 (High)</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-250 bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="px-6 py-4">任務識別編號與工作內容</th>
                        <th className="px-6 py-4">當前狀態</th>
                        <th className="px-6 py-4">開發優先級</th>
                        <th className="px-6 py-4">預估 SP 點數</th>
                        <th className="px-6 py-4">上次更新時間</th>
                        <th className="px-6 py-4 text-right">系統控制</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tasks
                        .filter(t => {
                          const matchesSearch = t.title.toLowerCase().includes(dbSearch.toLowerCase()) || 
                            (t.description || '').toLowerCase().includes(dbSearch.toLowerCase());
                          const matchesStatus = dbStatusFilter === 'all' || t.status === dbStatusFilter;
                          const matchesPriority = dbPriorityFilter === 'all' || t.priority === dbPriorityFilter;
                          return matchesSearch && matchesStatus && matchesPriority;
                        })
                        .map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer text-xs" onClick={() => { setSelectedTask(t); setIsModalOpen(true); }}>
                                {t.title}
                              </div>
                              {t.description && (
                                <p className="text-slate-400 mt-1 line-clamp-1 max-w-xl text-[10px]">{t.description}</p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'completed' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : t.status === 'in_progress' 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}>
                                {t.status === 'completed' ? '已完成' : t.status === 'in_progress' ? '進行中' : '待辦'}
                              </span>
                            </td>
                            <td className="px-6 py-4 animate-pulse-slow">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                                t.priority === 'high' 
                                  ? 'bg-rose-50 text-rose-700 border-rose-100' 
                                  : t.priority === 'medium' 
                                    ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                              }`}>
                                {t.priority || 'medium'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-slate-600">
                              {t.storyPoints || 0} SP
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-400 text-[10px]">
                              {new Date(t.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => { setSelectedTask(t); setIsModalOpen(true); }}
                                className="text-blue-600 hover:text-blue-850 font-bold mr-4 select-none cursor-pointer"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-rose-500 hover:text-rose-700 font-bold select-none cursor-pointer"
                              >
                                刪除
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                      {tasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            暫時沒有對應設定條件的任務卡片。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-6 animate-in fade-in duration-200 animate-pulse-slow">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  專案效益與商業決策評估 (NPV / IRR Portfolio Study)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  本系統透過專利配比折現試算公式，當前折現率預設為 8% 或 10%，在單一任務詳情視窗啟用「財政功能與決策估算」並輸入初始投資、未來3期預期回報現金量。系統即自動推估淨現值與資本報酬比率，做為本期衝刺計畫中的核心排序參考。
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-250 bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="px-6 py-4">任務或功能模組 (Feature Issue)</th>
                        <th className="px-6 py-4">初始投資 (Initial Cost)</th>
                        <th className="px-6 py-4">預期各期現金回報 (3-Period Cash Flow)</th>
                        <th className="px-6 py-4">專案折現率 (Discount %)</th>
                        <th className="px-6 py-4">淨現值 (NPV)</th>
                        <th className="px-6 py-4">內部回報收益率 (IRR)</th>
                        <th className="px-6 py-4">評估決策等級</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tasks
                        .filter(t => typeof t.initialInvestment === 'number')
                        .map(t => {
                          const npv = calculateNPV(t.initialInvestment || 0, t.cashFlows || [], t.discountRate || 8);
                          const irr = calculateIRR(t.initialInvestment || 0, t.cashFlows || []);
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer text-xs" onClick={() => { setSelectedTask(t); setIsModalOpen(true); }}>
                                  {t.title}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-mono font-medium">
                                ${t.initialInvestment?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-500">
                                {t.cashFlows?.map(cf => `$${cf}`).join(', ')}
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold">
                                {t.discountRate}%
                              </td>
                              <td className="px-6 py-4">
                                <span className={`font-mono font-bold ${npv >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ${npv.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                                {irr !== null && irr !== -100 ? `${irr.toFixed(1)}%` : '---'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block leading-snug rounded-full ${
                                  npv > 0 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {npv > 0 ? '推薦開發 ✅' : '效益不著 ❌'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      }
                      {tasks.filter(t => typeof t.initialInvestment === 'number').length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                            無配置經濟回報參數的任務，請於看板中點擊任務並填寫投資預估額以便進行精確的資本試算。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer - Exactly matched the sleek interface template layout */}
        <footer className="h-12 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5 uppercase tracking-tight font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
              {tasks.filter(t => t.status !== 'completed').length} Open <span className="relative inline-block group cursor-help underline decoration-dotted">Issues
                <span className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none font-normal tracking-normal normal-case">
                  Issue: A discrete unit of work, a bug, or a task within a software project.
                </span>
              </span>
            </span>
            <span className="uppercase tracking-tight font-bold text-slate-700">
              {tasks.filter(t => t.status === 'completed').length} Completed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Auto-sync with <b>Firebase</b>: 2s ago</span>
          </div>
        </footer>
      </main>

      {/* Details Task editing dialog panel popup */}
      <TaskModal 
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={(id) => handleDeleteTask(id)}
      />

    </div>
  );
}
