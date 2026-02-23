# Observability Setup (Sentry + UptimeRobot)

## Sentry (Frontend)
1. Create a Sentry project for the web app.
2. Copy the DSN.
3. Set these environment variables:
   - `VITE_SENTRY_DSN`
   - `VITE_SENTRY_ENV` (e.g., `production`)
4. Deploy and verify errors appear in Sentry.

## UptimeRobot (Status Page)
1. Create an UptimeRobot account and add monitors for:
   - `https://tuuttawebapp.netlify.app`
   - API endpoints (if applicable)
2. Create a public status page.
3. Set `VITE_STATUS_PAGE_URL` to the public status page URL.
4. (Optional) Set `VITE_STATUS_BADGE_URL` to the badge image URL (e.g., `.../badge.svg`).
5. Verify the Status link and uptime badge appear in the footer.

## Automated Checks
1. Local check:
   - `npm run ops:observability`
2. Scheduled check:
   - `.github/workflows/uptime-check.yml` runs hourly.
   - Configure repository variables:
     - `UPTIME_URLS` (comma-separated URL list)
     - `VITE_STATUS_PAGE_URL`
     - `VITE_STATUS_BADGE_URL` (optional)

## Structured Logging
- Structured observability logs are emitted for:
  - AI calls
  - Ingestion events
  - Key user/admin actions
- Audit events are persisted for admin/compliance operations and visible in audit logs.
