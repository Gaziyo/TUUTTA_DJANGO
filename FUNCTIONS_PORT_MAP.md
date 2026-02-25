# Firebase Functions → Django/Celery Port Map

Status: Draft (auto-generated from `functions/src/index.ts`)

## 1) HTTP / Callable Functions

- `apiV1` (onRequest)
  - Purpose: Express API wrapper for miscellaneous endpoints.
  - Proposed target: Decommission. Replace with explicit Django endpoints.

- `genieGenerateObjectives` (onCall)
  - Purpose: LLM objectives generation.
  - Proposed target: Already handled via `/api/v1/ai/chat/` (`src/lib/genie.ts`).
  - Status: Decommission Firebase function.

- `genieGenerateOutline` (onCall)
  - Purpose: LLM outline generation.
  - Proposed target: Already handled via `/api/v1/ai/chat/` (`src/lib/genie.ts`).
  - Status: Decommission Firebase function.

- `genieGenerateLessonContent` (onCall)
  - Purpose: LLM lesson content generation.
  - Proposed target: Already handled via `/api/v1/ai/chat/` (`src/lib/genie.ts`).
  - Status: Decommission Firebase function.

- `genieGenerateLessonCritique` (onCall)
  - Purpose: LLM critique.
  - Proposed target: Already handled via `/api/v1/ai/chat/` (`src/lib/genie.ts`).
  - Status: Decommission Firebase function.

- `genieChatCompletion` (onCall)
  - Purpose: LLM chat completion.
  - Proposed target: `/api/v1/ai/chat/` (Django).
  - Status: Decommission Firebase function.

- `genieWebSearch` (onCall)
  - Purpose: Web search via DuckDuckGo.
  - Proposed target: Django endpoint `/api/v1/ai/search/` (fast/full).
  - Status: Ported in code; Firebase function can be decommissioned.

- `genieTextToSpeech` (onCall)
  - Purpose: OpenAI TTS.
  - Proposed target: `/api/v1/ai/tts/` (Django).
  - Status: Decommission Firebase function after confirming parity.

- `genieTranscribeAudio` (onCall)
  - Purpose: Whisper transcription.
  - Proposed target: `/api/v1/ai/transcribe/` (Django).
  - Status: Decommission Firebase function.

- `genieEvidenceExport` (onCall)
  - Purpose: Evidence export across assessments/enrollments/compliance.
  - Proposed target: Django endpoint `/api/v1/organizations/{org_id}/evidence-export/`.
  - Status: Implemented (Django `EvidenceExportView`).

- `testOrgWebhook` (onCall)
  - Purpose: Send signed test webhook for org.
  - Proposed target: Django action `/api/v1/organizations/{org_id}/webhook-endpoints/test/`.
  - Status: Implemented.

- `recalculateAnalytics` (onCall)
  - Purpose: Force analytics recompute for org.
  - Proposed target: Django action `/api/v1/organizations/{org_id}/analytics-jobs/recalculate/`.
  - Status: Implemented.

## 2) Scheduled Jobs (Celery Beat)

- `genieReportScheduler` (daily)
  - Purpose: Schedule report runs.
  - Proposed target: Celery beat task.

- `managerDigestScheduler` (weekly)
  - Purpose: Queue manager digest runs.
  - Proposed target: Celery beat task.

- `managerDigestProcessor` (hourly)
  - Purpose: Process queued manager digests.
  - Proposed target: Celery beat task.

- `sendDeadlineReminders` (daily)
  - Purpose: Notify about upcoming due dates.
  - Proposed target: Celery beat task + notifications.

- `checkOverdueEnrollments` (daily)
  - Purpose: Overdue notifications and compliance events.
  - Proposed target: Celery beat task + notifications + audit logs.

- `competencyRefreshScheduler` (weekly)
  - Purpose: Aggregate competency snapshots.
  - Proposed target: Celery beat task + analytics tables.

- `analyticsRefreshScheduler` (weekly)
  - Purpose: Run org analytics job.
  - Proposed target: Celery beat task.

- `archiveOldCoursesScheduler` (monthly)
  - Purpose: Auto-archive stale courses.
  - Proposed target: Celery beat task.

- `retentionPolicyScheduler` (monthly)
  - Purpose: Enforce data retention policies.
  - Proposed target: Celery beat task.

- `notificationDispatcher` (every 5 minutes)
  - Purpose: Send queued notifications (email/push/in-app).
  - Proposed target: Celery beat task + notification outbox table.

## 3) Firestore Triggers → Django Signals / Hooks

- `enrollmentCreated`, `enrollmentCreatedOrg`
  - Purpose: notify learner + manager, audit log, webhook.
  - Proposed target: `post_save` on Enrollment.

- `memberCreated`
  - Purpose: apply assignment rules, audit log.
  - Proposed target: `post_save` on OrganizationMember.

- `coursePublished`, `coursePublishedOrg`
  - Purpose: apply assignment rules, audit log, webhook.
  - Proposed target: `post_save` on Course when status transitions to `published`.

- `policyUpdated`
  - Purpose: audit log + compliance notifications.
  - Proposed target: `post_save` on Organization (settings change).

- `enrollmentStatusGuard`, `enrollmentStatusGuardOrg`
  - Purpose: enforce enrollment status invariants.
  - Proposed target: model clean/save hooks.

- `assessmentResultGuard`, `assessmentResultGuardOrg`
  - Purpose: prevent score regression.
  - Proposed target: model clean/save hooks for AssessmentAttempt/Results model.

- `assessmentResultCreated`, `assessmentResultCreatedOrg`
  - Purpose: award achievements, analytics updates, notifications.
  - Proposed target: post-save signals on AssessmentAttempt.

- `enrollmentCompletionIssuer`, `enrollmentCompletionIssuerOrg`
  - Purpose: issue certificates, webhook.
  - Proposed target: post-save signal on Enrollment when status → completed.

## 4) Helper Services Needed in Django

- Notifications outbox + dispatcher
- Audit log writer
- Webhook dispatch + signing
- Assignment rules engine
- Report scheduler + report run history
- Manager digest generator
- Competency snapshots + analytics jobs

Next: confirm scope (port vs decommission) and implement in Django/Celery.
