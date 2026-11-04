import type { Application, ApplicationReview, ApplicationStatus, Need, Page } from '@neo/contracts'
import { HttpError } from '../../lib/errors.js'
import type { NeedFields, NeedPatch, OpportunitiesRepository, Pagination, ProjectAccess, Rows } from './repository.js'

const ACTIVE_STATUSES: readonly ApplicationStatus[] = ['submitted', 'reviewing']
const OWNER_TARGETS: readonly ApplicationStatus[] = ['reviewing', 'accepted', 'rejected']

const notFound = (message: string) => new HttpError(404, 'NOT_FOUND', message)
const forbidden = (message: string) => new HttpError(403, 'FORBIDDEN', message)
const conflict = (message: string) => new HttpError(409, 'CONFLICT', message)

function toPage<T>({ rows, total }: Rows<T>, page: Pagination): Page<T> {
  return { data: rows, pagination: { ...page, total } }
}

export function createOpportunitiesService(repo: OpportunitiesRepository) {
  /** Drafts are hidden from everyone but the owner, so they surface as 404. */
  async function visibleProject(projectId: string, userId: string | null): Promise<ProjectAccess> {
    const project = await repo.getProject(projectId)
    if (!project || (project.visibility !== 'public' && project.ownerId !== userId)) throw notFound('Project not found.')
    return project
  }

  async function ownedProject(projectId: string, userId: string): Promise<ProjectAccess> {
    const project = await visibleProject(projectId, userId)
    if (project.ownerId !== userId) throw forbidden('Only the project owner can do that.')
    return project
  }

  return {
    async listNeeds(projectId: string, page: Pagination, userId: string | null): Promise<Page<Need>> {
      await visibleProject(projectId, userId)
      return toPage(await repo.listNeeds(projectId, page), page)
    },

    async createNeed(projectId: string, fields: NeedFields, userId: string): Promise<Need> {
      await ownedProject(projectId, userId)
      return repo.createNeed(projectId, fields)
    },

    async updateNeed(needId: string, patch: NeedPatch, userId: string): Promise<Need> {
      const need = await repo.getNeed(needId)
      if (!need) throw notFound('Opportunity not found.')
      await ownedProject(need.projectId, userId)
      const updated = await repo.updateNeed(needId, patch)
      if (!updated) throw notFound('Opportunity not found.')
      return updated
    },

    async apply(needId: string, message: string, applicantId: string): Promise<Application> {
      const need = await repo.getNeed(needId)
      if (!need) throw notFound('Opportunity not found.')
      const project = await visibleProject(need.projectId, applicantId)
      if (project.ownerId === applicantId) throw forbidden('You cannot apply to your own project.')
      if (need.status !== 'open' || project.visibility !== 'public') throw conflict('This opportunity is no longer open.')
      return repo.createApplication({ needId, applicantId, message })
    },

    async listMyApplications(page: Pagination, userId: string): Promise<Page<Application>> {
      return toPage(await repo.listApplicationsByApplicant(userId, page), page)
    },

    async listProjectApplications(projectId: string, page: Pagination, userId: string): Promise<Page<ApplicationReview>> {
      await ownedProject(projectId, userId)
      return toPage(await repo.listApplicationsForProject(projectId, page), page)
    },

    async updateApplicationStatus(applicationId: string, status: ApplicationStatus, userId: string): Promise<Application> {
      const application = await repo.getApplication(applicationId)
      if (!application) throw notFound('Application not found.')

      // Applicants are checked first: they must be able to withdraw even if the
      // project has since returned to draft and its need is hidden from them.
      if (application.applicantId === userId) {
        if (status !== 'withdrawn') throw forbidden('Applicants can only withdraw an application.')
      } else {
        const need = await repo.getNeed(application.needId)
        const project = need ? await repo.getProject(need.projectId) : null
        // Unrelated accounts learn nothing about the application's existence.
        if (project?.ownerId !== userId) throw notFound('Application not found.')
        if (!OWNER_TARGETS.includes(status)) throw forbidden('Project owners can mark an application reviewing, accepted or rejected.')
      }

      if (!ACTIVE_STATUSES.includes(application.status)) throw conflict('This application has a final decision.')
      const updated = await repo.updateApplicationStatus(applicationId, application.status, status)
      if (!updated) throw conflict('This application changed. Refresh and try again.')
      return updated
    },
  }
}
