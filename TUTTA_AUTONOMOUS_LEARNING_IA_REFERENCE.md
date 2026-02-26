# Tutta Autonomous Learning IA Reference

## Purpose
This document is the canonical architecture reference for the Tutta adaptive learning vision.

It captures the full logic of the system:
- Autonomous by default
- Human by exception
- User at the receiving end of AI-generated learning solutions
- One intelligence core powering AI Bot, Genie, ELS Studio, and Tutta Learning Engine

### Single Source of Truth
- This is the primary working document for architecture + implementation status.
- Progress tracking should be updated here first before any derivative summary docs.

---

## Core Operating Principle

### Autonomous by Default, Human by Exception
- Human-in-the-loop should primarily provide **knowledge input** (documents, media, policy sources).
- AI should automatically perform the learning design lifecycle, delivery decisions, assessment generation, scoring, and optimization.
- Human intervention should occur only for exceptions (low-confidence, high-risk, compliance-sensitive decisions).

### Runtime Decision Controls (Authoritative Source)
The enforceable risk tiers, approval matrix, guardrail rules, and decision log contract are maintained in:
- `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md`

This IA reference describes system intent; the appendix defines execution policy.

---

## System Logic Statement

The Tutta platform is a two-part intelligent learning system.

At the front end of the system, a human-in-the-loop (Manager, Admin, L&D lead, SME) provides organizational knowledge inputs such as documents, policies, procedures, media, and contextual requirements.

These inputs are processed by the AI/ML Learning Design System, which applies structured instructional design principles (ADDIE and adult learning design) to analyze needs, design pathways, develop learning assets, implement delivery logic, and prepare valid assessments.

At the receiving end of the system, the User (Learner) consumes generated learning solutions through adaptive delivery formats (reading, writing, listening, speaking) and multi-format assessments (MCQ, fill-in-the-blank, drag-and-drop, short/long response, scenario tasks, speaking/audio tasks).

After delivery, the system performs instant assessment and scoring, then produces measurable outputs:

1. Performance Results
   - score, pass/fail, proficiency progression, risk indicators

2. Learning Outcomes
   - demonstrated competency and Bloom-level evidence

3. Learning Objective Attainment
   - objective-by-objective achievement and gap closure

These outputs are continuously evaluated to trigger remediation/advancement and improve future design cycles.

---

## AI Tutor Alignment

### Why this architecture is similar to an AI Tutor
- Both are AI-first, stateful, adaptive systems.
- Both run a closed loop: analyze -> teach -> assess -> adapt.
- Both reduce manual setup and rely on intelligence over static workflows.

### Key difference
- Typical AI Tutor is primarily learner-level.
- Tutta extends this to enterprise-level orchestration (learner + team + org + governance).

---

## ADDIE Integration (Autonomous Execution Model)

### A) ANALYSIS (Auto)
- Ingest and normalize uploaded knowledge
- Infer audience, goals, and constraints from system data
- Build learner baseline and role/competency gap map
- Prioritize needs by risk/compliance urgency

### B) DESIGN (Auto)
- Generate outcomes and objective architecture
- Build Bloom progression and modality strategy
- Create adaptive path graph (prereq/unlock/remediation)
- Generate assessment blueprint by objective and modality

### C) DEVELOP (Auto)
- Generate multi-format learning content
- Generate activity and practice sets
- Generate question banks (MCQ, fill-in, drag-drop, short/long, speaking)
- Generate scoring keys, rubrics, and evaluation logic

### D) IMPLEMENT (Auto)
- Publish packages to runtime
- Assign and launch adaptive pathways
- Deliver lessons and assessments in real time
- Trigger interventions (nudge/remediation/unlock)

### E) EVALUATE (Auto)
- Score instantly and compute objective attainment
- Measure mastery progression (competency/Bloom/modality)
- Evaluate policy/model effectiveness
- Feed improvements back into ANALYSIS

---

## Final Comprehensive IA (v3)

```text
TUTTA_COGNITIVE_OS
├── 0. SYSTEM PRINCIPLE
│   ├── Autonomous by default
│   ├── Human by exception
│   └── Outcome-driven continuous learning loop
│
├── 1. INPUT LAYER (Minimal Human-in-the-Loop)
│   ├── Knowledge Source Intake
│   │   ├── Documents (PDF/DOC/PPT)
│   │   ├── Media (audio/video)
│   │   ├── URLs/web sources
│   │   └── Policies/SOP/compliance references
│   ├── System Data Inputs (automatic)
│   │   ├── Learner history
│   │   ├── Performance records
│   │   ├── Role/team/org context
│   │   └── Competency framework data
│   └── Human Exception Controls (optional)
│       ├── Approve high-risk actions
│       ├── Override low-confidence decisions
│       └── Audit/review flagged outputs
│
├── 2. AI LEARNING DESIGN CORE (ADDIE Autonomous Engine)
│   ├── A. ANALYSIS (Auto)
│   │   ├── Ingest/extract/normalize knowledge
│   │   ├── Infer audience + objectives
│   │   ├── Baseline learner/role gap analysis
│   │   └── Prioritize learning needs + risk/compliance urgency
│   ├── B. DESIGN (Auto)
│   │   ├── Generate learning objectives
│   │   ├── Build Bloom progression map
│   │   ├── Select modality mix (reading/writing/listening/speaking)
│   │   ├── Build adaptive path graph (prereq/unlock/remediation)
│   │   └── Create assessment blueprint
│   ├── C. DEVELOP (Auto)
│   │   ├── Generate multi-format learning content
│   │   ├── Generate activity/practice sets
│   │   ├── Generate assessment bank
│   │   │   ├── MCQ
│   │   │   ├── Fill in the blank
│   │   │   ├── Drag and drop
│   │   │   ├── Short/long response
│   │   │   └── Speaking/audio tasks
│   │   └── Generate scoring rubrics + answer keys
│   ├── D. IMPLEMENT (Auto)
│   │   ├── Publish learning packages to runtime
│   │   ├── Assign personalized pathways
│   │   ├── Deliver adaptive sessions
│   │   ├── Trigger interventions (nudge/remediation/unlock)
│   │   └── Run assessments in real time
│   └── E. EVALUATE (Auto)
│       ├── Instant scoring + feedback synthesis
│       ├── Learning objective attainment validation
│       ├── Competency/Bloom/modality progression tracking
│       ├── Policy/model effectiveness evaluation
│       └── Feed improvements back to ANALYSIS
│
├── 3. UNIFIED INTELLIGENCE RUNTIME (Single Brain)
│   ├── Learner State Engine
│   │   ├── Cognitive profile
│   │   ├── Mastery state
│   │   ├── Gap matrix
│   │   └── Risk/readiness state
│   ├── Decision Engine
│   │   ├── Next best action
│   │   ├── Path progression decision
│   │   ├── Remediation decision
│   │   └── Assessment selection decision
│   ├── Assessment Engine
│   │   ├── Objective-linked scoring
│   │   ├── Rubric grading (writing/speaking)
│   │   ├── Attempt logic
│   │   └── Immediate feedback generation
│   ├── Recommendation/Intervention Engine
│   │   ├── Adaptive content recommendations
│   │   ├── Remediation assignment
│   │   ├── Reinforcement practice
│   │   └── Advancement unlock
│   └── Knowledge Intelligence
│       ├── Knowledge graph + retrieval
│       ├── Evidence grounding
│       └── Context-aware response generation
│
├── 4. PRODUCT SURFACES (4 Interfaces, 1 Core)
│   ├── AI Bot
│   │   ├── Learner tutor/co-pilot
│   │   ├── Explain-why feedback
│   │   └── Guided practice
│   ├── Genie
│   │   ├── Org/team intelligence
│   │   ├── Readiness/risk insights
│   │   └── Exception intervention console
│   ├── ELS Studio
│   │   ├── AI content/design orchestration view
│   │   ├── Design simulation/preview
│   │   └── Publish controls
│   └── Tutta Learning Engine
│       ├── Delivery runtime
│       ├── Assessment runtime
│       └── Outcome runtime
│
├── 5. USER SYSTEM (Receiving End)
│   ├── Personalized Learning Experience
│   │   ├── Adaptive path
│   │   ├── Multi-format learning
│   │   └── AI assistance in-session
│   ├── Assessment Experience
│   │   ├── Diagnostic/formative/summative/remediation checks
│   │   ├── Multi-format questions
│   │   └── Instant feedback
│   └── Outcome Experience
│       ├── Performance results (score/proficiency/risk)
│       ├── Learning outcomes (competency mastery evidence)
│       └── Objective outcomes (achieved/not achieved + gap status)
│
├── 6. TRUST, GOVERNANCE, AND QUALITY
│   ├── Explainability logs (why decision happened)
│   ├── Model/policy registry + versioning
│   ├── Guardrails + staged rollout
│   ├── Bias/quality/compliance scans
│   └── Full audit trail
│
└── 7. CONTINUOUS CLOSED LOOP
    ├── Sense: ingest + interactions + assessments
    ├── Decide: AI policy chooses next action
    ├── Act: deliver/assess/remediate/advance
    ├── Measure: capture outcomes instantly
    └── Improve: auto-optimize design + policies
```

---

## Practical Product Rule

If a workflow requires heavy manual field entry by managers/admins, it violates this architecture.

The expected UX is:
1. Upload knowledge (and optional context)
2. AI infers and generates design + delivery + assessment
3. User receives adaptive learning and instant outcomes
4. Human reviews only flagged exceptions

---

## Implementation Blueprint

### 1) Canonical API Domains

```text
/api/v1/organizations/{orgId}/knowledge/
├── POST upload
├── POST ingest
├── GET documents
└── GET graph

/api/v1/organizations/{orgId}/design/
├── POST analyze
├── POST generate-blueprint
├── POST generate-content
└── POST publish-package

/api/v1/organizations/{orgId}/learning-runtime/
├── POST assign-paths
├── POST start-session
├── POST submit-assessment
└── POST execute-intervention

/api/v1/organizations/{orgId}/evaluation/
├── GET learner-outcomes
├── GET objective-attainment
├── GET policy-evaluation-report
└── POST optimize-policy

/api/v1/organizations/{orgId}/exceptions/
├── GET low-confidence-queue
├── GET high-risk-queue
└── POST resolve-exception
```

### 1.1) Identifier Contract (`orgId` vs `orgSlug`)

Use this contract to avoid API/client drift:
1. API write/read domain endpoints use `orgId` path keys:
   - `/api/v1/organizations/{orgId}/...`
2. Frontend routing and user-facing workspace URLs use `orgSlug`:
   - `/org/{orgSlug}/...`
3. Resolver bridge maps route slug to canonical org identity:
   - `GET /api/v1/workspaces/resolve/?orgSlug={orgSlug}`
4. Backend may accept slug on org-scoped routes for compatibility, but must normalize internally to `orgId`.
5. Event payloads always emit `org_id` (UUID/string identifier), not slug.

### 2) Event Contract (System Spine)

```text
EVENT_ENVELOPE
├── event_id
├── event_type
├── occurred_at
├── org_id
├── actor {type,id}
├── subject {type,id}
├── correlation_id
├── source_module
└── payload

CORE_EVENTS
├── knowledge.document_ingested
├── design.blueprint_generated
├── design.content_published
├── runtime.path_assigned
├── runtime.assessment_submitted
├── intelligence.next_best_action_generated
├── intervention.remediation_assigned
├── outcome.assessment_scored
├── outcome.objective_attainment_updated
└── governance.exception_flagged
```

### 3) Data Contracts (Minimum)

```text
LEARNER_STATE
├── user_id
├── competency_scores
├── bloom_mastery
├── modality_strengths
├── gap_matrix
└── risk_state

LEARNING_PACKAGE
├── package_id
├── objectives[]
├── path_graph
├── content_assets[]
├── assessment_blueprint
└── version_info

OUTCOME_RECORD
├── user_id
├── assessment_result
├── objective_attainment
├── recommended_action
└── evidence_refs
```

### 4) Rollout Phases

```text
PHASE_1 (Foundation)
├── unify learner state service
├── standardize event envelope
└── route all modules to shared outcomes

PHASE_2 (Autonomous ADDIE)
├── automate analysis/design/develop
├── publish package pipeline
└── integrate runtime execution

PHASE_3 (Closed-Loop Intelligence)
├── instant objective attainment tracking
├── policy optimization with guardrails
└── exception-only human governance
```

### 5) Success Metrics

- Manual fields completed by manager/admin reduced by at least 80%.
- Time from upload to first publishable learning package under 30 minutes.
- Objective attainment available within seconds of assessment submission.
- At least 90% of runtime decisions executed without manual intervention.
- Exception queue remains limited to low-confidence/high-risk decisions only.

---

## Phase 0 Completion Record (Contract Baseline v1.0)

**Status:** Completed  
**Locked On:** 2026-02-25

### Locked Deliverables
1. **Canonical package contracts locked**
   - `LearningPackage`
   - `AssessmentPackage`
   - `OutcomePackage`
   - Source section: **Data Contracts (Minimum)**

2. **Identifier contract locked**
   - API endpoints use `orgId`
   - Frontend/workspace routes use `orgSlug`
   - Source section: **Identifier Contract (`orgId` vs `orgSlug`)**

3. **Event envelope contract locked**
   - canonical event fields and core event set fixed
   - Source section: **Event Contract (System Spine)**

4. **Decision policy ownership locked**
   - thresholds/risk tiers owned by:
     - `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md`

### Phase 0 Gate Decision
- Contract ambiguities: **none open**
- Baseline state: **approved for Phase 1 execution**

---

## Detailed Implementation Plan (All Phases + Steps)

This section is the execution source for completing Phases 0–8 in sequence.
Each phase must pass its exit gate before moving to the next phase.

### Phase 0 — Architecture Lock + Contract Baseline
**Goal:** freeze non-negotiable contracts so implementation does not drift.
**Depends on:** none.

**Execution Steps**
1. Lock canonical package schemas:
   - `LearningPackage`, `AssessmentPackage`, `OutcomePackage`.
2. Lock identity contract:
   - backend/API uses `orgId`, frontend routes use `orgSlug`.
3. Lock event envelope fields:
   - `event_id`, `event_type`, `org_id`, `actor`, `subject`, `correlation_id`, `payload`.
4. Lock decision policy ownership:
   - runtime thresholds owned by `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md`.
5. Publish contract examples in doc + sample payloads.

**Deliverables**
- versioned schema docs
- event envelope examples
- API identifier contract note

**Validation**
- Backend and frontend can parse same payload fixtures without conversion ambiguity.

**Exit Gate**
- No open contract questions remain.

---

### Phase 1 — Input + Ingestion Reliability
**Goal:** make upload the only required human action and ensure robust ingest.
**Depends on:** Phase 0 contracts.

**Execution Steps**
1. Standardize upload entrypoint:
   - files, media, URLs, policy sources.
2. Add capability checks:
   - OCR/audio/video deps and configuration readiness.
3. Add resilient execution:
   - retry/backoff, terminal failure classification, dead-letter bucket.
4. Add explicit error taxonomy:
   - machine-readable `error_code`, retryable flag, details.
5. Persist ingest provenance:
   - input source refs, extraction metadata, timestamps, attempts.

**Implementation Targets**
- `backend/apps/knowledge/services.py`
- `backend/apps/knowledge/tasks.py`
- `backend/apps/knowledge/views.py`

**Validation**
- per-source ingest tests (pdf/url/audio/video/text)
- retry and dead-letter behavior tests

**Exit Gate**
- Upload → ingest is stable and failures are actionable.

---

### Phase 2 — ANALYZE Engine (Autonomous Gap Intelligence)
**Goal:** infer audience/objectives/gaps from system data + uploaded knowledge.
**Depends on:** Phase 1 reliable ingest.

**Execution Steps**
1. Build context aggregator:
   - memberships, competency mappings, assessment outcomes, history.
2. Compute baseline state:
   - mastery, Bloom/modality profile, risk/readiness.
3. Compute target state:
   - role competency requirements, compliance policy constraints.
4. Compute weighted gaps:
   - learner-level + cohort-level priority ranking.
5. Generate objective candidates:
   - map ranked gaps into objective architecture inputs.

**Implementation Targets**
- `backend/apps/learning_intelligence/tasks.py`
- `backend/apps/learning_intelligence/services.py`
- `backend/apps/competencies/*`

**Validation**
- deterministic gap scenarios
- objective candidate quality checks

**Exit Gate**
- `ANALYZE` outputs objective map + ranked gaps without manual data-entry forms.

---

### Phase 3 — DESIGN + DEVELOP Engines
**Goal:** auto-generate versioned learning and assessment packages.
**Depends on:** Phase 2 analyze outputs.

**Execution Steps**
1. Generate objective architecture:
   - sequencing, Bloom progression, modality strategy.
2. Generate adaptive path graph:
   - prerequisites, unlock/remediation branches.
3. Generate learning content assets:
   - lessons, activities, guided practice.
4. Generate assessment package:
   - item bank + rubrics + scoring policies.
5. Stamp package lineage:
   - package version, policy/model versions, provenance hash.

**Implementation Targets**
- `backend/apps/courses/*`
- `backend/apps/assessments/*`
- `backend/apps/learning_intelligence/*`

**Validation**
- package schema conformance tests
- assessment rubric coverage tests

**Exit Gate**
- `LearningPackage` + `AssessmentPackage` generated and versioned automatically.

---

### Phase 4 — IMPLEMENT Engine (Explicit Enrollment Orchestration)
**Goal:** deploy generated packages and enroll users automatically.
**Depends on:** Phase 3 package stability.

**Execution Steps**
1. Publish package to runtime catalog.
2. Resolve audience/cohort:
   - user/team/role/org targeting from analyze/design outputs.
3. Run **Enrollment Orchestrator**:
   - create enrollments,
   - assign due dates/priority,
   - attach assessment package,
   - emit notifications.
4. Activate runtime delivery + assessments.
5. Activate intervention triggers:
   - nudge, remediation, unlock transitions.

**Implementation Targets**
- `backend/apps/enrollments/*`
- `backend/apps/courses/views.py`
- `backend/apps/learning_intelligence/tasks.py`
- `src/services/learningPathService.ts`

**Validation**
- publish-to-enrollment integration tests
- no-manual-enrollment happy path test

**Exit Gate**
- users are enrolled from package rules with zero manual assignment in normal flow.

---

### Phase 5 — EVALUATE Engine + Outcome Intelligence
**Goal:** produce immediate + delayed outcomes and close the ADDIE loop.
**Depends on:** Phase 4 runtime activation.

**Execution Steps**
1. Implement instant scoring and objective attainment updates.
2. Generate `OutcomePackage` consistently:
   - performance, outcomes, objective attainment, next-best-action.
3. Add delayed outcome windows:
   - retention/transfer signals at 7d/30d.
4. Feed evaluation outputs back to `ANALYZE`.

**Implementation Targets**
- `backend/apps/assessments/*`
- `backend/apps/learning_intelligence/*`
- `backend/apps/analytics/*`

**Validation**
- objective attainment latency tests
- outcome package contract tests

**Exit Gate**
- evaluation artifacts automatically influence the next analyze run.

---

### Phase 6 — Control, Reliability, and Recoverability
**Goal:** run orchestration safely at production scale.
**Depends on:** Phases 1–5 operational.

**Execution Steps**
1. Implement run state machine:
   - `queued → ingesting → analyzing → designing → developing → implementing → evaluating → completed|failed|exception_required|canceled`.
2. Enforce idempotent run starts:
   - duplicate `Idempotency-Key` returns existing `run_id`.
3. Add control operations:
   - resume, cancel, retry-stage.
4. Add complete traceability:
   - stage timestamps, correlation IDs, attempt counts, error class.

**Implementation Targets**
- `backend/apps/learning_intelligence/views.py`
- `backend/apps/learning_intelligence/tasks.py`
- orchestrator-specific service layer

**Validation**
- replay safety tests
- resume/cancel/retry-stage tests

**Exit Gate**
- every run is recoverable, traceable, and replay-safe.

---

### Phase 7 — Quality Gates + Exception-Only Human Governance
**Goal:** keep autonomy high while routing only risky decisions to humans.
**Depends on:** Phase 6 controls and tracing.

**Execution Steps**
1. Add stage quality gates:
   - confidence, risk, quality checks, gate result.
2. Route flagged runs to exception queue only:
   - low confidence, high-risk compliance, guardrail violation.
3. Implement reviewer actions:
   - approve/reject/override, reason mandatory.
4. Implement exception SLA:
   - priority, due date, escalation level.

**Implementation Targets**
- `backend/apps/governance/*`
- `backend/apps/learning_intelligence/*`
- `src/services/governanceService.ts`

**Validation**
- exception routing tests
- reviewer action and audit trail tests

**Exit Gate**
- normal runs remain autonomous; human work exists only in exception queue.

---

### Phase 8 — Observability, Cost, and Rollout Hardening
**Goal:** production hardening with measurable reliability, quality, and economics.
**Depends on:** all previous phases.

**Execution Steps**
1. Add run/stage telemetry:
   - latency, retries, failures by class.
2. Add quality telemetry:
   - coverage, validity, fairness/bias.
3. Add learning impact telemetry:
   - completion, mastery lift, intervention success.
4. Add cost telemetry:
   - token/compute per run and per package.
5. Add rollout hardening:
   - staged rollout, rollback, kill-switch controls.

**Implementation Targets**
- `backend/apps/analytics/*`
- `backend/apps/governance/*`
- admin dashboards and reporting views

**Validation**
- SLO dashboard sanity checks
- rollback drill test

**Exit Gate**
- operators can manage reliability, learning impact, and cost from one control plane.

---

## Implementation Dependency Order (Strict)
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8

**Sequencing Rule**
- Do not start Phase 4+ until Phase 3 package contracts are stable.
- Do not start Phase 7 until Phase 6 run controls are validated.

---

## Progress Checklist (Canonical Tracker)

### Overall Status
- [x] Phase 0 complete
- [x] Phase 1 complete
- [x] Phase 2 complete
- [x] Phase 3 complete
- [x] Phase 4 complete
- [x] Phase 5 complete
- [x] Phase 6 complete
- [x] Phase 7 complete
- [x] Phase 8 complete

### Phase 0 — Architecture Lock + Contract Baseline
- [x] Freeze package contracts (`LearningPackage`, `AssessmentPackage`, `OutcomePackage`)
- [x] Freeze identifier contract (`orgId` API / `orgSlug` UI)
- [x] Freeze event envelope contract
- [x] Freeze decision policy ownership

### Phase 1 — Input + Ingestion Reliability
- [x] Standardize upload channels
- [x] Add capability pre-checks
- [x] Implement retry/backoff + explicit error codes + dead-letter
- [x] Persist ingestion provenance metadata

### Phase 2 — ANALYZE Engine
- [x] Build LMS/system context aggregator
- [x] Compute baseline learner/cohort state
- [x] Compute target state from role/compliance requirements
- [x] Compute weighted gaps and priorities
- [x] Auto-generate objective candidates

### Phase 3 — DESIGN + DEVELOP
- [x] Generate objective architecture automatically
- [x] Generate adaptive path graph automatically
- [x] Generate learning assets automatically
- [x] Generate assessment bank + rubrics automatically
- [x] Stamp artifact lineage/version metadata

### Phase 4 — IMPLEMENT (Enrollment Explicit)
- [x] Publish package to runtime catalog
- [x] Resolve target cohorts automatically
- [x] Create enrollment records automatically
- [x] Assign due dates/priority + attach assessments
- [x] Trigger notifications + activate runtime

### Phase 5 — EVALUATE + Outcome Intelligence
- [x] Deliver instant scoring pipeline
- [x] Generate `OutcomePackage`
- [x] Add 7d/30d retention/transfer signals
- [x] Feed outcomes back into ANALYZE

### Phase 6 — Control, Reliability, Recoverability
- [x] Implement full run state machine
- [x] Enforce idempotency key behavior
- [x] Implement resume/cancel/retry-stage controls
- [x] Persist traceability fields (timestamps/correlation/attempt)

### Phase 7 — Quality Gates + Exception Governance
- [x] Implement confidence/risk/quality stage gates
- [x] Route only flagged runs to exception queue
- [x] Implement reviewer actions (approve/reject/override)
- [x] Enforce exception SLA fields

### Phase 8 — Observability + Cost + Rollout Hardening
- [x] Add stage/run telemetry
- [x] Add quality/fairness telemetry
- [x] Add runtime impact telemetry
- [x] Add cost telemetry
- [x] Add staged rollout + rollback controls

### Readiness Checklist (Go/No-Go)
- [ ] ≥80% reduction in manual manager/admin data entry
- [ ] Upload-to-first-package under 30 minutes
- [ ] Objective attainment available within seconds post-submit
- [ ] ≥90% autonomous runtime decisions
- [ ] Exception queue limited to low-confidence/high-risk only

---

## Phase 1–8 Completion Report (One-Page)

**Report Date:** February 26, 2026  
**Status:** Phase 1 through Phase 8 implemented and validated in backend/API scope.

### Scope Completed
- Autonomous ADDIE pipeline execution path implemented end-to-end (`ingest -> analyze -> design -> develop -> implement -> evaluate`).
- Canonical phase outputs persisted in project state (`LearningPackage`, `AssessmentPackage`, `OutcomePackage` lineage and references).
- Enrollment orchestration made explicit in IMPLEMENT (cohort resolution, enrollment creation, due dates, notifications).
- Quality gates and exception routing enforced (confidence/risk/quality checks with exception queue workflow).
- Control/reliability plane added (idempotent runs, resume/cancel/retry-stage controls, run states, trace fields).
- Observability/rollout controls added (phase metrics, quality metadata, runtime metrics, cost fields, rollout guardrails).

### Key Delivery Artifacts
- `backend/apps/genie/tasks.py`  
  - Ingest reliability with capability checks, retry/backoff metadata, dead-letter capture, provenance.
  - Analyze context aggregation with baseline/target state and weighted gap objective generation.
  - Design/Develop package generation with lineage/version metadata.
  - Implement runtime catalog + auto enrollment orchestration.
  - Evaluate outcome generation and feedback loop into next analyze cycle.
  - Autonomous orchestrator + resume/cancel/retry-stage task controls.
- `backend/apps/genie/views.py`  
  - Added API endpoints: `run-autonomous`, `resume`, `cancel`, `retry-stage`, `rollout`, `status`, `metrics`, `exceptions`, `resolve`.
- `backend/apps/genie/migrations/0003_elsproject_autonomous_mode_and_more.py`  
  - Added run-state, phase-gate, exception queue, and run-metric persistence fields/models.
- `backend/apps/genie/tests/test_views.py`  
  - Added deterministic autonomous pipeline tests, idempotency checks, exception flow, and control-plane endpoint tests.

### Validation Evidence
- Migration status:
  - `python manage.py makemigrations --check` -> no pending model diffs.
  - `python manage.py migrate --noinput` -> applied `genie.0003...` successfully.
- Test execution:
  - `backend/apps/genie/tests/test_views.py`
  - `backend/apps/learning_intelligence/tests/test_week1_core_intelligence.py`
  - `backend/apps/learning_intelligence/tests/test_week2_productization.py`
  - Result: **41 passed**.

### Phase-by-Phase Exit Confirmation
- **Phase 1:** Ingestion reliability + provenance implemented.
- **Phase 2:** Analyze engine context + weighted gap objective synthesis implemented.
- **Phase 3:** Design/develop autonomous package generation + lineage implemented.
- **Phase 4:** Enrollment-explicit implementation and activation implemented.
- **Phase 5:** Outcome intelligence + analyze feedback loop implemented.
- **Phase 6:** Run state machine + idempotency + control actions implemented.
- **Phase 7:** Quality gates + exception governance/reviewer actions implemented.
- **Phase 8:** Telemetry and rollout hardening controls implemented.

### Remaining Go/No-Go Work (Not auto-checked yet)
- Measure and confirm production KPIs in live environment:
  - manual effort reduction,
  - upload-to-package latency,
  - attainment latency,
  - autonomous decision rate,
  - exception queue rate.

### Executive Sign-off
- **Implementation Status:** Approved complete for Phase 1–8 (engineering delivery scope).
- **Operational Status:** Pending KPI verification in production against Go/No-Go thresholds.
- **Release Recommendation:** Proceed with controlled rollout (`shadow -> limited -> full`) with kill-switch enabled.
- **Final Owner Decision:** `APPROVE_FOR_CONTROLLED_RELEASE` (after live KPI baseline is captured).

---

## Delivery-Lead Implementation Plan (ASAP, Production-Ready)

**Objective:** move from partial implementation to stable, measurable production operation with one critical path and no scope drift.

### Priority Order (Single Critical Path)
1. Stabilize auth/workspace/role routing (`personal -> org -> admin/master`).
2. Make org request + approval deterministic and user-safe.
3. Guarantee ELS access only when org role is valid (`org_admin`/`ld_manager`/`master`).
4. Enforce canonical ADDIE run contract for all stages.
5. Execute autonomous ADDIE with policy gates (`pass/exception_required/fail`).
6. Make enrollment + delivery explicit from IMPLEMENT outputs.
7. Make assessment + scoring + objective attainment deterministic.
8. Close feedback loop (`evaluate -> analyze`) automatically.
9. Harden reliability (idempotency, retry/backoff, DLQ, resume/replay safety).
10. Harden governance (lineage, model/policy versioning, audit trace).
11. Add observability + SLO + rollout guardrails.
12. Launch with canary + rollback + hypercare.

### Phase Plan (0–8)

#### Phase 0 — Command Center + Scope Lock (Day 1)
- [ ] Freeze non-critical scope and backlog.
- [ ] Approve one critical-path board (owners, dates, dependencies).
- [ ] Define production DoD and release gate criteria.
- [ ] Define incident/rollback command chain.

**Exit Criteria**
- [ ] One signed execution board.
- [ ] One signed Definition of Done.

#### Phase 1 — Platform Stabilization (Day 2–4)
- [ ] Fix auth/session/refresh edge cases.
- [ ] Verify workspace resolver behavior for personal/org/master contexts.
- [ ] Verify role mapping and admin route guard consistency.
- [ ] Remove silent failure paths in org and ELS entry flow.

**Exit Criteria**
- [ ] User reaches correct workspace and route in all role/context cases.

#### Phase 2 — Core Journey E2E Lock (Day 5–7)
- [ ] Validate path: login -> org request -> master approve -> org workspace -> ELS.
- [ ] Ensure all API errors are explicit and actionable.
- [ ] Add integration tests for full journey.
- [ ] Add regression tests for approval conflicts and retries.

**Exit Criteria**
- [ ] Core journey green in CI and staging.

#### Phase 3 — Autonomous ADDIE Orchestrator v1 (Day 8–12)
- [ ] Enforce run state machine (`queued` to `evaluate`).
- [ ] Persist stage artifacts and canonical contracts.
- [ ] Expose run timeline/status in ELS.
- [ ] Ensure deterministic transition and recovery rules.

**Exit Criteria**
- [ ] One full autonomous run completes with all stage outputs persisted.

#### Phase 4 — Human-by-Exception Governance (Day 13–15)
- [ ] Enforce quality gates (confidence/risk/quality checks).
- [ ] Route only failed/low-confidence/high-risk runs to exception queue.
- [ ] Add reviewer actions (`approve/reject/override/resume`).
- [ ] Add SLA timestamps/escalation fields.

**Exit Criteria**
- [ ] Autonomous-by-default confirmed; human only in exception queue.

#### Phase 5 — Delivery + Enrollment + Assessment Runtime (Day 16–19)
- [ ] Publish packages to runtime.
- [ ] Execute enrollment rules and assignment activation.
- [ ] Generate/serve multi-format assessments.
- [ ] Score instantly and produce objective-attainment outcome package.

**Exit Criteria**
- [ ] Learner can complete full run and receive scored outcomes end-to-end.

#### Phase 6 — Reliability + Recoverability Hardening (Day 20–22)
- [ ] Enforce idempotency key on run trigger.
- [ ] Add retry/backoff/DLQ with explicit error codes.
- [ ] Implement resume/retry-stage/cancel controls safely.
- [ ] Validate replay safety and duplicate suppression.

**Exit Criteria**
- [ ] Recoverability tested for stage failures without data corruption.

#### Phase 7 — Observability + SLO + Cost Control (Day 23–24)
- [ ] Add stage latency/failure/retry metrics.
- [ ] Add quality/fairness/coverage metrics.
- [ ] Add runtime outcome metrics and intervention rates.
- [ ] Add token/compute cost-per-run telemetry and alerts.

**Exit Criteria**
- [ ] Dashboard + alerting supports on-call diagnosis in minutes.

#### Phase 8 — Controlled Launch + Hypercare (Day 25–26)
- [ ] Canary rollout (`shadow -> limited -> full`).
- [ ] Enable feature flags and kill switch.
- [ ] Publish runbook for incident, rollback, and exception operations.
- [ ] Run 72-hour hypercare burn-down.

**Exit Criteria**
- [ ] Production rollout stable with rollback validated.

### Production-Ready Gate (Must Pass)
- [ ] Core journey success rate >= 99% in staging.
- [ ] No open P0/P1 defects on critical path.
- [ ] Addie run reliability/latency within agreed SLO.
- [ ] Full lineage available for every autonomous run.
- [ ] Rollback exercised successfully before full rollout.

### Weekly Tracking Checklist
- [ ] Week 1 complete (Phases 0–2)
- [ ] Week 2 complete (Phases 3–5)
- [ ] Week 3 complete (Phases 6–8)
- [ ] Production gate passed
- [ ] Controlled release approved



# Tutta Autonomous Learning IA Reference

## Purpose
This document is the canonical architecture reference for the Tutta adaptive learning vision.

It captures the full logic of the system:
- Autonomous by default
- Human by exception
- User at the receiving end of AI-generated learning solutions
- One intelligence core powering AI Bot, Genie, ELS Studio, and Tutta Learning Engine

### Single Source of Truth
- This is the primary working document for architecture + implementation status.
- Progress tracking should be updated here first before any derivative summary docs.

---

## Core Operating Principle

### Autonomous by Default, Human by Exception
- Human-in-the-loop should primarily provide **knowledge input** (documents, media, policy sources).
- AI should automatically perform the learning design lifecycle, delivery decisions, assessment generation, scoring, and optimization.
- Human intervention should occur only for exceptions (low-confidence, high-risk, compliance-sensitive decisions).

### Runtime Decision Controls (Authoritative Source)
The enforceable risk tiers, approval matrix, guardrail rules, and decision log contract are maintained in:
- `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md`

This IA reference describes system intent; the appendix defines execution policy.

---

## System Logic Statement

The Tutta platform is a two-part intelligent learning system.

At the front end of the system, a human-in-the-loop (Manager, Admin, L&D lead, SME) provides organizational knowledge inputs such as documents, policies, procedures, media, and contextual requirements.

These inputs are processed by the AI/ML Learning Design System, which applies structured instructional design principles (ADDIE and adult learning design) to analyze needs, design pathways, develop learning assets, implement delivery logic, and prepare valid assessments.

At the receiving end of the system, the User (Learner) consumes generated learning solutions through adaptive delivery formats (reading, writing, listening, speaking) and multi-format assessments (MCQ, fill-in-the-blank, drag-and-drop, short/long response, scenario tasks, speaking/audio tasks).

After delivery, the system performs instant assessment and scoring, then produces measurable outputs:

1. Performance Results
   - score, pass/fail, proficiency progression, risk indicators

2. Learning Outcomes
   - demonstrated competency and Bloom-level evidence

3. Learning Objective Attainment
   - objective-by-objective achievement and gap closure

These outputs are continuously evaluated to trigger remediation/advancement and improve future design cycles.

---

## AI Tutor Alignment

### Why this architecture is similar to an AI Tutor
- Both are AI-first, stateful, adaptive systems.
- Both run a closed loop: analyze -> teach -> assess -> adapt.
- Both reduce manual setup and rely on intelligence over static workflows.

### Key difference
- Typical AI Tutor is primarily learner-level.
- Tutta extends this to enterprise-level orchestration (learner + team + org + governance).

---

## ADDIE Integration (Autonomous Execution Model)

### A) ANALYSIS (Auto)
- Ingest and normalize uploaded knowledge
- Infer audience, goals, and constraints from system data
- Build learner baseline and role/competency gap map
- Prioritize needs by risk/compliance urgency

### B) DESIGN (Auto)
- Generate outcomes and objective architecture
- Build Bloom progression and modality strategy
- Create adaptive path graph (prereq/unlock/remediation)
- Generate assessment blueprint by objective and modality

### C) DEVELOP (Auto)
- Generate multi-format learning content
- Generate activity and practice sets
- Generate question banks (MCQ, fill-in, drag-drop, short/long, speaking)
- Generate scoring keys, rubrics, and evaluation logic

### D) IMPLEMENT (Auto)
- Publish packages to runtime
- Assign and launch adaptive pathways
- Deliver lessons and assessments in real time
- Trigger interventions (nudge/remediation/unlock)

### E) EVALUATE (Auto)
- Score instantly and compute objective attainment
- Measure mastery progression (competency/Bloom/modality)
- Evaluate policy/model effectiveness
- Feed improvements back into ANALYSIS

---

## Final Comprehensive IA (v3)

```text
TUTTA_COGNITIVE_OS
├── 0. SYSTEM PRINCIPLE
│   ├── Autonomous by default
│   ├── Human by exception
│   └── Outcome-driven continuous learning loop
│
├── 1. INPUT LAYER (Minimal Human-in-the-Loop)
│   ├── Knowledge Source Intake
│   │   ├── Documents (PDF/DOC/PPT)
│   │   ├── Media (audio/video)
│   │   ├── URLs/web sources
│   │   └── Policies/SOP/compliance references
│   ├── System Data Inputs (automatic)
│   │   ├── Learner history
│   │   ├── Performance records
│   │   ├── Role/team/org context
│   │   └── Competency framework data
│   └── Human Exception Controls (optional)
│       ├── Approve high-risk actions
│       ├── Override low-confidence decisions
│       └── Audit/review flagged outputs
│
├── 2. AI LEARNING DESIGN CORE (ADDIE Autonomous Engine)
│   ├── A. ANALYSIS (Auto)
│   │   ├── Ingest/extract/normalize knowledge
│   │   ├── Infer audience + objectives
│   │   ├── Baseline learner/role gap analysis
│   │   └── Prioritize learning needs + risk/compliance urgency
│   ├── B. DESIGN (Auto)
│   │   ├── Generate learning objectives
│   │   ├── Build Bloom progression map
│   │   ├── Select modality mix (reading/writing/listening/speaking)
│   │   ├── Build adaptive path graph (prereq/unlock/remediation)
│   │   └── Create assessment blueprint
│   ├── C. DEVELOP (Auto)
│   │   ├── Generate multi-format learning content
│   │   ├── Generate activity/practice sets
│   │   ├── Generate assessment bank
│   │   │   ├── MCQ
│   │   │   ├── Fill in the blank
│   │   │   ├── Drag and drop
│   │   │   ├── Short/long response
│   │   │   └── Speaking/audio tasks
│   │   └── Generate scoring rubrics + answer keys
│   ├── D. IMPLEMENT (Auto)
│   │   ├── Publish learning packages to runtime
│   │   ├── Assign personalized pathways
│   │   ├── Deliver adaptive sessions
│   │   ├── Trigger interventions (nudge/remediation/unlock)
│   │   └── Run assessments in real time
│   └── E. EVALUATE (Auto)
│       ├── Instant scoring + feedback synthesis
│       ├── Learning objective attainment validation
│       ├── Competency/Bloom/modality progression tracking
│       ├── Policy/model effectiveness evaluation
│       └── Feed improvements back to ANALYSIS
│
├── 3. UNIFIED INTELLIGENCE RUNTIME (Single Brain)
│   ├── Learner State Engine
│   │   ├── Cognitive profile
│   │   ├── Mastery state
│   │   ├── Gap matrix
│   │   └── Risk/readiness state
│   ├── Decision Engine
│   │   ├── Next best action
│   │   ├── Path progression decision
│   │   ├── Remediation decision
│   │   └── Assessment selection decision
│   ├── Assessment Engine
│   │   ├── Objective-linked scoring
│   │   ├── Rubric grading (writing/speaking)
│   │   ├── Attempt logic
│   │   └── Immediate feedback generation
│   ├── Recommendation/Intervention Engine
│   │   ├── Adaptive content recommendations
│   │   ├── Remediation assignment
│   │   ├── Reinforcement practice
│   │   └── Advancement unlock
│   └── Knowledge Intelligence
│       ├── Knowledge graph + retrieval
│       ├── Evidence grounding
│       └── Context-aware response generation
│
├── 4. PRODUCT SURFACES (4 Interfaces, 1 Core)
│   ├── AI Bot
│   │   ├── Learner tutor/co-pilot
│   │   ├── Explain-why feedback
│   │   └── Guided practice
│   ├── Genie
│   │   ├── Org/team intelligence
│   │   ├── Readiness/risk insights
│   │   └── Exception intervention console
│   ├── ELS Studio
│   │   ├── AI content/design orchestration view
│   │   ├── Design simulation/preview
│   │   └── Publish controls
│   └── Tutta Learning Engine
│       ├── Delivery runtime
│       ├── Assessment runtime
│       └── Outcome runtime
│
├── 5. USER SYSTEM (Receiving End)
│   ├── Personalized Learning Experience
│   │   ├── Adaptive path
│   │   ├── Multi-format learning
│   │   └── AI assistance in-session
│   ├── Assessment Experience
│   │   ├── Diagnostic/formative/summative/remediation checks
│   │   ├── Multi-format questions
│   │   └── Instant feedback
│   └── Outcome Experience
│       ├── Performance results (score/proficiency/risk)
│       ├── Learning outcomes (competency mastery evidence)
│       └── Objective outcomes (achieved/not achieved + gap status)
│
├── 6. TRUST, GOVERNANCE, AND QUALITY
│   ├── Explainability logs (why decision happened)
│   ├── Model/policy registry + versioning
│   ├── Guardrails + staged rollout
│   ├── Bias/quality/compliance scans
│   └── Full audit trail
│
└── 7. CONTINUOUS CLOSED LOOP
    ├── Sense: ingest + interactions + assessments
    ├── Decide: AI policy chooses next action
    ├── Act: deliver/assess/remediate/advance
    ├── Measure: capture outcomes instantly
    └── Improve: auto-optimize design + policies
```

---

## Practical Product Rule

If a workflow requires heavy manual field entry by managers/admins, it violates this architecture.

The expected UX is:
1. Upload knowledge (and optional context)
2. AI infers and generates design + delivery + assessment
3. User receives adaptive learning and instant outcomes
4. Human reviews only flagged exceptions

---

## Implementation Blueprint

### 1) Canonical API Domains

```text
/api/v1/organizations/{orgId}/knowledge/
├── POST upload
├── POST ingest
├── GET documents
└── GET graph

/api/v1/organizations/{orgId}/design/
├── POST analyze
├── POST generate-blueprint
├── POST generate-content
└── POST publish-package

/api/v1/organizations/{orgId}/learning-runtime/
├── POST assign-paths
├── POST start-session
├── POST submit-assessment
└── POST execute-intervention

/api/v1/organizations/{orgId}/evaluation/
├── GET learner-outcomes
├── GET objective-attainment
├── GET policy-evaluation-report
└── POST optimize-policy

/api/v1/organizations/{orgId}/exceptions/
├── GET low-confidence-queue
├── GET high-risk-queue
└── POST resolve-exception
```

### 1.1) Identifier Contract (`orgId` vs `orgSlug`)

Use this contract to avoid API/client drift:
1. API write/read domain endpoints use `orgId` path keys:
   - `/api/v1/organizations/{orgId}/...`
2. Frontend routing and user-facing workspace URLs use `orgSlug`:
   - `/org/{orgSlug}/...`
3. Resolver bridge maps route slug to canonical org identity:
   - `GET /api/v1/workspaces/resolve/?orgSlug={orgSlug}`
4. Backend may accept slug on org-scoped routes for compatibility, but must normalize internally to `orgId`.
5. Event payloads always emit `org_id` (UUID/string identifier), not slug.

### 2) Event Contract (System Spine)

```text
EVENT_ENVELOPE
├── event_id
├── event_type
├── occurred_at
├── org_id
├── actor {type,id}
├── subject {type,id}
├── correlation_id
├── source_module
└── payload

CORE_EVENTS
├── knowledge.document_ingested
├── design.blueprint_generated
├── design.content_published
├── runtime.path_assigned
├── runtime.assessment_submitted
├── intelligence.next_best_action_generated
├── intervention.remediation_assigned
├── outcome.assessment_scored
├── outcome.objective_attainment_updated
└── governance.exception_flagged
```

### 3) Data Contracts (Minimum)

```text
LEARNER_STATE
├── user_id
├── competency_scores
├── bloom_mastery
├── modality_strengths
├── gap_matrix
└── risk_state

LEARNING_PACKAGE
├── package_id
├── objectives[]
├── path_graph
├── content_assets[]
├── assessment_blueprint
└── version_info

OUTCOME_RECORD
├── user_id
├── assessment_result
├── objective_attainment
├── recommended_action
└── evidence_refs
```

### 4) Rollout Phases

```text
PHASE_1 (Foundation)
├── unify learner state service
├── standardize event envelope
└── route all modules to shared outcomes

PHASE_2 (Autonomous ADDIE)
├── automate analysis/design/develop
├── publish package pipeline
└── integrate runtime execution

PHASE_3 (Closed-Loop Intelligence)
├── instant objective attainment tracking
├── policy optimization with guardrails
└── exception-only human governance
```

### 5) Success Metrics

- Manual fields completed by manager/admin reduced by at least 80%.
- Time from upload to first publishable learning package under 30 minutes.
- Objective attainment available within seconds of assessment submission.
- At least 90% of runtime decisions executed without manual intervention.
- Exception queue remains limited to low-confidence/high-risk decisions only.

---

## Phase 0 Completion Record (Contract Baseline v1.0)

**Status:** Completed  
**Locked On:** 2026-02-25

### Locked Deliverables
1. **Canonical package contracts locked**
   - `LearningPackage`
   - `AssessmentPackage`
   - `OutcomePackage`
   - Source section: **Data Contracts (Minimum)**

2. **Identifier contract locked**
   - API endpoints use `orgId`
   - Frontend/workspace routes use `orgSlug`
   - Source section: **Identifier Contract (`orgId` vs `orgSlug`)**

3. **Event envelope contract locked**
   - canonical event fields and core event set fixed
   - Source section: **Event Contract (System Spine)**

4. **Decision policy ownership locked**
   - thresholds/risk tiers owned by:
     - `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md`

### Phase 0 Gate Decision
- Contract ambiguities: **none open**
- Baseline state: **approved for Phase 1 execution**

---

## Detailed Implementation Plan (All Phases + Steps)

This section is the execution source for completing Phases 0–8 in sequence.
Each phase must pass its exit gate before moving to the next phase.

### Phase 0 — Architecture Lock + Contract Baseline
**Goal:** freeze non-negotiable contracts so implementation does not drift.
**Depends on:** none.

**Execution Steps**
1. Lock canonical package schemas:
   - `LearningPackage`, `AssessmentPackage`, `OutcomePackage`.
2. Lock identity contract:
   - backend/API uses `orgId`, frontend routes use `orgSlug`.
3. Lock event envelope fields:
   - `event_id`, `event_type`, `org_id`, `actor`, `subject`, `correlation_id`, `payload`.
4. Lock decision policy ownership:
   - runtime thresholds owned by `TUTTA_AUTONOMOUS_LEARNING_DECISION_POLICY_APPENDIX.md`.
5. Publish contract examples in doc + sample payloads.

**Deliverables**
- versioned schema docs
- event envelope examples
- API identifier contract note

**Validation**
- Backend and frontend can parse same payload fixtures without conversion ambiguity.

**Exit Gate**
- No open contract questions remain.

---

### Phase 1 — Input + Ingestion Reliability
**Goal:** make upload the only required human action and ensure robust ingest.
**Depends on:** Phase 0 contracts.

**Execution Steps**
1. Standardize upload entrypoint:
   - files, media, URLs, policy sources.
2. Add capability checks:
   - OCR/audio/video deps and configuration readiness.
3. Add resilient execution:
   - retry/backoff, terminal failure classification, dead-letter bucket.
4. Add explicit error taxonomy:
   - machine-readable `error_code`, retryable flag, details.
5. Persist ingest provenance:
   - input source refs, extraction metadata, timestamps, attempts.

**Implementation Targets**
- `backend/apps/knowledge/services.py`
- `backend/apps/knowledge/tasks.py`
- `backend/apps/knowledge/views.py`

**Validation**
- per-source ingest tests (pdf/url/audio/video/text)
- retry and dead-letter behavior tests

**Exit Gate**
- Upload → ingest is stable and failures are actionable.

---

### Phase 2 — ANALYZE Engine (Autonomous Gap Intelligence)
**Goal:** infer audience/objectives/gaps from system data + uploaded knowledge.
**Depends on:** Phase 1 reliable ingest.

**Execution Steps**
1. Build context aggregator:
   - memberships, competency mappings, assessment outcomes, history.
2. Compute baseline state:
   - mastery, Bloom/modality profile, risk/readiness.
3. Compute target state:
   - role competency requirements, compliance policy constraints.
4. Compute weighted gaps:
   - learner-level + cohort-level priority ranking.
5. Generate objective candidates:
   - map ranked gaps into objective architecture inputs.

**Implementation Targets**
- `backend/apps/learning_intelligence/tasks.py`
- `backend/apps/learning_intelligence/services.py`
- `backend/apps/competencies/*`

**Validation**
- deterministic gap scenarios
- objective candidate quality checks

**Exit Gate**
- `ANALYZE` outputs objective map + ranked gaps without manual data-entry forms.

---

### Phase 3 — DESIGN + DEVELOP Engines
**Goal:** auto-generate versioned learning and assessment packages.
**Depends on:** Phase 2 analyze outputs.

**Execution Steps**
1. Generate objective architecture:
   - sequencing, Bloom progression, modality strategy.
2. Generate adaptive path graph:
   - prerequisites, unlock/remediation branches.
3. Generate learning content assets:
   - lessons, activities, guided practice.
4. Generate assessment package:
   - item bank + rubrics + scoring policies.
5. Stamp package lineage:
   - package version, policy/model versions, provenance hash.

**Implementation Targets**
- `backend/apps/courses/*`
- `backend/apps/assessments/*`
- `backend/apps/learning_intelligence/*`

**Validation**
- package schema conformance tests
- assessment rubric coverage tests

**Exit Gate**
- `LearningPackage` + `AssessmentPackage` generated and versioned automatically.

---

### Phase 4 — IMPLEMENT Engine (Explicit Enrollment Orchestration)
**Goal:** deploy generated packages and enroll users automatically.
**Depends on:** Phase 3 package stability.

**Execution Steps**
1. Publish package to runtime catalog.
2. Resolve audience/cohort:
   - user/team/role/org targeting from analyze/design outputs.
3. Run **Enrollment Orchestrator**:
   - create enrollments,
   - assign due dates/priority,
   - attach assessment package,
   - emit notifications.
4. Activate runtime delivery + assessments.
5. Activate intervention triggers:
   - nudge, remediation, unlock transitions.

**Implementation Targets**
- `backend/apps/enrollments/*`
- `backend/apps/courses/views.py`
- `backend/apps/learning_intelligence/tasks.py`
- `src/services/learningPathService.ts`

**Validation**
- publish-to-enrollment integration tests
- no-manual-enrollment happy path test

**Exit Gate**
- users are enrolled from package rules with zero manual assignment in normal flow.

---

### Phase 5 — EVALUATE Engine + Outcome Intelligence
**Goal:** produce immediate + delayed outcomes and close the ADDIE loop.
**Depends on:** Phase 4 runtime activation.

**Execution Steps**
1. Implement instant scoring and objective attainment updates.
2. Generate `OutcomePackage` consistently:
   - performance, outcomes, objective attainment, next-best-action.
3. Add delayed outcome windows:
   - retention/transfer signals at 7d/30d.
4. Feed evaluation outputs back to `ANALYZE`.

**Implementation Targets**
- `backend/apps/assessments/*`
- `backend/apps/learning_intelligence/*`
- `backend/apps/analytics/*`

**Validation**
- objective attainment latency tests
- outcome package contract tests

**Exit Gate**
- evaluation artifacts automatically influence the next analyze run.

---

### Phase 6 — Control, Reliability, and Recoverability
**Goal:** run orchestration safely at production scale.
**Depends on:** Phases 1–5 operational.

**Execution Steps**
1. Implement run state machine:
   - `queued → ingesting → analyzing → designing → developing → implementing → evaluating → completed|failed|exception_required|canceled`.
2. Enforce idempotent run starts:
   - duplicate `Idempotency-Key` returns existing `run_id`.
3. Add control operations:
   - resume, cancel, retry-stage.
4. Add complete traceability:
   - stage timestamps, correlation IDs, attempt counts, error class.

**Implementation Targets**
- `backend/apps/learning_intelligence/views.py`
- `backend/apps/learning_intelligence/tasks.py`
- orchestrator-specific service layer

**Validation**
- replay safety tests
- resume/cancel/retry-stage tests

**Exit Gate**
- every run is recoverable, traceable, and replay-safe.

---

### Phase 7 — Quality Gates + Exception-Only Human Governance
**Goal:** keep autonomy high while routing only risky decisions to humans.
**Depends on:** Phase 6 controls and tracing.

**Execution Steps**
1. Add stage quality gates:
   - confidence, risk, quality checks, gate result.
2. Route flagged runs to exception queue only:
   - low confidence, high-risk compliance, guardrail violation.
3. Implement reviewer actions:
   - approve/reject/override, reason mandatory.
4. Implement exception SLA:
   - priority, due date, escalation level.

**Implementation Targets**
- `backend/apps/governance/*`
- `backend/apps/learning_intelligence/*`
- `src/services/governanceService.ts`

**Validation**
- exception routing tests
- reviewer action and audit trail tests

**Exit Gate**
- normal runs remain autonomous; human work exists only in exception queue.

---

### Phase 8 — Observability, Cost, and Rollout Hardening
**Goal:** production hardening with measurable reliability, quality, and economics.
**Depends on:** all previous phases.

**Execution Steps**
1. Add run/stage telemetry:
   - latency, retries, failures by class.
2. Add quality telemetry:
   - coverage, validity, fairness/bias.
3. Add learning impact telemetry:
   - completion, mastery lift, intervention success.
4. Add cost telemetry:
   - token/compute per run and per package.
5. Add rollout hardening:
   - staged rollout, rollback, kill-switch controls.

**Implementation Targets**
- `backend/apps/analytics/*`
- `backend/apps/governance/*`
- admin dashboards and reporting views

**Validation**
- SLO dashboard sanity checks
- rollback drill test

**Exit Gate**
- operators can manage reliability, learning impact, and cost from one control plane.

---

## Implementation Dependency Order (Strict)
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8

**Sequencing Rule**
- Do not start Phase 4+ until Phase 3 package contracts are stable.
- Do not start Phase 7 until Phase 6 run controls are validated.

---

## Progress Checklist (Canonical Tracker)

### Overall Status
- [x] Phase 0 complete
- [x] Phase 1 complete
- [x] Phase 2 complete
- [x] Phase 3 complete
- [x] Phase 4 complete
- [x] Phase 5 complete
- [x] Phase 6 complete
- [x] Phase 7 complete
- [x] Phase 8 complete

### Phase 0 — Architecture Lock + Contract Baseline
- [x] Freeze package contracts (`LearningPackage`, `AssessmentPackage`, `OutcomePackage`)
- [x] Freeze identifier contract (`orgId` API / `orgSlug` UI)
- [x] Freeze event envelope contract
- [x] Freeze decision policy ownership

### Phase 1 — Input + Ingestion Reliability
- [x] Standardize upload channels
- [x] Add capability pre-checks
- [x] Implement retry/backoff + explicit error codes + dead-letter
- [x] Persist ingestion provenance metadata

### Phase 2 — ANALYZE Engine
- [x] Build LMS/system context aggregator
- [x] Compute baseline learner/cohort state
- [x] Compute target state from role/compliance requirements
- [x] Compute weighted gaps and priorities
- [x] Auto-generate objective candidates

### Phase 3 — DESIGN + DEVELOP
- [x] Generate objective architecture automatically
- [x] Generate adaptive path graph automatically
- [x] Generate learning assets automatically
- [x] Generate assessment bank + rubrics automatically
- [x] Stamp artifact lineage/version metadata

### Phase 4 — IMPLEMENT (Enrollment Explicit)
- [x] Publish package to runtime catalog
- [x] Resolve target cohorts automatically
- [x] Create enrollment records automatically
- [x] Assign due dates/priority + attach assessments
- [x] Trigger notifications + activate runtime

### Phase 5 — EVALUATE + Outcome Intelligence
- [x] Deliver instant scoring pipeline
- [x] Generate `OutcomePackage`
- [x] Add 7d/30d retention/transfer signals
- [x] Feed outcomes back into ANALYZE

### Phase 6 — Control, Reliability, Recoverability
- [x] Implement full run state machine
- [x] Enforce idempotency key behavior
- [x] Implement resume/cancel/retry-stage controls
- [x] Persist traceability fields (timestamps/correlation/attempt)

### Phase 7 — Quality Gates + Exception Governance
- [x] Implement confidence/risk/quality stage gates
- [x] Route only flagged runs to exception queue
- [x] Implement reviewer actions (approve/reject/override)
- [x] Enforce exception SLA fields

### Phase 8 — Observability + Cost + Rollout Hardening
- [x] Add stage/run telemetry
- [x] Add quality/fairness telemetry
- [x] Add runtime impact telemetry
- [x] Add cost telemetry
- [x] Add staged rollout + rollback controls

### Readiness Checklist (Go/No-Go)
- [ ] ≥80% reduction in manual manager/admin data entry
- [ ] Upload-to-first-package under 30 minutes
- [ ] Objective attainment available within seconds post-submit
- [ ] ≥90% autonomous runtime decisions
- [ ] Exception queue limited to low-confidence/high-risk only

---

## Phase 1–8 Completion Report (One-Page)

**Report Date:** February 26, 2026  
**Status:** Phase 1 through Phase 8 implemented and validated in backend/API scope.

### Scope Completed
- Autonomous ADDIE pipeline execution path implemented end-to-end (`ingest -> analyze -> design -> develop -> implement -> evaluate`).
- Canonical phase outputs persisted in project state (`LearningPackage`, `AssessmentPackage`, `OutcomePackage` lineage and references).
- Enrollment orchestration made explicit in IMPLEMENT (cohort resolution, enrollment creation, due dates, notifications).
- Quality gates and exception routing enforced (confidence/risk/quality checks with exception queue workflow).
- Control/reliability plane added (idempotent runs, resume/cancel/retry-stage controls, run states, trace fields).
- Observability/rollout controls added (phase metrics, quality metadata, runtime metrics, cost fields, rollout guardrails).

### Key Delivery Artifacts
- `backend/apps/genie/tasks.py`  
  - Ingest reliability with capability checks, retry/backoff metadata, dead-letter capture, provenance.
  - Analyze context aggregation with baseline/target state and weighted gap objective generation.
  - Design/Develop package generation with lineage/version metadata.
  - Implement runtime catalog + auto enrollment orchestration.
  - Evaluate outcome generation and feedback loop into next analyze cycle.
  - Autonomous orchestrator + resume/cancel/retry-stage task controls.
- `backend/apps/genie/views.py`  
  - Added API endpoints: `run-autonomous`, `resume`, `cancel`, `retry-stage`, `rollout`, `status`, `metrics`, `exceptions`, `resolve`.
- `backend/apps/genie/migrations/0003_elsproject_autonomous_mode_and_more.py`  
  - Added run-state, phase-gate, exception queue, and run-metric persistence fields/models.
- `backend/apps/genie/tests/test_views.py`  
  - Added deterministic autonomous pipeline tests, idempotency checks, exception flow, and control-plane endpoint tests.

### Validation Evidence
- Migration status:
  - `python manage.py makemigrations --check` -> no pending model diffs.
  - `python manage.py migrate --noinput` -> applied `genie.0003...` successfully.
- Test execution:
  - `backend/apps/genie/tests/test_views.py`
  - `backend/apps/learning_intelligence/tests/test_week1_core_intelligence.py`
  - `backend/apps/learning_intelligence/tests/test_week2_productization.py`
  - Result: **41 passed**.

### Phase-by-Phase Exit Confirmation
- **Phase 1:** Ingestion reliability + provenance implemented.
- **Phase 2:** Analyze engine context + weighted gap objective synthesis implemented.
- **Phase 3:** Design/develop autonomous package generation + lineage implemented.
- **Phase 4:** Enrollment-explicit implementation and activation implemented.
- **Phase 5:** Outcome intelligence + analyze feedback loop implemented.
- **Phase 6:** Run state machine + idempotency + control actions implemented.
- **Phase 7:** Quality gates + exception governance/reviewer actions implemented.
- **Phase 8:** Telemetry and rollout hardening controls implemented.

### Remaining Go/No-Go Work (Not auto-checked yet)
- Measure and confirm production KPIs in live environment:
  - manual effort reduction,
  - upload-to-package latency,
  - attainment latency,
  - autonomous decision rate,
  - exception queue rate.

### Executive Sign-off
- **Implementation Status:** Approved complete for Phase 1–8 (engineering delivery scope).
- **Operational Status:** Pending KPI verification in production against Go/No-Go thresholds.
- **Release Recommendation:** Proceed with controlled rollout (`shadow -> limited -> full`) with kill-switch enabled.
- **Final Owner Decision:** `APPROVE_FOR_CONTROLLED_RELEASE` (after live KPI baseline is captured).
