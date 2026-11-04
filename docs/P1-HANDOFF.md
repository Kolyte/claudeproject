# Platform and integration handoff

Reviewed on 4 November 2026. ROADMAP.md defines scope, CONTRACTS.md defines interfaces, and GitHub issues hold live status.

## Integrated application

Platform/contracts/Auth/profile and the combined P0 application landed through PRs #2–#5; public environment configuration through #11/#12. [P4 PR #6](https://github.com/Kolyte/claudeproject/pull/6) is merged: its repository uses caller-scoped clients and application_review_summary(application_id uuid), resolving the former adapter-name conflict.

The approved Network Design Kit redesign and palette-matched SVG bridge are on main. Preserve the current presentation. [PR #13](https://github.com/Kolyte/claudeproject/pull/13) adds fixed-sector discovery and [PR #14](https://github.com/Kolyte/claudeproject/pull/14) adds sector selection and validation to project writes. Older unlisted sectors remain stored until edited.

App.tsx and backend routes.ts wire all P0 features. Legacy pages, the memory provider and matching/activity helpers are retained source material, disconnected from the active app. There is no automatic fixture fallback or live matching/following route.

## Shared interfaces

- Type-only @neo/contracts supplies canonical UUID/camelCase wire models and generated database types.
- Frontend: api, save, useResource, useAuth, RequireAuth, Feedback, Field and Pager.
- Backend: requireAuth, optionalAuth, createDb, HttpError and strict validators. Verified identity is res.locals.user; the caller-scoped client is res.locals.db.
- Discovery exposes SectorInput, SECTORS, canonicalSector and suggestSectors alongside its pages.
- The restricted review helper exposes only displayName, declaredSkills and hoursPerWeek to the owning founder.

Original combined implementation and redesign handoffs did not permanently transfer ownership. Future work follows coordination/ownership.json. [Setup](SETUP.md) has local/deployment commands and explicit feature checks.

## Verified evidence and remaining work

[P1 issue #1](https://github.com/Kolyte/claudeproject/issues/1) records all three hosted migrations, rolled-back permission assertions, configured Auth redirects, real email confirmation/profile editing, login/sign-out/session persistence, and the last recorded deployment at 025a5d8098066e443e49fc129517b599ac3e556a. Those Auth/setup tasks are delivered.

Read-only HTTP checks during this documentation review returned health 200, discovery 200, anonymous /api/me 401 and unknown API JSON 404, all with X-Robots-Tag: noindex, nofollow. These establish routing/reachability, not the deployed commit or full acceptance. Auto-deploy was recorded as disabled; do not assume later main changes are live.

| Owner | Remaining work |
|---|---|
| P1 | Verify selected release commit/CI; maintain shared integrations; extend CI to feature tests; verify repository protection with an administrator. Deployment requires explicit authorization. |
| P2 | Recheck draft/publication/dashboard composition and project-specific QA on the chosen release. |
| P3 | Recheck timeline/milestones and validation findings. S-02 labels remain stretch work. |
| P4 | Run hosted needs/application permission checks after #6; address role identity, paging, validation and action UX findings. Request contract changes from P1. |
| P5 | Record hosted fictional seed with three accounts, complete the deployed multi-account/mobile journey and three-minute rehearsal, and record exact release commit/URL. |

Local tests, hosted database assertions and public/Auth smoke are separate evidence. None replaces the complete [hosted P0 gate](DEMO.md).

## QA and test coverage

[PR #10](https://github.com/Kolyte/claudeproject/pull/10) reports 18 historical findings against 8e4e59c, before the redesign. Reproduce on current main before treating a finding as a current failure. Orange-button contrast and unloaded-Inter observations refer to superseded styling; the current app has different colours and self-hosted fonts. Source changes alone do not constitute a fresh accessibility audit.

Current source still has no role title in Application, opportunities ordered newest-first before pagination, an hours input using valueAsNumber, and h3 discovery-card headings. Recheck those alongside the report's auth/error, long-text, touch-target and validation cases. Only open needs accept applications; paused/completed project status does not itself close a need.

Default backend tests/platform CI omit feature-folder tests. Run discovery (including sector tests), fixtures and opportunities explicitly. Historical bundle-size/Fast Refresh warnings are not failing tests.

## Documentation refresh handoff

The human requested all documentation updated, then explicitly authorized merging all PRs while retaining the current design. This task uses P1 branch p1/documentation-refresh in a separate checkout. Updates to the P5 demo guide and P4 audit are documentation-only handoffs under that request; ordinary feature ownership remains unchanged. No task issue was supplied. PRs carry changes and verification; no unsolicited issue comments are required.
