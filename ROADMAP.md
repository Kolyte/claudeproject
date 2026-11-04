# North East Origins — three-hour roadmap

**Target:** five people, each supervising coding agents, deliver a live Supabase-backed founder → published project → progress → open need → contributor application → founder review journey.

This file defines scope, ownership and acceptance; GitHub issues record live status. The three-hour checkpoints below are the original execution plan. As reviewed on 4 November 2026, P0 feature code is integrated, including Auth/profile, project publication, activity/milestones, opportunities/applications and discovery. The frontend includes the approved Network Design Kit redesign and bridge logo; preserve these when integrating changes. Legacy starter/demo sources remain available but are not the active application.

The hosted P0 gate is still awaiting a complete recorded multi-account journey and rehearsal. See [P1 issue #1](https://github.com/Kolyte/claudeproject/issues/1), [P4 issue #7](https://github.com/Kolyte/claudeproject/issues/7) and [demo acceptance](docs/DEMO.md). Earlier issue wording may precede merged PRs: P4 #6 and sector PRs #13/#14 are integrated. Do not interpret an open issue as evidence that its implementation is absent. The [project brief](project%20brief.md) retains the broader vision.

## Before the clock starts

- Assign one human to each of P1–P5. Confirm all five can push branches and review PRs.
- P1 confirms Supabase project access and Render access; the repository administrator enables the settings in [setup](docs/SETUP.md#github-enforcement).
- Each person reads [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md) and [contracts](docs/CONTRACTS.md), then opens one task issue using the template.
- Each person creates a separate checkout and one `pN/<task>` branch. Assign agents disjoint files within that lane.
- Use real Supabase persistence throughout the final demo. Missing infrastructure access is a blocker to resolve, not permission to silently substitute local storage.

## Ownership and handoffs

| Lane | Accountable person | Owns | Handoff |
|---|---|---|---|
| P1 | Platform/identity owner | Shared shell, infrastructure, dependencies/locks, contracts, authentication/profile feature, all migrations/RLS | Stable types, API plumbing and schema to everyone |
| P2 | Projects owner | Project UI and API, founder project dashboard, public project composition | Project IDs/pages to P3/P4; project summaries to P5 |
| P3 | Progress owner | Posts, milestones, timeline UI and API | `ProjectActivity` component to P2 |
| P4 | Opportunities owner | Needs, applications, founder review UI and API | `ProjectNeeds` component to P2; permissions cases to P5 |
| P5 | Discovery/integration owner | Landing/discovery UI and API, fixtures, seed script, end-to-end tests, demo document | Filtered discovery and verified release to the team |

The exact allowed paths are in [ownership.json](coordination/ownership.json). P1 owns dependency files even inside another lane. P5 coordinates sequential merges; each PR needs another person's review. P1 reviews P5's work. Schema and shared integration requests go to P1; no other lane edits those files.

## Checkpoints

| Minutes | Parallel execution | Gate |
|---|---|---|
| 0–20 | P1 scaffolds API/auth/schema/deployment; P2–P5 prepare feature exports and UI against contracts | Shared interfaces frozen; `/api/health` and frontend reachable; schema applied |
| 20–65 | Each lane implements its smallest real-data slice; merge small PRs | Project publish, progress, needs and discovery work against Supabase |
| 65–105 | Connect founder/contributor pages and private application review | Complete P0 journey on the shared deployment |
| 105–135 | Repair integration, test RLS, finish filters, seed fictional projects and mobile states | P0 acceptance checklist passes |
| 135–160 | Attempt stretch items in order while P0 stays green | Only completed, tested stretch work enters the release |
| 160–180 | Feature freeze, blocker fixes, final deployment and rehearsal | Rehearsed demo and recorded release commit/URL |

If a gate slips, stop stretch work and direct free capacity to a disjoint task owned by the blocked lane. The lane's human must assign the handoff explicitly. Do not create competing implementations or expand scope to hide a blocker.

## Work packets

Every row becomes an issue with the same task ID. Prefixes below cover the corresponding frontend and backend feature directories; see the machine policy for exact paths. Task IDs are stable; checkboxes are not used as a shared live status board.

| ID | Owner | Prerequisites | Permitted area | Observable completion | Handoff recipient |
|---|---|---|---|---|---|
| P1-01 | P1 | Access ready | Shared config, shell, backend entry, shared contracts | Existing frontend retained; API starts; proxy/static serving agreed; empty feature routes render without unresolved imports | P2–P5 |
| P1-02 | P1 | P1-01 | `shared/`, `supabase/`, identity/lib/middleware | P0 tables and RLS exist; token validation and user-scoped DB helper work; frozen contract exports available | P2–P5 |
| P1-03 | P1 | P1-02 | Auth/identity features | Registration, sign-in/out and private profile editing work with real accounts | P4, P5 |
| P1-04 | P1 | P1-01; provider access | Shared route registry, app shell, hosting config | Express serves built React; feature routes mounted as their PRs land; health check and production environment work | P5 |
| P2-01 | P2 | Contracts; P1-02 for live data | Projects feature | Owner creates a draft, edits it, publishes it and receives `/projects/:id`; visitor sees public fields; nonowner edits fail | P3–P5 |
| P2-02 | P2 | P2-01, P3-01, P4-01 | Projects feature | Founder dashboard lists own projects; public page composes activity and opportunities without changing their implementation | P5 |
| P3-01 | P3 | Contracts; P1-02; project ID | Activity feature | Owner publishes a dated post and milestone; timeline orders by date, handles empty/error states and labels milestones self-reported | P2, P5 |
| P4-01 | P4 | Contracts; P1-02; project ID | Opportunities feature | Owner creates/edits/closes a need; public page shows skills, hours, work mode and compensation | P2, P5 |
| P4-02 | P4 | P4-01, P1-03 | Opportunities feature | Contributor applies; owner reviews; duplicate submission handled; unrelated users cannot read applications | P5 |
| P5-01 | P5 | Contracts; P1-02 | Discovery feature | Landing page and `/explore` load real projects; location and skill filters work; empty/error states are usable | P2, team |
| P5-02 | P5 | P1-02, P2-01, P4-01 | Fixtures, seed script, legacy fixture adapter | Seed creates clearly fictional projects/needs for prepared accounts; existing fixture preserved/adapted; rerun is safe on demo records | Team |
| P5-03 | P5 | P0 feature PRs | End-to-end tests and demo doc | Two-account journey, permissions and persistence checks pass on deployment; release URL and commit recorded | Team |
| ALL-01 | Each lane | Own slice ready | Own files only | Relevant checks pass; screenshots/test evidence attached; small PR reviewed and ownership check green | P5 |

P2–P5 may build isolated components using fixtures before P1-02 lands. Fixtures are a development aid; the final P0 journey reads/writes Supabase. P1 adds shared route wiring only after the required feature exports exist, keeping every merged commit buildable.

## P0 acceptance gate, by minute 135

- Register/sign in, edit declared skills/location/availability, sign out and sign back in.
- Founder creates and publishes a project, adds progress/milestone, and opens a specific opportunity.
- Contributor discovers the project by skill/location and applies as a different account.
- Founder reviews that application. Applicant sees their own submission; a third account and anonymous visitor cannot inspect it.
- Nonowners cannot edit projects, posts, milestones or needs. Closed needs reject applications.
- Draft projects are private; published project responses exclude private account fields.
- Refresh/new session preserves data. API errors, loading states and empty lists render clearly.
- Run the journey on the deployed URL and a narrow mobile viewport using fictional examples.

## Ordered stretch goals

Start only after P0 passes. Finish one increment before taking on the next; skip nothing silently and record any scope decision in the task issue. P1 supplies shared contracts/schema before dependent lane work.

None of S-01–S-06 is accepted as a complete live feature by the evidence reviewed here. Legacy matching, follow state and activity helpers are disconnected demo code; they do not satisfy persistence, canonical-contract or acceptance requirements. Actual last-substantive-update dates already appear in discovery; S-02's activity labels remain separate work.

| Order/ID | Owner | Goal and done condition |
|---|---|---|
| S-01 | P5 + P1 schema | Follow/save projects; persisted per-user list, independent of membership |
| S-02 | P3 | Activity labels: recent ≤14 days, quiet 15–30, dormant >30; show actual last substantive update; no history says “New idea”; paused/completed remain separate |
| S-03 | P5 + P1 contracts | Deterministic declared-skill matching using the brief's 40/20/20/10/10 weights; show evidence, gaps and “heuristic fit,” never a success probability |
| S-04 | P1 | Consent-based selection of up to five public GitHub repositories; bounded metadata/README retrieval; never execute repository code |
| S-05 | P1 extraction; P5 review/matching | Strict-schema AI extraction with evidence links and user correction; imported content is untrusted; uncertain proficiency is labelled |
| S-06 | P2 project presentation; P5 discovery | Investor preference filters and founder-reported history; no return predictions, transactions or investment-quality score |

Messaging, comments, document uploads, private repository analysis, verification claims and financial transactions are outside this timed core. A feature not ready at minute 160 stays out of the release.

## Release handoff

P5 records the deployed URL, final commit, passed checklist, completed stretch IDs and known limitations in the release issue. Never commit account passwords. P1 confirms hosting health and Supabase permissions; each lane remains available for blocker fixes until minute 180.
