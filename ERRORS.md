# Historical QA findings and current follow-up

Findings from the local QA audit on 4 November 2026 of `p4/opportunities` at `8e4e59c` (PR #6 plus main at that time). No crashes, data leaks or security failures were observed within that audit's coverage; this is not a general security assurance.

Assigned people are the P1–P5 lanes in `coordination/ownership.json`. Where several lanes are listed, each fixes its own part. **PR #6 is now merged.** Its markers below identify the original feature source, not an outstanding merge. The approved redesign, self-hosted fonts, bridge logo and sector changes are also integrated. Preserve the current design while fixing reproduced issues.

## How to use this report now

The 18 rows below retain the original observations and suggested fixes for reproducibility; they are not 18 freshly reproduced failures on current main. Findings 1 (orange primary-button contrast), 5 (header measurements), 15 (touch-target measurements) and 17 (unloaded Inter) must be re-evaluated after the redesign. Current styling uses different button colours and self-hosted DM Sans/Space Grotesk; the orange/Inter assumptions are superseded. Do not restore older styles to reproduce them.

Source review during the documentation refresh still finds newest-first needs pagination, no role title in Application and an hours input using valueAsNumber, supporting follow-up for 3, 7 and 11 without replacing runtime reproduction. [PR #15](https://github.com/Kolyte/claudeproject/pull/15) is now merged: it fixes the discovery-card portion of 2 and the Explore heading order in 16, while retaining h3 under the landing page's section h2. Its recorded local browser result is 8/8, including a regression at 320px with maximum-length text. P2/P4 portions of 2 remain separate. Recheck all other rows on the selected release before closing or treating them as blockers. Live assignments/results belong in task issues; this file is the audit reference.

P1 separately registers this exact P4-owned documentation path in the ownership policy before this report merges. The human authorized updating documentation and merging PRs while keeping the design; no application fixes or deployment are claimed by this report.

| Priority | Count |
|---|---|
| High | 2 |
| Medium | 6 |
| Low | 10 |

## High

| # | Issue | Where | Assigned to | Suggested fix |
|---|---|---|---|---|
| 1 | Primary buttons fail contrast. White on `#d9822b` is 2.92:1; WCAG AA needs 4.5:1 at this text size. | Every `.btn-primary`, on most pages | P1 | Darken the colour in `frontend/src/index.css`, or use dark text |
| 2 | Long unbroken text breaks layouts. A 120-character title with no spaces causes horizontal scrolling at all 12 tested widths, and discovery cards cut text off with no ellipsis. | Project page and Your projects (P2); Review applications, **PR #6** (P4); discovery cards (P5) | P2, P4, P5 | Add `overflow-wrap: anywhere` and `min-width: 0`, then test at the API's maximum lengths |

## Medium

| # | Issue | Where | Assigned to | Suggested fix |
|---|---|---|---|---|
| 3 | Open roles can be hidden on later pages. With 5 open and 20 newer closed roles, page 1 showed no open roles. | `ProjectNeeds`, **PR #6** | P4 | Sort by status in the database query |
| 4 | "Sign in to apply" does not return you to the role. The URL is right, but the page stays at the top. | `ProjectNeeds`, **PR #6** | P4 | Scroll to the role after roles load |
| 5 | The signed-in header is too tall on small screens: 139px at 320–390 wide, and 28% of a 640×360 screen. | Shared app shell | P1 | Use a compact mobile menu; do not stick the header on short screens |
| 6 | Accept, Reject and Withdraw take one click with no undo. Withdrawn applications cannot be resubmitted. | Application pages, **PR #6** | P4 | Add a confirmation step |
| 7 | "Your applications" does not name the role applied for. | `GET /me/applications`, application pages | P1, P4 | P1 adds a role title to the contract, then P4 shows it |
| 8 | Page titles never change. Every route is "North East Origins" (WCAG 2.4.2). | All routes | P1 | Set a title per route |

## Low

| # | Issue | Where | Assigned to | Suggested fix |
|---|---|---|---|---|
| 9 | Raw validator text reaches users: "Too big: expected array to have <=30 items". | Opportunity form, **PR #6** | P4 | Show plain-language field messages |
| 10 | Vague validation messages. "Check the supplied fields" does not name the field. | Project form, invalid project IDs, profile | P1, P2 | Show field-level messages; treat a bad ID as not found |
| 11 | Clearing Hours per week logs a React `NaN` error. The form still blocks submission. | `NeedForm`, **PR #6** | P4 | Keep the field's value as text until submit |
| 12 | "Try again" appears on errors that cannot succeed, with no way back. | Project not found, invalid ID, owner-only pages | P1, P2, P4 | Show retry only for temporary failures, and add a link back |
| 13 | Expired sessions show the message twice with no sign-in link. Tested with a simulated 401. | Auth provider and protected pages | P1 | Send the user to sign in, keeping their destination |
| 14 | Paging keeps the scroll position, so the new list can start off screen. | Shared `Pager` | P1 | Move scroll and focus to the list on page change |
| 15 | Small touch targets. On a 390px screen, 7 of 8 login controls are under the 44px guideline. | Shared buttons and inputs | P1 | Increase mobile control heights |
| 16 | Headings skip from h1 to h3. | Explore page cards | P5 | Use h2 on cards |
| 17 | Inter is declared but never loaded, so the font differs by device. | Global styles | P1 | Load the font, or remove it from the stack |
| 18 | Loose validation. "react, React" saves as two skills, and milestones can have future dates such as 2099. | Skill lists (P4, **PR #6**); milestones (P3) | P3, P4 | Remove case-insensitive duplicates; reject future dates |

## Product decisions

- Should paused or completed projects accept applications? Current contracts and service logic allow this while the need remains open; changing it requires a product/contract decision.
- Only needs marked `open` accept applications. `reviewing`, `filled` and `closed` reject them, consistent with the current contract. A change needs a separate agreed task.

## Not covered

The audit used headless Chromium against a local stack. It did not cover Safari, Firefox, real touch devices, screen readers, hosted Supabase or a deployed site.
