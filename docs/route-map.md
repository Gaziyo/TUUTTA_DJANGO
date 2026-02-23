# Tuutta Route Map Contract

This document defines all valid routes in the Tuutta LMS application.
**Any route not listed here should not exist.**

---

## PUBLIC ROUTES (No Authentication Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginPage | User authentication |
| `/signup` | SignupPage | User registration |
| `/forgot-password` | ForgotPasswordPage | Password recovery |

---

## AUTHENTICATED ROUTES (Any Role)

| Route | Component | Description |
|-------|-----------|-------------|
| `/home` | HomePage | Role-aware dashboard |
| `/chat` | AiTutorPage | AI tutor chat interface |

---

## LEARNER AND ABOVE

Accessible by: `learner`, `instructor`, `manager`, `admin`, `superadmin`

| Route | Component | Description |
|-------|-----------|-------------|
| `/courses` | CatalogPage | Course catalog |
| `/courses/:courseId` | CourseDetailPage | Course detail/overview |
| `/courses/:courseId/play` | CoursePlayer | Redirects to last lesson |
| `/courses/:courseId/play/:lessonId` | CoursePlayer | Lesson player |
| `/progress` | ProgressPage | My learning progress |
| `/achievements` | AchievementsPage | XP, badges, leaderboard |

---

## INSTRUCTOR AND ABOVE

Accessible by: `instructor`, `manager`, `admin`, `superadmin`

| Route | Component | Description |
|-------|-----------|-------------|
| `/gradebook` | GradebookPage | Grades for assigned courses |

---

## MANAGER AND ABOVE

Accessible by: `manager`, `admin`, `superadmin`

| Route | Component | Description |
|-------|-----------|-------------|
| `/team` | TeamProgressPage | Team progress and assignments |
| `/team/reports` | TeamReportsPage | Completion and compliance reports |

---

## ADMIN ONLY

Accessible by: `admin`, `superadmin`

| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/courses` | AdminCoursesPage | Course management list |
| `/admin/courses/new` | NewCoursePage | Genie AI builder entry point |
| `/admin/courses/:courseId/edit` | EditCoursePage | Edit existing course |
| `/admin/users` | AdminUsersPage | User management |
| `/admin/users/:userId` | UserProfilePage | Individual user profile/history |
| `/admin/reports` | AdminReportsPage | Org-wide reports dashboard |
| `/admin/settings` | AdminSettingsPage | Organization settings |
| `/admin/genie/:projectId` | GenieWorkspace | Genie AI pipeline workspace |

---

## ROLE HIERARCHY

```
superadmin (all routes)
    └── admin (all except superadmin-specific)
        └── manager (team + manager routes)
            └── instructor (gradebook + instructor routes)
                └── learner (basic learner routes)
```

---

## ROUTE GUARD IMPLEMENTATION

Every protected route MUST be wrapped with `RouteGuard`:

```tsx
<Route element={<RouteGuard allowedRoles={['admin']} />}>
  <Route path="/admin/courses" element={<AdminCoursesPage />} />
</Route>
```

---

## REDIRECT BEHAVIOR

| Scenario | Redirect To |
|----------|-------------|
| Unauthenticated user → protected route | `/login` |
| Authenticated user → insufficient role | `/home` with `state: { reason: 'unauthorized' }` |
| Authenticated user → `/` | `/home` |

---

## NAVIGATION CONFIGURATION

The sidebar navigation is role-based and defined in `AppShell`:

### Learner
- Home (`/home`)
- My Courses (`/courses`)
- AI Tutor (`/chat`)
- Progress (`/progress`)
- Achievements (`/achievements`)

### Instructor
- Home (`/home`)
- My Courses (`/courses`)
- Gradebook (`/gradebook`)
- AI Tutor (`/chat`)

### Manager
- Home (`/home`)
- My Courses (`/courses`)
- My Team (`/team`)
- Reports (`/team/reports`)
- AI Tutor (`/chat`)

### Admin
- Home (`/home`)
- Courses (`/courses`)
- AI Tutor (`/chat`)
- ---
- Course Builder (`/admin/courses`)
- Genie AI (`/admin/genie`)
- Users (`/admin/users`)
- Reports (`/admin/reports`)
- Settings (`/admin/settings`)

---

## CHANGELOG

| Date | Change | Author |
|------|--------|--------|
| 2026-02-19 | Initial route map contract | Architecture Reset |
