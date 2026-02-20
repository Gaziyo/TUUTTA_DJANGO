// ============================================================================
// DATA GATEWAY
// Unifies legacy (firestore) and LMS service access behind one interface
// ============================================================================

import * as firestoreService from './firestoreService';
import * as lmsService from './lmsService';

export const dataGateway = {
  legacy: firestoreService,
  lms: lmsService
};
