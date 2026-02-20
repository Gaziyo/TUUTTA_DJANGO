import React from 'react';
import { Flame } from 'lucide-react';
import { useStore } from '../store';

interface StreakTrackerProps {
  streak: number;
  onClick?: () => void;
  showDetails?: boolean;
}

const StreakTracker: React.FC<StreakTrackerProps> = ({ 
  streak, 
  onClick,
  showDetails = false
}) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  
  // Generate the last 7 days for the streak calendar
  const generateDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // For demo purposes, we'll consider a day active if it's within the streak
      // In a real app, you'd check against actual activity dates
      const isActive = i < streak;
      
      days.push({
        date,
        isActive,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
        dayNumber: date.getDate()
      });
    }
    
    return days;
  };
  
  const days = generateDays();

  return (
    <div
      className={`glass-sidebar-item rounded-xl @container ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="p-2 @[180px]:p-3 @[220px]:p-4">
        <div className="flex items-center justify-between mb-1.5 @[200px]:mb-2">
          <div className="flex items-center space-x-1.5 @[200px]:space-x-2 min-w-0">
            <Flame className={`h-4 w-4 @[200px]:h-5 @[200px]:w-5 flex-shrink-0 ${
              streak > 0
                ? 'text-red-500'
                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <h3 className={`text-xs @[180px]:text-sm @[220px]:text-base font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="@[200px]:hidden">Streak</span>
              <span className="hidden @[200px]:inline">Learning Streak</span>
            </h3>
          </div>
          <div className={`px-1.5 @[180px]:px-2 py-0.5 @[180px]:py-1 rounded-full text-[10px] @[180px]:text-xs @[220px]:text-sm font-medium flex-shrink-0 ${
            streak > 0
              ? isDarkMode
                ? 'bg-red-900/30 text-red-300'
                : 'bg-red-100 text-red-700'
              : isDarkMode
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-100 text-gray-700'
          }`}>
            {streak}<span className="hidden @[160px]:inline"> days</span><span className="@[160px]:hidden">d</span>
          </div>
        </div>
        
        {showDetails && (
          <div className="mt-2 @[200px]:mt-3">
            <div className="flex justify-between gap-0.5 @[200px]:gap-1">
              {days.map((day, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center flex-1"
                >
                  <div className={`text-[9px] @[180px]:text-[10px] @[220px]:text-xs mb-0.5 @[200px]:mb-1 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {day.dayName}
                  </div>
                  <div className={`w-5 h-5 @[180px]:w-6 @[180px]:h-6 @[220px]:w-8 @[220px]:h-8 rounded-full flex items-center justify-center text-[9px] @[180px]:text-[10px] @[220px]:text-sm ${
                    day.isActive
                      ? isDarkMode
                        ? 'bg-red-900/30 text-red-300'
                        : 'bg-red-100 text-red-700'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {day.dayNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakTracker;
