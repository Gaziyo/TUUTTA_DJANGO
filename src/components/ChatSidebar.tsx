import React, { useState, useCallback } from 'react';
import { Calendar, Trash2, Pencil, Check, X } from 'lucide-react';
import { useStore } from '../store';
import { formatDistanceToNow } from 'date-fns';

const ChatSidebar: React.FC = () => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const {
    getChatSessions,
    switchChat,
    currentChatId,
    deleteChat,
    updateChatTitle
  } = useStore();

  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  const chatSessions = getChatSessions();

  const handleSwitchChat = useCallback((chatId: string) => {
    if (editingChatId !== chatId) {
      switchChat(chatId);
    }
  }, [editingChatId, switchChat]);

  const handleDeleteChat = useCallback((e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      deleteChat(chatId);
      if (editingChatId === chatId) {
        setEditingChatId(null);
        setEditingTitle('');
      }
    }
  }, [deleteChat, editingChatId]);

  const startEditing = useCallback((e: React.MouseEvent, chatId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  }, []);

  const handleSaveTitle = useCallback((e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      updateChatTitle(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
    setEditingTitle('');
  }, [editingTitle, updateChatTitle]);

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle('');
  }, []);

  return (
    <div className="glass-sidebar-item rounded-xl @container">
      <div className={`pb-2 @[200px]:pb-3 mb-2 @[200px]:mb-3 border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
        <div className="flex items-center mb-2 @[200px]:mb-3">
          <h2 className={`text-xs @[180px]:text-sm @[220px]:text-base font-semibold flex items-center gap-1.5 @[200px]:gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Calendar className="h-3.5 w-3.5 @[200px]:h-4 @[200px]:w-4 text-[#766edd] flex-shrink-0" />
            <span className="truncate">Recent Chats</span>
          </h2>
        </div>

        <div className="space-y-1 @[200px]:space-y-1.5">
          {chatSessions.length === 0 ? (
            <p className={`text-center text-[10px] @[180px]:text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} py-2 @[200px]:py-3`}>
              No recent chats
            </p>
          ) : (
            chatSessions.map((session, index) => (
              <div
                key={session.id}
                data-chat-id={session.id}
                onClick={() => handleSwitchChat(session.id)}
                className={`flex items-center justify-between p-1.5 @[180px]:p-2 @[220px]:p-2.5 rounded-lg cursor-pointer transition-all ${
                  currentChatId === session.id
                    ? isDarkMode
                      ? 'bg-[#766edd]/20 text-[#766edd] border border-[#766edd]/30'
                      : 'bg-[#766edd]/10 text-[#766edd] border border-[#766edd]/20'
                    : isDarkMode
                      ? 'hover:bg-gray-800/50 text-gray-300 border border-transparent'
                      : 'hover:bg-white/50 text-gray-700 border border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  {editingChatId === session.id ? (
                    <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        className={`flex-1 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#766edd]/50 ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={e => handleSaveTitle(e, session.id)}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="Save title"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className={`p-1 ${
                          isDarkMode
                            ? 'text-gray-400 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        } rounded transition-colors`}
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className={`text-[10px] @[180px]:text-xs font-medium truncate ${
                        currentChatId === session.id
                          ? 'text-[#766edd]'
                          : isDarkMode ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        {session.title || `Chat ${index + 1}`}
                      </p>
                      <p className={`text-[9px] @[180px]:text-[10px] truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDistanceToNow(new Date(session.timestamp), { addSuffix: true })}
                      </p>
                    </>
                  )}
                </div>
                {editingChatId !== session.id && (
                  <div className="flex items-center space-x-0 @[200px]:space-x-0.5 flex-shrink-0 ml-1">
                    <button
                      onClick={e => startEditing(e, session.id, session.title)}
                      className={`p-0.5 @[180px]:p-1 rounded-lg ${
                        isDarkMode
                          ? 'text-gray-400 hover:text-[#766edd] hover:bg-gray-800/50'
                          : 'text-gray-400 hover:text-[#766edd] hover:bg-white/50'
                      } transition-all`}
                      title="Edit chat name"
                    >
                      <Pencil className="h-3 w-3 @[180px]:h-3.5 @[180px]:w-3.5" />
                    </button>
                    <button
                      onClick={e => handleDeleteChat(e, session.id)}
                      className={`p-0.5 @[180px]:p-1 rounded-lg ${
                        isDarkMode
                          ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800/50'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      } transition-all`}
                      title="Delete chat"
                    >
                      <Trash2 className="h-3 w-3 @[180px]:h-3.5 @[180px]:w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
