# North East Origins

> **Discover what the North East is building. Find a project worth joining, or the people who can help build yours.**

**Status:** Original product vision with implemented P0 core. Reviewed on 4 November 2026: Auth/profile, projects, activity/milestones, opportunities/applications and discovery are integrated, including the approved frontend redesign. Full hosted acceptance/rehearsal still need recorded evidence. GitHub import, AI extraction, matching, following and investor features below describe future scope. See [roadmap](ROADMAP.md), [contracts](docs/CONTRACTS.md) and [demo guide](docs/DEMO.md) for the current delivery boundary.

**Region:** North East England

**Website name:** North East Origins

## 1. Executive Summary

North East Origins is a **project-first collaboration platform** for aspiring founders, developers, designers, business students, professionals and, eventually, investors across North East England.

Instead of matching people solely by profile, it matches **people to projects and specific project needs**.

Every project receives a public social page with its pitch, team, progress updates, milestones, open opportunities and activity history. Users can discover which projects are genuinely progressing rather than merely listed.

Contributors can connect GitHub and provide professional experience to receive **AI-assisted, evidence-backed recommendations** for projects needing their skills.

Investor discovery is a stretch goal: relevant investors can follow projects, inspect founder-reported progress and identify teams aligned with their interests.

## 2. Problem

- Aspiring founders may hesitate to pitch ideas to friends or classmates and struggle to meet equally motivated collaborators.
- People in the same course or social circle often have overlapping rather than complementary skills.
- Existing networking tools emphasise individual profiles over the projects people are actually building.
- Project directories can become stale; a listing alone says little about current activity or commitment.
- Contributors cannot easily identify where their particular skills would make an immediate difference.
- Early-stage teams lack a persistent, accessible public history that potential collaborators and investors can inspect.

**Hypothesis:** A regional, project-first community with visible progress and explainable skills matching will make it easier to form multidisciplinary teams and sustain collaboration.

This hypothesis requires validation; regional cultural differences and market demand should not be assumed as established facts.

## 3. Audience and Scope

**Launch geography:** North East England, initially focusing on Newcastle, Durham, Sunderland and Teesside, without excluding other parts of the region.

### Primary Users

1. **Project owners / founders:** Publish projects, updates and opportunities; review applicants.
2. **Contributors:** Discover projects, follow progress and apply for roles or smaller tasks.
3. **Community followers:** Follow and discuss projects without committing to join.

**Stretch audience:** Mentors and investors who discover and follow relevant projects.

University students are an initial acquisition channel, **not an eligibility requirement**. Graduates and local professionals are important for cross-disciplinary matching.

## 4. Product Principles

1. **Projects first:** The project, not the founder's profile, is the main discovery unit.
2. **Progress over promises:** Show dated, substantive updates and milestones, without claiming that posting proves success.
3. **Specific needs:** Match people to clearly defined roles, tasks and gaps.
4. **Explainability:** Every AI recommendation cites the evidence and requirement behind it.
5. **Local collaboration:** Prioritise meaningful North East connections while allowing remote participation.
6. **Public by choice:** Project pitches and published updates are public; private drafts and personal data remain private.
7. **Low-friction participation:** People may follow, advise, contribute briefly or join a founding team.

## 5. Core User Journeys

### A. Founder Creates a Project

1. Register and create a founder profile.
2. Publish a project name, summary, problem, proposed solution, category, location and current stage.
3. Add team members and open needs (e.g. "React developer, 5 hours/week").
4. Publish dated progress updates, milestones, roadblocks and recruitment posts.
5. Receive applications, review profiles and contact candidates.

### B. Contributor Discovers a Project

1. Register, specify location, interests, availability and desired participation.
2. Connect GitHub (optional) and provide professional experience manually or via a user-uploaded document.
3. Review extracted skills and correct inaccurate inferences.
4. See recommended projects and explanations of each match.
5. Inspect a project's public history, follow it or apply to a specific need.

### C. Investor Discovery (Stretch)

1. Specify preferred sectors, stage, geography, cheque range and expertise.
2. Browse projects ranked for **relevance**, not predicted returns.
3. Inspect updates, team backgrounds and founder-reported milestones.
4. Follow projects or request an introduction; no investment transaction in the MVP.

## 6. Main Features

### 6.1 Project Discovery

Search and filter by:

- Location
- Sector
- Project stage
- Skills needed
- Activity recency
- Commitment required

Separate **New Ideas** from **Active Projects** so new projects are not penalised for lacking history.

### 6.2 Public Project Page

Each project gets a shareable URL and includes:

- Title, pitch, cover image, sector, region and stage.
- Founder/team profiles and relevant links.
- Public chronological feed of updates and discussions.
- Milestones, with dates and optional supporting evidence.
- Open opportunities with required skills, time commitment and compensation/equity expectations.
- Follow and apply actions.
- Last substantive update date.
- Clear distinction between self-reported claims and independently verified evidence.

**Post types:**

- Progress update
- Milestone
- Roadblock
- Opportunity
- General announcement

### 6.3 Project Activity

Display:

- Last substantive update
- Milestone history
- Activity label: Recently Active / Quiet / Dormant
- Project status: Active / Paused / Completed

Never equate update frequency with project quality or commercial traction.

Project owners should be able to mark projects paused or completed.

Avoid presenting self-reported milestones as verified facts.

### 6.4 Project Needs

A structured opportunity attached to a project:

- Title and description
- Required and desirable skills
- Work type: cofounder, ongoing contributor, short task, mentor
- Hours per week
- Location and remote preferences
- Project stage and expectations
- Compensation: paid, voluntary, equity-discussion or unspecified
- Status: open, reviewing, filled, closed

Avoid implying equity is guaranteed.

### 6.5 AI-Assisted Contributor Matching

**Inputs:**

- User-approved public GitHub repository metadata
- README content
- Supplied professional experience
- Declared skills
- Interests
- Availability
- Location preferences

**Pipeline:**

1. Retrieve a bounded set of relevant GitHub repositories and metadata with user consent.
2. Extract potential skills, domains and evidence from READMEs and contribution metadata.
3. Distinguish demonstrated contribution from mere ownership, forks or technology mentions.
4. Let the user inspect and edit the resulting structured profile.
5. Match that profile against explicit project needs using transparent deterministic scoring.
6. Generate concise explanations referencing evidence and gaps.

**Example explanation:**

"Recommended because this project needs Python API integration and your repository shows an implemented FastAPI service. Availability also matches. No evidence found for the preferred AWS experience."

**Important:** README text is untrusted input. Do not execute repository code or obey instructions embedded in README files. A README alone cannot establish proficiency.

**LinkedIn constraint:** Do not assume unrestricted access to full LinkedIn profile data via OAuth/API. For the MVP, accept manually entered experience or a user-supplied profile export/PDF, with consent and appropriate retention controls.

### 6.6 Following and Engagement

Users can follow projects and receive updates about milestones or new needs.

Following does not imply membership.

Comments are optional for the MVP and require reporting/moderation controls.

### 6.7 Investor Discovery (Stretch)

Rank projects by:

- Sector
- Stage
- Geography
- Investment preferences
- Investor expertise
- Clearly labelled activity signals

Let investors view a project's history and request contact.

Do not present an AI "investment quality" score, expected return or verified traction without supporting evidence.

## 7. MVP Priorities

| Feature | Priority | Acceptance Criterion |
|---|---|---|
| Authentication and user profiles | P0 | User can register, edit skills and preferences |
| Create/edit project | P0 | Owner can publish a project with a public URL |
| Project feed | P0 | Owner can post dated updates and milestones |
| Project needs | P0 | Owner can open and close a specific opportunity |
| Explore/filter projects | P0 | User can find projects by skills and location |
| Apply to join | P0 | Contributor can apply to a need; owner can review |
| GitHub import | P1 | User can select public repositories for analysis |
| AI skill extraction | P1 | Structured skills with linked evidence and user correction |
| Explainable recommendations | P1 | Projects are ranked with understandable reasons |
| Follow projects | P1 | User can save projects and see their updates |
| LinkedIn experience import | P2 | User-uploaded experience can be parsed with consent |
| Investor discovery | Stretch | Investor preferences produce relevant project listings |
| GitHub activity verification | Future | Optional signals displayed separately from self-reports |

**Scope rule:** Finish the P0 end-to-end workflow before adding AI polish or investor features.

The three-hour delivery plan and named work lanes are defined in [ROADMAP.md](ROADMAP.md). This brief retains the broader product vision; the roadmap decides what enters the demo.

## 8. Suggested Technical Architecture

The implemented P0 uses React/Vite/TypeScript, Express/Node 24, Supabase Auth/PostgreSQL/RLS and one Render service. Storage, GitHub/AI processing, normalized skill tables, membership, follows and investor entities below are future architecture, not current endpoints or tables. Actual P0 tables and substring discovery semantics are in the contracts; no full-text search service is implemented.

- **Frontend:** React + Vite + TypeScript; feature-scoped CSS and shared UI styles.
- **API:** Express running on Node.js with TypeScript.
- **Backend/database:** Supabase (PostgreSQL, Auth, Storage, Row Level Security).
- **GitHub:** GitHub OAuth/API or user-authorised public repository selection; request minimal scopes.
- **AI:** LLM structured extraction into a validated schema, followed by deterministic ranking.
- **Search:** PostgreSQL full-text search initially; embeddings only if useful and measurable.
- **Hosting:** One Render Node service serving the Express API and compiled React frontend, plus Supabase.

### Core Entities

- `users`: Identity, location, profile and preferences.
- `skills`: Normalised skill taxonomy.
- `user_skills`: Declared/inferred skill, source, confidence and evidence pointer.
- `projects`: Owner, title, pitch, sector, location, stage, visibility and status.
- `project_members`: User, project, role and membership status.
- `project_posts`: Project, author, post type, body and timestamp.
- `milestones`: Project, description, date, evidence URL and verification state.
- `project_needs`: Required skills, role, availability, work type and status.
- `applications`: Applicant, need, message, status and timestamps.
- `follows`: User, project and timestamp.
- `github_sources`: User-authorised repository references and analysis timestamps.
- `investor_preferences` (stretch): Sector, stage, region, cheque range and expertise.

Enforce permissions on the server/database: only project owners or authorised members may edit projects; only intended recipients can view private applications.

## 9. Matching Logic

Use eligibility filters first:

- Open opportunity
- Acceptable work mode
- Availability constraints
- Participation type

Then score remaining opportunities with a configurable weighted model.

### Illustrative Weights

| Dimension | Weight |
|---|---:|
| Required skill coverage | 40% |
| Interest / domain alignment | 20% |
| Availability compatibility | 20% |
| Location / work-mode fit | 10% |
| Desired participation type | 10% |

Avoid using project posting frequency to infer candidate compatibility.

Display the match as a **heuristic fit score**, not a success probability.

Explain which evidence contributed to each dimension, flag uncertainty and allow profile corrections.

## 10. Privacy, Trust and Security

- Explicit consent before GitHub analysis or processing uploaded work history.
- Only process authorised/public repositories; do not collect private code by default.
- Minimise stored source text and personal data; document retention and deletion.
- Treat external README/profile text as untrusted, including prompt-injection attempts.
- Validate LLM output against a strict schema; never execute model-generated commands.
- Avoid unsupported claims about individual proficiency, employment or project traction.
- Support profile correction, account deletion, blocking and reporting.
- Apply rate limits, upload size/type checks, secure secrets handling and Supabase RLS.
- Clearly label founder-reported milestones and potential conflicts of interest.
- Consider UK GDPR obligations and appropriate notices/consent for personal-data processing.
- No financial transactions or regulated investment advice in the hackathon MVP.

## 11. Demo Script (3–5 Minutes)

This is the original broader-vision script. The executable P0 rehearsal is [docs/DEMO.md](docs/DEMO.md): founder publication/progress/need → contributor discovery/application → founder review → refresh. GitHub extraction, recommendations, following and investor views must not be presented as delivered features unless their ordered stretch tasks have separately passed acceptance.

1. **Problem (20s):** A North East student has an idea but cannot find complementary skills; existing project listings give no indication of progress.
2. **Founder (50s):** Create a project, publish its page, add a milestone and open a specific need.
3. **Contributor (60s):** Connect a demo GitHub account, inspect extracted skills and receive explainable matches.
4. **Discovery (50s):** Open the recommended project's timeline, inspect updates and apply for its open need.
5. **Community (30s):** Follow the project and see subsequent updates.
6. **Stretch (30s):** Show investor filtering and the same project's history from an investor's perspective.

Use seeded, clearly fictional records persisted in Supabase. The final P0 demo still exercises the live API and database; fixtures must not silently replace them.

## 12. Suggested Hackathon Build Sequence

**Phase 1 — Foundation:** Schema, authentication, profile, project creation and public project pages.

**Phase 2 — Collaboration:** Posts, milestones, needs, search and applications.

**Phase 3 — Matching:** GitHub ingestion, structured extraction, deterministic ranking and explanations.

**Phase 4 — Polish:** Follow flow, activity labels, responsive UI, seeded examples and demo rehearsal.

**Stretch only after core demo works:** Investor preferences, investor project recommendations and contact requests.

## 13. Validation and Success Metrics

### During Hackathon

- Complete end-to-end demo
- Recommendation explanation quality
- Time to publish a project
- Ability to apply for a need

### After Launch

- Percentage of projects publishing a second substantive update
- Applications per open need
- Qualified conversations
- Accepted collaborators
- Projects still active after 30/90 days
- Contributor return rate

### Initial Research

Interview North East students, founders, societies and professionals to test whether discovery, trust or motivation is the actual bottleneck.

Compare against existing cofounder matching and startup-community platforms.

## 14. Main Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Too few projects/contributors (cold start) | Launch through a few local university societies and hackathons |
| Abandoned projects dominate discovery | Separate New Ideas from Active Projects; show dated activity |
| AI overstates skills | Evidence links, user correction, deterministic matching and uncertainty labels |
| LinkedIn API limitations | Manual experience input or consented document upload |
| Founders reluctant to disclose ideas | Require a useful public pitch, not proprietary details |
| Vanity activity mistaken for traction | Separate posts, milestones and independently verified evidence |
| Excessive MVP scope | Deliver P0 workflow before AI and investor stretch |

## 15. One-Line Pitch

**North East Origins helps people across North East England discover real projects, see who's making progress and find the collaborators needed to build what's next.**

## 16. Open Decisions

- Domain for North East Origins.
- Whether to start with university communities only or recruit local professionals immediately.
- Public indexing after launch; the current hackathon preview sends `noindex, nofollow`.
- Post-P0 contact/messaging policy; P0 supports application messages and status review, not chat or contact requests.
- Post-P0 activity-label calibration; the current contract counts progress/milestone/roadblock posts and standalone milestones, with S-02 thresholds defined in the roadmap but not integrated.
- Which specific hackathon judging criteria and sponsor APIs should shape the demo.
