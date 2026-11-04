import { conflict, forbidden, internal, unauthenticated, unavailable } from './errors.js';
import type { OpportunitiesRepository, ProjectAccess } from './repository.js';
import type {
  Application,
  ApplicationReview,
  ApplicationStatus,
  ApplicationWithNeed,
  Need,
  NeedFields,
  Pagination,
  Rows,
} from './types.js';
import type { NeedPatch } from './validation.js';

/** Must match the restricted SQL function P1 ships (see README.md). */
export const REVIEW_SUMMARY_FUNCTION = 'application_review_summaries';

const NEED_COLUMNS =
  'id, project_id, title, description, required_skills, desirable_skills, participation_type, hours_per_week, work_mode, location, compensation, status, created_at';
const APPLICATION_COLUMNS = 'id, need_id, applicant_id, message, status, created_at, updated_at';

interface DbError {
  code?: string;
  message?: string;
}

interface DbResult<T> {
  data: T;
  error: DbError | null;
  count?: number | null;
}

/**
 * The fragment of supabase-js used here. Results are untyped until P1 ships
 * generated database types; `rowToNeed` and friends are the mapping boundary.
 */
export interface SupabaseLike {
  from(table: string): any;
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<DbResult<any>>;
}

type Row = Record<string, any>;

function fail(error: DbError): never {
  switch (error.code) {
    case '23505':
      throw conflict('You have already applied for this role.');
    case '42501':
      throw forbidden();
    case 'PGRST301':
    case 'PGRST303':
      throw unauthenticated();
  }
  // supabase-js reports network failures without a Postgres or PostgREST code.
  throw error.code ? internal() : unavailable();
}

function unwrap<T>({ data, error }: DbResult<T>): T {
  if (error) fail(error);
  return data;
}

function rowToNeed(row: Row): Need {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    requiredSkills: row.required_skills ?? [],
    desirableSkills: row.desirable_skills ?? [],
    participationType: row.participation_type,
    hoursPerWeek: row.hours_per_week,
    workMode: row.work_mode,
    location: row.location,
    compensation: row.compensation,
    status: row.status,
    createdAt: row.created_at,
  };
}

function rowToApplication(row: Row): Application {
  return {
    id: row.id,
    needId: row.need_id,
    applicantId: row.applicant_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function needColumns(fields: Partial<NeedFields> & { status?: Need['status'] }): Row {
  const columns: Row = {
    title: fields.title,
    description: fields.description,
    required_skills: fields.requiredSkills,
    desirable_skills: fields.desirableSkills,
    participation_type: fields.participationType,
    hours_per_week: fields.hoursPerWeek,
    work_mode: fields.workMode,
    location: fields.location,
    compensation: fields.compensation,
    status: fields.status,
  };
  return Object.fromEntries(Object.entries(columns).filter(([, value]) => value !== undefined));
}

const range = ({ limit, offset }: Pagination): [number, number] => [offset, offset + limit - 1];

export function createSupabaseRepository(db: SupabaseLike): OpportunitiesRepository {
  return {
    async getProject(projectId): Promise<ProjectAccess | null> {
      const row: Row | null = unwrap(
        await db.from('projects').select('id, owner_id, visibility').eq('id', projectId).maybeSingle(),
      );
      return row && { id: row.id, ownerId: row.owner_id, visibility: row.visibility };
    },

    async listNeeds(projectId, page): Promise<Rows<Need>> {
      const result = await db
        .from('project_needs')
        .select(NEED_COLUMNS, { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(...range(page));
      return { rows: (unwrap(result) as Row[]).map(rowToNeed), total: result.count ?? 0 };
    },

    async getNeed(needId) {
      const row: Row | null = unwrap(
        await db.from('project_needs').select(NEED_COLUMNS).eq('id', needId).maybeSingle(),
      );
      return row && rowToNeed(row);
    },

    async createNeed(projectId, fields) {
      const row: Row = unwrap(
        await db
          .from('project_needs')
          .insert({ ...needColumns(fields), project_id: projectId })
          .select(NEED_COLUMNS)
          .single(),
      );
      return rowToNeed(row);
    },

    async updateNeed(needId, patch: NeedPatch) {
      const row: Row | null = unwrap(
        await db
          .from('project_needs')
          .update(needColumns(patch))
          .eq('id', needId)
          .select(NEED_COLUMNS)
          .maybeSingle(),
      );
      return row && rowToNeed(row);
    },

    async getApplication(applicationId) {
      const row: Row | null = unwrap(
        await db.from('applications').select(APPLICATION_COLUMNS).eq('id', applicationId).maybeSingle(),
      );
      return row && rowToApplication(row);
    },

    async createApplication({ needId, applicantId, message }) {
      const row: Row = unwrap(
        await db
          .from('applications')
          .insert({ need_id: needId, applicant_id: applicantId, message })
          .select(APPLICATION_COLUMNS)
          .single(),
      );
      return rowToApplication(row);
    },

    async listApplicationsByApplicant(applicantId, page): Promise<Rows<ApplicationWithNeed>> {
      const result = await db
        .from('applications')
        .select(`${APPLICATION_COLUMNS}, need:project_needs(id, title, project_id)`, { count: 'exact' })
        .eq('applicant_id', applicantId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(...range(page));
      const rows = (unwrap(result) as Row[]).map((row) => ({
        ...rowToApplication(row),
        need: row.need ? { id: row.need.id, title: row.need.title, projectId: row.need.project_id } : null,
      }));
      return { rows, total: result.count ?? 0 };
    },

    async listApplicationsForProject(projectId, page): Promise<Rows<ApplicationReview>> {
      const result = await db
        .from('applications')
        .select(`${APPLICATION_COLUMNS}, need:project_needs!inner(project_id)`, { count: 'exact' })
        .eq('need.project_id', projectId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(...range(page));
      const rows = unwrap(result) as Row[];

      // Applicant details come only from P1's restricted function, never the
      // profiles table, which is not readable by project owners.
      const summaries = unwrap(
        await db.rpc(REVIEW_SUMMARY_FUNCTION, { p_project_id: projectId }),
      ) as Row[];
      const byApplicant = new Map(summaries.map((summary) => [summary.applicant_id, summary]));

      return {
        rows: rows.map((row) => {
          const summary = byApplicant.get(row.applicant_id);
          return {
            ...rowToApplication(row),
            applicant: {
              displayName: summary?.display_name ?? 'Unknown applicant',
              declaredSkills: summary?.declared_skills ?? [],
              hoursPerWeek: summary?.hours_per_week ?? null,
            },
          };
        }),
        total: result.count ?? 0,
      };
    },

    async updateApplicationStatus(applicationId, from: ApplicationStatus, to: ApplicationStatus) {
      const row: Row | null = unwrap(
        await db
          .from('applications')
          .update({ status: to, updated_at: new Date().toISOString() })
          .eq('id', applicationId)
          .eq('status', from)
          .select(APPLICATION_COLUMNS)
          .maybeSingle(),
      );
      return row && rowToApplication(row);
    },
  };
}
