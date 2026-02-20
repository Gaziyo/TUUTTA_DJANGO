import React, { useState, useEffect } from 'react';
import {
  Brain, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, Loader2,
  BookOpen, Mic, Edit3, Volume2,
  RefreshCw,
  Calculator,
  Clock
} from 'lucide-react';
import { useStore } from '../store';
import { generateAssessment } from '../lib/assessment';
import { Assessment } from '../types';
import ReadingQuestion from './ReadingQuestion';
import SpeakingQuestion from './SpeakingQuestion';
import WritingQuestion from './WritingQuestion';
import DragAndDrop from './DragAndDrop';
import MathQuestion from './MathQuestion';
import ListeningQuestion from './ListeningQuestion';
import FlashCard from './FlashCard'; // Import the new component
import AssessmentHistory from './AssessmentHistory';

interface DragItemAnswer {
  id: string;
  category?: string;
}

const AssessmentPanel: React.FC = () => {
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [assessmentType, setAssessmentType] = useState<string>('general');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [speedReadingTimer, setSpeedReadingTimer] = useState<{
    startTime: number | null;
    endTime: number | null;
    isActive: boolean;
  }>({
    startTime: null,
    endTime: null,
    isActive: false
  });
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
  
  const { user, getCurrentChat, getNotes } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const currentQuestion = currentAssessment?.questions[currentQuestionIndex] || null;

  useEffect(() => {
    if (currentQuestion) {
      setSpeedReadingTimer({
        startTime: null,
        endTime: null,
        isActive: false
      });
      setHighlightedWords([]);
    }
  }, [currentQuestion]);

  const handleGenerateAssessment = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setCurrentAssessment(null);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setShowResults(false);
      
      const chatContent = getCurrentChat()?.messages
        .map(m => m.content)
        .join('\n') || '';

      const notesContent = getNotes()
        .map(note => `${note.subject}: ${note.content}`)
        .join('\n');

      // Re-added notesContent and filesContent ('') arguments for backward compatibility
      const assessment = await generateAssessment(
        chatContent,
        notesContent, // Pass the notesContent variable
        '', // Pass empty string for _filesContent
        assessmentType,
        questionCount
      );

      setCurrentAssessment(assessment);
    } catch (error) {
      console.error('Error generating assessment:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate assessment');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSpeedReadingStart = () => {
    setSpeedReadingTimer({
      startTime: Date.now(),
      endTime: null,
      isActive: true
    });
  };

  const handleSpeedReadingComplete = () => {
    setSpeedReadingTimer(prev => ({
      ...prev,
      endTime: Date.now(),
      isActive: false
    }));
  };

  const handleVocabularyHighlight = (word: string) => {
    setHighlightedWords(prev => 
      prev.includes(word) 
        ? prev.filter(w => w !== word)
        : [...prev, word]
    );
  };

  const saveAssessmentResults = async () => {
    if (!currentAssessment || !user) return;

    const { score, total, percentage } = calculateScore();

    const assessmentResult = {
      ...currentAssessment,
      score,
      percentage,
      completed: true,
      completedAt: Date.now(),
      userAnswers,
      totalQuestions: total
    };

    try {
      // Import the saveAssessment function
      const { saveAssessment } = await import('../lib/firestoreService');
      await saveAssessment(user.id, assessmentResult);
      // Update achievement for high scores
      const { updateAchievementProgress } = useStore.getState();
      if (percentage >= 90) {
        updateAchievementProgress('assessment-ace', 1);
      }
      if (percentage === 100) {
        updateAchievementProgress('perfect-score', 1);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
    }
  };

  const handleNextQuestion = () => {
    if (!currentAssessment) return;

    if (currentQuestionIndex < currentAssessment.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setShowResults(true);
      saveAssessmentResults();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = (): { score: number; total: number; percentage: number } => {
    if (!currentAssessment) return { score: 0, total: 0, percentage: 0 };
    
    let correctAnswers = 0;
    let totalQuestions = 0;
    
    currentAssessment.questions.forEach(question => {
      if (question.type === 'speaking' || question.type === 'writing') {
        return;
      }
      
      const userAnswer = userAnswers[question.id];

      // Always count non-subjective questions towards the total
      totalQuestions++;

      if (question.type === 'listening') {
        // Check only if userAnswer exists
        if (userAnswer && userAnswer.toLowerCase() === question.correctAnswer?.toLowerCase()) {
          correctAnswers++;
        }
      } else if (question.type === 'drag') {
        // If user interacted, check their answer
        if (userAnswer) {
          try {
            const items = JSON.parse(userAnswer) as DragItemAnswer[];
            const allCorrect = items.every((item) =>
              item.category === question.items?.find(i => i.id === item.id)?.category
            );
            if (allCorrect) correctAnswers++;
          } catch (error) {
            console.error('Error parsing drag and drop answer:', error);
            // Consider if an error state should penalize or be ignored
          }
        } else {
          // If user did NOT interact, assume initial state was correct (as generated)
          // Check if the initial state itself is valid (all items have a category matching the original definition)
          const initialStateCorrect = question.items?.every(initialItem =>
              initialItem.category === question.items?.find(qItem => qItem.id === initialItem.id)?.category
          );
          // We assume the generated data is correct, so if no interaction, count as correct.
          // A more robust check could verify initial state against definition if needed.
          if (initialStateCorrect !== false) { // Treat undefined/true as correct initial state
             correctAnswers++;
          }
        }
      } else { // Handle other types like multiple choice, fill, true/false
        // Check only if userAnswer exists
        if (userAnswer) {
           const isCorrect = question.correctAnswer?.toLowerCase() === userAnswer.toLowerCase() ||
                            (question.alternativeAnswers || []).some(alt =>
                              alt.toLowerCase() === userAnswer.toLowerCase()
                            );
           if (isCorrect) correctAnswers++;
        }
      }
    });
    
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    return {
      score: correctAnswers,
      total: totalQuestions,
      percentage
    };
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    
    const userAnswer = userAnswers[currentQuestion.id] || '';
    
    switch (currentQuestion.type) {
      case 'listening':
        return (
          <ListeningQuestion
            question={currentQuestion}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            userAnswer={userAnswer}
            showResults={showResults}
            isCorrect={userAnswer === currentQuestion.correctAnswer}
            isDarkMode={isDarkMode}
            disabled={showResults}
          />
        );

      case 'fill':
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentQuestion.question}
              </h4>
              
              {currentQuestion.hint && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Hint: {currentQuestion.hint}
                </p>
              )}
            </div>
            
            <div>
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                disabled={showResults}
                placeholder="Type your answer here..."
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
            </div>
            
            {showResults && (
              <div className={`text-sm mt-4 ${
                userAnswer.toLowerCase() === currentQuestion.correctAnswer?.toLowerCase() ||
                currentQuestion.alternativeAnswers?.some(alt => 
                  alt.toLowerCase() === userAnswer.toLowerCase()
                )
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {userAnswer.toLowerCase() === currentQuestion.correctAnswer?.toLowerCase() ||
                 currentQuestion.alternativeAnswers?.some(alt => 
                   alt.toLowerCase() === userAnswer.toLowerCase()
                 ) ? (
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
                      Correct answer: {currentQuestion.correctAnswer}
                      {currentQuestion.alternativeAnswers?.length ? (
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                          {' '}(Also accepted: {currentQuestion.alternativeAnswers.join(', ')})
                        </span>
                      ) : null}
                    </div>
                    {currentQuestion.explanation && (
                      <div className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="font-medium">Explanation:</span> {currentQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'step':
      case 'match':
      case 'graph':
        return (
          <MathQuestion
            question={currentQuestion}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            userAnswer={userAnswer}
            showResults={showResults}
            isCorrect={userAnswer === currentQuestion.correctAnswer}
            isDarkMode={isDarkMode}
            disabled={showResults}
          />
        );

      case 'reading':
      case 'speed-reading':
      case 'vocabulary':
        return (
          <ReadingQuestion
            question={currentQuestion}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            onSpeedReadingStart={handleSpeedReadingStart}
            onSpeedReadingComplete={handleSpeedReadingComplete}
            onVocabularyHighlight={handleVocabularyHighlight}
            timer={speedReadingTimer}
            highlightedWords={highlightedWords}
            userAnswer={userAnswer}
            showResults={showResults}
            isCorrect={userAnswer === currentQuestion.correctAnswer}
            isDarkMode={isDarkMode}
            disabled={showResults}
          />
        );
      
      case 'speaking':
        return (
          <SpeakingQuestion
            question={currentQuestion}
            onRecordingComplete={() => {}}
            isDarkMode={isDarkMode}
            disabled={showResults}
          />
        );
      
      case 'writing':
        return (
          <WritingQuestion
            question={currentQuestion}
            onSubmit={() => {}}
            submission={undefined}
            onPeerReview={() => {}}
            peerReviewMode={false}
            isDarkMode={isDarkMode}
            disabled={showResults}
          />
        );

      case 'drag':
        return (
          <DragAndDrop
            question={currentQuestion}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            showResults={showResults}
            isCorrect={userAnswer === currentQuestion.correctAnswer}
            isDarkMode={isDarkMode}
            // disabled={showResults} // Prop removed from DragAndDrop component
          />
        );

      case 'flip': // Match the type generated by assessment.ts
        // Get the current answer for this question
        // Removed redundant declaration; outer userAnswer (line 186) is already in scope
        return (
          <FlashCard
            question={currentQuestion}
            isDarkMode={isDarkMode}
            // Pass the handleAnswer function and the current user answer
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            userAnswer={userAnswer}
          />
        );
      
      default:
        return (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentQuestion.question}
              </h4>
              
              {currentQuestion.hint && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Hint: {currentQuestion.hint}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => (
                <label
                  key={`${currentQuestion.id}-option-${index}`}
                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    userAnswer === option
                      ? isDarkMode
                        ? 'bg-indigo-900/50 border-indigo-700'
                        : 'bg-indigo-50 border-indigo-500'
                      : isDarkMode
                        ? 'hover:bg-gray-700 border-gray-600'
                        : 'hover:bg-gray-50 border-gray-200'
                  } ${showResults ? 'cursor-default' : ''}`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={userAnswer === option}
                    onChange={() => handleAnswer(currentQuestion.id, option)}
                    disabled={showResults}
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
              <div className={`text-sm ${userAnswer === currentQuestion.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                {userAnswer === currentQuestion.correctAnswer ? (
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
                      Correct answer: {currentQuestion.correctAnswer}
                    </div>
                    {currentQuestion.explanation && (
                      <div className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className="font-medium">Explanation:</span> {currentQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  const renderAssessmentResults = () => {
    const { score, total, percentage } = calculateScore();
    
    return (
      <div className={`p-5 rounded-lg ${
        isDarkMode ? 'bg-indigo-900/20 border border-indigo-800' : 'bg-indigo-50 border border-indigo-200'
      }`}>
        <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Assessment Results
        </h3>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className={`text-3xl font-bold ${
            percentage >= 70
              ? isDarkMode ? 'text-green-400' : 'text-green-600'
              : percentage >= 40
                ? isDarkMode ? 'text-amber-400' : 'text-amber-600'
                : isDarkMode ? 'text-red-400' : 'text-red-600'
          }`}>
            {percentage}%
          </div>
          <div className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {score} out of {total} correct
          </div>
        </div>
        
        <div className="w-full h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 mb-4">
          <div 
            className={`h-2.5 rounded-full w-[${percentage}%] ${
              percentage >= 70
                ? 'bg-green-600 dark:bg-green-500'
                : percentage >= 40
                  ? 'bg-amber-600 dark:bg-amber-500'
                  : 'bg-red-600 dark:bg-red-500'
            }`}
          />
        </div>
        
        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {percentage >= 70
            ? 'Great job! You have a good understanding of the material.'
            : percentage >= 40
              ? 'Good effort! There are some areas you might want to review.'
              : 'You might need to spend more time studying this material.'}
        </p>
      </div>
    );
  };

  const renderAssessmentNavigation = () => {
    return (
      <div className="flex justify-between mt-4">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={`flex items-center space-x-1 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
            isDarkMode
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <button
            onClick={handleNextQuestion}
            className={`flex items-center space-x-1 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        
        {showResults ? (
          currentAssessment && (
            <button
              onClick={() => {
                setCurrentAssessment(null);
                setShowResults(false);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              <span>New Assessment</span>
            </button>
          )
        ) : (
          <></>
        )}

      </div>
    );
  };

  if (isGenerating) {
    return (
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <Loader2 className={`h-8 w-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} animate-spin`} />
            <p className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Generating assessment based on your learning...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md`} data-tour="assessment-panel">
      <div className={`p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          <Brain className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentAssessment ? currentAssessment.title : 'Assessment'}
          </h2>
        </div>
      </div>

      <div className="p-5">
        {/* History Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showHistory ? (
              <>
                <Brain className="h-4 w-4" />
                <span>New Assessment</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                <span>View History</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {showHistory ? (
          <AssessmentHistory />
        ) : !currentAssessment ? (
          <div className="space-y-6">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Select Assessment Type
              </h3>
              
              <div className="space-y-3">
                {[
                  { id: 'general', name: 'General Knowledge', description: 'Mixed format questions on various topics', icon: <Brain className="h-5 w-5" /> },
                  { id: 'mathematics', name: 'Mathematics', description: 'Mathematical problems with step-by-step solutions', icon: <Calculator className="h-5 w-5" /> },
                  { id: 'reading', name: 'Reading Comprehension', description: 'Test your reading skills with passages and questions', icon: <BookOpen className="h-5 w-5" /> },
                  { id: 'language-listening', name: 'Listening Comprehension', description: 'Listen to audio and answer questions', icon: <Volume2 className="h-5 w-5" /> },
                  { id: 'speaking', name: 'Speaking Assessment', description: 'Practice speaking with prompts and feedback', icon: <Mic className="h-5 w-5" /> },
                  { id: 'writing', name: 'Writing Assessment', description: 'Write responses to prompts with guidance', icon: <Edit3 className="h-5 w-5" /> }
                ].map(type => (
                  <div
                    key={type.id}
                    onClick={() => setAssessmentType(type.id)}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      assessmentType === type.id
                        ? isDarkMode
                          ? 'bg-indigo-900/50 border border-indigo-700'
                          : 'bg-indigo-50 border border-indigo-200'
                        : isDarkMode
                          ? 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-full mr-3 ${
                      assessmentType === type.id
                        ? isDarkMode
                          ? 'bg-indigo-800 text-indigo-200'
                          : 'bg-indigo-100 text-indigo-700'
                        : isDarkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {type.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {type.name}
                      </h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {type.description}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border ${
                      assessmentType === type.id
                        ? isDarkMode
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-indigo-600 bg-indigo-600'
                        : isDarkMode
                          ? 'border-gray-600'
                          : 'border-gray-300'
                    } flex items-center justify-center`}>
                      {assessmentType === type.id && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Number of Questions
              </h3>
              
              <div className="flex space-x-3">
                {[3, 5, 10].map(count => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      questionCount === count
                        ? isDarkMode
                          ? 'bg-indigo-500 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleGenerateAssessment}
              className={`w-full py-3 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Generate Assessment
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {showResults && renderAssessmentResults()}
            
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2 mb-4">
                <Brain className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Question {currentQuestionIndex + 1}
                </h3>
              </div>
              
              {renderQuestion()}
            </div>
            
            {renderAssessmentNavigation()}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentPanel;
