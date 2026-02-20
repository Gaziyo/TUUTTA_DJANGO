import React, { useState, useEffect, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Command, Settings, MessageSquarePlus, Book, Brain, Upload } from 'lucide-react';
import { useStore } from '../store';

interface CommandItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createNewChat, user } = useStore();
  const isDarkMode = user?.settings?.theme === 'dark';

  const commands: CommandItem[] = [
    {
      id: 'new-chat',
      title: 'New Chat',
      icon: <MessageSquarePlus className="h-5 w-5" />,
      action: () => {
        createNewChat();
        onClose();
      },
      shortcut: '⌘N'
    },
    {
      id: 'take-notes',
      title: 'Take Notes',
      icon: <Book className="h-5 w-5" />,
      action: () => {
        // Handle notes action
        onClose();
      },
      shortcut: '⌘T'
    },
    {
      id: 'assessment',
      title: 'Start Assessment',
      icon: <Brain className="h-5 w-5" />,
      action: () => {
        // Handle assessment action
        onClose();
      },
      shortcut: '⌘A'
    },
    {
      id: 'upload',
      title: 'Upload Files',
      icon: <Upload className="h-5 w-5" />,
      action: () => {
        // Handle upload action
        onClose();
      },
      shortcut: '⌘U'
    },
    {
      id: 'settings',
      title: 'Open Settings',
      icon: <Settings className="h-5 w-5" />,
      action: () => {
        // Handle settings action
        onClose();
      },
      shortcut: '⌘,'
    }
  ];

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useHotkeys('esc', () => {
    setIsOpen(false);
    onClose();
  });

  useHotkeys('enter', () => {
    if (filteredCommands[selectedIndex]) {
      filteredCommands[selectedIndex].action();
    }
  });

  useHotkeys('up', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => 
      prev > 0 ? prev - 1 : filteredCommands.length - 1
    );
  });

  useHotkeys('down', (e) => {
    e.preventDefault();
    setSelectedIndex(prev => 
      prev < filteredCommands.length - 1 ? prev + 1 : 0
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />
        
        <div className={`inline-block w-full max-w-2xl my-16 text-left align-middle transition-all transform ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-xl rounded-xl`}>
          <div className="relative">
            <div className={`flex items-center px-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <Command className={`h-5 w-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className={`w-full px-4 py-4 text-lg focus:outline-none ${
                  isDarkMode
                    ? 'bg-gray-800 text-white placeholder-gray-400'
                    : 'bg-white text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Type a command or search..."
              />
            </div>

            <div className={`max-h-96 overflow-y-auto ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              {filteredCommands.map((command, index) => (
                <div
                  key={command.id}
                  onClick={() => command.action()}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer ${
                    selectedIndex === index
                      ? isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-100'
                      : ''
                  } ${
                    isDarkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {command.icon}
                    </span>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      {command.title}
                    </span>
                  </div>
                  {command.shortcut && (
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {command.shortcut}
                    </span>
                  )}
                </div>
              ))}

              {filteredCommands.length === 0 && (
                <div className={`px-4 py-8 text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  No commands found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
