// Public entrypoint for the P5 discovery feature (docs/CONTRACTS.md).
// P1 wires `/` -> LandingPage and `/explore` -> ExplorePage in the app shell.
export { default as LandingPage } from './LandingPage.tsx';
export { default as ExplorePage } from './ExplorePage.tsx';
export { default as SectorInput } from './SectorInput.tsx';
export { SECTORS, canonicalSector, suggestSectors, type Sector } from './sectors.ts';
