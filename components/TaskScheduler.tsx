
import React, { useState } from 'react';
import { Task } from '../types';
import { Calendar, AlertCircle, CheckCircle, Clock, Leaf, Snowflake, Sun, Wind, CalendarDays, Download, Trash2, Edit2, X, AlertTriangle, Save } from 'lucide-react';

interface TaskSchedulerProps {
  tasks: Task[];
  onCompleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteAllTasks: () => void;
  onDeleteTask: (id: string) => void;
}

const TaskScheduler: React.FC<TaskSchedulerProps> = ({ tasks, onCompleteTask, onUpdateTask, onDeleteAllTasks, onDeleteTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

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

  const getGoogleCalendarLink = (task: Task) => {
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    let startDate = new Date();
    try { if(task.dueDate) startDate = new Date(task.dueDate); } catch(e) {}
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    const title = encodeURIComponent(task.title);
    const details = encodeURIComponent(`${task.description}\n\nImportance: ${task.importance || 'Routine maintenance'}`);
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startStr}/${endStr}`;
  };

  // --- Modal Logic ---
  const openTaskDetails = (task: Task) => {
      setSelectedTask(task);
      setEditForm(task);
      setIsEditing(false);
  };

  const closeTaskDetails = () => {
      setSelectedTask(null);
      setIsEditing(false);
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
  const overdueTasks = tasks.filter(t => t.status === 'OVERDUE');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const pendingTasks = tasks.filter(t => t.status === 'PENDING');

  const seasonalGroups = pendingTasks.reduce((groups, task) => {
    const season = task.season || 'General Maintenance';
    if (!groups[season]) groups[season] = [];
    groups[season].push(task);
    return groups;
  }, {} as Record<string, Task[]>);

  const seasonOrder = ['Late Spring', 'Late Fall', 'General Maintenance'];
  const sortedSeasons = Object.keys(seasonalGroups).sort((a, b) => {
     const idxA = seasonOrder.indexOf(a);
     const idxB = seasonOrder.indexOf(b);
     if (idxA === -1) return 1;
     if (idxB === -1) return -1;
     return idxA - idxB;
  });

  const renderTaskCard = (task: Task) => (
    <div 
      key={task.id} 
      className={`
        flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border-l-4 transition-all mb-3 group
        ${task.status === 'COMPLETED' ? 'bg-gray-50 border-gray-200 opacity-60' : 
          task.status === 'OVERDUE' ? 'bg-red-50 border-red-500' : 'bg-white border-primary shadow-sm hover:shadow-md'}
      `}
    >
      <div 
        className="flex-1 cursor-pointer" 
        onClick={() => openTaskDetails(task)}
      >
        <div className="flex items-center mb-1">
          <h3 className={`font-semibold ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
            {task.title}
          </h3>
          {task.priority === 'HIGH' && task.status !== 'COMPLETED' && (
            <span className="ml-2 text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">URGENT</span>
          )}
          {task.status === 'OVERDUE' && (
             <span className="ml-2 flex items-center text-xs font-bold text-red-600">
               <AlertCircle size={12} className="mr-1" /> Overdue
             </span>
          )}
          <Edit2 size={12} className="ml-2 text-gray-300 opacity-0 group-hover:opacity-100 transition" />
        </div>
        <p className="text-sm text-gray-500 truncate pr-4">{task.description}</p>
        <div className="text-xs text-gray-400 mt-1 flex items-center space-x-3">
             <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(task.dueDate).toLocaleDateString()}</span>
             {task.importance && <span className="flex items-center text-emerald-600"><Alert