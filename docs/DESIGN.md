# Design reference and P3 handoff

The [Network Design Kit](network-design-kit/index.html) is the saved visual reference for a future North East Origins design pass. Download the repository and open that HTML file in a browser to view the complete offline guide.

## Current scope

Archive the kit and document its intended use only. Do not redesign the website, import its CSS into the frontend, replace application components or change deployment settings. Website implementation waits for the human to confirm readiness and explicitly start that work.

North East Origins keeps its product name, project brief, functionality and documented API contracts. Fieldwork, the fictional product in the kit, illustrates the visual language; it is not a replacement product or a source of live data. The kit's implementation suggestions apply only when a future design task is authorized.

## Supplied logo

![Built in the North: white bridge with purple accents and the tagline Projects, People, Progress](network-design-kit/assets/built-in-the-north-bridge-logo.png)

The human supplied this "Built in the North" bridge logo for the design reference. The original PNG is saved unchanged alongside the kit and displayed in the offline visual guide. Adding it here does not authorize a product rename or website implementation; placement and adaptation belong to a future approved design task.

## Kit contents

| File | Purpose |
|---|---|
| [index.html](network-design-kit/index.html) | Offline visual design guide |
| [DESIGN-SPEC.txt](network-design-kit/DESIGN-SPEC.txt) | Detailed principles, components, accessibility and responsive guidance |
| [tokens.css](network-design-kit/tokens.css) | Portable palette, typography, spacing and motion tokens |
| [guide.css](network-design-kit/guide.css) | Styles for the reference guide |
| [START-HERE.txt](network-design-kit/START-HERE.txt) | Original usage instructions, provenance and rights |
| `network-design-kit/assets/fonts/` | Self-hosted fonts with original license notices |

The original supplied kit files are preserved as received from `C:\Users\bill\Desktop\Network Design Kit` on 4 November 2026. Keep its font licenses with redistributed font files.

## Task-specific ownership handoff

On 4 November 2026, the human explicitly assigned this documentation task to P3 and authorized pushing it to main. This overrides the usual P1 ownership only for `README.md`, this document and `docs/network-design-kit/` for this import. Work is prepared on `p3/network-design-docs` in a separate checkout. No GitHub task issue was supplied. General repository ownership remains unchanged.

A future redesign still needs an explicit task and disjoint file assignments under the repository's ownership rules. P3's documentation assignment does not grant ownership of shared application files or other lanes' components.

The human subsequently authorized adding the supplied bridge logo to this design documentation and pushing the update to main, within the same P3 documentation handoff.

## Website redesign authorization

On 4 November 2026, the human explicitly requested implementation of this kit on a new redesign branch. Work is isolated in `../NorthEastOrigins-redesign` on `p1/redesign`. The repeated instruction to complete the redesign authorizes frontend presentation changes across lane boundaries for this task. No task issue was supplied. The earlier documentation-only restriction above is superseded for this implementation. Backend contracts, persistence, production settings and dependencies remain unchanged.

### Implementation verification

The redesign applies the kit palette, self-hosted licensed fonts, paper surfaces, category stripes, square controls, visible focus and reduced-motion treatment across the existing frontend. The landing page adds a responsive editorial hero and invitation panel. Existing routes, API calls, forms and authentication logic are retained.

Validation: frontend production build passes; lint completes with the two existing Fast Refresh warnings. All 23 ownership-unit, discovery and public-route tests pass. Headless Edge checks cover 1440px desktop, 390px mobile, 844px short landscape, search URL navigation, keyboard skip link, and discovery cards at 200% text size without horizontal overflow. Visual QA uses intercepted, explicitly fictional discovery data and does not establish hosted data or authenticated journey acceptance. The build still reports a JavaScript chunk over 500 kB.

The ownership CLI passes all changed paths except P5's `LandingPage.tsx`, covered by this task's human-authorized frontend handoff. The policy itself is unchanged. No deployment, push, migration or dependency installation was performed.
