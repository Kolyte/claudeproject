# Demo and acceptance handoff

**Owner: P5. Status: not run.** Record actual results in the task/release issue, not by several people editing this file concurrently. The final demo uses Supabase; the existing fixture module alone does not satisfy P0.

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

The script verifies the three accounts exist, refuses to run if a demo ID already belongs to another owner or project, upserts profiles → projects → needs → posts → milestones, and never deletes. `--skip-profiles` leaves the accounts' profile rows untouched. Column names follow the contract's snake_case mapping; if P1's migration differs, the script stops with the PostgREST error.

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

Both suites use Node's built-in test runner and skip, with the reason, when their environment is missing. The browser suite needs the `playwright` package (a P1 dependency request; it falls back to a globally installed copy).

```sh
node --test backend/src/features/discovery/discovery.test.ts frontend/src/features/discovery/discovery.test.mjs
```

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

For development before the API exists, `VITE_DISCOVERY_SOURCE=fixtures npm --prefix frontend run dev` makes discovery read the fictional fixture behind a visible "fictional fixture data" banner. Never use it for the demo.

## Release record

In the release issue, record: deployed URL, commit SHA, test result summary, owner/applicant checks, completed stretch IDs, known limitations and the three-minute rehearsal result. P1 confirms hosting health and migration versions. At minute 160, stop adding features and focus on release blockers.
