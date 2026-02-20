import React, { useState } from 'react'; // Removed unused useEffect import
import { 
  Award, Trophy, Target, // Removed unused Zap, Star, Medal imports
  Users, Crown, // Removed unused Calendar, ArrowUp, Gift imports
  ChevronDown, ChevronUp, Shield, Flame,
  X, Check // Removed unused BookOpen import
} from 'lucide-react';
import { useStore } from '../store';
import { Achievement } from '../types'; // Removed unused UserLevel, LearningStreak imports

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  achievements: number;
  streak: number;
}

const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    avatar: 'https://i.pravatar.cc/150?img=1',
    xp: 1250,
    level: 5,
    achievements: 12,
    streak: 14
  },
  {
    id: '2',
    name: 'Taylor Smith',
    avatar: 'https://i.pravatar.cc/150?img=2',
    xp: 980,
    level: 4,
    achievements: 9,
    streak: 7
  },
  {
    id: '3',
    name: 'Jordan Lee',
    avatar: 'https://i.pravatar.cc/150?img=3',
    xp: 1420,
    level: 5,
    achievements: 15,
    streak: 21
  },
  {
    id: '4',
    name: 'Casey Williams',
    avatar: 'https://i.pravatar.cc/150?img=4',
    xp: 750,
    level: 4,
    achievements: 7,
    streak: 5
  },
  {
    id: '5',
    name: 'Riley Brown',
    avatar: 'https://i.pravatar.cc/150?img=5',
    xp: 2100,
    level: 6,
    achievements: 18,
    streak: 30
  }
];

interface GamificationSystemProps {
  onClose?: () => void;
}

const GamificationSystem: React.FC<GamificationSystemProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'achievements' | 'leaderboard' | 'streaks'>('achievements');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [leaderboard] = useState<LeaderboardEntry[]>(SAMPLE_LEADERBOARD); // Removed unused setLeaderboard
  
  const { 
    user, 
    getAchievements, 
    getUserXP, 
    getUserLevel, 
    getLearningStreak 
  } = useStore();
  
  const isDarkMode = user?.settings?.theme === 'dark';
  const achievements = getAchievements();
  const userXP = getUserXP();
  const currentLevel = getUserLevel();
  const streak = getLearningStreak();

  // Find next level
  const nextLevel = {
    level: currentLevel.level + 1,
    title: `Level ${currentLevel.level + 1}`,
    minXP: currentLevel.maxXP,
    maxXP: currentLevel.maxXP * 2
  };
  
  const progressToNextLevel = nextLevel 
    ? Math.round(((userXP - currentLevel.minXP) / (currentLevel.maxXP - currentLevel.minXP)) * 100) 
    : 100;

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'unlocked') return achievement.unlocked;
    if (filterCategory === 'locked') return !achievement.unlocked;
    return achievement.category === filterCategory;
  });

  const groupedAchievements = filteredAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categoryLabels: Record<string, string> = {
    'learning': 'Learning Progress',
    'assessment': 'Assessment Mastery',
    'engagement': 'Platform Engagement',
    'mastery': 'Subject Mastery'
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    'learning': <BookIcon className="h-5 w-5" />,
    'assessment': <Target className="h-5 w-5" />,
    'engagement': <Users className="h-5 w-5" />,
    'mastery': <Trophy className="h-5 w-5" />
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const progressPercent = Math.min(100, Math.round((achievement.progress / achievement.maxProgress) * 100));
    
    return (
      <div 
        key={achievement.id}
        className={`border rounded-lg p-4 transition-all ${
          achievement.unlocked
            ? isDarkMode
              ? 'border-indigo-500 bg-indigo-900/20'
              : 'border-indigo-300 bg-indigo-50'
            : isDarkMode
              ? 'border-gray-700 bg-gray-800'
              : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-full ${
            achievement.unlocked
              ? isDarkMode
                ? 'bg-indigo-900 text-indigo-300'
                : 'bg-indigo-100 text-indigo-600'
              : isDarkMode
                ? 'bg-gray-700 text-gray-400'
                : 'bg-gray-100 text-gray-500'
          }`}>
            <Award className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {achievement.title}
              </h3>
              {achievement.unlocked && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDarkMode
                    ? 'bg-green-900/30 text-green-300'
                    : 'bg-green-100 text-green-800'
                }`}>
                  +{achievement.xp} XP
                </span>
              )}
            </div>
            
            <p className={`text-sm mt-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {achievement.description}
            </p>
            
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                  Progress
                </span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {achievement.progress}/{achievement.maxProgress}
                </span>
              </div>
              <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className={`h-2 rounded-full ${
                    achievement.unlocked
                      ? isDarkMode ? 'bg-green-500' : 'bg-green-600'
                      : isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            
            {achievement.dateUnlocked && (
              <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Unlocked: {new Date(achievement.dateUnlocked).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLeaderboardTab = () => {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <h3 className={`text-lg font-medium mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Your Ranking
          </h3>
          
          <div className="flex items-center space-x-4">
            <div className={`relative w-16 h-16 rounded-full overflow-hidden border-2 ${
              isDarkMode ? 'border-indigo-500' : 'border-indigo-600'
            }`}>
              <img 
                src={user?.email ? `https://i.pravatar.cc/150?u=${user.email}` : 'https://i.pravatar.cc/150?img=0'} 
                alt="Your avatar" 
                className="w-full h-full object-cover"
              />
              <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isDarkMode
                  ? 'bg-indigo-500 text-white'
                  : 'bg-indigo-600 text-white'
              }`}>
                {currentLevel.level}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name || 'You'}
                </h4>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Rank: <span className="font-medium">7</span> of 42
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mt-1">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">{userXP}</span> XP
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">{achievements.filter(a => a.unlocked).length}</span> Achievements
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">{streak.currentStreak}</span> Day Streak
                </div>
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Level {currentLevel.level}: {currentLevel.title}
                  </span>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    {userXP}/{currentLevel.maxXP} XP
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                  <div 
                    className={`h-2 rounded-full ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'}`}
                    style={{ width: `${progressToNextLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Global Leaderboard
          </h3>
          
          <div className={`rounded-lg overflow-hidden border ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className={`grid grid-cols-12 gap-2 p-3 text-sm font-medium ${
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'
            }`}>
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">User</div>
              <div className="col-span-2 text-center">Level</div>
              <div className="col-span-2 text-center">XP</div>
              <div className="col-span-2 text-center">Streak</div>
            </div>
            
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.id}
                className={`grid grid-cols-12 gap-2 p-3 text-sm border-t ${
                  isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                } transition-colors`}
              >
                <div className="col-span-1 flex items-center">
                  {index < 3 ? (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : index === 1
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {index === 0 ? <Crown className="h-3 w-3" /> : (index + 1)}
                    </div>
                  ) : (
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {index + 1}
                    </span>
                  )}
                </div>
                
                <div className="col-span-5 flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img 
                      src={entry.avatar} 
                      alt={`${entry.name}'s avatar`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                    {entry.name}
                  </span>
                </div>
                
                <div className="col-span-2 flex items-center justify-center">
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    isDarkMode
                      ? 'bg-indigo-900/30 text-indigo-300'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    Level {entry.level}
                  </div>
                </div>
                
                <div className="col-span-2 text-center">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {entry.xp.toLocaleString()}
                  </span>
                </div>
                
                <div className="col-span-2 flex items-center justify-center space-x-1">
                  <Flame className={`h-4 w-4 ${
                    entry.streak >= 7
                      ? 'text-red-500'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <span className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                    {entry.streak}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStreaksTab = () => {
    const streakData = [5, 4, 3, 5, 2, 3, 5, 4, 5, 5, 6, 7, 5, 4];
    const maxStreak = Math.max(...streakData);
    const currentStreak = streak.currentStreak;
    const longestStreak = streak.longestStreak;
    
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Your Learning Streak
            </h3>
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
              isDarkMode
                ? 'bg-amber-900/30 text-amber-300'
                : 'bg-amber-100 text-amber-800'
            }`}>
              <Flame className="h-4 w-4" />
              <span className="text-sm font-medium">{currentStreak} days</span>
            </div>
          </div>
          
          <div className="flex items-end space-x-1 h-32 mb-2">
            {streakData.map((value, index) => (
              <div 
                key={index}
                className="flex-1 flex flex-col items-center"
              >
                <div 
                  className={`w-full rounded-t-sm ${
                    index === streakData.length - 1
                      ? isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                      : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  } transition-all`}
                  style={{ height: `${(value / maxStreak) * 100}%` }}
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-between text-xs mt-1">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              2 weeks ago
            </span>
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              Today
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${
                isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
              }`}>
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Current Streak
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentStreak} days
                </div>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${
                isDarkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'
              }`}>
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Longest Streak
                </div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {longestStreak} days
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <h3 className={`text-lg font-medium mb-3 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Streak Milestones
          </h3>
          
          <div className="space-y-4">
            {[
              { days: 3, xp: 15, unlocked: currentStreak >= 3 },
              { days: 7, xp: 50, unlocked: currentStreak >= 7 },
              { days: 14, xp: 100, unlocked: currentStreak >= 14 },
              { days: 30, xp: 200, unlocked: currentStreak >= 30 },
              { days: 60, xp: 500, unlocked: currentStreak >= 60 },
            ].map((milestone, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  milestone.unlocked
                    ? isDarkMode
                      ? 'bg-green-900/20 border border-green-800'
                      : 'bg-green-50 border border-green-200'
                    : isDarkMode
                      ? 'bg-gray-800 border border-gray-700'
                      : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.unlocked
                      ? isDarkMode
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-green-100 text-green-600'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {milestone.unlocked ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Flame className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {milestone.days}-Day Streak
                    </div>
                    <div className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {milestone.unlocked ? 'Completed' : `${currentStreak}/${milestone.days} days`}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  milestone.unlocked
                    ? isDarkMode
                      ? 'bg-green-900/30 text-green-300'
                      : 'bg-green-100 text-green-800'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                  {milestone.unlocked ? 'Earned' : '+'}{milestone.xp} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md`}>
      <div className={`p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Achievements & Rewards
            </h2>
          </div>
          {onClose && (
            <button
              type="button" // Added type attribute
              onClick={onClose}
              aria-label="Close" // Added aria-label for accessibility
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span aria-hidden="true">&times;</span> {/* Added visual close icon */}
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className={`p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-indigo-900/20 border border-indigo-800' : 'bg-indigo-50 border border-indigo-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${
                isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
              }`}>
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                  Current Level
                </div>
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Level {currentLevel.level}: {currentLevel.title}
                </div>
              </div>
            </div>
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
              {userXP} XP
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}>
                Progress to Level {currentLevel.level + 1}
              </span>
              <span className={isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}>
                {userXP}/{currentLevel.maxXP} XP
              </span>
            </div>
            <div className={`w-full h-2.5 rounded-full ${isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100'}`}>
              <div 
                className={`h-2.5 rounded-full ${isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'}`}
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'achievements'
                ? isDarkMode
                  ? 'bg-indigo-900/50 text-indigo-300'
                  : 'bg-indigo-100 text-indigo-700'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Award className="h-5 w-5" />
            <span>Achievements</span>
          </button>
          
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'leaderboard'
                ? isDarkMode
                  ? 'bg-indigo-900/50 text-indigo-300'
                  : 'bg-indigo-100 text-indigo-700'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Leaderboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('streaks')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'streaks'
                ? isDarkMode
                  ? 'bg-indigo-900/50 text-indigo-300'
                  : 'bg-indigo-100 text-indigo-700'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Flame className="h-5 w-5" />
            <span>Streaks</span>
          </button>
        </div>
        
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterCategory === 'all'
                    ? isDarkMode
                      ? 'bg-indigo-900/50 text-indigo-300'
                      : 'bg-indigo-100 text-indigo-700'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              
              <button
                onClick={() => setFilterCategory('unlocked')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterCategory === 'unlocked'
                    ? isDarkMode
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-green-100 text-green-700'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unlocked
              </button>
              
              <button
                onClick={() => setFilterCategory('locked')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterCategory === 'locked'
                    ? isDarkMode
                      ? 'bg-amber-900/50 text-amber-300'
                      : 'bg-amber-100 text-amber-700'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                In Progress
              </button>
              
              {Object.keys(categoryLabels).map(category => (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterCategory === category
                      ? isDarkMode
                        ? 'bg-indigo-900/50 text-indigo-300'
                        : 'bg-indigo-100 text-indigo-700'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {categoryIcons[category]}
                  <span>{categoryLabels[category]}</span>
                </button>
              ))}
            </div>
            
            <div className="space-y-4">
              {filterCategory === 'all' || filterCategory === 'unlocked' || filterCategory === 'locked' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAchievements.map(achievement => renderAchievementCard(achievement))}
                </div>
              ) : (
                Object.entries(groupedAchievements).map(([category, achievements]) => (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {categoryIcons[category]}
                        <span className="font-medium">{categoryLabels[category]}</span>
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          ({achievements.filter(a => a.unlocked).length}/{achievements.length})
                        </span>
                      </div>
                      {expandedCategory === category ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    
                    {expandedCategory === category && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {achievements.map(achievement => renderAchievementCard(achievement))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'leaderboard' && renderLeaderboardTab()}
        
        {activeTab === 'streaks' && renderStreaksTab()}
      </div>
    </div>
  );
};

// BookIcon component for category icons
const BookIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);

export default GamificationSystem;