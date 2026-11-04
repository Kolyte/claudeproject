// Development-only discovery source built from the fictional fixture in
// src/data/mockData.ts. Enabled only by VITE_DISCOVERY_SOURCE=fixtures and always
// shown with a "fictional fixture data" banner; it is never the live demo source.
// Matching mirrors backend/src/features/discovery/service.ts.
import type { Project as LegacyProject } from '../../../types';
import type { DiscoveryFilters, Page, ProjectStage, ProjectSummary } from './types.ts';

const STAGE_MAP: Record<string, ProjectStage> = {
  idea: 'idea',
  prototype: 'prototype',
  mvp: 'mvp',
  'early users': 'launched',
  'active beta': 'mvp',
};

const SUBSTANTIVE = new Set(['Progress update', 'Milestone', 'Roadblock']);
const fold = (s: string) => s.trim().toLocaleLowerCase('en-GB');

/** Legacy fixture project -> contract ProjectSummary. `id` keeps the legacy slug for fixture routing. */
export function legacyToSummary(p: LegacyProject): ProjectSummary {
  const open = p.needs.filter((n) => n.status === 'Open');
  const skills = new Map<string, string>();
  for (const n of open) for (const s of n.requiredSkills) if (!skills.has(fold(s))) skills.set(fold(s), s);
  const dates = [
    ...p.posts.filter((post) => SUBSTANTIVE.has(post.type)).map((post) => post.date),
    ...p.milestones.map((m) => m.date),
  ].sort();

  return {
    id: p.slug,
    title: p.title,
    pitch: p.tagline,
    sector: p.sector,
    location: p.location,
    stage: STAGE_MAP[fold(p.stage)] ?? 'idea',
    status: p.status.toLowerCase() as ProjectSummary['status'],
    ownerDisplayName: p.team[0]?.person.name ?? 'Unknown founder',
    requiredSkills: [...skills.values()],
    openNeedsCount: open.length,
    lastSubstantiveUpdateAt: dates.length ? dates[dates.length - 1] : null,
    createdAt: p.createdAt,
  };
}

export function queryFixtureSummaries(all: ProjectSummary[], f: DiscoveryFilters): Page<ProjectSummary> {
  const limit = f.limit ?? 20;
  const offset = f.offset ?? 0;
  const matching = all
    .filter((s) => {
      if (f.q && !fold(s.title).includes(fold(f.q)) && !fold(s.pitch).includes(fold(f.q))) return false;
      if (f.location && fold(s.location) !== fold(f.location)) return false;
      if (f.sector && fold(s.sector) !== fold(f.sector)) return false;
      if (f.stage && s.stage !== f.stage) return false;
      if (f.skill && !s.requiredSkills.some((k) => fold(k) === fold(f.skill!))) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { data: matching.slice(offset, offset + limit), pagination: { limit, offset, total: matching.length } };
}
