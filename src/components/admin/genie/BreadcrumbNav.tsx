import React from 'react';
import { ChevronRight, Home, Sparkles, FolderOpen, BarChart2, Layout, Edit3, PlayCircle, TrendingUp } from 'lucide-react';
import { PipelineStage } from '../../../context/GeniePipelineContext';
import { getStageColor } from './StageColors';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

interface BreadcrumbNavProps {
  projectName?: string;
  currentStage?: PipelineStage;
  isDarkMode?: boolean;
  onNavigate?: (path: string) => void;
}

const stageIcons: Record<PipelineStage, React.ReactNode> = {
  ingest: <FolderOpen className="w-3.5 h-3.5" />,
  analyze: <BarChart2 className="w-3.5 h-3.5" />,
  design: <Layout className="w-3.5 h-3.5" />,
  develop: <Edit3 className="w-3.5 h-3.5" />,
  implement: <PlayCircle className="w-3.5 h-3.5" />,
  evaluate: <TrendingUp className="w-3.5 h-3.5" />
};

const stageLabels: Record<PipelineStage, string> = {
  ingest: 'Ingest',
  analyze: 'Analyze',
  design: 'Design',
  develop: 'Develop',
  implement: 'Implement',
  evaluate: 'Evaluate'
};

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({
  projectName,
  currentStage,
  isDarkMode = false,
  onNavigate
}) => {
  const items: BreadcrumbItem[] = [
    {
      label: 'Genie AI',
      path: '/admin/genie',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      isActive: !projectName && !currentStage
    }
  ];

  if (projectName) {
    items.push({
      label: projectName,
      path: '/admin/genie/pipeline',
      isActive: !currentStage
    });
  }

  if (currentStage) {
    const stageColor = getStageColor(currentStage);
    items.push({
      label: stageLabels[currentStage],
      icon: stageIcons[currentStage],
      isActive: true
    });
  }

  return (
    <nav className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <button
        onClick={() => onNavigate?.('/admin')}
        className={`flex items-center gap-1 p-1 rounded transition-colors ${
          isDarkMode ? 'hover:bg-gray-800 hover:text-gray-200' : 'hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      <ChevronRight className="w-3 h-3 opacity-50" />

      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
          
          {item.isActive ? (
            <span
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full font-medium ${
                currentStage
                  ? isDarkMode
                    ? `${getStageColor(currentStage).darkBg} ${getStageColor(currentStage).textColor}`
                    : `${getStageColor(currentStage).lightBg} ${getStageColor(currentStage).textColor}`
                  : isDarkMode
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {item.icon}
              {item.label}
            </span>
          ) : (
            <button
              onClick={() => item.path && onNavigate?.(item.path)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-800 hover:text-gray-200'
                  : 'hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {item.icon}
              <span className="max-w-[120px] truncate">{item.label}</span>
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Mini progress indicator for pipeline completion
interface PipelineProgressProps {
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  isDarkMode?: boolean;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  currentStage,
  completedStages,
  isDarkMode = false
}) => {
  const stages: PipelineStage[] = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate'];
  const currentIndex = stages.indexOf(currentStage);
  const progress = ((completedStages.length / stages.length) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {stages.map((stage, index) => {
          const isCompleted = completedStages.includes(stage);
          const isCurrent = stage === currentStage;
          const isUpcoming = index > currentIndex;
          const stageColor = getStageColor(stage);

          return (
            <React.Fragment key={stage}>
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? stageColor.bgColor
                    : isCurrent
                      ? isDarkMode
                        ? 'bg-white ring-2 ring-offset-1 ring-offset-gray-900 ' + stageColor.borderColor
                        : 'bg-white ring-2 ring-offset-1 ' + stageColor.borderColor
                      : isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-200'
                }`}
                title={stageLabels[stage]}
              />
              {index < stages.length - 1 && (
                <div
                  className={`w-3 h-0.5 ${
                    isCompleted
                      ? isDarkMode
                        ? 'bg-gray-600'
                        : 'bg-gray-300'
                      : isDarkMode
                        ? 'bg-gray-800'
                        : 'bg-gray-100'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <span className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {Math.round(progress)}% complete
      </span>
    </div>
  );
};

export default BreadcrumbNav;
