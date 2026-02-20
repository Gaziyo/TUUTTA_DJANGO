import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useLMSStore } from '../store/lmsStore';
import { appendBotMessage, loadBotSessions, upsertBotSession } from '../services/botService';

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface BotSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: BotMessage[];
}

interface BotPipelineState {
  sessions: BotSession[];
  activeSessionId: string | null;
}

interface BotPipelineActions {
  createSession: (title?: string) => BotSession;
  setActiveSession: (id: string) => void;
  addMessage: (sessionId: string, message: BotMessage) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}

type BotPipelineContextType = BotPipelineState & BotPipelineActions;

const BotPipelineContext = createContext<BotPipelineContextType | null>(null);

function createInitialSession(title = 'New conversation'): BotSession {
  const now = new Date();
  return {
    id: `bot_${now.getTime()}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

export function BotPipelineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const { currentOrg } = useLMSStore();
  const [sessions, setSessions] = useState<BotSession[]>([createInitialSession('AI Bot Workspace')]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessions[0]?.id ?? null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentOrg?.id || !user?.id) return;
      const data = await loadBotSessions(currentOrg.id, user.id);
      if (!mounted) return;
      if (data.length) {
        setSessions(data);
        setActiveSessionId(data[0].id);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentOrg?.id, user?.id]);

  const createSession = useCallback((title?: string) => {
    const session = createInitialSession(title ?? 'New conversation');
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    if (currentOrg?.id && user?.id) {
      upsertBotSession(currentOrg.id, user.id, session);
    }
    return session;
  }, [currentOrg?.id, user?.id]);

  const setActiveSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const addMessage = useCallback((sessionId: string, message: BotMessage) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      return {
        ...session,
        messages: [...session.messages, message],
        updatedAt: new Date()
      };
    }));
    if (currentOrg?.id && user?.id) {
      const session = sessions.find(item => item.id === sessionId);
      if (session) {
        upsertBotSession(currentOrg.id, user.id, session);
      }
      appendBotMessage(currentOrg.id, sessionId, message);
    }
  }, [currentOrg?.id, user?.id, sessions]);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(session => (
      session.id === sessionId
        ? { ...session, title, updatedAt: new Date() }
        : session
    )));
    if (currentOrg?.id && user?.id) {
      const session = sessions.find(item => item.id === sessionId);
      if (session) {
        upsertBotSession(currentOrg.id, user.id, { ...session, title });
      }
    }
  }, [currentOrg?.id, user?.id, sessions]);

  const value = useMemo<BotPipelineContextType>(() => ({
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    addMessage,
    updateSessionTitle
  }), [sessions, activeSessionId, createSession, setActiveSession, addMessage, updateSessionTitle]);

  return (
    <BotPipelineContext.Provider value={value}>
      {children}
    </BotPipelineContext.Provider>
  );
}

export function useBotPipeline() {
  const ctx = useContext(BotPipelineContext);
  if (!ctx) {
    throw new Error('useBotPipeline must be used within a BotPipelineProvider');
  }
  return ctx;
}

export default BotPipelineContext;
