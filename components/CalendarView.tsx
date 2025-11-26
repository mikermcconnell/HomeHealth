import React, { useState } from 'react';
import { Task } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, CheckCircle } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper: Get number of days in the month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper: Get the day of the week the month starts on (0 = Sunday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Generate calendar grid cells
  // We need 'firstDay' empty slots before the 1st of the month
  const emptySlots = Array.from({ length: firstDay });
  const daySlots = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter tasks for a specific day
  const getTasksForDay = (day: number) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getDate() === day &&
        taskDate.getMonth() === month &&
        taskDate.getFullYear() === year
      );
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <CalendarIcon className="mr-2" size={24} />
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition mr-2"
          >
            Today
          </button>
          <button 
            onClick={prevMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-sm font-semibold text-gray-400 uppercase tracking-wide py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 lg:gap-2 auto-rows-fr flex-grow">
        {/* Empty slots for previous month */}
        {emptySlots.map((_, index) => (
          <div key={`empty-${index}`} className="bg-gray-50/50 rounded-lg h-24 lg:h-32"></div>
        ))}

        {/* Days of the month */}
        {daySlots.map(day => {
          const dayTasks = getTasksForDay(day);
          const isToday = 
            new Date().getDate() === day && 
            new Date().getMonth() === month && 
            new Date().getFullYear() === year;

          return (
            <div 
              key={day} 
              className={`
                relative border rounded-lg p-2 h-24 lg:h-32 overflow-hidden transition hover:shadow-sm flex flex-col
                ${isToday ? 'bg-blue-50/30 border-blue-200' : 'bg-white border-gray-100'}
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`
                  text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}
                `}>
                  {day}
                </span>
                {dayTasks.length > 0 && (
                   <span className="text-xs text-gray-400 font-medium">{dayTasks.length}</span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    className={`
                      text-xs px-1.5 py-1 rounded border truncate cursor-default group relative
                      ${task.status === 'COMPLETED' ? 'bg-gray-100 text-gray-400 border-gray-100 line-through' : 
                        task.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-100' : 
                        task.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-100'}
                    `}
                    title={task.title}
                  >
                     <div className="flex items-center">
                        {task.status === 'OVERDUE' && <AlertCircle size={10} className="mr-1 flex-shrink-0" />}
                        {task.status === 'COMPLETED' && <CheckCircle size={10} className="mr-1 flex-shrink-0" />}
                        <span className="truncate">{task.title}</span>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex items-center space-x-6 text-xs text-gray-500 justify-center">
          <div className="flex items-center"><div className="w-3 h-3 rounded bg-red-50 border border-red-100 mr-2"></div> Overdue</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded bg-amber-50 border border-amber-100 mr-2"></div> High Priority</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-100 mr-2"></div> Normal</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200 mr-2"></div> Completed</div>
      </div>
    </div>
  );
};

export default CalendarView;
