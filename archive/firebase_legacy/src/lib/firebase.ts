/**
 * Firebase stub — Migration in progress.
 *
 * Firebase has been replaced by the Django REST API backend.
 * This stub exists to prevent import errors while the codebase is being migrated.
 * Do NOT add new Firebase usages — use apiClient from './api' instead.
 */

console.warn('[Tuutta] Firebase is deprecated. Use the Django API via src/lib/api.ts');

// Auth stub
export const auth = {
  currentUser: null,
  onAuthStateChanged: (_observer: (user: null) => void) => {
    _observer(null);
    return () => {};
  },
};

// Firestore stub
export const db = null;

// Storage stub
export const storage = null;

// Functions stub
export const functions = null;

// Google provider stub
export const googleProvider = null;

// Default export
export default { auth, db, storage, functions };
