import React from 'react';
import { Command } from 'lucide-react';
import { useStore } from '../store';

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string;
    description: string;
  }[];
}

const KeyboardShortcuts: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useStore();
  const isDarkMode = user?.settings?.theme === 'dark';

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'General',
      shortcuts: [
        { keys: '⌘K', description: 'Open command palette' },
        { keys: '⌘/', description: 'Show keyboard shortcuts' },
        { keys: '⌘,', description: 'Open settings' },
        { keys: 'Esc', description: 'Close modal / Cancel' }
      ]
    },
    {
      title: 'Chat',
      shortcuts: [
        { keys: '⌘N', description: 'New chat' },
        { keys: '⌘↑', description: 'Previous chat' },
        { keys: '⌘↓', description: 'Next chat' },
        { keys: '⌘⌫', description: 'Clear chat' }
      ]
    },
    {
      title: 'Notes',
      shortcuts: [
        { keys: '⌘B', description: 'Bold text' },
        { keys: '⌘I', description: 'Italic text' },
        { keys: '⌘L', description: 'Create list' },
        { keys: '⌘S', description: 'Save note' }
      ]
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: '⌘1', description: 'Go to Notes' },
        { keys: '⌘2', description: 'Go to Files' },
        { keys: '⌘3', description: 'Go to Assessment' },
        { keys: '⌘[', description: 'Toggle left sidebar' },
        { keys: '⌘]', description: 'Toggle right panel' }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />
        
        <div className={`inline-block w-full max-w-2xl my-16 text-left align-middle transition-all transform ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-xl rounded-xl`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Command className={`h-6 w-6 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <h2 className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {shortcutGroups.map((group) => (
                <div key={group.title}>
                  <h3 className={`text-sm font-medium mb-4 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {group.title}
                  </h3>
                  <div className="space-y-3">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.keys}
                        className="flex items-center justify-between"
                      >
                        <span className={`text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {shortcut.description}
                        </span>
                        <kbd className={`px-2 py-1 text-xs font-semibold rounded ${
                          isDarkMode
                            ? 'bg-gray-700 text-gray-300 border-gray-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        } border`}>
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;