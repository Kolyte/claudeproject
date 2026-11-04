# North East Origins

Discover what the North East is building. Find a project worth joining, or the people who can help build yours.

North East Origins is a project-first collaboration platform for North East England. This repository contains an initial React/Vite starter, fictional project fixtures, the full product brief, and a coordination pack for five people building with coding agents.

**Current status:** planning and frontend starter. Authentication, the Express API, Supabase schema and deployment are still to be built. The coordination check is implemented; its GitHub enforcement requires repository settings.

## Start here

| Document | Read it for |
|---|---|
| [Project brief](project%20brief.md) | The complete product concept, features, trust principles and long-term vision |
| [ROADMAP.md](ROADMAP.md) | Five work lanes, task IDs, dependencies, three-hour checkpoints and stretch goals |
| [CONTRIBUTING.md](CONTRIBUTING.md) | File ownership, separate checkouts, PRs and sequential integration |
| [Agent instructions](AGENTS.md) | Rules every coding agent must follow |
| [Design reference](docs/DESIGN.md) | Network Design Kit, P3 handoff and deferred website redesign |
| [Contracts](docs/CONTRACTS.md) | API, data, component and permission agreements |
| [Setup](docs/SETUP.md) | What runs now, planned backend setup, credentials and deployment |
| [Demo](docs/DEMO.md) | Fictional seed data, acceptance checklist and rehearsal script |

## Agreed stack

- React + Vite + TypeScript in `frontend/`.
- Express + Node.js + TypeScript in the planned `backend/`.
- Supabase PostgreSQL and Auth; user-scoped access and Row Level Security.
- Shared types in the planned `shared/` directory.
- One Render Node service serving `/api` and the compiled frontend.

Keep the existing frontend in place. P1 owns dependency manifests and lockfiles, including the existing frontend lockfile. The coordination pack adds no application dependencies or workspace migration.

## Run the existing starter

Use Node.js 24 and npm. From the repository root:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

These commands currently launch the Vite starter, not a completed North East Origins application. See [setup](docs/SETUP.md) for the planned application commands.

## Check coordination

No dependency installation is required:

```sh
node --test scripts/coordination/check-ownership.test.mjs
node scripts/coordination/check-ownership.mjs --base origin/main --branch p1/your-task
```

Replace the example branch with your assigned `p1/`–`p5/` branch. The local check includes committed changes, tracked working changes and untracked, non-ignored files since the merge base. CI validates PR files against the policy already on the base branch.

The three-hour target is a live founder → project → opportunity → contributor application → founder review journey. P0 must pass before stretch features enter the demo.
