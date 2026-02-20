import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle, Target, Zap, Lightbulb } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Genie AI',
    description: 'Genie AI helps you create effective learning experiences using the ADDIE instructional design framework. Let\'s take a quick tour.',
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: 'stages',
    title: 'ADDIE Pipeline',
    description: 'Navigate through 6 stages: Ingest, Analyze, Design, Develop, Implement, and Evaluate. Each stage builds on the previous one.',
    icon: <Target className="w-6 h-6" />,
    target: '[data-tour="stage-rail"]',
    position: 'bottom'
  },
  {
    id: 'copilot',
    title: 'AI Co-Pilot',
    description: 'Your AI assistant provides stage-specific guidance, suggested prompts, and can help generate content at each step.',
    icon: <Lightbulb className="w-6 h-6" />,
    target: '[data-tour="copilot-sidebar"]',
    position: 'left'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    description: 'Use the Build & Launch button for one-click course creation, or explore Studio Tools for manual control.',
    icon: <Zap className="w-6 h-6" />,
    target: '[data-tour="quick-actions"]',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'Start by uploading your first source document, or use the "Build & Launch" button to create a course automatically.',
    icon: <CheckCircle className="w-6 h-6" />,
  }
];

interface OnboardingTourProps {
  isDarkMode?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isDarkMode = false,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const seen = localStorage.getItem('genie-tour-completed');
    if (!seen) {
      setIsVisible(true);
    } else {
      setHasSeenTour(true);
    }
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem('genie-tour-completed', 'true');
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('genie-tour-completed', 'true');
    setIsVisible(false);
    onSkip?.();
  }, [onSkip]);

  const restartTour = useCallback(() => {
    setCurrentStep(0);
    setIsVisible(true);
  }, []);

  if (!isVisible || hasSeenTour) {
    return (
      <button
        onClick={restartTour}
        className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg ${
          isDarkMode
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Restart Tour
      </button>
    );
  }

  const step = tourSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleSkip} />

      {/* Tour Card */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md pointer-events-auto ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        } rounded-2xl shadow-2xl border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} overflow-hidden`}
      >
        {/* Progress Bar */}
        <div className={`h-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <div className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>
                {step.icon}
              </div>
            </div>
            <button
              onClick={handleSkip}
              className={`p-1.5 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {step.title}
          </h3>
          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {step.description}
          </p>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-indigo-500'
                    : index < currentStep
                      ? isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      : isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handlePrev}
              disabled={isFirst}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isFirst
                  ? 'opacity-0 pointer-events-none'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 genie-btn-press ${
                isDarkMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contextual help tooltip for specific features
interface ContextualHelpProps {
  title: string;
  description: string;
  isVisible: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  description,
  isVisible,
  onClose,
  isDarkMode = false
}) => {
  if (!isVisible) return null;

  return (
    <div className={`absolute z-40 max-w-xs p-3 rounded-lg shadow-lg border ${
      isDarkMode
        ? 'bg-gray-800 border-gray-700 text-white'
        : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold mb-1">{title}</p>
          <p className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`p-0.5 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default OnboardingTour;
