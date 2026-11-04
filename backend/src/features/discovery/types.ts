// Local mirror of the discovery slice of docs/CONTRACTS.md (v1).
// Replace with `import type { ... } from '@neo/contracts'` once P1 publishes the
// shared package; the shapes below must stay identical to the contract.

export type ProjectStage = 'idea' | 'prototype' | 'mvp' | 'launched';
export type ProjectStatus = 'active' | 'paused' | 'completed';
export type NeedStatus = 'open' | 'reviewing' | 'filled' | 'closed';
export type PostType = 'progress' | 'milestone' | 'roadblock' | 'opportunity' | 'announcement';

export const PROJECT_STAGES: readonly ProjectStage[] = ['idea', 'prototype', 'mvp', 'launched'];

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
  limit: number;
  offset: number;
}

export interface Page<T> {
  data: T[];
  pagination: { limit: number; offset: number; total: number };
}

export interface ApiError {
  error: { code: string; message: string; fields?: Record<string, string> };
}

/** Row shape read from Supabase: a public project with embedded children (snake_case). */
export interface DiscoveryProjectRow {
  id: string;
  title: string;
  pitch: string;
  sector: string;
  location: string;
  stage: ProjectStage;
  status: ProjectStatus;
  visibility: 'draft' | 'public';
  owner_display_name: string;
  created_at: string;
  project_needs?: { status: NeedStatus; required_skills: string[] | null }[] | null;
  project_posts?: { type: PostType; created_at: string }[] | null;
  milestones?: { achieved_at: string }[] | null;
}
