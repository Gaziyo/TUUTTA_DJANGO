import React, { useState, useCallback } from 'react';
import { Columns, X, LayoutTemplate, ArrowRightLeft, GripVertical } from 'lucide-react';
import { PipelineStage } from '../../../context/GeniePipelineContext';
import { getStageColor } from './StageColors';

interface SplitViewProps {
  primaryStage: PipelineStage;
  secondaryStage: PipelineStage;
  primaryContent: React.ReactNode;
  secondaryContent: React.ReactNode;
  isDarkMode?: boolean;
  onClose?: () => void;
  onSwap?: () => void;
}

// Split View Toggle Button
export const SplitViewToggle: React.FC<{
  isActive: boolean;
  isDarkMode?: boolean;
  onClick: () => void;
}> = ({ isActive, isDarkMode = false, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 genie-btn-press ${
      isActive
        ? isDarkMode
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'bg-indigo-100 text-indigo-700'
        : isDarkMode
          ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
    title="Toggle Split View"
  >
    <Columns className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">Split View</span>
  </button>
);

// Stage Selector for Split View
export const SplitViewStageSelector: React.FC<{
  currentStage: PipelineStage;
  availableStages: PipelineStage[];
  isDarkMode?: boolean;
  onSelect: (stage: PipelineStage) => void;
  label: string;
}> = ({ currentStage, availableStages, isDarkMode = false, onSelect, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  const stageLabels: Record<PipelineStage, string> = {
    ingest: 'Ingest',
    analyze: 'Analyze',
    design: 'Design',
    develop: 'Develop',
    implement: 'Implement',
    evaluate: 'Evaluate'
  };

  return (
    <div className="relative">
      <span className={`text-[10px] uppercase tracking-wider mr-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </span>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isDarkMode
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getStageColor(currentStage).color }}
        />
        {stageLabels[currentStage]}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg border min-w-[120px] z-50 ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {availableStages.map((stage) => (
              <button
                key={stage}
                onClick={() => {
                  onSelect(stage);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                  stage === currentStage
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-900'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStageColor(stage).color }}
                />
                {stageLabels[stage]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Main Split View Component
export const SplitView: React.FC<SplitViewProps> = ({
  primaryStage,
  secondaryStage,
  primaryContent,
  secondaryContent,
  isDarkMode = false,
  onClose,
  onSwap
}) => {
  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSplitRatio(Math.max(30, Math.min(70, percentage)));
  }, [isDragging]);

  const primaryColor = getStageColor(primaryStage);
  const secondaryColor = getStageColor(secondaryStage);

  return (
    <div 
      className="flex h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Primary Panel */}
      <div 
        className="flex flex-col min-w-0"
        style={{ width: `${splitRatio}%` }}
      >
        {/* Panel Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: primaryColor.color }}
            />
            <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {primaryStage.charAt(0).toUpperCase() + primaryStage.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onSwap && (
              <button
                onClick={onSwap}
                className={`p-1.5 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Swap panels"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={`p-1.5 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Close split view"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-auto">
          {primaryContent}
        </div>
      </div>

      {/* Resizer */}
      <div
        className={`w-1 cursor-col-resize flex items-center justify-center transition-colors ${
          isDragging
            ? 'bg-indigo-500'
            : isDarkMode
              ? 'bg-gray-800 hover:bg-gray-700'
              : 'bg-gray-200 hover:bg-gray-300'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className={`p-0.5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
          <GripVertical className="w-3 h-3 text-gray-500" />
        </div>
      </div>

      {/* Secondary Panel */}
      <div 
        className="flex flex-col min-w-0"
        style={{ width: `${100 - splitRatio}%` }}
      >
        {/* Panel Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: secondaryColor.color }}
            />
            <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {secondaryStage.charAt(0).toUpperCase() + secondaryStage.slice(1)}
            </span>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-auto">
          {secondaryContent}
        </div>
      </div>
    </div>
  );
};

// Hook for managing split view state
export const useSplitView = () => {
  const [isSplitView, setIsSplitView] = useState(false);
  const [secondaryStage, setSecondaryStage] = useState<PipelineStage>('design');

  const toggleSplitView = useCallback(() => {
    setIsSplitView(prev => !prev);
  }, []);

  const openSplitView = useCallback((stage: PipelineStage) => {
    setSecondaryStage(stage);
    setIsSplitView(true);
  }, []);

  const closeSplitView = useCallback(() => {
    setIsSplitView(false);
  }, []);

  return {
    isSplitView,
    secondaryStage,
    setSecondaryStage,
    toggleSplitView,
    openSplitView,
    closeSplitView
  };
};

export default SplitView;
