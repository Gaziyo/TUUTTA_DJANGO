import React from 'react';
import { X, Award } from 'lucide-react';
import { useStore } from '../store';

interface AchievementNotificationProps {
  title: string;
  description: string;
  xp: number;
  onClose: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  title,
  description,
  xp,
  onClose
}) => {
  const { user } = useStore();
  const isDarkMode = user?.settings?.theme === 'dark';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
      <div className={`rounded-lg shadow-lg ${
        isDarkMode ? 'bg-gray-800 border border-indigo-500' : 'bg-white border border-indigo-200'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-medium flex items-center space-x-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Achievement Unlocked!</span>
          </h3>
          <button
            type="button" // Add type attribute
            title="Close notification" // Add title for accessibility
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${
              isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
            }`}>
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {description}
              </p>
            </div>
          </div>
          
          <div className={`mt-3 text-center py-2 rounded-lg ${
            isDarkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
          }`}>
            <span className="font-bold">+{xp} XP</span> earned!
          </div>
        </div>
      </div>
    </div>
  );
};

// Trophy icon component
const Trophy = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default AchievementNotification;