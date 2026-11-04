import type {
  Application,
  ApplicationReview,
  ApplicationStatus,
  ApplicationWithNeed,
  Need,
  NeedFields,
  Pagination,
  Rows,
  Visibility,
} from './types.js';
import type { NeedPatch } from './validation.js';

export interface ProjectAccess {
  id: string;
  ownerId: string;
  visibility: Visibility;
}

/**
 * Data access for one request. Implementations act as the calling user so RLS
 * applies; a row that user cannot see comes back as null.
 */
export interface OpportunitiesRepository {
  getProject(projectId: string): Promise<ProjectAccess | null>;

  listNeeds(projectId: string, page: Pagination): Promise<Rows<Need>>;
  getNeed(needId: string): Promise<Need | null>;
  createNeed(projectId: string, fields: NeedFields): Promise<Need>;
  updateNeed(needId: string, patch: NeedPatch): Promise<Need | null>;

  getApplication(applicationId: string): Promise<Application | null>;
  /** Throws a CONFLICT ApiFailure when the applicant already applied to the need. */
  createApplication(input: { needId: string; applicantId: string; message: string }): Promise<Application>;
  listApplicationsByApplicant(applicantId: string, page: Pagination): Promise<Rows<ApplicationWithNeed>>;
  listApplicationsForProject(projectId: string, page: Pagination): Promise<Rows<ApplicationReview>>;
  /** Compare-and-swap on status. Returns null if the row is no longer in `from`. */
  updateApplicationStatus(
    applicationId: string,
    from: ApplicationStatus,
    to: ApplicationStatus,
  ): Promise<Application | null>;
}
