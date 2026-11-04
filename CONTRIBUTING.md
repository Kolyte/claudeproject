# Working together

Read [ROADMAP.md](ROADMAP.md), [contracts](docs/CONTRACTS.md) and [ownership.json](coordination/ownership.json) before starting. P1–P5 are accountable humans, each supervising their own agents. Assign actual names in the kickoff issue; the policy uses lane IDs rather than invented GitHub handles.

## Separate checkouts and explicit ownership

Use your own clone or worktree. Never let two people or agents write in the same checkout.

```sh
git fetch origin
git worktree add ../neo-p2 -b p2/projects origin/main
```

Replace P2 with your lane. A separate clone is equally valid. Use one active implementation branch and one open PR per person. If you run multiple agents, assign disjoint files inside your lane; do not give them competing versions of the same task. Confirm their branch and working directory first.

P1 owns shared infrastructure and database migrations. P2 owns projects; P3 activity; P4 opportunities; P5 discovery, fixtures and end-to-end verification. The machine policy is authoritative for paths. Exact file rules override directory rules; otherwise the longest matching prefix wins. An unassigned path fails closed. Dependency manifests/lockfiles in assigned directories are always P1-owned.

Keep CSS inside feature directories (CSS modules or a lane-specific class prefix). Shared styles and the root app shell belong to P1. P2 composes P3/P4's public components through their documented exports. Features may consume shared contracts and libraries but must not reach into another feature's private implementation.

## Claim work without creating a shared lock file

1. Open the **Work item** issue template. Record task ID, lane, allowed paths, dependencies, acceptance and intended handoff recipient.
2. Assign the human responsible using GitHub's assignee field. Add a comment naming any agents' disjoint subareas.
3. Post status and blockers in that issue. Use GitHub's close/reopen state and issue comments as the live record; do not make status-only commits to ROADMAP.md.
4. Before touching a shared file, request a change from its owner in the issue. State the interface/field needed and who is waiting. The owner makes a separate small PR.
5. Continue independent work while blocked. If a lane handoff is needed, both humans acknowledge it in the issue and use the destination lane's branch prefix/checkouts. Only one writer remains responsible for each file.

No shared lease/lock file is used. Lane ownership prevents ordinary overlap, and the integration captain serializes merges. Branch prefixes express cooperative lane identity; they do not authenticate a human or give an agent merge permission.

## Validate and open a PR

```sh
git fetch origin
node --test scripts/coordination/check-ownership.test.mjs
node scripts/coordination/check-ownership.mjs --base origin/main
```

The local check includes all tracked changes from the merge base plus non-ignored untracked files. Run applicable feature checks and both package builds/lints using [setup](docs/SETUP.md#local-stack-and-validation-coverage). These commands now exist. The default backend tests cover only `src/lib/`, so explicitly run opportunities, discovery/sector and fixture tests when relevant. Do not count skipped environment-dependent suites as passes or local tests as hosted acceptance.

Use the PR template. Link the issue; give a concrete before/after result, interface changes and verification. Keep each PR focused and buildable. Use a draft while incomplete. CI checks PR file paths using the checker and policy from the base branch, including both paths of renames and deleted files. Overlap warnings list other open PRs to inspect; warnings are advisory snapshots and can become stale.

Unknown paths require P1 to register ownership in a separate policy PR first. A policy change does not grant its own PR new permissions: CI still uses the previous base policy. P1 may add lane paths but must preserve the five-lane structure. Feature lanes do not change policy, contracts or workflow files.

## Review and sequential integration

- P5 is the integration captain. Do not enable auto-merge during the timed build.
- P5 reviews P1–P4; P1 reviews P5. Another available person may review to avoid a queue. Authors never approve their own PR.
- Immediately before each merge, inspect other open PRs for overlapping paths, fetch/rebase onto latest main, resolve conflicts in the responsible lane and rerun checks. Merge one PR at a time, then repeat for the next.
- Require another person's approval, `coordination / ownership`, and resolved conversations. Configure strict up-to-date required checks as described in [setup](docs/SETUP.md#github-enforcement).
- If a shared interface changes, P1 updates contracts first and names affected lanes in the issue. Update consumers before integrating the dependent change.
- P5 coordinates release; humans retain responsibility for approvals, deployment and merges. Agents do not push to main, merge or deploy unless explicitly instructed by their human.

The coordination package was the initial bootstrap commit. It is integrated; use the PR process for subsequent work. Files alone cannot enable branch protection; the repository administrator must verify/activate it. The approved frontend redesign and bridge logo are part of the integration baseline: feature merges must retain them.

## Dependencies, migrations and deployment

P1 installs dependencies, updates manifests/locks and owns `supabase/`. Keep the existing frontend lockfile; a backend lockfile is created with its scaffold. Do not introduce nested packages or a workspace conversion during the timed build. Request dependencies from P1 rather than independently running install in a feature branch.

Feature owners describe required schema changes to P1. P1 writes append-only, ordered migrations, applies them serially and records application status in the issue. Never edit a migration already applied to the shared database. Only P1 applies migrations or changes hosting/secrets; everyone uses the same agreed database contract.

P5 owns fixture data and the demo seed script. Seeding uses dedicated fictional records/accounts and must not erase real data. P1 reviews any administrative credential use. Keep secrets in local environment files/provider settings, never fixtures, logs or PR descriptions.
