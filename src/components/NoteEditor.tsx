import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Strikethrough, List, ListOrdered, 
  Quote, Undo, Redo, Code, Mic, Loader2, XCircle 
} from 'lucide-react';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  isDarkMode?: boolean;
  placeholder?: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike[];
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    SpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

const NoteEditor: React.FC<NoteEditorProps> = ({ 
  content, 
  onChange,
  isDarkMode = false,
  placeholder = 'Take notes from your tutoring session...'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: `prose ${isDarkMode ? 'prose-invert' : ''} max-w-none focus:outline-none min-h-[150px]`,
      },
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const isSpeechRecognitionSupported = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  };

  const startSpeechRecognition = () => {
    if (!editor) return;
    setError(null);

    try {
      if (!isSpeechRecognitionSupported()) {
        throw new Error('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      }

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
        setError(null);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopSpeechRecognition();

        switch (event.error) {
          case 'not-allowed':
            setError('Please allow microphone access to use speech-to-text');
            break;
          case 'network':
            setError('Network error occurred. Please check your connection');
            break;
          case 'no-speech':
            setError('No speech detected. Please try again');
            break;
          case 'aborted':
            setError('Recording was aborted');
            break;
          default:
            setError('Speech recognition error. Please try again');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
      };

      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal && lastResult[0].transcript.trim()) {
          const { from, to } = editor.state.selection;
          if (from === to) {
            editor.commands.insertContent(lastResult[0].transcript + ' ');
          } else {
            editor.commands.replaceRange({ from, to }, lastResult[0].transcript + ' ');
          }
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Speech recognition setup error:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setError(error instanceof Error ? error.message : 'Failed to start speech recognition');
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeechRecognition();
    } else {
      setIsProcessing(true);
      startSpeechRecognition();
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({ 
    onClick, 
    isActive = false,
    disabled = false,
    title,
    children 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors ${
        isActive
          ? isDarkMode
            ? 'bg-gray-700 text-indigo-400'
            : 'bg-indigo-100 text-indigo-700'
          : isDarkMode
            ? 'text-gray-300 hover:bg-gray-700'
            : 'text-gray-600 hover:bg-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className={`border rounded-lg ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className={`p-1.5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-wrap gap-0.5`}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className={`h-5 w-px mx-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <div className={`h-5 w-px mx-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className={`h-5 w-px mx-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

        <ToolbarButton
          onClick={toggleRecording}
          isActive={isRecording}
          disabled={isProcessing || !isSpeechRecognitionSupported()}
          title={
            !isSpeechRecognitionSupported()
              ? 'Speech recognition is not supported in this browser'
              : isRecording
                ? 'Stop recording'
                : 'Start voice input'
          }
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
          )}
        </ToolbarButton>
      </div>

      <EditorContent 
        editor={editor} 
        className={`p-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}
      />

      {error && (
        <div className={`m-2 p-2 text-sm rounded-lg flex items-center space-x-2 ${
          isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
        }`}>
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
