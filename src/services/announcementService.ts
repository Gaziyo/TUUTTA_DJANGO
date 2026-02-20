import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Announcement } from '../types/lms';

const COLLECTION = 'announcements';

type TimestampLike = { toMillis?: () => number };

type AnnouncementDocData = {
  orgId: string;
  title: string;
  content: string;
  priority: Announcement['priority'];
  status: Announcement['status'];
  targetAudience: Announcement['targetAudience'];
  targetIds?: string[];
  isPinned?: boolean;
  publishAt?: number | TimestampLike | null;
  expiresAt?: number | TimestampLike | null;
  viewCount?: number;
  createdBy: string;
  createdAt?: number | TimestampLike;
  updatedAt?: number | TimestampLike;
};

const toMillisIfTimestamp = (value: number | TimestampLike | null | undefined) =>
  typeof value === 'object' && value !== null && typeof value.toMillis === 'function'
    ? value.toMillis()
    : value;

const toAnnouncement = (id: string, data: AnnouncementDocData): Announcement => ({
  id,
  orgId: data.orgId,
  title: data.title,
  content: data.content,
  priority: data.priority,
  status: data.status,
  targetAudience: data.targetAudience,
  targetIds: data.targetIds || [],
  isPinned: data.isPinned ?? false,
  publishAt: toMillisIfTimestamp(data.publishAt),
  expiresAt: toMillisIfTimestamp(data.expiresAt),
  viewCount: data.viewCount ?? 0,
  createdBy: data.createdBy,
  createdAt: toMillisIfTimestamp(data.createdAt),
  updatedAt: toMillisIfTimestamp(data.updatedAt)
});

export const announcementService = {
  list: async (orgId: string): Promise<Announcement[]> => {
    const q = query(
      collection(db, COLLECTION),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => toAnnouncement(docSnap.id, docSnap.data() as AnnouncementDocData));
  },
  create: async (announcement: Omit<Announcement, 'id' | 'viewCount' | 'createdAt' | 'updatedAt'>) => {
    const now = Timestamp.now();
    const payload = {
      ...announcement,
      publishAt: announcement.publishAt ? Timestamp.fromDate(new Date(announcement.publishAt)) : null,
      expiresAt: announcement.expiresAt ? Timestamp.fromDate(new Date(announcement.expiresAt)) : null,
      viewCount: 0,
      createdAt: now,
      updatedAt: now
    };
    const docRef = await addDoc(collection(db, COLLECTION), payload);
    return docRef.id;
  },
  update: async (announcementId: string, updates: Partial<Announcement>) => {
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    if (updates.publishAt) payload.publishAt = Timestamp.fromDate(new Date(updates.publishAt));
    if (updates.expiresAt) payload.expiresAt = Timestamp.fromDate(new Date(updates.expiresAt));
    await updateDoc(doc(db, COLLECTION, announcementId), payload);
  },
  remove: async (announcementId: string) => {
    await deleteDoc(doc(db, COLLECTION, announcementId));
  },
  publish: async (announcementId: string) => {
    await updateDoc(doc(db, COLLECTION, announcementId), {
      status: 'published',
      publishAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
};
