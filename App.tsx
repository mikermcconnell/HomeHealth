
import React, { useState, useEffect, useCallback } from 'react';
import { UserState, HomeType, Asset, Task, AssetCategory, ImprovementProject } from './types';
import { DEFAULT_TASKS_CONDO, DEFAULT_TASKS_HOUSE, ASSET_TASK_MAP } from './constants';
import ScoreGauge from './components/ScoreGauge';
import AssetManager from './components/AssetManager';
import TaskScheduler from './components/TaskScheduler';
import CalendarView from './components/CalendarView';
import HomeImprovement from './components/HomeImprovement';
import { Home, Building, ShieldCheck, LayoutDashboard, Calendar as CalendarIcon, TrendingUp, MapPin, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [userState, setUserState] = useState<UserState>({
    isOnboarded: false,
    homeType: null,
    location: '',
    score: 100
  });

  const [locationInput, setLocationInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUserState(parsedUser);
        if (parsedUser.location) setLocationInput(parsedUser.location);
    }
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

  const distributeTasksFallback = (newTasks: Partial<Task>[], startIdIndex: number = 0): Task[] => {
    const now = new Date();
    let generalTaskDelayWeeks = 2; // Start general tasks 2 weeks out
    
    return newTasks.map((t, index) => {
      let dueDate = new Date();
      
      // 1. Safety First (Immediate)
      if (t.title?.toLowerCase().includes('smoke') || t.priority === 'HIGH' && !t.season) {
         dueDate.setDate(now.getDate() + 3); // Due in 3 days
      } 
      // 2. Seasonal Logic (Simple Fallback)
      else if (t.season) {
         const currentYear = now.getFullYear();
         let targetMonth = 0; // 0-11
         let targetDay = 15;

         if (t.season === 'Late Spring') targetMonth = 4; // May
         if (t.season === 'Late Fall') targetMonth = 9; // Oct

         dueDate = new Date(currentYear, targetMonth, targetDay);
         if (now.getTime() > dueDate.getTime() + (30 * 86400000)) {
            dueDate.setFullYear(currentYear + 1);
         }
      } 
      // 3. General Maintenance
      else {
         const weeksToAdd = generalTaskDelayWeeks + index;
         dueDate.setDate(now.getDate() + (weeksToAdd * 7));
         const day = dueDate.getDay(); 
         const daysUntilSaturday = (6 - day + 7) % 7;
         dueDate.setDate(dueDate.getDate() + daysUntilSaturday);
      }

      return {
        ...t,
        id: t.id || `task-${Date.now()}-${startIdIndex + index}`,
        status: 'PENDING',
        dueDate: dueDate.toISOString(),
        title: t.title || 'Untitled Task',
        description: t.description || '',
        priority: t.priority || 'MEDIUM'
      } as Task;
    });
  };

  const generateSmartSchedule = async (location: string, type: HomeType, rawTasks: Partial<Task>[]): Promise<Task[]> => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const now = new Date();
        
        const prompt = `
          I am a homeowner in ${location}. 
          It is currently ${now.toDateString()}. 
          I have a ${type === 'CONDO' ? 'Condo/Apartment' : 'Single Family House'}.
          
          Here is a list of standard maintenance tasks:
          ${JSON.stringify(rawTasks.map(t => ({ title: t.title, season: t.season, priority: t.priority })))}

          Please assign a specific 'dueDate' (ISO 8601 string) to each task based on my location's likely weather and seasons.
          
          Rules:
          1. Hazardous outdoor tasks (Roof, Gutters, Hose Bibs) MUST NOT be scheduled in winter months if my location (${location}) has snow/ice. Move them to late Spring.
          2. Spread out non-urgent indoor tasks so I don't have too many in one week. Start scheduling them 2 weeks from now.
          3. High priority safety tasks (Smoke Alarms) should be due very soon (within 1 week).
          4. "Late Fall" tasks should be scheduled before the first freeze in my location.
          
          Return a JSON array of objects. Each object must have:
          - "title": matches the input title
          - "dueDate": the calculated ISO date string
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        const scheduledItems: { title: string, dueDate: string }[] = JSON.parse(text);

        // Merge AI dates with full task objects
        return rawTasks.map((t, index) => {
            const aiItem = scheduledItems.find(i => i.title === t.title);
            let finalDate = aiItem?.dueDate;

            // Fallback if AI missed a date or returned invalid
            if (!finalDate || isNaN(new Date(finalDate).getTime())) {
                const fallback = distributeTasksFallback([t], index);
                finalDate = fallback[0].dueDate;
            }

            return {
                ...t,
                id: `task-${Date.now()}-${index}`,
                status: 'PENDING',
                dueDate: finalDate,
                title: t.title || 'Untitled',
                description: t.description || '',
                priority: t.priority || 'MEDIUM'
            } as Task;
        });

      } catch (error) {
          console.error("AI Scheduling Failed, using fallback", error);
          return distributeTasksFallback(rawTasks);
      }
  };

  const handleOnboarding = async (type: HomeType) => {
    if (!locationInput.trim()) {
        alert("Please enter your location so we can customize your schedule.");
        return;
    }

    setIsProcessing(true);
    
    // Add default improvements
    setImprovements([
        { id: 'imp-1', title: 'Install Smart Thermostat', description: 'Replace old dial with Ecobee/Nest for energy savings', estimatedCost: 200, category: 'SMART_HOME', priority: 'MEDIUM', status: 'PLANNED' },
        { id: 'imp-2', title: 'LED Lighting Upgrade', description: 'Replace all recessed bulbs with warm LEDs', estimatedCost: 100, category: 'ENERGY_SAVING', priority: 'MEDIUM', status: 'PLANNED' }
    ]);

    const rawTasks = type === 'CONDO' ? DEFAULT_TASKS_CONDO : DEFAULT_TASKS_HOUSE;
    
    // Use AI to schedule
    const processedTasks = await generateSmartSchedule(locationInput, type, rawTasks);

    setTasks(processedTasks);
    setUserState({
      isOnboarded: true,
      homeType: type,
      location: locationInput,
      score: 100
    });
    
    setIsProcessing(false);
  };

  const handleAddAsset = (asset: Asset) => {
    setAssets(prev => [...prev, asset]);
    
    const existingTasksForAsset = tasks.filter(t => t.assetId === asset.id);
    
    if (existingTasksForAsset.length === 0) {
      const rawTasks = (ASSET_TASK_MAP[asset.category] || []).map((t, idx) => ({
        ...t,
        assetId: asset.id
      }));
      
      // For single assets added later, we just use the fallback logic for speed
      // unless we wanted to call AI again, but that might be overkill for 1-2 tasks
      const processedTasks = distributeTasksFallback(rawTasks, tasks.length);
      
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
  
  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDeleteAllTasks = () => {
    setTasks([]);
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
          <div className="mb-6 flex justify-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <ShieldCheck size={48} className="text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to HomeHealth</h1>
          <p className="text-gray-500 mb-8">Let's build a personalized maintenance plan for your home.</p>
          
          <div className="mb-8 max-w-sm mx-auto">
              <label className="block text-left text-sm font-bold text-gray-700 mb-2 flex items-center">
                  <MapPin size={16} className="mr-1 text-primary" /> Where do you live?
              </label>
              <input 
                  type="text" 
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Barrie, Ontario"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  disabled={isProcessing}
              />
              <p className="text-xs text-gray-400 mt-2 text-left">We use this to adjust tasks for your local climate (e.g. snow, humidity).</p>
          </div>

          {isProcessing ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={48} className="text-primary animate-spin" />
                  <p className="text-gray-600 font-medium animate-pulse">
                      Analyzing local weather patterns for {locationInput}...
                  </p>
                  <p className="text-xs text-gray-400">Scheduling safe times for roof & gutter work.</p>
              </div>
          ) : (
            <>
                <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Select your home type</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                    onClick={() => handleOnboarding('CONDO')}
                    className="group p-6 border-2 border-gray-100 rounded-xl hover:border-primary hover:bg-emerald-50 transition flex flex-col items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!locationInput}
                    >
                    <Building size={48} className="text-gray-400 group-hover:text-primary mb-4 transition" />
                    <h3 className="text-xl font-bold text-gray-800">Condo / Apt</h3>
                    <p className="text-sm text-gray-400 mt-2">Internal systems only</p>
                    </button>
                    
                    <button 
                    onClick={() => handleOnboarding('HOUSE')}
                    className="group p-6 border-2 border-gray-100 rounded-xl hover:border-secondary hover:bg-sky-50 transition flex flex-col items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!locationInput}
                    >
                    <Home size={48} className="text-gray-400 group-hover:text-secondary mb-4 transition" />
                    <h3 className="text-xl font-bold text-gray-800">Single Family</h3>
                    <p className="text-sm text-gray-400 mt-2">Roof, gutters & yard</p>
                    </button>
                </div>
            </>
          )}
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

          <div className="text-sm text-gray-500 hidden sm:block flex flex-col items-end">
             <span>{userState.homeType === 'HOUSE' ? 'Single Family Home' : 'Condo/Apartment'}</span>
             <span className="text-xs text-gray-400 flex items-center"><MapPin size={10} className="mr-1" /> {userState.location}</span>
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
              <TaskScheduler 
                tasks={tasks} 
                onCompleteTask={handleCompleteTask} 
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onDeleteAllTasks={handleDeleteAllTasks}
              />
            </div>

            {/* Sidebar: Assets */}
            <div className="lg:col-span-1">
               <div className="sticky top-24">
                 <AssetManager 
                   assets={assets} 
                   onAddAsset={handleAddAsset} 
                   onAddTasks={handleAddTasks}
                   onDeleteAsset={handleDeleteAsset} 
                   userLocation={userState.location}
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
                userLocation={userState.location}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
