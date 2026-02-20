import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, Award, ArrowRight, 
  ChevronRight, ChevronDown, BookOpen, 
  Mic, Edit3, Volume2, CheckCircle2, 
  RefreshCw, Settings, X
} from 'lucide-react';
import { useStore } from '../store';

interface SkillLevel {
  skill: 'reading' | 'writing' | 'listening' | 'speaking';
  level: number; // 1-10
  lastAssessed: string; // date string
}

interface RecommendedActivity {
  id: string;
  title: string;
  description: string;
  type: 'reading' | 'writing' | 'listening' | 'speaking' | 'integrated';
  difficulty: number; // 1-10
  estimatedTime: number; // in minutes
  completed: boolean;
  skillsTargeted: {
    skill: 'reading' | 'writing' | 'listening' | 'speaking';
    focus: number; // 1-10, how much this activity focuses on this skill
  }[];
}

interface UserProfile {
  id: string;
  name: string;
  skillLevels: SkillLevel[];
  learningPreferences: string[];
  interests: string[];
  completedActivities: number;
  streak: number; // days in a row with activity
  nextMilestone: number;
}

const SAMPLE_ACTIVITIES: RecommendedActivity[] = [
  {
    id: 'act-001',
    title: 'Advanced Reading Comprehension',
    description: 'Practice extracting key information from complex texts about technology trends.',
    type: 'reading',
    difficulty: 8,
    estimatedTime: 25,
    completed: false,
    skillsTargeted: [
      { skill: 'reading', focus: 9 },
      { skill: 'writing', focus: 3 }
    ]
  },
  {
    id: 'act-002',
    title: 'Business Email Writing',
    description: 'Improve your professional writing skills by drafting clear and effective business emails.',
    type: 'writing',
    difficulty: 6,
    estimatedTime: 20,
    completed: false,
    skillsTargeted: [
      { skill: 'writing', focus: 9 },
      { skill: 'reading', focus: 2 }
    ]
  },
  {
    id: 'act-003',
    title: 'Environmental Podcast Comprehension',
    description: 'Listen to a podcast about climate solutions and answer detailed questions.',
    type: 'listening',
    difficulty: 7,
    estimatedTime: 30,
    completed: false,
    skillsTargeted: [
      { skill: 'listening', focus: 9 },
      { skill: 'speaking', focus: 1 }
    ]
  },
  {
    id: 'act-004',
    title: 'Travel Scenario Role-Play',
    description: 'Practice speaking in common travel situations like booking accommodations and asking for directions.',
    type: 'speaking',
    difficulty: 5,
    estimatedTime: 15,
    completed: false,
    skillsTargeted: [
      { skill: 'speaking', focus: 8 },
      { skill: 'listening', focus: 6 }
    ]
  },
  {
    id: 'act-005',
    title: 'Integrated Business Presentation',
    description: 'Research, write, and deliver a short presentation about a business innovation.',
    type: 'integrated',
    difficulty: 7,
    estimatedTime: 45,
    completed: false,
    skillsTargeted: [
      { skill: 'speaking', focus: 7 },
      { skill: 'writing', focus: 6 },
      { skill: 'reading', focus: 5 },
      { skill: 'listening', focus: 3 }
    ]
  }
];

const PersonalizedLearningPath: React.FC = () => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  
  // Create a sample profile using the actual user's name
  const createSampleProfile = useCallback((): UserProfile => {
    return {
      id: 'user-001',
      name: user?.name || 'User',
      skillLevels: [
        { skill: 'reading', level: 7, lastAssessed: '2025-05-10' },
        { skill: 'writing', level: 5, lastAssessed: '2025-05-12' },
        { skill: 'listening', level: 8, lastAssessed: '2025-05-08' },
        { skill: 'speaking', level: 4, lastAssessed: '2025-05-15' }
      ],
      learningPreferences: ['Visual learning', 'Interactive exercises', 'Real-world examples'],
      interests: ['Technology', 'Environmental science', 'Travel', 'Business'],
      completedActivities: 28,
      streak: 5,
      nextMilestone: 30
    };
  }, [user?.name]);

  const [profile, setProfile] = useState<UserProfile>(() => createSampleProfile());
  const [recommendedActivities, setRecommendedActivities] = useState<RecommendedActivity[]>(SAMPLE_ACTIVITIES);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [newInterest, setNewInterest] = useState('');

  // Update profile when user changes
  useEffect(() => {
    setProfile(createSampleProfile());
  }, [createSampleProfile]);

  const toggleActivityExpand = (activityId: string) => {
    setExpandedActivityId(expandedActivityId === activityId ? null : activityId);
  };

  const handleCompleteActivity = (activityId: string) => {
    // Update the activity
    setRecommendedActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, completed: true } 
          : activity
      )
    );
    
    // Update user profile
    setProfile(prev => ({
      ...prev,
      completedActivities: prev.completedActivities + 1,
      // Update skill levels based on the completed activity
      skillLevels: prev.skillLevels.map(skillLevel => {
        const activity = recommendedActivities.find(a => a.id === activityId);
        const skillTarget = activity?.skillsTargeted.find(st => st.skill === skillLevel.skill);
        
        if (skillTarget && skillTarget.focus > 5) {
          // Increase skill level if this activity had a high focus on this skill
          return {
            ...skillLevel,
            level: Math.min(10, skillLevel.level + 0.5),
            lastAssessed: new Date().toISOString().split('T')[0]
          };
        }
        return skillLevel;
      })
    }));
  };

  const refreshRecommendations = () => {
    setIsRefreshing(true);
    
    // Simulate API call to get new recommendations
    setTimeout(() => {
      // Reset completion status of activities
      setRecommendedActivities(prev => 
        prev.map(activity => ({ ...activity, completed: false }))
      );
      setIsRefreshing(false);
    }, 1500);
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      setProfile(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'reading':
        return <BookOpen className="h-4 w-4" />;
      case 'writing':
        return <Edit3 className="h-4 w-4" />;
      case 'listening':
        return <Volume2 className="h-4 w-4" />;
      case 'speaking':
        return <Mic className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSkillColor = (skill: string) => {
    switch (skill) {
      case 'reading':
        return isDarkMode 
          ? 'bg-blue-900/30 text-blue-300 border-blue-800' 
          : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'writing':
        return isDarkMode 
          ? 'bg-green-900/30 text-green-300 border-green-800' 
          : 'bg-green-50 text-green-700 border-green-200';
      case 'listening':
        return isDarkMode 
          ? 'bg-purple-900/30 text-purple-300 border-purple-800' 
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'speaking':
        return isDarkMode 
          ? 'bg-amber-900/30 text-amber-300 border-amber-800' 
          : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'integrated':
        return isDarkMode 
          ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' 
          : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return isDarkMode 
          ? 'bg-gray-800 text-gray-300 border-gray-700' 
          : 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const renderSkillLevel = (skill: SkillLevel) => {
    return (
      <div key={skill.skill} className="flex-1 min-w-[120px]">
        <div className="flex items-center space-x-2 mb-1">
          {getSkillIcon(skill.skill)}
          <span className={`text-sm font-medium ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            {skill.skill.charAt(0).toUpperCase() + skill.skill.slice(1)}
          </span>
        </div>
        <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div 
            className={`h-2 rounded-full ${
              isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${(skill.level / 10) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Level {skill.level}
          </span>
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(skill.lastAssessed).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  };

  const renderActivityCard = (activity: RecommendedActivity) => {
    const isExpanded = expandedActivityId === activity.id;
    
    return (
      <div 
        key={activity.id}
        className={`border rounded-lg transition-all ${
          activity.completed
            ? isDarkMode
              ? 'border-green-700 bg-green-900/20'
              : 'border-green-200 bg-green-50'
            : isDarkMode
              ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
              : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div 
          className="p-4 cursor-pointer"
          onClick={() => toggleActivityExpand(activity.id)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getSkillColor(activity.type)}`}>
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </span>
                {activity.completed && (
                  <span className={`flex items-center space-x-1 text-xs ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Completed</span>
                  </span>
                )}
              </div>
              <h3 className={`font-medium text-lg mt-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {activity.title}
              </h3>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {activity.description}
              </p>
            </div>
            <button className={`p-1 rounded-full ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
            }`}>
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
          
          <div className="flex items-center space-x-4 mt-3">
            <span className={`flex items-center space-x-1 text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <span>Difficulty:</span>
              <span className="font-medium">{activity.difficulty}/10</span>
            </span>
            <span className={`flex items-center space-x-1 text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <span>Time:</span>
              <span className="font-medium">{activity.estimatedTime} min</span>
            </span>
          </div>
        </div>
        
        {isExpanded && (
          <div className={`p-4 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="space-y-4">
              <div>
                <h4 className={`text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Skills Targeted
                </h4>
                <div className="flex flex-wrap gap-3">
                  {activity.skillsTargeted.map((skillTarget, index) => (
                    <div key={index} className="flex-1 min-w-[100px]">
                      <div className="flex items-center space-x-1 mb-1">
                        {getSkillIcon(skillTarget.skill)}
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {skillTarget.skill.charAt(0).toUpperCase() + skillTarget.skill.slice(1)}
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-1.5 rounded-full ${getSkillColor(skillTarget.skill).split(' ')[0]}`}
                          style={{ width: `${(skillTarget.focus / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {!activity.completed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompleteActivity(activity.id);
                  }}
                  className={`w-full py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Mark as Completed
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm`}>
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Personalized Learning Path
            </h2>
          </div>
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className={`p-2 rounded-lg transition-colors ${
              showPreferences
                ? isDarkMode
                  ? 'bg-indigo-900/50 text-indigo-300'
                  : 'bg-indigo-100 text-indigo-700'
                : isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Learning Preferences"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className={`mb-6 p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
              }`}>
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {profile.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {profile.completedActivities} activities completed
                  </span>
                  <span className={`flex items-center space-x-1 text-xs px-2 py-0.5 rounded-full ${
                    isDarkMode
                      ? 'bg-amber-900/30 text-amber-300'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <Award className="h-3 w-3" />
                    <span>{profile.streak} day streak</span>
                  </span>
                </div>
              </div>
            </div>
            <div className={`text-center ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <div className="text-xs mb-1">Next Milestone</div>
              <div className="flex items-center space-x-1">
                <span className="font-medium">{profile.completedActivities}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">{profile.nextMilestone}</span>
              </div>
              <div className={`w-16 h-1.5 mt-1 rounded-full mx-auto ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                <div 
                  className={`h-1.5 rounded-full ${
                    isDarkMode ? 'bg-indigo-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${(profile.completedActivities / profile.nextMilestone) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <h4 className={`text-sm font-medium mb-3 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Your Skill Levels
          </h4>
          <div className="flex flex-wrap gap-4">
            {profile.skillLevels.map(skill => renderSkillLevel(skill))}
          </div>
        </div>
        
        {showPreferences && (
          <div className={`mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h4 className={`text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Learning Preferences
            </h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.learningPreferences.map((pref, index) => (
                <span 
                  key={index}
                  className={`text-xs px-2 py-1 rounded-full ${
                    isDarkMode
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {pref}
                </span>
              ))}
            </div>
            
            <h4 className={`text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Your Interests
            </h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.interests.map((interest, index) => (
                <div 
                  key={index}
                  className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                    isDarkMode
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <span>{interest}</span>
                  <button
                    onClick={() => removeInterest(interest)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add new interest..."
                className={`flex-1 px-3 py-2 text-sm border rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              <button
                onClick={addInterest}
                disabled={!newInterest.trim()}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  isDarkMode
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } ${!newInterest.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Add
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-medium ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Recommended Activities
          </h3>
          <button
            onClick={refreshRecommendations}
            disabled={isRefreshing}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="space-y-4">
          {recommendedActivities.map(activity => renderActivityCard(activity))}
        </div>
      </div>
    </div>
  );
};

export default PersonalizedLearningPath;
