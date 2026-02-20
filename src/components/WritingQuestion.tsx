import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Clock, Star, Eye, EyeOff 
} from 'lucide-react';
import { Question, WritingSubmission } from '../types';

interface WritingQuestionProps {
  question: Question;
  onSubmit: (submission: WritingSubmission) => void;
  submission?: WritingSubmission;
  onPeerReview: (reviewerId: string, feedback: string, rating: number) => void;
  peerReviewMode: boolean;
  isDarkMode: boolean;
  disabled: boolean;
}

const WritingQuestion: React.FC<WritingQuestionProps> = ({
  question,
  onSubmit,
  submission,
  onPeerReview,
  peerReviewMode,
  isDarkMode,
  disabled
}) => {
  const [content, setContent] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(question.timeLimit || 30);
  const [isActive, setIsActive] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(3);
  const [wordCount, setWordCount] = useState(0);
  const [grammarErrors, setGrammarErrors] = useState<{
    text: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
  }[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackTextareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize content from existing submission
  useEffect(() => {
    if (submission?.content) {
      setContent(submission.content);
      countWords(submission.content);
    }
  }, [submission]);

  // Timer functionality
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsActive(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, timeRemaining]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Auto-resize feedback textarea height
  useEffect(() => {
    if (feedbackTextareaRef.current) {
      feedbackTextareaRef.current.style.height = 'auto';
      feedbackTextareaRef.current.style.height = `${feedbackTextareaRef.current.scrollHeight}px`;
    }
  }, [feedback]);

  const startTimer = () => {
    setIsActive(true);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const stopTimer = () => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  function countWords(text: string) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    return words.length;
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    countWords(newContent);
    
    // Simple grammar check (just for demonstration)
    const simpleGrammarCheck = () => {
      const errors = [];
      
      // Check for double spaces
      if (newContent.includes('  ')) {
        errors.push({
          text: 'Double space detected',
          suggestion: 'Remove extra spaces',
          severity: 'low' as const
        });
      }
      
      // Check for common mistakes
      const commonMistakes = [
        { pattern: /\bi\b/g, correction: 'I', severity: 'medium' as const },
        { pattern: /\bthier\b/g, correction: 'their', severity: 'medium' as const },
        { pattern: /\byour\b/g, correction: 'you\'re', severity: 'low' as const },
        { pattern: /\bits\b/g, correction: 'it\'s', severity: 'low' as const }
      ];
      
      commonMistakes.forEach(mistake => {
        if (mistake.pattern.test(newContent)) {
          errors.push({
            text: `Possible incorrect usage: "${mistake.pattern.source.replace(/\\b/g, '')}"`,
            suggestion: `Consider using "${mistake.correction}" if referring to the contraction`,
            severity: mistake.severity
          });
        }
      });
      
      // Check for sentence ending without period
      const sentences = newContent.split(/[.!?]\s+/);
      const lastSentence = sentences[sentences.length - 1];
      if (lastSentence && lastSentence.length > 20 && !/[.!?]$/.test(newContent)) {
        errors.push({
          text: 'Sentence may be missing ending punctuation',
          suggestion: 'Add a period, question mark, or exclamation point',
          severity: 'medium' as const
        });
      }
      
      return errors;
    };
    
    // Only check grammar if we have enough content
    if (newContent.length > 10) {
      setGrammarErrors(simpleGrammarCheck());
    } else {
      setGrammarErrors([]);
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    
    const newSubmission: WritingSubmission = {
      id: submission?.id || Math.random().toString(36).substr(2, 9),
      questionId: question.id,
      content,
      timestamp: Date.now(),
      feedback: submission?.feedback || {
        points: grammarErrors.map(error => ({
          type: 'grammar',
          ...error
        })),
        overallScore: 0,
        overallFeedback: ''
      }
    };
    
    onSubmit(newSubmission);
    stopTimer();
  };

  const handlePeerReview = () => {
    if (!feedback.trim()) return;
    
    // Use a random ID for demo purposes - in a real app, this would be the current user's ID
    const reviewerId = 'user_' + Math.random().toString(36).substr(2, 5);
    onPeerReview(reviewerId, feedback, rating);
    setFeedback('');
  };

  const renderWritingPrompt = () => {
    return (
      <div className={`p-4 rounded-lg ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h3 className={`text-lg font-medium mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Writing Prompt
        </h3>
        <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
          <p>{question.prompt}</p>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          {question.writingType && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              isDarkMode
                ? 'bg-indigo-900/50 text-indigo-300'
                : 'bg-indigo-100 text-indigo-800'
            }`}>
              {question.writingType.charAt(0).toUpperCase() + question.writingType.slice(1)}
            </span>
          )}
          
          <span className={`px-2 py-1 text-xs rounded-full ${
            isDarkMode
              ? 'bg-blue-900/50 text-blue-300'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {question.wordLimit} words
          </span>
          
          <span className={`px-2 py-1 text-xs rounded-full ${
            isDarkMode
              ? 'bg-amber-900/50 text-amber-300'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {question.timeLimit} minutes
          </span>
        </div>
      </div>
    );
  };

  const renderWritingArea = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`text-sm ${
              wordCount > (question.wordLimit || 300) 
                ? 'text-red-500' 
                : isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Words: {wordCount}/{question.wordLimit || 300}
            </div>
            
            {isActive && (
              <div className={`flex items-center space-x-1 text-sm ${
                timeRemaining < 60 
                  ? 'text-red-500' 
                  : isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <Clock className="h-4 w-4" />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            {!isActive && !submission && (
              <button
                onClick={startTimer}
                disabled={disabled}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Start Writing
              </button>
            )}
            
            {isActive && (
              <button
                onClick={stopTimer}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                Pause
              </button>
            )}
            
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || disabled}
              className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } ${(!content.trim() || disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="h-4 w-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
        
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          disabled={disabled}
          placeholder="Start writing your response here..."
          className={`w-full min-h-[150px] p-3 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
          style={{ overflow: 'hidden' }}
        />
        
        {grammarErrors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Real-time Feedback
              </h4>
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className={`text-xs flex items-center space-x-1 ${
                  isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showFeedback ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    <span>Show ({grammarErrors.length})</span>
                  </>
                )}
              </button>
            </div>
            
            {showFeedback && (
              <div className="space-y-1">
                {grammarErrors.map((error, index) => (
                  <div 
                    key={index}
                    className={`text-xs p-2 rounded-lg ${
                      error.severity === 'high'
                        ? isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
                        : error.severity === 'medium'
                          ? isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'
                          : isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <div className="font-medium">{error.text}</div>
                    <div>{error.suggestion}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderModelAnswer = () => {
    if (!question.modelAnswer) return null;
    
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-sm font-medium ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Model Answer
          </h4>
          <button
            onClick={() => setShowModelAnswer(!showModelAnswer)}
            className={`text-xs flex items-center space-x-1 ${
              isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {showModelAnswer ? (
              <>
                <EyeOff className="h-3 w-3" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                <span>Show</span>
              </>
            )}
          </button>
        </div>
        
        {showModelAnswer && (
          <div className={`p-3 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
              {question.modelAnswer}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWritingGuidelines = () => {
    return (
      <div className="mt-4 space-y-3">
        {question.grammarRules && question.grammarRules.length > 0 && (
          <div>
            <h4 className={`text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Grammar Rules
            </h4>
            <ul className={`list-disc pl-5 text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {question.grammarRules.map((rule, index) => (
                <li key={index}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
        
        {question.styleGuide && (
          <div>
            <h4 className={`text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Style Guide
            </h4>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {question.styleGuide}
            </div>
          </div>
        )}
        
        {question.rubric && question.rubric.length > 0 && (
          <div>
            <h4 className={`text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Evaluation Criteria
            </h4>
            <div className="space-y-1">
              {question.rubric.map((criterion, index) => (
                <div 
                  key={index}
                  className={`text-sm flex justify-between ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  <span>{criterion.criteria}</span>
                  <span className="font-medium">{criterion.maxScore} points</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPeerReviewSection = () => {
    if (!submission || !peerReviewMode) return null;
    
    return (
      <div className={`mt-6 p-4 rounded-lg ${
        isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
      }`}>
        <h3 className={`text-lg font-medium mb-3 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Peer Review
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Feedback
            </label>
            <textarea
              ref={feedbackTextareaRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback on this writing..."
              className={`w-full min-h-[100px] p-3 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode
                  ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              style={{ overflow: 'hidden' }}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Rating
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 ${
                    star <= rating
                      ? 'text-yellow-500'
                      : isDarkMode ? 'text-gray-600' : 'text-gray-300'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handlePeerReview}
            disabled={!feedback.trim()}
            className={`w-full py-2 rounded-lg transition-colors ${
              isDarkMode
                ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            } ${!feedback.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Submit Review
          </button>
        </div>
        
        {submission.peerReviews && submission.peerReviews.length > 0 && (
          <div className="mt-4">
            <h4 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Reviews Received
            </h4>
            <div className="space-y-3">
              {submission.peerReviews.map((review, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-600' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'text-yellow-500 fill-current'
                              : isDarkMode ? 'text-gray-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(review.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {review.feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSubmissionFeedback = () => {
    if (!submission?.feedback || !submission.feedback.points || submission.feedback.points.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-4">
        <h4 className={`text-sm font-medium mb-2 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}>
          Feedback
        </h4>
        <div className="space-y-2">
          {submission.feedback.points.map((point, index) => (
            <div 
              key={index}
              className={`p-2 rounded-lg text-sm ${
                point.severity === 'high'
                  ? isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'
                  : point.severity === 'medium'
                    ? isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'
                    : isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
              }`}
            >
              <div className="font-medium">{point.text}</div>
              <div>{point.suggestion}</div>
            </div>
          ))}
          
          {submission.feedback.overallFeedback && (
            <div className={`p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="font-medium mb-1">Overall Feedback:</div>
              <div>{submission.feedback.overallFeedback}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderWritingPrompt()}
      
      {!peerReviewMode ? (
        <>
          {renderWritingArea()}
          {renderSubmissionFeedback()}
          {renderModelAnswer()}
          {renderWritingGuidelines()}
        </>
      ) : (
        <>
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h3 className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Submission
            </h3>
            <div className={`prose prose-sm max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
              {submission?.content || 'No submission yet'}
            </div>
          </div>
          {renderPeerReviewSection()}
        </>
      )}
    </div>
  );
};

export default WritingQuestion;
