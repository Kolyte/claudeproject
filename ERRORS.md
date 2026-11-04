# Known errors

Findings from the QA audit on 4 November 2026 of `p4/opportunities` at `8e4e59c` (PR #6 plus main at that time). The audit found no crashes, data leaks or security failures.

Assigned people are the P1–P5 lanes in `coordination/ownership.json`. Where several lanes are listed, each fixes its own part. Issues marked **PR #6** are in code that is only on `p4/opportunities` until that PR merges.

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

## Open questions

- Should paused or completed projects accept applications? A completed project accepted one in testing, and the contract does not forbid it.
- Should roles marked "reviewing" accept applications? They currently do not.

## Not covered

The audit used headless Chromium against a local stack. It did not cover Safari, Firefox, real touch devices, screen readers, hosted Supabase or a deployed site.
