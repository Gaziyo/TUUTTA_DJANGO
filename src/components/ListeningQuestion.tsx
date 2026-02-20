import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, CheckCircle2, AlertCircle } from 'lucide-react';
import { Question } from '../types';

interface ListeningQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  userAnswer: string;
  showResults: boolean;
  isCorrect: boolean;
  isDarkMode: boolean;
  disabled: boolean;
}

const ListeningQuestion: React.FC<ListeningQuestionProps> = ({
  question,
  onAnswer,
  userAnswer,
  showResults,
  isCorrect,
  isDarkMode,
  disabled
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [notes, setNotes] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clear notes and answer when question changes
  useEffect(() => {
    setNotes('');
    onAnswer('');
  }, [question.id, onAnswer]);

  useEffect(() => {
    if (question.audioPrompt) {
      const audio = new Audio(question.audioPrompt);
      audioRef.current = audio;

      const handleEnded = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);

      return () => {
        audio.pause();
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
      };
    }
  }, [question.audioPrompt]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const renderAnswerInput = () => {
    switch (question.type) {
      case 'multiple':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center space-x-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
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
        );

      case 'fill':
        return (
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        );

      case 'truefalse':
        return (
          <div className="flex space-x-4">
            {['True', 'False'].map((option) => (
              <label
                key={option}
                className={`flex-1 flex items-center justify-center p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  userAnswer.toLowerCase() === option.toLowerCase()
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
                  value={option.toLowerCase()}
                  checked={userAnswer.toLowerCase() === option.toLowerCase()}
                  onChange={() => onAnswer(option.toLowerCase())}
                  disabled={disabled}
                  className="sr-only"
                />
                <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled}
            className={`w-full px-4 py-2.5 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Question Text */}
      <div className={`text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {question.question}
      </div>

      {/* Compact Audio Player and Notes */}
      <div className="flex gap-2">
        {/* Round Audio Player Button */}
        <button
          onClick={togglePlay}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isDarkMode
              ? 'bg-indigo-500 text-white hover:bg-indigo-600'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        {/* Notes Input */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Take notes while listening..."
          className={`flex-1 p-2.5 rounded-lg border resize-none min-h-[60px] ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      {/* Answer Input */}
      {renderAnswerInput()}

      {/* Feedback */}
      {showResults && (
        <div className={`p-3 rounded-lg ${
          isCorrect
            ? isDarkMode
              ? 'bg-green-900/30 text-green-300'
              : 'bg-green-50 text-green-700'
            : isDarkMode
              ? 'bg-red-900/30 text-red-300'
              : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            {isCorrect ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Correct!</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>Incorrect. The correct answer was: {question.correctAnswer}</span>
              </>
            )}
          </div>
          {question.explanation && (
            <p className="mt-2 text-sm">
              {question.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ListeningQuestion;
