// Discovery query logic. The database query only narrows to published projects
// (RLS also enforces this); matching, ordering and pagination run here so the
// contract's case-insensitive semantics are applied identically everywhere.
//
// Scale note: this reads every published project per request. That is fine for the
// timed build and demo data (tens to hundreds of rows). If discovery grows, ask P1
// for a SQL view/function with the same semantics and keep `applyDiscovery` as the spec.
import { canonicalSkill } from './skills.ts';
import type { DiscoveryFilters, DiscoveryProjectRow, Page, ProjectSummary } from './types.ts';

/** Post types that count as substantive progress (announcements/opportunities do not). */
export const SUBSTANTIVE_POST_TYPES = new Set(['progress', 'milestone', 'roadblock']);

export const DISCOVERY_SELECT = [
  'id, title, pitch, sector, location, stage, status, visibility, owner_display_name, created_at',
  'project_needs(status, required_skills)',
  'project_posts(type, created_at)',
  'milestones(achieved_at)',
].join(', ');

const fold = (s: string) => s.trim().toLocaleLowerCase('en-GB');

function latest(dates: string[]): string | null {
  let best: string | null = null;
  let bestTime = -Infinity;
  for (const d of dates) {
    const t = Date.parse(d);
    if (Number.isFinite(t) && t > bestTime) {
      bestTime = t;
      best = d;
    }
  }
  return best;
}

export function summariseRow(row: DiscoveryProjectRow): ProjectSummary {
  const openNeeds = (row.project_needs ?? []).filter((n) => n.status === 'open');
  const seen = new Map<string, string>();
  for (const need of openNeeds) {
    for (const raw of need.required_skills ?? []) {
      // Canonical names, so "ReactJS" on a need and "React" in a search are the same skill.
      const skill = canonicalSkill(raw);
      const key = fold(skill);
      if (key && !seen.has(key)) seen.set(key, skill);
    }
  }
  const updateDates = [
    ...(row.project_posts ?? []).filter((p) => SUBSTANTIVE_POST_TYPES.has(p.type)).map((p) => p.created_at),
    ...(row.milestones ?? []).map((m) => m.achieved_at),
  ];

  return {
    id: row.id,
    title: row.title,
    pitch: row.pitch,
    sector: row.sector,
    location: row.location,
    stage: row.stage,
    status: row.status,
    ownerDisplayName: row.owner_display_name,
    requiredSkills: [...seen.values()],
    openNeedsCount: openNeeds.length,
    lastSubstantiveUpdateAt: latest(updateDates),
    createdAt: row.created_at,
  };
}

export function matchesFilters(summary: ProjectSummary, filters: DiscoveryFilters): boolean {
  if (filters.q) {
    const q = fold(filters.q);
    if (!fold(summary.title).includes(q) && !fold(summary.pitch).includes(q)) return false;
  }
  if (filters.location && fold(summary.location) !== fold(filters.location)) return false;
  if (filters.sector && fold(summary.sector) !== fold(filters.sector)) return false;
  if (filters.stage && summary.stage !== filters.stage) return false;
  if (filters.skill) {
    const skill = fold(canonicalSkill(filters.skill));
    if (!summary.requiredSkills.some((s) => fold(canonicalSkill(s)) === skill)) return false;
  }
  return true;
}

/** Newest project first, then ID ascending for stable pagination. */
export function compareSummaries(a: ProjectSummary, b: ProjectSummary): number {
  const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (diff !== 0 && Number.isFinite(diff)) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Applies the full discovery contract to rows: excludes drafts, filters (AND), sorts, paginates. */
export function applyDiscovery(rows: DiscoveryProjectRow[], filters: DiscoveryFilters): Page<ProjectSummary> {
  const matching = rows
    .filter((row) => row.visibility === 'public')
    .map(summariseRow)
    .filter((s) => matchesFilters(s, filters))
    .sort(compareSummaries);

  return {
    data: matching.slice(filters.offset, filters.offset + filters.limit),
    pagination: { limit: filters.limit, offset: filters.offset, total: matching.length },
  };
}

/**
 * Minimal structural type for the public (anon/publishable-key) Supabase client,
 * so this feature does not depend on how P1 constructs it.
 */
export interface PublicDb {
  from(table: 'projects'): {
    select(columns: string): {
      eq(column: 'visibility', value: 'public'): PromiseLike<{ data: unknown[] | null; error: unknown }>;
    };
  };
}

export class DiscoveryUnavailableError extends Error {}

export async function listDiscoveryProjects(db: PublicDb, filters: DiscoveryFilters): Promise<Page<ProjectSummary>> {
  const { data, error } = await db.from('projects').select(DISCOVERY_SELECT).eq('visibility', 'public');
  if (error || !Array.isArray(data)) throw new DiscoveryUnavailableError('Discovery query failed');
  return applyDiscovery(data as DiscoveryProjectRow[], filters);
}
