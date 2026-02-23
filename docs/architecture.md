# Tuutta Production Architecture

## Strategic Decisions (Locked — Do Not Revisit During Build)

| Decision | Choice | Reason |
|----------|--------|--------|
| Tech stack | Keep Firebase + React | AI coders fastest here, zero infra to manage, revisit at 5,000 users |
| Data topology | Global collections + orgId on every document | One pattern, simpler rules, easier for AI coders to apply consistently |
| Unique constraints | Deterministic compound document IDs | `{orgId}_{userId}_{courseId}` — idempotent, no duplicate risk |
| Progress storage | Subcollection events + computed summary doc | Arrays that grow unboundedly become expensive and slow |
| Role source of truth | `users/{uid}.role` in Firestore | Single location, enforced by rules, not duplicated across collections |
| Navigation | One AppShell component | All competing shells deleted after AppShell ships |
| Market target | SMB/mid-market corporate training (50–500 employees) | Moodle is too complex for this buyer, enterprise LMS is too expensive |

---

## Collection Map

**Rule: If it is not in this list, it does not get created. No exceptions.**

```
/users/{uid}
/organizations/{orgId}
/courses/{courseId}
/courses/{courseId}/modules/{moduleId}
/courses/{courseId}/modules/{moduleId}/lessons/{lessonId}
/assessments/{assessmentId}
/enrollments/{orgId}_{userId}_{courseId}
/progress/{userId}_{courseId}
/progress/{userId}_{courseId}/events/{eventId}
/assessmentResults/{resultId}
/activityLog/{orgId}/events/{eventId}
```

---

## The 10 GO Gates

Check these daily. Any single FAIL = no-go for that phase.

| # | Gate | PASS Condition |
|---|------|----------------|
| G1 | Canonical Schema | All core entities defined once in `schema.ts`. All writes go through the service layer. Zero direct Firestore calls from components. |
| G2 | Single Topology | Global collections only. `orgId` on every document. No `/organizations/{id}/subcollections` pattern anywhere. |
| G3 | No Mock in Prod | Critical routes (create / enroll / play / submit / report) use real Firestore. Zero hardcoded or placeholder data in production paths. |
| G4 | Route Authorization | Route guards enforce role + orgId for every protected route. Tested: wrong-role user is redirected, not just hidden. |
| G5 | Backend Authorization | Firestore rules mirror route guards. Deny-by-default. Tested in emulator — direct SDK calls are blocked correctly. |
| G6 | Critical Path E2E | This full flow succeeds end-to-end with real data: create course → publish → enroll learner → complete lesson → submit assessment → manager/admin report reflects result. |
| G7 | State Consistency | Refresh or re-login at any point in the flow preserves state. No navigation loops. No duplicate writes on re-render. |
| G8 | Error Recovery | All async actions show loading / success / error states. Network disconnect mid-action shows actionable error. No silent failures. No unhandled promise rejections. |
| G9 | Observability | All key actions emit structured audit events: course publish, enrollment, lesson complete, assessment submit, role changes. Audit log panel reads real data. |
| G10 | Release + Rollback | Release checklist runs clean. Rollback procedure (`git revert + firebase deploy --only functions,firestore:rules`) documented and drilled. |

**VC Demo minimum:** G4 + G6 + G7 must PASS. All others can be in-progress.

---

## Access Control Matrix

### Firestore Rules

```
/users/{uid}
  read:  self OR (admin/manager in same org)
  write: self (limited fields: displayName, photoUrl) OR admin

/courses/{courseId}
  read:  any authenticated user in same org
  write: admin OR instructor in same org

/enrollments/{id}
  read:  enrolled user OR their manager OR admin (same org)
  write: admin OR manager (self-enroll only if org.allowSelfEnrollment = true)

/progress/{id}
  read:  the user themselves OR admin
  write: the user themselves only

/assessmentResults/{id}
  read:  the user themselves OR instructor OR admin
  write: the user themselves only (on submit)

/activityLog/{orgId}/events/{id}
  read:  admin OR manager in that org
  write: any authenticated user in that org (append-only)
```

Default: **deny all. Explicit allow only.**

---

## Protocol for Every AI Coding Session

Paste this at the start of every new AI coding session:

> "This is the Tuutta LMS project. Before writing any code:
>
> 1. Read `src/types/schema.ts` — all types are defined here
> 2. Read `src/services/` — all Firestore operations go through these functions
> 3. Never call Firestore (`getDoc`, `setDoc`, `updateDoc`, `query`) directly from a component
> 4. Never create a Firestore collection that is not in the collection map in `docs/architecture.md`
> 5. Check the relevant GO gate in the project plan before completing your task"

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-02-19 | Initial architecture lock | Production Architecture Reset |
