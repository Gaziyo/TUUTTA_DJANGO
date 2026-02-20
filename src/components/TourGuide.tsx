import React, { useState, useEffect } from 'react';
// Removed unused import: import { X } from 'lucide-react';
import { useStore } from '../store';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'right' | 'bottom' | 'left';
}

const TourGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { user, updateSettings } = useStore();
  const isDarkMode = user?.settings?.theme === 'dark';

  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="chat-input"]',
      title: 'Start Chatting',
      content: 'Type your questions here and get instant responses from your AI tutor.',
      position: 'top'
    },
    {
      target: '[data-tour="notes-panel"]',
      title: 'Take Notes',
      content: 'Keep track of your learning by taking organized notes.',
      position: 'left'
    },
    {
      target: '[data-tour="assessment-panel"]',
      title: 'Test Your Knowledge',
      content: 'Take assessments to measure your understanding.',
      position: 'left'
    },
    {
      target: '[data-tour="files-panel"]',
      title: 'Upload Materials',
      content: 'Upload study materials for AI-powered analysis and learning.',
      position: 'left'
    }
  ];

  useEffect(() => {
    // Show tour for new users
    if (user && !user.settings?.tourCompleted) {
      setIsVisible(true);
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    updateSettings({ tourCompleted: true });
  };

  if (!isVisible) return null;

  const currentTourStep = tourSteps[currentStep];
  const targetElement = document.querySelector(currentTourStep.target);
  
  if (!targetElement) return null;

  const targetRect = targetElement.getBoundingClientRect();
  const tooltipPosition = {
    top: targetRect.top,
    left: targetRect.left,
    width: targetRect.width,
    height: targetRect.height
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      <div 
        className="absolute pointer-events-auto"
        style={{
          top: tooltipPosition.top + (currentTourStep.position === 'bottom' ? tooltipPosition.height + 8 : 0),
          left: tooltipPosition.left + (currentTourStep.position === 'right' ? tooltipPosition.width + 8 : 0),
          transform: `translate(${currentTourStep.position === 'left' ? '-100%' : '0'}, ${currentTourStep.position === 'top' ? '-100%' : '0'})`
        }}
      >
        <div className={`w-64 p-4 rounded-lg shadow-lg ${
          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{currentTourStep.title}</h3>
            <button
              aria-label="Dismiss" // Added aria-label for accessibility
              onClick={handleComplete}
              className={`p-1 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span aria-hidden="true">&times;</span> {/* Added visual close icon */}
            </button>
          </div>
          
          <p className={`text-sm mb-4 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {currentTourStep.content}
          </p>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep
                      ? 'bg-indigo-600'
                      : isDarkMode
                        ? 'bg-gray-600'
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourGuide;