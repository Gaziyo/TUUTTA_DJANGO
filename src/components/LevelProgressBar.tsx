import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useStore } from '../store';

interface LevelProgressBarProps {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  levelTitle: string;
  onClick?: () => void;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({
  level,
  currentXP,
  nextLevelXP,
  levelTitle,
  onClick
}) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  
  const progressPercent = Math.min(100, Math.round((currentXP / nextLevelXP) * 100));
  const xpToNextLevel = nextLevelXP - currentXP;

  return (
    <div
      className={`glass-sidebar-item rounded-xl @container ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1.5 @[200px]:mb-2">
        <div className="flex items-center space-x-1.5 @[200px]:space-x-2 min-w-0">
          <div className={`w-6 h-6 @[180px]:w-7 @[180px]:h-7 @[220px]:w-8 @[220px]:h-8 rounded-full flex items-center justify-center text-xs @[200px]:text-sm flex-shrink-0 ${
            isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {level}
          </div>
          <div className="min-w-0">
            <h3 className={`text-xs @[180px]:text-sm @[220px]:text-base font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="@[180px]:hidden">Lvl {level}</span>
              <span className="hidden @[180px]:inline">Level {level}</span>
            </h3>
            <p className={`text-[9px] @[180px]:text-[10px] @[220px]:text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {levelTitle}
            </p>
          </div>
        </div>
        <div className={`text-[10px] @[180px]:text-xs @[220px]:text-sm font-medium flex-shrink-0 ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
          {currentXP}<span className="hidden @[160px]:inline"> XP</span>
        </div>
      </div>

      <div className="mt-1.5 @[200px]:mt-2">
        <div className="flex justify-between text-[9px] @[180px]:text-[10px] @[220px]:text-xs mb-0.5 @[200px]:mb-1">
          <span className={`truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="@[200px]:hidden">To Lvl {level + 1}</span>
            <span className="hidden @[200px]:inline">Progress to Level {level + 1}</span>
          </span>
          <span className={`flex-shrink-0 ml-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {progressPercent}%
          </span>
        </div>
        <div className={`w-full h-1.5 @[200px]:h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-1.5 @[200px]:h-2 rounded-full ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5 @[200px]:mt-2">
        <div className={`text-[9px] @[180px]:text-[10px] @[220px]:text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="@[200px]:hidden">{xpToNextLevel} XP left</span>
          <span className="hidden @[200px]:inline">{xpToNextLevel} XP to next level</span>
        </div>
        <div className={`flex items-center space-x-0.5 @[200px]:space-x-1 text-[9px] @[180px]:text-[10px] @[220px]:text-xs flex-shrink-0 ${
          isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
        }`}>
          <ArrowUp className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
          <span className="hidden @[160px]:inline">Level up</span>
        </div>
      </div>
    </div>
  );
};

export default LevelProgressBar;
