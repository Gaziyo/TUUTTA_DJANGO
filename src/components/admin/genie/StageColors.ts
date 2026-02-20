// Stage color configuration for ADDIE framework
export interface StageColorConfig {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  lightBg: string;
  darkBg: string;
  gradient: string;
  icon: string;
}

export const STAGE_COLORS: Record<string, StageColorConfig> = {
  ingest: {
    id: 'ingest',
    name: 'Ingest',
    color: '#3b82f6', // blue-500
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-500',
    lightBg: 'bg-blue-50',
    darkBg: 'bg-blue-500/20',
    gradient: 'from-blue-500 to-cyan-500',
    icon: 'text-blue-500'
  },
  analyze: {
    id: 'analyze',
    name: 'Analyze',
    color: '#8b5cf6', // violet-500
    bgColor: 'bg-violet-500',
    borderColor: 'border-violet-500',
    textColor: 'text-violet-500',
    lightBg: 'bg-violet-50',
    darkBg: 'bg-violet-500/20',
    gradient: 'from-violet-500 to-purple-500',
    icon: 'text-violet-500'
  },
  design: {
    id: 'design',
    name: 'Design',
    color: '#f59e0b', // amber-500
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-500',
    lightBg: 'bg-amber-50',
    darkBg: 'bg-amber-500/20',
    gradient: 'from-amber-500 to-orange-500',
    icon: 'text-amber-500'
  },
  develop: {
    id: 'develop',
    name: 'Develop',
    color: '#10b981', // emerald-500
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-500',
    lightBg: 'bg-emerald-50',
    darkBg: 'bg-emerald-500/20',
    gradient: 'from-emerald-500 to-teal-500',
    icon: 'text-emerald-500'
  },
  implement: {
    id: 'implement',
    name: 'Implement',
    color: '#6366f1', // indigo-500
    bgColor: 'bg-indigo-500',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-500',
    lightBg: 'bg-indigo-50',
    darkBg: 'bg-indigo-500/20',
    gradient: 'from-indigo-500 to-blue-600',
    icon: 'text-indigo-500'
  },
  evaluate: {
    id: 'evaluate',
    name: 'Evaluate',
    color: '#f43f5e', // rose-500
    bgColor: 'bg-rose-500',
    borderColor: 'border-rose-500',
    textColor: 'text-rose-500',
    lightBg: 'bg-rose-50',
    darkBg: 'bg-rose-500/20',
    gradient: 'from-rose-500 to-pink-500',
    icon: 'text-rose-500'
  }
};

export const getStageColor = (stageId: string): StageColorConfig => {
  return STAGE_COLORS[stageId] || STAGE_COLORS.ingest;
};

export const getStageBgClass = (stageId: string, isDarkMode: boolean): string => {
  const config = getStageColor(stageId);
  return isDarkMode ? config.darkBg : config.lightBg;
};

export const getStageTextClass = (stageId: string): string => {
  return getStageColor(stageId).textColor;
};

export const getStageBorderClass = (stageId: string): string => {
  return getStageColor(stageId).borderColor;
};

export const getStageGradient = (stageId: string): string => {
  return getStageColor(stageId).gradient;
};
