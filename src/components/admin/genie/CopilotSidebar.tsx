import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  Square,
  Check,
  Zap,
  MessageSquare,
  Target,
  Lightbulb,
  ChevronRight,
  X
} from 'lucide-react';
import { useGeniePipeline, PipelineStage, PIPELINE_STAGES } from '../../../context/GeniePipelineContext';
import { useLMSStore } from '../../../store/lmsStore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../lib/firebase';
import { transcribeAudio } from '../../../lib/voice';
import { SpeechSynthesizer } from '../../../lib/speech';
import './animations.css';

interface CopilotSidebarProps {
  isDarkMode: boolean;
  onClose: () => void;
  counts: {
    sources: number;
    members: number;
    departments: number;
    teams: number;
    enrollments: number;
  };
}

// Stage Guidance for ADDIE Framework
const STAGE_GUIDANCE: Record<PipelineStage, {
  title: string;
  description: string;
  tips: string[];
  actions: Array<{ id: string; label: string; icon: React.ReactNode }>;
  suggestedPrompts: string[];
}> = {
  ingest: {
    title: 'Ingest',
    description: 'Upload source content like policies, SOPs, and training manuals.',
    tips: [
      'Upload PDF, Word, or video files',
      'Tag sources by topic or regulation',
      'Include all relevant compliance documents'
    ],
    actions: [
      { id: 'openUpload', label: 'Upload Files', icon: <Zap className="w-3.5 h-3.5" /> }
    ],
    suggestedPrompts: [
      'What file types can I upload?',
      'How should I tag my sources?',
      'Analyze these sources for gaps'
    ]
  },
  analyze: {
    title: 'Analyze',
    description: 'AI identifies skill gaps and learning needs from your source content.',
    tips: [
      'Review extracted topics and themes',
      'Verify audience and prerequisites',
      'Check identified learning objectives'
    ],
    actions: [
      { id: 'runAnalysis', label: 'Run Analysis', icon: <Sparkles className="w-3.5 h-3.5" /> },
      { id: 'initializeAnalysis', label: 'Initialize', icon: <Zap className="w-3.5 h-3.5" /> }
    ],
    suggestedPrompts: [
      'What skill gaps did you find?',
      'Suggest learning objectives',
      'Who should take this course?'
    ]
  },
  design: {
    title: 'Design',
    description: 'Generate course structure and learning objectives.',
    tips: [
      'Review generated learning objectives',
      'Adjust module structure as needed',
      'Verify assessment alignment'
    ],
    actions: [
      { id: 'runDesign', label: 'Generate Design', icon: <Target className="w-3.5 h-3.5" /> }
    ],
    suggestedPrompts: [
      'Generate a course outline',
      'How many modules should I have?',
      'Suggest assessment types'
    ]
  },
  develop: {
    title: 'Develop',
    description: 'Create lesson content and assessments.',
    tips: [
      'Generate content for each lesson',
      'Add quiz questions and activities',
      'Review and refine AI-generated content'
    ],
    actions: [
      { id: 'generateAll', label: 'Generate Content', icon: <Lightbulb className="w-3.5 h-3.5" /> }
    ],
    suggestedPrompts: [
      'Write content for Module 1',
      'Create quiz questions',
      'Make this more engaging'
    ]
  },
  implement: {
    title: 'Implement',
    description: 'Deploy course and enroll learners.',
    tips: [
      'Set enrollment rules',
      'Configure completion deadlines',
      'Enable notifications'
    ],
    actions: [
      { id: 'addAll', label: 'Enroll All', icon: <Zap className="w-3.5 h-3.5" /> },
      { id: 'deploy', label: 'Publish Course', icon: <Check className="w-3.5 h-3.5" /> }
    ],
    suggestedPrompts: [
      'Who should I enroll?',
      'Set a completion deadline',
      'Configure notifications'
    ]
  },
  evaluate: {
    title: 'Evaluate',
    description: 'Track outcomes and iterate on the course.',
    tips: [
      'Review completion rates',
      'Analyze quiz performance',
      'Gather learner feedback'
    ],
    actions: [
      { id: 'runReport', label: 'Run Report', icon: <Zap className="w-3.5 h-3.5" /> }
    ],
    suggestedPrompts: [
      'Show completion rates',
      'How are learners performing?',
      'Suggest improvements'
    ]
  }
};

// AI Thinking Dots Component
const AIThinking: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
  <div className="flex items-center gap-1 px-3 py-2">
    <span className={`text-xs ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Genie is thinking</span>
    <div className="flex gap-0.5">
      <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'} genie-thinking-dot`} />
      <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'} genie-thinking-dot`} />
      <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'} genie-thinking-dot`} />
    </div>
  </div>
);

// Voice Wave Animation
const VoiceWave: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => (
  <div className="flex items-center gap-0.5 h-6">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={`w-1 rounded-full ${isDarkMode ? 'bg-red-400' : 'bg-red-500'} genie-voice-bar`}
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
);

// Suggested Prompts Component
const SuggestedPrompts: React.FC<{
  prompts: string[];
  onSelect: (prompt: string) => void;
  isDarkMode: boolean;
}> = ({ prompts, onSelect, isDarkMode }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-1 text-[10px] ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}
      >
        <Sparkles className="w-3 h-3" />
        Show suggestions
      </button>
    );
  }

  return (
    <div className={`rounded-lg border p-2 ${isDarkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Suggested Prompts
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          className={`p-0.5 rounded ${isDarkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt)}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-left transition-colors ${
              isDarkMode
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ChevronRight className="w-3 h-3 opacity-50" />
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function CopilotSidebar({ isDarkMode, onClose, counts }: CopilotSidebarProps) {
  const {
    currentStage,
    project,
    updateProject,
    invokeStageAction
  } = useGeniePipeline();
  const { currentOrg } = useLMSStore();

  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRef = useRef<SpeechSynthesizer | null>(null);
  const chatCompletion = httpsCallable(functions, 'genieChatCompletion');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const guidance = STAGE_GUIDANCE[currentStage];
  const chatHistory = useMemo(() => project?.copilot?.history || [], [project?.copilot?.history]);
  type CopilotMessage = { id: string; role: 'user' | 'assistant'; content: string; createdAt: number | Date };
  const currentStageConfig = PIPELINE_STAGES.find(s => s.id === currentStage);

  useEffect(() => {
    if (!speechRef.current) {
      speechRef.current = new SpeechSynthesizer();
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSending]);

  // Calculate confidence based on available data
  const confidence = (() => {
    switch (currentStage) {
      case 'ingest':
        return counts.sources > 0 ? 75 : 25;
      case 'analyze':
        return Math.min(100, (counts.sources > 0 ? 25 : 0) + (counts.members > 0 ? 25 : 0) + (counts.departments > 0 ? 25 : 0) + (counts.teams > 0 ? 25 : 0));
      case 'design':
        return project?.analysis ? 80 : 40;
      case 'develop':
        return project?.design?.moduleStructure?.length ? 85 : 50;
      case 'implement':
        return project?.implementation?.enrollmentRules?.length ? 80 : 50;
      case 'evaluate':
        return counts.enrollments > 0 ? 85 : 40;
      default:
        return 50;
    }
  })();

  const handleAction = async (actionId: string) => {
    if (!project) return;

    const actionEntry = {
      id: `act_${Date.now()}`,
      stage: currentStage,
      action: actionId,
      status: 'pending' as const,
      createdAt: new Date()
    };

    updateProject({
      copilot: {
        prompts: project.copilot?.prompts || {},
        history: project.copilot?.history || [],
        actionsTaken: [...(project.copilot?.actionsTaken || []), actionEntry],
        suggestions: project.copilot?.suggestions || []
      }
    });

    try {
      await invokeStageAction(currentStage, actionId);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const sendChat = async (override?: string) => {
    if (isSending) return;
    const content = (override ?? chatInput).trim();
    if (!content) return;

    // Add user message
    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user' as const,
      content,
      createdAt: new Date()
    };

    updateProject({
      copilot: {
        prompts: project?.copilot?.prompts || {},
        history: [...(project?.copilot?.history || []), userMessage],
        actionsTaken: project?.copilot?.actionsTaken || [],
        suggestions: project?.copilot?.suggestions || []
      }
    });

    setChatInput('');
    setIsSending(true);

    try {
      const systemPrompt = `You are Genie, an AI co-pilot for the Tuutta learning platform. You're helping with the ${currentStage} stage. Be concise and actionable.`;
      const userPrompt = `Stage: ${currentStage}\nProject: ${project?.name || 'Untitled'}\nUser: ${content}\n\nRespond in 2-3 short sentences.`;

      const result = await chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 150,
        orgId: currentOrg?.id
      });

      const payload = result.data as { content?: string };
      const reply = payload.content || 'I can help you with that. What would you like to know?';

      const assistantMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant' as const,
        content: reply,
        createdAt: new Date()
      };

      updateProject({
        copilot: {
          prompts: project?.copilot?.prompts || {},
          history: [...(project?.copilot?.history || []), userMessage, assistantMessage],
          actionsTaken: project?.copilot?.actionsTaken || [],
          suggestions: project?.copilot?.suggestions || []
        }
      });

      await speechRef.current?.speak(reply);
    } catch {
      const errorMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date()
      };

      updateProject({
        copilot: {
          prompts: project?.copilot?.prompts || {},
          history: [...(project?.copilot?.history || []), errorMessage],
          actionsTaken: project?.copilot?.actionsTaken || [],
          suggestions: project?.copilot?.suggestions || []
        }
      });
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        try {
          const text = await transcribeAudio(blob);
          setChatInput(text);
          await sendChat(text);
        } catch (error) {
          console.error('Transcription failed:', error);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      alert('Microphone access required');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const sidebarWidth = isExpanded ? 'w-[480px]' : 'w-80';

  return (
    <aside className={`${sidebarWidth} flex flex-col border-l transition-all duration-300 ${
      isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isDarkMode ? 'border-gray-800' : 'border-gray-100'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center genie-sparkle ${
            isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Co-Pilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isDarkMode
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '→' : '←'}
          </button>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
          }`}>
            Active
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Current Stage */}
        <div className={`rounded-xl p-3 genie-card-hover ${
          isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] uppercase tracking-wider ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              Current Stage
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {currentStageConfig?.shortLabel}
            </span>
          </div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {guidance.title}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {guidance.description}
          </p>
        </div>

        {/* Confidence with Segmented Gauge */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] uppercase tracking-wider ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              AI Confidence
            </span>
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {confidence}%
            </span>
          </div>
          {/* Segmented Gauge */}
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => {
              const segmentThreshold = (i + 1) * 10;
              const isActive = confidence >= segmentThreshold;
              const getSegmentColor = () => {
                if (segmentThreshold <= 30) return isActive ? (isDarkMode ? 'bg-red-500' : 'bg-red-400') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-200');
                if (segmentThreshold <= 60) return isActive ? (isDarkMode ? 'bg-amber-500' : 'bg-amber-400') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-200');
                return isActive ? (isDarkMode ? 'bg-emerald-500' : 'bg-emerald-400') : (isDarkMode ? 'bg-gray-800' : 'bg-gray-200');
              };
              return (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${getSegmentColor()}`}
                />
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div>
          <span className={`text-[10px] uppercase tracking-wider ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Tips for this stage
          </span>
          <ul className="mt-2 space-y-1.5">
            {guidance.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className={`w-3 h-3 mt-0.5 ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-500'
                }`} />
                <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Actions */}
        <div>
          <span className={`text-[10px] uppercase tracking-wider ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Quick Actions
          </span>
          <div className="mt-2 space-y-1.5">
            {guidance.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 genie-btn-press ${
                  isDarkMode
                    ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-[10px] uppercase tracking-wider ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              Chat
            </span>
          </div>
          <div className={`rounded-lg border p-2 h-40 overflow-auto ${
            isDarkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'
          }`}>
            {chatHistory.length === 0 ? (
              <p className={`text-[11px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Ask me anything about this stage...
              </p>
            ) : (
              <div className="space-y-2">
                {chatHistory.slice(-10).map((msg: CopilotMessage) => (
                  <div key={msg.id} className={`text-[11px] ${
                    msg.role === 'assistant'
                      ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                      : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <strong className="mr-1">{msg.role === 'assistant' ? 'AI' : 'You'}:</strong>
                    {msg.content}
                  </div>
                ))}
                {isSending && <AIThinking isDarkMode={isDarkMode} />}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Suggested Prompts */}
        {!isSending && chatHistory.length < 3 && (
          <SuggestedPrompts
            prompts={guidance.suggestedPrompts}
            onSelect={(prompt) => sendChat(prompt)}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      {/* Chat Input */}
      <div className={`p-3 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        {isRecording && (
          <div className={`flex items-center justify-center gap-2 py-2 mb-2 rounded-lg ${
            isDarkMode ? 'bg-red-500/10' : 'bg-red-50'
          }`}>
            <VoiceWave isDarkMode={isDarkMode} />
            <span className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>Recording...</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
            placeholder="Ask the co-pilot..."
            disabled={isRecording}
            className={`flex-1 px-3 py-2 rounded-lg text-xs border transition-colors ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            } disabled:opacity-50`}
          />
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-lg transition-all duration-200 genie-btn-press ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : isDarkMode
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => sendChat()}
            disabled={isSending || !chatInput.trim() || isRecording}
            className={`p-2 rounded-lg transition-all duration-200 genie-btn-press ${
              isSending || !chatInput.trim() || isRecording
                ? isDarkMode
                  ? 'bg-gray-800 text-gray-600'
                  : 'bg-gray-100 text-gray-300'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
