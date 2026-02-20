import React, { useState } from 'react';
import { Question } from '../types';
import { RotateCw, Check, X } from 'lucide-react'; // Import Check and X icons

interface FlashCardProps {
  question: Question; // Use the correct type 'Question'
  isDarkMode: boolean;
  onAnswer: (answer: string) => void; // Add onAnswer prop
  userAnswer: string | undefined; // Add userAnswer to know if already answered
}

const FlashCard: React.FC<FlashCardProps> = ({ question, isDarkMode, onAnswer, userAnswer }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [answered, setAnswered] = useState(!!userAnswer); // Track if answered in this session/view

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSelfAssessment = (knewIt: boolean) => {
    // Pass the actual correct answer string if they knew it, empty string otherwise
    // This aligns with how calculateScore checks correctness by default
    onAnswer(knewIt ? backContent : '');
    setAnswered(true); // Mark as answered for this view
  };

  // Ensure question has front/back, provide defaults if not
  // Prioritize specific flip card content fields, fall back to general fields
  const frontContent = question.frontContent || question.question || 'Front side missing';
  const backContent = question.backContent || question.correctAnswer || 'Back side missing';

  return (
    <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} shadow-md`}>
      <div className="relative h-[180px] mb-4" style={{ perspective: '1000px' }}>
        <div
          className={`relative w-full h-full transition-transform duration-700 ease-in-out ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front Side */}
          <div
            className={`absolute inset-0 backface-hidden flex items-center justify-center p-4 rounded overflow-auto ${isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            <p className="text-base text-center break-words max-w-full">{frontContent}</p>
          </div>

          {/* Back Side */}
          <div
            className={`absolute inset-0 backface-hidden [transform:rotateY(180deg)] flex items-center justify-center p-4 rounded overflow-auto ${isDarkMode ? 'bg-indigo-900/50 text-white' : 'bg-indigo-100 text-indigo-900'}`}
          >
            <p className="text-base text-center break-words max-w-full">{backContent}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleFlip}
          className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm w-full ${
            isDarkMode
              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <RotateCw className="h-4 w-4 flex-shrink-0" />
          <span>{isFlipped ? 'Show Question' : 'Show Answer'}</span>
        </button>
      </div>

      {/* Self-assessment buttons - show only when flipped and not yet answered */}
      {isFlipped && !answered && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => handleSelfAssessment(false)}
            className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors text-xs ${
              isDarkMode
                ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70 border border-red-800'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
            }`}
          >
            <X className="h-3 w-3 flex-shrink-0" />
            <span>Didn't know</span>
          </button>
          <button
            onClick={() => handleSelfAssessment(true)}
            className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors text-xs ${
              isDarkMode
                ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70 border border-green-800'
                : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
            }`}
          >
            <Check className="h-3 w-3 flex-shrink-0" />
            <span>Knew it</span>
          </button>
        </div>
      )}

      {/* Indicate if already answered */}
       {answered && (
         <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
           {userAnswer === backContent ? 'You marked: Knew it' : 'You marked: Didn\'t know it'}
         </div>
       )}
    </div>
  );
};

// Add CSS for backface-visibility if needed globally or via Tailwind config
// .backface-hidden { backface-visibility: hidden; }

export default FlashCard;