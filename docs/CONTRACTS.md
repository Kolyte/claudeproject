# Integration contracts — v1

**Status:** implemented P0 integration contract, reviewed against source on 4 November 2026. The API, shared package and six-table schema exist; this document describes their agreed boundary rather than providing implementation or proof of hosted acceptance. Changes go through P1 and name affected lanes before consumers change. All times are UTC ISO-8601; IDs are UUID strings in the live application.

## Repository and composition boundaries

| Area | Owner | Location/export |
|---|---|---|
| Shared type-only package | P1 | `shared/src/index.ts`, npm name `@neo/contracts`; consumers use `import type` |
| Auth/profile | P1 | `frontend/src/features/auth/`; `backend/src/features/identity/` |
| Projects | P2 | `frontend/src/features/projects/`; `backend/src/features/projects/` |
| Activity | P3 | `frontend/src/features/activity/`; `backend/src/features/activity/` |
| Opportunities | P4 | `frontend/src/features/opportunities/`; `backend/src/features/opportunities/` |
| Discovery | P5 | `frontend/src/features/discovery/`; `backend/src/features/discovery/` |
| Shared wiring | P1 | `frontend/src/App.tsx`, `backend/src/routes.ts`, shared UI/libs |

Each backend feature exports `router` from its `index.ts`, using full API-relative paths below; identity uses `identityRouter(env)`. P1 mounts feature routers below `/api`; features do not edit the registry. Each frontend feature exposes an `index.ts` or `index.tsx` public entrypoint. Shared plumbing and feature exports are integrated. New features must expose their entrypoints before P1 adds wiring.

Frontend page exports: P1 `LoginPage`, `SignupPage`, `ProfilePage`; P2 `ProjectPage`, `NewProjectPage`, `EditProjectPage`, `MyProjectsPage`; P4 `MyApplicationsPage`, `ReviewApplicationsPage`; P5 `LandingPage`, `ExplorePage`. P1 wires `/`, `/explore`, `/login`, `/signup`, `/profile`, `/projects/new`, `/projects/:projectId`, `/projects/:projectId/edit`, `/dashboard/projects`, `/dashboard/applications`, and `/projects/:projectId/applications`. Put the literal `new` route ahead of the parameter route. Page components read route parameters through the agreed router installed by P1.

P3 exposes `ProjectActivity({ projectId, canManage })` and P4 exposes `ProjectNeeds({ projectId, canManage })`; props are `{ projectId: string; canManage: boolean }`. P2 composes these on the project page. These components fetch their own data through P1's API client and render loading/empty/error states. `canManage` controls presentation only; server and RLS permissions remain authoritative. Anonymous apply prompts sign-in and preserves the destination.

## Shared models

Wire JSON uses camelCase; database columns use snake_case and are explicitly mapped by each feature. Every writable request has a strict allowlist of fields. Server timestamps/owner IDs are never trusted from the request body.

| Export | Required shape |
|---|---|
| `Profile` | `id`, `displayName`, `bio`, `location`, `declaredSkills: string[]`, `interests: string[]`, `hoursPerWeek: number \| null`, `participationTypes: ParticipationType[]`, `workModes: WorkMode[]` |
| `Project` | `id`, `ownerId`, `ownerDisplayName`, `title`, `pitch`, `problem`, `solution`, `sector`, `location`, `stage: ProjectStage`, `status: ProjectStatus`, `visibility: Visibility`, `createdAt`, `updatedAt` |
| `ProjectPost` | `id`, `projectId`, `authorId`, `type: PostType`, `body`, `createdAt` |
| `Milestone` | `id`, `projectId`, `title`, `description`, `achievedAt`, `evidenceUrl: string \| null`, `verification: 'self_reported'`, `createdAt` |
| `Need` | `id`, `projectId`, `title`, `description`, `requiredSkills: string[]`, `desirableSkills: string[]`, `participationType`, `hoursPerWeek`, `workMode`, `location`, `compensation`, `status: NeedStatus`, `createdAt` |
| `Application` | `id`, `needId`, `applicantId`, `message`, `status: ApplicationStatus`, `createdAt`, `updatedAt` |
| `ProjectSummary` | `id`, `title`, `pitch`, `sector`, `location`, `stage`, `status`, `ownerDisplayName`, `requiredSkills: string[]`, `openNeedsCount`, `lastSubstantiveUpdateAt: string \| null`, `createdAt` |
| `DiscoveryFilters` | Optional `q`, `location`, `skill`, `sector`, `stage`; `limit`, `offset` |

Unless otherwise annotated, textual fields above are strings; `hoursPerWeek`, counts, limit and offset are numbers. IDs are strings. Profile is private, never a public project response. `ProjectSummary` flattens the union of required skills from open needs. The public founder name is a publication snapshot on the project, read from the owner's own profile by the server, rather than exposing the private profile table.

Enums:

```ts
type ProjectStage = 'idea' | 'prototype' | 'mvp' | 'launched';
type ProjectStatus = 'active' | 'paused' | 'completed';
type Visibility = 'draft' | 'public';
type ParticipationType = 'cofounder' | 'contributor' | 'task' | 'mentor';
type WorkMode = 'local' | 'remote' | 'hybrid';
type PostType = 'progress' | 'milestone' | 'roadblock' | 'opportunity' | 'announcement';
type NeedStatus = 'open' | 'reviewing' | 'filled' | 'closed';
type Compensation = 'paid' | 'voluntary' | 'equity_discussion' | 'unspecified';
type ApplicationStatus = 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
```

Shared response wrappers: `ApiResponse<T> = { data: T }`, `Page<T> = { data: T[]; pagination: { limit: number; offset: number; total: number } }`, `ApiError = { error: { code: string; message: string; fields?: Record<string, string> } }`. P1 exports all aliases and `ActivityProps` before consumers integrate. Runtime validation belongs to the feature handler; shared types alone do not validate input.

## API ownership

Authentication uses Supabase email/password directly in the client. Authenticated API requests send `Authorization: Bearer <access_token>`. P1 verifies the token through Supabase Auth and creates a per-request Supabase client with that token and the publishable/anon key. Anonymous public reads use the public client. Never use an administrative client for normal application requests.

| Lane | Method/path, relative to `/api` | Behaviour |
|---|---|---|
| P1 | `GET /health` | Public `{ data: { status: 'ok' } }`; no credentials/config returned |
| P1 | `GET /me`, `PATCH /me` | Current private profile; patch only profile fields, never identity/roles |
| P2 | `POST /projects` | Create draft owned by authenticated user; return Project and 201 |
| P2 | `GET /projects/:projectId`, `PATCH /projects/:projectId` | Public read only if published; owner may read draft and edit allowed project fields |
| P2 | `GET /me/projects` | Current owner's projects including drafts; Page<Project> |
| P3 | `GET/POST /projects/:projectId/posts` | Read visible project's posts newest first; only owner creates |
| P3 | `GET/POST /projects/:projectId/milestones` | Read visible project's milestones by achievedAt descending; only owner creates |
| P4 | `GET/POST /projects/:projectId/needs` | Read visible needs; only owner creates |
| P4 | `PATCH /needs/:needId` | Only owner edits need fields/status; no reassignment to another project |
| P4 | `POST /needs/:needId/applications` | Authenticated nonowner applies to an open need; server derives applicant ID; 201 |
| P4 | `GET /me/applications` | Applicant's own submissions; Page<Application> |
| P4 | `GET /projects/:projectId/applications` | Only project owner reviews; Page<ApplicationReview> with a minimal applicant summary (`displayName`, declared skills, hours), obtained through a narrowly scoped database function |
| P4 | `PATCH /applications/:applicationId` | Owner moves submitted/reviewing to reviewing/accepted/rejected; applicant may only withdraw submitted/reviewing; terminal states are read-only |
| P5 | `GET /discover/projects` | Public Page<ProjectSummary> with filters; separate from P2's mutation handlers |

POST/PATCH return `ApiResponse<Entity>`. All list routes use Page<T>, default limit 20, integer limit 1–50 and offset ≥0. Invalid parameters return 400. Application review's applicant summary is a separate wrapper, `ApplicationReview = Application & { applicant: { displayName: string; declaredSkills: string[]; hoursPerWeek: number | null } }`; P1 exports it and P4 returns Page<ApplicationReview>. Its SQL helper checks project ownership before returning the allowed subset; profiles are not made publicly readable.

Error codes: 400 `VALIDATION_ERROR`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 500 `INTERNAL_ERROR`, 503 `SERVICE_UNAVAILABLE`. Hidden draft resources return 404 to nonowners. Do not return database details or secrets. Closed needs and duplicate applications return 409; a unique `(need_id, applicant_id)` constraint backs duplicate handling. Withdrawing does not create a second application; reapplication is outside P0.

Discovery excludes drafts. `q` searches title/pitch case-insensitively; location, sector and stage are exact case-insensitive filters. `skill` matches at least one required skill on an open need. Combine supplied filters with AND; sort by project creation descending, then ID ascending for stable pagination. No filter means all published projects, including ideas without updates. Never use posting frequency as a quality score. Owners may pause/complete projects; public status stays visible.

Sector discovery and project writes use the fixed 38-entry list in `frontend/src/features/discovery/sectors.ts` and `backend/src/features/discovery/sectors.ts`; the discovery tests enforce list parity. `sector` remains a string on the wire. Case-insensitive exact matches are normalized to their canonical label; unknown sectors return 400. `SectorInput`, `SECTORS`, `canonicalSector` and `suggestSectors` are public discovery exports. The type-ahead suggests word-prefix matches, but submission requires a full listed label. Older projects with unlisted sectors remain stored; editing them requires choosing a listed sector. No data migration was added for this change.

Current limits: `Application` has no role title/project summary, so the applicant dashboard cannot name the role from its response alone. Only `open` needs accept applications; `reviewing`, `filled` and `closed` reject them. Project `paused`/`completed` status does not itself close an open need. Any change to these behaviours needs an agreed contract and implementation, not a documentation-only promise.

## Database and trust boundaries

P1 owns all migrations and generated database types under `supabase/`/`shared/`. Implemented tables: `profiles`, `projects`, `project_posts`, `milestones`, `project_needs`, `applications`. Migrations are `202611040001_p0_foundation.sql`, `202611040002_discovery.sql` and `202611040003_seed_record_guards.sql`; hosted application of all three is recorded in issue #1. UUID PKs, foreign keys, timestamps and enum/check constraints back the models. P0 skills/interests use text arrays; normalized taxonomy, membership administration and follows wait for their roadmap task.

- `profiles.id` references Supabase Auth's user ID. Profiles are self-readable/self-writable. Email/password remain in Supabase Auth. Use an idempotent profile bootstrap after login.
- Project `owner_id` derives from the token and stays immutable. `owner_display_name` is a public snapshot from the owner's display name. A project begins as a draft. Publishing requires title, pitch, problem, solution, sector, location and stage.
- Parent visibility applies to posts, milestones and needs. Anonymous users may read only children of public projects. Only the owner writes those records in P0; authorized-team editing is future work.
- Milestone verification is always `self_reported`; arbitrary evidence links do not confer verification. Store evidence as a validated http/https URL, never fetch or execute it during creation.
- Application rows are readable only by the applicant and relevant project owner. Server-derived IDs and RLS `WITH CHECK` prevent applicant/need reassignment. Only the documented status transitions are allowed.
- P1 supplies a restricted review-summary SQL function to reveal only the applicant subset to the owning founder, checking `auth.uid()` and project relationship inside the function. Deny anonymous invocation; fix its search path; do not expose arbitrary profiles.
- The implemented helper is `application_review_summary(application_id uuid)`, called by P4's Supabase repository. Its result contains only `displayName`, `declaredSkills` and `hoursPerWeek`.
- Accepting an application records the decision; it does not grant project edit rights or promise equity. Filled/closed needs stop new applications while retaining existing submissions.

P1 implements these restrictions in database policies/functions as well as Express validation. Use field-specific mutation allowlists and constrain ownership on both old and new rows. P5 tests requests as anonymous, owner, applicant and unrelated account. No service-role bypass in application endpoints.

## Minimum validation and UI behaviour

Trim user strings. Title/display name ≤120 characters; pitch ≤300; long text ≤5,000; location/sector ≤120; each skill/interest ≤60, at most 30 unique entries per array; hours are integers 1–80, or null for an unknown profile value. Required text cannot be blank; profile bio may be empty. Reject unknown enum values and invalid IDs. Use parameterized Supabase queries and escape UI text; no raw HTML from posts.

Show the date of the latest progress, milestone or roadblock; announcements/opportunity posts do not count as substantive progress. Expose the date before the optional S-02 label. Projects with no such history display “No progress update yet.” A new idea is not marked dormant for lacking history. Private drafts are excluded from discovery; public indexing remains disabled for the hackathon preview until a launch decision.

Discovery computes this date from substantive post `createdAt` values and standalone milestone `achievedAt` values. It currently reads published project rows and their related needs/history before filtering and pagination in the API; this is suitable for demo scale, not an indexed search service. S-02 labels are not wired into the active app. The legacy activity helper's thresholds are not this contract.

## Existing fixtures

`frontend/src/data/mockData.ts` is an existing P5-owned development fixture. Its string slugs, roleType and display-stage values are legacy demo data, not the API contract. P5 maps them to the live schema/UUIDs in the seed process and labels all examples fictional. Do not make the whole application depend on those old fixture interfaces or remove another person's work to change the contract.
