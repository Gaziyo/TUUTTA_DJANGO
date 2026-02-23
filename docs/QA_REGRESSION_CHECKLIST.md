# QA Regression Checklist

## Core Auth
- Login with email/password
- Register new user
- Password validation errors
- Logout

## Navigation & Routing
- Browser back/forward works on `/courses`, `/paths`, `/admin/*`
- Deep links for `/course/:id/player` and `/path/:id/*`
- Admin context switch shows admin nav consistently

## Learning
- Enroll in course
- Course player loads modules/lessons
- Progress updates saved

## Genie / AI Bot
- Open `/admin/genie`
- Switch pipeline stages
- Open embedded modules (Sources, Draft Studio, Assessments, Launch, Analytics, Compliance, Notifications)

## Announcements
- Create, edit, publish, delete announcements
- Verify visibility by target audience

## Reports & Exports
- Audit logs load
- Data export (CSV/Excel) completes

## Mobile
- Sidebar collapses/expands
- Primary actions reachable on small screens
