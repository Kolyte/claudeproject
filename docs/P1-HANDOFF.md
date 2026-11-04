# P1 implementation handoff

The product scope, permissions and wire contracts remain defined by `ROADMAP.md` and `docs/CONTRACTS.md`. The app now uses canonical API-backed feature modules. The legacy demo pages, memory provider and fixtures are preserved as source material but are not imported by the active app. There is no automatic fixture/local-storage fallback and no matching or following route in P0.

## Branch and integration

- Task and current branch/release evidence: [GitHub issue #1](https://github.com/Kolyte/claudeproject/issues/1). Platform follow-up: `p1/platform-verification`, PR #4.
- The human expanded P1's task to replace the demo across the P0 feature areas. This is an explicit cross-lane implementation handoff, not a change to the five-lane ownership policy.
- PR #2 registered legacy paths introduced by the incoming demo and is merged. PR #3 merged the combined P0 implementation; PR #5 corrected the public-route Auth gate.
- The combined replacement touches P2–P5 paths under that human instruction. The ordinary P1 ownership check flags them. The human subsequently explicitly instructed P1 to merge this combined PR into main after consistency checks; that authorization is a one-off integration exception, not a change to future lane ownership.
- P5's discovery work landed on main during integration and is preserved here, wired to the P1 platform. The separate `origin/p4/opportunities` branch overlaps the current opportunities module; P4 must rebase and reconcile it against the integrated base.

## Run locally

Use Node 24. There is no workspace conversion. Run `npm --prefix backend ci` and `npm --prefix frontend ci` from the repository root.

Copy `backend/.env.example` and `frontend/.env.example` to ignored `.env` files and use the same Supabase URL and publishable key. Never use a service-role key in either app. Run `npm --prefix backend run dev` and `npm --prefix frontend run dev` in separate terminals. Vite proxies `/api` to port 3001. Without frontend Supabase configuration, public landing/discovery pages still render and account routes show a setup notice. Health remains available; data APIs do not fake success.

For the dedicated local stack, run `npx supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`. Local API and database ports are 55421 and 55422. Email confirmation is enabled; local mail is captured by Mailpit. Ordered migrations run on initial local startup. Do not apply to a hosted project until its target/access are confirmed.

Production commands are in `docs/SETUP.md`; `render.yaml` describes one Node service and disables automatic deployment. The hosted app is [north-east-origins.onrender.com](https://north-east-origins.onrender.com/). Provider configuration, exact release commits and acceptance evidence are tracked in issue #1.

## Shared integration interfaces

- `@neo/contracts`: type-only local dependency in both packages. Use `import type` and the canonical UUID/camelCase models.
- Frontend: `api<T>(path, options)`, `save<T>(path, body, method)`, `useResource<T>(path)`, `useAuth()`, `RequireAuth`, shared `Feedback`, `Field` and `Pager`.
- Backend: `requireAuth`, `optionalAuth`, `createDb`, `HttpError`, strict validation helpers. Verified identity is in `res.locals.user`; the caller-scoped Supabase client is `res.locals.db`.
- Feature public exports and the documented routes are wired in `frontend/src/App.tsx` and `backend/src/routes.ts`.
- Restricted SQL review helper: `application_review_summary(application_id uuid)` returns only displayName, declaredSkills and hoursPerWeek to the owning founder. P4's branch currently expects a differently named helper; reconcile that adapter without widening profile access.

## What each lane should do next

| Lane | Next responsibility |
|---|---|
| P1 | Own shared adapters, dependencies, generated types, migrations/RLS, identity and hosting. Finish hosted Auth redirects/account checks and HTTP health-check configuration; keep release evidence in issue #1. |
| P2 | Review the canonical project creation/edit/publication and dashboard implementation in `features/projects/`; verify draft visibility and composition of P3/P4 public exports. |
| P3 | Review `features/activity/`; finish timeline/empty/error states and preserve self-reported milestones and canonical post types. |
| P4 | Reconcile `p4/opportunities` with the shared middleware and review-summary function. Keep applications private and status transitions backed by the database. Do not change the wire contract to fit a local type. |
| P5 | Discovery/seed/test work from main is included. Exercise the documented fictional seed against the real schema and run the full deployed acceptance checklist. Coordinate sequential integration and rehearsal. |

## Verification and limits

The backend unit/API and PostgreSQL-engine checks cover validation, RLS, draft privacy, owner writes, application privacy, duplicate/closed needs, restricted summaries and terminal transitions. `tests/e2e/p0.test.mjs` exercises real local Supabase Auth/PostgREST plus two browser sessions, signup/email confirmation, discovery/application/review, refresh persistence and a 390px mobile viewport. It also applies P5's documented fictional seed twice against the real local schema. It creates and removes isolated local test accounts; it refuses remote targets.

To run that end-to-end test, provide ignored `.env.test` with local `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO_API_URL`, `NEO_UI_URL` and `NEO_MAILPIT_URL`, then run `node --env-file=.env.test --test tests/e2e/p0.test.mjs`. The local administrative key is used only by test-account setup/cleanup, never by application requests. The browser test currently uses installed Microsoft Edge through Playwright.

Hosted database permission assertions and deployed public-route checks have passed; see issue #1 for the tested release. Hosted email confirmation, the fictional seed and the full team rehearsal require their own evidence. Passing local checks or public-page smoke checks does not mark the hosted P0 journey complete.
