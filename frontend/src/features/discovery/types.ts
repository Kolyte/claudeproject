// Local mirror of the discovery slice of docs/CONTRACTS.md (v1).
// Swap for `import type { ... } from '@neo/contracts'` once P1 publishes shared types.

export type ProjectStage = 'idea' | 'prototype' | 'mvp' | 'launched';
export type ProjectStatus = 'active' | 'paused' | 'completed';

export interface ProjectSummary {
  id: string;
  title: string;
  pitch: string;
  sector: string;
  location: string;
  stage: ProjectStage;
  status: ProjectStatus;
  ownerDisplayName: string;
  requiredSkills: string[];
  openNeedsCount: number;
  lastSubstantiveUpdateAt: string | null;
  createdAt: string;
}

export interface DiscoveryFilters {
  q?: string;
  location?: string;
  skill?: string;
  sector?: string;
  stage?: ProjectStage;
  limit?: number;
  offset?: number;
}

export interface Page<T> {
  data: T[];
  pagination: { limit: number; offset: number; total: number };
}

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}
