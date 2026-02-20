import React, { useState, useMemo } from 'react';
import {
  Award,
  Trophy,
  Star,
  Target,
  Zap,
  Clock,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Medal,
  Crown,
  Flame,
  Users,
  Lock
} from 'lucide-react';

// Badge Types
export interface LMSBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'completion' | 'streak' | 'achievement' | 'mastery' | 'social';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'courses_completed' | 'streak_days' | 'quiz_score' | 'hours_learned' | 'paths_completed' | 'first_completion' | 'perfect_score' | 'speed_learner';
    value: number;
  };
  earnedAt?: number;
  progress?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  departmentName?: string;
  points: number;
  coursesCompleted: number;
  streak: number;
  badgesEarned: number;
  trend: 'up' | 'down' | 'same';
  trendValue: number;
}

interface LMSGamificationProps {
  badges: LMSBadge[];
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
  userStats: {
    totalPoints: number;
    rank: number;
    coursesCompleted: number;
    hoursLearned: number;
    currentStreak: number;
    longestStreak: number;
    averageQuizScore: number;
    badgesEarned: number;
  };
  timeRange: 'week' | 'month' | 'all_time';
  onTimeRangeChange: (range: 'week' | 'month' | 'all_time') => void;
  isDarkMode?: boolean;
}

const BADGE_ICONS: Record<string, React.ElementType> = {
  'first-course': CheckCircle,
  'five-courses': BookOpen,
  'ten-courses': Award,
  'streak-7': Flame,
  'streak-30': Zap,
  'perfect-quiz': Star,
  'speed-learner': Clock,
  'path-complete': Target,
  'top-learner': Crown,
  'master': Medal
};

const TIER_COLORS = {
  bronze: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', darkBg: 'bg-orange-900/30', darkText: 'text-orange-400' },
  silver: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', darkBg: 'bg-gray-700', darkText: 'text-gray-300' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', darkBg: 'bg-yellow-900/30', darkText: 'text-yellow-400' },
  platinum: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-400', darkBg: 'bg-indigo-900/30', darkText: 'text-indigo-400' }
};

const CATEGORY_LABELS = {
  completion: 'Completion',
  streak: 'Streaks',
  achievement: 'Achievements',
  mastery: 'Mastery',
  social: 'Social'
};

export function LMSGamification({
  badges,
  leaderboard,
  currentUserId,
  userStats,
  timeRange,
  onTimeRangeChange,
  isDarkMode = false
}: LMSGamificationProps) {
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const earnedBadges = badges.filter(b => b.earnedAt);
  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return badges;
    return badges.filter(b => b.category === selectedCategory);
  }, [badges, selectedCategory]);

  const currentUserEntry = leaderboard.find(e => e.userId === currentUserId);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={20} className="text-yellow-500" />;
      case 2: return <Medal size={20} className="text-gray-400" />;
      case 3: return <Medal size={20} className="text-orange-500" />;
      default: return <span className="font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getTrendIcon = (entry: LeaderboardEntry) => {
    if (entry.trend === 'up') {
      return <TrendingUp size={14} className="text-green-500" />;
    } else if (entry.trend === 'down') {
      return <TrendingUp size={14} className="text-red-500 transform rotate-180" />;
    }
    return null;
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header Stats */}
      <div className={`p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy size={28} className="text-yellow-500" />
            <h1 className="text-xl font-semibold">Achievements & Leaderboard</h1>
          </div>
        </div>

        {/* User Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-indigo-500" />
              <span className={`text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Rank</span>
            </div>
            <p className="text-2xl font-bold">#{userStats.rank}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-yellow-500" />
              <span className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>Points</span>
            </div>
            <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString()}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-green-500" />
              <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Courses</span>
            </div>
            <p className="text-2xl font-bold">{userStats.coursesCompleted}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-orange-500" />
              <span className={`text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Streak</span>
            </div>
            <p className="text-2xl font-bold">{userStats.currentStreak} days</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-purple-500" />
              <span className={`text-sm ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Hours</span>
            </div>
            <p className="text-2xl font-bold">{Math.round(userStats.hoursLearned)}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} className="text-pink-500" />
              <span className={`text-sm ${isDarkMode ? 'text-pink-400' : 'text-pink-600'}`}>Badges</span>
            </div>
            <p className="text-2xl font-bold">{userStats.badgesEarned}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'badges'
              ? (isDarkMode ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-indigo-600 border-b-2 border-indigo-600')
              : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
          }`}
        >
          <Award size={18} />
          Badges ({earnedBadges.length}/{badges.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? (isDarkMode ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-indigo-600 border-b-2 border-indigo-600')
              : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
          }`}
        >
          <Trophy size={18} />
          Leaderboard
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'badges' && (
          <div>
            {/* Category Filter */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }`}
              >
                All Badges
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === key
                      ? 'bg-indigo-600 text-white'
                      : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Earned Badges */}
            {filteredBadges.filter(b => b.earnedAt).length > 0 && (
              <div className="mb-8">
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Earned Badges
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredBadges.filter(b => b.earnedAt).map(badge => {
                    const Icon = BADGE_ICONS[badge.icon] || Award;
                    const tierColors = TIER_COLORS[badge.tier];

                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-xl border-2 ${
                          isDarkMode ? tierColors.darkBg : tierColors.bg
                        } ${tierColors.border} relative`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                          isDarkMode ? 'bg-gray-800' : 'bg-white'
                        }`}>
                          <Icon size={24} className={isDarkMode ? tierColors.darkText : tierColors.text} />
                        </div>
                        <h4 className="font-semibold mb-1">{badge.name}</h4>
                        <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {badge.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            isDarkMode ? tierColors.darkBg : tierColors.bg
                          } ${isDarkMode ? tierColors.darkText : tierColors.text}`}>
                            {badge.tier}
                          </span>
                          {badge.earnedAt && (
                            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {new Date(badge.earnedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {filteredBadges.filter(b => !b.earnedAt).length > 0 && (
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Badges to Unlock
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredBadges.filter(b => !b.earnedAt).map(badge => {
                    const Icon = BADGE_ICONS[badge.icon] || Award;
                    const progress = badge.progress || 0;

                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-xl border ${
                          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        } opacity-75`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 relative ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <Icon size={24} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                          <Lock size={12} className="absolute -bottom-1 -right-1 text-gray-500" />
                        </div>
                        <h4 className="font-semibold mb-1">{badge.name}</h4>
                        <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {badge.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Progress</span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{progress}%</span>
                          </div>
                          <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="max-w-3xl mx-auto">
            {/* Time Range Selector */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {(['week', 'month', 'all_time'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-indigo-600 text-white'
                      : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                  }`}
                >
                  {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <Users size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </div>
                  <p className="font-semibold truncate max-w-[100px]">{leaderboard[1].userName}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {leaderboard[1].points.toLocaleString()} pts
                  </p>
                  <div className={`mt-2 h-16 w-24 rounded-t-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                    <Medal size={24} className="text-gray-400" />
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {leaderboard[0] && (
                <div className="text-center">
                  <div className={`w-24 h-24 rounded-full mx-auto mb-2 flex items-center justify-center border-4 border-yellow-400 ${
                    isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
                  }`}>
                    <Users size={40} className="text-yellow-500" />
                  </div>
                  <p className="font-bold text-lg truncate max-w-[120px]">{leaderboard[0].userName}</p>
                  <p className="text-yellow-500 font-semibold">
                    {leaderboard[0].points.toLocaleString()} pts
                  </p>
                  <div className={`mt-2 h-24 w-28 rounded-t-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-yellow-900/50' : 'bg-yellow-100'
                  }`}>
                    <Crown size={32} className="text-yellow-500" />
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {leaderboard[2] && (
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50'
                  }`}>
                    <Users size={32} className="text-orange-500" />
                  </div>
                  <p className="font-semibold truncate max-w-[100px]">{leaderboard[2].userName}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {leaderboard[2].points.toLocaleString()} pts
                  </p>
                  <div className={`mt-2 h-12 w-24 rounded-t-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'
                  }`}>
                    <Medal size={24} className="text-orange-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Full Leaderboard */}
            <div className={`rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm ${
                isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
              }`}>
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Learner</div>
                <div className="col-span-2 text-center">Points</div>
                <div className="col-span-2 text-center">Courses</div>
                <div className="col-span-2 text-center">Badges</div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {leaderboard.map((entry) => {
                  const isCurrentUser = entry.userId === currentUserId;

                  return (
                    <div
                      key={entry.userId}
                      className={`grid grid-cols-12 gap-4 p-4 items-center ${
                        isCurrentUser
                          ? (isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50')
                          : ''
                      }`}
                    >
                      <div className="col-span-1 flex items-center gap-2">
                        {getRankIcon(entry.rank)}
                        {getTrendIcon(entry)}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <Users size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                        </div>
                        <div>
                          <p className={`font-medium ${isCurrentUser ? 'text-indigo-500' : ''}`}>
                            {entry.userName}
                            {isCurrentUser && <span className="text-xs ml-2">(You)</span>}
                          </p>
                          {entry.departmentName && (
                            <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {entry.departmentName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="font-semibold">{entry.points.toLocaleString()}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{entry.coursesCompleted}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{entry.badgesEarned}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current User Position (if not in top) */}
              {currentUserEntry && currentUserEntry.rank > 10 && (
                <>
                  <div className={`text-center py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    • • •
                  </div>
                  <div className={`grid grid-cols-12 gap-4 p-4 items-center ${
                    isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'
                  }`}>
                    <div className="col-span-1">
                      <span className="font-bold">#{currentUserEntry.rank}</span>
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100`}>
                        <Users size={20} className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-medium text-indigo-500">
                          {currentUserEntry.userName} (You)
                        </p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-semibold">
                      {currentUserEntry.points.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-center">
                      {currentUserEntry.coursesCompleted}
                    </div>
                    <div className="col-span-2 text-center">
                      {currentUserEntry.badgesEarned}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LMSGamification;
