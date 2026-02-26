# Tutta Autonomous Learning IA — Execution Plan

## Goal
Implement the autonomous, ADDIE-driven architecture where:
- humans mainly upload knowledge,
- AI designs/delivers/assesses automatically,
- learners receive adaptive outcomes,
- humans intervene only for exceptions.

Risk and approval enforcement is defined in:
- `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md` (authoritative policy source).

---

## Current Baseline (Already in place)
- Week 1 core intelligence foundation implemented:
  - weighted gap matrix, migration/backfill, non-surrogate GNN versioning.
- Week 2 productization implemented:
  - optimizer guardrails + evaluation artifacts,
  - live learning-path/competency/remediation flows,
  - ingest reliability hardening + explicit error codes + retries.

Primary files already aligned:
- `backend/apps/learning_intelligence/tasks.py`
- `backend/apps/learning_intelligence/views.py`
- `backend/apps/knowledge/services.py`
- `src/services/learningPathService.ts`
- `src/services/competencyService.ts`
- `src/services/remediationService.ts`

---

## Delivery Model
- Sprint length: 1 week
- Cadence: backend + frontend + ML + QA in parallel
- Definition of done per sprint:
  - API contract stable
  - tests green
  - observability added
  - rollback path documented

---

## Sprint 1 — Unified Orchestration Spine

### Objectives
- Create one orchestration path for all learning-intelligence actions.
- Standardize event envelope and correlation IDs.

### Backend
- Add orchestrator service/module:
  - `backend/apps/learning_intelligence/services.py` (or new `orchestrator.py`)
- Add endpoint:
  - `POST /api/v1/organizations/{orgId}/cognitive-orchestrator/execute`
- Add canonical action dispatch for:
  - recommend, remediate, unlock, nudge, assess.

### Frontend
- Add orchestrator client:
  - `src/services/cognitiveOrchestratorService.ts`
- Route AI Bot/Genie action triggers through orchestrator.

### QA
- Contract tests for orchestrator request/response.
- Correlation ID propagation test.

### Acceptance
- 80%+ of adaptive actions originate from orchestrator endpoint.

---

## Sprint 2 — Autonomous ADDIE: Analysis + Design

### Objectives
- Remove manual field-heavy design setup.
- Auto-infer objectives, audience, and blueprint from uploaded knowledge + system context.

### Backend
- Add design pipeline endpoints:
  - `POST /api/v1/organizations/{orgId}/design/analyze`
  - `POST /api/v1/organizations/{orgId}/design/generate-blueprint`
- Auto-link:
  - competency framework,
  - Bloom targets,
  - modality strategy.

Files:
- `backend/apps/knowledge/tasks.py`
- `backend/apps/knowledge/services.py`
- `backend/apps/learning_intelligence/tasks.py`

### Frontend
- ELS Studio flow:
  - from “upload + one intent prompt” to generated blueprint.
- Reduce required inputs to minimal fields.

Files:
- `src/services/els/*`
- `src/components/*ELS*`

### QA
- Snapshot tests for generated blueprints.
- Coverage for low-confidence fallback to exception queue.

### Acceptance
- Manager can generate blueprint without manual objective-by-objective form entry.

---

## Sprint 3 — Autonomous ADDIE: Develop + Implement

### Objectives
- Generate publishable learning packages and deploy automatically.

### Backend
- Add package generation and publish endpoints:
  - `POST /api/v1/organizations/{orgId}/design/generate-content`
  - `POST /api/v1/organizations/{orgId}/design/publish-package`
- Persist package artifacts with version metadata.
- Link runtime assignment in learning engine.

Files:
- `backend/apps/courses/models.py`
- `backend/apps/courses/views.py`
- `backend/apps/learning_intelligence/tasks.py`

### Frontend
- ELS publish workflow + preview.
- Learning engine auto-assignment status UI.

Files:
- `src/services/els/*`
- `src/services/learningPathService.ts`
- `src/store/lmsStore.ts`

### QA
- Publish-to-assignment end-to-end test.
- Regression tests for course/path APIs.

### Acceptance
- From knowledge upload to learner-visible assigned package in one continuous flow.

---

## Sprint 4 — Assessment Runtime Unification

### Objectives
- Unify multi-format assessment generation, delivery, scoring, and outcome writing.

### Backend
- Extend assessment runtime to support modality-specific scoring pipelines:
  - reading/writing/listening/speaking.
- Standardize outcome record schema:
  - performance, objective attainment, competency progression.

Files:
- `backend/apps/assessments/*`
- `backend/apps/learning_intelligence/*`
- `backend/apps/analytics/*`

### Frontend
- Unified assessment renderer for multi-format items.
- Immediate outcome visualization post-submit.

Files:
- `src/components/*Assessment*`
- `src/services/assessmentService.ts`

### QA
- Deterministic scoring tests.
- Objective attainment contract tests.

### Acceptance
- Outcome payload available within seconds of submission.

---

## Sprint 5 — Exception-Only Human Governance

### Objectives
- Move human role from operator to exception reviewer.

### Backend
- Add exception queue domain:
  - low-confidence decisions,
  - high-risk compliance actions,
  - guardrail violations.
- Add endpoints:
  - `GET /api/v1/organizations/{orgId}/exceptions`
  - `POST /api/v1/organizations/{orgId}/exceptions/{id}/resolve`

Files:
- `backend/apps/governance/*`
- `backend/apps/learning_intelligence/views.py`

### Frontend
- Genie exception console with resolve/override workflows.

Files:
- `src/components/*Genie*`
- `src/services/governanceService.ts`

### QA
- Verify normal actions bypass manual review.
- Verify only flagged decisions hit queue.

### Acceptance
- 90%+ decisions fully autonomous (measured using the `Autonomous Decision Rate` contract in executive summary, excluding L3 decisions from denominator).

---

## Sprint 6 — Optimization, Experimentation, and Hardening

### Objectives
- Add continuous optimization with safe rollout.

### Backend
- Add A/B design experiment support for paths/items.
- Extend optimizer reporting and auto rollback triggers.
- Expand observability dashboards and decision trace logs.

Files:
- `backend/apps/learning_intelligence/tasks.py`
- `backend/apps/analytics/*`
- `backend/apps/governance/*`

### Frontend
- Genie experiment/readiness dashboards.
- AI Bot explanation references (why this action now).

Files:
- `src/services/adaptivePolicyService.ts`
- `src/services/gnnInsightService.ts`
- `src/components/admin/*`

### QA
- Load/performance tests for orchestrator and runtime.
- Chaos/failure-path tests for ingest and policy rollout.

### Acceptance
- Stable autonomous loop with measurable uplift and safe governance.

---

## Cross-Sprint Engineering Standards

### API Contract Standard
- Every decision endpoint returns:
  - `decision_id`
  - `policy_version`
  - `risk_tier`
  - `execution_mode` (`auto_execute`, `propose_only`, `manual_required`)
  - `guardrail_status`
  - `rationale`
  - `actions[]`

### Identifier and Routing Standard
- Canonical API domains use `orgId` in path:
  - `/api/v1/organizations/{orgId}/...`
- User-facing workspace routing uses `orgSlug`:
  - `/org/{orgSlug}/...`
- Resolver normalizes slug to authorized organization context before API execution.
- Event payloads and datastore records use `org_id` (never slug) as source of truth.

### Event Standard
- Every emitted event includes:
  - `event_id`, `event_type`, `occurred_at`
  - `org_id`, `actor`, `subject`
  - `correlation_id`, `source_module`

### Observability Standard
- For every action, record:
  - execution outcome,
  - latency,
  - confidence,
  - downstream learning impact.

---

## Ownership Matrix

### Backend
- `backend/apps/learning_intelligence/*`: orchestration, policy, outcomes
- `backend/apps/knowledge/*`: ingest, extraction, knowledge graph
- `backend/apps/courses/*`: paths/packages/runtime mapping
- `backend/apps/governance/*`: exception queue, guardrails, audit

### Frontend
- `src/services/*`: API adapters and contract mapping
- `src/components/admin/*`: Genie + exception + governance UX
- `src/components/*`: learner runtime, assessment rendering, outcome UX
- `src/store/lmsStore.ts`: central orchestration wiring state

### QA / Data / MLOps
- API contract and E2E tests
- policy evaluation reports
- rollout safety + rollback checks

---

## Program-Level Success Criteria
- Knowledge upload to first auto-generated learning package under 30 minutes.
- 80%+ reduction in manual form entry for managers/admins.
- 90%+ adaptive actions handled without human intervention.
- Instant assessment outcome and objective attainment for learners.
- Clear exception-only governance queue with full decision traceability.
