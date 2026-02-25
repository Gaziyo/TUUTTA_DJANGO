// Phase 1 verification script (manual run)
// Required env:
// - VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID
// - VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
// - VERIFY_EMAIL, VERIFY_PASSWORD (Firebase Auth user)
// - ORG_ID, ENROLLMENT_ID, LESSON_ID
//
// Usage:
// VERIFY_EMAIL=... VERIFY_PASSWORD=... ORG_ID=... ENROLLMENT_ID=... LESSON_ID=... node scripts/phase1-verify.mjs

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VERIFY_EMAIL',
  'VERIFY_PASSWORD',
  'ORG_ID',
  'ENROLLMENT_ID',
  'LESSON_ID'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
});

const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, process.env.VERIFY_EMAIL, process.env.VERIFY_PASSWORD);

const orgId = process.env.ORG_ID;
const enrollmentId = process.env.ENROLLMENT_ID;
const lessonId = process.env.LESSON_ID;

const topEnrollmentRef = doc(db, 'enrollments', enrollmentId);
const orgEnrollmentRef = doc(db, 'organizations', orgId, 'enrollments', enrollmentId);
const topProgressRef = doc(db, 'progress', `${enrollmentId}_${lessonId}`);
const orgProgressRef = doc(db, 'organizations', orgId, 'progress', `${enrollmentId}_${lessonId}`);

const [topEnrollment, orgEnrollment, topProgress, orgProgress] = await Promise.all([
  getDoc(topEnrollmentRef),
  getDoc(orgEnrollmentRef),
  getDoc(topProgressRef),
  getDoc(orgProgressRef)
]);

console.log('Enrollment top-level exists:', topEnrollment.exists());
console.log('Enrollment org subcollection exists:', orgEnrollment.exists());
console.log('Progress top-level exists:', topProgress.exists());
console.log('Progress org subcollection exists:', orgProgress.exists());

if (topEnrollment.exists() && orgEnrollment.exists()) {
  const topData = topEnrollment.data();
  const orgData = orgEnrollment.data();
  console.log('Enrollment status match:', topData.status === orgData.status);
  console.log('Enrollment progress match:', topData.progress === orgData.progress);
}

if (topProgress.exists() && orgProgress.exists()) {
  const topData = topProgress.data();
  const orgData = orgProgress.data();
  console.log('Progress status match:', topData.status === orgData.status);
  console.log('Progress timestamps match:', topData.startedAt === orgData.startedAt);
}

console.log('Phase 1 verification complete.');
