import React, { useState } from 'react'; // Removed unused useEffect
import {
  BookOpen, Layers, // Removed unused Lightbulb, BarChart
  ChevronDown, ChevronUp, Play, CheckCircle,
  Award, User, RefreshCw // Removed unused Settings
} from 'lucide-react';
import { useStore } from '../store';
import { generateAssessment } from '../lib/assessment';
import { extractTextFromFile } from '../lib/fileProcessor';

type LanguageSkill = 'reading' | 'writing' | 'listening' | 'speaking';

interface ThematicUnit {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  skills: LanguageSkill[];
  topics: string[];
  estimatedTime: number; // in minutes
  progress?: number; // 0-100
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  units: ThematicUnit[];
  currentUnitId?: string;
  progress?: number; // 0-100
}

const SAMPLE_UNITS: ThematicUnit[] = [
  {
    id: 'tu-001',
    title: 'Environmental Challenges',
    description: 'Explore global environmental issues through integrated language activities',
    level: 'intermediate',
    skills: ['reading', 'writing', 'listening', 'speaking'],
    topics: ['Climate Change', 'Sustainability', 'Conservation'],
    estimatedTime: 120,
    progress: 65
  },
  {
    id: 'tu-002',
    title: 'Cultural Identity',
    description: 'Discover diverse cultural perspectives and express your own identity',
    level: 'intermediate',
    skills: ['reading', 'writing', 'speaking'],
    topics: ['Traditions', 'Heritage', 'Globalization'],
    estimatedTime: 90,
    progress: 30
  },
  {
    id: 'tu-003',
    title: 'Technology & Society',
    description: 'Analyze how technology shapes modern society and communication',
    level: 'advanced',
    skills: ['reading', 'listening', 'writing'],
    topics: ['Digital Media', 'AI Ethics', 'Future Trends'],
    estimatedTime: 150,
    progress: 10
  },
  {
    id: 'tu-004',
    title: 'Everyday Communication',
    description: 'Master essential communication skills for daily interactions',
    level: 'beginner',
    skills: ['speaking', 'listening', 'reading'],
    topics: ['Greetings', 'Directions', 'Shopping'],
    estimatedTime: 60,
    progress: 0
  }
];

const SAMPLE_PATHS: LearningPath[] = [
  {
    id: 'lp-001',
    title: 'Academic Excellence',
    description: 'Develop advanced language skills for academic success',
    units: [SAMPLE_UNITS[0], SAMPLE_UNITS[2]],
    currentUnitId: 'tu-001',
    progress: 40
  },
  {
    id: 'lp-002',
    title: 'Professional Communication',
    description: 'Build effective communication skills for the workplace',
    units: [SAMPLE_UNITS[3], SAMPLE_UNITS[2]],
    currentUnitId: 'tu-003',
    progress: 5
  },
  {
    id: 'lp-003',
    title: 'Cultural Fluency',
    description: 'Enhance your cultural awareness and expression',
    units: [SAMPLE_UNITS[1], SAMPLE_UNITS[0]],
    currentUnitId: 'tu-002',
    progress: 15
  }
];

const ThematicUnitPanel: React.FC = () => {
  const [units, setUnits] = useState<ThematicUnit[]>(SAMPLE_UNITS);
  const [paths, setPaths] = useState<LearningPath[]>(SAMPLE_PATHS);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'units' | 'paths'>('units');
  const [filterSkill, setFilterSkill] = useState<LanguageSkill | null>(null);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  
  const { getCurrentChat, getNotes, getFiles } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const filteredUnits = units.filter(unit => {
    if (filterSkill && !unit.skills.includes(filterSkill)) return false;
    if (filterLevel && unit.level !== filterLevel) return false;
    return true;
  });

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    setExpandedUnitId(unitId);
  };

  const handlePathSelect = (pathId: string) => {
    setSelectedPathId(pathId);
    // Find the current unit in the path and expand it
    const path = paths.find(p => p.id === pathId);
    if (path?.currentUnitId) {
      setExpandedUnitId(path.currentUnitId);
    }
  };

  const toggleUnitExpand = (unitId: string) => {
    setExpandedUnitId(expandedUnitId === unitId ? null : unitId);
  };

  const generateUnitContent = async (unitId: string) => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const unit = units.find(u => u.id === unitId);
      if (!unit) {
        throw new Error('Unit not found');
      }

      const chatContent = getCurrentChat()?.messages
        .map(m => m.content)
        .join('\n') || '';

      const notesContent = getNotes()
        .map(note => `${note.subject}: ${note.content}`)
        .join('\n');

      let filesContent = '';
      const userFiles = getFiles(); // Call getFiles() to retrieve the files
      if (userFiles.length > 0) {
        for (const file of userFiles) { // Iterate over userFiles
          try {
            const text = await extractTextFromFile(file);
            filesContent += `\nContent from ${file.name}:\n${text}\n`;
          } catch (error) {
            console.error('Error processing file:', file.name, error);
          }
        }
      }

      // Determine which assessment type to generate based on the unit's skills
      let assessmentType = 'general';
      if (unit.skills.includes('reading')) {
        assessmentType = 'reading';
      } else if (unit.skills.includes('writing')) {
        assessmentType = 'writing';
      } else if (unit.skills.includes('speaking')) {
        assessmentType = 'speaking';
      } else if (unit.skills.includes('listening')) {
        assessmentType = 'language-listening';
      }

      // Generate an assessment based on the unit's theme
      await generateAssessment(
        `Theme: ${unit.title}\nTopics: ${unit.topics.join(', ')}\n${chatContent}`, 
        notesContent, 
        filesContent,
        assessmentType,
        3 // Generate 3 questions for the unit
      );

      // Update the unit's progress
      setUnits(prevUnits => 
        prevUnits.map(u => 
          u.id === unitId 
            ? { ...u, progress: Math.min(100, (u.progress || 0) + 10) } 
            : u
        )
      );

      // Also update the progress in any paths that contain this unit
      setPaths(prevPaths => 
        prevPaths.map(path => {
          const unitIndex = path.units.findIndex(u => u.id === unitId);
          if (unitIndex >= 0) {
            // Update the unit in the path
            const updatedUnits = [...path.units];
            updatedUnits[unitIndex] = {
              ...updatedUnits[unitIndex],
              progress: Math.min(100, (updatedUnits[unitIndex].progress || 0) + 10)
            };
            
            // Calculate the overall path progress
            const totalProgress = updatedUnits.reduce((sum, unit) => sum + (unit.progress || 0), 0);
            const averageProgress = totalProgress / updatedUnits.length;
            
            return {
              ...path,
              units: updatedUnits,
              progress: Math.round(averageProgress)
            };
          }
          return path;
        })
      );

    } catch (error) {
      console.error('Error generating unit content:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate unit content');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderSkillBadge = (skill: string, index: number) => {
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
        default:
          return isDarkMode 
            ? 'bg-gray-800 text-gray-300 border-gray-700' 
            : 'bg-gray-100 text-gray-700 border-gray-200';
      }
    };

    return (
      <span 
        key={`${skill}-${index}`} 
        className={`text-xs px-2 py-1 rounded-full border ${getSkillColor(skill)}`}
      >
        {skill.charAt(0).toUpperCase() + skill.slice(1)}
      </span>
    );
  };

  const renderLevelBadge = (level: string) => {
    const getLevelColor = (level: string) => {
      switch (level) {
        case 'beginner':
          return isDarkMode 
            ? 'bg-green-900/30 text-green-300 border-green-800' 
            : 'bg-green-50 text-green-700 border-green-200';
        case 'intermediate':
          return isDarkMode 
            ? 'bg-amber-900/30 text-amber-300 border-amber-800' 
            : 'bg-amber-50 text-amber-700 border-amber-200';
        case 'advanced':
          return isDarkMode 
            ? 'bg-red-900/30 text-red-300 border-red-800' 
            : 'bg-red-50 text-red-700 border-red-200';
        default:
          return isDarkMode 
            ? 'bg-gray-800 text-gray-300 border-gray-700' 
            : 'bg-gray-100 text-gray-700 border-gray-200';
      }
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${getLevelColor(level)}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  const renderProgressBar = (progress: number = 0) => {
    const getProgressColor = (progress: number) => {
      if (progress < 30) return isDarkMode ? 'bg-red-600' : 'bg-red-500';
      if (progress < 70) return isDarkMode ? 'bg-amber-500' : 'bg-amber-500';
      return isDarkMode ? 'bg-green-500' : 'bg-green-600';
    };

    return (
      <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div 
          className={`h-2 rounded-full ${getProgressColor(progress)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  const renderUnitCard = (unit: ThematicUnit) => {
    const isExpanded = expandedUnitId === unit.id;
    const isSelected = selectedUnitId === unit.id;
    
    return (
      <div 
        key={unit.id}
        className={`border rounded-lg transition-all ${
          isSelected
            ? isDarkMode
              ? 'border-indigo-500 bg-indigo-900/20'
              : 'border-indigo-500 bg-indigo-50'
            : isDarkMode
              ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
              : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div 
          className="p-4 cursor-pointer"
          onClick={() => toggleUnitExpand(unit.id)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className={`font-medium text-lg ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {unit.title}
              </h3>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {unit.description}
              </p>
            </div>
            <button className={`p-1 rounded-full ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
            }`}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {unit.skills.map((skill, index) => renderSkillBadge(skill, index))}
            {renderLevelBadge(unit.level)}
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                Progress
              </span>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                {unit.progress || 0}%
              </span>
            </div>
            {renderProgressBar(unit.progress)}
          </div>
        </div>
        
        {isExpanded && (
          <div className={`p-4 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="space-y-3">
              <div>
                <h4 className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Topics
                </h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  {unit.topics.map((topic, index) => (
                    <span 
                      key={index}
                      className={`text-xs px-2 py-1 rounded-full ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Estimated Time
                </h4>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {unit.estimatedTime} minutes
                </p>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => handleUnitSelect(unit.id)}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-600 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select Unit'}
                </button>
                
                <button
                  onClick={() => generateUnitContent(unit.id)}
                  disabled={isGenerating}
                  className={`flex items-center justify-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>Start</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPathCard = (path: LearningPath) => {
    const isSelected = selectedPathId === path.id;
    
    return (
      <div 
        key={path.id}
        className={`border rounded-lg transition-all ${
          isSelected
            ? isDarkMode
              ? 'border-indigo-500 bg-indigo-900/20'
              : 'border-indigo-500 bg-indigo-50'
            : isDarkMode
              ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
              : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className={`font-medium text-lg ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {path.title}
              </h3>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {path.description}
              </p>
            </div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
            }`}>
              <Award className="h-5 w-5" />
            </div>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                Overall Progress
              </span>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                {path.progress || 0}%
              </span>
            </div>
            {renderProgressBar(path.progress)}
          </div>
          
          <div className="mt-4">
            <h4 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Units in this Path
            </h4>
            <div className="space-y-2">
              {path.units.map((unit, index) => (
                <div 
                  key={unit.id}
                  className={`p-2 rounded-lg flex items-center ${
                    path.currentUnitId === unit.id
                      ? isDarkMode
                        ? 'bg-indigo-900/30 border border-indigo-800'
                        : 'bg-indigo-50 border border-indigo-200'
                      : isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-50'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full mr-2 ${
                    (unit.progress || 0) >= 100
                      ? isDarkMode
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-green-100 text-green-700'
                      : isDarkMode
                        ? 'bg-gray-600 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {(unit.progress || 0) >= 100 ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      {unit.title}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      {unit.skills.slice(0, 2).map((skill, i) => (
                        <span 
                          key={`${unit.id}-skill-${i}`}
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            isDarkMode
                              ? 'bg-gray-800 text-gray-300'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </span>
                      ))}
                      {unit.skills.length > 2 && (
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          +{unit.skills.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div 
                        className={`h-1.5 rounded-full ${
                          (unit.progress || 0) >= 100
                            ? 'bg-green-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${unit.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => handlePathSelect(path.id)}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                isSelected
                  ? isDarkMode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isSelected ? 'Selected' : 'Select Path'}
            </button>
            
            <button
              onClick={() => {
                // Find the current unit in the path and generate content for it
                if (path.currentUnitId) {
                  generateUnitContent(path.currentUnitId);
                }
              }}
              disabled={isGenerating || !path.currentUnitId}
              className={`flex items-center justify-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              } ${(isGenerating || !path.currentUnitId) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>Continue</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  if (isGenerating) {
    return (
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <RefreshCw className={`h-8 w-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} animate-spin`} />
            <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Generating thematic units based on your activity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md`}>
      <div className={`p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Cross-Skill Integration
            </h2>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('units')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'units'
                  ? isDarkMode
                    ? 'bg-indigo-900/50 text-indigo-300'
                    : 'bg-indigo-100 text-indigo-700'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-1">
                <BookOpen className="h-4 w-4" />
                <span>Thematic Units</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('paths')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'paths'
                  ? isDarkMode
                    ? 'bg-indigo-900/50 text-indigo-300'
                    : 'bg-indigo-100 text-indigo-700'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>Learning Paths</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'units' && (
        <div className="p-5">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Filter by Skill
              </label>
              <select
                aria-label="Filter by Skill" // Added aria-label
                value={filterSkill || ''}
                onChange={(e) => setFilterSkill(e.target.value || null)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } shadow-sm`}
              >
                <option value="">All Skills</option>
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="listening">Listening</option>
                <option value="speaking">Speaking</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Filter by Level
              </label>
              <select
                aria-label="Filter by Level" // Added aria-label
                value={filterLevel || ''}
                onChange={(e) => setFilterLevel(e.target.value || null)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } shadow-sm`}
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          
          {error && (
            <div className={`mb-4 p-3 rounded-lg ${
              isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
            } shadow-sm`}>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {filteredUnits.length === 0 ? (
              <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg">No units match your filters</p>
              </div>
            ) : (
              filteredUnits.map(unit => renderUnitCard(unit))
            )}
          </div>
        </div>
      )}

      {activeTab === 'paths' && (
        <div className="p-5">
          {error && (
            <div className={`mb-4 p-3 rounded-lg ${
              isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
            } shadow-sm`}>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {paths.map(path => renderPathCard(path))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThematicUnitPanel;
