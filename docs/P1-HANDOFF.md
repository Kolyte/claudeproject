# P1 implementation handoff

The product scope, permissions and wire contracts remain defined by `ROADMAP.md` and `docs/CONTRACTS.md`. The app now uses canonical API-backed feature modules. The legacy demo pages, memory provider and fixtures are preserved as source material but are not imported by the active app. There is no automatic fixture/local-storage fallback and no matching or following route in P0.

## Branch and integration

- Working branch: `p1/platform-foundation`; task: GitHub issue #1.
- The human expanded P1's task to replace the demo across the P0 feature areas. This is an explicit cross-lane implementation handoff, not a change to the five-lane ownership policy.
- PR #2 separately registers legacy paths introduced by the incoming demo. It must be reviewed before integration; do not weaken the checker.
- The combined replacement branch touches P2–P5 paths under that human instruction. The ordinary P1 ownership check will flag them. P5 must review the handoff and choose lane-scoped integration or obtain an explicit integration exception; a green build alone does not authorize merging.
- New `origin/p4/opportunities` and `origin/claude/focused-keller-eybtli` (P5) branches were discovered during the last fetch. They overlap this integration branch and must be reconciled sequentially; do not merge competing implementations blindly.

## Run locally

Use Node 24. There is no workspace conversion. Run `npm --prefix backend ci` and `npm --prefix frontend ci` from the repository root.

Copy `backend/.env.example` and `frontend/.env.example` to ignored `.env` files and use the same Supabase URL and publishable key. Never use a service-role key in either app. Run `npm --prefix backend run dev` and `npm --prefix frontend run dev` in separate terminals. Vite proxies `/api` to port 3001. Without Supabase configuration, the frontend shows a setup notice; health remains available and data APIs do not fake success.

For the dedicated local stack, run `npx supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`. Local API and database ports are 55421 and 55422. Email confirmation is enabled; local mail is captured by Mailpit. Ordered migrations run on initial local startup. Do not apply to a hosted project until its target/access are confirmed.

Production commands remain those in `docs/SETUP.md`; `render.yaml` prepares one Node service and disables automatic deployment. No hosted deployment is claimed.

## Shared integration interfaces

- `@neo/contracts`: type-only local dependency in both packages. Use `import type` and the canonical UUID/camelCase models.
- Frontend: `api<T>(path, options)`, `save<T>(path, body, method)`, `useResource<T>(path)`, `useAuth()`, `RequireAuth`, shared `Feedback`, `Field` and `Pager`.
- Backend: `requireAuth`, `optionalAuth`, `createDb`, `HttpError`, strict validation helpers. Verified identity is in `res.locals.user`; the caller-scoped Supabase client is `res.locals.db`.
- Feature public exports and the documented routes are wired in `frontend/src/App.tsx` and `backend/src/routes.ts`.
- Restricted SQL review helper: `application_review_summary(application_id uuid)` returns only displayName, declaredSkills and hoursPerWeek to the owning founder. P4's branch currently expects a differently named helper; reconcile that adapter without widening profile access.

## What each lane should do next

| Lane | Next responsibility |
|---|---|
| P1 | Reconcile shared integration adapters; select the hosted Supabase project and Render service, apply migrations, configure auth redirects and verify hosted auth/RLS. Own dependencies, shared types and route wiring. |
| P2 | Review the canonical project creation/edit/publication and dashboard implementation in `features/projects/`; verify draft visibility and composition of P3/P4 public exports. |
| P3 | Review `features/activity/`; finish timeline/empty/error states and preserve self-reported milestones and canonical post types. |
| P4 | Reconcile `p4/opportunities` with the shared middleware and review-summary function. Keep applications private and status transitions backed by the database. Do not change the wire contract to fit a local type. |
| P5 | Reconcile the discovery/seed/test branch, exercise the documented fictional seed against the real schema, and run the full deployed acceptance checklist. Coordinate sequential integration and rehearsal. |

## Verification and limits

The backend unit/API and PostgreSQL-engine checks cover validation, RLS, draft privacy, owner writes, application privacy, duplicate/closed needs, restricted summaries and terminal transitions. `tests/e2e/p0.test.mjs` exercises real local Supabase Auth/PostgREST plus two browser sessions, signup/email confirmation, discovery/application/review, refresh persistence and a 390px mobile viewport. It creates and removes isolated local test accounts; it refuses remote targets.

To run that end-to-end test, provide ignored `.env.test` with local `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO_API_URL`, `NEO_UI_URL` and `NEO_MAILPIT_URL`, then run `node --env-file=.env.test --test tests/e2e/p0.test.mjs`. The local administrative key is used only by test-account setup/cleanup, never by application requests. The browser test currently uses installed Microsoft Edge through Playwright.

Hosted provider behavior, a public deployment URL, the P5 fixture seed, and the final team rehearsal remain separate acceptance gates. Passing local checks does not mark the hosted P0 release complete.
