# Tuutta Architecture (Django + Render)

## Runtime Topology

- Frontend: React/Vite SPA
- Backend API: Django REST (`/api/v1/*`)
- Database: PostgreSQL
- Background jobs: Celery workers/beat
- Object/file storage: Django media storage path configured by environment

## Core Rules

- Frontend data writes go through API services in `src/services/*` and `src/lib/api.ts`.
- Auth state is sourced from Django JWT endpoints only.
- Organization access is enforced server-side on every protected endpoint.
- No Firebase/Firestore runtime dependencies in active paths.

## Release Gate

- `npm run build` passes
- `python manage.py migrate` applies cleanly
- Critical API auth flow works (`login -> me -> protected route`)
