# Tutta Autonomous Learning — Decision Policy Appendix

## Purpose
This appendix is the single source of truth for runtime autonomy controls:
- risk tiers,
- approval requirements,
- execution modes,
- minimum audit contract.

If this appendix changes, linked architecture documents must be updated in the same change set.

---

## Policy Version
- `decision_policy_version`: `v1.0`
- `effective_date`: `2026-02-25`

---

## Risk Tier Model

| Tier | Scope and Risk | Minimum Confidence | Default Execution Mode |
|---|---|---|---|
| L0 | Low-impact learner personalization (nudge, content recommendation) | `>= 0.70` | `auto_execute` |
| L1 | Learner-level path/remediation decisions with moderate impact | `>= 0.80` | `auto_execute` + notify |
| L2 | Team/org impact decisions (bulk assignment, rubric overrides, policy tuning proposals) | `>= 0.85` | `propose_only` |
| L3 | Compliance, legal, billing, or irreversible data/policy actions | `>= 0.90` | `manual_required` |

---

## Approval Matrix

| Decision Type | Tier | Human Requirement |
|---|---|---|
| Adaptive recommendation and nudge | L0-L1 | No approval |
| Learner remediation assignment | L1 | No approval |
| Org-wide pathway assignment | L2 | Org admin/manager approval |
| Competency policy change | L2-L3 | Master approval |
| Compliance outcome declaration | L3 | Human required |
| Data export/delete decisions | L3 | Human required |

---

## Guardrail Rules
1. If confidence is below tier threshold, downgrade to `propose_only`.
2. If evidence grounding is missing, block execution and raise exception.
3. If policy conflict is detected, block execution and raise exception.
4. In audit mode, all L2 decisions require explicit human approval.
5. L3 decisions must never auto-execute.

---

## Execution Mode Definitions
- `auto_execute`: execute immediately under policy constraints.
- `propose_only`: generate recommended action and wait for approval.
- `manual_required`: do not execute until authorized human resolves.

---

## Minimum Decision Log Contract
Every runtime decision must emit:
1. `decision_id`
2. `decision_policy_version`
3. `risk_tier`
4. `execution_mode`
5. `guardrail_status`
6. `confidence`
7. `rationale`
8. `evidence_refs`
9. `actor`
10. `org_id`
11. `timestamp`
12. `final_status`

---

## KPI Alignment Notes
- Autonomous Decision Rate denominator includes only L0-L2 decisions.
- L3 decisions are excluded from autonomy denominator by policy.
- Exception precision is measured against exceptions raised by guardrail triggers.

