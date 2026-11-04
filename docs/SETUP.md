# Setup and release prerequisites

## What exists now

The repository contains a React/Vite/TypeScript starter in `frontend/`, its own npm lockfile and two fictional fixture projects. The Express server, Supabase schema, shared contract package and hosting configuration are planned P1 tasks. The commands in this section work now; the application commands below become valid only after P1's scaffold lands.

Use Node.js 24 (the coordination checker requires Node 22 or newer):

```sh
node --version
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run lint
node --test scripts/coordination/check-ownership.test.mjs
```

P1 installs backend/shared dependencies, adds the router/Supabase libraries, and owns all manifests/lockfiles. Preserve the existing separate frontend layout. No application dependency is needed for the coordination checker.

## Kickoff access

P1 confirms access to a dedicated Supabase demo project, Render account, repository settings owner and all team members' branch/review permissions. Assign actual humans to P1–P5 in one kickoff issue. Record provider/project names and the deployed URL there; share secrets through provider settings or a private channel, never the issue.

Prepare two email/password demo accounts (founder and contributor) and a third unrelated account for permission tests. Use team-controlled addresses, confirm them before rehearsal, and store unique passwords privately. Registration/confirmation must still be exercised during acceptance; the rehearsed path uses already confirmed accounts to avoid inbox delays. GitHub login is not required for P0.

## Planned application layout and commands

P1 scaffolds `backend/` with Express/TypeScript, a type-only `shared/` package (`@neo/contracts`), the frontend router and common API client. Both app packages refer to the shared types using npm local file dependencies; there is no workspace conversion. Shared contracts have no runtime secrets or side effects. P1 provides these scripts before advertising the backend as runnable:

```sh
# After P1's scaffold PR lands:
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

Frontend dev remains on port 5173 and proxies `/api` to `http://localhost:3001`. Backend uses `PORT`, default 3001 locally. Production Express serves `/api` first, static files from `frontend/dist`, and the SPA fallback only for non-API page requests. Unknown API paths return JSON 404, not index.html. P1 adds `typecheck`, `lint`, `test`, `build`, `dev`, `start` scripts to the backend and documents which are meaningful before the first feature PR.

## Environment contract

P1 adds redacted `.env.example` files when the scaffold is built. Put real values in ignored `.env` files/provider settings. Frontend variables are public build inputs.

| Variable | Location | Use |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend build/local frontend | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend build/local frontend | Public publishable key (legacy anon key accepted); never service-role |
| `SUPABASE_URL` | Backend | Same Supabase project |
| `SUPABASE_PUBLISHABLE_KEY` | Backend | Public/anon key plus current user's access token for RLS |
| `PORT` | Backend | Local default 3001; Render-provided in production |
| `NODE_ENV` | Backend | `production` on hosting |
| `SUPABASE_SERVICE_ROLE_KEY` | Local seed process only | Optional privileged fixture/account bootstrap; never normal API or frontend |
| `DEMO_FOUNDER_ID`, `DEMO_CONTRIBUTOR_ID` | Local seed process | Confirmed demo account UUIDs, not passwords |

The public key relies on RLS. Verify each protected table's policies before enabling anonymous access. P1 validates credentials on server start without logging values. The application uses relative `/api` URLs; no second production origin is required. Express verifies tokens through Supabase Auth, then passes the caller's token to its database client. Administrative credentials are not deployed to the web API.

## Supabase setup and migrations

1. P1 creates the six P0 tables, constraints, indexes, RLS policies and restricted review-summary helper defined in [contracts](CONTRACTS.md).
2. Store ordered SQL migrations under `supabase/migrations/`. P1 applies them serially through the chosen Supabase migration tooling and records the applied versions in the P1 task issue. Never rewrite applied migrations.
3. Set the Auth Site URL and allowed redirect URLs to the local frontend and actual deployed origin. Test signup, email confirmation and login using the chosen demo project's settings.
4. P5 implements `scripts/seed-demo.mjs` against the contract. It uses dedicated stable UUIDs and upserts only explicitly tagged demo records. It verifies the founder account exists and must not delete unrelated data. Any service-role key is used locally for this task only.
5. P5 verifies owner, applicant, unrelated-account and anonymous access using real JWTs, including direct database requests that exercise RLS.

Initial data belongs only to the fictional demo project. A successful seed is not evidence of real users, verified traction or NHS affiliation. See [DEMO.md](DEMO.md).

## Render deployment

P1 creates one Node web service connected to this repository, with the repository root as its working directory. Set Node.js 24 in hosting configuration. After the planned scaffold exists:

- **Build command:** `npm --prefix backend ci && npm --prefix frontend ci && npm --prefix backend run build && npm --prefix frontend run build`.
- **Start command:** `npm --prefix backend start`.
- **Health path:** `/api/health`.
- Set the public frontend variables at build time and backend variables at runtime. Set `NODE_ENV=production`; use Render's `PORT`.
- Deploy approved main commits. P5 coordinates the final release, P1 operates hosting. Wait for a successful build/health result and test a deep SPA URL plus an API 404.
- Verify auth redirects point to the real hostname and that refresh/login/application data survive a new browser session. Rehearse after the service is warm if the chosen hosting tier idles.

This document specifies the deployment; it does not confirm one has been created. Record the URL and release commit in the release issue only after verification.

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
