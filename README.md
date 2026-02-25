# Tuutta LMS

Tuutta is a full-stack learning platform with a React frontend and a Django backend.

## Stack

- Frontend: React 18, TypeScript, Vite, Zustand, React Router
- Backend: Django + Django REST Framework + PostgreSQL
- Async Jobs: Celery
- Deployment: Render (backend/database), static frontend host
- AI: OpenAI integrations routed through backend APIs

## Architecture

- Frontend calls backend via `/api/v1` (proxied in local dev by Vite).
- Auth is JWT-based (`/api/v1/auth/login/`, `/api/v1/auth/me/`).
- Learning engine pipelines (ingest/analyze/design/develop/implement/evaluate) are Django-backed.
- Firebase/Firestore code paths are decommissioned from active runtime.

## Local Development

### Backend

```bash
cd backend
venv/bin/python manage.py migrate
venv/bin/python manage.py runserver 8000
```

### Frontend

```bash
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8000` by default.

## Environment

Use `.env.example` as the baseline for frontend variables.

## Notes

- Legacy Firebase assets were moved to `archive/firebase_legacy/` for reference.
- Current production target is Django + PostgreSQL on Render.
