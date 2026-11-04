// Validation of GET /api/discover/projects query parameters (docs/CONTRACTS.md).
// Pure and dependency-free so it can be unit-tested with `node --test`.
import type { DiscoveryFilters, ProjectStage } from './types.ts';

const STAGES: readonly string[] = ['idea', 'prototype', 'mvp', 'launched'];
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;

const TEXT_LIMITS = { q: 120, location: 120, sector: 120, skill: 60 } as const;

export type FilterResult =
  | { ok: true; filters: DiscoveryFilters }
  | { ok: false; fields: Record<string, string> };

type RawQuery = Record<string, unknown>;

/** Parses an Express-style `req.query`. Unknown keys are ignored; malformed known keys are rejected. */
export function parseDiscoveryFilters(query: RawQuery): FilterResult {
  const fields: Record<string, string> = {};
  const filters: DiscoveryFilters = { limit: DEFAULT_LIMIT, offset: 0 };

  const single = (key: string): string | undefined => {
    const value = query[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
      fields[key] = 'Provide this parameter once, as text.';
      return undefined;
    }
    return value.trim();
  };

  for (const key of Object.keys(TEXT_LIMITS) as (keyof typeof TEXT_LIMITS)[]) {
    const value = single(key);
    if (value === undefined || value === '') continue;
    if (value.length > TEXT_LIMITS[key]) fields[key] = `Must be ${TEXT_LIMITS[key]} characters or fewer.`;
    else filters[key] = value;
  }

  const stage = single('stage');
  if (stage) {
    const lower = stage.toLowerCase();
    if (STAGES.includes(lower)) filters.stage = lower as ProjectStage;
    else fields.stage = `Must be one of: ${STAGES.join(', ')}.`;
  }

  const limit = single('limit');
  if (limit !== undefined) {
    const n = /^\d+$/.test(limit) ? Number(limit) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) fields.limit = `Must be an integer from 1 to ${MAX_LIMIT}.`;
    else filters.limit = n;
  }

  const offset = single('offset');
  if (offset !== undefined) {
    const n = /^\d+$/.test(offset) ? Number(offset) : NaN;
    if (!Number.isSafeInteger(n) || n < 0) fields.offset = 'Must be an integer of 0 or more.';
    else filters.offset = n;
  }

  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, filters };
}
