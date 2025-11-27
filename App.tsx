
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, HomeType, Asset, Task, AssetCategory, ImprovementProject, TaskCategory } from './types';
import { DEFAULT_TASKS_CONDO, DEFAULT_TASKS_HOUSE, ASSET_TASK_MAP, POPULAR_CITIES, PHIL_AVATAR_URL } from './constants';
import ScoreGauge from './components/ScoreGauge';
import AssetManager from './components/AssetManager';
import TaskScheduler from './components/TaskScheduler';
import CalendarView from './components/CalendarView';
import HomeImprovement from './components/HomeImprovement';
import { Home, Building, ShieldCheck, LayoutDashboard, Calendar as CalendarIcon, TrendingUp, MapPin, Loader2, Bell, X, Check, AlertCircle, Clock, Search, Menu, User, ChevronRight, DollarSign, Wallet, Info, HelpCircle, Settings, Download, Upload, LogOut, FileText, Lock, Sparkles, BrainCircuit, Activity, CheckCircle, HardHat } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AnalysisReport {
  summary: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  risks: string[];
  financialInsight: string;
  recommendations: { title: string; description: string }[];
}

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
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'improvements' | 'settings'>('dashboard');

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Privacy Policy Modal State
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // AI Analysis State
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);

  // Load state from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('hh_user');
    const savedAssets = localStorage.getItem('hh_assets');
    const savedTasks = localStorage.getItem('hh_tasks');
    const savedImprovements = localStorage.getItem('hh_improvements');

    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUserState(parsedUser);
        if (parsedUser.location) {
            setLocationInput(parsedUser.location);
        }
    }
    if (savedAssets) setAssets(JSON.parse(savedAssets));
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedImprovements) setImprovements(JSON.parse(savedImprovements));

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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

  // Check for tasks due today and send browser notification
  useEffect(() => {
    if (notificationPermission === 'granted' && tasks.length > 0) {
       const today = new Date();
       const dueToday = tasks.filter(t => {
           if (t.status !== 'PENDING') return false;
           const d = new Date(t.dueDate);
           return d.getDate() === today.getDate() && 
                  d.getMonth() === today.getMonth() && 
                  d.getFullYear() === today.getFullYear();
       });

       if (dueToday.length > 0) {
           const hasNotified = sessionStorage.getItem(`hh_notified_${today.toDateString()}`);
           if (!hasNotified) {
               try {
                 new Notification("HomeHealth Tasks Due", {
                     body: `You have ${dueToday.length} task(s) due today, including: ${dueToday[0].title}`,
                     icon: '/favicon.ico'
                 });
                 sessionStorage.setItem(`hh_notified_${today.toDateString()}`, 'true');
               } catch (e) {
                 console.error("Notification failed", e);
               }
           }
       }
    }
  }, [tasks, notificationPermission]);

  // Score Calculation Logic
  const { isOnboarded, homeType, score } = userState;

  // Memoized Score Breakdown for Display
  const getScoreBreakdown = useCallback(() => {
      let currentScore = 100;
      const deductions: { reason: string, points: number }[] = [];

      // Overdue
      const overdueCount = tasks.filter(t => t.status === 'OVERDUE').length;
      if (overdueCount > 0) {
        const points = overdueCount * 10;
        deductions.push({ reason: `${overdueCount} Overdue Task${overdueCount > 1 ? 's' : ''}`, points });
        currentScore -= points;
      }

      // Missing Assets
      if (isOnboarded) {
          const hasSmokeAlarm = assets.some(a => a.category === AssetCategory.SMOKE_ALARM);
          if (!hasSmokeAlarm) {
            deductions.push({ reason: 'No Smoke Alarm Tracked', points: 10 });
            currentScore -= 10;
          }
          
          if (homeType === 'HOUSE') {
             const hasHvac = assets.some(a => a.category === AssetCategory.HVAC);
             if (!hasHvac) {
                deductions.push({ reason: 'No HVAC System Tracked', points: 5 });
                currentScore -= 5;
             }
          }
      }
      return { score: Math.max(0, currentScore), deductions };
  }, [tasks, assets, isOnboarded, homeType]);

  // Update score state when logic changes
  useEffect(() => {
    if (isOnboarded) {
      const { score: newScore } = getScoreBreakdown();
      setUserState(prev => {
        if (prev.score === newScore) return prev;
        return { ...prev, score: newScore };
      });
    }
  }, [getScoreBreakdown, isOnboarded]);

  const scoreData = getScoreBreakdown();

  // --- Financial Calculations ---
  const calculateFinancials = () => {
      const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.purchasePrice || 0), 0);
      
      const ytdMaintenance = tasks.reduce((sum, task) => {
          if (task.status === 'COMPLETED' && task.actualCost && task.completedDate) {
              const date = new Date(task.completedDate);
              if (date.getFullYear() === new Date().getFullYear()) {
                  return sum + task.actualCost;
              }
          }
          return sum;
      }, 0);

      const baseAnnualBudget = homeType === 'CONDO' ? 2400 : 6000; 
      
      return { totalAssetValue, ytdMaintenance, baseAnnualBudget };
  };

  const { totalAssetValue, ytdMaintenance, baseAnnualBudget } = calculateFinancials();
  const budgetUsedPercent = Math.min(100, Math.round((ytdMaintenance / baseAnnualBudget) * 100));

  // --- Notification Logic ---
  const getUrgentTasks = useCallback(() => {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      return tasks.filter(t => {
          if (t.status === 'COMPLETED') return false;
          if (t.status === 'OVERDUE') return true;
          const d = new Date(t.dueDate);
          return d <= nextWeek;
      }).sort((a, b) => {
          if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
          if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks]);

  const urgentTasks = getUrgentTasks();

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
          new Notification("Reminders Enabled", {
              body: "We'll let you know when tasks are due!",
          });
      }
    } catch (error) {
      console.error("Error requesting permission", error);
    }
  };

  // --- AI Analysis Logic ---
  const handleRunAnalysis = async () => {
    setShowAnalysisModal(true);
    setIsAnalyzing(true);
    setAnalysisReport(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
        Act as 'Phil', a friendly, experienced, and encouraging personal home handyman. You are analyzing the user's home data to give advice.
        
        Tone: Friendly, practical, reassuring. Use "I" statements (e.g., "I noticed...", "I recommend...").

        Home Data:
        Location: ${userState.location}
        Home Type: ${userState.homeType}
        Current Health Score: ${scoreData.score}/100
        Assets: ${assets.map(a => a.name).join(', ') || 'None'}
        Overdue Tasks: ${tasks.filter(t => t.status === 'OVERDUE').map(t => t.title).join(', ') || 'None'}
        Upcoming Tasks (Next 30 days): ${tasks.filter(t => {
            const d = new Date(t.dueDate);
            const now = new Date();
            const diff = d.getTime() - now.getTime();
            return diff > 0 && diff < (30 * 86400000);
        }).map(t => t.title).join(', ') || 'None'}
        Total Asset Value: $${totalAssetValue}

        Return a JSON object with this exact structure (no markdown formatting, just JSON):
        {
          "summary": "2-3 sentence executive summary of the home's condition in Phil's voice.",
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "risks": ["Risk 1", "Risk 2"],
          "financialInsight": "Comment on asset value vs maintenance frequency.",
          "recommendations": [
            { "title": "Action Title", "description": "Action Description" }
          ]
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (text) {
            setAnalysisReport(JSON.parse(text));
        }
    } catch (error) {
        console.error("Analysis failed", error);
        setAnalysisReport({
            summary: "Sorry folks, I'm having a little trouble reading your file right now. Give me a moment and try again later.",
            riskLevel: "LOW",
            risks: [],
            financialInsight: "N/A",
            recommendations: []
        });
    } finally {
        setIsAnalyzing(false);
    }
  };


  // --- Data Management (Export/Import) ---
  const handleExportData = () => {
      const data = {
          version: 1,
          timestamp: new Date().toISOString(),
          user: userState,
          assets,
          tasks,
          improvements
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homehealth_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.version && json.user) {
                  if (confirm("This will overwrite your current data. Are you sure?")) {
                      setUserState(json.user);
                      setAssets(json.assets || []);
                      setTasks(json.tasks || []);
                      setImprovements(json.improvements || []);
                      alert("Data imported successfully!");
                  }
              } else {
                  alert("Invalid backup file format.");
              }
          } catch (err) {
              alert("Error parsing backup file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = ''; 
  };
  
  const handleResetData = () => {
      if (confirm("DANGER: This will wipe all application data and reset the app to the welcome screen. This action cannot be undone.")) {
          localStorage.clear();
          window.location.reload();
      }
  };


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
        priority: t.priority || 'MEDIUM',
        category: t.category || 'GENERAL'
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
          ALSO assign a 'category' to each task.
          Valid categories: 'SAFETY', 'EXTERIOR', 'INTERIOR', 'SYSTEMS', 'APPLIANCE', 'PLUMBING', 'OUTDOOR', 'GENERAL'.
          
          Rules:
          1. Hazardous outdoor tasks (Roof, Gutters, Hose Bibs) MUST NOT be scheduled in winter months if my location (${location}) has snow/ice. Move them to late Spring.
          2. Spread out non-urgent indoor tasks so I don't have too many in one week. Start scheduling them 2 weeks from now.
          3. High priority safety tasks (Smoke Alarms) should be due very soon (within 1 week).
          4. "Late Fall" tasks should be scheduled before the first freeze in my location.
          
          Return a JSON array of objects. Each object must have:
          - "title": matches the input title
          - "dueDate": the calculated ISO date string
          - "category": the chosen category
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        const scheduledItems: { title: string, dueDate: string, category: string }[] = JSON.parse(text);

        // Merge AI dates with full task objects
        return rawTasks.map((t, index) => {
            const aiItem = scheduledItems.find(i => i.title === t.title);
            let finalDate = aiItem?.dueDate;
            let finalCategory = aiItem?.category || t.category || 'GENERAL';

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
                priority: t.priority || 'MEDIUM',
                category: finalCategory
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

  const handleCompleteTask = (id: string, cost?: number) => {
    setTasks(prev => {
      // Find the task being completed
      const taskIndex = prev.findIndex(t => t.id === id);
      if (taskIndex === -1) return prev;

      const currentTask = prev[taskIndex];
      const completedTask: Task = { 
          ...currentTask, 
          status: 'COMPLETED', 
          actualCost: cost, 
          completedDate: new Date().toISOString() 
      };
      
      const newTaskList = [...prev];
      newTaskList[taskIndex] = completedTask;

      // Logic for Recurring Tasks
      if (currentTask.recurring) {
          const oldDueDate = new Date(currentTask.dueDate);
          const nextDueDate = new Date(oldDueDate);
          
          let monthsToAdd = 12; // Default annual
          
          const titleLower = currentTask.title.toLowerCase();
          if (titleLower.includes('filter')) {
              monthsToAdd = 3;
          } else if (titleLower.includes('smoke alarm')) {
              monthsToAdd = 6;
          } else if (titleLower.includes('gutters') || titleLower.includes('hvac')) {
              monthsToAdd = 6; // Bi-annual usually
          } else if (currentTask.season) {
              monthsToAdd = 12; // Annual seasonal task
          }

          nextDueDate.setMonth(nextDueDate.getMonth() + monthsToAdd);

          if (nextDueDate < new Date()) {
             const today = new Date();
             nextDueDate.setFullYear(today.getFullYear());
             if (nextDueDate < today) {
                 nextDueDate.setFullYear(today.getFullYear() + 1);
             }
          }

          const newTask: Task = {
              ...currentTask,
              id: `task-recurring-${Date.now()}`,
              status: 'PENDING',
              dueDate: nextDueDate.toISOString(),
              actualCost: undefined,
              completedDate: undefined,
              category: currentTask.category // Preserve category
          };
          
          newTaskList.push(newTask);
      }

      return newTaskList;
    });
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <ShieldCheck size={48} className="text-emerald-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to HomeHealth</h1>
          <p className="text-slate-500 mb-8">Enterprise-grade maintenance management for your home.</p>
          
          <div className="mb-8 max-w-sm mx-auto">
              <label className="block text-left text-sm font-bold text-slate-700 mb-2 flex items-center">
                  <MapPin size={16} className="mr-1 text-emerald-600" /> Where do you live?
              </label>

              <div className="relative">
                  <input 
                      type="text"
                      list="city-suggestions"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Start typing your city..."
                      className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition bg-slate-50 placeholder:text-slate-400"
                      disabled={isProcessing}
                      autoFocus
                  />
                  <datalist id="city-suggestions">
                    {POPULAR_CITIES.map(city => (
                        <option key={city} value={city} />
                    ))}
                  </datalist>
              </div>

              <p className="text-xs text-slate-400 mt-2 text-left">We use this to adjust tasks for your local climate.</p>
          </div>

          {isProcessing ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-4">
                  <Loader2 size={48} className="text-emerald-600 animate-spin" />
                  <p className="text-slate-600 font-medium animate-pulse">
                      Analyzing local weather patterns for {locationInput}...
                  </p>
              </div>
          ) : (
            <>
                <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Select Property Type</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                    onClick={() => handleOnboarding('CONDO')}
                    className="group p-6 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition flex flex-col items-center disabled:opacity-50"
                    disabled={!locationInput}
                    >
                    <Building size={48} className="text-slate-300 group-hover:text-emerald-600 mb-4 transition" />
                    <h3 className="text-lg font-bold text-slate-800">Condo / Apt</h3>
                    <p className="text-xs text-slate-500 mt-2">Internal systems only</p>
                    </button>
                    
                    <button 
                    onClick={() => handleOnboarding('HOUSE')}
                    className="group p-6 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center disabled:opacity-50"
                    disabled={!locationInput}
                    >
                    <Home size={48} className="text-slate-300 group-hover:text-blue-600 mb-4 transition" />
                    <h3 className="text-lg font-bold text-slate-800">Single Family</h3>
                    <p className="text-xs text-slate-500 mt-2">Full property management</p>
                    </button>
                </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Enterprise Layout
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 pb-16 md:pb-0">
      
      {/* 1. Sidebar Navigation (Desktop Only - hidden on small screens) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0 transition-all duration-300">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <ShieldCheck className="text-emerald-500 mr-2" size={24} />
            <span className="font-bold text-lg text-white tracking-tight">HomeHealth</span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <button 
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'dashboard' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
            >
                <LayoutDashboard size={18} className="mr-3" />
                Dashboard
            </button>
            <button 
                onClick={() => setCurrentView('calendar')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'calendar' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
            >
                <CalendarIcon size={18} className="mr-3" />
                Calendar
            </button>
            <button 
                onClick={() => setCurrentView('improvements')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === 'improvements' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`}
            >
                <TrendingUp size={18} className="mr-3" />
                Improvements
            </button>
            <div className="pt-4 mt-4 border-t border-slate-800">
                <button 
                    onClick={() => setCurrentView('settings')}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        currentView === 'settings' 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                        : 'hover:bg-slate-800 hover:text-white text-slate-400'
                    }`}
                >
                    <Settings size={18} className="mr-3" />
                    Data & Settings
                </button>
            </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800 rounded-lg p-3 flex items-center space-x-3">
                <div className="w-8 h-8 rounded bg-emerald-900/50 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                    {userState.homeType === 'HOUSE' ? 'H' : 'C'}
                </div>
                <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">My Property</p>
                    <p className="text--[10px] text-slate-400 truncate">{userState.location}</p>
                </div>
            </div>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shadow-sm flex-shrink-0">
           <div className="flex items-center text-slate-400 text-sm">
                <div className="md:hidden mr-2">
                    <ShieldCheck className="text-emerald-500" size={24} />
                </div>
                <span className="hidden md:inline hover:text-slate-600 cursor-pointer">Home</span>
                <ChevronRight size={14} className="mx-2 hidden md:inline" />
                <span className="font-semibold text-slate-800 capitalize">{currentView}</span>
           </div>

           <div className="flex items-center space-x-4 md:space-x-6">
                <div className="relative group hidden md:block">
                    <Search size={18} className="text-slate-400 group-hover:text-slate-600 transition" />
                </div>
                
                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-400 hover:text-slate-600 transition rounded-full hover:bg-slate-100"
                    >
                        <Bell size={20} />
                        {urgentTasks.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Notifications</h3>
                                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            </div>
                            
                            <div className="max-h-80 overflow-y-auto">
                                {urgentTasks.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <Check size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">All clear</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {urgentTasks.map(task => (
                                            <div key={task.id} className="p-3 hover:bg-slate-50 transition flex items-start group">
                                                <div className={`mt-0.5 mr-3 flex-shrink-0 ${task.status === 'OVERDUE' ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {task.status === 'OVERDUE' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${task.status === 'OVERDUE' ? 'text-red-700' : 'text-slate-700'}`}>
                                                        {task.title}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => handleCompleteTask(task.id)}
                                                    className="text-slate-300 hover:text-emerald-600 p-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {notificationPermission === 'default' && (
                                <button 
                                    onClick={requestNotificationPermission}
                                    className="w-full text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 border-t border-indigo-100 transition"
                                >
                                    Enable Desktop Alerts
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* User Avatar */}
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-300 transition">
                    <User size={16} />
                </div>
           </div>
        </header>

        {/* 3. Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                
                {/* View Title */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {currentView === 'dashboard' && 'Overview'}
                        {currentView === 'calendar' && 'Schedule'}
                        {currentView === 'improvements' && 'Capital Projects'}
                        {currentView === 'settings' && 'Data & Settings'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {currentView === 'settings' ? 'Manage your data backup and application preferences.' : 'Welcome back. Here is what\'s happening with your property today.'}
                    </p>
                </div>

                {/* Settings / Data View */}
                {currentView === 'settings' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Export Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4">
                                    <Download size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Export Data</h3>
                                    <p className="text-sm text-slate-500">Create a JSON backup of your home data</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                Save your asset details, maintenance history, and schedule to your computer. Use this file to restore your data on another device or browser.
                            </p>
                            <button 
                                onClick={handleExportData}
                                className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition shadow-sm"
                            >
                                Download Backup
                            </button>
                        </div>

                        {/* Import Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center mb-4">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mr-4">
                                    <Upload size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Import Data</h3>
                                    <p className="text-sm text-slate-500">Restore from a backup file</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                Restore your home history from a previously exported JSON file. <strong className="text-red-500">Warning: This will overwrite current data.</strong>
                            </p>
                            <label className="w-full flex justify-center py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition text-slate-600 hover:text-emerald-700 font-medium text-sm">
                                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                                Select Backup File
                            </label>
                        </div>

                        {/* Play Store Compliance - Privacy Policy */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center mb-4">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg mr-4">
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Legal & Privacy</h3>
                                    <p className="text-sm text-slate-500">Application compliance</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                Review how we handle your data locally on your device.
                            </p>
                            <button 
                                onClick={() => setShowPrivacyPolicy(true)}
                                className="text-emerald-600 font-bold text-sm hover:underline flex items-center"
                            >
                                <FileText size={14} className="mr-1" /> View Privacy Policy
                            </button>
                        </div>

                         {/* Danger Zone */}
                        <div className="col-span-full mt-4">
                            <div className="bg-red-50 rounded-xl border border-red-100 p-6 flex flex-col sm:flex-row items-center justify-between">
                                <div className="mb-4 sm:mb-0">
                                    <h3 className="font-bold text-red-800 flex items-center"><AlertCircle size={20} className="mr-2"/> Reset Application</h3>
                                    <p className="text-sm text-red-600 mt-1">Permanently delete all data and return to welcome screen.</p>
                                </div>
                                <button 
                                    onClick={handleResetData}
                                    className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-100 transition shadow-sm"
                                >
                                    Reset Everything
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard Widgets */}
                {currentView === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Score Widget */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Current Status</div>
                                    <h3 className="text-lg font-bold text-slate-900">Home Health Score</h3>
                                    <div className="group relative inline-block">
                                        <p className="text-slate-500 text-xs mt-1 border-b border-dashed border-slate-300 inline-block cursor-help">
                                            Real-time maintenance index
                                        </p>
                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-10">
                                            Starts at 100%. Points deducted for overdue tasks and missing critical safety assets.
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <ShieldCheck className="text-slate-400" size={20} />
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-6 mb-6">
                                <div className="w-32 h-32">
                                     <ScoreGauge score={scoreData.score} />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <div className="text-2xl font-bold text-slate-900">{scoreData.score}%</div>
                                        <div className="text-xs text-slate-500">Overall Rating</div>
                                    </div>
                                    <div className="h-px bg-slate-100 w-full"></div>
                                    
                                    {/* Score Breakdown Section */}
                                    <div className="space-y-1">
                                        {scoreData.deductions.length === 0 ? (
                                            <div className="flex items-center text-xs text-emerald-600 font-medium">
                                                <Check size={12} className="mr-1" /> Perfect Score
                                            </div>
                                        ) : (
                                            scoreData.deductions.map((deduction, idx) => (
                                                <div key={idx} className="flex items-center text-xs text-red-500">
                                                    <span className="font-bold mr-1">-{deduction.points}</span>
                                                    <span className="truncate">{deduction.reason}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Next Audit</span>
                                    <span className="font-medium text-slate-900">Nov 2025</span>
                                </div>
                            </div>
                        </div>

                        {/* Financial Health Widget */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Financial Health</div>
                                    <h3 className="text-lg font-bold text-slate-900">Asset Value</h3>
                                    <p className="text-slate-500 text-xs mt-1">Inventory & Maintenance Spend</p>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <Wallet className="text-slate-400" size={20} />
                                </div>
                            </div>
                            
                            <div className="space-y-6 mb-2">
                                <div>
                                    <div className="text-3xl font-bold text-slate-900">${totalAssetValue.toLocaleString()}</div>
                                    <div className="text-xs text-slate-500">Total Tracked Asset Inventory</div>
                                </div>
                                
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center">
                                            <span className="text-xs font-semibold text-slate-600 mr-1">YTD Maintenance Cost</span>
                                            <div className="group relative">
                                                <HelpCircle size={10} className="text-slate-400 cursor-help" />
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-56 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-10">
                                                    Estimated annual budget for {userState.homeType === 'CONDO' ? 'Condos' : 'Houses'} is ~${baseAnnualBudget.toLocaleString()}. 
                                                    This includes routine maintenance and minor repairs.
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900">${ytdMaintenance.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                        <div 
                                            className={`h-1.5 rounded-full transition-all duration-500 ${budgetUsedPercent > 100 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${Math.max(2, budgetUsedPercent)}%` }} 
                                        ></div>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-slate-400">{budgetUsedPercent}% of est. annual budget used</span>
                                        <span className="text-[10px] text-slate-400">Target: ${baseAnnualBudget.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Last Expense</span>
                                    <span className="font-medium text-slate-900">Today</span>
                                </div>
                            </div>
                        </div>

                        {/* PHIL THE HANDYMAN Widget */}
                        <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-slate-200 p-0 overflow-hidden flex flex-col relative group">
                             {/* Header Background */}
                             <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                             
                             {/* Avatar */}
                             <div className="absolute top-12 left-6">
                                 <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200">
                                     <img src={PHIL_AVATAR_URL} alt="Phil" className="w-full h-full object-cover" />
                                 </div>
                                 <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                             </div>

                             <div className="pt-10 px-6 pb-6 flex-1 flex flex-col">
                                 <div className="flex justify-between items-start">
                                     <div>
                                         <h3 className="text-lg font-bold text-slate-900">Phil the Handyman</h3>
                                         <p className="text-xs text-slate-500 font-medium">Personal Home Expert</p>
                                     </div>
                                     <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold uppercase tracking-wide border border-blue-100">
                                         Online
                                     </span>
                                 </div>

                                 {/* Speech Bubble */}
                                 <div className="mt-4 bg-slate-50 p-4 rounded-xl rounded-tl-none border border-slate-100 relative">
                                    <p className="text-slate-700 text-sm italic leading-relaxed">
                                        "Hey there! I've been reviewing your property in <span className="font-semibold">{userState.location}</span>. 
                                        {tasks.some(t => t.season === 'Late Fall' && t.status === 'PENDING') 
                                            ? " Looks like we've got some fall prep to do before it gets too cold." 
                                            : " Things are looking pretty solid right now!"}
                                    </p>
                                 </div>

                                 <div className="mt-auto pt-4">
                                     <button 
                                         onClick={handleRunAnalysis}
                                         className="w-full bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center group-hover:shadow-md"
                                     >
                                         <HardHat size={18} className="mr-2 text-yellow-400" /> Ask Phil for Inspection
                                     </button>
                                 </div>
                             </div>
                        </div>

                        {/* Main Task List */}
                        <div className="lg:col-span-2 space-y-8">
                           <TaskScheduler 
                                tasks={tasks} 
                                onCompleteTask={handleCompleteTask} 
                                onUpdateTask={handleUpdateTask}
                                onDeleteTask={handleDeleteTask}
                                onDeleteAllTasks={handleDeleteAllTasks}
                            />
                        </div>

                        {/* Sidebar Assets */}
                        <div className="lg:col-span-1">
                            <AssetManager 
                                assets={assets}
                                tasks={tasks} 
                                onAddAsset={handleAddAsset} 
                                onAddTasks={handleAddTasks}
                                onDeleteAsset={handleDeleteAsset} 
                                userLocation={userState.location}
                            />
                        </div>
                    </div>
                )}

                {currentView === 'calendar' && (
                    <div className="h-[calc(100vh-200px)]">
                        <CalendarView tasks={tasks} />
                    </div>
                )}

                {currentView === 'improvements' && (
                    <HomeImprovement 
                        projects={improvements} 
                        onAddProject={handleAddProject}
                        onUpdateProject={handleUpdateProject}
                        onDeleteProject={handleDeleteProject}
                        userLocation={userState.location}
                    />
                )}
            </div>
        </main>
      </div>

      {/* 4. Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around py-3 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center ${currentView === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
            <LayoutDashboard size={20} />
            <span className="text-[10px] mt-1 font-medium">Home</span>
        </button>
        <button 
            onClick={() => setCurrentView('calendar')}
            className={`flex flex-col items-center ${currentView === 'calendar' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
            <CalendarIcon size={20} />
            <span className="text-[10px] mt-1 font-medium">Schedule</span>
        </button>
        <button 
            onClick={() => setCurrentView('improvements')}
            className={`flex flex-col items-center ${currentView === 'improvements' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
            <TrendingUp size={20} />
            <span className="text-[10px] mt-1 font-medium">Projects</span>
        </button>
        <button 
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center ${currentView === 'settings' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
            <Settings size={20} />
            <span className="text-[10px] mt-1 font-medium">Settings</span>
        </button>
      </nav>

      {/* 5. Privacy Policy Modal */}
      {showPrivacyPolicy && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">Privacy Policy</h3>
                      <button onClick={() => setShowPrivacyPolicy(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto text-sm text-slate-600 leading-relaxed space-y-4">
                      <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
                      <p>This application ("HomeHealth") is designed to help you manage home maintenance. We value your privacy and are committed to protecting your personal data.</p>
                      
                      <h4 className="font-bold text-slate-800">1. Data Collection</h4>
                      <p>This application stores data <strong>locally on your device</strong> using LocalStorage. We do not transmit your task lists, asset details, or improvement plans to any external server for storage.</p>
                      
                      <h4 className="font-bold text-slate-800">2. AI Features</h4>
                      <p>To provide features like "AI Brainstorm" and "Scan Nameplate", images and text prompts are sent to Google Gemini API. This data is used solely to generate the immediate response and is not stored by us.</p>
                      
                      <h4 className="font-bold text-slate-800">3. Camera Usage</h4>
                      <p>We require camera access only to allow you to scan appliance nameplates or attach photos to your assets. These images are processed locally or sent temporarily to the AI provider for analysis.</p>

                      <h4 className="font-bold text-slate-800">4. Contact</h4>
                      <p>For questions regarding this policy, please contact support.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                      <button onClick={() => setShowPrivacyPolicy(false)} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium">
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 6. AI Full Analysis Modal (Phil's Inspection) */}
      {showAnalysisModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="bg-slate-900 p-6 flex justify-between items-center text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                          <HardHat size={120} />
                      </div>
                      <div className="flex items-center space-x-4 z-10">
                          <div className="w-16 h-16 rounded-full border-2 border-white/30 overflow-hidden shadow-lg">
                              <img src={PHIL_AVATAR_URL} alt="Phil" className="w-full h-full object-cover" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold">Phil's Inspection Report</h3>
                              <p className="text-indigo-200 text-sm">Reviewing your property...</p>
                          </div>
                      </div>
                      <button onClick={() => setShowAnalysisModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition z-10">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-8">
                      {isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center py-20">
                              <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
                              <h4 className="text-lg font-bold text-slate-800 animate-pulse">Phil is taking a look...</h4>
                              <p className="text-slate-500 mt-2 text-sm text-center max-w-sm">
                                  Reviewing asset conditions, maintenance history, and checking local weather patterns.
                              </p>
                          </div>
                      ) : analysisReport ? (
                          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              
                              {/* Summary Section */}
                              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 relative">
                                  <div className="absolute -top-3 -left-3 bg-white p-1 rounded-full shadow-sm border border-gray-100">
                                      <HardHat size={20} className="text-blue-600" />
                                  </div>
                                  <h4 className="text-blue-900 font-bold mb-2 flex items-center ml-2">
                                      Phil says:
                                  </h4>
                                  <p className="text-blue-800 text-sm leading-relaxed italic">
                                      "{analysisReport.summary}"
                                  </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Risk Assessment */}
                                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                      <div className="flex items-center justify-between mb-4">
                                          <h4 className="font-bold text-slate-800 flex items-center">
                                              <AlertCircle size={18} className="mr-2 text-slate-400" /> Risk Assessment
                                          </h4>
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                                              ${analysisReport.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 
                                                analysisReport.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 
                                                'bg-emerald-100 text-emerald-700'}
                                          `}>
                                              {analysisReport.riskLevel} Risk
                                          </span>
                                      </div>
                                      <ul className="space-y-2">
                                          {analysisReport.risks.length > 0 ? (
                                              analysisReport.risks.map((risk, i) => (
                                                  <li key={i} className="flex items-start text-sm text-slate-600">
                                                      <span className="text-red-500 mr-2 mt-0.5">•</span>
                                                      {risk}
                                                  </li>
                                              ))
                                          ) : (
                                              <li className="text-sm text-slate-400 italic">No immediate risks detected.</li>
                                          )}
                                      </ul>
                                  </div>

                                  {/* Financial Insight */}
                                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                      <h4 className="font-bold text-slate-800 flex items-center mb-4">
                                          <TrendingUp size={18} className="mr-2 text-slate-400" /> Financial Outlook
                                      </h4>
                                      <p className="text-sm text-slate-600 leading-relaxed">
                                          {analysisReport.financialInsight}
                                      </p>
                                  </div>
                              </div>

                              {/* Recommendations */}
                              <div>
                                  <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                                      <CheckCircle size={18} className="mr-2 text-emerald-600" /> Recommended Actions
                                  </h4>
                                  <div className="grid grid-cols-1 gap-4">
                                      {analysisReport.recommendations.map((rec, i) => (
                                          <div key={i} className="flex items-start p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-300 transition">
                                              <div className="bg-emerald-100 text-emerald-700 font-bold w-6 h-6 rounded flex items-center justify-center text-xs mr-4 flex-shrink-0 mt-0.5">
                                                  {i + 1}
                                              </div>
                                              <div>
                                                  <h5 className="font-bold text-slate-800 text-sm mb-1">{rec.title}</h5>
                                                  <p className="text-sm text-slate-500">{rec.description}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                          </div>
                      ) : (
                          <div className="text-center text-red-500 py-10">
                              Failed to load analysis. Please try again.
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                          onClick={() => setShowAnalysisModal(false)}
                          className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition shadow-sm"
                      >
                          Thanks, Phil!
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;