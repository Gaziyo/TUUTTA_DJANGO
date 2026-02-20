import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { BotMessage, BotSession } from '../context/BotPipelineContext';

const COLLECTION = 'botSessions';

function botCollection(orgId: string) {
  return collection(db, 'organizations', orgId, COLLECTION);
}

type BotMessageDoc = {
  id: string;
  role: BotMessage['role'];
  content: string;
  createdAt?: { toDate?: () => Date } | Date;
};

export async function loadBotSessions(orgId: string, userId: string) {
  const q = query(
    botCollection(orgId),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title ?? 'AI Bot Session',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      messages: (data.messages ?? []).map((msg: BotMessageDoc) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt?.toDate?.() ?? new Date()
      }))
    } as BotSession;
  });
}

export async function upsertBotSession(orgId: string, userId: string, session: BotSession) {
  const ref = doc(botCollection(orgId), session.id);
  await setDoc(ref, {
    title: session.title,
    userId,
    orgId,
    createdAt: session.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    messages: session.messages
  }, { merge: true });
}

export async function appendBotMessage(orgId: string, sessionId: string, message: BotMessage) {
  const ref = doc(botCollection(orgId), sessionId);
  await updateDoc(ref, {
    updatedAt: serverTimestamp(),
    messages: arrayUnion(message)
  });
}
