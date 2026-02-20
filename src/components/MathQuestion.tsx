import React, { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Question } from '../types';

interface MathQuestionProps {
  question: Question;
  onAnswer: (answer: string) => void;
  userAnswer: string;
  showResults: boolean;
  isCorrect: boolean;
  isDarkMode: boolean;
  disabled: boolean;
}

const MathQuestion: React.FC<MathQuestionProps> = ({
  question,
  onAnswer,
  userAnswer,
  showResults,
  isCorrect: _isCorrect,
  isDarkMode,
  disabled
}) => {
  const [showSteps, setShowSteps] = useState(false);

  // Normalize answer by removing spaces and converting to lowercase
  const normalizeAnswer = (answer: string) => {
    return answer.toLowerCase().replace(/\s+/g, '');
  };

  // Check if the answer is correct, handling units
  const checkAnswer = (userAnswer: string, correctAnswer: string) => {
    const normalizedUser = normalizeAnswer(userAnswer);
    const normalizedCorrect = normalizeAnswer(correctAnswer);

    // If answers match exactly
    if (normalizedUser === normalizedCorrect) return true;

    // Try to extract numerical value and units
    const userMatch = normalizedUser.match(/^(\d+)(?:cm2|cm²|sq\.?cm)?$/);
    const correctMatch = normalizedCorrect.match(/^(\d+)(?:cm2|cm²|sq\.?cm)?$/);

    if (userMatch && correctMatch) {
      return userMatch[1] === correctMatch[1];
    }

    return false;
  };

  const renderMathExpression = (expression: string, isBlock: boolean = false) => {
    try {
      const html = katex.renderToString(expression, {
        displayMode: isBlock,
        throwOnError: false
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (error) {
      console.error('Error rendering LaTeX:', error);
      return <span className="text-red-500">Error rendering math expression</span>;
    }
  };

  const renderQuestionContent = () => (
    <div className="space-y-4">
      <div className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {question.question}
      </div>
      
      {question.mathExpression && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          {renderMathExpression(question.mathExpression, true)}
        </div>
      )}
    </div>
  );

  const renderStepByStep = () => {
    if (!Array.isArray(question.steps) || question.steps.length === 0) return null;

    return (
      <div className="mt-4">
        <button
          onClick={() => setShowSteps(!showSteps)}
          className={`flex items-center space-x-2 text-sm font-medium ${
            isDarkMode
              ? 'text-indigo-400 hover:text-indigo-300'
              : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {showSteps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span>{showSteps ? 'Hide Steps' : 'Show Steps'}</span>
        </button>

        {showSteps && (
          <div className="mt-2 space-y-3">
            {question.steps.map((step, index) => (
              <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Step {index + 1}: {step.instruction}
                </div>
                <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {renderMathExpression(step.solution)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMatchingQuestion = () => {
    if (!Array.isArray(question.pairs) || question.pairs.length === 0) return null;

    return (
      <div className="space-y-4">
        {question.pairs.map((pair, index) => (
          <div key={index} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">{renderMathExpression(pair.equation)}</div>
              <div className="mx-4">=</div>
              <div className="flex-1">{renderMathExpression(pair.solution)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAnswerInput = () => {
    if (question.type === 'match' || question.type === 'graph') return null;

    return (
      <div className="mt-4">
        <div className="space-y-2">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Enter your answer (e.g., 24 cm²)..."
            disabled={disabled}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          />
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Include units in your answer (e.g., cm² for area)
          </p>
        </div>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!showResults) return null;

    const isAnswerCorrect = question.correctAnswer && checkAnswer(userAnswer, question.correctAnswer);

    return (
      <div className={`mt-4 ${isAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {isAnswerCorrect ? (
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
            {question.correctAnswer && (
              <div className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                Correct answer: {renderMathExpression(question.correctAnswer)}
              </div>
            )}
            {question.explanation && (
              <div className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="font-medium">Explanation:</span> {question.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderQuestionContent()}
      {question.type === 'step' && renderStepByStep()}
      {question.type === 'match' && renderMatchingQuestion()}
      {renderAnswerInput()}
      {renderFeedback()}
    </div>
  );
};

export default MathQuestion;
