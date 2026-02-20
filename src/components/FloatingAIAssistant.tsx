// ============================================================================
// FLOATING AI ASSISTANT COMPONENT
// Context-aware AI tutor that floats over course/path content
// ============================================================================

import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Minimize2,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { useCourseContext, usePathContext } from '../context/AppContext';
import ChatInterface from './ChatInterface';

interface FloatingAIAssistantProps {
  isMinimized: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  contextAware?: boolean;
}

export default function FloatingAIAssistant({
  isMinimized,
  onToggle,
  isDarkMode,
  contextAware = false
}: FloatingAIAssistantProps) {
  const courseContext = useCourseContext();
  const pathContext = usePathContext();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isMinimized) {
    return (
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50 ${
          isDarkMode
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
            : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
        }`}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden transition-all ${
        isExpanded
          ? 'w-[min(92vw,520px)] h-[min(80vh,720px)]'
          : 'w-[min(92vw,420px)] h-[min(70vh,560px)]'
      } ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          isDarkMode
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI Tutor</h3>
            {contextAware && (courseContext || pathContext) && (
              <p className="text-white/70 text-xs truncate max-w-[150px]">
                {courseContext?.courseName ?? pathContext?.pathName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Minimize assistant' : 'Expand assistant'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close assistant"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <ChatInterface variant="floating" />
      </div>
    </div>
  );
}
