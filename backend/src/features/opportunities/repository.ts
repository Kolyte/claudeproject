import type { Application, ApplicationReview, ApplicationStatus, Need, Visibility } from '@neo/contracts'

export type NeedFields = Omit<Need, 'id' | 'projectId' | 'createdAt'>
export type NeedPatch = Partial<NeedFields>
export interface Pagination { limit: number; offset: number }
export interface Rows<T> { rows: T[]; total: number }
export interface ProjectAccess { id: string; ownerId: string; visibility: Visibility }

/**
 * Data access for one request. Implementations act as the calling user so RLS
 * applies; a row that user cannot see comes back as null.
 */
export interface OpportunitiesRepository {
  getProject(projectId: string): Promise<ProjectAccess | null>
  listNeeds(projectId: string, page: Pagination): Promise<Rows<Need>>
  getNeed(needId: string): Promise<Need | null>
  createNeed(projectId: string, fields: NeedFields): Promise<Need>
  updateNeed(needId: string, patch: NeedPatch): Promise<Need | null>
  getApplication(applicationId: string): Promise<Application | null>
  /** Throws a 409 HttpError on a duplicate, or if the need closed mid-request. */
  createApplication(input: { needId: string; applicantId: string; message: string }): Promise<Application>
  listApplicationsByApplicant(applicantId: string, page: Pagination): Promise<Rows<Application>>
  listApplicationsForProject(projectId: string, page: Pagination): Promise<Rows<ApplicationReview>>
  /** Compare-and-swap on status. Returns null if the row is no longer in `from`. */
  updateApplicationStatus(applicationId: string, from: ApplicationStatus, to: ApplicationStatus): Promise<Application | null>
}
