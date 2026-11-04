# Setup and release prerequisites

## What exists now

The repository contains the React/Vite frontend, Express API, type-only shared contracts, six-table Supabase schema with RLS, and one-service Render configuration. The active application uses Supabase-backed APIs. Fictional fixtures are preserved for isolated development and explicit seeding.

The hosted preview is [north-east-origins.onrender.com](https://north-east-origins.onrender.com/). [P1 issue #1](https://github.com/Kolyte/claudeproject/issues/1) records the last verified deploy at `025a5d8098066e443e49fc129517b599ac3e556a`, three applied migrations, Auth redirects and real confirmation/login/profile checks. Later redesign, logo, opportunities and sector changes are on main; their deployment needs separate verification. Read-only HTTP checks on 4 November 2026 returned health 200, discovery 200, anonymous `/api/me` 401 and unknown API JSON 404, all with `X-Robots-Tag: noindex, nofollow`. Reachability does not identify the running commit or complete hosted acceptance.

Use Node.js 24 (the coordination checker requires Node 22 or newer):

```sh
node --version
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint
node --test scripts/coordination/check-ownership.test.mjs
```

P1 owns backend/shared dependencies, router/Supabase libraries and all manifests/lockfiles. Preserve the existing separate frontend layout. No application dependency is needed for the coordination checker.

## Kickoff access

P1 confirms access to a dedicated Supabase demo project, Render account, repository settings owner and all team members' branch/review permissions. Assign actual humans to P1–P5 in one kickoff issue. Record provider/project names and the deployed URL there; share secrets through provider settings or a private channel, never the issue.

Prepare two email/password demo accounts (founder and contributor) and a third unrelated account for permission tests. Use team-controlled addresses, confirm them before rehearsal, and store unique passwords privately. Registration/confirmation must still be exercised during acceptance; the rehearsed path uses already confirmed accounts to avoid inbox delays. GitHub login is not required for P0.

## Application layout and commands

`backend/` contains Express/TypeScript; `shared/` exports type-only `@neo/contracts`; the frontend has a router and common API client. Both app packages refer to the shared types using npm local file dependencies; there is no workspace conversion. Shared contracts have no runtime secrets or side effects.

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run dev
# In a second terminal:
npm --prefix frontend run dev

# Production build and start, from repository root:
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix backend start
```

Frontend dev remains on port 5173 and proxies `/api` to `http://localhost:3001`. Backend uses `PORT`, default 3001 locally. Production Express serves `/api` first, static files from `frontend/dist`, and the SPA fallback only for non-API page requests. Unknown API paths return JSON 404, not index.html. The backend provides `typecheck`, `lint`, `test`, `build`, `dev`, `start` and `smoke:production` scripts. Run the production smoke after building both packages; it verifies compiled routing without testing Supabase authentication.

## Environment contract

Complete `backend/.env` and `frontend/.env` files are checked in with the shared hosted demo URL and publishable key. These are public connection settings; the key also ships in the frontend bundle and relies on RLS. `.env.example` files describe the variables for other environments. Other `.env.*` files remain ignored; administrative and account credentials belong in provider settings or ignored local files. Frontend variables are public build inputs.

For a local Supabase stack, replace the URL and publishable key in both app `.env` files with the local stack's values and keep those edits uncommitted. Tracked defaults target the shared hosted demo: confirm the target before writing test data. Production Render variables override the backend `.env`, including `PORT` and `NODE_ENV`.

| Variable | Location | Use |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend build/local frontend | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend build/local frontend | Public publishable key (legacy anon key accepted); never service-role |
| `SUPABASE_URL` | Backend | Same Supabase project |
| `SUPABASE_PUBLISHABLE_KEY` | Backend | Public/anon key plus current user's access token for RLS |
| `PORT` | Backend | Local default 3001; Render-provided in production |
| `NODE_ENV` | Backend | `production` on hosting |
| `SUPABASE_SERVICE_ROLE_KEY` | Local seed process only | Optional privileged fixture/account bootstrap; never normal API or frontend |
| `DEMO_FOUNDER_ID`, `DEMO_CONTRIBUTOR_ID`, `DEMO_UNRELATED_ID` | Local seed process | Three distinct prepared Auth account UUIDs, not passwords |
| `DEMO_FOUNDER_NAME`, `DEMO_CONTRIBUTOR_NAME`, `DEMO_UNRELATED_NAME` | Local seed process | Optional fictional display names |
| `VITE_DISCOVERY_SOURCE` | Frontend development/build | Explicit `fixtures` mode for isolated development; omit for the live demo |

The public key relies on RLS. Verify each protected table's policies before enabling anonymous access. P1 validates credentials on server start without logging values. The application uses relative `/api` URLs; no second production origin is required. Express verifies tokens through Supabase Auth, then passes the caller's token to its database client. Administrative credentials are not deployed to the web API.

## Supabase setup and migrations

1. The six P0 tables, constraints, indexes, RLS policies and restricted `application_review_summary(application_id uuid)` helper are implemented in `supabase/migrations/`, as defined in [contracts](CONTRACTS.md).
2. Migrations `202611040001`–`202611040003` are recorded as applied to hosted Supabase in issue #1. For another environment, P1 applies migrations serially and records the target and versions. Never rewrite applied migrations or reapply to a shared target just to run tests.
3. Set the Auth Site URL and allowed redirect URLs to the local frontend and actual deployed origin. Test signup, email confirmation and login using the chosen demo project's settings.
4. P5's implemented `scripts/seed-demo.mjs` uses stable demo UUIDs, verifies all three prepared accounts exist and checks record ownership before upserting. It never deletes unrelated data. Unconfirmed accounts produce a warning rather than a failure, so confirm them before rehearsal. Service-role credentials are local to this seed process only. Applying the hosted seed still needs its own recorded evidence.
5. P5 verifies owner, applicant, unrelated-account and anonymous access using real JWTs, including direct database requests that exercise RLS.

Initial data belongs only to the fictional demo project. A successful seed is not evidence of real users, verified traction or NHS affiliation. See [DEMO.md](DEMO.md).

## Render deployment

Deployment is a separate authorized action; merging application or documentation PRs does not deploy the service automatically.

Use one Node web service connected to this repository, with the repository root as its working directory. Set Node.js 24 in hosting configuration:

- **Build command:** `npm --prefix backend ci && npm --prefix frontend ci && npm --prefix backend run build && npm --prefix frontend run build`.
- **Start command:** `npm --prefix backend start`.
- **Health path:** `/api/health`.
- Set the public frontend variables at build time and backend variables at runtime. Set `NODE_ENV=production`; use Render's `PORT`.
- Deploy approved main commits. P5 coordinates the final release, P1 operates hosting. Wait for a successful build/health result and test a deep SPA URL plus an API 404.
- Verify auth redirects point to the real hostname and that refresh/login/application data survive a new browser session. Rehearse after the service is warm if the chosen hosting tier idles.

`render.yaml` describes the intended configuration and disables automatic deploys. Direct MCP creation exposes fewer settings, so explicitly check `/api/health` is configured as the HTTP health-check path in Dashboard. Keep release commits, deployed settings and acceptance evidence in the task/release issue after verification.

## GitHub enforcement

The `2BE-ops` account was verified to have repository push permission but not administrator permission during preparation. A repository administrator (or role allowed to edit repository rules) must activate the settings below. The initial coordination commit installs files; it cannot activate repository settings on its own.

After the coordination workflow has appeared on an initial lane PR, protect `main` with:

1. Require a pull request and **one approval from someone other than the author**.
2. Dismiss stale approvals after new commits; require conversations resolved.
3. Require status check **`coordination / ownership`** and require branches up to date before merging. Select the exact emitted job name after its first run.
4. Disable force pushes and branch deletion; apply restrictions to administrators/bypass roles as the repository permits.
5. Keep automatic merging off for the timed build. P5 handles sequential reviewed merges; P1 reviews P5's PRs.

The workflow has only repository-content and pull-request read permissions. It checks out the PR's base commit and runs its checker/policy, never candidate PR code. Candidate ownership-policy edits take effect only after merge. Missing base policy/checker is a failed setup condition, not permission to skip validation.

Overlap warnings are advisory because PRs may change while a check runs. P5 rechecks open PRs and latest main immediately before each merge. Lane prefixes identify an agreed workstream, not a person's GitHub identity. Do not claim an atomic lock or access-control boundary from these checks.

GitHub reference: [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). CODEOWNERS can be added by P1 once real reviewer handles are supplied; no fictional handles are installed.

## Local stack and validation coverage

The dedicated local Supabase configuration uses API port 55421, database 55422 and Mailpit 54324. With Docker and the Supabase CLI available, start it from the root:

```sh
npx supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

This starts the local stack rather than migrating hosted Supabase. Local email confirmation is enabled. The disposable-account P0 test refuses remote targets.

Dependency-free checks from the repository root, using Node 24:

```sh
node --test scripts/coordination/check-ownership.test.mjs
node scripts/coordination/check-ownership.mjs --base origin/main --branch p1/your-task
node --test fixtures/demo-dataset.test.mjs
node scripts/seed-demo.mjs --dry-run
node --test backend/src/features/discovery/discovery.test.ts frontend/src/features/discovery/discovery.test.mjs
```

The discovery suites include sector-list parity, suggestions and filter validation. With existing package dependencies installed:

```sh
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix backend run lint
npm --prefix frontend run lint
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix backend run smoke:production
```

From `backend/`, also run `npx tsx --test src/features/opportunities/opportunities.test.ts`. Those tests use an in-memory repository; they do not prove RLS.

The default backend test script runs only `src/lib/*.test.ts`. Platform CI builds/lints both packages, runs those tests and the compiled production smoke; it currently omits discovery, fixtures, opportunities and browser suites. Run feature checks explicitly and request a P1 CI update. [DEMO.md](DEMO.md) documents browser/permission environments. An environment-related skip or earlier local pass does not count as hosted acceptance.
