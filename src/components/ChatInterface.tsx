import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Mic, Send, Volume2, VolumeX, MessageSquarePlus, Globe, X, Paperclip, Loader2, Plus
} from 'lucide-react';
import { useStore, DEFAULT_SETTINGS } from '../store';
import { generateTutorResponse, stopTutorResponse } from '../lib/openai';
import { generateAssessment } from '../lib/assessment';
import { VoiceRecorder, transcribeAudio } from '../lib/voice';
import { SpeechSynthesizer } from '../lib/speech';
import { uploadFile } from '../lib/storage';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ChatInterfaceProps {
  variant?: 'default' | 'floating';
}

const ChatInterface = ({ variant = 'default' }: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null); // null, 'sending', 'searching', 'scraping', 'generating', 'uploading'
  const [showInputOptions, setShowInputOptions] = useState(false);

  const voiceRecorder = useRef(new VoiceRecorder());
  const speechSynthesizer = useRef(new SpeechSynthesizer());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Select state slices directly from the store
  const user = useStore(state => state.user);
  const currentChatId = useStore(state => state.currentChatId);
  const isRecording = useStore(state => state.isRecording);

  // Select actions
  const { addMessage, createNewChat, setIsRecording, addFile } = useStore(state => ({
    addMessage: state.addMessage,
    createNewChat: state.createNewChat,
    setIsRecording: state.setIsRecording,
    addFile: state.addFile
  }));

  const { chatSessions, files, settings } = useStore(state => {
    const userData = user ? state.userData[user.id] : null;
    return {
      chatSessions: userData?.chatSessions ?? [],
      files: userData?.files ?? [],
      settings: userData?.settings ?? DEFAULT_SETTINGS,
    };
  });

  const currentChat = useMemo(
    () => chatSessions.find(chat => chat.id === currentChatId) ?? null,
    [chatSessions, currentChatId]
  );
  const messages = useMemo(() => currentChat?.messages ?? [], [currentChat?.messages]);
  const isDarkMode = settings.theme === 'dark';

  // ... useEffects ...
  useEffect(() => {
    if (!currentChatId) createNewChat();
    // ... existing chat persistence logic
    if (user && !currentChatId) {
      const existingChats = chatSessions;
      if (existingChats.length === 0) {
        createNewChat();
      } else if (currentChatId !== existingChats[0].id) {
        useStore.setState({ currentChatId: existingChats[0].id });
      }
    }
  }, [user, currentChatId, createNewChat, chatSessions]);

  useEffect(() => {
    const synthesizer = speechSynthesizer.current;
    return () => {
      synthesizer.stop();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (isGlobeButtonClick = false) => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loadingStatus) return;

    const userMessage = { role: 'user' as const, content: trimmedInput };
    addMessage(userMessage);
    setInput('');
    setError(null);

    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = trimmedInput.match(urlRegex);
    const potentialUrl = urlMatch ? urlMatch[0] : null;
    const potentialQuestion = potentialUrl ? trimmedInput.replace(urlRegex, '').trim() : trimmedInput;
    const questionText = potentialQuestion && potentialQuestion !== '' ? potentialQuestion : null;

    if (isGlobeButtonClick && input.toLowerCase().includes("assessment")) {
      // ... Assessment Logic (Keep existing) ...
      setLoadingStatus('generating');
      try {
        const assessment = await generateAssessment(input, '', '', 'general', 5);
        if (assessment) {
          let assessmentString = "";
          assessment.questions.forEach((question, index) => {
            assessmentString += `Question ${index + 1}: ${question.question}\n\n`;
          });
          addMessage({ role: 'assistant', content: assessmentString });
        } else {
          addMessage({ role: 'assistant', content: "Sorry, I couldn't generate an assessment." });
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to get response');
      } finally {
        setLoadingStatus(null);
      }
    } else if (isGlobeButtonClick) {
      // ... Globe Button Logic (Keep existing) ...
      setLoadingStatus('searching');
      try {
        const currentMessages = [...(currentChat?.messages ?? []), userMessage];
        const response = await generateTutorResponse(currentMessages, files, true);
        if (response) {
          addMessage({ role: 'assistant', content: response });
          if (settings.speechEnabled) {
              await speechSynthesizer.current.speak(response, {
              voice: settings.voice ?? 'nova',
              speed: settings.speechSpeed ?? 1.0
            });
            setIsSpeaking(true);
          }
        } else {
          addMessage({ role: 'assistant', content: "Sorry, I couldn't find information." });
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to search');
      } finally {
        setLoadingStatus(null);
      }
    } else {
      if (potentialUrl && questionText) {
        // ... Scrape Logic (Keep existing) ...
        setLoadingStatus('scraping');
        try {
          // ... (Same scrape logic as before) ...
          const scrapeResponse = await fetch('/.netlify/functions/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: potentialUrl }),
          });
          // ... (basic error handling)
          const scrapeData = await scrapeResponse.json();
          const chunks: string[] = scrapeData.chunks || [];
          const scrapedText = chunks.join('\n\n');

          setLoadingStatus('sending');
          const finalContentForAI = `Based on the following content from ${potentialUrl}:\n\n"""\n${scrapedText}\n"""\n\nPlease answer this question: ${questionText}`;
          // ... (Truncation logic if needed) ...

          const messageToSendToAI = { role: 'user' as const, content: finalContentForAI };
          const history = currentChat?.messages ?? [];
          const historyWithoutLast = history.length > 0 && history[history.length - 1].role === 'user' ? history.slice(0, -1) : history;
          const messagesForAI = [...historyWithoutLast, messageToSendToAI];

          const response = await generateTutorResponse(messagesForAI, files, false);
          if (response) {
            addMessage({ role: 'assistant', content: response });
            // FIX: Audio for Scrape Response
            if (settings.speechEnabled) {
              await speechSynthesizer.current.speak(response, {
                voice: settings.voice ?? 'nova',
                speed: settings.speechSpeed ?? 1.0
              });
              setIsSpeaking(true);
            }
          } else {
            addMessage({ role: 'assistant', content: "Sorry, I couldn't generate a response." });
          }
        } catch {
          // ... error handling
          setLoadingStatus(null);
        } finally {
          setLoadingStatus(null);
        }
      } else {
        // ... Regular Chat Logic ...
        setLoadingStatus('sending');
        try {
          const currentMessages = [...(currentChat?.messages ?? []), userMessage];
          const response = await generateTutorResponse(currentMessages, files, false);
          if (response) {
            addMessage({ role: 'assistant', content: response });
            // FIX: Added audio playback for regular responses
            if (settings.speechEnabled) {
              await speechSynthesizer.current.speak(response, {
                voice: settings.voice ?? 'nova',
                speed: settings.speechSpeed ?? 1.0
              });
              setIsSpeaking(true);
            }
          } else {
            addMessage({ role: 'assistant', content: "Sorry, I couldn't generate a response." });
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to get response');
        } finally {
          setLoadingStatus(null);
        }
      }
    }
  };

  const handleCancel = () => {
    stopTutorResponse();
    speechSynthesizer.current.stop();
    setLoadingStatus(null);
    setIsSpeaking(false);
  };

  const handleNewChat = () => {
    createNewChat();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setLoadingStatus('uploading');
    setError(null);

    try {
      // Upload file using the shared storage logic
      const uploadedFile = await uploadFile(file, user.id);

      // Add to store (persists to Firestore)
      addFile(uploadedFile);

      // Notify user in chat
      const systemMessage = {
        role: 'user' as const, // Display as user action
        content: `Uploaded file: ${file.name}`
      };
      addMessage(systemMessage);

      // Optionally trigger AI acknowledgement?
      // For now, just listing it allows AI to "see" it in next request context

    } catch (error) {
      console.error('Upload failed:', error);
      setError('File upload failed. Please try again.');
    } finally {
      setLoadingStatus(null);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRecording = async () => {
    try {
      setError(null);
      if (!isRecording) {
        await voiceRecorder.current.startRecording();
        setIsRecording(true);
      } else {
        setIsRecording(false);
        setLoadingStatus('sending');
        const audioBlob = await voiceRecorder.current.stopRecording();
        const transcription = await transcribeAudio(audioBlob);
        if (transcription?.trim()) {
          setInput(transcription);
        } else {
          throw new Error('No speech detected.');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to record audio');
      setIsRecording(false);
    } finally {
      if (!isRecording) setLoadingStatus(null);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      speechSynthesizer.current.stop();
      setIsSpeaking(false);
    } else if (messages.length > 0) {
      // ... (Keep existing logic)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        speechSynthesizer.current.speak(lastMessage.content, {
          voice: settings.voice ?? 'nova',
          speed: settings.speechSpeed ?? 1.0,
          model: 'tts-1'
        });
        setIsSpeaking(true);
      }
    }
  };

  // Only disable during loading - allow mobile users to try voice input
  // Error handling in transcribeAudio will provide appropriate feedback
  const isVoiceRecordingDisabled = !!loadingStatus;

  const isFloating = variant === 'floating';

  return (
    <div
      className={`h-full min-h-0 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-mesh-gradient'} ${
        isFloating ? 'rounded-none shadow-none' : 'rounded-xl shadow-md'
      }`}
    >
      {!isFloating && (
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {messages.length > 0 ? 'Chat with Tutor' : 'Start a New Chat'}
              </h2>
              <button
                onClick={handleNewChat}
                className="ml-3 p-2 rounded-lg button-primary shadow-sm"
                title="Start new chat"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto ${isFloating ? 'p-4' : 'p-5'} space-y-4 ${
          isDarkMode ? 'bg-gray-900' : 'bg-transparent'
        }`}
      >
        {/* Messages with glass effect */}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${message.role === 'user' ? 'button-primary px-6 py-3 shadow-md' : 'glass-message'
              }`}>
              {message.role === 'user' ? (
                <p className="text-base">{message.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loadingStatus && (
          <div className="flex justify-start">
            <div className="glass-message">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-5 w-5 animate-spin text-[#766edd]" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {loadingStatus === 'sending' && 'Generating response...'}
                  {loadingStatus === 'searching' && 'Searching the web...'}
                  {loadingStatus === 'scraping' && 'Processing URL...'}
                  {loadingStatus === 'generating' && 'Generating assessment...'}
                  {loadingStatus === 'uploading' && 'Uploading file...'}
                </span>
                <button onClick={handleCancel} className="p-1.5 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-200 rounded-xl p-4 text-base max-w-[85%] shadow-sm">
              {error}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${
          isFloating ? 'p-3' : 'p-4'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />

          {/* Plus button with dropdown menu */}
          <div className="relative">
            <button
              onClick={() => setShowInputOptions(!showInputOptions)}
              disabled={!!loadingStatus}
              className={`p-2.5 rounded-full transition-all ${isDarkMode
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-[#766edd]'
                : 'bg-white/70 text-gray-600 hover:bg-white/90 hover:text-[#766edd] border border-gray-200'
                } ${loadingStatus ? 'opacity-50 cursor-not-allowed' : ''} backdrop-blur-md shadow-sm`}
              title="More options"
            >
              <Plus className={`h-5 w-5 transition-transform duration-200 ${showInputOptions ? 'rotate-45' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {showInputOptions && (
              <div className={`absolute bottom-full left-0 mb-2 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} py-2 min-w-[180px] backdrop-blur-xl`}>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowInputOptions(false);
                  }}
                  disabled={!!loadingStatus}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${isDarkMode
                    ? 'hover:bg-gray-700/50 text-gray-200'
                    : 'hover:bg-gray-50 text-gray-700'
                    } ${loadingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm">Upload File</span>
                </button>

                <button
                  onClick={() => {
                    toggleRecording();
                    setShowInputOptions(false);
                  }}
                  disabled={isVoiceRecordingDisabled}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${isRecording
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    : isDarkMode
                      ? 'hover:bg-gray-700/50 text-gray-200'
                      : 'hover:bg-gray-50 text-gray-700'
                    } ${isVoiceRecordingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Mic className="h-4 w-4" />
                  <span className="text-sm">{isRecording ? 'Stop Recording' : 'Voice Input'}</span>
                </button>

                <button
                  onClick={() => {
                    toggleSpeech();
                    setShowInputOptions(false);
                  }}
                  disabled={!!loadingStatus || messages.length === 0}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${isDarkMode
                    ? 'hover:bg-gray-700/50 text-gray-200'
                    : 'hover:bg-gray-50 text-gray-700'
                    } ${(!!loadingStatus || messages.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span className="text-sm">{isSpeaking ? 'Stop Speaking' : 'Read Aloud'}</span>
                </button>

                <button
                  onClick={() => {
                    if (input.trim()) handleSend(true);
                    setShowInputOptions(false);
                  }}
                  disabled={!input.trim()}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${isDarkMode
                    ? 'hover:bg-gray-700/50 text-gray-200'
                    : 'hover:bg-gray-50 text-gray-700'
                    } ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Search Web</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={!!loadingStatus}
            className="input-compact flex-1 text-sm min-w-0"
            onKeyPress={(e) => e.key === 'Enter' && handleSend(false)}
            onFocus={() => setShowInputOptions(false)}
          />

          <button
            onClick={() => handleSend(false)}
            disabled={!input.trim()}
            className={`flex-shrink-0 button-primary p-2.5 ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
