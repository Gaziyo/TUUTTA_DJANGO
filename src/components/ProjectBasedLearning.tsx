import React, { useState } from 'react';
import { 
  Briefcase, CheckCircle2, Clock, Users, 
  ChevronDown, ChevronUp,
  BookOpen, Mic, Edit3, Volume2
} from 'lucide-react';
import { useStore } from '../store';

interface ProjectSkill {
  name: string;
  type: 'reading' | 'writing' | 'listening' | 'speaking';
  description: string;
  completed: boolean;
}

interface ProjectTask {
  id: string;
  title: string;
  description: string;
  skills: ProjectSkill[];
  estimatedTime: number; // in minutes
  completed: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tasks: ProjectTask[];
  collaborators?: number;
  progress: number; // 0-100
  theme: string;
}

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    title: 'Environmental Documentary',
    description: 'Create a short documentary about local environmental issues, combining research, script writing, interviews, and presentation skills.',
    difficulty: 'intermediate',
    theme: 'Environment & Sustainability',
    tasks: [
      {
        id: 'task-001',
        title: 'Research Phase',
        description: 'Research local environmental issues using provided materials and external sources.',
        skills: [
          {
            name: 'Research Reading',
            type: 'reading',
            description: 'Read and analyze articles about environmental issues',
            completed: true
          },
          {
            name: 'Note Taking',
            type: 'writing',
            description: 'Take structured notes on key findings',
            completed: true
          }
        ],
        estimatedTime: 60,
        completed: true
      },
      {
        id: 'task-002',
        title: 'Script Development',
        description: 'Write a script for your documentary that presents the issues and potential solutions.',
        skills: [
          {
            name: 'Outline Creation',
            type: 'writing',
            description: 'Create a structured outline for your documentary',
            completed: true
          },
          {
            name: 'Script Writing',
            type: 'writing',
            description: 'Write a clear, engaging script with proper terminology',
            completed: false
          }
        ],
        estimatedTime: 90,
        completed: false
      },
      {
        id: 'task-003',
        title: 'Interview Preparation',
        description: 'Prepare questions and practice interviewing techniques.',
        skills: [
          {
            name: 'Question Formulation',
            type: 'writing',
            description: 'Create effective open-ended questions',
            completed: false
          },
          {
            name: 'Interview Practice',
            type: 'speaking',
            description: 'Practice interview techniques with clear pronunciation',
            completed: false
          }
        ],
        estimatedTime: 45,
        completed: false
      },
      {
        id: 'task-004',
        title: 'Final Presentation',
        description: 'Present your documentary findings with visual aids.',
        skills: [
          {
            name: 'Presentation Delivery',
            type: 'speaking',
            description: 'Present information clearly with appropriate pacing',
            completed: false
          },
          {
            name: 'Q&A Session',
            type: 'listening',
            description: 'Listen and respond to questions about your project',
            completed: false
          }
        ],
        estimatedTime: 30,
        completed: false
      }
    ],
    collaborators: 3,
    progress: 35
  },
  {
    id: 'proj-002',
    title: 'Cultural Exchange Blog',
    description: 'Develop a blog exploring cultural differences and similarities, practicing research, writing, and multimedia communication.',
    difficulty: 'beginner',
    theme: 'Cultural Identity',
    tasks: [
      {
        id: 'task-005',
        title: 'Topic Research',
        description: 'Research cultural topics of interest using provided materials.',
        skills: [
          {
            name: 'Cultural Reading',
            type: 'reading',
            description: 'Read and comprehend texts about different cultures',
            completed: false
          }
        ],
        estimatedTime: 45,
        completed: false
      },
      {
        id: 'task-006',
        title: 'Blog Planning',
        description: 'Plan your blog structure and content approach.',
        skills: [
          {
            name: 'Content Planning',
            type: 'writing',
            description: 'Outline blog posts with clear structure',
            completed: false
          }
        ],
        estimatedTime: 30,
        completed: false
      },
      {
        id: 'task-007',
        title: 'Content Creation',
        description: 'Write blog posts with appropriate cultural sensitivity.',
        skills: [
          {
            name: 'Blog Writing',
            type: 'writing',
            description: 'Write engaging, culturally sensitive content',
            completed: false
          }
        ],
        estimatedTime: 120,
        completed: false
      },
      {
        id: 'task-008',
        title: 'Multimedia Integration',
        description: 'Record audio introductions for your blog posts.',
        skills: [
          {
            name: 'Audio Recording',
            type: 'speaking',
            description: 'Record clear audio with proper pronunciation',
            completed: false
          }
        ],
        estimatedTime: 60,
        completed: false
      }
    ],
    collaborators: 2,
    progress: 0
  },
  {
    id: 'proj-003',
    title: 'Business Proposal Presentation',
    description: 'Develop and present a business proposal, integrating professional writing, speaking, and listening skills.',
    difficulty: 'advanced',
    theme: 'Business & Entrepreneurship',
    tasks: [
      {
        id: 'task-009',
        title: 'Market Research',
        description: 'Research market trends and potential opportunities.',
        skills: [
          {
            name: 'Business Reading',
            type: 'reading',
            description: 'Analyze business texts and extract key information',
            completed: true
          },
          {
            name: 'Data Analysis',
            type: 'reading',
            description: 'Interpret charts, graphs, and business data',
            completed: true
          }
        ],
        estimatedTime: 90,
        completed: true
      },
      {
        id: 'task-010',
        title: 'Proposal Writing',
        description: 'Write a comprehensive business proposal document.',
        skills: [
          {
            name: 'Business Writing',
            type: 'writing',
            description: 'Write with formal business language and structure',
            completed: true
          }
        ],
        estimatedTime: 120,
        completed: true
      },
      {
        id: 'task-011',
        title: 'Presentation Development',
        description: 'Create a compelling presentation of your business proposal.',
        skills: [
          {
            name: 'Slide Creation',
            type: 'writing',
            description: 'Create clear, concise presentation slides',
            completed: false
          },
          {
            name: 'Speech Preparation',
            type: 'speaking',
            description: 'Prepare a persuasive presentation speech',
            completed: false
          }
        ],
        estimatedTime: 60,
        completed: false
      },
      {
        id: 'task-012',
        title: 'Pitch Practice',
        description: 'Practice delivering your business pitch and handling questions.',
        skills: [
          {
            name: 'Presentation Delivery',
            type: 'speaking',
            description: 'Deliver a confident, persuasive business pitch',
            completed: false
          },
          {
            name: 'Q&A Handling',
            type: 'listening',
            description: 'Listen carefully to questions and respond appropriately',
            completed: false
          }
        ],
        estimatedTime: 45,
        completed: false
      }
    ],
    collaborators: 4,
    progress: 50
  }
];

const ProjectBasedLearning: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setExpandedProjectId(projectId);
  };

  const handleCompleteTask = (projectId: string, taskId: string) => {
    setProjects(prevProjects => 
      prevProjects.map(project => {
        if (project.id !== projectId) return project;
        
        const updatedTasks = project.tasks.map(task => {
          if (task.id !== taskId) return task;
          return { ...task, completed: true };
        });
        
        // Calculate new progress
        const completedTasks = updatedTasks.filter(task => task.completed).length;
        const progress = Math.round((completedTasks / updatedTasks.length) * 100);
        
        return {
          ...project,
          tasks: updatedTasks,
          progress
        };
      })
    );
  };

  const handleCompleteSkill = (projectId: string, taskId: string, skillName: string) => {
    setProjects(prevProjects => 
      prevProjects.map(project => {
        if (project.id !== projectId) return project;
        
        const updatedTasks = project.tasks.map(task => {
          if (task.id !== taskId) return task;
          
          const updatedSkills = task.skills.map(skill => {
            if (skill.name !== skillName) return skill;
            return { ...skill, completed: true };
          });
          
          // Check if all skills are completed
          const allSkillsCompleted = updatedSkills.every(skill => skill.completed);
          
          return { 
            ...task, 
            skills: updatedSkills,
            completed: allSkillsCompleted
          };
        });
        
        // Calculate new progress
        const completedTasks = updatedTasks.filter(task => task.completed).length;
        const progress = Math.round((completedTasks / updatedTasks.length) * 100);
        
        return {
          ...project,
          tasks: updatedTasks,
          progress
        };
      })
    );
  };

  const filteredProjects = projects.filter(project => {
    if (filterDifficulty && project.difficulty !== filterDifficulty) return false;
    if (filterTheme && project.theme !== filterTheme) return false;
    return true;
  });

  const uniqueThemes = Array.from(new Set(projects.map(project => project.theme)));

  const renderSkillBadge = (skill: ProjectSkill) => {
    const getSkillColor = (type: string) => {
      switch (type) {
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

    const getSkillIcon = (type: string) => {
      switch (type) {
        case 'reading':
          return <BookOpen className="h-3 w-3" />;
        case 'writing':
          return <Edit3 className="h-3 w-3" />;
        case 'listening':
          return <Volume2 className="h-3 w-3" />;
        case 'speaking':
          return <Mic className="h-3 w-3" />;
        default:
          return null;
      }
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full border flex items-center space-x-1 ${
        skill.completed
          ? isDarkMode
            ? 'bg-green-900/30 text-green-300 border-green-800'
            : 'bg-green-50 text-green-700 border-green-200'
          : getSkillColor(skill.type)
      }`}>
        {getSkillIcon(skill.type)}
        <span>{skill.name}</span>
        {skill.completed && <CheckCircle2 className="h-3 w-3 ml-1" />}
      </span>
    );
  };

  const renderDifficultyBadge = (difficulty: string) => {
    const getDifficultyColor = (level: string) => {
      switch (level) {
        case 'beginner':
          return isDarkMode 
            ? 'bg-green-900/30 text-green-300 border-green-800' 
            : 'bg-green-50 text-green-700 border-green-200';
        case 'intermediate':
          return isDarkMode 
            ? 'bg-amber-900 /30 text-amber-300 border-amber-800' 
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
      <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(difficulty)}`}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
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

  const renderProjectCard = (project: Project) => {
    const isExpanded = expandedProjectId === project.id;
    const isSelected = selectedProjectId === project.id;
    
    return (
      <div 
        key={project.id}
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
          onClick={() => toggleProjectExpand(project.id)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className={`font-medium text-lg ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {project.title}
              </h3>
              <p className={`text-sm mt-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {project.description}
              </p>
            </div>
            <button className={`p-1 rounded-full ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
            }`}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {renderDifficultyBadge(project.difficulty)}
            <span className={`text-xs px-2 py-1 rounded-full border flex items-center space-x-1 ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 border-gray-600'
                : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}>
              <Clock className="h-3 w-3" />
              <span>
                {project.tasks.reduce((total, task) => total + task.estimatedTime, 0)} min
              </span>
            </span>
            {project.collaborators && (
              <span className={`text-xs px-2 py-1 rounded-full border flex items-center space-x-1 ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-300 border-gray-600'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                <Users className="h-3 w-3" />
                <span>{project.collaborators} collaborators</span>
              </span>
            )}
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                Progress
              </span>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                {project.progress}%
              </span>
            </div>
            {renderProgressBar(project.progress)}
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
                  Project Tasks
                </h4>
                <div className="space-y-3">
                  {project.tasks.map((task) => {
                    const isTaskExpanded = expandedTaskId === task.id;
                    
                    return (
                      <div 
                        key={task.id}
                        className={`border rounded-lg ${
                          task.completed
                            ? isDarkMode
                              ? 'border-green-700 bg-green-900/20'
                              : 'border-green-200 bg-green-50'
                            : isDarkMode
                              ? 'border-gray-700 bg-gray-700'
                              : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div 
                          className="p-3 cursor-pointer flex justify-between items-center"
                          onClick={() => toggleTaskExpand(task.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                              task.completed
                                ? isDarkMode
                                  ? 'bg-green-700 text-green-200'
                                  : 'bg-green-500 text-white'
                                : isDarkMode
                                  ? 'bg-gray-600 text-gray-300'
                                  : 'bg-gray-300 text-gray-600'
                            }`}>
                              {task.completed ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <span className="text-xs">{project.tasks.indexOf(task) + 1}</span>
                              )}
                            </div>
                            <span className={`font-medium ${
                              isDarkMode ? 'text-gray-200' : 'text-gray-700'
                            }`}>
                              {task.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs flex items-center space-x-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              <Clock className="h-3 w-3" />
                              <span>{task.estimatedTime} min</span>
                            </span>
                            <button className={`p-1 rounded-full ${
                              isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'
                            }`}>
                              {isTaskExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>
                        
                        {isTaskExpanded && (
                          <div className={`p-3 border-t ${
                            isDarkMode ? 'border-gray-600' : 'border-gray-200'
                          }`}>
                            <p className={`text-sm mb-3 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              {task.description}
                            </p>
                            
                            <h5 className={`text-xs font-medium mb-2 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Skills Practiced
                            </h5>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {task.skills.map((skill, index) => (
                                <div key={index} className="flex items-center">
                                  {renderSkillBadge(skill)}
                                  {!skill.completed && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCompleteSkill(project.id, task.id, skill.name);
                                      }}
                                      className={`ml-1 p-1 rounded-full ${
                                        isDarkMode
                                          ? 'text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                                          : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                      }`}
                                      title="Mark as completed"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {!task.completed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteTask(project.id, task.id);
                                }}
                                className={`w-full py-1.5 rounded-lg text-sm transition-colors ${
                                  isDarkMode
                                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                Complete Task
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <button
                onClick={() => handleSelectProject(project.id)}
                className={`w-full py-2 rounded-lg transition-colors ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isSelected ? 'Selected' : 'Select Project'}
              </button>
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
            <Briefcase className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Project-Based Learning
            </h2>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className={`block text-xs font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Filter by Difficulty
            </label>
            <select
              value={filterDifficulty || ''}
              onChange={(e) => setFilterDifficulty(e.target.value || null)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className={`block text-xs font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Filter by Theme
            </label>
            <select
              value={filterTheme || ''}
              onChange={(e) => setFilterTheme(e.target.value || null)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Themes</option>
              {uniqueThemes.map((theme, index) => (
                <option key={index} value={theme}>{theme}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No projects match your filters
            </div>
          ) : (
            filteredProjects.map(project => renderProjectCard(project))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectBasedLearning;
