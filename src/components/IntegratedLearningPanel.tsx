import React, { useState } from 'react';
import { Layers, BookOpen, Briefcase, User } from 'lucide-react';
import { useStore } from '../store';
import ThematicUnitPanel from './ThematicUnitPanel';
import ProjectBasedLearning from './ProjectBasedLearning';
import PersonalizedLearningPath from './PersonalizedLearningPath';

type TabType = 'thematic' | 'projects' | 'personalized';
type TabIcon = React.ComponentType<{ className?: string }>;

const IntegratedLearningPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('thematic');
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const TabButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: TabIcon; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        activeTab === tab
          ? isDarkMode 
            ? 'bg-indigo-900 text-indigo-200'
            : 'bg-indigo-100 text-indigo-700'
          : isDarkMode
            ? 'text-gray-300 hover:bg-gray-800'
            : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm`}>
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Integrated Learning
            </h2>
          </div>
          <div className="flex space-x-2">
            <TabButton tab="thematic" icon={BookOpen} label="Thematic Units" />
            <TabButton tab="projects" icon={Briefcase} label="Projects" />
            <TabButton tab="personalized" icon={User} label="Personalized" />
          </div>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'thematic' && <ThematicUnitPanel />}
        {activeTab === 'projects' && <ProjectBasedLearning />}
        {activeTab === 'personalized' && <PersonalizedLearningPath />}
      </div>
    </div>
  );
};

export default IntegratedLearningPanel;
