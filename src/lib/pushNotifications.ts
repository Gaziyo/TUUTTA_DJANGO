import { collection, doc, getDocs, query, setDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function registerPushToken(orgId: string, userId: string, token: string): Promise<void> {
  const tokenId = `${orgId}_${userId}_${token.slice(0, 12)}`;
  await setDoc(doc(db, 'pushTokens', tokenId), {
    orgId,
    userId,
    token,
    createdAt: Date.now()
  });
}

export async function unregisterPushToken(orgId: string, userId: string, token: string): Promise<void> {
  const tokenId = `${orgId}_${userId}_${token.slice(0, 12)}`;
  await deleteDoc(doc(db, 'pushTokens', tokenId));
}

export async function getUserPushTokens(orgId: string, userId: string): Promise<string[]> {
  const q = query(
    collection(db, 'pushTokens'),
    where('orgId', '==', orgId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docRef => docRef.data().token).filter(Boolean);
}
