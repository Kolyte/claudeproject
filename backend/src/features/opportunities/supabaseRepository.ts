import type { SupabaseClient } from '@supabase/supabase-js'
import type { Application, ApplicationReview, Need } from '@neo/contracts'
import { HttpError } from '../../lib/errors.js'
import { databaseError } from '../../lib/supabase.js'
import { camel, snake } from '../../lib/validation.js'
import type { NeedPatch, OpportunitiesRepository, Pagination } from './repository.js'

/** Selected explicitly, so a new private column can never leak into a response. */
const NEED_COLUMNS = 'id, project_id, title, description, required_skills, desirable_skills, participation_type, hours_per_week, work_mode, location, compensation, status, created_at'
const APPLICATION_COLUMNS = 'id, need_id, applicant_id, message, status, created_at, updated_at'

type Row = Record<string, unknown>
interface Result<T> { data: T; error: { code?: string } | null }

function unwrap<T>({ data, error }: Result<T>): T {
  if (error) databaseError(error)
  return data
}

const range = ({ limit, offset }: Pagination): [number, number] => [offset, offset + limit - 1]

export function createSupabaseRepository(db: SupabaseClient): OpportunitiesRepository {
  return {
    async getProject(projectId) {
      const row = unwrap(await db.from('projects').select('id, owner_id, visibility').eq('id', projectId).maybeSingle())
      return row && { id: row.id, ownerId: row.owner_id, visibility: row.visibility }
    },

    async listNeeds(projectId, page) {
      const result = await db.from('project_needs').select(NEED_COLUMNS, { count: 'exact' }).eq('project_id', projectId)
        .order('created_at', { ascending: false }).order('id').range(...range(page))
      return { rows: unwrap<Row[] | null>(result)?.map(row => camel<Need>(row)) ?? [], total: result.count ?? 0 }
    },

    async getNeed(needId) {
      const row = unwrap<Row | null>(await db.from('project_needs').select(NEED_COLUMNS).eq('id', needId).maybeSingle())
      return row && camel<Need>(row)
    },

    async createNeed(projectId, fields) {
      const row = unwrap<Row | null>(await db.from('project_needs').insert({ ...snake({ ...fields }), project_id: projectId }).select(NEED_COLUMNS).single())
      return camel<Need>(row as Row)
    },

    async updateNeed(needId, patch: NeedPatch) {
      const row = unwrap<Row | null>(await db.from('project_needs').update(snake({ ...patch })).eq('id', needId).select(NEED_COLUMNS).maybeSingle())
      return row && camel<Need>(row)
    },

    async getApplication(applicationId) {
      const row = unwrap<Row | null>(await db.from('applications').select(APPLICATION_COLUMNS).eq('id', applicationId).maybeSingle())
      return row && camel<Application>(row)
    },

    async createApplication({ needId, applicantId, message }) {
      const result = await db.from('applications').insert({ need_id: needId, applicant_id: applicantId, message }).select(APPLICATION_COLUMNS).single()
      if (result.error?.code === '23505') throw new HttpError(409, 'CONFLICT', 'You have already applied for this opportunity.')
      // P1's guard raises this if the need closes between our check and the insert.
      if (result.error?.code === '23514') throw new HttpError(409, 'CONFLICT', 'This opportunity is no longer open.')
      return camel<Application>(unwrap<Row | null>(result) as Row)
    },

    async listApplicationsByApplicant(applicantId, page) {
      const result = await db.from('applications').select(APPLICATION_COLUMNS, { count: 'exact' }).eq('applicant_id', applicantId)
        .order('created_at', { ascending: false }).order('id').range(...range(page))
      return { rows: unwrap<Row[] | null>(result)?.map(row => camel<Application>(row)) ?? [], total: result.count ?? 0 }
    },

    async listApplicationsForProject(projectId, page) {
      const result = await db.from('applications').select(`${APPLICATION_COLUMNS}, project_needs!inner(project_id)`, { count: 'exact' })
        .eq('project_needs.project_id', projectId).order('created_at', { ascending: false }).order('id').range(...range(page))
      // Applicant details come only from P1's restricted function, never the
      // profiles table, which project owners cannot read.
      const rows = await Promise.all((unwrap<Row[] | null>(result) ?? []).map(async ({ project_needs: _need, ...row }) => {
        const applicant = unwrap<ApplicationReview['applicant'] | null>(await db.rpc('application_review_summary', { application_id: row.id }))
        return { ...camel<Application>(row), applicant: applicant as ApplicationReview['applicant'] }
      }))
      return { rows, total: result.count ?? 0 }
    },

    async updateApplicationStatus(applicationId, from, to) {
      const row = unwrap<Row | null>(await db.from('applications').update({ status: to }).eq('id', applicationId).eq('status', from).select(APPLICATION_COLUMNS).maybeSingle())
      return row && camel<Application>(row)
    },
  }
}
