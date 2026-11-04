// In-memory repository for tests only. It enforces the unique (need, applicant)
// constraint the database will, so duplicate handling can be exercised.
import { randomUUID } from 'node:crypto';
import { conflict } from '../errors.js';
import type { OpportunitiesRepository, ProjectAccess } from '../repository.js';
import type { Application, ApplicationReview, Need, NeedFields, Pagination, Rows } from '../types.js';

export interface ApplicantSummary {
  displayName: string;
  declaredSkills: string[];
  hoursPerWeek: number | null;
}

export interface MemoryState {
  projects: Map<string, ProjectAccess>;
  needs: Map<string, Need>;
  applications: Map<string, Application>;
  summaries: Map<string, ApplicantSummary>;
}

export function createMemoryState(): MemoryState {
  return { projects: new Map(), needs: new Map(), applications: new Map(), summaries: new Map() };
}

function paged<T extends { createdAt: string }>(rows: T[], { limit, offset }: Pagination): Rows<T> {
  const sorted = rows.toReversed();
  return { rows: sorted.slice(offset, offset + limit), total: sorted.length };
}

export function createMemoryRepository(state: MemoryState): OpportunitiesRepository {
  const now = () => new Date().toISOString();

  return {
    async getProject(id) {
      return state.projects.get(id) ?? null;
    },
    async listNeeds(projectId, page) {
      return paged([...state.needs.values()].filter((need) => need.projectId === projectId), page);
    },
    async getNeed(id) {
      return state.needs.get(id) ?? null;
    },
    async createNeed(projectId, fields: NeedFields) {
      const need: Need = { ...fields, id: randomUUID(), projectId, status: 'open', createdAt: now() };
      state.needs.set(need.id, need);
      return need;
    },
    async updateNeed(id, patch) {
      const need = state.needs.get(id);
      if (!need) return null;
      const updated = { ...need, ...patch };
      state.needs.set(id, updated);
      return updated;
    },
    async getApplication(id) {
      return state.applications.get(id) ?? null;
    },
    async createApplication({ needId, applicantId, message }) {
      const existing = [...state.applications.values()];
      if (existing.some((row) => row.needId === needId && row.applicantId === applicantId)) {
        throw conflict('You have already applied for this role.');
      }
      const application: Application = {
        id: randomUUID(),
        needId,
        applicantId,
        message,
        status: 'submitted',
        createdAt: now(),
        updatedAt: now(),
      };
      state.applications.set(application.id, application);
      return application;
    },
    async listApplicationsByApplicant(applicantId, page) {
      return paged([...state.applications.values()].filter((row) => row.applicantId === applicantId), page);
    },
    async listApplicationsForProject(projectId, page) {
      const rows: ApplicationReview[] = [...state.applications.values()]
        .filter((row) => state.needs.get(row.needId)?.projectId === projectId)
        .map((row) => ({
          ...row,
          applicant: state.summaries.get(row.applicantId) ?? {
            displayName: 'Unknown applicant',
            declaredSkills: [],
            hoursPerWeek: null,
          },
        }));
      return paged(rows, page);
    },
    async updateApplicationStatus(id, from, to) {
      const application = state.applications.get(id);
      if (!application || application.status !== from) return null;
      const updated = { ...application, status: to, updatedAt: now() };
      state.applications.set(id, updated);
      return updated;
    },
  };
}
