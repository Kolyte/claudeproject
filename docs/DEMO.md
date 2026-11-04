# Demo and acceptance handoff

**Owner: P5. Status: not run.** Record actual results in the task/release issue, not by several people editing this file concurrently. The final demo uses Supabase; the existing fixture module alone does not satisfy P0.

## Fictional examples

Preserve/adapt the existing TyneFlow AI and Vanguard Patient Portal fixtures. They are fictional demo projects, with no asserted real users, NHS affiliation, measured traction or independently verified milestones. Mark the seed dataset and presentation clearly as fictional. Translate legacy slugs/stage labels to the canonical schema; use stable demo UUIDs so the seed can be rerun safely.

Prepare a confirmed founder, contributor and unrelated test account. The founder owns seeded projects; contributor has declared React/TypeScript skills and an appropriate availability value. Store passwords privately. Use no real personal histories, private repositories or uploaded CVs.

The seed must upsert only the dedicated tagged demo records, validate its account IDs and avoid deleting any unrelated data. Prepare the visible timeline, at least one open need and one already closed need. All milestones say “Founder reported” or “Self-reported.”

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

## Release record

In the release issue, record: deployed URL, commit SHA, test result summary, owner/applicant checks, completed stretch IDs, known limitations and the three-minute rehearsal result. P1 confirms hosting health and migration versions. At minute 160, stop adding features and focus on release blockers.
