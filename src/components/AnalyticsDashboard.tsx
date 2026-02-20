import React, { useMemo } from 'react';
import {
  BarChart, BookOpen, Brain, Upload, Award, ArrowUp, ArrowDown,
  Mic, Edit3, Volume2, Target, TrendingUp, Activity, LineChart,
  Zap, AlertTriangle, CheckCircle2, Timer, BookMarked, MessageSquare
} from 'lucide-react';
import { useStore } from '../store';
import {
  calculateSkillProgress,
  calculateStudyTime,
  calculatePerformanceTrends,
  calculateCompletionRates,
  calculateWeeklyComparison,
  calculateImprovementAreas,
} from '../lib/analytics';

const AnalyticsDashboard: React.FC = () => {
  const {
    getNotes,
    getChatSessions,
    getFiles,
    getUserXP,
    getUserLevel,
    getLearningStreak,
    getAchievements,
    getAssessments
  } = useStore();

  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  const notes = getNotes();
  const chatSessions = getChatSessions();
  const files = getFiles();
  const userXP = getUserXP();
  const userLevel = getUserLevel();
  const streak = getLearningStreak();
  const achievements = getAchievements();
  const assessments = getAssessments();

  // Calculate activity stats
  const stats = {
    totalNotes: notes?.length || 0,
    totalChats: chatSessions?.length || 0,
    totalFiles: files?.length || 0,
    completedAchievements: achievements?.filter(a => a.unlocked)?.length || 0,
    currentStreak: streak?.currentStreak || 0,
    longestStreak: streak?.longestStreak || 0,
    level: userLevel?.level || 1,
    xp: userXP || 0
  };

  // Calculate weekly comparison for change percentages
  const weeklyComparison = useMemo(
    () => calculateWeeklyComparison(notes || [], chatSessions || [], files || [], assessments || []),
    [notes, chatSessions, files, assessments]
  );

  // Calculate skill progress from real assessment data
  const skillProgress = useMemo(
    () => calculateSkillProgress(assessments || []),
    [assessments]
  );

  // Calculate study time from activity timestamps
  const studyTimeData = useMemo(
    () => calculateStudyTime(notes || [], chatSessions || [], assessments || []),
    [notes, chatSessions, assessments]
  );

  // Calculate performance trends from assessments
  const performanceTrends = useMemo(
    () => calculatePerformanceTrends(assessments || []),
    [assessments]
  );

  // Calculate completion rates
  const completionRates = useMemo(
    () => calculateCompletionRates(assessments || []),
    [assessments]
  );

  // Calculate improvement areas
  const improvementAreas = useMemo(
    () => calculateImprovementAreas(skillProgress),
    [skillProgress]
  );

  const StatCard = ({
    title,
    value,
    icon: Icon,
    change,
    color = 'indigo'
  }: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    change?: number;
    color?: string;
  }) => (
    <div className={`p-3 sm:p-4 rounded-lg border overflow-hidden ${
      isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className={`p-1.5 sm:p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 text-xs sm:text-sm ${
            change >= 0
              ? isDarkMode ? 'text-green-400' : 'text-green-600'
              : isDarkMode ? 'text-red-400' : 'text-red-600'
          }`}>
            {change >= 0 ? (
              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <h3 className={`mt-3 sm:mt-4 text-lg sm:text-xl md:text-2xl font-semibold truncate ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
      </h3>
      <p className={`text-xs sm:text-sm truncate ${
        isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {title}
      </p>
    </div>
  );

  const ProgressBar = ({ 
    value, 
    label,
    color = 'indigo'
  }: {
    value: number;
    label: string;
    color?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          {label}
        </span>
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-700'}>
          {value}%
        </span>
      </div>
      <div className={`w-full h-2 rounded-full ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div 
          className={`h-2 rounded-full bg-${color}-600 dark:bg-${color}-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md @container`}>
      <div className={`p-3 @[400px]:p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2 min-w-0">
          <BarChart className={`h-5 w-5 @[400px]:h-6 @[400px]:w-6 flex-shrink-0 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h2 className={`text-sm @[300px]:text-base @[400px]:text-lg @[500px]:text-xl font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Learning Analytics
          </h2>
        </div>
      </div>

      <div className="p-3 @[400px]:p-5 space-y-4 @[400px]:space-y-6 overflow-hidden">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 @[500px]:grid-cols-4 gap-2 @[400px]:gap-4">
          <StatCard
            title="Total Notes"
            value={stats.totalNotes}
            icon={BookOpen}
            change={weeklyComparison.notes.previous > 0 ? weeklyComparison.notes.change : undefined}
          />
          <StatCard
            title="Chat Sessions"
            value={stats.totalChats}
            icon={Brain}
            change={weeklyComparison.chats.previous > 0 ? weeklyComparison.chats.change : undefined}
          />
          <StatCard
            title="Files Analyzed"
            value={stats.totalFiles}
            icon={Upload}
            change={weeklyComparison.files.previous > 0 ? weeklyComparison.files.change : undefined}
          />
          <StatCard
            title="Achievements"
            value={`${stats.completedAchievements}/8`}
            icon={Award}
          />
        </div>

        {/* Skills Progress */}
        <div className={`p-3 @[400px]:p-4 rounded-lg border overflow-hidden ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-xs @[300px]:text-sm @[400px]:text-base @[500px]:text-lg font-medium mb-3 @[400px]:mb-4 truncate ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Skills Progress
          </h3>
          <div className="grid grid-cols-1 @[450px]:grid-cols-2 gap-3 @[400px]:gap-6">
            {/* Reading Skills */}
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-3 @[400px]:mb-4 min-w-0">
                <BookOpen className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Reading
                </h4>
              </div>
              <div className="space-y-3">
                <ProgressBar value={skillProgress.reading.comprehension} label="Comprehension" color="blue" />
                <ProgressBar value={skillProgress.reading.retention} label="Retention" color="blue" />
                <div className="mt-2 flex justify-between text-xs sm:text-sm">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Reading Speed
                  </span>
                  <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>
                    {skillProgress.reading.speed} WPM
                  </span>
                </div>
              </div>
            </div>

            {/* Writing Skills */}
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-3 @[400px]:mb-4 min-w-0">
                <Edit3 className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Writing
                </h4>
              </div>
              <div className="space-y-3">
                <ProgressBar value={skillProgress.writing.structure} label="Structure" color="green" />
                <ProgressBar value={skillProgress.writing.vocabulary} label="Vocabulary" color="green" />
                <ProgressBar value={skillProgress.writing.grammar} label="Grammar" color="green" />
              </div>
            </div>

            {/* Listening Skills */}
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-3 @[400px]:mb-4 min-w-0">
                <Volume2 className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Listening
                </h4>
              </div>
              <div className="space-y-3">
                <ProgressBar value={skillProgress.listening.comprehension} label="Comprehension" color="purple" />
                <ProgressBar value={skillProgress.listening.noteAccuracy} label="Note Accuracy" color="purple" />
              </div>
            </div>

            {/* Speaking Skills */}
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-3 @[400px]:mb-4 min-w-0">
                <Mic className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-amber-400' : 'text-amber-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Speaking
                </h4>
              </div>
              <div className="space-y-3">
                <ProgressBar value={skillProgress.speaking.pronunciation} label="Pronunciation" color="amber" />
                <ProgressBar value={skillProgress.speaking.fluency} label="Fluency" color="amber" />
                <ProgressBar value={skillProgress.speaking.confidence} label="Confidence" color="amber" />
              </div>
            </div>
          </div>
        </div>

        {/* Study Time Analysis */}
        <div className={`p-3 @[400px]:p-4 rounded-lg border overflow-hidden ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-xs @[300px]:text-sm @[400px]:text-base @[500px]:text-lg font-medium mb-3 @[400px]:mb-4 truncate ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Study Time
          </h3>
          <div className="grid grid-cols-1 @[500px]:grid-cols-3 gap-3 @[400px]:gap-4">
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between min-w-0">
                <span className={`text-xs truncate ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Total Hours
                </span>
                <Timer className={`h-4 w-4 flex-shrink-0 ml-2 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
              </div>
              <div className="mt-2 flex flex-wrap items-baseline">
                <span className={`text-lg @[400px]:text-xl @[500px]:text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {studyTimeData.totalHours}h
                </span>
                <span className={`ml-1 text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  ({studyTimeData.weeklyAverage}h/wk)
                </span>
              </div>
            </div>

            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <h4 className={`text-xs font-medium mb-2 @[400px]:mb-3 truncate ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Distribution
              </h4>
              <div className="space-y-2">
                <ProgressBar value={studyTimeData.distribution.morning} label="AM" color="amber" />
                <ProgressBar value={studyTimeData.distribution.afternoon} label="PM" color="amber" />
                <ProgressBar value={studyTimeData.distribution.evening} label="Eve" color="amber" />
              </div>
            </div>

            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between mb-2 @[400px]:mb-3 min-w-0">
                <h4 className={`text-xs font-medium truncate ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Peak
                </h4>
                <Zap className={`h-4 w-4 flex-shrink-0 ml-2 ${
                  isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`} />
              </div>
              <p className={`text-sm @[400px]:text-base font-medium capitalize truncate ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {studyTimeData.mostProductiveTime}
              </p>
              <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {studyTimeData.sessionsPerDay}/day
              </p>
            </div>
          </div>
        </div>

        {/* Completion Rates */}
        <div className={`p-3 @[400px]:p-4 rounded-lg border overflow-hidden ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-xs @[300px]:text-sm @[400px]:text-base @[500px]:text-lg font-medium mb-3 @[400px]:mb-4 truncate ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Completion
          </h3>
          <div className="grid grid-cols-2 @[500px]:grid-cols-4 gap-2 @[400px]:gap-4">
            <StatCard
              title="Reading"
              value={`${completionRates.readingExercises}%`}
              icon={BookMarked}
              color="blue"
            />
            <StatCard
              title="Writing"
              value={`${completionRates.writingAssignments}%`}
              icon={Edit3}
              color="green"
            />
            <StatCard
              title="Listening"
              value={`${completionRates.listeningTasks}%`}
              icon={Volume2}
              color="purple"
            />
            <StatCard
              title="Speaking"
              value={`${completionRates.speakingPractices}%`}
              icon={MessageSquare}
              color="amber"
            />
          </div>
        </div>

        {/* Performance Trends */}
        <div className={`p-3 @[400px]:p-4 rounded-lg border overflow-hidden ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-3 @[400px]:mb-4 min-w-0">
            <h3 className={`text-xs @[300px]:text-sm @[400px]:text-base @[500px]:text-lg font-medium truncate ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Trends
            </h3>
            <LineChart className={`h-4 w-4 flex-shrink-0 ${
              isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
            }`} />
          </div>
          <div className="grid grid-cols-1 @[450px]:grid-cols-2 gap-3 @[400px]:gap-4">
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <h4 className={`text-xs font-medium mb-2 @[400px]:mb-3 truncate ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Speed (WPM)
              </h4>
              <div className="flex items-end space-x-1 h-20 @[400px]:h-24 @[500px]:h-32">
                {performanceTrends.readingSpeed.map((speed, index) => (
                  <div
                    key={index}
                    className={`flex-1 bg-blue-600 dark:bg-blue-500 rounded-t`}
                    style={{ height: `${(speed / 300) * 100}%` }}
                  />
                ))}
              </div>
            </div>

            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <h4 className={`text-xs font-medium mb-2 @[400px]:mb-3 truncate ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Comprehension
              </h4>
              <div className="flex items-end space-x-1 h-20 @[400px]:h-24 @[500px]:h-32">
                {performanceTrends.comprehension.map((score, index) => (
                  <div
                    key={index}
                    className={`flex-1 bg-green-600 dark:bg-green-500 rounded-t`}
                    style={{ height: `${score}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Areas of Improvement */}
        <div className={`p-3 @[400px]:p-4 rounded-lg border overflow-hidden ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-xs @[300px]:text-sm @[400px]:text-base @[500px]:text-lg font-medium mb-3 @[400px]:mb-4 truncate ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Improve
          </h3>
          <div className="grid grid-cols-1 @[400px]:grid-cols-2 @[550px]:grid-cols-3 gap-3 @[400px]:gap-4">
            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-2 @[400px]:mb-3 min-w-0">
                <Target className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-amber-400' : 'text-amber-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Focus
                </h4>
              </div>
              <ul className={`space-y-1.5 text-xs ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {improvementAreas.focusAreas.map((area, index) => (
                  <li key={index} className="flex items-center space-x-2 min-w-0">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0 text-amber-500" />
                    <span className="truncate">{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-2 @[400px]:mb-3 min-w-0">
                <TrendingUp className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Progress
                </h4>
              </div>
              <ul className={`space-y-1.5 text-xs ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {improvementAreas.progressAreas.length > 0 ? (
                  improvementAreas.progressAreas.map((item, index) => (
                    <li key={index} className="flex items-center space-x-2 min-w-0">
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-500" />
                      <span className="truncate">{item.area} +{item.improvement}%</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">Take assessments to track progress</li>
                )}
              </ul>
            </div>

            <div className={`p-3 @[400px]:p-4 rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-white'
            }`}>
              <div className="flex items-center space-x-2 mb-2 @[400px]:mb-3 min-w-0">
                <Activity className={`h-4 w-4 flex-shrink-0 ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`} />
                <h4 className={`text-xs @[350px]:text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Tips
                </h4>
              </div>
              <ul className={`space-y-1.5 text-xs ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {improvementAreas.tips.map((tip, index) => (
                  <li key={index} className="truncate">{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;