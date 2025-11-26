
import React, { useState, useEffect, useCallback } from 'react';
import { UserState, HomeType, Asset, Task, AssetCategory, ImprovementProject } from './types';
import { DEFAULT_TASKS_CONDO, DEFAULT_TASKS_HOUSE, ASSET_TASK_MAP } from './constants';
import ScoreGauge from './components/ScoreGauge';
import AssetManager from './components/AssetManager';
import TaskScheduler from './components/TaskScheduler';
import CalendarView from './components/CalendarView';
import HomeImprovement from './components/HomeImprovement';
import { Home, Building, ShieldCheck, LayoutDashboard, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';

const App: React.FC = () => {
  const [userState, setUserState] = useState<UserState>({
    isOnboarded: false,
    homeType: null,
    score: 100
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [improvements, setImprovements] = useState<ImprovementProject[]>([]);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'improvements'>('dashboard');

  // Load state from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('hh_user');
    const savedAssets = localStorage.getItem('hh_assets');
    const savedTasks = localStorage.getItem('hh_tasks');
    const savedImprovements = localStorage.getItem('hh_improvements');

    if (savedUser) setUserState(JSON.parse(savedUser));
    if (savedAssets) setAssets(JSON.parse(savedAssets));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedImprovements) setImprovements(JSON.parse(savedImprovements));
  }, []);

  // Save state effects
  useEffect(() => {
    localStorage.setItem('hh_user', JSON.stringify(userState));
  }, [userState]);

  useEffect(() => {
    localStorage.setItem('hh_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('hh_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('hh_improvements', JSON.stringify(improvements));
  }, [improvements]);

  // Score Calculation Logic
  const { isOnboarded, homeType, score } = userState;

  const calculateScore = useCallback(() => {
    let newScore = 100;

    // Deduct for overdue tasks
    const overdueCount = tasks.filter(t => t.status === 'OVERDUE').length;
    newScore -= (overdueCount * 10);

    // Deduct for missing critical assets
    if (isOnboarded) {
        const hasSmokeAlarm = assets.some(a => a.category === AssetCategory.SMOKE_ALARM);
        if (!hasSmokeAlarm) newScore -= 10;
        
        if (homeType === 'HOUSE') {
           const hasHvac = assets.some(a => a.category === AssetCategory.HVAC);
           if (!hasHvac) newScore -= 5;
        }
    }

    return Math.max(0, newScore); // Floor at 0
  }, [tasks, assets, isOnboarded, homeType]);

  // Update score when dependencies change
  useEffect(() => {
    if (isOnboarded) {
      const newScore = calculateScore();
      setUserState(prev => {
        if (prev.score === newScore) {
          return prev;
        }
        return { ...prev, score: newScore };
      });
    }
  }, [calculateScore, isOnboarded]);

  // --- INTELLIGENT SCHEDULING LOGIC ---

  const distributeTasksOverTime = (newTasks: Partial<Task>[], startIdIndex: number = 0): Task[] => {
    const now = new Date();
    let generalTaskDelayWeeks = 2; // Start general tasks 2 weeks out
    
    return newTasks.map((t, index) => {
      let dueDate = new Date();
      
      // 1. Safety First (Immediate)
      if (t.title?.toLowerCase().includes('smoke') || t.priority === 'HIGH' && !t.season) {
         dueDate.setDate(now.getDate() + 3); // Due in 3 days
      } 
      // 2. Seasonal Logic (Align to next occurrence)
      else if (t.season) {
         const currentYear = now.getFullYear();
         let targetMonth = 0; // 0-11
         let targetDay = 15;

         if (t.season === 'Late Spring') targetMonth = 4; // May
         if (t.season === 'Late Fall') targetMonth = 9; // Oct

         // Set to this year
         dueDate = new Date(currentYear, targetMonth, targetDay);

         // If we've already passed this date significantly (e.g., it's Dec and task is Oct), push to next year
         // Allow a 30 day grace period where we might still want to do it this year
         if (now.getTime() > dueDate.getTime() + (30 * 86400000)) {
            dueDate.setFullYear(currentYear + 1);
         }
         // If we are currently IN the season (e.g., it's Oct 1st and task is Oct 15th), keep it close
      } 
      // 3. General Maintenance (Staggered "One-per-Weekend" Ramp Up)
      else {
         // Add weeks sequentially based on index to spread load
         const weeksToAdd = generalTaskDelayWeeks + index;
         dueDate.setDate(now.getDate() + (weeksToAdd * 7));
         
         // Ensure it lands on a Saturday (just for UX niceness)
         const day = dueDate.getDay(); 
         const daysUntilSaturday = (6 - day + 7) % 7;
         dueDate.setDate(dueDate.getDate() + daysUntilSaturday);
      }

      return {
        ...t,
        id: t.id || `task-${Date.now()}-${startIdIndex + index}`,
        status: 'PENDING',
        dueDate: dueDate.toISOString(),
        // Keep priority/description etc
        title: t.title || 'Untitled Task',
        description: t.description || '',
        priority: t.priority || 'MEDIUM'
      } as Task;
    });
  };

  const handleOnboarding = (type: HomeType) => {
    const rawTasks = type === 'CONDO' ? DEFAULT_TASKS_CONDO : DEFAULT_TASKS_HOUSE;
    const processedTasks = distributeTasksOverTime(rawTasks);

    setTasks(processedTasks);
    // Add some default improvements
    setImprovements([
        { id: 'imp-1', title: 'Install Smart Thermostat', description: 'Replace old dial with Ecobee/Nest for energy savings', estimatedCost: 200, category: 'SMART_HOME', priority: 'MEDIUM', status: 'PLANNED' },
        { id: 'imp-2', title: 'LED Lighting Upgrade', description: 'Replace all recessed bulbs with warm LEDs', estimatedCost: 100, category: 'ENERGY_SAVING', priority: 'MEDIUM', status: 'PLANNED' }
    ]);
    setUserState({
      isOnboarded: true,
      homeType: type,
      score: 100
    });
  };

  const handleAddAsset = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
    
    const existingTasksForAsset = tasks.filter(t => t.assetId === asset.id);
    
    if (existingTasksForAsset.length === 0) {
      const rawTasks = (ASSET_TASK_MAP[asset.category] || []).map((t, idx) => ({
        ...t,
        assetId: asset.id
      }));
      
      const processedTasks = distributeTasksOverTime(rawTasks, tasks.length);
      
      setTasks(prev => [...prev, ...processedTasks]);
    }
  };

  const handleAddTasks = (newTasks: Task[]) => {
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    setTasks(prev => prev.filter(t => t.assetId !== id)); 
  };

  const handleCompleteTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'COMPLETED' } : t));
  };
  
  // Improvement Handlers
  const handleAddProject = (project: ImprovementProject) => {
      setImprovements(prev => [...prev, project]);
  };
  
  const handleUpdateProject = (project: ImprovementProject) => {
      setImprovements(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const handleDeleteProject = (id: string) => {
      setImprovements(prev => prev.filter(p => p.id !== id));
  };

  // Onboarding View
  if (!userState.isOnboarded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center">
          <div className="mb-8 flex justify-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <ShieldCheck size={48} className="text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to HomeHealth</h1>
          <p className="text-gray-500 mb-10">Select your home type to generate a personalized, balanced maintenance plan.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => handleOnboarding('CONDO')}
              className="group p-6 border-2 border-gray-100 rounded-xl hover:border-primary hover:bg-emerald-50 transition flex flex-col items-center"
            >
              <Building size={48} className="text-gray-400 group-hover:text-primary mb-4 transition" />
              <h3 className="text-xl font-bold text-gray-800">Condo / Apt</h3>
              <p className="text-sm text-gray-400 mt-2">Internal systems only</p>
            </button>
            
            <button 
              onClick={() => handleOnboarding('HOUSE')}
              className="group p-6 border-2 border-gray-100 rounded-xl hover:border-secondary hover:bg-sky-50 transition flex flex-col items-center"
            >
              <Home size={48} className="text-gray-400 group-hover:text-secondary mb-4 transition" />
              <h3 className="text-xl font-bold text-gray-800">Single Family</h3>
              <p className="text-sm text-gray-400 mt-2">Roof, gutters & yard</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="text-primary" />
            <span className="font-bold text-xl text-gray-900 hidden sm:inline">HomeHealth</span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition ${currentView === 'dashboard' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutDashboard size={16} className="mr-2" />
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition ${currentView === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarIcon size={16} className="mr-2" />
              Calendar
            </button>
            <button 
              onClick={() => setCurrentView('improvements')}
              className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition ${currentView === 'improvements' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <TrendingUp size={16} className="mr-2" />
              Improvements
            </button>
          </div>

          <div className="text-sm text-gray-500 hidden sm:block">
            {userState.homeType === 'HOUSE' ? 'Single Family Home' : 'Condo/Apartment'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Score Section - Only show on Dashboard */}
        {currentView === 'dashboard' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
               <div className="md:col-span-1">
                 <ScoreGauge score={userState.score} />
               </div>
               <div className="md:col-span-2">
                 <h2 className="text-2xl font-bold text-gray-800 mb-2">
                   {userState.score >= 80 ? 'Excellent Condition!' : userState.score >= 50 ? 'Needs Attention' : 'Critical Maintenance Needed'}
                 </h2>
                 <p className="text-gray-600 mb-4">
                   {userState.score >= 80 
                     ? "Great job maintaining your home assets. Keep up with the schedule to stay in the green." 
                     : "You have overdue tasks or missing critical assets affecting your score. Resolve them to improve your home health."}
                 </p>
                 
                 {/* Quick Stats */}
                 <div className="flex space-x-6 text-sm">
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-900 text-lg">{tasks.filter(t => t.status === 'PENDING').length}</span>
                     <span className="text-gray-500">Upcoming</span>
                   </div>
                   <div className="flex flex-col">
                     <span className={`font-bold text-lg ${tasks.filter(t => t.status === 'OVERDUE').length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                       {tasks.filter(t => t.status === 'OVERDUE').length}
                     </span>
                     <span className="text-gray-500">Overdue</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-900 text-lg">{assets.length}</span>
                     <span className="text-gray-500">Assets</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-900 text-lg">{improvements.filter(p => p.status === 'PLANNED').length}</span>
                     <span className="text-gray-500">Projects</span>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* Content Switching */}
        {currentView === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* Main Content: Tasks */}
            <div className="lg:col-span-2 space-y-8">
              <TaskScheduler tasks={tasks} onCompleteTask={handleCompleteTask} />
            </div>

            {/* Sidebar: Assets */}
            <div className="lg:col-span-1">
               <div className="sticky top-24">
                 <AssetManager 
                   assets={assets} 
                   onAddAsset={handleAddAsset} 
                   onAddTasks={handleAddTasks}
                   onDeleteAsset={handleDeleteAsset} 
                 />
               </div>
            </div>
          </div>
        ) : currentView === 'calendar' ? (
          <div className="h-[800px] animate-in fade-in duration-300">
             <CalendarView tasks={tasks} />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <HomeImprovement 
                projects={improvements} 
                onAddProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
