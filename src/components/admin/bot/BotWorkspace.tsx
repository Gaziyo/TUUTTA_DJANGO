import React, { useMemo, useState } from 'react';
import { Bot, Plus, Send } from 'lucide-react';
import { useBotPipeline } from '../../../context/BotPipelineContext';

interface BotWorkspaceProps {
  isDarkMode?: boolean;
}

const BotWorkspace: React.FC<BotWorkspaceProps> = ({ isDarkMode = false }) => {
  const { sessions, activeSessionId, createSession, setActiveSession, addMessage } = useBotPipeline();
  const [prompt, setPrompt] = useState('');

  const activeSession = useMemo(() => {
    return sessions.find(session => session.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed || !activeSession) return;
    addMessage(activeSession.id, {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date()
    });
    setPrompt('');
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Bot className="w-4 h-4 text-indigo-500" />
          AI Bot Workspace
        </div>
        <button
          onClick={() => createSession()}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-300"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className={`w-64 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4 space-y-2`}>
          <div className="text-xs uppercase tracking-wide text-gray-400">Recent chats</div>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                session.id === activeSession?.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {session.title}
            </button>
          ))}
        </aside>

        <main className="flex-1 flex flex-col p-6">
          <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-5 overflow-auto">
            {activeSession?.messages.length ? (
              <div className="space-y-4 text-sm text-gray-700">
                {activeSession.messages.map(message => (
                  <div key={message.id} className={message.role === 'user' ? 'text-right' : 'text-left'}>
                    <span className={`inline-block rounded-2xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.content}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Ask the AI Bot anything about your program, compliance, or content.
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask the AI Bot…"
              className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              disabled={!prompt.trim()}
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BotWorkspace;
