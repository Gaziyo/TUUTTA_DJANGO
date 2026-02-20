import React, { useState } from 'react';
import { LayoutTemplate, X, Check, Clock, Users, BookOpen, Star, Sparkles, ChevronRight } from 'lucide-react';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'compliance' | 'onboarding' | 'safety' | 'skills' | 'custom';
  icon: React.ReactNode;
  color: string;
  estimatedTime: string;
  targetAudience: string;
  modules: number;
  lessons: number;
  learningObjectives: string[];
  suggestedSources: string[];
  popularity?: number;
}

const defaultTemplates: ProjectTemplate[] = [
  {
    id: 'compliance-basic',
    name: 'Compliance Essentials',
    description: 'Standard compliance training with policy review, scenario-based assessments, and certification.',
    category: 'compliance',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#3b82f6',
    estimatedTime: '2-3 hours',
    targetAudience: 'All employees',
    modules: 4,
    lessons: 12,
    learningObjectives: [
      'Understand key compliance policies',
      'Identify potential compliance risks',
      'Apply proper reporting procedures'
    ],
    suggestedSources: ['Employee Handbook', 'Code of Conduct', 'Compliance Policy'],
    popularity: 95
  },
  {
    id: 'onboarding-newhire',
    name: 'New Employee Onboarding',
    description: 'Comprehensive onboarding program covering company culture, policies, and role-specific training.',
    category: 'onboarding',
    icon: <Users className="w-6 h-6" />,
    color: '#10b981',
    estimatedTime: '4-6 hours',
    targetAudience: 'New hires',
    modules: 6,
    lessons: 18,
    learningObjectives: [
      'Understand company culture and values',
      'Complete required policy training',
      'Meet key team members and stakeholders'
    ],
    suggestedSources: ['Employee Handbook', 'Benefits Guide', 'IT Security Policy'],
    popularity: 88
  },
  {
    id: 'safety-workplace',
    name: 'Workplace Safety',
    description: 'Safety training covering emergency procedures, hazard identification, and incident reporting.',
    category: 'safety',
    icon: <Star className="w-6 h-6" />,
    color: '#f59e0b',
    estimatedTime: '1-2 hours',
    targetAudience: 'All employees',
    modules: 3,
    lessons: 9,
    learningObjectives: [
      'Identify workplace hazards',
      'Understand emergency procedures',
      'Know how to report incidents'
    ],
    suggestedSources: ['Safety Manual', 'Emergency Procedures', 'OSHA Guidelines'],
    popularity: 92
  },
  {
    id: 'skills-leadership',
    name: 'Leadership Fundamentals',
    description: 'Develop core leadership skills including communication, delegation, and team management.',
    category: 'skills',
    icon: <Sparkles className="w-6 h-6" />,
    color: '#8b5cf6',
    estimatedTime: '6-8 hours',
    targetAudience: 'Managers & Supervisors',
    modules: 5,
    lessons: 15,
    learningObjectives: [
      'Develop effective communication skills',
      'Learn delegation techniques',
      'Build high-performing teams'
    ],
    suggestedSources: ['Leadership Guide', 'Communication Best Practices'],
    popularity: 76
  },
  {
    id: 'compliance-hipaa',
    name: 'HIPAA Compliance',
    description: 'Healthcare privacy and security training for handling protected health information.',
    category: 'compliance',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#ef4444',
    estimatedTime: '2 hours',
    targetAudience: 'Healthcare staff',
    modules: 3,
    lessons: 10,
    learningObjectives: [
      'Understand HIPAA requirements',
      'Protect patient privacy',
      'Handle PHI appropriately'
    ],
    suggestedSources: ['HIPAA Policy', 'Privacy Procedures'],
    popularity: 84
  },
  {
    id: 'safety-cyber',
    name: 'Cybersecurity Awareness',
    description: 'Essential cybersecurity training covering phishing, passwords, and data protection.',
    category: 'safety',
    icon: <Star className="w-6 h-6" />,
    color: '#06b6d4',
    estimatedTime: '1 hour',
    targetAudience: 'All employees',
    modules: 2,
    lessons: 6,
    learningObjectives: [
      'Identify phishing attempts',
      'Create strong passwords',
      'Protect sensitive data'
    ],
    suggestedSources: ['IT Security Policy', 'Password Guidelines'],
    popularity: 98
  }
];

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

const categoryLabels: Record<string, string> = {
  compliance: 'Compliance',
  onboarding: 'Onboarding',
  safety: 'Safety',
  skills: 'Skills',
  custom: 'Custom'
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  isOpen,
  onClose,
  isDarkMode = false,
  onSelectTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(defaultTemplates.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'all'
    ? defaultTemplates
    : defaultTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl mx-4 flex flex-col ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <LayoutTemplate className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Project Templates
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Choose a template to jumpstart your course creation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter */}
        <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? isDarkMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All Templates' : categoryLabels[category]}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                className={`relative text-left rounded-xl border p-4 transition-all duration-200 genie-card-hover ${
                  selectedTemplate?.id === template.id
                    ? isDarkMode
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-indigo-400 bg-indigo-50'
                    : isDarkMode
                      ? 'border-gray-800 bg-gray-900 hover:border-gray-700'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Popularity Badge */}
                {template.popularity && template.popularity > 90 && (
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    Popular
                  </div>
                )}

                {/* Icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ 
                    backgroundColor: `${template.color}20`,
                    color: template.color 
                  }}
                >
                  {template.icon}
                </div>

                {/* Content */}
                <h3 className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {template.name}
                </h3>
                <p className={`text-xs mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {template.description}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {template.estimatedTime}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <BookOpen className="w-3 h-3" />
                    {template.modules} modules
                  </span>
                </div>

                {/* Expanded Info on Hover */}
                {hoveredTemplate === template.id && (
                  <div className={`absolute inset-x-0 bottom-0 p-4 rounded-b-xl border-t ${
                    isDarkMode 
                      ? 'bg-gray-800/95 border-gray-700' 
                      : 'bg-white/95 border-gray-200'
                  }`}>
                    <p className={`text-[10px] font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Learning Objectives:
                    </p>
                    <ul className={`text-[10px] space-y-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {template.learningObjectives.slice(0, 2).map((obj, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{obj}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-indigo-500">
                      Click to preview <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {filteredTemplates.length} templates available
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => selectedTemplate && onSelectTemplate(selectedTemplate)}
                disabled={!selectedTemplate}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 genie-btn-press ${
                  selectedTemplate
                    ? isDarkMode
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Use Template
              </button>
            </div>
          </div>
        </div>

        {/* Template Preview Modal */}
        {selectedTemplate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={`w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}>
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${selectedTemplate.color}20`,
                      color: selectedTemplate.color 
                    }}
                  >
                    {selectedTemplate.icon}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTemplate.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`grid grid-cols-3 gap-3 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="text-center">
                      <Clock className={`w-4 h-4 mx-auto mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedTemplate.estimatedTime}</p>
                    </div>
                    <div className="text-center">
                      <Users className={`w-4 h-4 mx-auto mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedTemplate.targetAudience}</p>
                    </div>
                    <div className="text-center">
                      <BookOpen className={`w-4 h-4 mx-auto mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{selectedTemplate.modules} modules, {selectedTemplate.lessons} lessons</p>
                    </div>
                  </div>

                  <div>
                    <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Learning Objectives
                    </p>
                    <ul className="space-y-1.5">
                      {selectedTemplate.learningObjectives.map((obj, i) => (
                        <li key={i} className={`flex items-start gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-500" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Suggested Sources
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.suggestedSources.map((source, i) => (
                        <span 
                          key={i}
                          className={`px-2 py-1 rounded text-[10px] ${
                            isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-gray-200'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => onSelectTemplate(selectedTemplate)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 genie-btn-press ${
                      isDarkMode
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateGallery;
