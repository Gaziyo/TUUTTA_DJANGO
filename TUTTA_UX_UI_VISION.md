# Tutta UX/UI Vision and IA Assessment
Date: 2026-02-25

This document captures the current-state assessment of the app IA, the gaps vs the target IA docs, and a proposed improved UX/UI vision and information architecture.

---

## 1) Current State Summary (As Implemented)

Primary modes and routes exist, but org scoping is state-based, not URL-based.

1. Contexts
   - personal, org, course, path, admin
2. Learner routes
   - /home, /courses, /paths, /chat, /progress, /analytics, /discussions, /join-org
3. Course routes
   - /course/:courseId/*
4. Admin routes
   - /admin/* with LMS, Genie, Intelligence sections
5. Auth routes
   - /login, /signup

Current behavior highlights:
1. Any authenticated user can create organizations.
2. Org membership exists but org context is not encoded in URLs.
3. No master portal or master mode.
4. Onboarding is a single join/create page, not a guided flow.
5. No org switcher UI.

---

## 2) Gaps vs Target IA Docs

These gaps are based on:
1. TUTTA_IMPROVED_IA_GUIDE.md
2. TUTTA_MASTER_USER_ARCHITECTURE.md

Key gaps:
1. Master user hierarchy not implemented.
2. Master-only org creation not implemented.
3. No /master/* portal.
4. No onboarding wizard (profile, org selection, diagnostic, first action).
5. No org-scoped route structure like /org/:slug/*.
6. No join-request approval flow or invite code workflow.
7. No org switcher in the global header.

Important correction:
1. Dual-write Firebase plus Django is no longer true in the current codebase. The frontend is Django API centric and Firebase/Firestore has been removed from client code.

---

## 3) UX/UI Vision

Turn Tutta into a multi-tenant learning OS that feels like “one app, multiple worlds.”  
The user always knows:
1. Where they are
2. Why they are there
3. What to do next

UX principles:
1. Context clarity is non-negotiable.
2. Each screen has one dominant action.
3. Onboarding drives to first value in under 2 minutes.
4. Admin intelligence is outcome-focused, not data-dense.
5. Navigation is predictable and consistent across roles.

---

## 4) Improved IA (UX-First Sitemap)

Tree format:
```
TUTTA PLATFORM IA (IMPROVED)
├── Unauthenticated
│   ├── /welcome
│   ├── /pricing
│   ├── /auth/login
│   └── /auth/signup
├── Personal Mode (No Org)
│   ├── /home
│   ├── /catalog
│   ├── /chat
│   └── /join-org
├── Org Mode (Scoped)
│   ├── /org/:slug/home
│   ├── /org/:slug/courses
│   ├── /org/:slug/paths
│   ├── /org/:slug/progress
│   ├── /org/:slug/analytics
│   └── /org/:slug/discussions
├── Course Mode
│   ├── /org/:slug/course/:id/home
│   ├── /org/:slug/course/:id/player
│   ├── /org/:slug/course/:id/outline
│   └── /org/:slug/course/:id/resources
├── Admin Mode (Org-Scoped)
│   ├── /org/:slug/admin/dashboard
│   ├── /org/:slug/admin/courses
│   ├── /org/:slug/admin/users
│   ├── /org/:slug/admin/teams
│   ├── /org/:slug/admin/departments
│   ├── /org/:slug/admin/genie/*
│   ├── /org/:slug/admin/intelligence/*
│   ├── /org/:slug/admin/settings
│   └── /org/:slug/admin/governance
└── Master Mode
    ├── /master/dashboard
    ├── /master/organizations
    ├── /master/users
    ├── /master/billing
    ├── /master/settings
    └── /master/system
```

Unauthenticated:
1. /welcome
2. /pricing
3. /auth/login
4. /auth/signup

Personal mode (no org):
1. /home
2. /catalog
3. /chat
4. /join-org

Org mode (scoped):
1. /org/:slug/home
2. /org/:slug/courses
3. /org/:slug/paths
4. /org/:slug/progress
5. /org/:slug/analytics
6. /org/:slug/discussions

Course mode:
1. /org/:slug/course/:id/home
2. /org/:slug/course/:id/player
3. /org/:slug/course/:id/outline
4. /org/:slug/course/:id/resources

Admin mode (org-scoped):
1. /org/:slug/admin/dashboard
2. /org/:slug/admin/courses
3. /org/:slug/admin/users
4. /org/:slug/admin/teams
5. /org/:slug/admin/departments
6. /org/:slug/admin/genie/*
7. /org/:slug/admin/intelligence/*
8. /org/:slug/admin/settings
9. /org/:slug/admin/governance

Master mode:
1. /master/dashboard
2. /master/organizations
3. /master/users
4. /master/billing
5. /master/settings
6. /master/system

---

## 5) Navigation Model

Top bar:
1. Org Switcher
2. Global Search
3. Notifications
4. Profile

Left sidebar:
1. Context specific
2. Shows “Mode Badge” indicating Personal, Org, Course, Admin, Master
3. One click “Back to Org” from Course mode

---

## 6) Onboarding Flow

Goal: Remove the “empty experience” and activate users quickly.

Suggested onboarding:
1. Profile setup
2. Org selection or join request
3. Diagnostic assessment
4. First course recommendation
5. Progress preview

---

## 7) UX Enhancements (High ROI)

Learner home:
1. Primary card: Continue Learning
2. Secondary strip: AI Recommendation
3. A single next-step CTA

My Courses:
1. Bloom and gap tags on cards
2. Sorting by urgency

Course player:
1. Sticky progress
2. Bloom and modality intent tags
3. Inline AI prompt for the current step

Admin dashboard:
1. Org Health summary
2. Learning Outcomes summary
3. Content Pipeline status

Intelligence pages:
1. “What changed this week?” summary
2. One primary action per panel

Master portal:
1. Org sprawl control
2. Org creation and billing in one place
3. Approval queue and audit trails

---

## 8) Visual and UI Direction

Typography:
1. Satoshi or Clash Display for headers
2. Manrope or General Sans for body

Color system:
1. Deep indigo primary
2. Cyan accent
3. Warm amber for alerts
4. Warm gray background

Layout:
1. Dense but airy grid
2. Section headers include title, metric, and action
3. Avoid long tables without summary cards

Motion:
1. Subtle page transitions
2. Card hover elevation
3. Smooth navigation between contexts

Consistency rules:
1. One CTA per screen
2. “Why it matters” line in analytics panels
3. Status always visible via chip and color

---

## 9) Why This Works

1. Org-scoped URLs eliminate ambiguity and improve permissions clarity.
2. Master mode fixes org sprawl and enforces governance.
3. Onboarding drives immediate engagement.
4. Intelligence pages become decision tools, not data dumps.
5. Visual identity makes the app feel like a modern learning OS.

---

## 10) Navigation-by-Role Matrix (Implementation Ready)

Use this matrix to drive sidebar composition, route guards, and default redirects.

### 10.1 Role Navigation Matrix

| Role | Default Landing | Workspace Switcher | Primary Sidebar Nav | Secondary Nav | Can Access |
|---|---|---|---|---|---|
| Learner (Personal only) | `/me/home` | Personal | Home, Catalog, Paths, Chat, Progress, Achievements | Notifications, Search, Profile, Help | `/me/*` |
| Learner (Org member) | `/org/:orgSlug/home` | Personal + Org(s) | Home, Courses, Paths, Progress, Analytics, Discussions | Notifications, Search, Tasks, Profile | `/org/:orgSlug/*` (learner areas) |
| Instructor (Org) | `/org/:orgSlug/home` | Personal + Org(s) | Learner nav + assigned course authoring links | Course management shortcuts | Learner areas + assigned course management |
| Org Admin | `/org/:orgSlug/admin/dashboard` | Personal + Org(s) | Admin Dashboard, Courses, Learning Paths, Users, Teams, Departments | Reports, Governance, Settings | `/org/:orgSlug/admin/*` + org operations |
| Master User (Platform owner) | `/master/dashboard` | Master + Org(s) + Personal | Organizations, Org Requests, Users, Roles, Billing, Compliance, System Health | Integrations, Settings | `/master/*` + permitted org views |

### 10.2 Route Access Matrix (Core)

| Route Group | Learner | Instructor | Org Admin | Master |
|---|---:|---:|---:|---:|
| `/me/*` | ✅ | ✅ | ✅ | ✅ |
| `/org/:orgSlug/home` and learner routes | ✅ | ✅ | ✅ | ✅ (view or impersonate mode) |
| `/org/:orgSlug/course/:courseSlug/*` | ✅ | ✅ | ✅ | ✅ |
| `/org/:orgSlug/members`, `/teams`, `/departments`, `/invites`, `/join-requests` | ❌ | ⚠️ partial | ✅ | ✅ |
| `/org/:orgSlug/admin/*` | ❌ | ⚠️ limited | ✅ | ✅ |
| `/master/*` | ❌ | ❌ | ❌ | ✅ |

Legend:
1. ✅ Full access
2. ⚠️ Limited or delegated access
3. ❌ No access

### 10.3 UI Visibility and Guard Rules

1. Build navigation from `role + context` only; do not render inaccessible links.
2. Always show the active context badge: Personal, Org, or Master.
3. If user has only one org, simplify the switcher to a quick toggle.
4. Show Master navigation only when `is_master=true`.
5. Unauthorized deep links should redirect to `/403` with a primary CTA: Switch Workspace.
6. Post-login redirect priority:
   1. Last active workspace and route if still authorized.
   2. Otherwise role default landing.
   3. Otherwise `/context-switch`.

### 10.4 Suggested Guard Contract (Frontend + Backend)

1. `canAccessPersonal(user)`
2. `canAccessOrg(user, orgSlug)`
3. `canAccessOrgAdmin(user, orgSlug)`
4. `canAccessMaster(user)`
5. `getDefaultRouteForRole(role, context)`

---

## 11) Implementation Checklist (Frontend + Django)

Use this as a delivery checklist for rolling out the IA safely in phases.

### 11.1 Phase 1: Routing and Context Foundations

Frontend:
1. [ ] Add top-level route groups: `/me/*`, `/org/:orgSlug/*`, `/master/*`, `/context-switch`.
2. [ ] Add app entry resolver at `/app` that redirects to last authorized workspace.
3. [ ] Add context store with `activeContext` and `activeOrgSlug`.
4. [ ] Add persistent workspace selection in local storage.

Django:
1. [ ] Ensure every org-scoped endpoint accepts and validates `orgSlug`.
2. [ ] Add resolver endpoint for “last authorized workspace.”
3. [ ] Normalize permission responses for denied access (403) and missing resources (404).

### 11.2 Phase 2: Role-Based Navigation and Guards

Frontend:
1. [ ] Build sidebar from `role + context` config map.
2. [ ] Hide inaccessible links instead of rendering disabled dead-ends.
3. [ ] Implement route guards for personal, org, org-admin, and master routes.
4. [ ] Add `/403` fallback with CTA: “Switch Workspace”.

Django:
1. [ ] Add reusable permission checks: personal, org-member, org-admin, master.
2. [ ] Enforce org membership and role checks in viewsets/endpoints.
3. [ ] Add audit logging for admin and master actions.

### 11.3 Phase 3: Workspace Switcher and Onboarding

Frontend:
1. [ ] Add global workspace switcher in top bar.
2. [ ] Implement onboarding flow: profile → organization → diagnostic → recommendation → complete.
3. [ ] Route users with incomplete onboarding to `/onboarding/*`.
4. [ ] Add empty states with one primary CTA per screen.

Django:
1. [ ] Track onboarding completion state per user.
2. [ ] Add join request and invite code APIs.
3. [ ] Add approval APIs for org admins and master users.

### 11.4 Phase 4: Master Mode and Governance

Frontend:
1. [ ] Add master workspace pages: organizations, org requests, users, billing, compliance, system health.
2. [ ] Add master-only nav visibility behind `is_master=true`.
3. [ ] Add org impersonation/view mode indicators.

Django:
1. [ ] Enforce master-only org creation and org approval workflow.
2. [ ] Add platform-level reporting endpoints.
3. [ ] Add compliance and governance audit endpoints.

### 11.5 QA and Rollout Gates

1. [ ] Route guard tests for all role-context combinations.
2. [ ] Permission contract tests for `/me/*`, `/org/*`, and `/master/*` APIs.
3. [ ] Redirect tests: login, logout, expired membership, revoked admin, revoked master.
4. [ ] Feature flag rollout by workspace: Personal → Org Learner → Org Admin → Master.
5. [ ] Migration guide for old routes (`/home`, `/admin/*`, `/course/:id/*`) to new canonical paths.

### 11.6 Definition of Done

1. [ ] Users always see active context badge (Personal, Org, Master).
2. [ ] Unauthorized deep links never expose data and always land on correct fallback.
3. [ ] All role defaults redirect correctly after login.
4. [ ] Master-only capabilities are inaccessible to non-master users in both UI and API.
5. [ ] Documentation and route map are updated in one source of truth.

---

## 12) Migration Map + KPI Framework (Execution Layer)

This section converts the IA vision into an implementation contract with measurable success criteria.

### 12.1 Route Migration Map (Current -> Canonical)

| Current Route | Canonical Route | Redirect Strategy | Phase |
|---|---|---|---|
| `/` | `/app` | Soft redirect for authenticated users; hard redirect for guests to `/welcome` | 1 |
| `/home` | `/me/home` or `/org/:orgSlug/home` | Context-aware redirect based on active workspace | 1 |
| `/courses` | `/me/courses` or `/org/:orgSlug/courses` | Context-aware redirect | 1 |
| `/paths` | `/me/paths` or `/org/:orgSlug/paths` | Context-aware redirect | 1 |
| `/analytics` | `/me/analytics` or `/org/:orgSlug/analytics` | Context-aware redirect | 1 |
| `/progress` | `/me/progress` or `/org/:orgSlug/progress` | Context-aware redirect | 1 |
| `/join-org` | `/onboarding/org` and `/org-discovery` | Keep `/join-org` as legacy alias during rollout | 3 |
| `/course/:courseId/*` | `/org/:orgSlug/course/:courseId/*` | Preserve tail path; inject org slug from active org | 2 |
| `/admin/*` | `/org/:orgSlug/admin/*` | Role and membership guard before redirect | 2 |
| `N/A` | `/master/*` | New route group, no legacy mapping | 4 |

Migration rules:
1. Keep legacy aliases for one full release cycle.
2. Add `route_version` telemetry (`legacy` or `canonical`) to monitor adoption.
3. Remove aliases only when canonical usage is consistently above 95 percent for 30 days.

### 12.2 Canonical URL Policy

1. One resource must have one canonical URL.
2. URL must encode context (`me`, `org/:orgSlug`, `master`).
3. Query params are for state, never for authorization.
4. If canonical context is missing, redirect through `/app` resolver.
5. Backend authorization must not rely on frontend route assumptions.

### 12.3 Feature Flags and Rollout Controls

Recommended flags:
1. `ff_contextual_routing_v2`
2. `ff_workspace_switcher_v1`
3. `ff_onboarding_wizard_v1`
4. `ff_master_workspace_v1`
5. `ff_legacy_route_aliases`

Rollout sequence:
1. Internal QA users
2. Pilot org admins
3. 10 percent learner traffic
4. 50 percent learner traffic
5. 100 percent rollout

### 12.4 KPI Framework (Must Be Instrumented)

| KPI | Definition | Target | Owner |
|---|---|---|---|
| Time to First Value | Minutes from first login to first meaningful action (course start, source upload, or onboarding completion) | < 2 minutes | Product + UX |
| Onboarding Completion Rate | Completed onboarding sessions / started onboarding sessions | > 80 percent | Product |
| Workspace Switch Success | Successful context switches / initiated switches | > 98 percent | Frontend |
| Route Guard Accuracy | Valid guard outcomes / total guard decisions | > 99.5 percent | Frontend + Backend |
| Unauthorized Exposure Incidents | Count of protected-page data shown to unauthorized users | 0 | Security |
| Admin Task Completion | Completed key admin workflows (create course, invite member, create ELS project) | +20 percent vs baseline | Product |

Measurement window:
1. Daily monitoring with weekly trend review.
2. Use baseline from 14 days before rollout.

### 12.5 Required Telemetry Events

Minimum event schema:
1. `event_name`
2. `user_id`
3. `role`
4. `workspace_context`
5. `org_slug` (nullable)
6. `route`
7. `route_version`
8. `result` (`success`, `denied`, `error`)
9. `latency_ms`
10. `timestamp`

Priority events:
1. `workspace_switch_started`
2. `workspace_switch_completed`
3. `route_redirect_applied`
4. `route_guard_denied`
5. `onboarding_step_completed`
6. `time_to_first_value_recorded`
7. `admin_workflow_completed`

### 12.6 Critical Journey Test Matrix

| Journey | Role | Expected Path | Pass Criteria |
|---|---|---|---|
| First login with no org | Learner | `/app` -> `/me/home` -> onboarding prompt | Lands in personal context with clear next action |
| Join org and continue learning | Learner | `/onboarding/org` -> `/org/:orgSlug/home` | Context badge updates and learner nav changes |
| Open deep admin URL without role | Learner | `/org/:orgSlug/admin/*` -> `/403` | No protected data rendered |
| Create ELS project | Org Admin | `/org/:orgSlug/admin/enterprise` | Project created and visible in org context |
| Switch orgs as multi-org admin | Org Admin | Header switcher -> target org admin dashboard | All links and data re-scope to selected org |
| Access master workspace | Master | `/master/dashboard` | Master nav visible; non-master blocked |

### 12.7 Rollback Plan

1. Keep `ff_legacy_route_aliases` enabled until KPI stability is confirmed.
2. If route guard accuracy drops below 99 percent in any 24-hour period, disable `ff_contextual_routing_v2`.
3. Preserve server-side guard enforcement at all times, regardless of frontend flag state.
4. Publish rollback decision log with timestamp, trigger metric, and mitigation action.
