# Genie Tabs Migration Checklist

## Routing (No Legacy Breaks)
- [ ] Keep `/admin/genie` routed to Genie AI hub.
- [ ] Keep `/admin/genie/ai-bot` routed to AI Bot workspace.
- [ ] Keep legacy Genie tools:
  - `/admin/genie/sources`
  - `/admin/genie/studio`
  - `/admin/genie/assessments`
  - `/admin/genie/enrollments`
  - `/admin/genie/analytics`
  - `/admin/genie/compliance`
  - `/admin/genie/notifications`
- [ ] Keep `/admin/enterprise` unchanged (ELS Studio).
- [ ] Add guided routes:
  - `/admin/genie-guided`
  - `/admin/genie-guided/preview`
  - `/admin/genie-guided/impact`

## Navigation
- [ ] Admin nav shows 4 tabs:
  - Genie AI
  - AI Bot
  - Guided ADDIE
  - ELS Studio
- [ ] “AI Bot” quick action routes to `/admin/genie/ai-bot`.
- [ ] “Genie AI” remains the default entry.

## State Isolation
- [ ] Genie AI uses `GeniePipelineProvider`.
- [ ] AI Bot uses `BotPipelineProvider`.
- [ ] Guided ADDIE uses `GuidedPipelineProvider`.
- [ ] ELS Studio uses its own provider (or remains isolated).

## UX Safety
- [ ] All old bookmarks still open.
- [ ] No redirects that collapse tabs.
- [ ] Each tab has its own layout and state.

## QA Smoke Checks
- [ ] `/admin/genie` loads (hub)
- [ ] `/admin/genie/ai-bot` loads (bot UI)
- [ ] `/admin/genie-guided` loads (guided workspace)
- [ ] `/admin/enterprise` loads (ELS Studio)
