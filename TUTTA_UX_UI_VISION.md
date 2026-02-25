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
