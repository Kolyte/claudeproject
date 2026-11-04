import { conflict, forbidden, notFound, unauthenticated } from './errors.js';
import type { OpportunitiesRepository, ProjectAccess } from './repository.js';
import type {
  Application,
  ApplicationReview,
  ApplicationStatus,
  Need,
  NeedFields,
  Page,
  Pagination,
  Rows,
} from './types.js';
import type { NeedPatch } from './validation.js';

const PROJECT_NOT_FOUND = 'Project not found.';
const NEED_NOT_FOUND = 'Role not found.';
const APPLICATION_NOT_FOUND = 'Application not found.';

const ACTIVE_STATUSES: readonly ApplicationStatus[] = ['submitted', 'reviewing'];
const OWNER_TARGETS: readonly ApplicationStatus[] = ['reviewing', 'accepted', 'rejected'];

function toPage<T>({ rows, total }: Rows<T>, page: Pagination): Page<T> {
  return { data: rows, pagination: { ...page, total } };
}

function requireUser(userId: string | null): string {
  if (!userId) throw unauthenticated();
  return userId;
}

export function createOpportunitiesService(repo: OpportunitiesRepository) {
  /** Drafts are hidden from everyone but the owner, so they surface as 404. */
  async function visibleProject(projectId: string, userId: string | null): Promise<ProjectAccess> {
    const project = await repo.getProject(projectId);
    if (!project) throw notFound(PROJECT_NOT_FOUND);
    if (project.visibility !== 'public' && project.ownerId !== userId) throw notFound(PROJECT_NOT_FOUND);
    return project;
  }

  async function ownedProject(projectId: string, userId: string): Promise<ProjectAccess> {
    const project = await visibleProject(projectId, userId);
    if (project.ownerId !== userId) throw forbidden('Only the project owner can do that.');
    return project;
  }

  return {
    async listNeeds(projectId: string, page: Pagination, userId: string | null): Promise<Page<Need>> {
      await visibleProject(projectId, userId);
      return toPage(await repo.listNeeds(projectId, page), page);
    },

    async createNeed(projectId: string, fields: NeedFields, userId: string | null): Promise<Need> {
      await ownedProject(projectId, requireUser(userId));
      return repo.createNeed(projectId, fields);
    },

    async updateNeed(needId: string, patch: NeedPatch, userId: string | null): Promise<Need> {
      const user = requireUser(userId);
      const need = await repo.getNeed(needId);
      if (!need) throw notFound(NEED_NOT_FOUND);
      await ownedProject(need.projectId, user);
      const updated = await repo.updateNeed(needId, patch);
      if (!updated) throw notFound(NEED_NOT_FOUND);
      return updated;
    },

    async apply(needId: string, message: string, userId: string | null): Promise<Application> {
      const applicantId = requireUser(userId);
      const need = await repo.getNeed(needId);
      if (!need) throw notFound(NEED_NOT_FOUND);
      const project = await visibleProject(need.projectId, applicantId);
      if (project.ownerId === applicantId) throw forbidden('You cannot apply to your own project.');
      if (need.status !== 'open') throw conflict('This role is not accepting applications.');
      return repo.createApplication({ needId, applicantId, message });
    },

    async listMyApplications(page: Pagination, userId: string | null): Promise<Page<Application>> {
      return toPage(await repo.listApplicationsByApplicant(requireUser(userId), page), page);
    },

    async listProjectApplications(
      projectId: string,
      page: Pagination,
      userId: string | null,
    ): Promise<Page<ApplicationReview>> {
      await ownedProject(projectId, requireUser(userId));
      return toPage(await repo.listApplicationsForProject(projectId, page), page);
    },

    async updateApplicationStatus(
      applicationId: string,
      status: ApplicationStatus,
      userId: string | null,
    ): Promise<Application> {
      const user = requireUser(userId);
      const application = await repo.getApplication(applicationId);
      if (!application) throw notFound(APPLICATION_NOT_FOUND);

      // Applicants are checked first: they must be able to withdraw even if the
      // project has since returned to draft and its need is hidden from them.
      if (application.applicantId === user) {
        if (status !== 'withdrawn') throw forbidden('Applicants can only withdraw an application.');
      } else {
        const need = await repo.getNeed(application.needId);
        const project = need ? await repo.getProject(need.projectId) : null;
        // Unrelated accounts learn nothing about the application's existence.
        if (project?.ownerId !== user) throw notFound(APPLICATION_NOT_FOUND);
        if (!OWNER_TARGETS.includes(status)) {
          throw forbidden('Project owners can mark an application reviewing, accepted or rejected.');
        }
      }

      if (!ACTIVE_STATUSES.includes(application.status)) {
        throw conflict('This application has been finalised and can no longer change.');
      }
      const updated = await repo.updateApplicationStatus(applicationId, application.status, status);
      if (!updated) throw conflict('This application changed. Refresh and try again.');
      return updated;
    },
  };
}

export type OpportunitiesService = ReturnType<typeof createOpportunitiesService>;
