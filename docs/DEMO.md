# Demo and acceptance handoff

**Owner: P5. Reviewed 4 November 2026.** Seed and acceptance suites are implemented. Local Supabase acceptance passes are recorded in PR #14, while issue #1 records hosted Auth, database-policy and public-route checks. A complete hosted seed → multi-account journey → mobile rehearsal has no recorded pass in the evidence reviewed. Record actual runs and release status in the task/release issue. The final demo uses Supabase; a fixture module or skipped suite does not satisfy P0.

The approved redesign, bridge logo, P4 opportunities and fixed-sector PRs #13/#14 are integrated on main. Preserve that design and verify the exact deployed commit before rehearsal. The last deployment recorded in [issue #1](https://github.com/Kolyte/claudeproject/issues/1) is `025a5d8098066e443e49fc129517b599ac3e556a`, before these later changes; a healthy URL alone cannot confirm their deployment.

## Fictional examples

Preserve/adapt the existing TyneFlow AI and Vanguard Patient Portal fixtures. They are fictional demo projects, with no asserted real users, NHS affiliation, measured traction or independently verified milestones. Mark the seed dataset and presentation clearly as fictional. Translate legacy slugs/stage labels to the canonical schema; use stable demo UUIDs so the seed can be rerun safely.

Prepare a confirmed founder, contributor and unrelated test account. The founder owns seeded projects; contributor has declared React/TypeScript skills and an appropriate availability value. Store passwords privately. Use no real personal histories, private repositories or uploaded CVs.

The seed must upsert only the dedicated tagged demo records, validate its account IDs and avoid deleting any unrelated data. Prepare the visible timeline, at least one open need and one already closed need. All milestones say “Founder reported” or “Self-reported.”

### Seeding (P5-02)

The dataset lives in `fixtures/demo-dataset.mjs`. It adapts the current `frontend/src/data/mockData.ts` projects and the preserved TyneFlow AI / Vanguard fixtures (`fixtures/legacy-projects.mjs`) to the contract schema. IDs are deterministic UUIDs in a fixed demo namespace; that namespace is the "tag". Every project's problem text ends with a fictional-project notice.

```sh
node scripts/seed-demo.mjs --dry-run      # validates against the contract; no network, no env
node --test fixtures/demo-dataset.test.mjs
```

After P1 has applied the P0 migrations, seed locally with the prepared accounts' Auth user IDs:

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
DEMO_FOUNDER_ID=<uuid> DEMO_CONTRIBUTOR_ID=<uuid> DEMO_UNRELATED_ID=<uuid> \
DEMO_FOUNDER_NAME="Demo Founder" node scripts/seed-demo.mjs --apply
```

The script verifies the three accounts exist, refuses to run if a demo ID already belongs to another owner or project, upserts profiles → projects → needs → posts → milestones, and never deletes. It warns about unconfirmed accounts rather than failing, so check confirmation before rehearsal. `--skip-profiles` leaves profile rows untouched; without it the prepared demo profiles are updated. Column names match the implemented snake_case schema. Migrations `202611040001`–`202611040003` are recorded as applied to hosted Supabase; applying this seed to that target still requires its own evidence.

The dry run validates 3 fictional profiles, 8 projects, 12 needs, 16 posts and 8 milestones. It makes no network requests. Rerunning the real seed updates these demo records and does not create applications; test that flow through the application.

For PowerShell or other shells, put seed variables in ignored `.env.seed` and use `node --env-file=.env.seed scripts/seed-demo.mjs --apply`. Include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and all three `DEMO_*_ID` values; names are optional. Keep administrative keys out of tracked app environment files. Confirm the intended target: tracked app defaults point at the shared hosted demo.

## Three-minute core script

| Time | Action | Proof |
|---|---|---|
| 0:00–0:20 | Explain North East Origins and the complementary-skills problem | Project-first regional discovery |
| 0:20–1:10 | Founder signs in, publishes a project, adds progress/milestone and an open need | Real public URL, dated timeline and specific skills/hours |
| 1:10–2:10 | Contributor in a separate browser session filters projects, reads the timeline and applies | Real persisted application tied to the selected need |
| 2:10–2:40 | Founder opens review and changes application status | Founder sees intended data; contributor sees their own status |
| 2:40–3:00 | Refresh and show the public project from a signed-out session | Persistence and public/private boundary |

Use two browser profiles/sessions to avoid role switching confusion. A demo script for optional matching/GitHub import is added only after its roadmap stretch task passes.

## Acceptance evidence

- Registration and email confirmation tested separately; prepared accounts used for the rehearsed demo.
- Sign in/out and edit profile; a second session sees persisted values.
- Draft project hidden from anonymous/unrelated users; public project readable without authentication.
- Unauthorized project/post/milestone/need edits denied by API and direct RLS-backed access.
- Open need accepts one application per contributor; closed need and duplicates return the documented conflict response.
- Founder reviews only their projects' applications; applicant reads only their own; unrelated account and anonymous request are denied.
- Founder cannot read private profile fields through the review-summary function, and an unrelated account cannot use it to inspect applicants.
- Discovery's location/skill filters, no-results state, loading and network errors work.
- Refresh on a deep SPA link works; unknown `/api` route returns JSON 404.
- Mobile viewport supports the end-to-end journey without clipped actions.
- No source text, example data or UI implies verified commercial traction or guaranteed equity.

P5 implements browser journey tests in `tests/e2e/` and records reproducible steps for permission checks. Do not attach JWTs, passwords, service keys or private profile responses to public issues.

### Running the automated checks (P5-03)

The P5 discovery-browser and permissions-API suites use Node's built-in runner and skip with a reason when their environment is missing. The browser suite imports `playwright` from the test location, then tries CommonJS resolution (including `NODE_PATH`). Playwright is supplied through the backend's `@playwright/test` dependency, but a root-level test may need `NODE_PATH` pointing at `backend/node_modules`; no new manifest or dependency is needed. The discovery suite launches bundled Chromium, so that browser executable must already be installed. The separate P0 suite resolves Playwright directly from the backend package and defaults to installed Edge.

```sh
node --test backend/src/features/discovery/discovery.test.ts frontend/src/features/discovery/discovery.test.mjs
```

These discovery suites include fixed-sector validation, suggestions and frontend/backend list parity. Also run `node --test fixtures/demo-dataset.test.mjs`. The default backend test script/platform CI does not run these feature suites or P4's in-memory tests; see [setup](SETUP.md#local-stack-and-validation-coverage).

```sh
E2E_BASE_URL=https://<deployment> node --test tests/e2e/discovery.browser.test.mjs
```

```sh
E2E_BASE_URL=https://<deployment> SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... \
E2E_FOUNDER_EMAIL=... E2E_FOUNDER_PASSWORD=... E2E_CONTRIBUTOR_EMAIL=... E2E_CONTRIBUTOR_PASSWORD=... \
E2E_UNRELATED_EMAIL=... E2E_UNRELATED_PASSWORD=... node --test tests/e2e/permissions.api.test.mjs
```

- `discovery.browser.test.mjs` covers landing → explore hand-off, skill and location filters synced to the URL, deep-link refresh, no-results and retryable network-error states, and a 375px mobile viewport with no horizontal overflow.
- `permissions.api.test.mjs` covers the acceptance list above at API level as anonymous, founder, contributor and unrelated users. That includes drafts, edits, needs/posts/milestones, discovery, applications, duplicates, closed needs, the review-summary shape and status transitions. It leaves records titled `[E2E fictional] …` behind. Direct RLS checks with the publishable key and the review-summary function are still manual steps for P1 and P5.

For PowerShell, save the listed P5 suite variables in ignored `.env.e2e` and run `node --env-file=.env.e2e --test tests/e2e/permissions.api.test.mjs` or the discovery-browser filename. To resolve backend Playwright for the discovery suite, set `$env:NODE_PATH = (Resolve-Path backend/node_modules).Path` in that terminal. This changes module lookup only; it does not install a browser or establish acceptance.

The full local acceptance run uses P1's local stack (see `docs/P1-HANDOFF.md`), with all three suites pointed at it:

- **Seed:** run `seed-demo.mjs --apply` against three confirmed local accounts.
- **Browser suite:** `E2E_BASE_URL=http://127.0.0.1:5173`.
- **Permission suite:** `E2E_BASE_URL=http://127.0.0.1:3001` plus the local URL, publishable key and account logins.
- **P1's journey:** `node --env-file=.env.test --test tests/e2e/p0.test.mjs`.

The ignored `.env.test` must set local `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO_API_URL`, `NEO_UI_URL` and `NEO_MAILPIT_URL`. Local defaults are API 55421, Express 3001, Vite 5173 and Mailpit 54324. The P0 suite creates/removes isolated test accounts and refuses remote targets; do not use it to test a hosted release. P5's permissions suite is the deployed-target check and intentionally retains fictional records.

`p0.test.mjs` launches Microsoft Edge by default. Set `NEO_BROWSER_CHANNEL=chromium` for Playwright's bundled Chromium, or `NEO_BROWSER_PATH=<chrome binary>` for a specific binary. Its seed step uses a per-run ID scope, so it also passes on a stack already seeded for the demo. If the network blocks `ghcr.io` image layers, `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start …` pulls the same images from Docker Hub.

A local pass is evidence for the code, not for the hosted release. PR #14 records local permissions API 14/14, P0 journey 7/7 and discovery browser 7/7, with both builds/lints and backend checks. These are recorded historical results, not reruns during this documentation refresh. The hosted seed, exact deployed commit and rehearsal still require release evidence. Public HTTP smoke during the refresh returned health/discovery 200, anonymous me 401 and unknown API 404; it does not replace that work.

For development before the API exists, `VITE_DISCOVERY_SOURCE=fixtures npm --prefix frontend run dev` makes discovery read the fictional fixture behind a visible "fictional fixture data" banner. Never use it for the demo.

## Release record

In the release issue, record: deployed URL, commit SHA, test result summary, owner/applicant checks, completed stretch IDs, known limitations and the three-minute rehearsal result. P1 confirms hosting health and migration versions. At minute 160, stop adding features and focus on release blockers.

No ordered stretch task S-01–S-06 is accepted as complete in the evidence reviewed. Legacy matching/follow examples are disconnected code. Do not demo them as persistent live features. Seeded sectors now use the canonical list, but existing non-demo projects with older sectors remain unchanged until edited.
