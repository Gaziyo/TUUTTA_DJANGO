import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check } from 'lucide-react';
import { Question, SpeakingRecording } from '../types';
import { VoiceRecorder, transcribeAudio } from '../lib/voice';

interface SpeakingQuestionProps {
  question: Question;
  onRecordingComplete: (recording: SpeakingRecording) => void;
  isDarkMode?: boolean;
  disabled?: boolean;
}

export const SpeakingQuestion: React.FC<SpeakingQuestionProps> = ({
  question,
  onRecordingComplete,
  isDarkMode = false,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<SpeakingRecording | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  const recorderRef = useRef(new VoiceRecorder());
  const waveformRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser compatibility
  useEffect(() => {
    const checkBrowserCompatibility = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      setIsMobileDevice(isMobile);
      setIsSafari(isSafari);
    };
    
    checkBrowserCompatibility();
  }, []);

  useEffect(() => {
    if (waveformRef.current) {
      recorderRef.current.initWaveform(`waveform-${question.id}`);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [question.id]);

  const startRecording = async () => {
    try {
      setError(null);
      setIsRecording(true);
      await recorderRef.current.startRecording(question.expectedDuration || 60);
      
      // Update duration display
      durationIntervalRef.current = setInterval(() => {
        setDuration(recorderRef.current.getRecordingDuration());
      }, 100);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      const audioBlob = await recorderRef.current.stopRecording();
      setIsRecording(false);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      // Create audio URL
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create recording object
      const recording: SpeakingRecording = {
        id: Math.random().toString(36).substr(2, 9),
        questionId: question.id,
        audioUrl,
        duration: recorderRef.current.getRecordingDuration(),
        timestamp: Date.now()
      };

      setCurrentRecording(recording);
      
      // Start transcription
      setTranscribing(true);
      try {
        const transcription = await transcribeAudio(audioBlob);
        recording.transcription = transcription;
      } catch (error) {
        console.error('Transcription error:', error);
        // Don't block the recording if transcription fails
      } finally {
        setTranscribing(false);
      }

      onRecordingComplete(recording);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
    }
  };

  const handlePlayPause = () => {
    if (!currentRecording) return;
    
    const wavesurfer = recorderRef.current.initWaveform(`waveform-${question.id}`);
    if (isPlaying) {
      wavesurfer.pause();
      setIsPlaying(false);
    } else {
      wavesurfer.play();
      setIsPlaying(true);
      wavesurfer.on('finish', () => setIsPlaying(false));
    }
  };

  const deleteRecording = () => {
    setCurrentRecording(null);
    const wavesurfer = recorderRef.current.initWaveform(`waveform-${question.id}`);
    wavesurfer.empty();
  };

  // Determine if voice recording should be disabled
  const isVoiceRecordingDisabled = disabled || (isMobileDevice && isSafari);
  const voiceRecordingTooltip = isVoiceRecordingDisabled 
    ? isMobileDevice && isSafari 
      ? "Voice recording not fully supported in Safari on mobile. Please use Chrome or type your response." 
      : "Voice recording not available"
    : isRecording 
      ? "Stop recording" 
      : "Start recording";

  return (
    <div className="space-y-4">
      {/* Display the question text prominently */}
      <div className={`mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <h3 className="text-lg font-medium mb-2">
          {question.question}
        </h3>
        {question.hint && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {question.hint}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {!isRecording && !currentRecording ? (
            <button
              onClick={startRecording}
              disabled={isVoiceRecordingDisabled}
              className={`p-3 rounded-full transition-colors ${
                isVoiceRecordingDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode
                    ? 'bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900/75'
                    : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
              title={voiceRecordingTooltip}
            >
              <Mic className="h-5 w-5" />
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className={`p-3 rounded-full transition-colors ${
                isDarkMode
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-900/75 animate-pulse'
                  : 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
              }`}
              title="Stop recording"
            >
              <Square className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handlePlayPause}
              className={`p-3 rounded-full transition-colors ${
                isDarkMode
                  ? 'bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900/75'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
          )}

          {currentRecording && (
            <button
              onClick={deleteRecording}
              className={`p-3 rounded-full transition-colors ${
                isDarkMode
                  ? 'bg-red-900/50 text-red-400 hover:bg-red-900/75'
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
              title="Delete recording"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}

          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {isRecording ? (
              <span className="text-red-500">{recorderRef.current.formatDuration(duration)}</span>
            ) : currentRecording ? (
              <span>{recorderRef.current.formatDuration(currentRecording.duration)}</span>
            ) : (
              <span>Max {recorderRef.current.formatDuration(question.expectedDuration || 60)}</span>
            )}
          </div>
        </div>

        {currentRecording?.transcription && (
          <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
            <Check className="h-5 w-5" />
            <span className="text-sm">Transcribed</span>
          </div>
        )}
      </div>

      <div 
        id={`waveform-${question.id}`} 
        ref={waveformRef}
        className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-4 min-h-[80px]`}
      />

      {error && (
        <div className={`text-sm p-3 rounded-lg ${
          isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-600'
        }`}>
          {error}
        </div>
      )}

      {transcribing && (
        <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Transcribing your response...
        </div>
      )}

      {currentRecording?.transcription && (
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          <h4 className={`text-sm font-medium mb-2 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Transcription:
          </h4>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {currentRecording.transcription}
          </p>
        </div>
      )}

      {(isMobileDevice || isSafari) && (
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          {isMobileDevice && isSafari 
            ? "Voice recording is not fully supported in Safari on mobile. Please use Chrome or type your response."
            : isMobileDevice 
              ? "Voice recording may have limited support on some mobile devices."
              : isSafari 
                ? "Voice recording may have limited support in Safari. Consider using Chrome for better compatibility."
                : ""}
        </div>
      )}

      {question.rubric && (
        <div className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <h4 className={`text-sm font-medium mb-2 ${
            isDarkMode ? 'text-gray-200' : 'text-gray-700'
          }`}>
            Evaluation Criteria:
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {question.rubric.map((criterion, index) => (
              <li key={index}>
                {criterion.criteria} (max {criterion.maxScore} points)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SpeakingQuestion;