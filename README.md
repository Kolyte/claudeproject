# North East Origins

Discover what the North East is building. Find a project worth joining, or the people who can help build yours.

North East Origins is a project-first collaboration platform for North East England. This repository contains the React frontend, Express API, Supabase migrations, shared contracts, fictional development fixtures and the coordination pack for five people building with coding agents.

The P0 application is implemented, and the hosted preview is [north-east-origins.onrender.com](https://north-east-origins.onrender.com/), using Supabase persistence. Implementation on `main` includes the Network Design Kit redesign, bridge logo, P4 opportunities and fixed-sector discovery/project forms. The full hosted acceptance journey and rehearsal still need recorded evidence. [P1 issue #1](https://github.com/Kolyte/claudeproject/issues/1) contains the last recorded deployment commit and Auth/database checks; it does not establish that every later main commit is deployed. GitHub enforcement still requires repository administrator verification.

Documentation reviewed on 4 November 2026 against the integrated source and GitHub records. Live task status belongs in issues; the roadmap's timed checkpoints are the original delivery plan, not a claim that work remains unstarted.

## Start here

| Document | Read it for |
|---|---|
| [Project brief](project%20brief.md) | The complete product concept, features, trust principles and long-term vision |
| [ROADMAP.md](ROADMAP.md) | Five work lanes, task IDs, dependencies, three-hour checkpoints and stretch goals |
| [CONTRIBUTING.md](CONTRIBUTING.md) | File ownership, separate checkouts, PRs and sequential integration |
| [Agent instructions](AGENTS.md) | Rules every coding agent must follow |
| [Design reference](docs/DESIGN.md) | Network Design Kit, P3 handoff and deferred website redesign |
| [Contracts](docs/CONTRACTS.md) | API, data, component and permission agreements |
| [Setup](docs/SETUP.md) | Local development, credentials, migrations and deployment |
| [Demo](docs/DEMO.md) | Fictional seed data, acceptance checklist and rehearsal script |
| [Platform handoff](docs/P1-HANDOFF.md) | Implemented integrations, remaining release work and QA evidence limits |
| [Historical QA report](ERRORS.md) | Original audit findings, superseded assumptions and merged discovery fixes |

## Agreed stack

- React + Vite + TypeScript in `frontend/`.
- Express + Node.js + TypeScript in `backend/`.
- Supabase PostgreSQL and Auth; user-scoped access and Row Level Security.
- Shared wire and generated database types in `shared/`.
- One Render Node service serving `/api` and the compiled frontend.

P1 owns dependency manifests and lockfiles. Frontend and backend retain separate npm packages; both consume the type-only `@neo/contracts` local dependency.

## Run locally

Use Node.js 24 and npm. From the repository root:

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend run dev
# In a second terminal:
npm --prefix frontend run dev
```

The checked-in `backend/.env` and `frontend/.env` contain the shared hosted demo URL and publishable key, so both packages connect to the same database immediately. Local development therefore writes to the hosted demo unless you configure a local stack. Keep local overrides uncommitted. `.env.example` files describe the variables for another environment. See [setup](docs/SETUP.md) for local Supabase, feature-test commands and production commands. Public pages render without Auth configuration; account routes show a setup notice until configured.

## Check coordination

No dependency installation is required:

```sh
node --test scripts/coordination/check-ownership.test.mjs
node scripts/coordination/check-ownership.mjs --base origin/main --branch p1/your-task
```

Replace the example branch with your assigned `p1/`–`p5/` branch. The local check includes committed changes, tracked working changes and untracked, non-ignored files since the merge base. CI validates PR files against the policy already on the base branch.

The three-hour target is a live founder → project → opportunity → contributor application → founder review journey. P0 must pass before stretch features enter the demo.

## Contact

dylanleonardleedsuk@gmail.com
