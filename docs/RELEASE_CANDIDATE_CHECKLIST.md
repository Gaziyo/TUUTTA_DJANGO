# Release Candidate Checklist

## Scope
Use this checklist for go/no-go on production release candidates.

## 1) Core validation
- `npm run lint` passes
- `npx vitest run -c vitest.guided-smoke.config.ts` passes
- `npm run build` passes
- Guided ADDIE create/update/load smoke matrix is all pass

## 2) Observability and alerting
- `VITE_STATUS_PAGE_URL` is set in deploy environment
- Optional `VITE_STATUS_BADGE_URL` is set for footer badge
- `VITE_SENTRY_DSN` and `VITE_SENTRY_ENV` are set for frontend error monitoring
- `node scripts/observability-check.mjs` reports no failed uptime checks
- Scheduled uptime workflow (`.github/workflows/uptime-check.yml`) is active

## 3) Auditability and compliance
- Admin/compliance actions create audit logs
- AI/ingestion/user actions emit structured observability logs
- Audit log viewer shows recent actions for the target org

## 4) Release hygiene
- `playwright-report/` and `test-results/` are excluded by `.gitignore`
- No temporary build/test artifacts are committed
- Lockfile updated and committed when dependency graph changes

## 5) Rollback drill (must execute before go-live)
1. Identify rollback target SHA: `git rev-parse --short HEAD~1`
2. Confirm target builds in CI from previous successful run
3. Simulate rollback command in staging:
   - `git revert --no-edit <release_commit_sha>`
4. Deploy reverted staging build and run smoke suite
5. Confirm rollback communication template is ready
6. Record rollback elapsed time and owner in release notes

## Go / No-Go Criteria
- Go: all checklist items pass, no critical/P1 defects open
- No-Go: any failed smoke test, failed build, or missing observability/audit coverage
