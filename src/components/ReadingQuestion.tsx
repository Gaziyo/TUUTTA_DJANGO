import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, AlertCircle, BookOpen as _BookOpen } from 'lucide-react'; // Aliased unused BookOpen
import { Question } from '../types';

interface ReadingQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  onSpeedReadingStart: () => void;
  onSpeedReadingComplete: () => void;
  timer?: {
    startTime: number | null;
    endTime: number | null;
    isActive: boolean;
  };
  highlightedWords: string[];
  userAnswer: string;
  showResults: boolean;
  isCorrect: boolean;
  isDarkMode: boolean;
  disabled: boolean;
  onVocabularyHighlight: (word: string) => void;
}

const ReadingQuestion: React.FC<ReadingQuestionProps> = ({
  question,
  onAnswer,
  onSpeedReadingStart,
  onSpeedReadingComplete,
  timer,
  highlightedWords,
  userAnswer,
  showResults,
  isCorrect,
  isDarkMode,
  disabled
}) => {
  const [showPassage, setShowPassage] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(0);
  const passageRef = useRef<HTMLDivElement>(null);
  
  // For speed reading timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (timer?.isActive && timer.startTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - timer.startTime!) / 1000;
        setTimeElapsed(elapsed);
      }, 100);
    } else if (timer?.startTime && timer.endTime) {
      const elapsed = (timer.endTime - timer.startTime) / 1000;
      setTimeElapsed(elapsed);
      
      // Calculate words per minute
      if (question.wordCount) {
        const minutes = elapsed / 60;
        setWordsPerMinute(Math.round(question.wordCount / minutes));
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, question.wordCount]);

  // Highlight vocabulary words in the passage
  const renderPassageWithHighlights = () => {
    if (!question.passage) return null;
    
    if (question.type !== 'vocabulary' || !question.vocabularyItems) {
      return <div>{question.passage}</div>;
    }
    
    const vocabularyWords = question.vocabularyItems.map(item => item.word.toLowerCase());
    const words = question.passage.split(/\b/);
    
    return (
      <div>
        {words.map((word, index) => {
          const cleanWord = word.toLowerCase().replace(/[.,;!?()]/g, '');
          const isVocabWord = vocabularyWords.includes(cleanWord);
          
          if (isVocabWord) {
            const isHighlighted = highlightedWords.includes(cleanWord);
            return (
              <span
                key={index}
                className={`cursor-pointer ${
                  isHighlighted 
                    ? 'bg-yellow-200 text-yellow-800' 
                    : 'hover:bg-yellow-100 hover:text-yellow-800'
                } transition-colors`}
              >
                {word}
              </span>
            );
          }
          
          return <span key={index}>{word}</span>;
        })}
      </div>
    );
  };

  const handleStartReading = () => {
    setShowPassage(true);
    onSpeedReadingStart();
  };

  const handleCompleteReading = () => {
    onSpeedReadingComplete();
  };

  const renderCulturalNotes = () => {
    if (!question.culturalNotes) return null;
    
    return (
      <div className={`mt-4 p-3 rounded-lg ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Cultural Context:
        </h4>
        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {question.culturalNotes}
        </p>
      </div>
    );
  };

  const renderSpeedReadingControls = () => {
    if (question.type !== 'speed-reading') return null;
    
    // Removed unused isActive variable
    const isCompleted = timer?.startTime && timer?.endTime;
    
    return (
      <div className="mb-4">
        {!showPassage ? (
          <button
            onClick={handleStartReading}
            disabled={disabled}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Play className="h-5 w-5" />
            <span>Start Speed Reading</span>
          </button>
        ) : !isCompleted ? (
          <div className="flex items-center justify-between">
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Time: {timeElapsed.toFixed(1)}s
            </div>
            <button
              onClick={handleCompleteReading}
              disabled={disabled}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Pause className="h-5 w-5" />
              <span>Finished Reading</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
            <div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                Reading Stats:
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Time: {timeElapsed.toFixed(1)}s | 
                Words: {question.wordCount || 'N/A'} | 
                Speed: {wordsPerMinute} WPM
              </div>
            </div>
            {question.difficultyLevel && (
              <div className={`text-xs px-2 py-1 rounded ${
                question.difficultyLevel === 'beginner'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : question.difficultyLevel === 'intermediate'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {question.difficultyLevel.charAt(0).toUpperCase() + question.difficultyLevel.slice(1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {question.type === 'speed-reading' && renderSpeedReadingControls()}
      
      {(showPassage || question.type !== 'speed-reading') && (
        <div 
          ref={passageRef}
          className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          } prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}
        >
          {renderPassageWithHighlights()}
        </div>
      )}
      
      
      
      {renderCulturalNotes()}
      
      {/* Display the actual question text if it exists */}
      {question.question && question.type !== 'vocabulary' && (
         <h4 className={`text-lg font-medium mt-6 mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
           {question.question}
         </h4>
      )}

      {/* Render options only if not a vocabulary question */}
      {question.type !== 'vocabulary' && (
        <div className="space-y-3">
          <div className="space-y-2">
            {question.options?.map((option, optionIndex) => (
              <label
                key={`${question.id}-option-${optionIndex}`}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  userAnswer === option
                    ? isDarkMode
                      ? 'bg-indigo-900/50 border-indigo-700'
                      : 'bg-indigo-50 border-indigo-500'
                    : isDarkMode
                      ? 'hover:bg-gray-700 border-gray-600'
                      : 'hover:bg-gray-50 border-gray-200'
                } ${disabled ? 'cursor-default' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={userAnswer === option}
                  onChange={() => onAnswer(option)}
                  disabled={disabled}
                  className={`h-4 w-4 ${
                    isDarkMode
                      ? 'text-indigo-500 border-gray-600 bg-gray-700'
                      : 'text-indigo-600 border-gray-300 bg-white'
                  }`}
                />
                <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                  {option}
                </span>
              </label>
            ))}
          </div>

          {showResults && (
            <div className={`text-sm ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Correct!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Incorrect</span>
                  </div>
                  <div className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                    Correct answer: {question.correctAnswer}
                  </div>
                  {question.explanation && (
                    <div className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="font-medium">Explanation:</span> {question.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReadingQuestion;