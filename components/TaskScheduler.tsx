
import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { Calendar, AlertCircle, CheckCircle, Clock, Leaf, Snowflake, Sun, Wind, CalendarDays, Download, Trash2, Edit2, X, AlertTriangle, Save, Info, CheckSquare, DollarSign, CalendarPlus, Shield, Wrench, Home, Thermometer, Droplets, Zap, Box } from 'lucide-react';

interface TaskSchedulerProps {
  tasks: Task[];
  onCompleteTask: (id: string, cost?: number) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteAllTasks: () => void;
  onDeleteTask: (id: string) => void;
}

const CATEGORIES: { id: TaskCategory | 'ALL', label: string, icon: React.ReactNode }[] = [
  { id: 'ALL', label: 'All Tasks', icon: <CheckSquare size={14} /> },
  { id: 'SAFETY', label: 'Safety', icon: <Shield size={14} /> },
  { id: 'SYSTEMS', label: 'Systems', icon: <Thermometer size={14} /> },
  { id: 'EXTERIOR', label: 'Exterior', icon: <Home size={14} /> },
  { id: 'OUTDOOR', label: 'Outdoor', icon: <Leaf size={14} /> },
  { id: 'APPLIANCE', label: 'Appliances', icon: <Box size={14} /> },
  { id: 'PLUMBING', label: 'Plumbing', icon: <Droplets size={14} /> },
];

const TaskScheduler: React.FC<TaskSchedulerProps> = ({ tasks, onCompleteTask, onUpdateTask, onDeleteAllTasks, onDeleteTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [activeFilter, setActiveFilter] = useState<TaskCategory | 'ALL'>('ALL');
  
  // Cost Completion State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeCost, setCompleteCost] = useState<string>('');
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);

  // --- Actions ---
  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HomeHealth//Maintenance Schedule//EN\n";
    
    tasks.forEach(task => {
        if (task.status === 'COMPLETED') return;
        
        // Simple date formatting for ICS (YYYYMMDD)
        const d = new Date(task.dueDate);
        const dateStr = d.toISOString().replace(/-|:|\.\d\d\d/g, "").split('T')[0]; // Just date for all-day mostly
        
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:${task.id}@homehealth.app\n`;
        icsContent += `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, "")}\n`;
        icsContent += `DTSTART;VALUE=DATE:${dateStr}\n`;
        icsContent += `SUMMARY:${task.title}\n`;
        icsContent += `DESCRIPTION:${task.description} - Importance: ${task.importance || 'Routine Maintenance'}\n`;
        icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'home_maintenance_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingleTaskICS = (task: Task) => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HomeHealth//Maintenance Schedule//EN\n";
    
    // Simple date formatting for ICS (YYYYMMDD)
    const d = new Date(task.dueDate);
    const dateStr = d.toISOString().replace(/-|:|\.\d\d\d/g, "").split('T')[0];
    
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `UID:${task.id}@homehealth.app\n`;
    icsContent += `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, "")}\n`;
    icsContent += `DTSTART;VALUE=DATE:${dateStr}\n`;
    icsContent += `SUMMARY:${task.title}\n`;
    icsContent += `DESCRIPTION:${task.description} - Importance: ${task.importance || 'Routine Maintenance'}\n`;
    icsContent += "END:VEVENT\n";
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}_schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Modal Logic ---
  const openTaskDetails = (task: Task) => {
      setSelectedTask(task);
      setEditForm(JSON.parse(JSON.stringify(task))); // Deep copy
      setIsEditing(false);
  };

  const closeTaskDetails = () => {
      setSelectedTask(null);
      setIsEditing(false);
  };
  
  const initiateCompletion = (taskId: string) => {
      setTaskToComplete(taskId);
      setShowCompleteModal(true);
      setCompleteCost('');
  };
  
  const submitCompletion = (e: React.FormEvent) => {
      e.preventDefault();
      if (taskToComplete) {
          const cost = completeCost ? parseFloat(completeCost) : 0;
          onCompleteTask(taskToComplete, cost);
          setShowCompleteModal(false);
          setTaskToComplete(null);
          // If detailed view was open for this task, close it
          if (selectedTask?.id === taskToComplete) {
              closeTaskDetails();
          }
      }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedTask && editForm.id) {
          onUpdateTask(editForm as Task);
          setSelectedTask(editForm as Task); // Update local view
          setIsEditing(false);
      }
  };

  // --- Timeline Data Preparation ---
  const getTimelineMonths = () => {
    const today = new Date();
    const months = [];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = d.getMonth();
        const yearKey = d.getFullYear();

        const monthTasks = tasks.filter(t => {
            if (t.status === 'COMPLETED') return false;
            if (t.status === 'OVERDUE') return false;
            const taskDate = new Date(t.dueDate);
            return taskDate.getMonth() === monthKey && taskDate.getFullYear() === yearKey;
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        months.push({
            date: d,
            label: `${monthNames[monthKey]}`,
            subLabel: `${yearKey}`,
            tasks: monthTasks
        });
    }
    return months;
  };

  const timelineMonths = getTimelineMonths();
  
  const filteredTasks = tasks.filter(task => {
      if (activeFilter === 'ALL') return true;
      return task.category === activeFilter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
      // Sort logic: Overdue first, then by date
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="space-y-8">
      {/* 1. Timeline Snapshot */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <CalendarDays className="mr-2 text-primary" size={20} /> 
            6-Month Snapshot
        </h3>
        <div className="flex overflow-x-auto pb-4 space-x-4 custom-scrollbar">
            {timelineMonths.map((month, idx) => (
                <div key={idx} className="min-w-[200px] flex-shrink-0 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="text-sm font-bold text-gray-700 mb-1">{month.label}</div>
                    <div className="text-xs text-gray-400 mb-3">{month.subLabel}</div>
                    
                    <div className="space-y-2">
                        {month.tasks.length === 0 ? (
                            <div className="text-xs text-gray-400 italic py-2">No tasks scheduled</div>
                        ) : (
                            month.tasks.slice(0, 4).map(t => (
                                <div key={t.id} className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm text-xs flex justify-between items-center group cursor-pointer hover:border-emerald-300 transition" onClick={() => openTaskDetails(t)}>
                                    <div className="flex items-center min-w-0 mr-2">
                                        <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${t.priority === 'HIGH' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                                        <span className="truncate font-medium text-gray-700">{t.title}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                                        {new Date(t.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                    </span>
                                </div>
                            ))
                        )}
                        {month.tasks.length > 4 && (
                            <div className="text-xs text-center text-gray-500 font-medium pt-1">
                                + {month.tasks.length - 4} more
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 2. Main List Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center space-y-4 sm:space-y-0">
            <h2 className="text-2xl font-bold text-gray-900">Maintenance List</h2>
            <div className="flex space-x-2">
                <button 
                    onClick={handleExportICS}
                    className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
                >
                    <Download size={16} className="mr-2" />
                    Add All to Calendar
                </button>
                <button 
                    onClick={() => { if(window.confirm('Are you sure you want to delete all tasks?')) onDeleteAllTasks(); }}
                    className="flex items-center px-3 py-2 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition shadow-sm"
                >
                    <Trash2 size={16} className="mr-2" />
                    Delete All
                </button>
            </div>
        </div>
        
        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveFilter(cat.id)}
                    className={`
                        flex items-center whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition border
                        ${activeFilter === cat.id 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                    `}
                >
                    <span className="mr-1.5 opacity-80">{cat.icon}</span>
                    {cat.label}
                </button>
            ))}
        </div>
      </div>

      {/* 3. Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {sortedTasks.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No tasks found for this category.</p>
              </div>
          ) : (
              <div className="divide-y divide-gray-100">
                  {sortedTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`
                            group p-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer
                            ${task.status === 'COMPLETED' ? 'opacity-50' : ''}
                        `}
                        onClick={() => openTaskDetails(task)}
                      >
                          <div className="flex items-center flex-1 min-w-0">
                              <button 
                                onClick={(e) => { e.stopPropagation(); if (task.status !== 'COMPLETED') initiateCompletion(task.id); }}
                                className={`
                                    mr-4 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition
                                    ${task.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white cursor-default' : 'border-gray-300 hover:border-emerald-500 text-transparent hover:text-emerald-300'}
                                `}
                              >
                                  <CheckCircle size={14} fill="currentColor" />
                              </button>
                              
                              <div className="min-w-0 flex-1 pr-4">
                                  <div className="flex items-center">
                                      <h4 className={`text-sm font-semibold truncate ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                          {task.title}
                                      </h4>
                                      {task.category && (
                                         <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 border border-gray-200">
                                            {task.category}
                                         </span>
                                      )}
                                      {task.status === 'OVERDUE' && (
                                          <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide">
                                              Overdue
                                          </span>
                                      )}
                                      {task.priority === 'HIGH' && task.status !== 'COMPLETED' && (
                                          <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                                              High Priority
                                          </span>
                                      )}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 truncate mt-0.5">
                                      {task.description}
                                      {task.actualCost !== undefined && (
                                          <span className="ml-2 font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                              ${task.actualCost}
                                          </span>
                                      )}
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center text-xs text-gray-400 space-x-2 flex-shrink-0">
                              <span className={`flex items-center mr-2 ${task.status === 'OVERDUE' ? 'text-red-500 font-bold' : ''}`}>
                                  <Calendar size={14} className="mr-1.5" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                              
                              <button 
                                  onClick={(e) => { e.stopPropagation(); handleExportSingleTaskICS(task); }}
                                  className="text-gray-300 hover:text-emerald-600 p-1.5 rounded-full hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition"
                                  title="Add to Calendar"
                              >
                                  <CalendarPlus size={16} />
                              </button>
                              
                              <button 
                                  className="text-gray-300 hover:text-primary p-1.5 rounded-full hover:bg-sky-50 opacity-0 group-hover:opacity-100 transition"
                                  title="Edit Task"
                              >
                                  <Edit2 size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
      
      {/* 4. Complete Task Modal (With Cost) */}
      {showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-5">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">Complete Task</h3>
                      <p className="text-sm text-gray-500 mb-4">Did this maintenance cost anything?</p>
                      
                      <form onSubmit={submitCompletion}>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cost (Optional)</label>
                          <div className="relative mb-6">
                              <DollarSign size={16} className="absolute left-3 top-2.5 text-gray-400" />
                              <input 
                                  type="number" 
                                  autoFocus
                                  value={completeCost}
                                  onChange={(e) => setCompleteCost(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="0.00"
                              />
                          </div>
                          
                          <div className="flex gap-2">
                              <button 
                                  type="button" 
                                  onClick={() => setShowCompleteModal(false)}
                                  className="flex-1 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                              >
                                  Cancel
                              </button>
                              <button 
                                  type="submit"
                                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition"
                              >
                                  Complete Task
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* 5. Task Details & Edit Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {isEditing ? 'Edit Task' : 'Task Details'}
                    </h3>
                    <button onClick={closeTaskDetails} className="text-gray-400 hover:text-gray-600 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    {isEditing ? (
                        <form id="edit-task-form" onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                <input 
                                    type="text" 
                                    value={editForm.title} 
                                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <select
                                    value={editForm.category || 'GENERAL'}
                                    onChange={e => setEditForm({...editForm, category: e.target.value as TaskCategory})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="GENERAL">General</option>
                                    <option value="SAFETY">Safety</option>
                                    <option value="EXTERIOR">Exterior</option>
                                    <option value="INTERIOR">Interior</option>
                                    <option value="SYSTEMS">Systems</option>
                                    <option value="APPLIANCE">Appliance</option>
                                    <option value="PLUMBING">Plumbing</option>
                                    <option value="OUTDOOR">Outdoor</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (What to do)</label>
                                <textarea 
                                    value={editForm.description} 
                                    onChange={e => setEditForm({...editForm, description: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm h-20 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Importance (Why do it?)</label>
                                <textarea 
                                    value={editForm.importance || ''} 
                                    onChange={e => setEditForm({...editForm, importance: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm h-20 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Explain why this task is important for the home..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                                    <input 
                                        type="date" 
                                        value={editForm.dueDate ? new Date(editForm.dueDate).toISOString().split('T')[0] : ''} 
                                        onChange={e => setEditForm({...editForm, dueDate: new Date(e.target.value).toISOString()})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                                    <select 
                                        value={editForm.priority}
                                        onChange={e => setEditForm({...editForm, priority: e.target.value as any})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {/* Title & Status */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
                                    <div className="flex gap-2">
                                        {selectedTask.category && (
                                            <div className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
                                                {selectedTask.category}
                                            </div>
                                        )}
                                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                                            ${selectedTask.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
                                        `}>
                                            {selectedTask.priority} Priority
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar size={16} className="mr-2" />
                                    Due: {new Date(selectedTask.dueDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>

                            {/* What to do */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h4 className="flex items-center text-sm font-bold text-gray-800 mb-2">
                                    <CheckSquare size={16} className="mr-2 text-primary" /> What to do
                                </h4>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {selectedTask.description}
                                </p>
                            </div>

                            {/* Why it's important */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="flex items-center text-sm font-bold text-blue-900 mb-2">
                                    <Info size={16} className="mr-2 text-blue-600" /> Why it's important
                                </h4>
                                <p className="text-blue-800 text-sm leading-relaxed">
                                    {selectedTask.importance || "Regular maintenance extends the life of your home assets and prevents costly repairs down the line."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    {isEditing ? (
                        <>
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                form="edit-task-form"
                                type="submit"
                                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-md flex items-center"
                            >
                                <Save size={16} className="mr-2" /> Save Changes
                            </button>
                        </>
                    ) : (
                        <>
                           <button 
                                onClick={() => { if(window.confirm('Delete this task?')) { onDeleteTask(selectedTask.id); closeTaskDetails(); } }}
                                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center transition"
                           >
                               <Trash2 size={16} className="mr-1" /> Delete
                           </button>

                           <div className="flex items-center">
                               <button 
                                   onClick={() => handleExportSingleTaskICS(selectedTask)}
                                   className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition mr-3 flex items-center"
                               >
                                   <CalendarPlus size={16} className="mr-2" /> Add to Cal
                               </button>
                               <button 
                                   onClick={() => setIsEditing(true)}
                                   className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition mr-3"
                               >
                                   Edit
                               </button>
                               {selectedTask.status !== 'COMPLETED' && (
                                   <button 
                                       onClick={() => initiateCompletion(selectedTask.id)}
                                       className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-md"
                                   >
                                       Mark Complete
                                   </button>
                               )}
                           </div>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TaskScheduler;
