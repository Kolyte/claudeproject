// Pure helpers for discovery filters <-> URL query strings. No React imports.
import type { DiscoveryFilters, ProjectStage } from './types.ts';

export const STAGES: { value: ProjectStage; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'mvp', label: 'MVP' },
  { value: 'launched', label: 'Launched' },
];

export const NORTH_EAST_LOCATIONS = [
  'Newcastle',
  'Gateshead',
  'Sunderland',
  'Durham',
  'Teesside',
  'Northumberland',
] as const;

export const FILTER_KEYS = ['q', 'location', 'skill', 'sector', 'stage'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type SearchFilters = Pick<DiscoveryFilters, FilterKey>;

const isStage = (v: string): v is ProjectStage => STAGES.some((s) => s.value === v);

export function stageLabel(stage: ProjectStage): string {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

/** Reads filters from URL search params, dropping blank or unknown values. */
export function filtersFromParams(params: URLSearchParams): SearchFilters {
  const out: SearchFilters = {};
  for (const key of FILTER_KEYS) {
    const raw = params.get(key)?.trim();
    if (!raw) continue;
    if (key === 'stage') {
      const lower = raw.toLowerCase();
      if (isStage(lower)) out.stage = lower;
    } else {
      out[key] = raw;
    }
  }
  return out;
}

/** Serialises filters (plus optional paging) in a stable key order. */
export function toQueryString(filters: DiscoveryFilters): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key]?.trim();
    if (value) params.set(key, value);
  }
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  return params.toString();
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return FILTER_KEYS.some((k) => Boolean(filters[k]));
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatUpdate(iso: string | null): string {
  if (!iso) return 'No progress update yet';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'No progress update yet' : `Last progress ${dateFormat.format(d)}`;
}
